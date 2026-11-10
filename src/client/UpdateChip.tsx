/**
 * The in-conversation tab chip and its dialog.
 *
 * ## Why the chip is raw DOM and not a portal
 *
 * Every other plugin that puts a button in the conversation tab row (dsh-purge,
 * for one) renders React into the row through `react-dom`'s `createPortal`. That
 * works, but `react-dom` is NOT in this bundle's `CLIENT_EXTERNALS`, so `import`
 * would inline a second copy of React's renderer into the bundle, while
 * `require` depends on the host loader exposing that name. This install already
 * depends on one host quirk too many, so the chip and the dialog are built with
 * `document.createElement` and plain event listeners — the same technique
 * `installNavIcon` in `index.tsx` already uses for the Settings nav row. No
 * renderer, no version coupling, and the teardown is a plain remove.
 *
 * ## Why MutationObserver AND an interval
 *
 * The tab row does not exist until a conversation renders, and it is re-created
 * whenever the active session changes. The observer catches the usual case; the
 * interval covers the transitions that replace the row without a mutation the
 * observer sees first (React replacing a subtree inside an existing parent).
 *
 * @module dsh-workbuddy-xdpool/client/UpdateChip
 */

import { POOL_ABOUT_PATH, POOL_UPDATE_APPLY_PATH, POOL_UPDATE_CHECK_PATH } from '../status-paths.ts'
import type {
  PoolWebAbout,
  PoolWebUpdateApply,
  PoolWebUpdateCheck,
} from '../status-paths.ts'
import { POOL_CHIP_CSS } from './chip-styles.ts'

/** Marker attribute on the row we inject, so duplicate mounts are impossible. */
const CHIP_MARKER = 'data-dsh-xdpool-chip'

/** Marker on the dialog host element. */
const DIALOG_MARKER = 'data-dsh-xdpool-dialog'

/**
 * Selectors for the conversation tab row, most specific first.
 *
 * `[data-conversation-tabs]` is the attribute the host's conversation package
 * puts on the `role="tablist"` container (see
 * `dsh-client-ui-conversation/lib/client.js`); the rest are fallbacks in case a
 * host line renames or drops that attribute.
 */
const TAB_ROW_SELECTORS = [
  '[data-conversation-tabs]',
  '[data-conversation-tabrow]',
  "[role='tablist'][aria-label*='对话'], [role='tablist'][aria-label*='Conversation' i]",
  "[class*='conversation' i][class*='tab' i][class*='row' i]",
] as const

/** How long the row may stay missing before a one-time diagnostic is logged. */
const MISS_WARN_AFTER_MS = 20_000

/** Fallback re-scan period, in ms. */
const RESCAN_INTERVAL_MS = 1_000

/**
 * Translator face handed in by the client entry.
 *
 * Keyed to the `chip.*` slice rather than to `string`: the host locale binder is
 * typed against the full key union, and widening this side to `string` would make
 * the binder non-assignable (its parameter is narrower, which is fine; ours being
 * wider is not). Declaring the exact slice keeps both ends honest — a typo in a
 * key is a compile error instead of a raw key rendered to the user.
 */
export type ChipKey =
  | 'chip.tabLabel'
  | 'chip.kicker'
  | 'chip.dialogTitle'
  | 'chip.close'
  | 'chip.dialogIntro'
  | 'chip.includesLabel'
  | 'chip.versionLoading'
  | 'chip.versionUnknown'
  | 'chip.versionLine'
  | 'chip.installKindRepo'
  | 'chip.installKindSnapshot'
  | 'chip.checkButton'
  | 'chip.applyButton'
  | 'chip.checking'
  | 'chip.checkFailed'
  | 'chip.upToDate'
  | 'chip.newVersion'
  | 'chip.applying'
  | 'chip.applyFailed'
  | 'chip.appliedRestart'
  | 'chip.appliedNoChange'
  | 'chip.modeGit'
  | 'chip.modeOverlay'
  | 'chip.requestFailed'

/** Translate one chip key, interpolating `{name}` placeholders. */
export type ChipTranslate = (key: ChipKey, params?: Record<string, unknown>) => string

/** Options for {@link mountUpdateChip}. */
export interface UpdateChipOptions {
  t: ChipTranslate
  /** Resolves once when the chip is clicked; injected so tests can stub it. */
  fetchImpl?: typeof fetch
}

/** Inject the chip stylesheet once per document. */
function injectChipCss(): void {
  if (typeof document === 'undefined') return
  const cssId = 'dsh-workbuddy-xdpool/chip.css'
  const existing = document.querySelector<HTMLStyleElement>(`style[data-plugin-css="${cssId}"]`)
  if (existing !== null) {
    existing.textContent = POOL_CHIP_CSS
    return
  }
  const styleTag = document.createElement('style')
  styleTag.dataset.plugin = 'dsh-workbuddy-xdpool'
  styleTag.dataset.pluginCss = cssId
  styleTag.textContent = POOL_CHIP_CSS
  document.head.appendChild(styleTag)
}

/** First tab row present in the document, if any. */
function findTabRow(): HTMLElement | undefined {
  for (const selector of TAB_ROW_SELECTORS) {
    const found = document.querySelector<HTMLElement>(selector)
    if (found !== null) return found
  }
  return undefined
}

/**
 * Place the chip immediately after the LAST native tab.
 *
 * Appending to the row would also work, but the host may render trailing
 * controls inside the same container; anchoring to the last `role="tab"` keeps
 * the chip in the tab strip regardless.
 */
function placeChip(row: HTMLElement, chip: HTMLElement): void {
  const tabs = row.querySelectorAll(":scope > [role='tab']")
  const last = tabs[tabs.length - 1]
  if (last !== undefined) {
    if (chip.previousElementSibling !== last) last.after(chip)
    return
  }
  if (chip.parentNode !== row) row.appendChild(chip)
}

/** JSON GET helper that never throws; returns `undefined` on any failure. */
async function getJson<T>(url: string, doFetch: typeof fetch): Promise<T | undefined> {
  try {
    const response = await doFetch(url, { headers: { accept: 'application/json' } })
    if (!response.ok) return undefined
    return await response.json() as T
  } catch {
    return undefined
  }
}

/** JSON POST helper that never throws. */
async function postJson<T>(url: string, doFetch: typeof fetch): Promise<T | undefined> {
  try {
    const response = await doFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: '{}',
    })
    return await response.json() as T
  } catch {
    return undefined
  }
}

/**
 * Build the dialog DOM. Returns the elements the caller updates later.
 *
 * Constructed once per open and discarded on close: the dialog holds live fetch
 * results, and reusing it would have to reset eight fields on every open.
 */
function buildDialog(t: ChipTranslate, close: () => void): {
  root: HTMLElement
  version: HTMLElement
  includes: HTMLElement
  status: HTMLElement
  checkButton: HTMLButtonElement
  applyButton: HTMLButtonElement
} {
  const root = document.createElement('div')
  root.setAttribute(DIALOG_MARKER, '')
  root.className = 'wbxc-modal'

  const scrim = document.createElement('div')
  scrim.className = 'wbxc-scrim'
  scrim.addEventListener('click', close)

  const card = document.createElement('div')
  card.className = 'wbxc-card'
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-modal', 'true')

  const head = document.createElement('div')
  head.className = 'wbxc-head'

  const heading = document.createElement('div')
  heading.className = 'wbxc-heading'
  const kicker = document.createElement('p')
  kicker.className = 'wbxc-kicker'
  kicker.textContent = t('chip.kicker')
  const title = document.createElement('h2')
  title.className = 'wbxc-title'
  title.textContent = t('chip.dialogTitle')
  heading.append(kicker, title)

  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.className = 'wbxc-close'
  closeButton.setAttribute('aria-label', t('chip.close'))
  closeButton.textContent = '✕'
  closeButton.addEventListener('click', close)

  head.append(heading, closeButton)

  const version = document.createElement('p')
  version.className = 'wbxc-version'
  version.textContent = t('chip.versionLoading')

  const intro = document.createElement('p')
  intro.className = 'wbxc-intro'
  intro.textContent = t('chip.dialogIntro')

  const includesLabel = document.createElement('p')
  includesLabel.className = 'wbxc-sublabel'
  includesLabel.textContent = t('chip.includesLabel')

  const includes = document.createElement('ul')
  includes.className = 'wbxc-includes'

  const status = document.createElement('p')
  status.className = 'wbxc-status'
  status.textContent = ''

  const actions = document.createElement('div')
  actions.className = 'wbxc-actions'

  const checkButton = document.createElement('button')
  checkButton.type = 'button'
  checkButton.className = 'wbxc-btn'
  checkButton.textContent = t('chip.checkButton')

  const applyButton = document.createElement('button')
  applyButton.type = 'button'
  applyButton.className = 'wbxc-btn wbxc-btn-primary'
  applyButton.textContent = t('chip.applyButton')
  applyButton.disabled = true

  actions.append(checkButton, applyButton)
  card.append(head, version, intro, includesLabel, includes, status, actions)
  root.append(scrim, card)
  return { root, version, includes, status, checkButton, applyButton }
}

/**
 * Mount the chip and return a disposer.
 *
 * Safe to call off the browser (returns a no-op): the node-side probe imports
 * the client entry for its types.
 */
export function mountUpdateChip(options: UpdateChipOptions): () => void {
  if (typeof document === 'undefined') return () => undefined
  injectChipCss()

  const doFetch = options.fetchImpl ?? globalThis.fetch.bind(globalThis)
  const t = options.t
  let disposed = false
  let chip: HTMLElement | undefined
  let closeDialog: (() => void) | undefined
  let mountedAt = Date.now()
  let warned = false
  /** Resolved once per page load; the install path does not change at runtime. */
  let about: PoolWebAbout | undefined

  const ensureChip = (): void => {
    if (disposed) return
    const row = findTabRow()
    if (row === undefined) {
      if (!warned && Date.now() - mountedAt > MISS_WARN_AFTER_MS) {
        warned = true
        console.warn(
          '[dsh-workbuddy-xdpool] the conversation tab row could not be found, so the pool chip was not shown. '
            + `selectors=${JSON.stringify(TAB_ROW_SELECTORS)}. `
            + 'This is cosmetic only — the provider and the Settings page still work. '
            + 'Please report this line so the selector can be updated.',
        )
      }
      return
    }
    if (chip === undefined) {
      chip = document.createElement('div')
      chip.className = 'wbxc-chip'
      chip.setAttribute(CHIP_MARKER, '')
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'wbxc-chip-btn'
      button.textContent = t('chip.tabLabel')
      button.addEventListener('click', () => { void openDialog() })
      chip.append(button)
    }
    placeChip(row, chip)
  }

  const close = (): void => {
    closeDialog?.()
    closeDialog = undefined
  }

  const openDialog = async (): Promise<void> => {
    if (disposed) return
    // One dialog at a time: a second click would stack scrims and make the top
    // card close onto a stale one.
    close()

    const elements = buildDialog(t, close)
    document.body.appendChild(elements.root)
    closeDialog = () => {
      elements.root.remove()
      document.removeEventListener('keydown', onKey)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)

    const info = about ?? await getJson<PoolWebAbout & { ok: boolean }>(POOL_ABOUT_PATH, doFetch)
    if (info !== undefined) {
      about = info
      elements.version.textContent = t('chip.versionLine', {
        version: info.version,
        kind: info.installKind === 'repo' ? t('chip.installKindRepo') : t('chip.installKindSnapshot'),
      })
      elements.includes.replaceChildren(...info.includes.map(entry => {
        const item = document.createElement('li')
        item.textContent = entry
        return item
      }))
    } else {
      elements.version.textContent = t('chip.versionUnknown')
    }

    let latest: string | undefined

    const runCheck = async (): Promise<void> => {
      elements.checkButton.disabled = true
      elements.status.textContent = t('chip.checking')
      const result = await getJson<PoolWebUpdateCheck>(POOL_UPDATE_CHECK_PATH, doFetch)
      elements.checkButton.disabled = false
      if (result === undefined) {
        elements.status.textContent = t('chip.checkFailed', { message: t('chip.requestFailed') })
        return
      }
      if (!result.ok) {
        elements.status.textContent = t('chip.checkFailed', { message: result.error ?? t('chip.requestFailed') })
        return
      }
      latest = result.latestVersion
      if (result.upToDate === true) {
        elements.status.textContent = t('chip.upToDate', { version: result.currentVersion })
        elements.applyButton.disabled = true
        return
      }
      elements.status.textContent = t('chip.newVersion', {
        current: result.currentVersion,
        latest: result.latestVersion ?? '',
      })
      elements.applyButton.disabled = false
    }

    elements.checkButton.addEventListener('click', () => { void runCheck() })

    elements.applyButton.addEventListener('click', () => {
      void (async () => {
        elements.applyButton.disabled = true
        elements.checkButton.disabled = true
        elements.status.textContent = t('chip.applying')
        const result = await postJson<PoolWebUpdateApply>(POOL_UPDATE_APPLY_PATH, doFetch)
        elements.checkButton.disabled = false
        if (result === undefined) {
          elements.status.textContent = t('chip.applyFailed', { message: t('chip.requestFailed') })
          return
        }
        if (!result.ok) {
          elements.status.textContent = t('chip.applyFailed', { message: result.error ?? t('chip.requestFailed') })
          return
        }
        if (result.restartRequired) {
          // Say what actually happened: a fast-forward and a file overlay leave
          // the install in different states, and only one of them has a backup.
          const how = result.mode === 'git' ? t('chip.modeGit') : t('chip.modeOverlay')
          elements.status.textContent = t('chip.appliedRestart', {
            from: result.fromVersion,
            to: result.toVersion ?? latest ?? '',
            how,
          })
        } else {
          elements.status.textContent = t('chip.appliedNoChange', { version: result.toVersion ?? result.fromVersion })
        }
      })()
    })

    // Kick off a check immediately: opening the dialog is the user asking
    // "is there an update", so making them press a second button first is noise.
    void runCheck()
  }

  // Initial placement plus the two watchdogs described in the module docs.
  ensureChip()
  const observer = new MutationObserver(() => { ensureChip() })
  observer.observe(document.body, { childList: true, subtree: true })
  const timer = setInterval(ensureChip, RESCAN_INTERVAL_MS)

  return () => {
    disposed = true
    observer.disconnect()
    clearInterval(timer)
    close()
    chip?.remove()
    chip = undefined
    mountedAt = 0
  }
}
