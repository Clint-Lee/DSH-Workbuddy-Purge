/**
 * Pin the one property whose absence froze DSH outright.
 *
 * 1.9.11 mounted the chat-header chip and then watched `document.body` with
 * `MutationObserver({ childList: true, subtree: true })`, re-placing the chip
 * from that callback. Placing the chip is itself a childList mutation, and the
 * host rebuilds its tab nodes on every streamed token, so the callback kept
 * finding a fresh `last` element and kept moving the chip. Placement never
 * stopped, the renderer's main thread stayed at 100% CPU, and the window
 * painted but accepted no clicks — the app had to be killed from the title bar.
 *
 * Throttling did not fix it (it only caps the rate; the host re-renders between
 * windows), so 1.9.12 removed the observer entirely and gates placement on node
 * IDENTITY: a pass writes to the DOM only when the row node changed or the chip
 * was detached. In the steady state a pass performs zero writes, which is what
 * makes self-feeding impossible rather than merely unlikely.
 *
 * These assertions are source-level because the suite runs without a DOM
 * (environment: 'node'). That is enough here: the failure was structural — the
 * presence of a body-wide observer in this file — and no amount of DOM fidelity
 * would tell us anything a reader of the two lines below cannot see.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '..')
const chip = readFileSync(join(ROOT, 'src', 'client', 'UpdateChip.tsx'), 'utf8')

/** Strip line and block comments so prose about the old bug cannot match. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

const code = stripComments(chip)

describe('the conversation tab chip never watches for mutations', () => {
  it('does not construct a MutationObserver', () => {
    // The exact construct that shipped the freeze.
    expect(code).not.toMatch(/new\s+MutationObserver\s*\(/)
    expect(code).not.toMatch(/\.observe\s*\(/)
  })

  it('still reaches the tab row on its own, via a timer', () => {
    // Removing the observer must not remove the recovery path: the row does not
    // exist until a conversation renders, and it is replaced on session change.
    expect(code).toMatch(/setInterval\s*\(\s*ensureChip\s*,/)
    expect(code).toMatch(/RESCAN_INTERVAL_MS/)
  })

  it('gates every placement pass on identity, not on an event', () => {
    // `settled` is the guard that makes a steady-state pass write nothing.
    expect(code).toMatch(/const\s+settled\s*=/)
    expect(code).toMatch(/row\s*===\s*placedRow/)
    expect(code).toMatch(/chip\.isConnected/)
    expect(code).toMatch(/if\s*\(\s*settled\s*\)\s*return/)
    // And the gate must actually be remembered across passes.
    expect(code).toMatch(/placedRow\s*=\s*row/)
    expect(code).toMatch(/let\s+placedRow\s*:\s*HTMLElement\s*\|\s*undefined/)
  })

  it('clears the remembered row when the row disappears or the chip unmounts', () => {
    // Stale identity would skip the placement that a fresh row needs.
    const missesRow = code.match(/if\s*\(\s*row\s*===\s*undefined\s*\)\s*\{[\s\S]*?placedRow\s*=\s*undefined/)
    expect(missesRow).not.toBeNull()
    const teardown = code.match(/return\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\}\n\}/)
    expect(teardown).not.toBeNull()
    expect(teardown?.[0]).toMatch(/placedRow\s*=\s*undefined/)
  })
})

describe('the chip dialog cannot swallow clicks it cannot show', () => {
  it('removes the overlay node on close rather than hiding it', () => {
    // A fixed, full-viewport scrim left in the DOM is the second way this chip
    // could make DSH unclickable: invisible, but still on top.
    expect(code).toMatch(/elements\.root\.remove\(\)/)
  })

  it('has three independent ways out of the dialog', () => {
    expect(code).toMatch(/scrim\.addEventListener\('click',\s*close\)/)
    expect(code).toMatch(/closeButton\.addEventListener\('click',\s*close\)/)
    expect(code).toMatch(/event\.key === 'Escape'/)
  })

  it('closes any previous dialog before opening a new one', () => {
    // Two stacked scrims would close onto a stale card and leave one behind.
    const openDialog = code.match(/const openDialog = async[\s\S]*?const elements = buildDialog/)
    expect(openDialog).not.toBeNull()
    expect(openDialog?.[0]).toMatch(/close\(\)/)
  })
})

describe('the settings nav icon stays cheap under a body-wide observer', () => {
  const entry = readFileSync(join(ROOT, 'src', 'client', 'index.tsx'), 'utf8')
  const entryCode = stripComments(entry)

  it('keeps its observer but makes each pass idempotent', () => {
    // This observer predates the freeze and does NOT modify structure — it only
    // toggles an attribute, and attribute changes do not match
    // { childList, characterData } — so it cannot feed itself. It is still worth
    // pinning: sync() runs on every mutation, and an unconditional setAttribute
    // would make every streamed token do redundant DOM writes.
    expect(entryCode).toMatch(/new MutationObserver\(schedule\)/)
    expect(entryCode).toMatch(/if \(!row\.hasAttribute\(NAV_ICON_MARKER\)\) row\.setAttribute/)
    expect(entryCode).toMatch(/else if \(row\.hasAttribute\(NAV_ICON_MARKER\)\) \{\s*row\.removeAttribute/)
  })

  it('short-circuits when the marked row is still the right one', () => {
    // The fast path must RETURN before the loop, otherwise every streamed token
    // re-scans the whole nav for nothing.
    const fastPath = entryCode.match(/if \(\s*appliedRow !== undefined[\s\S]{0,260}?\) return/)
    expect(fastPath).not.toBeNull()
    expect(fastPath?.[0]).toMatch(/appliedRow\.isConnected/)
    expect(fastPath?.[0]).toMatch(/appliedRow\.hasAttribute\(NAV_ICON_MARKER\)/)
    expect(fastPath?.[0]).toMatch(/=== wanted/)
  })
})

