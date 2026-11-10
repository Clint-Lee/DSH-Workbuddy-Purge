/**
 * Same-origin routes behind the in-conversation tab chip: what this bundle is,
 * whether a newer version is published, and a way to pull it in.
 *
 * Split from `web-status.ts` because the concerns are unrelated — that file
 * answers pool questions and never touches the filesystem outside the settings
 * document; this one reports the install path and can replace `lib/` on disk.
 * Keeping the write-capable code in its own module makes the blast radius
 * obvious at review time.
 *
 * Every route here is guarded three ways: exact path, loopback origin only, and
 * the apply route is POST-only. The apply route additionally refuses when an
 * update is already running, so two dialogs cannot overlay the tree twice.
 *
 * @module dsh-workbuddy-xdpool/update-routes
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import {
  POOL_ABOUT_PATH,
  POOL_UPDATE_APPLY_PATH,
  POOL_UPDATE_CHECK_PATH,
  type PoolWebAbout,
  type PoolWebUpdateApply,
  type PoolWebUpdateCheck,
} from './status-paths.ts'
import { json, loopbackOrigin } from './web-status.ts'
import {
  UPDATE_BRANCH,
  UPDATE_REPO,
  applyUpdate,
  checkForUpdate,
  compareVersions,
} from './update-source.ts'

/** Dependencies the update routes need from the host half. */
export interface UpdateRouteOptions {
  /** Absolute path of this bundle's root (the directory holding package.json). */
  pluginRoot: string
  /** Version baked into that root's package.json, read once at apply time. */
  currentVersion: string
  /** Logger face; warnings are the only output that is useful here. */
  warn?: (message: string, error?: unknown) => void
}

/** Plugin names this bundle mounts. Static: it is a fact about the package. */
const INCLUDED_PLUGINS = ['WorkBuddy 积分池 (dsh-workbuddy-xdpool)', 'dsh-purge 破甲 + 红队'] as const

/**
 * Mount the about / update routes.
 *
 * `webServer` is optional on headless profiles; the caller only invokes this
 * from inside `ctx.inject(['webServer'], ...)`, so the service is present here.
 */
export function registerUpdateRoutes(ctx: Context, options: UpdateRouteOptions): void {
  // Serialises the apply route. A second POST while the first is still
  // extracting would rename `lib/` out from under the running copy, so it is
  // answered with 409 rather than queued: an update takes seconds and the
  // dialog polls, so a refusal is the honest answer.
  let applying = false

  const about = (): PoolWebAbout => ({
    version: options.currentVersion,
    pluginRoot: options.pluginRoot,
    installKind: existsSync(join(options.pluginRoot, '.git')) ? 'repo' : 'snapshot',
    repo: UPDATE_REPO,
    branch: UPDATE_BRANCH,
    includes: INCLUDED_PLUGINS,
  })

  ctx.effect(() => {
    const disposeAbout = ctx.webServer.register({
      kind: 'exact',
      path: POOL_ABOUT_PATH,
      handler: (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' })
        if (!loopbackOrigin(req)) return json(res, 403, { error: 'origin-not-trusted' })
        json(res, 200, { ok: true, ...about() })
      },
    })

    const disposeCheck = ctx.webServer.register({
      kind: 'exact',
      path: POOL_UPDATE_CHECK_PATH,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' })
        if (!loopbackOrigin(req)) return json(res, 403, { error: 'origin-not-trusted' })
        const result = await checkForUpdate(options.pluginRoot)
        const body: PoolWebUpdateCheck = {
          ok: result.ok,
          currentVersion: result.currentVersion,
          checkedAt: result.checkedAt,
          ...result.latestVersion === undefined ? {} : { latestVersion: result.latestVersion },
          ...result.upToDate === undefined ? {} : { upToDate: result.upToDate },
          ...result.error === undefined ? {} : { error: result.error },
        }
        // 200 even when the check failed: the dialog needs the reason, and a 5xx
        // would make the browser log a console error for an expected offline case.
        json(res, 200, body)
      },
    })

    const disposeApply = ctx.webServer.register({
      kind: 'exact',
      path: POOL_UPDATE_APPLY_PATH,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed' })
        if (!loopbackOrigin(req)) return json(res, 403, { error: 'origin-not-trusted' })
        if (applying) return json(res, 409, { error: 'an update is already running' })

        applying = true
        try {
          // Re-read the published version first so an already-current install
          // cannot be overwritten with identical files. Failing to reach GitHub
          // is NOT treated as "up to date": the user pressed update deliberately,
          // so the download is attempted and its own error is reported.
          const check = await checkForUpdate(options.pluginRoot)
          if (check.ok
            && check.latestVersion !== undefined
            && compareVersions(check.latestVersion, check.currentVersion) <= 0) {
            const body: PoolWebUpdateApply = {
              ok: true,
              fromVersion: check.currentVersion,
              toVersion: check.currentVersion,
              restartRequired: false,
            }
            json(res, 200, body)
            return
          }

          const result = await applyUpdate(options.pluginRoot)
          // Built field by field rather than spread wholesale, so the wire shape
          // is the declared contract and nothing internal can leak into it.
          const body: PoolWebUpdateApply = {
            ok: result.ok,
            fromVersion: result.fromVersion,
            restartRequired: result.restartRequired,
            ...result.toVersion === undefined ? {} : { toVersion: result.toVersion },
            ...result.mode === undefined ? {} : { mode: result.mode },
            ...result.backupDir === undefined ? {} : { backupDir: result.backupDir },
            ...result.error === undefined ? {} : { error: result.error },
          }
          if (!result.ok) options.warn?.(`dsh-workbuddy-xdpool: update failed: ${result.error ?? 'unknown reason'}`)
          json(res, 200, body)
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          options.warn?.('dsh-workbuddy-xdpool: the update action failed', error)
          json(res, 500, { ok: false, fromVersion: options.currentVersion, restartRequired: false, error: message.slice(0, 400) })
        } finally {
          applying = false
        }
      },
    })

    return () => {
      disposeAbout()
      disposeCheck()
      disposeApply()
    }
  }, 'dsh-workbuddy-xdpool: about and update routes')
}
