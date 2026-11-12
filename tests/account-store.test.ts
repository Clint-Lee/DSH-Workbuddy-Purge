/**
 * The pool must remember the accounts the desktop app stops keeping a file for.
 *
 * The reported symptom (this is the bug these cases pin down): a user signs into
 * two WorkBuddy accounts, both show up on the card, automation checks both in on
 * day one — and on day two the host starts with ONE account and the other asks
 * to be signed in again. Re-installing and signing both in again reproduced it
 * on day three.
 *
 * The cause is not a lost file. The desktop app has a single sign-in slot: every
 * login rewrites `workbuddy-desktop.info` and appends a timestamped snapshot. A
 * plugin that only reads those files therefore knows exactly the accounts whose
 * snapshots happen to still be lying around, and our pool kept the rest in
 * memory. Reinstalling the plugin threw that memory away, so the pool came back
 * with one account — the same account the app was last signed into.
 *
 * The fix is a durable roster (`accounts.json` in the plugin data directory):
 * `scan()` seeds from it, so an account with no file left still shows up, and
 * writes the merged list back. These cases hold that contract down:
 *
 * 1. an account with no `.info` on disk survives a restart;
 * 2. a scan that finds only the live account must not shrink the roster;
 * 3. the roster never outranks a credential still on disk (a re-login wins);
 * 4. a corrupt or absent roster degrades to "remember nothing" instead of
 *    throwing, so a broken file cannot stop the host from starting;
 * 5. an ignored account is never resurrected from the roster;
 * 6. a roster entry both of whose windows closed is dropped, so abandoned
 *    sign-ins do not accumulate forever;
 * 7. overlapping scans share one run, so a burst of triggers cannot write a
 *    staler list back over a fresher one;
 * 8. a roster that shrinks announces which account left.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WorkBuddyAccountPool, workbuddyAccountId } from '../src/accounts.ts'
import {
  ACCOUNTS_FILE_NAME,
  loadStoredAccounts,
  saveStoredAccounts,
} from '../src/account-store.ts'

/** Quiet logger; these tests assert on state, not on log text. */
const log = { warn() {}, info() {}, error() {} }

/** One desktop-app-shaped credential document. */
function document(auth: Record<string, unknown>, identity: Record<string, unknown>): string {
  return JSON.stringify({ auth, account: identity })
}

/** Identity of a fictional account, keyed the way the pool keys accounts. */
function identity(n: number): Record<string, unknown> {
  return { uin: `10000000000${n}`, uid: `uid-${n}-${'0'.repeat(24)}`, nickname: `Account${n}` }
}

/** A live-looking credential for account `n`. */
function creds(n: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    accessToken: `token-${n}`,
    refreshToken: `refresh-${n}`,
    expiresAt: Date.now() + 3_600_000,
    refreshExpiresAt: Date.now() + 30 * 24 * 3_600_000,
    lastRefreshTime: Date.now() - 86_400_000,
    domain: 'www.workbuddy.cn',
    ...overrides,
  }
}

/** A temp auth directory plus the roster path this pool will use. */
async function layout(): Promise<{ authDir: string; store: string }> {
  const root = await mkdtemp(join(tmpdir(), 'wbpool-roster-'))
  const authDir = join(root, 'auth')
  await mkdir(authDir, { recursive: true })
  return { authDir, store: join(root, 'state', ACCOUNTS_FILE_NAME) }
}

/** A pool bound to a temp auth directory and an explicit roster path. */
function makePool(authDir: string, store: string, persistent = true): WorkBuddyAccountPool {
  return new WorkBuddyAccountPool({
    authDirs: [authDir],
    storePath: store,
    persistent,
    logger: log,
  })
}

/** Day one: the app appended a snapshot for the first sign-in. */
async function twoSnapshots(authDir: string): Promise<void> {
  await writeFile(
    join(authDir, 'workbuddy-desktop.2026-01-01T00-00-00-000Z.1.a.info'),
    document(creds(1), identity(1)),
    'utf8',
  )
  await writeFile(join(authDir, 'workbuddy-desktop.info'), document(creds(2), identity(2)), 'utf8')
}

describe('an account the app no longer keeps a file for survives a restart', () => {
  it('remembers both accounts across a process restart', async () => {
    const { authDir, store } = await layout()
    await twoSnapshots(authDir)
    expect(await makePool(authDir, store).scan()).toHaveLength(2)

    // Day two: the app cleaned up its snapshots and now carries only the current
    // sign-in. This is the state that used to halve the pool.
    await rm(join(authDir, 'workbuddy-desktop.2026-01-01T00-00-00-000Z.1.a.info'))
    await writeFile(join(authDir, 'workbuddy-desktop.info'), document(creds(2), identity(2)), 'utf8')

    // A new process: nothing in memory, so this is exactly what a restart sees.
    const accounts = await makePool(authDir, store).scan()

    expect(accounts.map(account => account.label).sort())
      .toEqual(['Account1#uid-1-00', 'Account2#uid-2-00'])
    // The account with no file on disk must carry the credential the roster
    // saved, or it is a row that cannot serve a single request.
    const restored = accounts.find(account => account.label.startsWith('Account1'))!
    expect(restored.credential.refreshToken).toBe('refresh-1')
    expect(restored.credential.sourcePath).toBe(store)
  })

  it('does not shrink the roster when a scan finds only the live account', async () => {
    const { authDir, store } = await layout()
    await twoSnapshots(authDir)
    await makePool(authDir, store).scan()

    // Only the live account is left on disk. A gated seed (`byId.size === 0`)
    // would return one account here and then WRITE that single entry back,
    // deleting account 1 from the roster for good.
    await rm(join(authDir, 'workbuddy-desktop.2026-01-01T00-00-00-000Z.1.a.info'))

    expect(await makePool(authDir, store).scan()).toHaveLength(2)
    expect(await loadStoredAccounts(store)).toHaveLength(2)
  })

  it('writes nothing when persistence is off', async () => {
    const { authDir, store } = await layout()
    await writeFile(join(authDir, 'workbuddy-desktop.info'), document(creds(1), identity(1)), 'utf8')

    expect(await makePool(authDir, store, false).scan()).toHaveLength(1)
    await expect(readFile(store, 'utf8')).rejects.toThrow()
  })
})

describe('the roster never outranks a credential on disk', () => {
  it('prefers a re-login over the stored copy, whatever its expiry says', async () => {
    const { authDir, store } = await layout()
    await writeFile(join(authDir, 'workbuddy-desktop.info'), document(creds(1), identity(1)), 'utf8')
    await makePool(authDir, store).scan()

    // The upstream revoked the token and the user signed in again. The new
    // document is on disk, so it must win — the roster holding a later-looking
    // expiry must not keep the revoked token in rotation.
    await writeFile(
      join(authDir, 'workbuddy-desktop.info'),
      document(creds(1, {
        accessToken: 'token-relogin',
        refreshToken: 'refresh-relogin',
        lastRefreshTime: Date.now() + 60_000,
      }), identity(1)),
      'utf8',
    )

    const accounts = await makePool(authDir, store).scan()
    expect(accounts).toHaveLength(1)
    expect(accounts[0]!.credential.refreshToken).toBe('refresh-relogin')
  })

  it('stores the pool state it learned, not the file that produced it', async () => {
    const { authDir, store } = await layout()
    await writeFile(join(authDir, 'workbuddy-desktop.info'), document(creds(1), identity(1)), 'utf8')
    await makePool(authDir, store).scan()

    const stored = await loadStoredAccounts(store)
    expect(stored).toHaveLength(1)
    expect(stored[0]!.credential.accessToken).toBe('token-1')
    // A saved `sourcePath` pointing at the app's live file would let the stale
    // copy claim to BE the live sign-in after a restart.
    expect(stored[0]!.credential.sourcePath).toBe(store)
    expect(JSON.parse(await readFile(store, 'utf8'))).toMatchObject({ version: 1 })
  })
})

describe('a damaged roster degrades to "remember nothing"', () => {
  it('starts on a machine that has never pooled an account', async () => {
    const { authDir, store } = await layout()
    await writeFile(join(authDir, 'workbuddy-desktop.info'), document(creds(1), identity(1)), 'utf8')
    expect(await makePool(authDir, store).scan()).toHaveLength(1)
  })

  it('ignores invalid JSON and keeps serving the accounts it can read', async () => {
    const { authDir, store } = await layout()
    await mkdir(join(store, '..'), { recursive: true })
    await writeFile(store, '{ this is not json', 'utf8')
    await writeFile(join(authDir, 'workbuddy-desktop.info'), document(creds(1), identity(1)), 'utf8')

    expect(await loadStoredAccounts(store)).toEqual([])
    // A corrupt roster must not throw, and the scan must repair it on the way out.
    expect(await makePool(authDir, store).scan()).toHaveLength(1)
    expect(await loadStoredAccounts(store)).toHaveLength(1)
  })

  it('drops entries that are not accounts at all', async () => {
    const { authDir, store } = await layout()
    await mkdir(join(store, '..'), { recursive: true })
    await writeFile(store, JSON.stringify({
      version: 1,
      accounts: [
        { id: 'no-tokens', label: 'Broken', credential: { domain: 'x' } },
        { id: 'no-label', credential: { accessToken: 'a', refreshToken: 'r', domain: 'x' } },
        'garbage',
      ],
    }), 'utf8')
    await writeFile(join(authDir, 'workbuddy-desktop.info'), document(creds(1), identity(1)), 'utf8')

    const accounts = await makePool(authDir, store).scan()
    expect(accounts).toHaveLength(1)
    expect(accounts[0]!.credential.accessToken).toBe('token-1')
  })

  it('skips a roster entry whose access and refresh windows both closed', async () => {
    const { authDir, store } = await layout()
    const expired = Date.now() - 60_000
    await mkdir(join(store, '..'), { recursive: true })
    await writeFile(store, JSON.stringify({
      version: 1,
      accounts: [{
        id: workbuddyAccountId({ uin: '100000000009' }),
        label: 'Account9',
        credential: {
          accessToken: 'token-9',
          refreshToken: 'refresh-9',
          expiresAtMs: expired,
          refreshExpiresAtMs: expired,
          domain: 'www.workbuddy.cn',
          sourcePath: store,
        },
        savedAtMs: expired,
      }],
    }), 'utf8')
    await writeFile(join(authDir, 'workbuddy-desktop.info'), document(creds(1), identity(1)), 'utf8')

    // Signing in once and abandoning the account must not leave a row on the
    // card that can only ever fail.
    const accounts = await makePool(authDir, store).scan()
    expect(accounts).toHaveLength(1)
    expect(accounts[0]!.label.startsWith('Account1')).toBe(true)
  })

  it('keeps an entry that can still refresh, even with an expired access token', async () => {
    const { authDir, store } = await layout()
    await mkdir(join(store, '..'), { recursive: true })
    await writeFile(store, JSON.stringify({
      version: 1,
      accounts: [{
        id: workbuddyAccountId({ uin: '100000000009' }),
        label: 'Account9',
        credential: {
          accessToken: 'token-9',
          refreshToken: 'refresh-9',
          expiresAtMs: Date.now() - 60_000,
          refreshExpiresAtMs: Date.now() + 86_400_000,
          domain: 'www.workbuddy.cn',
          sourcePath: store,
        },
        savedAtMs: Date.now() - 60_000,
      }],
    }), 'utf8')
    await writeFile(join(authDir, 'workbuddy-desktop.info'), document(creds(1), identity(1)), 'utf8')

    // An expired ACCESS token is normal — the pool refreshes it. Only a closed
    // REFRESH window means the account is unreachable.
    expect((await makePool(authDir, store).scan()).map(account => account.label))
      .toContain('Account9')
  })
})

describe('an ignored account is not resurrected from the roster', () => {
  it('leaves an ignored account out of the scan and out of the stored roster', async () => {
    const { authDir, store } = await layout()
    await twoSnapshots(authDir)
    await makePool(authDir, store).scan()
    await rm(join(authDir, 'workbuddy-desktop.2026-01-01T00-00-00-000Z.1.a.info'))

    const ignoring = makePool(authDir, store)
    ignoring.applyIgnored([workbuddyAccountId({ uin: '100000000001' })])
    const accounts = await ignoring.scan()

    // The user threw account 1 out; the roster must not put it back, and a later
    // restart must not either.
    expect(accounts.map(account => account.label)).not.toContain('Account1#uid-1-00')
    expect((await loadStoredAccounts(store)).map(entry => entry.id))
      .not.toContain(workbuddyAccountId({ uin: '100000000001' }))
  })
})

describe('overlapping scans cannot lose an account', () => {
  it('hands every concurrent caller the same run', async () => {
    const { authDir, store } = await layout()
    await writeFile(join(authDir, 'workbuddy-desktop.info'), document(creds(1), identity(1)), 'utf8')

    // The card polls status on a timer, the startup seed scans, and acquire()
    // scans whenever the pool looks empty — three triggers, one tick. Sharing the
    // run is the whole point: two runs would each read the roster at their own
    // start and the slower one would write its staler picture back.
    const pool = makePool(authDir, store)
    const [first, second] = await Promise.all([pool.scan(), pool.scan()])
    expect(second).toBe(first)
    expect(await loadStoredAccounts(store)).toHaveLength(1)
  })

  it('keeps a fileless account through a burst of rescans', async () => {
    const { authDir, store } = await layout()
    await twoSnapshots(authDir)
    await makePool(authDir, store).scan()

    // Day two again: only the live sign-in is left on disk, the other account
    // lives in the roster alone — then several scans fire at once.
    await rm(join(authDir, 'workbuddy-desktop.2026-01-01T00-00-00-000Z.1.a.info'))

    const pool = makePool(authDir, store)
    const runs = await Promise.all([pool.scan(), pool.scan(), pool.scan(), pool.scan()])
    for (const accounts of runs) expect(accounts).toHaveLength(2)
    expect(await loadStoredAccounts(store)).toHaveLength(2)
  })
})

describe('a roster that loses an account says so', () => {
  it('names the account that left, so a repeat report is diagnosable', async () => {
    const { authDir, store } = await layout()
    await twoSnapshots(authDir)

    const warnings: string[] = []
    const pool = new WorkBuddyAccountPool({
      authDirs: [authDir],
      storePath: store,
      persistent: true,
      logger: { warn: (message: string) => warnings.push(message), info() {}, error() {} },
    })
    await pool.scan()
    expect(warnings).toEqual([])

    // Throwing an account out is the one legitimate way the roster shrinks. It
    // must be announced: a silent loss is the exact shape of the original bug.
    const dropped = workbuddyAccountId({ uin: '100000000001' })
    pool.applyIgnored([dropped])
    await pool.scan()

    expect(warnings.join('\n')).toContain(dropped)
    expect(warnings.join('\n')).toContain('left the pool')
    expect((await loadStoredAccounts(store)).map(entry => entry.id)).not.toContain(dropped)
  })
})

describe('the roster survives a save/load round trip', () => {
  it('does not rewrite a roster that learned nothing, and round-trips through the store', async () => {
    const { authDir, store } = await layout()
    await writeFile(join(authDir, 'workbuddy-desktop.info'), document(creds(1), identity(1)), 'utf8')

    // Two scans in a row: the second learns nothing, so it must not rewrite the
    // file (the card polls status, and a rewrite per poll is pure churn).
    const first = makePool(authDir, store)
    await first.scan()
    const before = await readFile(store, 'utf8')
    await first.scan()
    expect(await readFile(store, 'utf8')).toBe(before)

    const accounts = first.list()
    await saveStoredAccounts(store, [])
    expect(await loadStoredAccounts(store)).toEqual([])
    await saveStoredAccounts(store, accounts)
    expect(await loadStoredAccounts(store)).toHaveLength(1)
  })
})
