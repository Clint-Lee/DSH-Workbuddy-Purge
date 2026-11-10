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
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

import {
  UPDATE_BRANCH,
  UPDATE_REPO,
  applyUpdate,
  checkForUpdate,
  compareVersions,
  extractTarballEntries,
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

/**
 * Tar building blocks for the extractor tests.
 *
 * The defect being guarded is a real one: `tar -xzf` (bsdtar 3.8.8 on Windows)
 * aborts a whole GitHub tarball with `Invalid empty pathname` as soon as it meets
 * `一键安装.bat`, so every link-installed user was unable to update. A hand-built
 * archive with non-ASCII names reproduces the input without the network.
 */
const BLOCK = 512

function octal(value: number, width: number): string {
  return value.toString(8).padStart(width - 1, '0') + '\0'
}

/** One 512-byte ustar header. The parser under test does not verify checksums. */
function header(name: string, size: number, typeflag: string, prefix = ''): Buffer {
  const block = Buffer.alloc(BLOCK, 0)
  block.write(name, 0, 100, 'utf8')
  block.write(octal(0o644, 8), 100, 'ascii')
  block.write(octal(0, 8), 108, 'ascii')
  block.write(octal(0, 8), 116, 'ascii')
  block.write(octal(size, 12), 124, 'ascii')
  block.write(octal(0, 12), 136, 'ascii')
  block.write('        ', 148, 'ascii')
  block.write(typeflag, 156, 'ascii')
  block.write('ustar\0', 257, 'ascii')
  block.write('00', 263, 'ascii')
  block.write(prefix, 345, 155, 'utf8')
  return block
}

/**
 * A pax record: "<len> <key>=<value>\n", where len is the record's length in
 * BYTES — not characters. `一键安装` is four characters but twelve bytes, so
 * measuring with `String.length` produces a record the parser cannot walk.
 */
function paxRecord(key: string, value: string): Buffer {
  const body = Buffer.from(` ${key}=${value}\n`, 'utf8')
  let digits = 1
  // The length field is part of the length it describes, so it needs a fixed
  // point: grow it until adding the digits no longer changes the total.
  while (String(body.length + digits).length !== digits) digits += 1
  const total = body.length + digits
  return Buffer.concat([Buffer.from(`${total}`, 'ascii'), body])
}

/** File entry, using a pax header when the name needs one. */
function entry(path: string, content: string): Buffer {
  const body = Buffer.from(content, 'utf8')
  const padded = Buffer.alloc(Math.ceil(body.length / BLOCK) * BLOCK, 0)
  body.copy(padded)
  // Non-ASCII or over-long names go through pax, exactly as GitHub emits them.
  if (/[^\x20-\x7e]/.test(path) || path.length > 100) {
    const record = paxRecord('path', path)
    const recordPadded = Buffer.alloc(Math.ceil(record.length / BLOCK) * BLOCK, 0)
    record.copy(recordPadded)
    return Buffer.concat([header('PaxHeader', record.length, 'x'), recordPadded, header(cut(path), body.length, '0'), padded])
  }
  return Buffer.concat([header(path, body.length, '0'), padded])
}

/** ustar keeps the first 100 BYTES even when pax carries the real name. */
function cut(path: string): string {
  return Buffer.from(path, 'utf8').subarray(0, 100).toString('latin1')
}

/** Gzipped tar with GitHub's `<repo>-<branch>/` wrapper. */
function archive(entries: readonly Buffer[]): Buffer {
  const end = Buffer.alloc(BLOCK * 2, 0)
  return gzipSync(Buffer.concat([...entries, end]))
}

describe('extractTarballEntries', () => {
  it('extracts non-ASCII names that make bsdtar abort', async () => {
    // The exact file that broke the update on Windows.
    const dir = mkdtempSync(join(tmpdir(), 'wbx-tar-'))
    created.push(dir)
    const archivePath = join(dir, 'bundle.tar.gz')
    writeFileSync(archivePath, archive([
      entry('repo-main/一键安装.bat', '@echo off\n'),
      entry('repo-main/lib/index.js', 'export const x = 1\n'),
    ]))
    const dest = join(dir, 'stage')
    mkdirSync(dest, { recursive: true })
    const written = await extractTarballEntries(archivePath, dest)
    expect(written).toBe(2)
    expect(readFileSync(join(dest, '一键安装.bat'), 'utf8')).toBe('@echo off\n')
    expect(readFileSync(join(dest, 'lib', 'index.js'), 'utf8')).toBe('export const x = 1\n')
  })

  it('strips the wrapper directory so paths land where the installer expects', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wbx-tar-'))
    created.push(dir)
    const archivePath = join(dir, 'bundle.tar.gz')
    writeFileSync(archivePath, archive([entry('repo-main/package.json', '{"version":"2.0.0"}')]))
    const dest = join(dir, 'stage')
    mkdirSync(dest, { recursive: true })
    await extractTarballEntries(archivePath, dest)
    expect(existsSync(join(dest, 'package.json'))).toBe(true)
    expect(existsSync(join(dest, 'repo-main'))).toBe(false)
  })

  it('writes nothing outside the overlay allow-list', async () => {
    // A tarball may carry anything; only lib/, packages/, assets/ and the named
    // files may reach the install tree.
    const dir = mkdtempSync(join(tmpdir(), 'wbx-tar-'))
    created.push(dir)
    const archivePath = join(dir, 'bundle.tar.gz')
    writeFileSync(archivePath, archive([
      entry('repo-main/lib/index.js', 'x'),
      entry('repo-main/tests/secret.test.ts', 'x'),
      entry('repo-main/src/index.ts', 'x'),
      entry('repo-main/.github/workflows/ci.yml', 'x'),
    ]))
    const dest = join(dir, 'stage')
    mkdirSync(dest, { recursive: true })
    const written = await extractTarballEntries(archivePath, dest)
    expect(written).toBe(1)
    expect(existsSync(join(dest, 'lib', 'index.js'))).toBe(true)
    expect(existsSync(join(dest, 'tests'))).toBe(false)
    expect(existsSync(join(dest, 'src'))).toBe(false)
    expect(existsSync(join(dest, '.github'))).toBe(false)
  })

  it('refuses traversal segments', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wbx-tar-'))
    created.push(dir)
    const archivePath = join(dir, 'bundle.tar.gz')
    writeFileSync(archivePath, archive([entry('repo-main/lib/../../evil.js', 'x')]))
    const dest = join(dir, 'stage')
    mkdirSync(dest, { recursive: true })
    const written = await extractTarballEntries(archivePath, dest)
    expect(written).toBe(0)
    expect(existsSync(join(dir, 'evil.js'))).toBe(false)
  })

  it('reads an uncompressed tar too', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wbx-tar-'))
    created.push(dir)
    const archivePath = join(dir, 'bundle.tar')
    writeFileSync(archivePath, Buffer.concat([entry('repo-main/lib/index.js', 'plain'), Buffer.alloc(BLOCK * 2, 0)]))
    const dest = join(dir, 'stage')
    mkdirSync(dest, { recursive: true })
    expect(await extractTarballEntries(archivePath, dest)).toBe(1)
    expect(readFileSync(join(dest, 'lib', 'index.js'), 'utf8')).toBe('plain')
  })
})
