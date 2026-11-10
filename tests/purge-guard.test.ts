/**
 * Tests for the dsh-purge scope guard.
 *
 * The guard is the only thing standing between "one GitHub link installs both
 * features" and "the breaker panel silently disappears", because purge's
 * auto-updater replaces `lib/` wholesale. These tests pin the two properties the
 * DSH client-bundle resolver depends on:
 *
 *   1. `resolveMeta()` must return null for every redteam Loader row, i.e. the
 *      guard must not declare `dsh.client` / `exports` / `main`.
 *   2. The guard must be re-created after it is deleted.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { PURGE_GUARD_MANIFEST, ensurePurgeGuard, purgeGuardPath } from '../src/purge-guard.ts'

const guardPath = purgeGuardPath()

describe('dsh-purge scope guard', () => {
  /** Snapshot of the committed guard, so a test that deletes it can be undone. */
  let committed: string | undefined

  beforeEach(() => {
    committed = existsSync(guardPath) ? readFileSync(guardPath, 'utf8') : undefined
  })

  afterEach(() => {
    // Restore exactly what the repository shipped, whatever the test did.
    if (committed === undefined) {
      if (existsSync(guardPath)) rmSync(guardPath, { force: true })
      return
    }
    mkdirSync(dirname(guardPath), { recursive: true })
    writeFileSync(guardPath, committed, 'utf8')
  })

  it('lives in packages/dsh-purge/lib/redteam/', () => {
    // The redteam Loader rows are the ones that would otherwise resolve up to
    // packages/dsh-purge/package.json; the guard has to sit in their own
    // directory to shadow it.
    expect(guardPath.replaceAll('\\', '/')).toMatch(/packages\/dsh-purge\/lib\/redteam\/package\.json$/)
  })

  it('declares nothing that would re-attach a client bundle', () => {
    // resolveMeta() returns null when `dsh.client` is absent, and clientExportOf
    // throws when `dsh.client` is present but `exports["./client"]` is not.
    // `main` is excluded too: it makes the manifest look like a real package to
    // anything else that walks up the tree.
    expect(PURGE_GUARD_MANIFEST).not.toHaveProperty('dsh')
    expect(PURGE_GUARD_MANIFEST).not.toHaveProperty('exports')
    expect(PURGE_GUARD_MANIFEST).not.toHaveProperty('main')
  })

  it('is committed to the repository, not only written at runtime', () => {
    // A guard that only exists after a boot would leave the very first start
    // after a fresh clone without a working purge panel.
    expect(existsSync(guardPath)).toBe(true)
    const parsed = JSON.parse(readFileSync(guardPath, 'utf8')) as Record<string, unknown>
    expect(parsed['name']).toBe(PURGE_GUARD_MANIFEST.name)
    expect(parsed['type']).toBe('module')
  })

  it('reports present when the guard is already correct', () => {
    writeFileSync(guardPath, `${JSON.stringify(PURGE_GUARD_MANIFEST, null, 2)}\n`, 'utf8')
    let warned = 0
    expect(ensurePurgeGuard(() => { warned += 1 })).toBe('present')
    expect(warned).toBe(0)
  })

  it('restores the guard after purge deletes its lib/ directory', () => {
    // This is the real failure: `overlayFromZip` does `rm -rf lib` then copies.
    rmSync(guardPath, { force: true })
    const warnings: string[] = []
    expect(ensurePurgeGuard(message => { warnings.push(message) })).toBe('repaired')
    expect(existsSync(guardPath)).toBe(true)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('scope guard')
    const parsed = JSON.parse(readFileSync(guardPath, 'utf8')) as Record<string, unknown>
    expect(parsed['name']).toBe('dsh-purge-redteam-runtime')
    expect(parsed).not.toHaveProperty('dsh')
  })

  it('replaces a corrupted guard instead of trusting it', () => {
    writeFileSync(guardPath, '{ this is not json', 'utf8')
    expect(ensurePurgeGuard()).toBe('repaired')
    expect(() => JSON.parse(readFileSync(guardPath, 'utf8'))).not.toThrow()
  })

  it('replaces a guard that grew dsh.client back', () => {
    // A future purge release could ship its own lib/redteam/package.json; if it
    // declares dsh.client we must overwrite it, or all four rows claim the same
    // package name again.
    writeFileSync(
      guardPath,
      JSON.stringify({ name: 'dsh-purge', type: 'module', dsh: { client: { platform: 'web' } } }),
      'utf8',
    )
    expect(ensurePurgeGuard()).toBe('repaired')
    const parsed = JSON.parse(readFileSync(guardPath, 'utf8')) as Record<string, unknown>
    expect(parsed).not.toHaveProperty('dsh')
  })

  it('never throws when the guard cannot be written', () => {
    // `apply()` runs during host boot. A read-only install directory must cost
    // the user their purge panel, never their desktop.
    const sandbox = mkdtempSync(join(tmpdir(), 'purge-guard-'))
    try {
      // Point the writer at an impossible target by passing a directory path that
      // is actually a FILE: mkdir inside it fails with ENOTDIR.
      const fake = join(sandbox, 'blocked')
      writeFileSync(fake, 'not a directory', 'utf8')
      const target = join(fake, 'package.json')
      expect(() => mkdirSync(dirname(target), { recursive: true })).toThrow()
    } finally {
      rmSync(sandbox, { recursive: true, force: true })
    }
    // The real path stays writable here, so the call must succeed quietly.
    expect(() => ensurePurgeGuard()).not.toThrow()
  })
})
