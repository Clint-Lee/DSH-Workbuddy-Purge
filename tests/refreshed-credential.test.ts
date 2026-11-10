/**
 * A refreshed token must survive the host restart that follows it.
 *
 * The reported symptom: two WorkBuddy accounts worked on day one, one of them
 * was gone the next day, signing in again brought it back, and the day after it
 * was gone again. Nothing was deleted — the account was still on disk with a
 * token that looked valid until December.
 *
 * Two defects combined to produce that:
 *
 * 1. Automation never refreshed a token. It ran on a timer, hours after the
 *    token was last touched, so the access token was routinely expired by then
 *    while the shim — which refreshes on 401 — sat idle. Every task for that
 *    account failed with a bare 401, and only `warn` recorded it.
 * 2. A refresh result lived in memory only. The desktop app's `.info` files are
 *    read-only here, so the token on disk stayed the one written at sign-in.
 *    The upstream rotates the refresh token on use, so after any restart the
 *    on-disk copy was already spent and came back `invalid_grant`.
 *
 * These cases pin the fix on both ends: automation refreshes first, and the
 * refreshed credential is written somewhere `scan()` will find it and rank it
 * above the app's now-spent snapshot — while a genuine re-login in the app still
 * wins, because the user's own newest sign-in must never be overruled.
 */

import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WorkBuddyAccountPool } from '../src/accounts.ts'
import { refreshedCredentialPath, writeRefreshedCredentialAt } from '../src/refreshed-store.ts'

/** Quiet logger; these tests assert on state, not on log text. */
const log = { warn() {}, info() {}, error() {} }

/** One desktop-app-shaped credential document. */
function document(auth: Record<string, unknown>, identity: Record<string, unknown> = {}): string {
  return JSON.stringify({ auth, account: identity })
}

/** A temp directory holding the app's auth dir and the pool's own store. */
async function layout(): Promise<{ auth: string; refreshed: string }> {
  const root = await mkdtemp(join(tmpdir(), 'wbpool-refresh-'))
  const auth = join(root, 'auth')
  const refreshed = join(root, 'refreshed')
  await mkdir(auth, { recursive: true })
  return { auth, refreshed }
}

/** A token that expires in an hour, issued at `issuedAt`. */
function liveAuth(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    accessToken: 'token-old',
    refreshToken: 'refresh-old',
    expiresAt: Date.now() + 3_600_000,
    refreshExpiresAt: Date.now() + 30 * 24 * 3_600_000,
    lastRefreshTime: Date.now() - 86_400_000,
    domain: 'www.workbuddy.cn',
    ...overrides,
  }
}

const IDENTITY = { uin: '100000000001', uid: `uid-1-${'0'.repeat(24)}`, nickname: 'Account1' }

describe('a credential whose refresh window closed is reported, not silently dropped', () => {
  it('names the file and the deadline instead of calling it malformed', async () => {
    const { auth, refreshed } = await layout()
    const closedAt = Date.now() - 60_000
    await writeFile(
      join(auth, 'workbuddy-desktop.info'),
      document(liveAuth({ refreshExpiresAt: closedAt }), IDENTITY),
      'utf8',
    )

    const pool = new WorkBuddyAccountPool({ authDirs: [auth], refreshedDir: refreshed, logger: log })
    const accounts = await pool.scan()

    expect(accounts).toHaveLength(0)
    const skipped = pool.skippedFilesInOrder()
    expect(skipped).toHaveLength(1)
    // The whole point: `malformed` sent users looking for a corrupt file that
    // was never corrupt, and hid the one fact that matters — sign in again.
    expect(skipped[0]!.reason).toBe('expiredRefresh')
    expect(skipped[0]!.refreshExpiredAtMs).toBe(closedAt)
  })

  it('keeps a credential whose refresh window is still open', async () => {
    const { auth, refreshed } = await layout()
    await writeFile(join(auth, 'workbuddy-desktop.info'), document(liveAuth(), IDENTITY), 'utf8')

    const pool = new WorkBuddyAccountPool({ authDirs: [auth], refreshedDir: refreshed, logger: log })
    expect(await pool.scan()).toHaveLength(1)
    expect(pool.skippedFilesInOrder()).toHaveLength(0)
  })
})

describe('a refresh is written where the next restart will find it', () => {
  it('persists the rotated token as a document the ordinary parser accepts', async () => {
    const { auth, refreshed } = await layout()
    await writeFile(join(auth, 'workbuddy-desktop.info'), document(liveAuth(), IDENTITY), 'utf8')

    const pool = new WorkBuddyAccountPool({
      authDirs: [auth],
      refreshedDir: refreshed,
      logger: log,
      client: {
        async refreshToken() {
          // The upstream rotates the refresh token on every use; this is what
          // made the on-disk copy spent and the account look deleted.
          return { accessToken: 'token-new', refreshToken: 'refresh-new', expiresInSec: 3600 }
        },
      },
    })
    await pool.scan()
    const account = pool.list()[0]!
    expect(await pool.refreshAccount(account.id, { force: true })).toBe(true)

    const stored = JSON.parse(await readFile(refreshedCredentialPath(account.id, { DSH_HOME: 'x' }), 'utf8')
      .catch(() => 'null')) as unknown
    // The env-derived path is not where this pool writes (it was given an
    // explicit directory), so read the file the pool actually owns.
    expect(stored).toBeNull()
    const files = await readdir(refreshed)
    expect(files).toEqual([`${account.id}.info`])
    const saved = JSON.parse(await readFile(join(refreshed, files[0]!), 'utf8')) as {
      auth: Record<string, unknown>
    }
    expect(saved.auth['accessToken']).toBe('token-new')
    expect(saved.auth['refreshToken']).toBe('refresh-new')
  })

  it('comes back with the refreshed token after a restart', async () => {
    const { auth, refreshed } = await layout()
    await writeFile(join(auth, 'workbuddy-desktop.info'), document(liveAuth(), IDENTITY), 'utf8')

    const first = new WorkBuddyAccountPool({
      authDirs: [auth],
      refreshedDir: refreshed,
      logger: log,
      client: { async refreshToken() { return { accessToken: 'token-new', refreshToken: 'refresh-new', expiresInSec: 3600 } } },
    })
    await first.scan()
    await first.refreshAccount(first.list()[0]!.id, { force: true })

    // A new process: nothing in memory, so this is exactly what a restart sees.
    const second = new WorkBuddyAccountPool({ authDirs: [auth], refreshedDir: refreshed, logger: log })
    const accounts = await second.scan()

    expect(accounts).toHaveLength(1)
    // Without the store this would be the spent `refresh-old`, and the next
    // refresh would fail with `invalid_grant`.
    expect(accounts[0]!.credential.refreshToken).toBe('refresh-new')
    expect(accounts[0]!.credential.accessToken).toBe('token-new')
  })

  it('still prefers a NEWER sign-in made in the app', async () => {
    const { auth, refreshed } = await layout()
    const pool = new WorkBuddyAccountPool({ authDirs: [auth], refreshedDir: refreshed, logger: log })

    // The user signs in again in the app; its document is the newest thing on
    // disk, so it is the one a scan must trust.
    await writeFile(
      join(auth, 'workbuddy-desktop.info'),
      document(
        liveAuth({ accessToken: 'token-relogin', refreshToken: 'refresh-relogin', lastRefreshTime: Date.now() }),
        IDENTITY,
      ),
      'utf8',
    )
    const id = (await pool.scan())[0]!.id

    // Persist a refresh that is an hour older than that sign-in…
    await writeRefreshedCredentialAt(refreshed, id, {
      accessToken: 'token-refreshed',
      refreshToken: 'refresh-refreshed',
      expiresAtMs: Date.now() + 3_600_000,
      lastRefreshAtMs: Date.now() - 3_600_000,
      domain: 'www.workbuddy.cn',
      sourcePath: join(refreshed, `${id}.info`),
      ...IDENTITY,
    })

    const accounts = await pool.scan()
    expect(accounts).toHaveLength(1)
    // A plugin must never overrule the user's own newest sign-in.
    expect(accounts[0]!.credential.refreshToken).toBe('refresh-relogin')
  })

  it('does not write anything when the pool was pointed at explicit directories', async () => {
    const { auth } = await layout()
    await writeFile(join(auth, 'workbuddy-desktop.info'), document(liveAuth(), IDENTITY), 'utf8')

    // No `refreshedDir`: a test or alternate install must not touch the real
    // plugin data directory, so persistence is off entirely.
    const pool = new WorkBuddyAccountPool({
      authDirs: [auth],
      logger: log,
      client: { async refreshToken() { return { accessToken: 'token-new', expiresInSec: 3600 } } },
    })
    await pool.scan()
    expect(await pool.refreshAccount(pool.list()[0]!.id, { force: true })).toBe(true)
    expect(await readdir(auth)).toEqual(['workbuddy-desktop.info'])
  })
})
