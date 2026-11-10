/**
 * The pool's own copy of a credential it refreshed.
 *
 * Why this file exists at all: the desktop app's `.info` documents are
 * READ-ONLY here (they belong to another program), and they hold the token the
 * app wrote at sign-in time — never the token this plugin obtained afterwards.
 * A refresh therefore used to live only in memory, so every host restart threw
 * it away and went back to the on-disk token. When the upstream rotates the
 * refresh token on use (it does), the on-disk copy is already spent by then and
 * the account comes back from every restart as `invalid_grant` — it looks like
 * the account deleted itself overnight, and only signing in again revives it.
 *
 * Persisting the refresh result closes that loop: the newest token the upstream
 * handed us survives a restart, and {@link WorkBuddyAccountPool.scan} merges it
 * against the app's snapshots through the same freshness rules, so a real
 * re-login in the app still wins.
 *
 * Documents are written in the desktop app's own shape (`{auth, account}`) so
 * the ordinary parser reads them with no second code path, and in the app's own
 * plain-string form — these files never hold `$wbEncrypted` fields, so they need
 * no at-rest key to be readable.
 *
 * @module dsh-workbuddy-xdpool/refreshed-store
 */

import { mkdir, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { WorkBuddyCredential } from './accounts.ts'
import { pluginDataDir } from './ignored.ts'

/** Directory holding one `<accountId>.info` per credential this pool refreshed. */
export const REFRESHED_DIR_NAME = 'refreshed'

/** Suffix of a persisted credential; kept as `.info` so the parser accepts it. */
export const REFRESHED_FILE_SUFFIX = '.info'

/** Directory holding the persisted refresh results, inside the plugin data dir. */
export function refreshedDir(env: NodeJS.ProcessEnv = process.env): string {
  return join(pluginDataDir(env), REFRESHED_DIR_NAME)
}

/** Absolute path of the persisted credential for one account. */
export function refreshedCredentialPath(
  accountId: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return join(refreshedDir(env), `${accountId}${REFRESHED_FILE_SUFFIX}`)
}

/**
 * Render a credential as a desktop-app-shaped document.
 *
 * Millisecond epochs are written as-is: the parser's `expiryToMs` treats any
 * value above 1e12 as milliseconds, so no unit juggling is needed here. Fields
 * the upstream did not return are omitted rather than written as zero, because a
 * stored `0` would read back as "unknown expiry" and lose the real one.
 */
export function serializeCredential(credential: WorkBuddyCredential): string {
  const auth: Record<string, unknown> = {
    accessToken: credential.accessToken,
    refreshToken: credential.refreshToken,
    domain: credential.domain,
  }
  if (credential.expiresAtMs > 0) auth['expiresAt'] = credential.expiresAtMs
  if (credential.refreshExpiresAtMs !== undefined) auth['refreshExpiresAt'] = credential.refreshExpiresAtMs
  if (credential.lastRefreshAtMs !== undefined) auth['lastRefreshTime'] = credential.lastRefreshAtMs
  const identity: Record<string, unknown> = {}
  if (credential.uin !== undefined) identity['uin'] = credential.uin
  if (credential.uid !== undefined) identity['uid'] = credential.uid
  if (credential.nickname !== undefined) identity['nickname'] = credential.nickname
  if (credential.enterpriseId !== undefined) identity['enterpriseId'] = credential.enterpriseId
  return `${JSON.stringify({ auth, account: identity }, null, 2)}\n`
}

/**
 * Persist one refreshed credential, atomically.
 *
 * Same temp-then-rename dance the ignore list uses: a crash mid-write must not
 * leave a truncated document behind, because the next scan would then read a
 * half-written token and the account would fail with an unhelpful parse error
 * instead of falling back to the app's own snapshot.
 */
export async function writeRefreshedCredential(
  accountId: string,
  credential: WorkBuddyCredential,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  await writeRefreshedCredentialAt(refreshedDir(env), accountId, credential)
}

/**
 * {@link writeRefreshedCredential} into an explicitly named directory.
 *
 * The pool holds its store as a plain path (configurable, and deliberately
 * absent in tests), so it cannot go through the env-derived default without
 * re-deriving a path it already has.
 */
export async function writeRefreshedCredentialAt(
  dir: string,
  accountId: string,
  credential: WorkBuddyCredential,
): Promise<void> {
  const target = join(dir, `${accountId}${REFRESHED_FILE_SUFFIX}`)
  await mkdir(dir, { recursive: true })
  const temp = `${target}.tmp`
  await writeFile(temp, serializeCredential(credential), 'utf8')
  await rename(temp, target)
}

/** Drop the persisted copy for one account. Best effort. */
export async function removeRefreshedCredential(
  accountId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  try {
    await unlink(refreshedCredentialPath(accountId, env))
  } catch {
    // Nothing to remove is the expected case, not an error.
  }
}

/** Persisted credential files currently on disk, as absolute paths. */
export async function refreshedCredentialFiles(
  env: NodeJS.ProcessEnv = process.env,
): Promise<string[]> {
  let names: string[]
  try {
    names = await readdir(refreshedDir(env))
  } catch {
    return []
  }
  return names
    .filter(name => name.endsWith(REFRESHED_FILE_SUFFIX))
    .map(name => join(refreshedDir(env), name))
}
