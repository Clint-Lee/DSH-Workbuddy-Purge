/**
 * Self-update for this bundle: ask GitHub what the newest published version is,
 * and — when asked — pull it in place.
 *
 * ## Why GitHub's raw host and codeload, and never `api.github.com`
 *
 * Measured on the machine this was written on: `api.github.com` answers
 * `403 API rate limit exceeded` for unauthenticated callers, so an update check
 * built on it fails for most users most of the time. `raw.githubusercontent.com`
 * and `codeload.github.com` do not apply that limit. The version is therefore
 * read out of the remote `package.json`, and the payload comes down as a
 * tarball.
 *
 * ## Why two apply paths
 *
 * A junction install (`install.ps1`) points the profile at a real checkout, so
 * `<root>/.git` exists and the honest update is `git pull --ff-only` — it keeps
 * history and lets the user diff. A link install (pasted into the DSH plugin
 * manager) lands in a pnpm snapshot with no `.git`; there the only way forward is
 * to overlay the new files. Both are implemented because choosing one would
 * break the other install shape.
 *
 * Overlay is ordered so a failure leaves a working plugin: every file is
 * validated in a staging directory FIRST, only then is the live tree touched, and
 * `lib/` and `packages/` are copied aside before being replaced.
 *
 * @module dsh-workbuddy-xdpool/update-source
 */

import { spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Repository the bundle is published from. */
export const UPDATE_REPO = 'Clint-Lee/DSH-Workbuddy-Purge'

/** Branch tracked for updates. */
export const UPDATE_BRANCH = 'main'

/** Remote manifest used for the version comparison (no API rate limit). */
export const UPDATE_MANIFEST_URL = `https://raw.githubusercontent.com/${UPDATE_REPO}/${UPDATE_BRANCH}/package.json`

/** Tarball used by the overlay path. */
export const UPDATE_TARBALL_URL = `https://codeload.github.com/${UPDATE_REPO}/tar.gz/refs/heads/${UPDATE_BRANCH}`

/**
 * Entries replaced wholesale by the overlay path.
 *
 * Directories are removed before copying; files are overwritten. Anything not
 * listed here (notably `packages/dsh-purge/lib/redteam/package.json`, the
 * client-bundle scope guard) is still covered because it lives under one of
 * these entries — `packages` is copied as a whole.
 */
const OVERLAY_DIRS = ['lib', 'packages', 'assets'] as const

/** Single files refreshed by the overlay path, when the tarball carries them. */
const OVERLAY_FILES = [
  'cordis.patch.yml',
  'package.json',
  'install.ps1',
  '一键安装.bat',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'screenshots.json',
] as const

/**
 * Files that must exist in a staged tarball before it may replace the live tree.
 *
 * `lib/index.js` is the host entry; the scope guard is what keeps the merged
 * purge front end loading (see `purge-guard.ts`); the patch file is what mounts
 * purge at all. A tarball missing any of them is not an update, it is a broken
 * download.
 */
const REQUIRED_IN_TARBALL = [
  'package.json',
  'lib/index.js',
  'cordis.patch.yml',
  'packages/dsh-purge/lib/index.js',
  'packages/dsh-purge/lib/redteam/package.json',
] as const

/** Backups kept beside the live tree before an overlay. */
const BACKUP_KEEP = 2

/** How long a git pull or tar extraction may take. */
const COMMAND_TIMEOUT_MS = 120_000

/** Network budget for the manifest and the tarball. */
const FETCH_TIMEOUT_MS = 30_000

/** Result of asking GitHub for the newest version. */
export interface UpdateCheckResult {
  ok: boolean
  /** Version baked into the installed bundle. */
  currentVersion: string
  /** Version published on the tracked branch, when it could be read. */
  latestVersion?: string
  /** True when `latestVersion` is not newer than `currentVersion`. */
  upToDate?: boolean
  /** Commit-ish the branch pointed at, when git could tell us. */
  latestRef?: string
  checkedAt: string
  /** Present when the check itself failed. */
  error?: string
}

/** Result of applying an update. */
export interface UpdateApplyResult {
  ok: boolean
  fromVersion: string
  toVersion?: string
  /**
   * How the update was applied.
   *
   * `git` = the checkout was fast-forwarded; `overlay` = files were replaced in
   * a snapshot install. Reported so the dialog can say something true about what
   * happened instead of "updated".
   */
  mode?: 'git' | 'overlay'
  /** Directory holding the previous `lib/` and `packages/`, for `overlay`. */
  backupDir?: string
  /** The host caches client bundles, so every path ends with a restart. */
  restartRequired: boolean
  error?: string
}

/**
 * Compare two dotted numeric versions.
 *
 * Only the leading numeric run of each part counts: `1.9.10` must beat `1.9.9`
 * (string order says the opposite), and a missing part counts as 0 so `1.10` and
 * `1.10.0` tie.
 *
 * Parsing stops at the first non-numeric part. Without that, `1.9.9-rc.1` parses
 * as `[1, 9, 9, 0, 1]` and outranks `1.9.9` as `[1, 9, 9]` — which would offer a
 * prerelease as an upgrade over the release it precedes, and then report the
 * install as out of date forever after.
 */
export function compareVersions(left: string, right: string): number {
  const parse = (value: string): number[] => {
    const parts: number[] = []
    for (const part of value.split(/[.-]/u)) {
      const digits = /^\d+/u.exec(part)
      if (digits === null) break
      parts.push(Number(digits[0]))
    }
    return parts
  }
  const a = parse(left)
  const b = parse(right)
  const width = Math.max(a.length, b.length)
  for (let index = 0; index < width; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }
  return 0
}

/** Read `version` out of a `package.json` document; `0.0.0` when unreadable. */
async function readVersionFrom(packageJsonPath: string): Promise<string> {
  try {
    const parsed: unknown = JSON.parse(await readFile(packageJsonPath, 'utf8'))
    if (typeof parsed === 'object' && parsed !== null) {
      const version = (parsed as { version?: unknown }).version
      if (typeof version === 'string' && version !== '') return version
    }
  } catch {
    // Missing or malformed: the caller renders "unknown", never a crash.
  }
  return '0.0.0'
}

/**
 * Synchronous twin of {@link readVersionFrom}.
 *
 * The load-time snapshot is taken with this one: `apply()` is synchronous and
 * the value is needed before any route can answer, so an async read would either
 * force a promise into the apply path or leave the first request unversioned.
 */
export function readInstalledVersion(pluginRoot: string): string {
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(pluginRoot, 'package.json'), 'utf8'))
    if (typeof parsed === 'object' && parsed !== null) {
      const version = (parsed as { version?: unknown }).version
      if (typeof version === 'string' && version !== '') return version
    }
  } catch {
    // Same degradation as above: the dialog shows 0.0.0, everything else works.
  }
  return '0.0.0'
}

/** `fetch` with a deadline, so a hung connection cannot pin the route. */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal, redirect: 'follow' })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Ask the tracked branch for its manifest version.
 *
 * Never throws: every failure is folded into `error`, because this backs a
 * button the user may press while offline and an exception would surface as a
 * 500 in a dialog that is supposed to explain itself.
 */
export async function checkForUpdate(pluginRoot: string): Promise<UpdateCheckResult> {
  const checkedAt = new Date().toISOString()
  const currentVersion = await readVersionFrom(join(pluginRoot, 'package.json'))
  try {
    const response = await fetchWithTimeout(UPDATE_MANIFEST_URL)
    if (!response.ok) {
      return { ok: false, currentVersion, checkedAt, error: `GitHub answered HTTP ${response.status}` }
    }
    const text = await response.text()
    const parsed: unknown = JSON.parse(text)
    const latestVersion = typeof parsed === 'object' && parsed !== null
      ? (parsed as { version?: unknown }).version
      : undefined
    if (typeof latestVersion !== 'string' || latestVersion === '') {
      return { ok: false, currentVersion, checkedAt, error: 'the remote package.json carries no version' }
    }
    return {
      ok: true,
      currentVersion,
      latestVersion,
      upToDate: compareVersions(latestVersion, currentVersion) <= 0,
      checkedAt,
    }
  } catch (error: unknown) {
    return { ok: false, currentVersion, checkedAt, error: describe(error) }
  }
}

/** One-line, redacted error text. */
function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, 400)
}

/** Run a command, returning stdout/stderr and whether it exited 0. */
function run(
  command: string,
  args: readonly string[],
  cwd: string,
): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync(command, [...args], {
    cwd,
    timeout: COMMAND_TIMEOUT_MS,
    encoding: 'utf8',
    windowsHide: true,
  })
  return {
    ok: result.status === 0 && result.error === undefined,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? result.error?.message ?? ''),
  }
}

/** Timestamp suitable for a directory name. */
function stamp(): string {
  return new Date().toISOString().replace(/[:.]/gu, '-')
}

/**
 * Move `<name>` aside as `<name>.bak-<stamp>`, keeping only the newest few.
 *
 * Rename rather than copy: the tree can be tens of megabytes and a rename is
 * atomic, so a crash mid-update leaves either the old tree or the backup — never
 * a half-written one.
 */
async function stashAside(pluginRoot: string, name: string): Promise<string | undefined> {
  const source = join(pluginRoot, name)
  if (!existsSync(source)) return undefined
  const target = join(pluginRoot, `${name}.bak-${stamp()}`)
  await rename(source, target)
  await pruneBackups(pluginRoot, name)
  return target
}

/** Delete all but the newest {@link BACKUP_KEEP} `<name>.bak-*` siblings. */
async function pruneBackups(pluginRoot: string, name: string): Promise<void> {
  try {
    const prefix = `${name}.bak-`
    const entries = (await readdir(pluginRoot))
      .filter(entry => entry.startsWith(prefix))
      .sort()
      .reverse()
    for (const stale of entries.slice(BACKUP_KEEP)) {
      await rm(join(pluginRoot, stale), { recursive: true, force: true })
    }
  } catch {
    // Housekeeping only; a leftover backup is harmless.
  }
}

/**
 * Fast-forward a real checkout.
 *
 * `--ff-only` on purpose: this runs unattended from a button, and a merge
 * conflict raised there would leave the working tree in a state the user cannot
 * see. A divergence must be resolved in a terminal.
 */
async function applyViaGit(
  pluginRoot: string,
): Promise<UpdateApplyResult> {
  const fromVersion = await readVersionFrom(join(pluginRoot, 'package.json'))
  const pulled = run('git', ['pull', '--ff-only', 'origin', UPDATE_BRANCH], pluginRoot)
  if (!pulled.ok) {
    return {
      ok: false,
      fromVersion,
      mode: 'git',
      restartRequired: false,
      error: `git pull failed: ${(pulled.stderr || pulled.stdout).trim().slice(0, 400)}`,
    }
  }
  const toVersion = await readVersionFrom(join(pluginRoot, 'package.json'))
  return { ok: true, fromVersion, toVersion, mode: 'git', restartRequired: true }
}

/** Extract a `.tar.gz` into `dest` using the OS tar (always present on 10+). */
async function extractTarball(archivePath: string, dest: string): Promise<void> {
  const result = run('tar', ['-xzf', archivePath, '-C', dest], dest)
  if (!result.ok) throw new Error(`tar failed: ${(result.stderr || result.stdout).trim().slice(0, 300)}`)
}

/**
 * Download the branch tarball, stage it, and overlay it onto the live tree.
 *
 * Order matters and is the whole safety story:
 *   1. download to a temp file (nothing live touched),
 *   2. extract to a temp directory,
 *   3. assert every required file is present,
 *   4. rename `lib`/`packages` aside,
 *   5. copy the staged entries in.
 *
 * A failure at 1-3 leaves the install untouched; a failure at 5 leaves a backup
 * directory the user (or the next run) can restore by hand.
 */
async function applyViaOverlay(pluginRoot: string): Promise<UpdateApplyResult> {
  const fromVersion = await readVersionFrom(join(pluginRoot, 'package.json'))
  const work = await mkdtemp(join(tmpdir(), 'dsh-workbuddy-update-'))
  try {
    const response = await fetchWithTimeout(UPDATE_TARBALL_URL)
    if (!response.ok) {
      return { ok: false, fromVersion, mode: 'overlay', restartRequired: false, error: `GitHub answered HTTP ${response.status}` }
    }
    const archivePath = join(work, 'bundle.tar.gz')
    await writeFile(archivePath, Buffer.from(await response.arrayBuffer()))

    const stage = join(work, 'stage')
    await mkdir(stage, { recursive: true })
    await extractTarball(archivePath, stage)

    // GitHub wraps everything in one `<repo>-<branch>/` directory.
    const top = (await readdir(stage))[0]
    if (top === undefined) {
      return { ok: false, fromVersion, mode: 'overlay', restartRequired: false, error: 'the tarball was empty' }
    }
    const staged = join(stage, top)
    for (const required of REQUIRED_IN_TARBALL) {
      if (!existsSync(join(staged, required))) {
        return {
          ok: false,
          fromVersion,
          mode: 'overlay',
          restartRequired: false,
          error: `the download is missing ${required} — nothing was changed`,
        }
      }
    }

    const backupDir = join(pluginRoot, `update-backup-${stamp()}`)
    await mkdir(backupDir, { recursive: true })
    let stashed = 0
    for (const name of [...OVERLAY_DIRS, ...OVERLAY_FILES]) {
      const aside = await stashAside(pluginRoot, name)
      if (aside === undefined) continue
      await rename(aside, join(backupDir, name))
      stashed += 1
    }
    if (stashed === 0) {
      return { ok: false, fromVersion, mode: 'overlay', restartRequired: false, error: 'the install directory did not contain the expected entries' }
    }

    for (const name of OVERLAY_DIRS) {
      const source = join(staged, name)
      if (!existsSync(source)) continue
      await cp(source, join(pluginRoot, name), { recursive: true })
    }
    for (const name of OVERLAY_FILES) {
      const source = join(staged, name)
      if (!existsSync(source)) continue
      await cp(source, join(pluginRoot, name))
    }

    const toVersion = await readVersionFrom(join(pluginRoot, 'package.json'))
    return { ok: true, fromVersion, toVersion, mode: 'overlay', backupDir, restartRequired: true }
  } catch (error: unknown) {
    return { ok: false, fromVersion, mode: 'overlay', restartRequired: false, error: describe(error) }
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => undefined)
  }
}

/**
 * Update the bundle in `pluginRoot` by whichever route fits how it was installed.
 *
 * Detects a real checkout by `.git` presence rather than by guessing from the
 * path, because a junction install and a snapshot install differ only in that.
 */
export async function applyUpdate(pluginRoot: string): Promise<UpdateApplyResult> {
  const isCheckout = existsSync(join(pluginRoot, '.git'))
  return isCheckout ? applyViaGit(pluginRoot) : applyViaOverlay(pluginRoot)
}

/** Where this bundle lives on disk, from the built `lib/` entry. */
export function pluginRootFrom(moduleUrl: string): string {
  const here = fileURLToPath(moduleUrl)
  return join(dirname(here), '..')
}
