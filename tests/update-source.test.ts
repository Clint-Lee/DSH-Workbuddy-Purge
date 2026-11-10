/**
 * Tests for the self-update path.
 *
 * What is worth pinning here, and why:
 *
 *  - `compareVersions` decides whether the Update button is enabled at all, so a
 *    wrong answer is either "offers an update that does not exist" or "hides a
 *    real one". The numeric-prefix rule (`1.9.10` > `1.9.9`, not string order) is
 *    the whole reason the function exists.
 *  - `checkForUpdate` must never throw. It backs a button that can be pressed
 *    offline, and an exception would surface as a 500 in a dialog whose job is to
 *    explain itself.
 *  - `applyUpdate` must choose the git route only for a real checkout. A snapshot
 *    install has no `.git`, and running `git pull` there would either fail
 *    confusingly or (worse) pull into a parent repository.
 */

import { describe, expect, it, vi, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  UPDATE_BRANCH,
  UPDATE_REPO,
  applyUpdate,
  checkForUpdate,
  compareVersions,
  readInstalledVersion,
} from '../src/update-source.ts'

/** Directories created by a test, removed afterwards. */
const created: string[] = []

afterEach(() => {
  vi.unstubAllGlobals()
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A throwaway install root with a package.json of the given version. */
function fakeRoot(version: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'wbx-update-'))
  created.push(dir)
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'dsh-workbuddy-xdpool', version }, null, 2), 'utf8')
  return dir
}

describe('compareVersions', () => {
  it('orders by numeric segment, not by string', () => {
    // The defect this guards: string comparison puts 1.9.10 before 1.9.9.
    expect(compareVersions('1.9.10', '1.9.9')).toBe(1)
    expect(compareVersions('1.9.9', '1.9.10')).toBe(-1)
    expect(compareVersions('1.9.10', '1.9.10')).toBe(0)
  })

  it('treats a missing segment as zero', () => {
    expect(compareVersions('1.10', '1.10.0')).toBe(0)
    expect(compareVersions('2', '1.99.99')).toBe(1)
  })

  it('ignores a prerelease suffix for ordering purposes', () => {
    // Deliberate: this plugin publishes plain versions, and treating "1.9.9-rc.1"
    // as newer than "1.9.9" would offer an update that goes backwards.
    expect(compareVersions('1.9.9-rc.1', '1.9.9')).toBe(0)
  })
})

describe('readInstalledVersion', () => {
  it('reads the version out of package.json', () => {
    expect(readInstalledVersion(fakeRoot('1.9.10'))).toBe('1.9.10')
  })

  it('answers 0.0.0 when the file is missing, instead of throwing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wbx-update-empty-'))
    created.push(dir)
    expect(readInstalledVersion(dir)).toBe('0.0.0')
  })

  it('answers 0.0.0 on malformed JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wbx-update-bad-'))
    created.push(dir)
    writeFileSync(join(dir, 'package.json'), '{ not json', 'utf8')
    expect(readInstalledVersion(dir)).toBe('0.0.0')
  })
})

describe('checkForUpdate', () => {
  it('reports an available update when the remote version is newer', async () => {
    const root = fakeRoot('1.9.10')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ version: '1.9.11' }), { status: 200 })))
    const result = await checkForUpdate(root)
    expect(result.ok).toBe(true)
    expect(result.currentVersion).toBe('1.9.10')
    expect(result.latestVersion).toBe('1.9.11')
    expect(result.upToDate).toBe(false)
  })

  it('reports up to date when the versions match', async () => {
    const root = fakeRoot('1.9.10')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ version: '1.9.10' }), { status: 200 })))
    const result = await checkForUpdate(root)
    expect(result.ok).toBe(true)
    expect(result.upToDate).toBe(true)
  })

  it('never throws when the network is down', async () => {
    const root = fakeRoot('1.9.10')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('getaddrinfo ENOTFOUND raw.githubusercontent.com') }))
    const result = await checkForUpdate(root)
    expect(result.ok).toBe(false)
    expect(result.currentVersion).toBe('1.9.10')
    expect(result.error).toContain('ENOTFOUND')
  })

  it('surfaces a non-2xx answer as a readable error', async () => {
    const root = fakeRoot('1.9.10')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate limited', { status: 403 })))
    const result = await checkForUpdate(root)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('403')
  })

  it('does not report an update when the remote manifest has no version', async () => {
    const root = fakeRoot('1.9.10')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ name: 'x' }), { status: 200 })))
    const result = await checkForUpdate(root)
    expect(result.ok).toBe(false)
    expect(result.latestVersion).toBeUndefined()
  })

  it('reads the manifest from the raw host, never the rate-limited API', () => {
    // api.github.com answers 403 for unauthenticated callers on this network, so
    // an update check built on it fails for most users. Pin the host.
    expect(UPDATE_REPO).toBe('Clint-Lee/DSH-Workbuddy-Purge')
    expect(UPDATE_BRANCH).toBe('main')
  })
})

describe('applyUpdate', () => {
  it('refuses to fast-forward a directory that is not a checkout', async () => {
    // No .git: the overlay route is chosen, which needs the network. Stubbing
    // fetch to fail proves the git route was NOT taken — a `git pull` would have
    // reported "not a git repository" instead.
    const root = fakeRoot('1.9.10')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const result = await applyUpdate(root)
    expect(result.ok).toBe(false)
    expect(result.mode).toBe('overlay')
    expect(result.error).toContain('offline')
  })

  it('leaves the install untouched when the download fails', async () => {
    const root = fakeRoot('1.9.10')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
    const result = await applyUpdate(root)
    expect(result.ok).toBe(false)
    // The version on disk is unchanged and still readable: nothing was replaced.
    expect(readInstalledVersion(root)).toBe('1.9.10')
  })

  it('runs git for a real checkout', async () => {
    const root = fakeRoot('1.9.10')
    mkdirSync(join(root, '.git'), { recursive: true })
    const result = await applyUpdate(root)
    expect(result.mode).toBe('git')
    // Not a working repository, so the pull must fail — but it failed as a git
    // operation, which is the routing decision under test.
    expect(result.ok).toBe(false)
    expect(result.error).toContain('git pull failed')
  })
})
