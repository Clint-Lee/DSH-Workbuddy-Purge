/**
 * Keeps the purge scope guard in place.
 *
 * `cordis.patch.yml` mounts purge by RELATIVE file paths
 * (`./packages/dsh-purge/lib/index.js` and three sibling redteam entries).
 * `@deepseek-ai/dsh-client-modules` walks up from each of those files looking
 * for the nearest `package.json`; without a guard all four resolve to
 * `packages/dsh-purge/package.json`, every row reports `packageName:
 * dsh-purge`, and `reconcilePackage` throws
 * `resolves from multiple active Loader sources` — which drops the whole purge
 * client bundle, i.e. the breaker panel silently disappears.
 *
 * `packages/dsh-purge/lib/redteam/package.json` is that guard: it declares no
 * `dsh` / `dsh.client` / `exports` field, so `resolveMeta()` returns null for
 * the three redteam rows (they load as plain Loader rows) while only
 * `lib/index.js` still owns the `dsh-purge` client bundle.
 *
 * The reason this module exists rather than just committing the file: purge's
 * own auto-updater replaces the entire `lib` directory wholesale
 * (`packages/dsh-purge/lib/update.js` COPY_NAMES contains `"lib"`, and the
 * overlay does `rm -rf lib` then copy). Every purge self-update therefore
 * deletes the guard. Rewriting it here on every boot makes the guard survive an
 * update instead of turning the next DSH start into a missing-panel bug report.
 *
 * @module dsh-workbuddy-xdpool/purge-guard
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Name of the directory the guard must live in, relative to the plugin root. */
const GUARD_DIR = 'packages/dsh-purge/lib/redteam'

/** The guard manifest. Must never grow `dsh`, `dsh.client` or `exports`. */
export const PURGE_GUARD_MANIFEST = {
  name: 'dsh-purge-redteam-runtime',
  version: '0.0.0',
  private: true,
  type: 'module',
  description: 'SCOPE GUARD for the DSH client-bundle resolver. This file exists ONLY to stop dsh-client-modules from attributing the three redteam Loader rows (redteam/index.js, redteam/store.js, redteam/ui.js) to the dsh-purge package manifest one directory up. If they did resolve there, all four rows would report packageName "dsh-purge" and reconcilePackage would throw "resolves from multiple active Loader sources", which drops the whole dsh-purge client bundle. This manifest deliberately declares no dsh / dsh.client field, so resolveMeta() returns null and the rows are skipped by the client-bundle table while still loading normally as Loader rows. It must also stay free of an "exports" field, or the file: URL imports would be remapped.',
} as const

/** Absolute path of the guard file for the plugin rooted at this module's lib/. */
export function purgeGuardPath(): string {
  const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)))
  return join(pluginRoot, GUARD_DIR, 'package.json')
}

/**
 * Fields whose presence would re-introduce the `resolves from multiple active
 * Loader sources` throw. A guard that has any of them is worse than no guard:
 * it makes the redteam rows claim `dsh.client` again.
 */
const FORBIDDEN_KEYS = ['dsh', 'exports', 'main'] as const

/** True when `text` is a usable guard manifest. */
function isUsableGuard(text: string): boolean {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return false
  }
  if (typeof parsed !== 'object' || parsed === null) return false
  const record = parsed as Record<string, unknown>
  for (const key of FORBIDDEN_KEYS) {
    if (key in record) return false
  }
  return record['type'] === 'module'
}

/**
 * Make sure the scope guard exists and is still a guard.
 *
 * Deliberately synchronous and non-throwing: `apply()` runs during host boot and
 * a read-only install directory must not take the desktop down. A missing or
 * corrupted guard is reported through `warn` and the plugin keeps running — the
 * blast radius of a broken guard is a missing purge panel, not a broken host.
 *
 * @param warn - logger sink; called only when the guard had to be (re)written.
 * @returns what happened, for tests and for the boot log.
 */
export function ensurePurgeGuard(
  warn?: (message: string, error?: unknown) => void,
): 'present' | 'repaired' | 'failed' {
  const target = purgeGuardPath()
  try {
    if (existsSync(target) && isUsableGuard(readFileSync(target, 'utf8'))) return 'present'
  } catch {
    // Fall through to the rewrite: an unreadable guard is as good as absent.
  }
  try {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, `${JSON.stringify(PURGE_GUARD_MANIFEST, null, 2)}\n`, 'utf8')
    warn?.(`dsh-workbuddy-xdpool: rewrote the dsh-purge scope guard at ${target} (purge's auto-update replaces its lib/ wholesale)`)
    return 'repaired'
  } catch (error: unknown) {
    warn?.(`dsh-workbuddy-xdpool: could not write the dsh-purge scope guard at ${target}; the breaker panel will not load until it exists`, error)
    return 'failed'
  }
}
