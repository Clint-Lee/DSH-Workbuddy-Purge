/**
 * The pool's durable account roster.
 *
 * Why this file exists: the desktop app keeps ONE sign-in on disk. Every time the
 * user signs into a second account, the app overwrites `workbuddy-desktop.info`
 * (and appends a timestamped snapshot), so the pool's knowledge of "the other
 * account" lived only in memory. Signing in to two accounts, using the pool for a
 * day and restarting the host therefore came back with a single account, and the
 * second one had to be signed in again — which overwrote the first, and so on.
 * The roster is the missing layer: `scan()` seeds from it, so an account the
 * app's directory no longer carries survives a restart, and writes the merged
 * list back after every scan.
 *
 * It is deliberately separate from {@link refreshedCredentialPath}: that
 * directory holds tokens the upstream handed US after a refresh, and its files
 * participate in the freshness comparison as "refreshed" credentials. The roster
 * is a fallback — every account it holds is stored with the store's own path as
 * `sourcePath`, so any credential still on disk, and any live sign-in, outranks
 * it. That keeps a re-login in the app authoritative even when the roster holds a
 * later-looking expiry.
 *
 * JSON, owner-only where the platform allows it, atomic rename on write: a crash
 * mid-write leaves the previous generation intact and the pool never reads a
 * half-written roster.
 *
 * @module dsh-workbuddy-xdpool/account-store
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { WorkBuddyAccount, WorkBuddyCredential } from './accounts.ts'
import { pluginDataDir } from './ignored.ts'

/** File holding the durable roster, inside the plugin data directory. */
export const ACCOUNTS_FILE_NAME = 'accounts.json'

/** One durably stored account: identity plus the credential that worked. */
export interface StoredAccount {
  id: string
  label: string
  credential: WorkBuddyCredential
  savedAtMs: number
}

/** Absolute path of the durable roster. */
export function accountStorePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(pluginDataDir(env), ACCOUNTS_FILE_NAME)
}

/**
 * True when a value has the shape of a stored account.
 *
 * The token fields are the load-bearing ones: an entry without a usable access
 * and refresh token cannot serve a request, and admitting it would put a
 * permanently unusable row on the card.
 */
function isStoredAccount(value: unknown): value is StoredAccount {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  const credential = record['credential']
  if (typeof record['id'] !== 'string' || record['id'].trim() === '') return false
  if (typeof record['label'] !== 'string') return false
  if (typeof credential !== 'object' || credential === null) return false
  const tokens = credential as Record<string, unknown>
  return typeof tokens['accessToken'] === 'string'
    && tokens['accessToken'] !== ''
    && typeof tokens['refreshToken'] === 'string'
    && tokens['refreshToken'] !== ''
    && typeof tokens['domain'] === 'string'
}

/**
 * Read the roster, tolerating every "no roster yet" shape.
 *
 * A missing file, an unreadable one, invalid JSON, or a document written by an
 * older build all mean the same thing to the caller — remember nothing — so none
 * of them throws. A machine that has never pooled an account must still start.
 */
export async function loadStoredAccounts(path: string): Promise<StoredAccount[]> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch {
    return []
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return []
  }
  const entries = (parsed as { accounts?: unknown } | null)?.['accounts']
  if (!Array.isArray(entries)) return []
  const out: StoredAccount[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    if (!isStoredAccount(entry)) continue
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    out.push(entry)
  }
  return out
}

/** What a roster entry means to a scan: a credential that must not outrank disk. */
export function storedCredential(entry: StoredAccount, path: string): WorkBuddyCredential {
  return {
    ...entry.credential,
    // The store is a fallback, never a source of truth. Keeping the original
    // `sourcePath` would let a stored copy claim to be the app's LIVE sign-in (or
    // one of our own refreshed files) and win the freshness comparison against a
    // genuinely newer credential on disk — the exact trap that kept a revoked
    // token in rotation. Pointing it at the roster makes every on-disk file
    // fresher by construction.
    sourcePath: path,
  }
}

/**
 * Replace the roster, atomically.
 *
 * Only the fields the pool actually needs are written: a credential carries a
 * `sourcePath` that is meaningless after a restart, and writing it back would
 * preserve a claim about which file is live long after that file changed.
 */
export async function saveStoredAccounts(
  path: string,
  accounts: readonly WorkBuddyAccount[],
): Promise<void> {
  const savedAtMs = Date.now()
  const stored: StoredAccount[] = accounts.map(account => ({
    id: account.id,
    label: account.label,
    credential: { ...account.credential, sourcePath: path },
    savedAtMs,
  }))
  const document = `${JSON.stringify({ version: 1, accounts: stored }, null, 2)}\n`
  // Create the directory the TARGET lives in: tests pass an explicit path, and
  // creating a default directory instead would leave the write failing ENOENT.
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.tmp`
  await writeFile(temp, document, 'utf8')
  await rename(temp, path)
}

/**
 * A cheap fingerprint of what the roster would contain.
 *
 * Scans are event-driven — the card refreshes its status document on a timer, and
 * every refresh rescans — so writing the roster unconditionally would rewrite the
 * same bytes several times a minute. Comparing a fingerprint first keeps the
 * write to the scans that actually learned something (a new account, a rotated
 * token, a label change).
 */
export function rosterSignature(accounts: readonly WorkBuddyAccount[]): string {
  return accounts
    .map(account => [
      account.id,
      account.label,
      account.credential.accessToken,
      account.credential.refreshToken,
      account.credential.expiresAtMs,
      account.credential.lastRefreshAtMs ?? 0,
    ].join('\u0000'))
    .join('\u0001')
}

/**
 * Drop roster entries whose refresh window closed before `now`.
 *
 * Kept out of {@link saveStoredAccounts} on purpose: pruning is a policy
 * decision, and the pool is the only place that knows whether an account is still
 * worth listing. An account whose refresh token expired AND whose access token
 * expired cannot do anything but fail, so keeping it would only put a permanent
 * error row on the card.
 */
export function isRosterEntryUsable(credential: WorkBuddyCredential, now: number): boolean {
  if (credential.expiresAtMs > now) return true
  if (credential.refreshExpiresAtMs === undefined) return true
  return credential.refreshExpiresAtMs > now
}
