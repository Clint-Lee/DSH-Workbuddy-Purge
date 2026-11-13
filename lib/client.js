window.__ModuleLoader__.load({
	id: "dsh-workbuddy-xdpool",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/status-paths.ts
		/**
		* Node-free constants and types shared by the Host and browser halves of the
		* WorkBuddy XD Pool settings card.
		*
		* Pool's runtime state already lives in `src/status.ts` (`buildStatus` /
		* `WorkBuddyStatus`); this module only carves the cross-domain (Host→browser)
		* JSON document into a shape that stays token-free and matches what the
		* browser card renders. Route paths are plugin-owned and mounted on the Host's
		* same-origin web server (see `src/web-status.ts`).
		*
		* @module dsh-workbuddy-xdpool/status-paths
		*/
		/** Plugin-owned read-only pool status endpoint (account rows + models + shim). */
		const POOL_STATUS_PATH = "/plugins/dsh-workbuddy-xdpool/status";
		/** Plugin-owned local account rescan endpoint (re-read desktop snapshots). */
		const POOL_RESCAN_PATH = "/plugins/dsh-workbuddy-xdpool/accounts/rescan";
		/**
		* Re-fetch the upstream model catalog for both regions.
		*
		* Separate from {@link POOL_RESCAN_PATH} because they answer different
		* questions, and conflating them misled users: "detect accounts again" only
		* re-read the desktop snapshots, so it could NOT recover a model list that had
		* fallen back to the static table after a failed startup fetch. The only way
		* out was restarting DSH.
		*/
		const POOL_CATALOG_REFRESH_PATH = "/plugins/dsh-workbuddy-xdpool/models/refresh";
		/** Plugin-owned cooldown reset endpoint (clear all 429 cooldowns). */
		const POOL_RESET_COOLDOWN_PATH = "/plugins/dsh-workbuddy-xdpool/cooldowns/reset";
		/** Plugin-owned daily check-in action endpoint (claim today's reward). */
		const POOL_CHECKIN_PATH = "/plugins/dsh-workbuddy-xdpool/checkin";
		/**
		* Throw one account out of the pool for good, or take it back.
		*
		* Separate from the disable route because the semantics differ: disabling is a
		* rotation preference the account survives, ignoring survives the account.
		*/
		const POOL_ACCOUNT_IGNORE_PATH = "/plugins/dsh-workbuddy-xdpool/accounts/ignored";
		/** Run one automation job immediately, so the card can verify it on demand. */
		const POOL_AUTOMATION_RUN_PATH = "/plugins/dsh-workbuddy-xdpool/automation/run";
		/** Set or clear one account's reserved-credit floor. */
		const POOL_CREDIT_RESERVE_PATH = "/plugins/dsh-workbuddy-xdpool/accounts/credit-reserve";
		/** Ask GitHub for the newest published version. Read-only, GET. */
		const POOL_UPDATE_CHECK_PATH = "/plugins/dsh-workbuddy-xdpool/update/check";
		/** Pull the newest published version in place. Mutating, POST. */
		const POOL_UPDATE_APPLY_PATH = "/plugins/dsh-workbuddy-xdpool/update/apply";
		/**
		* The schedule every automation job falls back to.
		*
		* Shared by both halves on purpose. The host uses it when a configured hour
		* list arrives empty (the settings schema materializes "never configured" into
		* `[]`), and the card uses it when it writes the `automation` block back, so a
		* document that already holds an empty list is healed instead of being saved
		* back as an unrunnable schedule.
		*
		* This lives here rather than in `scheduler.ts` because the browser half cannot
		* import the host module: `scheduler.ts` pulls in `node:crypto` and the whole
		* upstream client, none of which exists in the browser bundle. Two hand-written
		* copies would drift, and the drift is invisible — the card would write a
		* schedule the scheduler does not run.
		*/
		const DEFAULT_AUTOMATION_HOURS = {
			checkin: [9],
			report: [10],
			tasks: [11],
			streak: [12],
			travel: [9, 21]
		};
		//#endregion
		//#region src/client/icon.ts
		/**
		* Plugin card icon (data URI) for the WorkBuddy XD Pool card.
		*
		* A neutral, dependency-free 24px “pool / droplet stack” glyph kept as an SVG
		* data URI so the browser half never needs an external asset. Three stacked
		* droplet outlines + an encompassing orbit mark read as “rotating accounts";
		* the line and fill colors stay inside the host’s accent family so the icon
		* sits naturally on the dark Plugin configuration surface.
		*
		* @module dsh-workbuddy-xdpool/client/icon
		*/
		const POOL_PLUGIN_ICON = "data:image/svg+xml;utf8," + encodeURIComponent([
			"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"24\" height=\"24\">",
			"<g fill=\"none\" stroke=\"#5686fe\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\">",
			"<path d=\"M7 5.5C7 3.6 8.4 2.5 8.4 2.5S9.8 3.6 9.8 5.5A1.4 1.4 0 0 1 7 5.5Z\" fill=\"#5686fe\" fill-opacity=\".28\"/>",
			"<path d=\"M15 10.5C15 8.6 16.4 7.5 16.4 7.5S17.8 8.6 17.8 10.5a1.4 1.4 0 0 1-2.8 0Z\" fill=\"#5686fe\" fill-opacity=\".28\"/>",
			"<ellipse cx=\"12\" cy=\"14.5\" rx=\"5.6\" ry=\"4.4\" stroke-dasharray=\"2 2\" stroke-opacity=\".55\"/>",
			"</g>",
			"</svg>"
		].join(""));
		//#endregion
		//#region src/client/styles.ts
		/**
		* Client styles for the WorkBuddy pool card.
		*
		* ── What this is
		*
		* An INSTRUMENT PANEL, not a settings form. The reference is a well-made system
		* monitor: one plane, a status spine down its left edge, tabular numbers, and
		* colour used only where a machine is reporting something.
		*
		* ── The three rules this file is built on
		*
		* 1. ONE PLANE + A SPINE. The card is a single surface whose left edge carries a
		*    3px spine whose colour IS the health state — green serving, amber cooling,
		*    red failed. That one stripe replaces every coloured banner the old layout
		*    needed to say the same thing, and it answers "is it working" before a word
		*    is read.
		*
		* 2. SECTIONS ARE ROWS IN ONE OBJECT. Sections are separated by a hairline and a
		*    small capitalised label. They are NOT separate cards. A settings page built
		*    from repeated rounded boxes always reads as a wireframe, because every box
		*    competes with every other box for the same attention.
		*
		* 3. NUMBERS CARRY THE HIERARCHY. The credit total is the only type above 17px;
		*    everything numeric is tabular and monospaced so columns line up and a
		*    changing value never reflows its neighbours.
		*
		* ── Theme
		*
		* Attribute-based, matching how the harness publishes it: light is the default
		* and body[data-ds-dark-theme] is ADDED for dark, so light is the base and dark
		* overrides the same tokens (see "Theme" at the bottom). Deliberately not
		* prefers-color-scheme — DSH lets the user pin a theme independently of the OS.
		*
		* Inner classes are namespaced `dsm-workbuddy-xdpool-*`; the component markup is
		* treated as fixed, with the one addition documented inline: the status section
		* carries data-state so the spine can be painted from it.
		*
		* @module dsh-workbuddy-xdpool/client/styles
		*/
		const POOL_CARD_CSS = `
/*
 * Tokens & Surfaces
 */
.dsm-workbuddy-xdpool-page{
  --wbx-label:var(--dsw-alias-label-primary,#0f1115);
  --wbx-text-1:var(--wbx-label);
  --wbx-text-2:var(--dsw-alias-label-secondary,#61666b);
  --wbx-text-3:color-mix(in oklab, var(--dsw-alias-label-tertiary,#81858c), var(--wbx-label) 36%);
  --wbx-border:var(--dsw-alias-border-l2,#0000001a);
  --wbx-plane:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base,#fff));
  --wbx-row:color-mix(in oklab, var(--wbx-label) 2.5%, var(--wbx-plane));
  --wbx-sunk:color-mix(in oklab, var(--wbx-label) 6%, var(--wbx-plane));
  --wbx-lift:var(--dsw-alias-bg-layer-3,#fff);
  --wbx-hairline:var(--wbx-border);
  --wbx-hairline-soft:color-mix(in oklab, var(--wbx-border) 60%, transparent);
  --wbx-shadow-card:0 1px 3px rgba(0,0,0,.04), 0 4px 14px -2px rgba(0,0,0,.04);
  --wbx-shadow-sm:0 1px 2px rgba(0,0,0,.05);

  --wbx-ok:var(--dsw-alias-state-success-primary,#22c55e);
  --wbx-warn:var(--dsw-alias-state-warn-primary,var(--dsw-static-amber-500,#f59e0b));
  --wbx-err:var(--dsw-alias-state-error-primary,#ec1313);
  --wbx-ok-tint:color-mix(in oklab, var(--wbx-ok) 11%, var(--wbx-plane));
  --wbx-warn-tint:color-mix(in oklab, var(--wbx-warn) 13%, var(--wbx-plane));
  --wbx-err-tint:color-mix(in oklab, var(--wbx-err) 10%, var(--wbx-plane));
  --wbx-ok-ink:color-mix(in oklab, var(--wbx-ok), var(--wbx-label) 46%);
  --wbx-warn-ink:color-mix(in oklab, var(--dsw-alias-state-warn-label,#dd8629), var(--wbx-label) 42%);
  --wbx-err-ink:color-mix(in oklab, var(--wbx-err), var(--wbx-label) 30%);
  --wbx-ok-pill-ink:color-mix(in oklab, var(--wbx-ok), var(--wbx-label) 66%);
  --wbx-warn-pill-ink:color-mix(in oklab, var(--wbx-warn), var(--wbx-label) 76%);
  --wbx-err-pill-ink:color-mix(in oklab, var(--wbx-err), var(--wbx-label) 38%);
  --wbx-ok-fill:color-mix(in oklab, var(--wbx-ok), var(--wbx-label) 42%);
  --wbx-on-fill:var(--dsw-alias-label-primary-foreground,#fff);
  --wbx-brand:var(--dsw-alias-brand-primary,#5686fe);
  --wbx-spine:var(--wbx-ok);

  --wbx-r:14px;
  --wbx-r-sm:8px;
  --wbx-ease:cubic-bezier(.2,.7,.25,1);
  --wbx-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Cascadia Mono",monospace;
}

/* Page shell: generous responsive desktop width */
.dsm-workbuddy-xdpool-page{
  max-width:980px;
  width:100%;
  margin:0 auto;
  box-sizing:border-box;
  display:flex;
  flex-direction:column;
  gap:12px;
  color:var(--wbx-text-1);
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-page-head{
  align-items:center;
  gap:16px;
  flex-wrap:wrap;
  display:flex;
  padding:4px 2px 2px;
}
.dsm-workbuddy-xdpool-page-icon{
  width:40px;
  height:40px;
  flex:none;
  border-radius:11px;
  padding:7px;
  box-sizing:border-box;
  object-fit:contain;
  background:var(--wbx-lift);
  border:1px solid var(--wbx-hairline);
  box-shadow:var(--wbx-shadow-sm);
}
.dsm-workbuddy-xdpool-page-copy{
  flex-direction:column;
  gap:3px;
  min-width:0;
  flex:1 1 240px;
  display:flex;
}
.dsm-workbuddy-xdpool-page-title{
  margin:0;
  color:var(--wbx-text-1);
  font-size:18px;
  font-weight:700;
  line-height:1.25;
  letter-spacing:-.018em;
  text-wrap:balance;
}
.dsm-workbuddy-xdpool-page-desc{
  margin:0;
  color:var(--wbx-text-3);
  font-size:12.5px;
  line-height:1.5;
  max-width:62ch;
  text-wrap:pretty;
}
.dsm-workbuddy-xdpool-page-actions{
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
  flex:none;
  display:flex;
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */
.dsm-btn{
  appearance:none;
  font:inherit;
  cursor:pointer;
  border:1px solid transparent;
  border-radius:var(--wbx-r-sm);
  padding:6px 14px;
  font-size:12px;
  line-height:1.5;
  font-weight:580;
  white-space:nowrap;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  transition:color .15s var(--wbx-ease),border-color .15s var(--wbx-ease),
             background .15s var(--wbx-ease),transform .1s var(--wbx-ease),box-shadow .15s var(--wbx-ease);
}
.dsm-btn:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:2px}
.dsm-btn:disabled{opacity:.45;cursor:default}
.dsm-btn:active:not(:disabled){transform:translateY(.5px)}
.dsm-btn-outline{
  border-color:var(--wbx-hairline);
  color:var(--wbx-text-2);
  background:var(--wbx-plane);
  box-shadow:var(--wbx-shadow-sm);
}
.dsm-btn-outline:hover:not(:disabled){
  color:var(--wbx-text-1);
  border-color:color-mix(in oklab,var(--wbx-text-3) 55%,transparent);
  background:color-mix(in oklab,var(--wbx-label) 4%,var(--wbx-plane));
}
.dsm-btn-primary{
  background:var(--wbx-text-1);
  color:var(--wbx-plane);
  font-weight:620;
  box-shadow:0 1px 3px rgba(0,0,0,.15);
}
.dsm-btn-primary:hover:not(:disabled){opacity:.9;box-shadow:0 2px 6px rgba(0,0,0,.2)}

/* ── Unified Modern Cards ────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-card{
  position:relative;
  display:flex;
  flex-direction:column;
  gap:12px;
  padding:14px 18px;
  border:1px solid var(--wbx-hairline);
  border-radius:12px;
  background:var(--wbx-plane);
  box-shadow:var(--wbx-shadow-card);
  box-sizing:border-box;
}

/* Health status state spine indicator */
.dsm-workbuddy-xdpool-status{
  border-left:4px solid var(--wbx-spine);
}
.dsm-workbuddy-xdpool-status[data-state="ok"]{--wbx-spine:var(--wbx-ok)}
.dsm-workbuddy-xdpool-status[data-state="idle"]{--wbx-spine:var(--wbx-text-3)}
.dsm-workbuddy-xdpool-status[data-state="error"]{--wbx-spine:var(--wbx-err)}

/* ── Region Switch Tabs ──────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-tabs{
  display:inline-flex;
  gap:4px;
  padding:4px;
  border-radius:10px;
  background:var(--wbx-sunk);
  align-self:flex-start;
  max-width:100%;
}
.dsm-workbuddy-xdpool-tab{
  appearance:none;
  font:inherit;
  cursor:pointer;
  border:0;
  border-radius:7px;
  padding:6px 16px;
  color:var(--wbx-text-3);
  font-size:12.5px;
  font-weight:580;
  line-height:18px;
  background:transparent;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  white-space:nowrap;
  transition:color .15s var(--wbx-ease),background .15s var(--wbx-ease),box-shadow .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-tab:hover:not(.dsm-workbuddy-xdpool-tab-active){color:var(--wbx-text-1)}
.dsm-workbuddy-xdpool-tab:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-tab-active{
  color:var(--wbx-text-1);
  background:var(--wbx-lift);
  box-shadow:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04);
}
.dsm-workbuddy-xdpool-tab-dot{
  display:inline-block;
  width:7px;
  height:7px;
  border-radius:50%;
  flex:none;
  background:var(--wbx-ok);
  box-shadow:0 0 0 3px color-mix(in oklab,var(--wbx-ok) 22%,transparent);
}
.dsm-workbuddy-xdpool-tab-dot[data-state="error"]{
  background:var(--wbx-err);
  box-shadow:0 0 0 3px color-mix(in oklab,var(--wbx-err) 22%,transparent);
}
.dsm-workbuddy-xdpool-tab-dot[data-state="idle"]{
  background:var(--wbx-text-3);
  box-shadow:none;
}

/* ── Health Readout ──────────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-usage-head{
  display:flex;
  flex-direction:column;
  gap:10px;
  min-width:0;
}
.dsm-workbuddy-xdpool-usage-actions{display:none!important;}
.dsm-workbuddy-xdpool-usage-copy{
  display:flex;
  flex-direction:column;
  gap:5px;
  min-width:0;
}
.dsm-workbuddy-xdpool-usage-status{
  display:flex;
  align-items:center;
  gap:10px;
  font-size:15px;
  font-weight:680;
  color:var(--wbx-text-1);
  letter-spacing:-.015em;
  text-wrap:balance;
}
.dsm-workbuddy-xdpool-usage-dot{
  width:9px;
  height:9px;
  border-radius:50%;
  flex:none;
  box-shadow:0 0 0 3.5px color-mix(in oklab,currentColor 20%,transparent);
}
.dsm-workbuddy-xdpool-usage-hint{
  margin:0;
  color:var(--wbx-text-3);
  font-size:12px;
  line-height:1.6;
  text-wrap:pretty;
}
.dsm-workbuddy-xdpool-usage-hint code{
  font-family:var(--wbx-mono);
  font-size:11px;
  font-variant-numeric:tabular-nums;
  padding:1px 5px;
  border-radius:4px;
  background:var(--wbx-row);
  border:1px solid var(--wbx-hairline-soft);
}
.dsm-workbuddy-xdpool-usage-actions{
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
}

/* ── Rotation Policy Selector ────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-dist{
  display:flex;
  flex-direction:column;
  gap:10px;
  padding:14px 16px;
  border-radius:10px;
  background:var(--wbx-row);
  border:1px solid var(--wbx-hairline-soft);
}
.dsm-workbuddy-xdpool-dist-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  flex-wrap:wrap;
}
.dsm-workbuddy-xdpool-dist-title{
  color:var(--wbx-text-3);
  font-size:11px;
  line-height:16px;
  letter-spacing:.08em;
  text-transform:uppercase;
  font-weight:700;
}
.dsm-workbuddy-xdpool-dist-now{
  flex:none;
  padding:2px 8px;
  border-radius:5px;
  background:color-mix(in oklab,var(--wbx-label) 5%,transparent);
  color:var(--wbx-text-2);
  font-size:11.5px;
  font-weight:600;
  line-height:16px;
  white-space:nowrap;
}
/*
 * One wrapping flex line, not a column grid.
 *
 * The picker grew three → four → five modes while the grid stayed at three then
 * two columns, and each time a chip was stranded on a line of its own: it read
 * as a card that had fallen out of the layout. A declared column count is what
 * strands it, so the row wraps instead and every chip carries a flex-basis —
 * five of them share the line down to ~700px, and a wrapped last chip fills its
 * own line because flex stretches the items.
 */
.dsm-workbuddy-xdpool-dist-options{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
}
.dsm-workbuddy-xdpool-dist-option{
  appearance:none;
  font:inherit;
  cursor:pointer;
  text-align:left;
  display:flex;
  flex-direction:column;
  justify-content:center;
  flex:1 1 120px;
  min-width:0;
  min-height:38px;
  border:1px solid var(--wbx-hairline);
  border-radius:var(--wbx-r-sm);
  padding:6px 10px;
  background:var(--wbx-plane);
  color:var(--wbx-text-3);
  transition:all .15s var(--wbx-ease);
  box-shadow:var(--wbx-shadow-sm);
}
.dsm-workbuddy-xdpool-dist-option:hover:not(:disabled):not(.dsm-workbuddy-xdpool-dist-option-active){
  color:var(--wbx-text-1);
  border-color:color-mix(in oklab,var(--wbx-text-3) 50%,transparent);
  transform:translateY(-1px);
}
.dsm-workbuddy-xdpool-dist-option:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-dist-option:active:not(:disabled){transform:translateY(.5px)}
/*
 * Selected: the card's OWN language, not a borrowed one.
 *
 * Green means "this account is healthy" two panels down and the brand blue
 * belongs to the host chrome, so a choice control borrowing either reads as
 * somebody else's status. The card's own cue is the raised surface — the same
 * one the region tabs use — plus a neutral inset bar that survives at a glance
 * without a wash that would read as hover.
 */
.dsm-workbuddy-xdpool-dist-option-active{
  background:var(--dsw-alias-bg-layer-3,#fff);
  border-color:color-mix(in oklab,var(--dsw-alias-label-primary,#0f1115) 26%,transparent);
  box-shadow:0 1px 4px rgba(0,0,0,.08),inset 3px 0 0 var(--dsw-alias-label-primary,#0f1115);
  color:var(--wbx-text-1);
}
.dsm-workbuddy-xdpool-dist-option:disabled{cursor:default;opacity:.55}
.dsm-workbuddy-xdpool-dist-option-top{
  display:flex;
  align-items:center;
  gap:6px;
  min-width:0;
  width:100%;
}
.dsm-workbuddy-xdpool-dist-option-name{
  font-size:12.5px;
  line-height:18px;
  font-weight:640;
  min-width:0;
  overflow-wrap:anywhere;
}
.dsm-workbuddy-xdpool-dist-option-badge{
  flex:none;
  margin-left:auto;
  padding:1px 6px;
  border-radius:999px;
  background:var(--wbx-ok-tint);
  color:var(--wbx-ok-pill-ink);
  font-size:9.5px;
  font-weight:700;
  line-height:14px;
  white-space:nowrap;
  letter-spacing:.04em;
  text-transform:uppercase;
}
.dsm-workbuddy-xdpool-dist-hint{
  color:var(--wbx-text-3);
  font-size:11.5px;
  line-height:1.55;
  margin:2px 0 0;
  text-wrap:pretty;
}

/* ── Section Headings ────────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-accounts-head,
.dsm-workbuddy-xdpool-models-head,
.dsm-workbuddy-xdpool-ignored-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
  padding-bottom:2px;
}
.dsm-workbuddy-xdpool-models-heading{display:flex;flex-direction:column;gap:2px;min-width:0}
.dsm-workbuddy-xdpool-models-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsm-workbuddy-xdpool-accounts-title,
.dsm-workbuddy-xdpool-models-title,
.dsm-workbuddy-xdpool-ignored-title{
  margin:0;
  color:var(--wbx-text-3);
  font-size:11px;
  font-weight:720;
  line-height:16px;
  letter-spacing:.08em;
  text-transform:uppercase;
}
.dsm-workbuddy-xdpool-accounts-summary,
.dsm-workbuddy-xdpool-models-summary,
.dsm-workbuddy-xdpool-ignored-summary{
  margin:0;
  color:var(--wbx-text-3);
  font-size:11.5px;
  line-height:16px;
  font-variant-numeric:tabular-nums;
}

/* ── In Use Now Banner ───────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-current{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
  margin:0;
  padding:10px 14px;
  border-radius:9px;
  background:color-mix(in oklab,var(--wbx-ok) 7%,var(--wbx-plane));
  border:1px solid color-mix(in oklab,var(--wbx-ok) 28%,transparent);
}
.dsm-workbuddy-xdpool-current-dot{
  width:7px;
  height:7px;
  border-radius:50%;
  flex:none;
  background:var(--wbx-ok);
  box-shadow:0 0 0 3px color-mix(in oklab,var(--wbx-ok) 24%,transparent);
}
.dsm-workbuddy-xdpool-current-label{
  color:var(--wbx-ok-pill-ink);
  font-size:10.5px;
  line-height:16px;
  font-weight:750;
  letter-spacing:.06em;
  flex:none;
  text-transform:uppercase;
}
.dsm-workbuddy-xdpool-current-name{
  color:var(--wbx-text-1);
  font-size:12.5px;
  line-height:16px;
  font-weight:650;
  font-family:var(--wbx-mono);
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.dsm-workbuddy-xdpool-current-note{
  color:var(--wbx-warn-ink);
  font-size:11px;
  line-height:16px;
  font-weight:550;
}

/* ── Account Cards ───────────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-accounts{gap:10px}
.dsm-workbuddy-xdpool-account{
  display:flex;
  flex-direction:column;
  gap:10px;
  padding:12px 16px;
  border:1px solid var(--wbx-hairline);
  border-radius:11px;
  background:var(--wbx-plane);
  box-shadow:var(--wbx-shadow-card);
  transition:border-color .15s var(--wbx-ease),box-shadow .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-account:hover{
  border-color:color-mix(in oklab,var(--wbx-text-3) 42%,transparent);
  box-shadow:0 3px 12px rgba(0,0,0,.06);
}
.dsm-workbuddy-xdpool-account-off{
  opacity:.62;
  border-style:dashed;
}
.dsm-workbuddy-xdpool-account-head{
  display:flex;
  align-items:center;
  gap:10px;
  min-width:0;
  padding:0 0 12px;
  border:0;
  border-bottom:1px solid var(--wbx-hairline-soft);
  background:transparent;
}
.dsm-workbuddy-xdpool-account-label{
  color:var(--wbx-text-1);
  font-size:14px;
  font-weight:700;
  line-height:20px;
  font-family:var(--wbx-mono);
  letter-spacing:-.015em;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.dsm-workbuddy-xdpool-account-head .dsm-workbuddy-xdpool-account-toggle{margin-left:auto}
.dsm-workbuddy-xdpool-account-toggle{
  appearance:none;
  font:inherit;
  display:inline-flex;
  align-items:center;
  gap:6px;
  cursor:pointer;
  flex:none;
  border:1px solid var(--wbx-hairline);
  border-radius:999px;
  padding:3px 10px;
  font-size:11px;
  line-height:16px;
  font-weight:550;
  background:var(--wbx-plane);
  color:var(--wbx-text-3);
  transition:all .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-account-toggle:hover:not(:disabled){
  color:var(--wbx-text-1);
  border-color:color-mix(in oklab,var(--wbx-text-3) 55%,transparent);
}
.dsm-workbuddy-xdpool-account-toggle:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-account-toggle:disabled{cursor:default;opacity:.6}
.dsm-workbuddy-xdpool-account-toggle-on{
  background:var(--wbx-ok-tint);
  border-color:color-mix(in oklab,var(--wbx-ok) 42%,transparent);
  color:var(--wbx-ok-pill-ink);
  font-weight:640;
}
.dsm-workbuddy-xdpool-account-toggle-dot{
  width:5.5px;
  height:5.5px;
  border-radius:50%;
  flex:none;
  background:currentColor;
}
.dsm-workbuddy-xdpool-account-ignore{
  appearance:none;
  font:inherit;
  flex:none;
  cursor:pointer;
  border:1px solid transparent;
  border-radius:999px;
  padding:3px 9px;
  font-size:11px;
  line-height:16px;
  background:transparent;
  color:var(--wbx-text-3);
  transition:all .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-account-ignore:hover:not(:disabled){
  color:var(--wbx-err-ink);
  border-color:color-mix(in oklab,var(--wbx-err) 40%,transparent);
  background:var(--wbx-err-tint);
}
.dsm-workbuddy-xdpool-account-ignore:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-account-ignore:disabled{cursor:default;opacity:.6}

/* Account body: Clean full-width vertical stack */
.dsm-workbuddy-xdpool-account-body{
  display:flex;
  flex-direction:column;
  gap:8px;
  width:100%;
}
.dsm-workbuddy-xdpool-account-copy{
  display:flex;
  align-items:center;
  gap:8px 14px;
  flex-wrap:wrap;
  min-width:0;
  padding:0;
}
.dsm-workbuddy-xdpool-account-tags{
  display:inline-flex;
  align-items:center;
  gap:6px;
  flex-wrap:wrap;
}
.dsm-workbuddy-xdpool-account-tag{
  padding:2px 8px;
  border-radius:5px;
  font-size:10.5px;
  line-height:16px;
  font-weight:680;
  letter-spacing:.02em;
  background:var(--wbx-ok-tint);
  color:var(--wbx-ok-pill-ink);
}
.dsm-workbuddy-xdpool-account-tag-cooling{
  background:var(--wbx-warn-tint);
  color:var(--wbx-warn-pill-ink);
}
.dsm-workbuddy-xdpool-account-tag-error,
.dsm-workbuddy-xdpool-account-tag-dead{
  background:var(--wbx-err-tint);
  color:var(--wbx-err-pill-ink);
}
.dsm-workbuddy-xdpool-account-meta{
  color:var(--wbx-text-3);
  font-size:11px;
  line-height:16px;
  display:inline-flex;
  align-items:center;
  gap:4px;
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
  margin:0;
}
.dsm-workbuddy-xdpool-account-meta-dead{color:var(--wbx-err-ink);font-weight:600}
.dsm-workbuddy-xdpool-account-modelcool{display:inline-flex;flex-wrap:wrap;gap:6px}
.dsm-workbuddy-xdpool-account-modelcool-chip{
  display:inline-flex;
  align-items:center;
  gap:5px;
  padding:2px 8px;
  border-radius:5px;
  font-size:10.5px;
  line-height:16px;
  background:var(--wbx-warn-tint);
  color:var(--wbx-warn-pill-ink);
}
.dsm-workbuddy-xdpool-account-modelcool-twin{color:var(--wbx-text-2);cursor:help}
.dsm-workbuddy-xdpool-account-error{margin:0;color:var(--wbx-err-ink);font-size:11.5px;line-height:18px}

/* Credit Readout: stats container */
.dsm-workbuddy-xdpool-stats{
  display:flex;
  flex-direction:column;
  gap:12px;
  width:100%;
}
.dsm-workbuddy-xdpool-panel{
  border-radius:10px;
  border:1px solid var(--wbx-hairline);
  background:var(--wbx-plane);
  box-sizing:border-box;
}
.dsm-workbuddy-xdpool-panel-title{
  color:var(--wbx-text-3);
  font-size:10.5px;
  line-height:15px;
  letter-spacing:.08em;
  text-transform:uppercase;
  font-weight:700;
}
.dsm-workbuddy-xdpool-panel-empty{color:var(--wbx-text-3);font-size:12.5px;line-height:18px;padding:4px 0}
.dsm-workbuddy-xdpool-panel-error{color:var(--wbx-err-ink);font-size:11px;line-height:17px;word-break:break-word}
.dsm-workbuddy-xdpool-panel-error-dead{
  display:inline-flex;
  align-items:center;
  align-self:flex-start;
  padding:2px 8px;
  border-radius:5px;
  background:var(--wbx-err-tint);
  color:var(--wbx-err-pill-ink);
  font-size:10.5px;
  line-height:16px;
  white-space:nowrap;
  cursor:help;
}

/* HERO ASSET BANNER: Total credits on left, Checkin hub on right */
.dsm-workbuddy-xdpool-panel-total{
  order:-1;
  display:grid;
  grid-template-columns:auto 1fr auto;
  grid-template-rows:auto auto;
  align-items:center;
  column-gap:16px;
  row-gap:2px;
  padding:11px 16px;
  border-radius:10px;
  border:1px solid color-mix(in oklab,var(--wbx-ok) 28%,var(--wbx-hairline));
  background:var(--wbx-plane);
  box-shadow:0 1px 3px rgba(0,0,0,.03);
}
.dsm-workbuddy-xdpool-panel-total .dsm-workbuddy-xdpool-panel-title{
  grid-column:1;
  grid-row:1;
  margin:0;
}
.dsm-workbuddy-xdpool-total-value{
  grid-column:1;
  grid-row:2;
  color:var(--wbx-ok-ink);
  font-size:30px;
  line-height:36px;
  font-weight:800;
  letter-spacing:-.025em;
  white-space:nowrap;
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
  margin:0;
}
.dsm-workbuddy-xdpool-checkin{
  grid-column:3;
  grid-row:1 / span 2;
  display:flex;
  align-items:center;
  gap:12px;
  flex-wrap:wrap;
  justify-content:flex-end;
  margin:0;
  padding:0;
  border:0;
}
.dsm-workbuddy-xdpool-checkin-meta{
  display:flex;
  flex-direction:column;
  align-items:flex-end;
  gap:2px;
}
.dsm-workbuddy-xdpool-checkin-streak{
  color:var(--wbx-text-2);
  font-size:13px;
  line-height:16px;
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
  font-weight:600;
}
.dsm-workbuddy-xdpool-checkin-daily{
  color:var(--wbx-ok-ink);
  font-size:13px;
  font-weight:680;
  line-height:16px;
  font-variant-numeric:tabular-nums;
}
.dsm-workbuddy-xdpool-checkin-bonus{
  padding:2px 7px;
  border-radius:5px;
  font-size:10.5px;
  font-weight:680;
  line-height:15px;
  text-align:center;
  background:var(--wbx-ok-tint);
  color:var(--wbx-ok-pill-ink);
}
.dsm-workbuddy-xdpool-checkin-btn{
  appearance:none;
  cursor:pointer;
  border:1px solid var(--wbx-ok-fill);
  border-radius:7px;
  padding:7px 16px;
  font:inherit;
  font-size:12px;
  font-weight:660;
  line-height:17px;
  background:var(--wbx-ok-fill);
  color:var(--wbx-on-fill);
  transition:all .15s var(--wbx-ease);
  box-shadow:0 1px 3px rgba(0,0,0,.12);
  white-space:nowrap;
}
.dsm-workbuddy-xdpool-checkin-btn:hover:not(:disabled){
  opacity:.92;
  box-shadow:0 2px 6px rgba(0,0,0,.18);
  transform:translateY(-.5px);
}
.dsm-workbuddy-xdpool-checkin-btn:active:not(:disabled){transform:translateY(.5px)}
.dsm-workbuddy-xdpool-checkin-btn:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-checkin-btn:disabled{
  cursor:default;
  background:var(--wbx-lift);
  border-color:var(--wbx-hairline);
  color:var(--wbx-text-3);
  box-shadow:none;
}
.dsm-workbuddy-xdpool-checkin-error{
  color:var(--wbx-err-ink);
  font-size:11px;
  line-height:16px;
  text-align:right;
  word-break:break-word;
}

/* CREDIT PACKAGES: Responsive Multi-Column Card Grid */
.dsm-workbuddy-xdpool-panel-packages{
  display:flex;
  flex-direction:column;
  gap:8px;
  padding:11px 14px;
  width:100%;
  border-radius:10px;
}
.dsm-workbuddy-xdpool-panel-packages .dsm-workbuddy-xdpool-panel-title{
  margin:0;
}
.dsm-workbuddy-xdpool-packages{
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(170px, 1fr));
  gap:6px 8px;
  margin:0;
  padding:0;
  list-style:none;
}
.dsm-workbuddy-xdpool-packages li{
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  grid-template-rows:auto auto;
  column-gap:8px;
  row-gap:2px;
  align-items:baseline;
  padding:7px 12px;
  border-radius:7px;
  border:1px solid var(--wbx-hairline);
  background:var(--wbx-plane);
  transition:border-color .15s var(--wbx-ease),box-shadow .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-packages li:hover{
  border-color:color-mix(in oklab,var(--wbx-text-3) 45%,transparent);
  box-shadow:0 1px 4px rgba(0,0,0,.06);
}
.dsm-workbuddy-xdpool-packages-name{
  grid-column:1;
  grid-row:1;
  min-width:0;
  color:var(--wbx-text-2);
  font-size:11.5px;
  line-height:17px;
  font-weight:600;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.dsm-workbuddy-xdpool-packages-value{
  grid-column:2;
  grid-row:1;
  justify-self:end;
  color:var(--wbx-text-1);
  font-size:13.5px;
  line-height:18px;
  font-weight:750;
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
  white-space:nowrap;
  letter-spacing:-.01em;
}
.dsm-workbuddy-xdpool-packages-when{
  grid-column:1 / -1;
  grid-row:2;
  color:var(--wbx-text-3);
  font-size:10.5px;
  line-height:15px;
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
}
.dsm-workbuddy-xdpool-packages-when-soon{
  color:var(--wbx-warn-ink);
  font-weight:680;
}
.dsm-workbuddy-xdpool-panel-foot{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding-top:8px;
  margin-top:2px;
  border-top:1px solid var(--wbx-hairline-soft);
  color:var(--wbx-text-3);
  font-size:11px;
  line-height:16px;
}
.dsm-workbuddy-xdpool-panel-foot strong{
  color:var(--wbx-warn-ink);
  font-size:13px;
  font-weight:700;
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
}

/* ── Full-width footer rows inside account card ─────────────────────────── */
.dsm-workbuddy-xdpool-reserve{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
  margin:2px 0 0;
  padding:12px 14px;
  border-radius:8px;
  background:var(--wbx-plane);
  border:1px solid var(--wbx-hairline-soft);
  font-size:11.5px;
  color:var(--wbx-text-2);
}
.dsm-workbuddy-xdpool-reserve-label{flex:0 0 auto;font-weight:600}
.dsm-workbuddy-xdpool-reserve-input{
  width:72px;
  padding:4px 8px;
  border:1px solid var(--wbx-hairline);
  border-radius:6px;
  background:var(--wbx-plane);
  color:var(--wbx-text-1);
  font:inherit;
  font-size:12px;
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
  text-align:right;
  box-sizing:border-box;
  transition:border-color .15s var(--wbx-ease),box-shadow .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-reserve-input:focus{
  outline:none;
  border-color:var(--wbx-ok);
  box-shadow:0 0 0 2px color-mix(in oklab,var(--wbx-ok) 25%,transparent);
}
.dsm-workbuddy-xdpool-reserve-input:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-reserve-input:disabled{opacity:.6}
.dsm-workbuddy-xdpool-reserve-unit{flex:0 0 auto}
.dsm-workbuddy-xdpool-reserve-badge{
  flex:0 0 auto;
  padding:2px 8px;
  border-radius:5px;
  background:var(--wbx-err-tint);
  color:var(--wbx-err-pill-ink);
  font-size:10px;
  font-weight:600;
  line-height:15px;
}
.dsm-workbuddy-xdpool-reserve-save{
  flex:0 0 auto;
  appearance:none;
  font:inherit;
  font-size:11.5px;
  font-weight:640;
  line-height:15px;
  padding:4px 12px;
  border-radius:6px;
  border:1px solid color-mix(in oklab,var(--wbx-ok) 46%,transparent);
  background:var(--wbx-ok-tint);
  color:var(--wbx-ok-pill-ink);
  cursor:pointer;
  transition:all .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-reserve-save:hover:not(:disabled){
  background:color-mix(in oklab,var(--wbx-ok) 18%,var(--wbx-plane));
  border-color:var(--wbx-ok);
}
.dsm-workbuddy-xdpool-reserve-save:disabled{
  cursor:default;
  border-color:var(--wbx-hairline);
  background:transparent;
  color:var(--wbx-text-3);
  opacity:.7;
}
.dsm-workbuddy-xdpool-reserve-note{flex:0 0 auto;font-size:11px;line-height:15px}
.dsm-workbuddy-xdpool-reserve-note-ok{color:var(--wbx-ok-ink);font-weight:600}
.dsm-workbuddy-xdpool-reserve-note-bad{color:var(--wbx-err-ink);font-weight:680}

.dsm-workbuddy-xdpool-earned{
  display:flex;
  flex-direction:row;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
  margin:0;
  padding:4px 2px 2px;
  font-size:11.5px;
}
.dsm-workbuddy-xdpool-earned-label{color:var(--wbx-text-3);font-size:11.5px;font-weight:600}
.dsm-workbuddy-xdpool-earned-list{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.dsm-workbuddy-xdpool-earned-row{
  color:var(--wbx-ok-ink);
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
  font-size:11.5px;
}
.dsm-workbuddy-xdpool-earned-value{
  color:var(--wbx-ok-ink);
  font-weight:700;
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
}

/* ── Removed Accounts ────────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-ignored-list{display:flex;flex-direction:column;gap:6px}
.dsm-workbuddy-xdpool-ignored-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:8px 12px;
  border-radius:8px;
  background:var(--wbx-row);
  border:1px solid var(--wbx-hairline-soft);
}
.dsm-workbuddy-xdpool-ignored-label{
  color:var(--wbx-text-2);
  font-size:12px;
  line-height:17px;
  font-family:var(--wbx-mono);
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.dsm-workbuddy-xdpool-ignored-restore{
  appearance:none;
  font:inherit;
  flex:none;
  cursor:pointer;
  border:1px solid var(--wbx-hairline);
  border-radius:999px;
  padding:3px 12px;
  font-size:11px;
  font-weight:580;
  line-height:16px;
  background:var(--wbx-plane);
  color:var(--wbx-text-2);
  transition:all .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-ignored-restore:hover:not(:disabled){
  color:var(--wbx-text-1);
  border-color:color-mix(in oklab,var(--wbx-text-3) 55%,transparent);
}
.dsm-workbuddy-xdpool-ignored-restore:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-ignored-restore:disabled{cursor:default;opacity:.6}

/* ── Model Directory ─────────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-models{gap:14px}
.dsm-workbuddy-xdpool-catalog-offline{
  flex:none;
  padding:2px 8px;
  border-radius:5px;
  font-size:10.5px;
  line-height:16px;
  font-weight:700;
  background:var(--wbx-warn-tint);
  color:var(--wbx-warn-pill-ink);
  white-space:nowrap;
  letter-spacing:.02em;
}
.dsm-workbuddy-xdpool-model-list{
  display:flex;
  flex-direction:column;
  border:1px solid var(--wbx-hairline);
  border-radius:10px;
  overflow:hidden;
  background:var(--wbx-plane);
}
.dsm-workbuddy-xdpool-model{
  display:grid;
  grid-template-columns:minmax(0,1fr);
  gap:6px;
  padding:12px 16px;
  background:transparent;
  transition:background .15s var(--wbx-ease),opacity .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-model:hover{background:color-mix(in oklab,var(--wbx-label) 3%,transparent)}
.dsm-workbuddy-xdpool-model + .dsm-workbuddy-xdpool-model{border-top:1px solid var(--wbx-hairline-soft)}
.dsm-workbuddy-xdpool-model-off{opacity:.5}
.dsm-workbuddy-xdpool-model-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  min-width:0;
  flex-wrap:wrap;
}
.dsm-workbuddy-xdpool-model-copy{
  display:flex;
  align-items:baseline;
  gap:9px;
  min-width:0;
  flex-wrap:wrap;
}
.dsm-workbuddy-xdpool-model-name{
  display:inline-flex;
  align-items:baseline;
  gap:7px;
  color:var(--wbx-text-1);
  font-size:13px;
  font-weight:640;
  line-height:18px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.dsm-workbuddy-xdpool-model-name-rate{
  color:var(--wbx-text-3);
  font-size:10.5px;
  font-weight:550;
  line-height:15px;
  flex:none;
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
  padding:1px 5px;
  border-radius:4px;
  background:var(--wbx-row);
  border:1px solid var(--wbx-hairline-soft);
}
.dsm-workbuddy-xdpool-model-id{
  color:var(--wbx-text-3);
  font-size:11px;
  line-height:15px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-family:var(--wbx-mono);
}
.dsm-workbuddy-xdpool-model-meta{
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
  color:var(--wbx-text-3);
  font-size:10.5px;
  line-height:16px;
}
.dsm-workbuddy-xdpool-model-meta-tag{
  padding:1px 7px;
  border-radius:4px;
  font-size:10.5px;
  line-height:16px;
  background:var(--wbx-row);
  color:var(--wbx-text-2);
  border:1px solid var(--wbx-hairline-soft);
}
.dsm-workbuddy-xdpool-model-meta-later{
  padding:1px 7px;
  border-radius:4px;
  font-size:10.5px;
  line-height:16px;
  border:1px dashed color-mix(in oklab,var(--wbx-text-3) 50%,transparent);
  color:var(--wbx-text-3);
}
.dsm-workbuddy-xdpool-model-meta-promo{color:var(--wbx-text-3);font-size:10.5px;line-height:16px;opacity:.9}
.dsm-workbuddy-xdpool-model-meta-twin{color:var(--wbx-text-3);font-size:10.5px;line-height:16px;opacity:.9;cursor:help}
.dsm-workbuddy-xdpool-model-cap{
  color:var(--wbx-text-3);
  font-size:10.5px;
  line-height:15px;
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
}
.dsm-workbuddy-xdpool-model-check{display:flex;align-items:center;gap:8px;min-width:0;flex:1;cursor:pointer}
.dsm-workbuddy-xdpool-model-check input{margin:0;accent-color:var(--wbx-brand);flex:none;cursor:pointer}
.dsm-workbuddy-xdpool-model-controls{display:flex;align-items:center;gap:12px;flex:none;flex-wrap:wrap;justify-content:flex-end}
.dsm-workbuddy-xdpool-model-image{
  display:inline-flex;
  align-items:center;
  gap:5px;
  flex:none;
  cursor:pointer;
  color:var(--wbx-text-2);
  font-size:11px;
  line-height:16px;
}
.dsm-workbuddy-xdpool-model-image input{margin:0;accent-color:var(--wbx-brand);cursor:pointer}
.dsm-workbuddy-xdpool-model-budget{
  display:flex;
  align-items:center;
  gap:8px;
  flex:none;
  margin:0;
  padding:0;
  border:0;
  color:var(--wbx-text-2);
  font-size:11px;
  line-height:16px;
}
.dsm-workbuddy-xdpool-model-budget label{display:inline-flex;align-items:center;gap:4px;cursor:pointer}
.dsm-workbuddy-xdpool-model-budget input{margin:0;accent-color:var(--wbx-brand);cursor:pointer}

/* Skipped Credential Callout Banner */
.dsm-workbuddy-xdpool-skipped{
  display:flex;
  flex-direction:column;
  gap:4px;
  margin:4px 0 0;
  padding:10px 14px;
  border-radius:9px;
  background:var(--wbx-warn-tint);
  border:1px solid color-mix(in oklab,var(--wbx-warn) 30%,transparent);
}
.dsm-workbuddy-xdpool-skipped-summary{
  margin:0;
  font-size:12px;
  line-height:18px;
  font-weight:700;
  color:var(--wbx-warn-pill-ink);
}
.dsm-workbuddy-xdpool-skipped-row{
  margin:0;
  display:flex;
  gap:8px;
  align-items:baseline;
  flex-wrap:wrap;
  font-size:11px;
  line-height:16px;
}
.dsm-workbuddy-xdpool-skipped-file{
  font-family:var(--wbx-mono);
  color:color-mix(in oklab,var(--wbx-text-1) 80%,var(--wbx-warn-tint));
  max-width:100%;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.dsm-workbuddy-xdpool-skipped-reason{color:color-mix(in oklab,var(--wbx-text-1) 72%,var(--wbx-warn-tint))}

/* ── Automation Card ─────────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-auto{
  position:relative;
  display:flex;
  flex-direction:column;
  gap:10px;
  padding:14px 18px;
  border:1px solid var(--wbx-hairline);
  border-radius:12px;
  background:var(--wbx-plane);
  box-shadow:var(--wbx-shadow-card);
  box-sizing:border-box;
}
.dsm-workbuddy-xdpool-auto-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.dsm-workbuddy-xdpool-auto-title{
  color:var(--wbx-text-3);
  font-size:11px;
  font-weight:720;
  line-height:16px;
  letter-spacing:.08em;
  text-transform:uppercase;
}
.dsm-workbuddy-xdpool-auto-run{flex:none}
.dsm-workbuddy-xdpool-auto-switch{
  padding:3px 12px;
  border:1px solid var(--wbx-hairline);
  border-radius:999px;
  background:var(--wbx-plane);
  font:inherit;
  color:var(--wbx-text-2);
  font-size:11px;
  font-weight:600;
  line-height:16px;
  cursor:pointer;
  transition:all .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-auto-switch:hover:not(:disabled){
  border-color:color-mix(in oklab,var(--wbx-text-3) 55%,transparent);
  color:var(--wbx-text-1);
}
.dsm-workbuddy-xdpool-auto-switch:disabled{opacity:.5;cursor:not-allowed}
.dsm-workbuddy-xdpool-auto-switch-on{
  border-color:color-mix(in oklab,var(--wbx-ok) 48%,transparent);
  color:var(--wbx-ok-pill-ink);
  background:var(--wbx-ok-tint);
  font-weight:660;
}
.dsm-workbuddy-xdpool-auto-hint{margin:0;color:var(--wbx-text-3);font-size:11.5px;line-height:1.5}
.dsm-workbuddy-xdpool-auto-total{
  display:flex;
  align-items:center;
  gap:10px;
  margin-top:2px;
  padding:6px 12px;
  border-radius:6px;
  border-left:3px solid var(--wbx-ok);
  background:var(--wbx-row);
  font-size:11px;
}
.dsm-workbuddy-xdpool-auto-total-label{color:var(--wbx-text-3);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;flex:none}
.dsm-workbuddy-xdpool-auto-total-list{display:flex;flex-wrap:wrap;gap:10px}
.dsm-workbuddy-xdpool-auto-total-row{
  color:var(--wbx-ok-ink);
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
  font-weight:700;
  /* 统计数字放两号：这是用户每天来这一栏要看的结果 */
  font-size:14px;
  line-height:20px;
}
.dsm-workbuddy-xdpool-auto-jobs{margin-top:4px;display:flex;flex-direction:column;gap:4px}
.dsm-workbuddy-xdpool-auto-job{
  display:flex;
  align-items:center;
  gap:10px;
  font-size:11.5px;
  color:var(--wbx-text-2);
  padding:6px 12px;
  border-radius:6px;
  background:var(--wbx-row);
  border:1px solid var(--wbx-hairline-soft);
  transition:border-color .15s var(--wbx-ease),background .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-auto-job:hover{
  border-color:color-mix(in oklab,var(--wbx-text-3) 40%,transparent);
}
.dsm-workbuddy-xdpool-auto-job-name{flex:0 0 auto;min-width:72px;color:var(--wbx-text-1);font-weight:640}
.dsm-workbuddy-xdpool-auto-job-when{
  flex:1 1 auto;
  color:var(--wbx-text-3);
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
  font-size:11px;
}
.dsm-workbuddy-xdpool-auto-job-last{
  flex:0 0 auto;
  text-align:right;
  color:var(--wbx-text-3);
  white-space:nowrap;
  font-family:var(--wbx-mono);
  font-variant-numeric:tabular-nums;
  font-size:11px;
}
.dsm-workbuddy-xdpool-auto-job-note{flex:0 0 auto;color:var(--wbx-text-2);font-weight:550}
.dsm-workbuddy-xdpool-auto-job-detail{grid-column:1/-1;color:var(--wbx-text-3);font-size:10.5px;line-height:15px}

/* ── Empty Region Guide ──────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-empty{gap:12px}
.dsm-workbuddy-xdpool-empty-title{
  margin:0;
  color:var(--wbx-text-3);
  font-size:11px;
  font-weight:720;
  line-height:16px;
  letter-spacing:.08em;
  text-transform:uppercase;
}
.dsm-workbuddy-xdpool-empty-steps{
  display:flex;
  flex-direction:column;
  gap:8px;
  padding:14px 16px;
  border-radius:10px;
  background:var(--wbx-row);
  border:1px solid var(--wbx-hairline-soft);
}
.dsm-workbuddy-xdpool-empty-steps-title{margin:0;color:var(--wbx-text-1);font-size:12.5px;font-weight:660;line-height:18px}
.dsm-workbuddy-xdpool-empty-list{
  margin:0;
  padding-left:20px;
  display:flex;
  flex-direction:column;
  gap:5px;
  color:var(--wbx-text-2);
  font-size:12px;
  line-height:18px;
}
.dsm-workbuddy-xdpool-empty-list li{min-width:0}
.dsm-workbuddy-xdpool-empty-note{margin:0;color:var(--wbx-text-3);font-size:11px;line-height:16px}

/* General Notes & Errors */
.dsm-workbuddy-xdpool-note{
  margin:0;
  color:var(--wbx-text-3);
  font-size:11.5px;
  line-height:18px;
  padding:0 2px;
}
.dsm-workbuddy-xdpool-error{
  margin:0;
  color:var(--wbx-err-ink);
  font-size:12px;
  line-height:18px;
  padding:8px 12px;
  border-radius:8px;
  background:var(--wbx-err-tint);
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width:760px){
  .dsm-workbuddy-xdpool-page{gap:14px}
  .dsm-workbuddy-xdpool-card{padding:16px 16px}
  .dsm-workbuddy-xdpool-panel-total{grid-template-columns:1fr;row-gap:12px}
  .dsm-workbuddy-xdpool-checkin{grid-column:1;grid-row:auto;justify-content:flex-start}
  .dsm-workbuddy-xdpool-checkin-meta{align-items:flex-start}
  /* On a phone the chips wrap anyway, so there is nothing to line up: the
     desktop min-height only reserves height a one-chip line does not need. */
  .dsm-workbuddy-xdpool-dist-option{min-height:0}
}

@media (prefers-reduced-motion:reduce){
  .dsm-workbuddy-xdpool-page *{transition:none!important}
}

/*
 * ── Dark Theme Overrides (body[data-ds-dark-theme]) ─────────────────────────
 */
body[data-ds-dark-theme] .dsm-workbuddy-xdpool-page,
html[data-ds-dark-theme] .dsm-workbuddy-xdpool-page{
  --wbx-label:var(--dsw-alias-label-primary,#f9fafb);
  --wbx-text-2:var(--dsw-alias-label-secondary,#cfd3d6);
  --wbx-text-3:var(--dsw-alias-label-tertiary,#adb2b8);
  --wbx-border:var(--dsw-alias-border-l2,#ffffff1f);
  --wbx-plane:var(--dsw-alias-bg-layer-2,#2c2c2e);
  --wbx-lift:color-mix(in oklab, var(--dsw-alias-bg-layer-3,#353638), var(--wbx-label) 9%);
  --wbx-row:color-mix(in oklab, var(--wbx-label) 4.5%, var(--wbx-plane));
  --wbx-sunk:color-mix(in oklab, #000 30%, var(--wbx-plane));
  --wbx-hairline:color-mix(in oklab, var(--wbx-border) 88%, transparent);
  --wbx-hairline-soft:color-mix(in oklab, var(--wbx-border) 48%, transparent);
  --wbx-shadow-card:0 2px 8px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06);
  --wbx-shadow-sm:0 1px 2px rgba(0,0,0,.35);

  --wbx-ok-ink:color-mix(in oklab, var(--wbx-ok), var(--wbx-label) 26%);
  --wbx-warn-ink:color-mix(in oklab, var(--wbx-warn), var(--wbx-label) 34%);
  --wbx-err-ink:color-mix(in oklab, var(--wbx-err), var(--wbx-label) 22%);
  --wbx-ok-pill-ink:color-mix(in oklab, var(--wbx-ok), var(--wbx-label) 42%);
  --wbx-warn-pill-ink:color-mix(in oklab, var(--wbx-warn), var(--wbx-label) 54%);
  --wbx-err-pill-ink:color-mix(in oklab, var(--wbx-err), var(--wbx-label) 46%);
  --wbx-ok-fill:var(--wbx-ok);
  --wbx-on-fill:var(--dsw-alias-label-primary-foreground,#0f1115);
  --wbx-ok-tint:color-mix(in oklab, var(--wbx-ok) 14%, var(--wbx-plane));
  --wbx-warn-tint:color-mix(in oklab, var(--wbx-warn) 15%, var(--wbx-plane));
  --wbx-err-tint:color-mix(in oklab, var(--wbx-err) 13%, var(--wbx-plane));
}

@supports not (background:color-mix(in oklab,#000,#fff)){
  .dsm-workbuddy-xdpool-page{
    --wbx-plane:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base,#fff));
    --wbx-lift:var(--dsw-alias-bg-layer-3,#fff);
    --wbx-row:var(--wbx-plane);
    --wbx-sunk:var(--wbx-plane);
    --wbx-text-3:var(--dsw-alias-label-tertiary,#81858c);
    --wbx-hairline:var(--wbx-border);
    --wbx-hairline-soft:var(--wbx-border);
  }
  body[data-ds-dark-theme] .dsm-workbuddy-xdpool-page,
  html[data-ds-dark-theme] .dsm-workbuddy-xdpool-page{
    --wbx-plane:var(--dsw-alias-bg-layer-2,#2c2c2e);
    --wbx-lift:var(--dsw-alias-bg-layer-3,#353638);
    --wbx-text-3:var(--dsw-alias-label-tertiary,#adb2b8);
  }
}
`.trim();
		//#endregion
		//#region src/promo.ts
		/**
		* Promotions in force.
		*
		* Source: the WorkBuddy announcement extending Hy3's free tier and
		* Hy4-preview's night window to **2026-10-31**. Hy3 needs no entry here (its
		* CN price is already zero upstream); only Hy4-preview's time window does,
		* because the gateway charges for it around the clock.
		*
		* When a promotion is extended or a new one starts, edit this table. When one
		* ends, either delete the row or let `until` lapse — both stop the badge.
		*/
		const PROMO_RULES = [{
			idPrefix: "hy4-preview",
			region: "cn",
			hours: [
				23,
				0,
				1,
				2,
				3,
				4,
				5,
				6,
				7
			],
			until: "2026-10-31",
			label: "night"
		}];
		/** `YYYY-MM-DD` for a Date in LOCAL time (the promotions are announced locally). */
		function localDayKey(date) {
			const p = (n) => String(n).padStart(2, "0");
			return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
		}
		/** Whether a rule is still in force on `date`. */
		function ruleActive(rule, date) {
			return localDayKey(date) <= rule.until;
		}
		/** The first hour the window reopens, searching forward from `hour`. */
		function nextWindowHour(rule, hour) {
			for (let step = 1; step <= 24; step += 1) {
				const candidate = (hour + step) % 24;
				if (rule.hours.includes(candidate)) return candidate;
			}
		}
		/** The hour the CURRENT window closes, searching forward from `hour`. */
		function windowEndHour(rule, hour) {
			for (let step = 1; step <= 24; step += 1) {
				const candidate = (hour + step) % 24;
				if (!rule.hours.includes(candidate)) return candidate;
			}
		}
		/**
		* The promotion status of one model at `now`, for one region.
		*
		* `now` is injected so the behaviour is testable without freezing the clock —
		* a time-dependent badge that can only be tested by waiting is a badge nobody
		* tests. `region` is required for the same reason the rules carry one: these
		* campaigns are regional, and applying a domestic rule to the international
		* roster would invent a discount that gateway does not offer.
		*/
		function promoStatusFor(model, now = /* @__PURE__ */ new Date(), region = "cn") {
			if (model.multiplier === 0) return { kind: "free" };
			for (const rule of PROMO_RULES) {
				if (rule.region !== region) continue;
				if (!model.id.startsWith(rule.idPrefix)) continue;
				if (!ruleActive(rule, now)) continue;
				const hour = now.getHours();
				if (rule.hours.includes(hour)) {
					const untilHour = windowEndHour(rule, hour);
					return {
						kind: "night",
						label: rule.label,
						untilHour: untilHour ?? hour,
						promoUntil: rule.until
					};
				}
				const nextHour = nextWindowHour(rule, hour);
				if (nextHour !== void 0) return {
					kind: "night-later",
					label: rule.label,
					nextHour,
					promoUntil: rule.until
				};
			}
		}
		/**
		* Whether a model is free RIGHT NOW, for sorting.
		*
		* Only the two "currently free" kinds count. `night-later` deliberately does
		* NOT sort to the top: it costs credits at this moment, and floating a
		* credit-priced model above cheaper ones would misrepresent the list.
		*/
		function isFreeNow(model, now = /* @__PURE__ */ new Date(), region = "cn") {
			const status = promoStatusFor(model, now, region);
			return status?.kind === "free" || status?.kind === "night";
		}
		//#endregion
		//#region src/siblings.ts
		/**
		* The cheapest PAID model sharing `model`'s display name, or undefined.
		*
		* Cheapest rather than first, because the point of the hint is "there is a
		* cheap way out": offering the most expensive twin would make switching look
		* like a trap. A sibling whose price is unknown is skipped — an unpriced row
		* cannot be promised as "the paid one".
		*/
		function paidSiblingOf(model, models) {
			let best;
			for (const candidate of models) {
				if (candidate.id === model.id) continue;
				if (candidate.name !== model.name) continue;
				const multiplier = candidate.multiplier;
				if (multiplier === void 0 || multiplier <= 0) continue;
				if (best === void 0 || multiplier < best.multiplier) best = {
					id: candidate.id,
					name: candidate.name,
					multiplier
				};
			}
			return best;
		}
		/**
		* The paid sibling of a model, but ONLY when the model itself is free.
		*
		* The guard is the whole point: a `x0.79` row with a `x0.06` cousin is not a
		* "free model with a paid twin", it is just a more expensive row, and labelling
		* it would be noise on most of the list. The hint answers one question — "the
		* free one is limited, what now".
		*/
		function paidAlternativeFor(model, models) {
			if (model.multiplier !== 0) return void 0;
			return paidSiblingOf(model, models);
		}
		//#endregion
		//#region src/client/PoolCard.tsx
		/**
		* WorkBuddy XD Pool card contributed to DSH Plugin configuration.
		*
		* The card body mirrors the LaoDing plugin family used by dingminhua's
		* `dsh-connect-workbuddy`: a small status row (dot + count + Rescan / Clear
		* cooldowns buttons), then a per-account panel showing label / status tag /
		* token expiry / cooldown info / credit packages, then the model directory
		* with per-model free/limited/night/image badges and context size.
		*
		* Rendered as a full settings page (see `client/index.tsx`): the shell gives it
		* a left-nav row and a scrollable content column, so everything is visible at
		* once — a fold inside the page only hid the pool behind a click.
		*
		* @module dsh-workbuddy-xdpool/client/PoolCard
		*/
		/**
		* Default context window the card offers as the "capped" choice, in tokens.
		* Mirrors the host-side DEFAULT_CONTEXT_BUDGET; declared here rather than
		* imported, because the browser bundle must not pull in the host entry.
		*/
		const DEFAULT_CONTEXT_BUDGET = 2e5;
		const POLL_INTERVAL_MS = 3e4;
		/** Inject or refresh the shared card CSS for the current client bundle. */
		if (typeof document !== "undefined") {
			const cssId = "dsh-workbuddy-xdpool/client.css";
			const existing = document.querySelector(`style[data-plugin-css="${cssId}"]`);
			if (existing !== null) existing.textContent = POOL_CARD_CSS;
			else {
				const styleTag = document.createElement("style");
				styleTag.dataset.plugin = "dsh-workbuddy-xdpool";
				styleTag.dataset.pluginCss = cssId;
				styleTag.textContent = POOL_CARD_CSS;
				document.head.appendChild(styleTag);
			}
		}
		function formatNumber(value) {
			if (value === void 0) return "–";
			return new Intl.NumberFormat(void 0, { maximumFractionDigits: 0 }).format(value);
		}
		function formatTime(value) {
			return new Intl.DateTimeFormat(void 0, {
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit"
			}).format(new Date(value));
		}
		function formatDateTime(value) {
			if (value === void 0) return "";
			const ms = Date.parse(value);
			if (Number.isNaN(ms)) return value;
			return new Intl.DateTimeFormat(void 0, {
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit"
			}).format(new Date(ms));
		}
		/**
		* The automation jobs, in the order they run.
		*
		* The order is the contract: the report has to land before the task pass, or
		* the task pass reads progress the report would have lit. `hoursOf` reads the
		* matching hour list off the status document so the panel stays in step with
		* whatever schedule the scheduler is actually running on.
		*/
		/**
		* How long to watch a manual run before giving up on it.
		*
		* A pass runs one upstream call per account per job, so ~30s for a handful of
		* accounts. The bound exists so a wedged run cannot spin the button forever;
		* the run itself keeps going in the background either way.
		*/
		const AUTOMATION_POLL_MS = 2e3;
		const AUTOMATION_POLL_ATTEMPTS = 90;
		const AUTOMATION_JOBS = [
			"checkin",
			"report",
			"tasks",
			"streak",
			"travel"
		];
		/**
		* The hour list to save for one job: what the card holds, or the default.
		*
		* Mirrors the host's own fallback (`hoursOrDefault` in `scheduler.ts`). An
		* empty list must resolve to the default on BOTH sides, or the card would save
		* a schedule the scheduler then refuses to run — the exact silent standstill
		* this pair of fixes exists to remove.
		*/
		function hoursOrDefault(configured, fallback) {
			return configured !== void 0 && configured.length > 0 ? [...configured] : [...fallback];
		}
		/** Read one job's configured hours off the status document. */
		function automationHours(status, kind) {
			const automation = status.automation;
			if (automation === void 0) return [];
			switch (kind) {
				case "report": return automation.reportHours;
				case "tasks": return automation.taskHours;
				case "checkin": return automation.checkinHours;
				case "streak": return automation.streakHours;
				case "travel": return automation.travelHours;
			}
		}
		/** Read one job's last-run record off the status document. */
		function automationJob(status, kind) {
			return status.automation?.jobs[kind];
		}
		function dotColor(status) {
			return status === "ok" ? "var(--dsw-alias-state-success-primary, #22a06b)" : status === "error" ? "var(--dsw-alias-state-error-primary, #ef4444)" : "var(--dsw-alias-label-dimmed, #9aa0a6)";
		}
		function formatCapacity(value) {
			if (value === void 0) return "";
			if (value >= 1e6 && value % 1e6 === 0) return `${value / 1e6}M`;
			if (value >= 1e3 && value % 1e3 === 0) return `${value / 1e3}K`;
			return String(value);
		}
		/**
		* The five ways the pool can hand out accounts.
		*
		* Order is the reading order of the picker: the recommended mode first, then
		* the two cache-friendly extremes, then the two spreading modes. The row is
		* laid out one chip per mode, so this list length is also the column count.
		*/
		const DIST_OPTIONS = [
			"sticky",
			"priority",
			"balanced",
			"round-robin",
			"expiry"
		];
		/** Localized name of one distribution mode. */
		function distLabel(option, t) {
			if (option === "sticky") return t?.("row.distSticky") ?? "Per conversation";
			if (option === "priority") return t?.("row.distPriority") ?? "Priority";
			if (option === "balanced") return t?.("row.distBalanced") ?? "Balanced";
			if (option === "expiry") return t?.("row.distExpiry") ?? "Expiring first";
			return t?.("row.distRoundRobin") ?? "Round-robin";
		}
		/** One-line explanation of what a mode does to caching and spend. */
		function distHint(option, t) {
			if (option === "sticky") return t?.("row.distStickyHint") ?? "";
			if (option === "priority") return t?.("row.distPriorityHint") ?? "";
			if (option === "balanced") return t?.("row.distBalancedHint") ?? "";
			if (option === "expiry") return t?.("row.distExpiryHint") ?? "";
			return t?.("row.distRoundRobinHint") ?? "";
		}
		/** Build the draft from the server's selection + catalog flags. */
		function draftFromStatus(status) {
			const selection = status.selection;
			const enabled = selection.enabledModelIds;
			const images = selection.imageModelIds;
			const budgets = selection.contextBudgets;
			const out = {};
			for (const model of status.models) {
				const entry = {
					enabled: enabled === void 0 || enabled.includes(model.id),
					images: images === void 0 ? model.supportsImages : images.includes(model.id)
				};
				const budget = budgets?.[model.id];
				if (budget !== void 0) entry.budget = budget;
				out[model.id] = entry;
			}
			return out;
		}
		/** True when the draft differs from what the server last reported. */
		function draftIsDirty(status, draft) {
			const selection = status.selection;
			const enabled = new Set(selection.enabledModelIds ?? status.models.filter((m) => m.enabled).map((m) => m.id));
			const images = new Set(selection.imageModelIds ?? status.models.filter((m) => m.supportsImages).map((m) => m.id));
			const budgets = selection.contextBudgets ?? {};
			for (const model of status.models) {
				const entry = draft[model.id];
				if (entry === void 0) continue;
				if (entry.enabled !== enabled.has(model.id)) return true;
				if (entry.images !== images.has(model.id)) return true;
				if ((budgets[model.id] ?? model.nativeContextWindow) !== (entry.budget ?? model.nativeContextWindow)) return true;
			}
			return false;
		}
		/** Absolute expiry with the time of day: the upstream grants one-off packages at
		*  arbitrary clock times, so "expires 09/19 15:36" is what the user needs — a
		*  date alone would read as if it lapsed at midnight. */
		function formatExpiry(ms) {
			if (ms === void 0 || !Number.isFinite(ms)) return "";
			return new Intl.DateTimeFormat(void 0, {
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false
			}).format(new Date(ms));
		}
		/** Whole days until `ms`, floored at 0; undefined when there is no deadline. */
		function daysUntil(ms) {
			if (ms === void 0 || !Number.isFinite(ms)) return void 0;
			return Math.max(0, Math.floor((ms - Date.now()) / 864e5));
		}
		/** True when a one-off package lapses inside the "expiring soon" window. */
		function isExpiringSoon(pack) {
			if (pack.monthly === true) return false;
			const days = daysUntil(pack.expiresAtMs);
			return days !== void 0 && days <= 3;
		}
		/**
		* The promo badge for one model, or undefined when it has none.
		*
		* Two sources, because the gateway models one of them and not the other:
		*
		*  - `free` comes from the CREDIT MULTIPLIER. Neither gateway ever sends a
		*    literal `free` tag, but it does price its free models at `credits: "x0.00"`
		*    (CN `hy3`), so the multiplier is the honest signal.
		*  - the NIGHT window comes from {@link promoStatusFor}, because the gateway
		*    charges `x0.29` for `hy4-preview` around the clock and has no field for a
		*    time-of-day rule. See that module for why the 14-day newcomer allowance is
		*    deliberately not modelled.
		*
		* `region` is threaded through because the campaigns are REGIONAL: the
		* Hy3 / Hy4-preview extension is a domestic promotion, so a global roster must
		* not pick up a discount that gateway does not offer.
		*/
		function tagFor(model, now, region) {
			const tags = model.tags ?? [];
			if (promoStatusFor(model, now, region)?.kind === "night") return "night";
			if (tags.includes("free") || model.multiplier === 0) return "free";
			if (tags.includes("limited-free")) return "limited";
			if (tags.includes("night-discount")) return "night";
		}
		/** Render pool health, per-account credits/cooldown, and the model directory. */
		function PoolCard({ t, settingsScope }) {
			const settingsWritable = settingsScope?.getSnapshot().writable === true;
			/** Which region tab is showing. A CN-only install never leaves this. */
			const [activeRegion, setActiveRegion] = (0, react.useState)("cn");
			/**
			* Last-known status per region. Kept per region (not a single slot) so
			* switching tabs shows the other side's last answer immediately instead of
			* a blank frame, and the tab dots stay meaningful while a tab is hidden.
			*/
			const [statusByRegion, setStatusByRegion] = (0, react.useState)({});
			/** The document for the tab on screen; undefined until its first answer. */
			const status = statusByRegion[activeRegion];
			/**
			* Today's automation take, summed across accounts.
			*
			* Summed from the per-account counters rather than kept separately, so the
			* panel total and the per-account lines can never disagree.
			*/
			const automationTotals = Object.values(status?.automation?.earningsToday ?? {}).reduce((sum, entry) => ({
				credit: sum.credit + entry.credit,
				energy: sum.energy + entry.energy,
				claimed: sum.claimed + entry.claimed,
				checkinCredit: sum.checkinCredit + entry.checkinCredit,
				bonusCredit: sum.bonusCredit + entry.bonusCredit,
				travelCredit: sum.travelCredit + entry.travelCredit
			}), {
				credit: 0,
				energy: 0,
				claimed: 0,
				checkinCredit: 0,
				bonusCredit: 0,
				travelCredit: 0
			});
			const [error, setError] = (0, react.useState)(void 0);
			const [busy, setBusy] = (0, react.useState)(false);
			const [cooldownBusy, setCooldownBusy] = (0, react.useState)(false);
			/** Model-catalog refresh in flight (separate from the account rescan). */
			const [catalogBusy, setCatalogBusy] = (0, react.useState)(false);
			const [automationBusy, setAutomationBusy] = (0, react.useState)(false);
			/** The automation job currently running from the card, if any. */
			const [automationRun, setAutomationRun] = (0, react.useState)(void 0);
			/** Account id whose reserved-credit floor is being saved, if any. */
			const [reserveBusy, setReserveBusy] = (0, react.useState)(void 0);
			const [flash, setFlash] = (0, react.useState)(void 0);
			/** Account id whose daily claim is currently in flight. */
			const [checkinBusyId, setCheckinBusyId] = (0, react.useState)(void 0);
			/** Account id whose enable/disable switch is in flight, if any. */
			const [accountBusyId, setAccountBusyId] = (0, react.useState)(void 0);
			/**
			* Draft model selection. `undefined` means "no local edits"; once a checkbox
			* is touched the draft takes over and is what the Save button posts. Discard
			* drops it back to the copy the server last reported.
			*/
			const [draftByRegion, setDraftByRegion] = (0, react.useState)({});
			/**
			* The draft for the tab on screen. Keyed by region: the two gateways have
			* different rosters, so edits made on one tab must not leak into the other
			* when the user switches tabs (or saves).
			*/
			const draft = draftByRegion[activeRegion];
			const setDraft = (next) => {
				setDraftByRegion((prev) => ({
					...prev,
					[activeRegion]: next
				}));
			};
			const [savingModels, setSavingModels] = (0, react.useState)(false);
			const mounted = (0, react.useRef)(true);
			(0, react.useEffect)(() => {
				mounted.current = true;
				return () => {
					mounted.current = false;
				};
			}, []);
			/**
			* Fetch one region's status. `region` is a parameter rather than a closure
			* read so the callback identity does not change with the tab: the polling
			* effect can key off it without restarting on every switch, and each region's
			* last answer stays in its own slot (see `statusByRegion`).
			*/
			const refresh = (0, react.useCallback)(async (region, signal) => {
				try {
					const response = await fetch(`${POOL_STATUS_PATH}?region=${region}`, {
						headers: { accept: "application/json" },
						credentials: "same-origin",
						...signal === void 0 ? {} : { signal }
					});
					const value = await response.json().catch(() => void 0);
					if (!response.ok) throw new Error(`HTTP ${response.status}`);
					if (mounted.current && signal?.aborted !== true) {
						setStatusByRegion((prev) => ({
							...prev,
							[region]: value
						}));
						setError(void 0);
					}
					return value;
				} catch (cause) {
					if (mounted.current && signal?.aborted !== true) setError(cause instanceof Error ? cause.message : String(cause));
					return;
				}
			}, []);
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				refresh(activeRegion, controller.signal);
				const timer = window.setInterval(() => {
					refresh(activeRegion, controller.signal);
				}, POLL_INTERVAL_MS);
				return () => {
					window.clearInterval(timer);
					controller.abort();
				};
			}, [refresh, activeRegion]);
			const rescan = async () => {
				setBusy(true);
				setFlash(void 0);
				try {
					const response = await fetch(POOL_RESCAN_PATH, {
						method: "POST",
						headers: { accept: "application/json" },
						credentials: "same-origin"
					});
					const body = await response.json();
					if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
					await refresh(activeRegion);
					if (mounted.current) setFlash(t?.("row.accountsRescanned", { count: body.accounts ?? 0 }) ?? "");
				} catch (cause) {
					if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					if (mounted.current) setBusy(false);
				}
			};
			/**
			* Re-fetch the upstream model catalog for both regions.
			*
			* Its own action, and its own BUTTON, because the account rescan beside it
			* could not do this job: when the startup fetch failed, the picker held the
			* shorter built-in list and "detect accounts again" left it untouched, so the
			* only recovery was restarting DSH. Users reasonably assumed the button
			* covered both.
			*/
			const refreshCatalog = async () => {
				setCatalogBusy(true);
				setFlash(void 0);
				try {
					const response = await fetch(POOL_CATALOG_REFRESH_PATH, {
						method: "POST",
						headers: { accept: "application/json" },
						credentials: "same-origin"
					});
					const body = await response.json();
					if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
					await refresh(activeRegion);
					const here = body.regions?.[activeRegion];
					if (mounted.current) setFlash(here?.source === "live" ? t?.("row.catalogRefreshed", { count: here.models ?? 0 }) ?? "" : t?.("row.catalogRefreshOffline") ?? "");
				} catch (cause) {
					if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					if (mounted.current) setCatalogBusy(false);
				}
			};
			const resetCooldowns = async () => {
				setCooldownBusy(true);
				setFlash(void 0);
				try {
					const response = await fetch(POOL_RESET_COOLDOWN_PATH, {
						method: "POST",
						headers: { accept: "application/json" },
						credentials: "same-origin"
					});
					if (!response.ok) throw new Error(`HTTP ${response.status}`);
					await refresh(activeRegion);
					if (mounted.current) setFlash(t?.("row.resetCooldownsDone") ?? "");
				} catch (cause) {
					if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					if (mounted.current) setCooldownBusy(false);
				}
			};
			/**
			* Claim one account's daily check-in. The account id travels in the body so
			* the Host can never guess: a click on account B's button can only ever
			* collect account B's reward. The status is re-read afterwards so the card
			* reflects the new streak / total without waiting for the next poll.
			*/
			const claimCheckin = async (accountId) => {
				setCheckinBusyId(accountId);
				setFlash(void 0);
				try {
					const response = await fetch(POOL_CHECKIN_PATH, {
						method: "POST",
						headers: {
							accept: "application/json",
							"content-type": "application/json"
						},
						credentials: "same-origin",
						body: JSON.stringify({ accountId })
					});
					const body = await response.json().catch(() => void 0);
					if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
					await refresh(activeRegion);
					const credit = body?.claim?.credit ?? 0;
					if (mounted.current) setFlash(t?.("row.checkinClaimedReward", { credit: formatNumber(credit) }) ?? `Claimed +${formatNumber(credit)} credits`);
				} catch (cause) {
					if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					if (mounted.current) setCheckinBusyId(void 0);
				}
			};
			/**
			* Switch one account in or out of the pool.
			*
			* The id travels in the body and the host validates it against the accounts it
			* really knows, so a stale tab cannot write an orphan id. Disabling only stops
			* the account from being picked — it stays listed so it can be turned back on —
			* and the change is saved through the settings section, so it survives a
			* restart and is re-applied after every re-scan.
			*/
			const toggleAccountDisabled = async (accountId, disabled) => {
				const write = settingsScope?.set;
				if (write === void 0) {
					setError(t?.("row.modelsSaveError", { message: "settings scope is read-only" }) ?? "settings scope is read-only");
					return;
				}
				setAccountBusyId(accountId);
				setFlash(void 0);
				try {
					const current = (status?.accounts ?? []).filter((account) => account.disabled === true).map((account) => account.id);
					const next = disabled ? current.includes(accountId) ? current : [...current, accountId] : current.filter((id) => id !== accountId);
					await write.call(settingsScope, "disabledAccountIds", next);
					await refresh(activeRegion);
				} catch (cause) {
					const message = cause instanceof Error ? cause.message : String(cause);
					if (mounted.current) setError(t?.("row.accountToggleError", { message }) ?? "Could not switch the account: " + message);
				} finally {
					if (mounted.current) setAccountBusyId(void 0);
				}
			};
			/**
			* Throw one account out of the pool for good, or take it back.
			*
			* The host owns the ignore file, so this is a plain route call: no settings
			* scope is involved, which is also why it keeps working on a profile whose
			* settings section is read-only.
			*/
			const setAccountIgnored = async (accountId, ignored) => {
				setAccountBusyId(accountId);
				setFlash(void 0);
				try {
					const response = await fetch(POOL_ACCOUNT_IGNORE_PATH, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							accountId,
							ignored
						})
					});
					if (!response.ok) {
						const detail = await response.json().catch(() => ({}));
						throw new Error(detail.error ?? `HTTP ${response.status}`);
					}
					await refresh(activeRegion);
				} catch (cause) {
					const message = cause instanceof Error ? cause.message : String(cause);
					if (mounted.current) setError(t?.("row.accountIgnoreError", { message }) ?? "Could not change the ignore list: " + message);
				} finally {
					if (mounted.current) setAccountBusyId(void 0);
				}
			};
			/** Keep the draft in step with the server copy while nothing is dirty. */
			const modelDraft = draft ?? (status === void 0 ? {} : draftFromStatus(status));
			/** Model edits need a writable settings scope; otherwise the rows are read-only. */
			const modelsEditable = settingsWritable;
			const modelsDirty = draft !== void 0 && status !== void 0 && draftIsDirty(status, draft);
			const enabledCount = Object.values(modelDraft).filter((entry) => entry.enabled).length;
			/**
			* One clock reading per render, shared by the sort and every row.
			*
			* Taken once so the list cannot disagree with itself: calling `new Date()`
			* per row would let a model be "free" for the badge and "not free" for the
			* sort if the window boundary happened to fall between two rows.
			*
			* A promotion boundary is not a re-render trigger — the card refreshes on its
			* own poll, which is frequent enough for a badge that changes twice a day.
			*/
			const now = /* @__PURE__ */ new Date();
			const toggleModel = (id) => {
				if (status === void 0) return;
				const base = draft ?? draftFromStatus(status);
				const entry = base[id];
				if (entry === void 0) return;
				setDraft({
					...base,
					[id]: {
						...entry,
						enabled: !entry.enabled
					}
				});
			};
			const toggleModelImage = (id) => {
				if (status === void 0) return;
				const base = draft ?? draftFromStatus(status);
				const entry = base[id];
				if (entry === void 0) return;
				setDraft({
					...base,
					[id]: {
						...entry,
						images: !entry.images
					}
				});
			};
			const setModelBudget = (id, budget) => {
				if (status === void 0) return;
				const base = draft ?? draftFromStatus(status);
				const entry = base[id];
				if (entry === void 0) return;
				setDraft({
					...base,
					[id]: {
						...entry,
						budget
					}
				});
			};
			const discardModels = () => {
				setDraft(void 0);
				setFlash(void 0);
			};
			/**
			* Persist the draft. The route validates the payload again on the host side,
			* so a malformed draft is rejected there rather than silently stored. The
			* card refuses to save an empty enable-list: that would leave the picker
			* with nothing to offer and no obvious way back.
			*/
			/**
			* Persist the draft into the plugin settings section.
			*
			* The write goes through `settingsScope` rather than a bespoke route: that is
			* the same document the model picker reads, so one save covers every account
			* and survives account rotation — the selection is a property of the pool,
			* not of whichever account happens to be serving right now.
			*
			* The card refuses an empty enable-list: saving one would leave the picker
			* with nothing to offer and no obvious way back.
			*/
			/**
			* Switch how the pool spreads requests. Written straight through the
			* settings scope (that is where the host keeps the pool options), so the
			* change lands without a restart and survives the next card refresh.
			*/
			const setDistribution = async (next) => {
				const write = settingsScope?.set;
				if (write === void 0) {
					setError(t?.("row.modelsSaveError", { message: "settings scope is read-only" }) ?? "settings scope is read-only");
					return;
				}
				setFlash(void 0);
				try {
					await write.call(settingsScope, "distribution", next);
					await refresh(activeRegion);
				} catch (cause) {
					if (mounted.current) setError(String(cause));
				}
			};
			/**
			* Switch the daily-points automation on or off.
			*
			* The whole `automation` object is written as one key, because that is how the
			* settings document stores it: the schedule fields must be carried along, or a
			* save would drop the hour lists the scheduler is running on.
			*/
			const setAutomationEnabled = async (enabled) => {
				const write = settingsScope?.set;
				if (write === void 0) {
					setError(t?.("row.modelsSaveError", { message: "settings scope is read-only" }) ?? "settings scope is read-only");
					return;
				}
				const existing = status?.automation;
				setAutomationBusy(true);
				setFlash(void 0);
				try {
					await write.call(settingsScope, "automation", {
						checkinHours: hoursOrDefault(existing?.checkinHours, DEFAULT_AUTOMATION_HOURS.checkin),
						reportHours: hoursOrDefault(existing?.reportHours, DEFAULT_AUTOMATION_HOURS.report),
						taskHours: hoursOrDefault(existing?.taskHours, DEFAULT_AUTOMATION_HOURS.tasks),
						streakHours: hoursOrDefault(existing?.streakHours, DEFAULT_AUTOMATION_HOURS.streak),
						travelHours: hoursOrDefault(existing?.travelHours, DEFAULT_AUTOMATION_HOURS.travel),
						enabled
					});
					await refresh(activeRegion);
				} catch (cause) {
					if (mounted.current) setError(String(cause));
				} finally {
					if (mounted.current) setAutomationBusy(false);
				}
			};
			/**
			/**
			* Run the whole automation pass now.
			*
			* The route only STARTS the pass: a full run takes tens of seconds, which is
			* far too long to hold a request open. This watches the scheduler status until
			* the run settles, so the panel can show "running" honestly and report the
			* result when it lands.
			*/
			const runAutomationJob = async () => {
				setAutomationRun("all");
				setFlash(void 0);
				try {
					const response = await fetch(POOL_AUTOMATION_RUN_PATH, {
						method: "POST",
						headers: {
							"accept": "application/json",
							"content-type": "application/json"
						},
						credentials: "same-origin",
						body: JSON.stringify({ job: "all" })
					});
					const body = await response.json();
					if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
					if (body.started === false) {
						if (mounted.current) setFlash(t?.("row.autoAlreadyRunning") ?? "A run is already in progress");
					}
					let settled = false;
					for (let attempt = 0; attempt < AUTOMATION_POLL_ATTEMPTS; attempt += 1) {
						await new Promise((resolve) => setTimeout(resolve, AUTOMATION_POLL_MS));
						if (!mounted.current) return;
						if ((await refresh(activeRegion))?.automation?.runInProgress === false) {
							settled = true;
							break;
						}
					}
					await refresh(activeRegion);
					if (mounted.current) setFlash(settled ? t?.("row.autoRunDone") ?? "Automation pass finished" : t?.("row.autoRunTimeout") ?? "Still running; check back in a moment");
				} catch (cause) {
					if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					if (mounted.current) setAutomationRun(void 0);
				}
			};
			/**
			* Save one account reserved-credit floor.
			*
			* A reserve only protects credits if the pool knows the balance, so this
			* also refreshes the account list afterwards: the reserve badge appears
			* as soon as the reading crosses the floor.
			*/
			/**
			* Save one account reserved-credit floor.
			*
			* A reserve only protects credits if the pool knows the balance, so this also
			* refreshes the account list afterwards: the reserve badge appears as soon as
			* the reading crosses the floor.
			*
			* Returns whether the host CONFIRMED the write. The card keys its inline
			* "saved / not saved" note off this, so a failure is shown where the user is
			* looking instead of only in the card-level notice line.
			*/
			const saveCreditReserve = async (accountId, reserve) => {
				setReserveBusy(accountId);
				setFlash(void 0);
				try {
					const response = await fetch(POOL_CREDIT_RESERVE_PATH, {
						method: "POST",
						headers: {
							"accept": "application/json",
							"content-type": "application/json"
						},
						credentials: "same-origin",
						body: JSON.stringify({
							accountId,
							reserve
						})
					});
					const body = await response.json();
					if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
					await refresh(activeRegion);
					if (mounted.current) setFlash(reserve > 0 ? t?.("row.reserveSaved", { credits: reserve }) ?? `Keeping ${reserve} credits` : t?.("row.reserveCleared") ?? "Reserve cleared");
					return true;
				} catch (cause) {
					if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
					return false;
				} finally {
					if (mounted.current) setReserveBusy(void 0);
				}
			};
			const saveModels = async () => {
				if (draft === void 0 || status === void 0) return;
				if (enabledCount === 0) {
					setError(t?.("row.modelsEmpty") ?? "No model enabled");
					return;
				}
				const write = settingsScope?.set;
				if (write === void 0) {
					setError(t?.("row.modelsSaveError", { message: "settings scope is read-only" }) ?? "settings scope is read-only");
					return;
				}
				setSavingModels(true);
				setFlash(void 0);
				try {
					const enabledModelIds = Object.entries(draft).filter(([, e]) => e.enabled).map(([id]) => id);
					const imageModelIds = Object.entries(draft).filter(([, e]) => e.images).map(([id]) => id);
					const contextBudgets = {};
					for (const [id, entry] of Object.entries(draft)) if (entry.budget !== void 0) contextBudgets[id] = entry.budget;
					const key = activeRegion === "cn" ? "modelSelectionCn" : "modelSelectionGlobal";
					await write.call(settingsScope, key, {
						enabledModelIds,
						imageModelIds,
						contextBudgets
					});
					const otherRegion = activeRegion === "cn" ? "global" : "cn";
					const otherKey = otherRegion === "cn" ? "modelSelectionCn" : "modelSelectionGlobal";
					try {
						await write.call(settingsScope, otherKey, {
							enabledModelIds,
							imageModelIds,
							contextBudgets
						});
					} catch {}
					setDraft(void 0);
					if (mounted.current) setFlash(t?.("row.modelsSaved") ?? "Saved");
					await refresh(activeRegion);
					await refresh(otherRegion);
				} catch (cause) {
					if (mounted.current) setError(t?.("row.modelsSaveError", { message: cause instanceof Error ? cause.message : String(cause) }) ?? String(cause));
				} finally {
					if (mounted.current) setSavingModels(false);
				}
			};
			const title = t?.("row.title") ?? "WorkBuddy XD Pool";
			const description = t?.("row.desc") ?? "";
			const accountCount = status?.accounts.length ?? 0;
			const cooling = status?.cooling ?? 0;
			const state = error !== void 0 ? "error" : status === void 0 && error === void 0 ? "idle" : accountCount > 0 && cooling < accountCount ? "ok" : "idle";
			/** Human label for the active tab, used inside the empty-state copy. */
			const regionLabel = activeRegion === "cn" ? t?.("row.tabCn") ?? "CN" : t?.("row.tabGlobal") ?? "Global";
			const stateLabel = error !== void 0 ? t?.("row.requestFailed") ?? "Request failed" : accountCount === 0 ? t?.("row.regionEmpty") ?? t?.("row.poolEmpty") ?? "No account yet" : state === "ok" ? t?.("row.ok") ?? "Healthy" : t?.("row.allCooling") ?? "All cooling";
			const shimRunning = status?.shim.running === true;
			const shimHint = status === void 0 ? null : shimRunning ? t?.("row.shimRunning") ?? "Provider listening" : t?.("row.shimStopped") ?? "Provider loopback not running";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dsm-workbuddy-xdpool-page",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: "dsm-workbuddy-xdpool-page-head",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								className: "dsm-workbuddy-xdpool-page-icon",
								src: POOL_PLUGIN_ICON,
								alt: ""
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dsm-workbuddy-xdpool-page-copy",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: "dsm-workbuddy-xdpool-page-title",
									children: title
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dsm-workbuddy-xdpool-page-desc",
									children: description
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsm-workbuddy-xdpool-page-actions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsm-btn dsm-btn-outline",
									disabled: busy,
									onClick: () => {
										rescan();
									},
									children: busy ? t?.("row.accountsScanning") ?? "Detecting…" : t?.("row.accountsRescan") ?? "Detect accounts again"
								}), cooling > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsm-btn dsm-btn-outline",
									disabled: cooldownBusy,
									onClick: () => {
										resetCooldowns();
									},
									children: cooldownBusy ? t?.("row.resetCooldownsBusy") ?? "Clearing…" : t?.("row.resetCooldowns") ?? "Clear all cooldowns"
								}) : null]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsm-workbuddy-xdpool-card dsm-workbuddy-xdpool-status",
						"data-state": state,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsm-workbuddy-xdpool-tabs",
							role: "tablist",
							children: status?.regions.map((region) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "tab",
								"aria-selected": region === activeRegion,
								className: `dsm-workbuddy-xdpool-tab${region === activeRegion ? " dsm-workbuddy-xdpool-tab-active" : ""}`,
								onClick: () => {
									setActiveRegion(region);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsm-workbuddy-xdpool-tab-dot",
									"data-state": state
								}), region === "cn" ? t?.("row.tabCn") ?? "CN" : t?.("row.tabGlobal") ?? "Global"]
							}, region))
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsm-workbuddy-xdpool-usage-head",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsm-workbuddy-xdpool-usage-copy",
								role: "status",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsm-workbuddy-xdpool-usage-status",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											"aria-hidden": "true",
											className: "dsm-workbuddy-xdpool-usage-dot",
											style: { background: dotColor(state) }
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: stateLabel })]
									}),
									accountCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dsm-workbuddy-xdpool-usage-hint",
										children: t?.("row.accountsSummary", {
											count: accountCount,
											cooling
										}) ?? `${accountCount} account(s) · ${cooling} cooling`
									}) : null,
									shimHint === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dsm-workbuddy-xdpool-usage-hint",
										children: shimHint
									}),
									status === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsm-workbuddy-xdpool-dist",
										role: "radiogroup",
										"aria-label": t?.("row.distTitle") ?? "Account usage",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dsm-workbuddy-xdpool-dist-head",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dsm-workbuddy-xdpool-dist-title",
													children: t?.("row.distTitle") ?? "Account usage"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dsm-workbuddy-xdpool-dist-now",
													children: distLabel(status.distribution ?? "priority", t)
												})]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dsm-workbuddy-xdpool-dist-options",
												children: DIST_OPTIONS.map((option) => {
													const active = (status.distribution ?? "priority") === option;
													const label = distLabel(option, t);
													const hint = distHint(option, t);
													return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														role: "radio",
														"aria-checked": active,
														title: hint,
														disabled: !modelsEditable,
														className: "dsm-workbuddy-xdpool-dist-option" + (active ? " dsm-workbuddy-xdpool-dist-option-active" : ""),
														onClick: () => {
															setDistribution(option);
														},
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "dsm-workbuddy-xdpool-dist-option-top",
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: "dsm-workbuddy-xdpool-dist-option-name",
																children: label
															}), option === "sticky" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: "dsm-workbuddy-xdpool-dist-option-badge",
																children: t?.("row.distRecommended") ?? "Recommended"
															}) : null]
														})
													}, option);
												})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: "dsm-workbuddy-xdpool-dist-hint",
												children: distHint(status.distribution ?? "priority", t)
											})
										]
									})
								]
							})
						})]
					}),
					activeRegion !== "cn" || status?.automation === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsm-workbuddy-xdpool-card dsm-workbuddy-xdpool-auto",
						"aria-label": t?.("row.autoTitle") ?? "Automation",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsm-workbuddy-xdpool-auto-head",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsm-workbuddy-xdpool-auto-title",
										children: t?.("row.autoTitle") ?? "Automation"
									}),
									!status.automation.enabled ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsm-btn dsm-btn-outline dsm-workbuddy-xdpool-auto-run",
										disabled: automationRun !== void 0,
										onClick: () => {
											runAutomationJob();
										},
										children: automationRun !== void 0 ? t?.("row.autoRunning") ?? "Running…" : t?.("row.autoRunAll") ?? "Run all now"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										role: "switch",
										"aria-checked": status.automation.enabled,
										disabled: !settingsWritable || automationBusy,
										className: `dsm-workbuddy-xdpool-auto-switch${status.automation.enabled ? " dsm-workbuddy-xdpool-auto-switch-on" : ""}`,
										onClick: () => {
											setAutomationEnabled(!status.automation.enabled);
										},
										children: automationBusy ? t?.("row.autoBusy") ?? "Saving…" : status.automation.enabled ? t?.("row.autoOn") ?? "On" : t?.("row.autoOff") ?? "Off"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsm-workbuddy-xdpool-auto-hint",
								children: status.automation.enabled ? t?.("row.autoHintOn") ?? "Reports activity, claims task rewards and checks in once a day." : t?.("row.autoHintOff") ?? "Off: no background requests are made for you."
							}),
							automationTotals.credit === 0 && automationTotals.checkinCredit === 0 && automationTotals.bonusCredit === 0 && automationTotals.travelCredit === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsm-workbuddy-xdpool-auto-total",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsm-workbuddy-xdpool-auto-total-label",
									children: t?.("row.autoToday") ?? "Today"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dsm-workbuddy-xdpool-auto-total-list",
									children: [
										automationTotals.credit > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsm-workbuddy-xdpool-auto-total-row",
											children: t?.("row.autoFromTasks", {
												credit: automationTotals.credit,
												energy: automationTotals.energy,
												count: automationTotals.claimed
											}) ?? `Tasks +${automationTotals.credit}`
										}) : null,
										automationTotals.checkinCredit > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsm-workbuddy-xdpool-auto-total-row",
											children: t?.("row.autoFromCheckin", { credit: automationTotals.checkinCredit }) ?? `Check-in +${automationTotals.checkinCredit}`
										}) : null,
										automationTotals.bonusCredit > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsm-workbuddy-xdpool-auto-total-row",
											children: t?.("row.autoFromBonus", { credit: automationTotals.bonusCredit }) ?? `Streak +${automationTotals.bonusCredit}`
										}) : null,
										automationTotals.travelCredit > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsm-workbuddy-xdpool-auto-total-row",
											children: t?.("row.autoFromTravel", { credit: automationTotals.travelCredit }) ?? `Buddy +${automationTotals.travelCredit}`
										}) : null
									]
								})]
							}),
							status.automation.enabled ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsm-workbuddy-xdpool-auto-jobs",
								children: AUTOMATION_JOBS.map((kind) => {
									const job = automationJob(status, kind);
									const hours = automationHours(status, kind);
									const label = t?.(`row.autoJob_${kind}`) ?? kind;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsm-workbuddy-xdpool-auto-job",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dsm-workbuddy-xdpool-auto-job-name",
												children: label
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dsm-workbuddy-xdpool-auto-job-when",
												children: hours.length === 0 ? t?.("row.autoHourNone") ?? "not scheduled" : hours.map((hour) => `${String(hour).padStart(2, "0")}:00`).join(" · ")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dsm-workbuddy-xdpool-auto-job-last",
												children: job?.lastRunAtMs === void 0 ? t?.("row.autoNever") ?? "not run yet" : `${formatTime(job.lastRunAtMs)} · ${job.ok}${job.failed > 0 ? `/${job.failed}` : ""}`
											}),
											job?.progress === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dsm-workbuddy-xdpool-auto-job-note",
												children: job.progress
											}),
											job?.detail === void 0 || job.detail.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dsm-workbuddy-xdpool-auto-job-detail",
												children: job.detail.join(" · ")
											})
										]
									}, kind);
								})
							}) : null
						]
					}),
					flash === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsm-workbuddy-xdpool-note",
						children: flash
					}),
					error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsm-workbuddy-xdpool-error",
						children: t?.("row.error", { message: error }) ?? `Pool status unavailable: ${error}`
					}),
					accountCount === 0 && error === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsm-workbuddy-xdpool-card dsm-workbuddy-xdpool-empty",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsm-workbuddy-xdpool-empty-title",
								children: t?.("row.regionEmptyTitle", { region: regionLabel }) ?? t?.("row.regionEmpty") ?? "No account yet"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsm-workbuddy-xdpool-empty-steps",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dsm-workbuddy-xdpool-empty-steps-title",
									children: t?.("row.regionHowToTitle", { region: regionLabel }) ?? `How to sign in to the ${regionLabel} version`
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ol", {
									className: "dsm-workbuddy-xdpool-empty-list",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t?.("row.regionHowTo1") ?? "" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t?.("row.regionHowTo2") ?? "" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t?.("row.regionHowTo3") ?? "" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t?.("row.regionHowTo4") ?? "" })
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsm-workbuddy-xdpool-empty-note",
								children: t?.("row.regionHowToNote") ?? ""
							})
						]
					}) : null,
					accountCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsm-workbuddy-xdpool-card dsm-workbuddy-xdpool-accounts",
						"aria-label": t?.("row.accountsTitle") ?? "Accounts",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsm-workbuddy-xdpool-accounts-head",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									className: "dsm-workbuddy-xdpool-accounts-title",
									children: t?.("row.accountsTitle") ?? "Accounts in the pool"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dsm-workbuddy-xdpool-accounts-summary",
									children: t?.("row.accountsSummary", {
										count: accountCount,
										cooling
									}) ?? `${accountCount} account(s) · ${cooling} cooling`
								})]
							}),
							status?.skippedFiles === void 0 || status.skippedFiles.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsm-workbuddy-xdpool-skipped",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dsm-workbuddy-xdpool-skipped-summary",
									children: t?.("row.skippedFiles", { count: status.skippedFiles.length }) ?? `${status.skippedFiles.length} credential file(s) could not be read`
								}), status.skippedFiles.slice(0, 4).map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: "dsm-workbuddy-xdpool-skipped-row",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsm-workbuddy-xdpool-skipped-file",
										children: entry.file
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsm-workbuddy-xdpool-skipped-reason",
										children: entry.reason === "encrypted" ? t?.("row.skippedEncrypted") ?? "encrypted — start WorkBuddy once" : entry.reason === "unreadable" ? t?.("row.skippedUnreadable") ?? "file could not be read" : entry.reason === "expiredRefresh" ? t?.("row.skippedExpired") ?? "sign-in expired — sign in again" : t?.("row.skippedMalformed") ?? "not a credential file"
									})]
								}, entry.file))]
							}),
							(() => {
								const active = status?.activeAccountId === void 0 ? void 0 : status.accounts.find((account) => account.id === status.activeAccountId);
								if (active === void 0) return null;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsm-workbuddy-xdpool-current",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsm-workbuddy-xdpool-current-dot" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsm-workbuddy-xdpool-current-label",
											children: t?.("row.currentAccount") ?? "In use now"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsm-workbuddy-xdpool-current-name",
											children: active.label
										}),
										active.disabled === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsm-workbuddy-xdpool-current-note",
											children: t?.("row.currentAccountDisabled") ?? "disabled — will switch on the next request"
										}) : null
									]
								});
							})(),
							status?.accounts.map((account) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AccountBlock, {
								account,
								models: status?.models ?? [],
								...checkinBusyId === void 0 ? {} : { checkinBusyId },
								onClaimCheckin: (accountId) => {
									claimCheckin(accountId);
								},
								onSaveCreditReserve: (accountId, reserve) => saveCreditReserve(accountId, reserve),
								onToggleDisabled: (accountId, disabled) => {
									toggleAccountDisabled(accountId, disabled);
								},
								onIgnoreAccount: (accountId) => {
									setAccountIgnored(accountId, true);
								},
								...accountBusyId === void 0 ? {} : { accountBusyId },
								t
							}, account.id))
						]
					}) : null,
					(status?.ignored.length ?? 0) > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsm-workbuddy-xdpool-card dsm-workbuddy-xdpool-ignored",
						"aria-label": t?.("row.ignoredTitle") ?? "Removed accounts",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsm-workbuddy-xdpool-ignored-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: "dsm-workbuddy-xdpool-ignored-title",
								children: t?.("row.ignoredTitle") ?? "Removed accounts"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsm-workbuddy-xdpool-ignored-summary",
								children: t?.("row.ignoredSummary", { count: status?.ignored.length ?? 0 }) ?? `${status?.ignored.length ?? 0} account(s) no longer in the pool`
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsm-workbuddy-xdpool-ignored-list",
							children: (status?.ignored ?? []).map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsm-workbuddy-xdpool-ignored-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsm-workbuddy-xdpool-ignored-label",
									children: entry.label
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsm-workbuddy-xdpool-ignored-restore",
									title: t?.("row.ignoredRestoreHint") ?? "Put this account back into the pool",
									disabled: accountBusyId === entry.id,
									onClick: () => {
										setAccountIgnored(entry.id, false);
									},
									children: t?.("row.ignoredRestore") ?? "Restore"
								})]
							}, entry.id))
						})]
					}) : null,
					(status?.models.length ?? 0) > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsm-workbuddy-xdpool-card dsm-workbuddy-xdpool-models",
						"aria-label": t?.("row.modelsTitle") ?? "Models",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsm-workbuddy-xdpool-models-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsm-workbuddy-xdpool-models-heading",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									className: "dsm-workbuddy-xdpool-models-title",
									children: t?.("row.modelsTitle") ?? "Models"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: "dsm-workbuddy-xdpool-models-summary",
									children: [t?.("row.modelsEnabledCount", {
										enabled: enabledCount,
										total: status?.models.length ?? 0
									}) ?? `${enabledCount} / ${status?.models.length ?? 0} enabled`, status?.catalogSource !== "fallback" ? null : ` · ${t?.("row.modelsFallbackHint") ?? "built-in list: the gateway roster could not be read"}`]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsm-workbuddy-xdpool-models-actions",
								children: [
									status?.catalogSource !== "fallback" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsm-workbuddy-xdpool-catalog-offline",
										title: status.catalogError ?? void 0,
										children: t?.("row.catalogOffline") ?? "built-in list (offline)"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsm-btn dsm-btn-outline",
										disabled: catalogBusy,
										onClick: () => {
											refreshCatalog();
										},
										title: t?.("row.catalogRefreshHint") ?? "Fetch the model list again from WorkBuddy",
										children: catalogBusy ? t?.("row.catalogRefreshing") ?? "Fetching…" : t?.("row.catalogRefresh") ?? "Refresh models"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsm-btn dsm-btn-outline",
										disabled: !modelsDirty || savingModels,
										onClick: discardModels,
										children: t?.("row.modelsDiscard") ?? "Discard"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsm-btn dsm-btn-primary",
										disabled: !modelsDirty || savingModels || enabledCount === 0,
										onClick: () => {
											saveModels();
										},
										children: savingModels ? t?.("row.modelsSaving") ?? "Saving…" : t?.("row.modelsSave") ?? "Save"
									})
								]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsm-workbuddy-xdpool-model-list",
							children: [...status?.models ?? []].sort((a, b) => Number(isFreeNow(b, now, activeRegion)) - Number(isFreeNow(a, now, activeRegion))).map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelRow, {
								model,
								region: activeRegion,
								paidTwin: paidAlternativeFor(model, status?.models ?? []),
								t,
								draft: modelDraft[model.id] ?? {
									enabled: model.enabled,
									images: model.supportsImages
								},
								editable: modelsEditable,
								onToggle: toggleModel,
								onToggleImage: toggleModelImage,
								onBudget: setModelBudget
							}, model.id))
						})]
					}) : null
				]
			});
		}
		/** One account block: label + status tag + meta + optional credit panels. */
		function AccountBlock({ account, models, t, checkinBusyId, onClaimCheckin, accountBusyId, onToggleDisabled, onIgnoreAccount, onSaveCreditReserve, reserveBusyId }) {
			const isDisabled = account.disabled === true;
			const isCooling = account.cooling === true;
			const isDead = account.credentialDead === true;
			const cooldownUntil = account.cooldownUntil !== void 0 ? Date.parse(account.cooldownUntil) : void 0;
			const modelCooldowns = account.modelCooldowns ?? [];
			const tag = isDead ? {
				text: t?.("row.credentialDeadTag") ?? "Sign-in rejected",
				cls: "dsm-workbuddy-xdpool-account-tag dsm-workbuddy-xdpool-account-tag-dead"
			} : isCooling ? {
				text: t?.("row.cooling") ?? "Cooling",
				cls: "dsm-workbuddy-xdpool-account-tag dsm-workbuddy-xdpool-account-tag-cooling"
			} : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: isDisabled ? "dsm-workbuddy-xdpool-account dsm-workbuddy-xdpool-account-off" : "dsm-workbuddy-xdpool-account",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsm-workbuddy-xdpool-account-head",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsm-workbuddy-xdpool-account-label",
							children: account.label
						}),
						tag === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: tag.cls,
							children: tag.text
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							role: "switch",
							"aria-checked": !isDisabled,
							className: isDisabled ? "dsm-workbuddy-xdpool-account-toggle" : "dsm-workbuddy-xdpool-account-toggle dsm-workbuddy-xdpool-account-toggle-on",
							title: t?.("row.accountToggleHint") ?? "Enable this account (uncheck to keep it out of the pool)",
							disabled: accountBusyId === account.id,
							onClick: () => {
								onToggleDisabled(account.id, !isDisabled);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsm-workbuddy-xdpool-account-toggle-dot" }), isDisabled ? t?.("row.accountOff") ?? "Disabled" : t?.("row.accountInRotation") ?? "Enabled"]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsm-workbuddy-xdpool-account-ignore",
							title: t?.("row.accountIgnoreHint") ?? "Remove this account from the pool for good",
							disabled: accountBusyId === account.id,
							onClick: () => {
								onIgnoreAccount(account.id);
							},
							children: t?.("row.accountIgnore") ?? "Remove"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsm-workbuddy-xdpool-account-body",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsm-workbuddy-xdpool-account-copy",
							children: [
								account.expiresAt !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsm-workbuddy-xdpool-account-meta",
									children: t?.("row.tokenExpiry", { time: formatDateTime(account.expiresAt) }) ?? `token ${formatDateTime(account.expiresAt)}`
								}) : null,
								isCooling && cooldownUntil !== void 0 && !Number.isNaN(cooldownUntil) ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dsm-workbuddy-xdpool-account-meta",
									children: [
										t?.("row.cooldownUntil", { time: formatTime(cooldownUntil) }) ?? `until ${formatTime(cooldownUntil)}`,
										" · ",
										t?.("row.cooldownHits", { hits: account.rateLimitHits ?? 0 }) ?? `${account.rateLimitHits ?? 0} hit(s)`
									]
								}) : null,
								isDead ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsm-workbuddy-xdpool-account-meta dsm-workbuddy-xdpool-account-meta-dead",
									children: t?.("row.credentialDeadHint") ?? "Sign in again in the WorkBuddy desktop app to restore it"
								}) : null,
								modelCooldowns.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsm-workbuddy-xdpool-account-modelcool",
									children: modelCooldowns.map((mc) => {
										const coolingModel = models.find((model) => model.id === mc.modelId);
										const twin = coolingModel === void 0 ? void 0 : paidAlternativeFor(coolingModel, models);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dsm-workbuddy-xdpool-account-modelcool-chip",
											children: [t?.("row.modelCooling", {
												model: mc.modelId,
												time: formatDateTime(mc.until)
											}) ?? `${mc.modelId} cooling to ${formatDateTime(mc.until)}`, twin === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dsm-workbuddy-xdpool-account-modelcool-twin",
												title: t?.("row.paidTwinHint") ?? "Same model, paid row",
												children: t?.("row.rateLimitedPaidTwin", {
													id: twin.id,
													rate: twin.multiplier.toFixed(2)
												}) ?? `→ ${twin.id} (${twin.multiplier.toFixed(2)}x) still works`
											})]
										}, mc.modelId);
									})
								}) : null
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AccountStats, {
							account,
							t,
							checkinBusy: checkinBusyId === account.id,
							onClaim: onClaimCheckin
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CreditReserveRow, {
							account,
							t,
							busy: reserveBusyId === account.id,
							onSave: onSaveCreditReserve
						}),
						account.automationToday === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsm-workbuddy-xdpool-earned",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsm-workbuddy-xdpool-earned-label",
								children: t?.("row.autoEarned") ?? "Automation today"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dsm-workbuddy-xdpool-earned-list",
								children: [
									account.automationToday.credit > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsm-workbuddy-xdpool-earned-row",
										children: t?.("row.autoFromTasks", {
											credit: account.automationToday.credit,
											energy: account.automationToday.energy,
											count: account.automationToday.claimed
										}) ?? `Tasks +${account.automationToday.credit}`
									}) : null,
									account.automationToday.checkinCredit > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsm-workbuddy-xdpool-earned-row",
										children: t?.("row.autoFromCheckin", { credit: account.automationToday.checkinCredit }) ?? `Check-in +${account.automationToday.checkinCredit}`
									}) : null,
									account.automationToday.bonusCredit > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsm-workbuddy-xdpool-earned-row",
										children: t?.("row.autoFromBonus", { credit: account.automationToday.bonusCredit }) ?? `Streak +${account.automationToday.bonusCredit}`
									}) : null,
									account.automationToday.travelCredit > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsm-workbuddy-xdpool-earned-row",
										children: t?.("row.autoFromTravel", { credit: account.automationToday.travelCredit }) ?? `Buddy +${account.automationToday.travelCredit}`
									}) : null
								]
							})]
						})
					]
				})]
			});
		}
		/**
		* Daily check-in block: streak summary plus one claim button for this account.
		* Every account in the pool gets its own button, so a multi-account user can
		* collect each reward without switching the pool's preferred account first.
		*/
		/**
		* Credit panels: package breakdown on the left, the big total on the right with
		* the daily check-in action docked beneath it. Mirrors the two-column credit
		* layout the LaoDing plugin family uses, so the numbers stay scannable and the
		* claim button sits where the eye already is.
		*/
		/**
		* Reserved-credit control for one account.
		*
		* The value is committed on blur or Enter rather than on every keystroke:
		* each save is a settings write plus a status refresh, and a per-character
		* save would hammer both.
		*/
		/**
		* The reserved-credit floor for one account.
		*
		* Saving is an EXPLICIT action, not a blur side effect. The old version
		* committed `onBlur`, which meant a value could be written without the user
		* asking for it — and when the write silently failed, the only trace was a
		* notice line at the top of the card that is easy to miss. That is how
		* "I typed a number, reopened, and it says 0 again" happened with no visible
		* error to explain it.
		*
		* Now: the field is a draft, Save is enabled only when the draft differs from
		* what the host last reported, and the outcome (saving / saved / failed) is
		* shown inline next to the button. Enter also saves, so keyboard flow is not
		* lost.
		*/
		function CreditReserveRow({ account, t, busy, onSave }) {
			const saved = account.creditReserve ?? 0;
			const [draft, setDraft] = (0, react.useState)(String(saved));
			const [settled, setSettled] = (0, react.useState)(saved);
			const [note, setNote] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => {
				setSettled(saved);
				setDraft((current) => current === String(saved) ? current : String(saved));
			}, [saved]);
			const parsed = Number.parseInt(draft, 10);
			const next = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
			const dirty = next !== settled;
			const commit = async () => {
				if (busy || !dirty) return;
				setNote(void 0);
				if (await onSave(account.id, next)) {
					setSettled(next);
					setDraft(String(next));
					setNote("saved");
				} else setNote("failed");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsm-workbuddy-xdpool-reserve",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsm-workbuddy-xdpool-reserve-label",
						children: t?.("row.reserveTitle") ?? "Keep at least"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "number",
						min: 0,
						step: 1,
						value: draft,
						disabled: busy,
						className: "dsm-workbuddy-xdpool-reserve-input",
						"aria-label": t?.("row.reserveTitle") ?? "Keep at least",
						onChange: (event) => {
							setDraft(event.target.value);
							setNote(void 0);
						},
						onKeyDown: (event) => {
							if (event.key === "Enter") commit();
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsm-workbuddy-xdpool-reserve-unit",
						children: t?.("row.reserveUnit") ?? "credits"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsm-workbuddy-xdpool-reserve-save",
						disabled: busy || !dirty,
						onClick: () => {
							commit();
						},
						children: busy ? t?.("row.reserveSaving") ?? "Saving…" : t?.("row.reserveSave") ?? "Save"
					}),
					note === "saved" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsm-workbuddy-xdpool-reserve-note dsm-workbuddy-xdpool-reserve-note-ok",
						children: next > 0 ? t?.("row.reserveSaved", { credits: next }) ?? `Keeping ${next} credits` : t?.("row.reserveCleared") ?? "Reserve cleared"
					}) : null,
					note === "failed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsm-workbuddy-xdpool-reserve-note dsm-workbuddy-xdpool-reserve-note-bad",
						children: t?.("row.reserveFailed") ?? "Not saved — try again"
					}) : null,
					account.reserved === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsm-workbuddy-xdpool-reserve-badge",
						children: t?.("row.reserveHolding") ?? "Reserved: skipped"
					}) : null
				]
			});
		}
		function AccountStats({ account, t, checkinBusy, onClaim }) {
			const credits = account.credits;
			const checkin = account.checkin;
			const hasCredits = credits !== void 0 || account.creditsError !== void 0;
			const hasCheckin = checkin !== void 0 || account.checkinError !== void 0;
			if (!hasCredits && !hasCheckin) return null;
			const packages = (credits?.packages ?? []).filter((p) => (p.size ?? 0) > 0).slice(0, 6);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsm-workbuddy-xdpool-stats",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: "dsm-workbuddy-xdpool-panel dsm-workbuddy-xdpool-panel-packages",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsm-workbuddy-xdpool-panel-title",
							children: t?.("row.creditsPackages") ?? "Credit packages"
						}),
						account.creditsError !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: `dsm-workbuddy-xdpool-panel-error${account.credentialDead === true ? " dsm-workbuddy-xdpool-panel-error-dead" : ""}`,
							title: account.creditsError,
							children: account.credentialDead === true ? t?.("row.credentialDead") ?? "Sign-in rejected" : t?.("row.creditsError") ?? "credits unavailable"
						}) : packages.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsm-workbuddy-xdpool-panel-empty",
							children: "–"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: "dsm-workbuddy-xdpool-packages",
							children: packages.map((pack, index) => {
								const expiry = formatExpiry(pack.expiresAtMs);
								const refresh = formatExpiry(pack.cycleRefreshMs);
								const soon = isExpiringSoon(pack);
								const when = pack.monthly === true ? refresh === "" ? null : t?.("row.creditsRefreshAt", { time: refresh }) ?? `Refreshes ${refresh}` : expiry === "" ? null : t?.("row.creditsExpiresAt", { time: expiry }) ?? `Expires ${expiry}`;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsm-workbuddy-xdpool-packages-name",
										children: pack.packageName
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsm-workbuddy-xdpool-packages-value",
										children: t?.("row.creditsPackage", {
											remain: formatNumber(pack.remain),
											size: formatNumber(pack.size)
										}) ?? `${formatNumber(pack.remain)} / ${formatNumber(pack.size)}`
									}),
									when === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: `dsm-workbuddy-xdpool-packages-when${soon ? " dsm-workbuddy-xdpool-packages-when-soon" : ""}`,
										title: t?.("row.creditsExpiresSoonTitle") ?? "Expiring within 3 days",
										children: when
									})
								] }, `${pack.packageName}-${String(index)}`);
							})
						}),
						credits?.expiringSoon !== void 0 && credits.expiringSoon > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsm-workbuddy-xdpool-panel-foot",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t?.("row.creditsSoon") ?? "Expiring in 3 days" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: formatNumber(credits.expiringSoon) })]
						}) : null
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: "dsm-workbuddy-xdpool-panel dsm-workbuddy-xdpool-panel-total",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsm-workbuddy-xdpool-panel-title",
							children: t?.("row.creditsTotal") ?? "Total"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsm-workbuddy-xdpool-total-value",
							children: formatNumber(credits?.total)
						}),
						hasCheckin ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsm-workbuddy-xdpool-checkin",
							children: account.checkinError !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsm-workbuddy-xdpool-checkin-error",
								title: account.checkinError,
								children: t?.("row.checkinUnavailable") ?? "check-in unavailable"
							}) : checkin === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsm-workbuddy-xdpool-checkin-meta",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsm-workbuddy-xdpool-checkin-streak",
										children: t?.("row.checkinStreak", { days: checkin.streakDays }) ?? `${checkin.streakDays}-day streak`
									}), checkin.dailyCredit > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsm-workbuddy-xdpool-checkin-daily",
										children: t?.("row.checkinDaily", { credit: formatNumber(checkin.dailyCredit) }) ?? `+${formatNumber(checkin.dailyCredit)}/day`
									}) : null]
								}),
								checkin.isStreakDay && checkin.streakBonusCredit > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsm-workbuddy-xdpool-checkin-bonus",
									children: t?.("row.checkinStreakBonus", {
										days: formatNumber(checkin.nextStreakDay),
										credit: formatNumber(checkin.streakBonusCredit)
									}) ?? `bonus +${formatNumber(checkin.streakBonusCredit)}`
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsm-workbuddy-xdpool-checkin-btn",
									disabled: !checkin.active || checkin.todayCheckedIn || checkinBusy,
									onClick: () => {
										onClaim(account.id);
									},
									children: !checkin.active ? t?.("row.checkinInactive") ?? "Unavailable" : checkin.todayCheckedIn ? t?.("row.checkinClaimed") ?? "Checked in" : checkinBusy ? t?.("row.checkinClaiming") ?? "Checking in…" : t?.("row.checkinClaim") ?? "Check in"
								})
							] })
						}) : null
					]
				})]
			});
		}
		/**
		* One model row.
		*
		* Read-only when the card has no writable settings scope: the checkbox and the
		* context radios stay disabled rather than pretending an edit took hold. The
		* draft lives in the parent, so this component only ever reports intent.
		*/
		function ModelRow({ model, region, paidTwin, t, draft, editable, onToggle, onToggleImage, onBudget }) {
			const now = /* @__PURE__ */ new Date();
			const tag = tagFor(model, now, region);
			const promo = promoStatusFor(model, now, region);
			const tagText = tag === "free" ? t?.("row.free") ?? "free" : tag === "limited" ? t?.("row.limitedFree") ?? "limited free" : tag === "night" ? t?.("row.nightFreeNow", { time: `${String(promo?.kind === "night" ? promo.untilHour : 0).padStart(2, "0")}:00` }) ?? "free until 08:00" : null;
			/**
			* The "cheaper later" hint: the model is on a promotion but the window is
			* closed. Deliberately NOT a "free" badge — it costs credits at this moment,
			* and telling the user otherwise would change what they spend.
			*/
			const laterHint = promo?.kind === "night-later" ? t?.("row.nightFreeLater", { time: `${String(promo.nextHour).padStart(2, "0")}:00` }) ?? `free from ${String(promo.nextHour).padStart(2, "0")}:00` : null;
			/**
			* How long the campaign itself runs, e.g. "活动至 10-31".
			*
			* Shown on both the free and the not-yet-free row, because the useful question
			* is not only "is it free now" but "until when is this offer good at all" —
			* an extension changes that date, and a user planning around the promotion
			* needs it visible rather than buried in a changelog.
			*/
			const promoUntil = promo === void 0 || promo.kind === "free" ? null : t?.("row.promoUntil", { date: promo.promoUntil.slice(5).replace("-", "-") }) ?? `promo until ${promo.promoUntil}`;
			const native = model.nativeContextWindow;
			const capped = native > DEFAULT_CONTEXT_BUDGET;
			const currentBudget = draft.budget ?? native;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `dsm-workbuddy-xdpool-model${draft.enabled ? "" : " dsm-workbuddy-xdpool-model-off"}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsm-workbuddy-xdpool-model-head",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsm-workbuddy-xdpool-model-check",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: draft.enabled,
							disabled: !editable,
							onChange: () => {
								onToggle(model.id);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsm-workbuddy-xdpool-model-copy",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dsm-workbuddy-xdpool-model-name",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: model.name }), model.multiplier === void 0 || model.multiplier === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsm-workbuddy-xdpool-model-name-rate",
									children: t?.("row.rate", { rate: model.multiplier.toFixed(2) }) ?? `${model.multiplier.toFixed(2)}x`
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsm-workbuddy-xdpool-model-id",
								children: model.id
							})]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsm-workbuddy-xdpool-model-controls",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "dsm-workbuddy-xdpool-model-image",
							title: t?.("row.modelImage") ?? "Image input",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: draft.images,
								disabled: !editable,
								onChange: () => {
									onToggleImage(model.id);
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t?.("row.modelImage") ?? "Image" })]
						}), capped ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
							className: "dsm-workbuddy-xdpool-model-budget",
							"aria-label": t?.("row.modelContextBudget") ?? "Context",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "radio",
								name: `budget-${model.id}`,
								checked: currentBudget === DEFAULT_CONTEXT_BUDGET,
								disabled: !editable,
								onChange: () => {
									onBudget(model.id, DEFAULT_CONTEXT_BUDGET);
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatCapacity(DEFAULT_CONTEXT_BUDGET) })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "radio",
								name: `budget-${model.id}`,
								checked: currentBudget === native,
								disabled: !editable,
								onChange: () => {
									onBudget(model.id, native);
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatCapacity(native) })] })]
						}) : null]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsm-workbuddy-xdpool-model-meta",
					children: [
						tagText === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsm-workbuddy-xdpool-model-meta-tag",
							children: tagText
						}),
						laterHint === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsm-workbuddy-xdpool-model-meta-later",
							children: laterHint
						}),
						promoUntil === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsm-workbuddy-xdpool-model-meta-promo",
							children: promoUntil
						}),
						paidTwin === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsm-workbuddy-xdpool-model-meta-twin",
							title: t?.("row.paidTwinHint") ?? "Same model, paid row",
							children: t?.("row.paidTwin", {
								id: paidTwin.id,
								rate: paidTwin.multiplier.toFixed(2)
							}) ?? `paid twin ${paidTwin.id} (${paidTwin.multiplier.toFixed(2)}x)`
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsm-workbuddy-xdpool-model-cap",
							children: t?.("row.modelOutput", { size: formatCapacity(model.maxOutputTokens) }) ?? `out ${formatCapacity(model.maxOutputTokens)}`
						}),
						model.supportedEfforts === void 0 || model.supportedEfforts.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsm-workbuddy-xdpool-model-cap",
							children: t?.("row.modelReasoning", { efforts: model.supportedEfforts.join(" / ") }) ?? model.supportedEfforts.join(" / ")
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/nav-icon.ts
		/**
		* Nav glyph for the WorkBuddy XD Pool settings page.
		*
		* The host's settings shell draws its own 16px `svg` in every nav row and the
		* `settings.section` registration contract projects only `id` / `order` /
		* `label` — there is no `icon` field to pass. A third-party page therefore has
		* to mark its row in the DOM and mask this artwork over the shell's glyph, the
		* same technique `dshmarket` uses (`installSettingsNavIcon`).
		*
		* Kept as a single monochrome path so `mask-image` + `currentColor` can tint it
		* with whatever the active theme uses for nav text: a filled mask cannot carry
		* its own palette, and a two-tone icon would render as a flat silhouette.
		*
		* @module dsh-workbuddy-xdpool/client/nav-icon
		*/
		/**
		* The nav mark: a stack of three rounded "accounts" under a rotation arc.
		*
		* Reads as "a pool of accounts being cycled" at 16px, and — unlike a literal
		* droplet or cloud — stays legible when reduced to a single-color silhouette.
		* `fill-rule="evenodd"` cuts the interior notches out of the silhouette so the
		* three layers stay distinguishable at that size.
		*/
		const POOL_NAV_ICON_SVG = [
			"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\">",
			"<path fill=\"currentColor\" fill-rule=\"evenodd\" d=\"",
			"M12 2.6a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2Zm0 1.7a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z",
			"M6.6 8.9a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Zm0 1.6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
			"M17.4 8.9a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Zm0 1.6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
			"\"/>",
			"<path fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"",
			" d=\"M4.4 17.2a8.6 8.6 0 0 0 15.2 0\" stroke-dasharray=\"2.6 2.2\"/>",
			"</svg>"
		].join("");
		/**
		* The same artwork as a `mask-image` URL.
		*
		* `encodeURIComponent` keeps the `#`-free markup safe inside a `url("…")` in a
		* stylesheet, and `currentColor` is resolved by the mask's own element rather
		* than by the SVG, so the glyph follows the theme.
		*/
		const POOL_NAV_ICON_MASK_URL = `data:image/svg+xml;utf8,${encodeURIComponent(POOL_NAV_ICON_SVG)}`;
		//#endregion
		//#region src/client/locales.ts
		/**
		* Plugin-card copy registered under the `settings.workbuddy-xdpool` locale
		* namespace. Key lists in `en` and `zh` are kept 1:1 by typing `zh` against
		* the key set of `en`.
		*
		* @module dsh-workbuddy-xdpool/client/locales
		*/
		const en = {
			"row.navLabel": "WorkBuddy Pool",
			"row.title": "WorkBuddy 积分池",
			"row.desc": "Route every WorkBuddy sign-in on this machine into DSH as one auto-failing-over model pool.",
			"row.expand": "Expand",
			"row.collapse": "Collapse",
			"row.requestFailed": "Request failed",
			"row.poolEmpty": "No WorkBuddy account discovered yet.",
			"row.poolEmptyHint": "Sign in to one or more WorkBuddy accounts in the WorkBuddy desktop app, then click “Detect accounts again”. Each sign-in is picked up automatically as a pool member.",
			"row.regionEmpty": "No account signed in for this region yet.",
			"row.regionEmptyHint": "Sign in to a WorkBuddy account for this region in the desktop app, then choose “Detect accounts again”. Domestic and international accounts can be signed in side by side.",
			"row.regionEmptyTitle": "No {region} account is signed in yet.",
			"row.regionHowToTitle": "How to sign in to the {region} version",
			"row.regionHowTo1": "Download and install the {region} client: the international build is named WorkBuddy AI while the domestic one is WorkBuddy, and they are different apps. The web version at https://www.workbuddy.ai/ also works.",
			"row.regionHowTo2": "Pick a sign-in method: email sign-up / sign-in (most common), OAuth with Google, GitHub or X, or WeChat QR scan on some builds.",
			"row.regionHowTo3": "Make sure this machine can reach overseas sites when signing in: the international version targets users outside mainland China and may fail to load behind a restricted network.",
			"row.regionHowTo4": "Back here, press the re-detect button. Every sign-in the client has left on this machine is absorbed into its own region - the two sides stay separate and can run at the same time.",
			"row.regionHowToNote": "The two versions keep separate accounts, credits and data: a domestic account cannot sign in to the international one, and vice versa, so each needs its own registration. This plugin only reads the sign-ins the client has already performed.",
			"row.shimStopped": "Provider loopback is not running.",
			"row.shimRunning": "Provider listening on loopback",
			"row.accountsTitle": "Accounts in the pool",
			"row.tabCn": "国内版",
			"row.tabGlobal": "国际版",
			"row.tabHint": "每个 tab 是一个独立供应商，各有自己的账号、积分与模型；两边同时生效，一侧的改动不影响另一侧。",
			"row.accountsSummary": "{count} account(s) · {cooling} cooling",
			"row.ok": "Healthy — requests auto-rotate across accounts",
			"row.allCooling": "Every account is rate-limited right now; requests pause until a cooldown lifts.",
			"row.accountInRotation": "Enabled",
			"row.accountOff": "Disabled",
			"row.accountToggleHint": "Enable this account (uncheck to keep it out of the pool)",
			"row.accountToggleError": "Could not switch the account: {message}",
			"row.accountIgnore": "Remove",
			"row.accountIgnoreHint": "Remove this account from the pool for good — its credential stops being read and it will not come back",
			"row.accountIgnoreError": "Could not change the ignore list: {message}",
			"row.ignoredTitle": "Removed accounts",
			"row.ignoredSummary": "{count} account(s) no longer in the pool",
			"row.ignoredRestore": "Restore",
			"row.ignoredRestoreHint": "Put this account back into the pool",
			"row.currentAccount": "In use now",
			"row.currentAccountDisabled": "switched off — the next request moves on",
			"row.cooling": "Cooling (rate-limited)",
			"row.cooldownHits": "{hits} hit(s)",
			"row.cooldownUntil": "until {time}",
			"row.modelCooling": "{model} cooling until {time}",
			"row.tokenExpiry": "token {time}",
			"row.creditsTotal": "Total",
			"row.creditsPackages": "Credit packages",
			"row.creditsPackage": "{remain} / {size}",
			"row.creditsError": "credits unavailable",
			"row.credentialDead": "Sign-in rejected",
			"row.credentialDeadTag": "Sign-in rejected",
			"row.credentialDeadHint": "The upstream no longer accepts this sign-in. Sign in again in the WorkBuddy desktop app to restore it.",
			"row.creditsSoon": "Expiring in 3 days",
			"row.creditsExpiresAt": "Expires {time}",
			"row.creditsExpiresSoonTitle": "Expiring within 3 days",
			"row.creditsRefreshAt": "Refreshes {time}",
			"row.checkinTitle": "Daily check-in",
			"row.checkinClaim": "Check in",
			"row.checkinClaiming": "Checking in…",
			"row.checkinClaimed": "Checked in today",
			"row.checkinInactive": "Check-in not available for this account",
			"row.checkinStreak": "{days}-day streak",
			"row.checkinDaily": "+{credit} credits/day",
			"row.checkinStreakBonus": "day {days} bonus +{credit}",
			"row.checkinClaimedReward": "Claimed +{credit} credits",
			"row.checkinError": "Check-in failed: {message}",
			"row.checkinUnavailable": "check-in unavailable",
			"row.checkinAllHint": "Collect every account’s daily reward here — no need to switch accounts first.",
			"row.modelsTitle": "Models",
			"row.modelsSummary": "{count} model(s) in the live catalog",
			"row.modelsHint": "Read from the live WorkBuddy catalog. Free tiers are marked.",
			"row.modelEnabled": "Enabled",
			"row.modelImage": "Image input",
			"row.modelContextBudget": "Context window",
			"row.modelContextNative": "{size} (max)",
			"row.modelContextCapped": "{size}",
			"row.modelOutput": "Output {size}",
			"row.modelReasoning": "Thinking: {efforts}",
			"row.modelsEnabledCount": "{enabled} / {total} enabled",
			"row.modelsFallbackHint": "built-in roster: the gateway list could not be read",
			"row.modelsSave": "Save",
			"row.modelsSaving": "Saving…",
			"row.modelsDiscard": "Discard",
			"row.modelsSaved": "Model selection saved",
			"row.modelsSaveError": "Could not save: {message}",
			"row.modelsEmpty": "No model enabled — enable at least one before saving.",
			"row.catalogOffline": "built-in list (offline)",
			"row.catalogRefresh": "Refresh models",
			"row.catalogRefreshing": "Fetching…",
			"row.catalogRefreshHint": "Fetch the model list again from WorkBuddy",
			"row.catalogRefreshed": "Model list updated ({count} models)",
			"row.catalogRefreshOffline": "Still offline — kept the built-in list",
			"row.free": "free",
			"row.limitedFree": "limited free",
			"row.nightDiscount": "night",
			"row.nightFreeNow": "free until {time}",
			"row.nightFreeLater": "free from {time}",
			"row.promoUntil": "promo to {date}",
			"row.paidTwin": "paid twin {id} ({rate}x)",
			"row.paidTwinHint": "The free tier is rate-limited first; this same model has a paid row that keeps working",
			"row.rateLimitedPaidTwin": "Tip: {id} is the same model on a paid row ({rate}x credits) and is limited separately — switch to it to keep going",
			"row.skippedFiles": "{count} credential file(s) could not be read",
			"row.skippedEncrypted": "encrypted — start WorkBuddy once so its key can be read",
			"row.skippedUnreadable": "file could not be read",
			"row.skippedMalformed": "not a credential file",
			"row.skippedExpired": "sign-in expired — sign in again",
			"row.imageCapable": "image input",
			"row.rate": "{rate}x credits",
			"row.accountsRescan": "Detect accounts again",
			"row.accountsScanning": "Detecting…",
			"row.distTitle": "Account usage",
			"row.distPriority": "Priority",
			"row.distPriorityHint": "Use one account until it runs out, then move to the next",
			"row.distRoundRobin": "Round-robin",
			"row.distRoundRobinHint": "Take turns in order, spreading the spend evenly",
			"row.distBalanced": "Balanced",
			"row.distBalancedHint": "Draw at random, favouring the account idle longest",
			"row.distSticky": "Per conversation",
			"row.distStickyHint": "One account per chat, new chats take the next account — keeps the prompt cache warm",
			"row.distExpiry": "Expiring first",
			"row.distExpiryHint": "Spend the account whose credit packs expire soonest — use them before they are lost",
			"row.distRecommended": "Recommended",
			"row.resetCooldowns": "Clear all cooldowns",
			"row.resetCooldownsBusy": "Clearing…",
			"row.resetCooldownsDone": "Cooldowns cleared",
			"row.accountsRescanned": "Detected {count} account(s)",
			"row.error": "Pool status unavailable: {message}",
			"row.autoTitle": "Automation",
			"row.autoOn": "On",
			"row.autoOff": "Off",
			"row.autoBusy": "Saving…",
			"row.autoHintOn": "Checks in, reports activity, claims task and streak rewards, and runs the buddy trip — every day.",
			"row.autoHintOff": "Off: no background requests are made for you.",
			"row.autoJob_report": "Activity report",
			"row.autoJob_tasks": "Task rewards",
			"row.autoJob_checkin": "Daily check-in",
			"row.autoJob_streak": "Streak bonus",
			"row.autoJob_travel": "Buddy trip",
			"row.autoHourNone": "skipped today",
			"row.autoNever": "not run yet",
			"row.autoRun": "Run now",
			"row.autoRunning": "Running…",
			"row.autoRan": "Done: {count} account(s) ok, {failed} failed",
			"row.autoRanTasks": "Done: {claimed} task(s) claimed, +{credit} credits, +{energy} energy",
			"row.reserveTitle": "Keep at least",
			"row.reserveUnit": "credits",
			"row.reserveSaving": "Saving…",
			"row.reserveSave": "Save",
			"row.reserveHolding": "Reserved: skipped",
			"row.reserveSaved": "Keeping {credits} credits",
			"row.reserveCleared": "Reserve cleared",
			"row.reserveFailed": "Not saved — try again",
			"row.autoToday": "Today",
			"row.autoEarned": "Automation today",
			"row.autoEnergy": "energy",
			"row.autoTasksClaimed": "{count} task(s)",
			"row.autoRunAll": "Run now",
			"row.autoRunDone": "Automation pass finished",
			"row.autoRunTimeout": "Still running; check back in a moment",
			"row.autoAlreadyRunning": "A run is already in progress",
			"row.autoRanAll": "Ran {jobs} job(s), {ok} ok, {failed} failed",
			"row.autoFromTasks": "Tasks +{credit} credits · +{energy} energy · {count} task(s)",
			"row.autoFromCheckin": "Check-in +{credit} credits",
			"row.autoFromBonus": "Streak bonus +{credit} credits",
			"row.autoFromTravel": "Buddy travel +{credit} credits",
			"chip.tabLabel": "WorkBuddy 积分池",
			"chip.kicker": "Plugin",
			"chip.dialogTitle": "WorkBuddy 积分池",
			"chip.close": "Close",
			"chip.dialogIntro": "One bundle, two plugins: the WorkBuddy credit pool that routes every sign-in on this machine into DSH, and dsh-purge for prompt-layer inspection. Updates come straight from the GitHub repository — no reinstall, no re-pasting a link.",
			"chip.includesLabel": "What this bundle ships",
			"chip.versionLoading": "Reading the installed version…",
			"chip.versionUnknown": "The installed version could not be read.",
			"chip.versionLine": "Installed {version} · {kind}",
			"chip.installKindRepo": "checkout install",
			"chip.installKindSnapshot": "link install",
			"chip.checkButton": "Check for updates",
			"chip.applyButton": "Update now",
			"chip.checking": "Asking GitHub…",
			"chip.checkFailed": "Could not check: {message}",
			"chip.upToDate": "Already the newest version ({version}).",
			"chip.newVersion": "{current} → {latest} available.",
			"chip.applying": "Downloading and replacing files…",
			"chip.applyFailed": "Update failed: {message}",
			"chip.appliedRestart": "Updated {from} → {to} ({how}). Restart DSH to load it.",
			"chip.appliedNoChange": "Already at {version}; nothing was changed.",
			"chip.modeGit": "fast-forwarded the checkout",
			"chip.modeOverlay": "replaced the files",
			"chip.requestFailed": "the request did not complete"
		};
		const zh = {
			"row.navLabel": "WorkBuddy Pool",
			"row.title": "WorkBuddy 积分池",
			"row.desc": "把本机所有已登录的 WorkBuddy 账号并入 DSH，作为一个自动容错的模型池使用。",
			"row.expand": "展开",
			"row.collapse": "收起",
			"row.requestFailed": "请求失败",
			"row.poolEmpty": "还没有发现任何 WorkBuddy 账号。",
			"row.poolEmptyHint": "先在 WorkBuddy 桌面 App 里登录一个或多个 WorkBuddy 账号，再点“重新检测账号”。每次登录都会被自动纳入池中。",
			"row.regionEmpty": "这边还没有登录账号。",
			"row.regionEmptyHint": "在 WorkBuddy 桌面 App 里登录一个该区域的账号，再点「重新检测账号」。国内版与国际版可以同时登录，两边各自独立。",
			"row.regionEmptyTitle": "这边还没有登录{region}账号。",
			"row.regionHowToTitle": "{region}怎么登录",
			"row.regionHowTo1": "下载并安装{region}客户端：国际版安装包名称是「WorkBuddy AI」，国内版是「WorkBuddy」，两者是不同的应用。也可以直接用网页版 https://www.workbuddy.ai/ 登录。",
			"row.regionHowTo2": "登录方式（任选其一）：① 邮箱注册/登录（最常用）；② 用 Google、GitHub、X 等海外账号授权登录；③ 部分版本支持微信扫码。",
			"row.regionHowTo3": "登录时请确保能正常访问海外站点（国际版面向海外用户，网络受限时可能打不开或登录失败）。",
			"row.regionHowTo4": "回到这里点「重新检测账号」。App 在本机留下的每次登录都会被自动吸收到各自区域 —— 两边互相独立，可以同时使用。",
			"row.regionHowToNote": "国内版与国际版的账号、积分、数据体系完全隔离，互不相通：国内版账号无法登录国际版，反之亦然，需要各自单独注册。本插件只读取客户端已完成的登录，不会代替你登录。",
			"row.shimStopped": "回环提供端未运行。",
			"row.shimRunning": "提供端正在回环地址监听",
			"row.accountsTitle": "池中账号",
			"row.tabCn": "国内版",
			"row.tabGlobal": "国际版",
			"row.tabHint": "每个 tab 是一个独立供应商，各有自己的账号、积分与模型；两边同时生效，一侧的改动不影响另一侧。",
			"row.accountsSummary": "{count} 个账号 · {cooling} 个冷却中",
			"row.ok": "运行健康 —— 请求会在各账号间自动轮换",
			"row.allCooling": "当前所有账号都处于限流冷却，请求会暂停直到某个冷却结束。",
			"row.accountInRotation": "已启用",
			"row.accountOff": "已停用",
			"row.accountToggleHint": "启用该账号（取消勾选则不参与池子）",
			"row.accountToggleError": "切换账号失败：{message}",
			"row.accountIgnore": "移出池子",
			"row.accountIgnoreHint": "把这个账号永久移出池子 —— 不再读取它的凭据，即使重新登录也不会回来",
			"row.accountIgnoreError": "修改忽略列表失败：{message}",
			"row.ignoredTitle": "已移出的账号",
			"row.ignoredSummary": "{count} 个账号已不在池中",
			"row.ignoredRestore": "恢复",
			"row.ignoredRestoreHint": "把这个账号放回池子",
			"row.currentAccount": "当前使用",
			"row.currentAccountDisabled": "已停用 —— 下次请求会换号",
			"row.cooling": "冷却中（被限流）",
			"row.cooldownHits": "触发 {hits} 次",
			"row.cooldownUntil": "至 {time}",
			"row.modelCooling": "{model} 冷却至 {time}",
			"row.tokenExpiry": "令牌 {time}",
			"row.creditsTotal": "合计",
			"row.creditsPackages": "积分包",
			"row.creditsPackage": "{remain} / {size}",
			"row.creditsError": "积分不可用",
			"row.credentialDead": "登录已被拒绝",
			"row.credentialDeadTag": "登录已被拒绝",
			"row.credentialDeadHint": "上游已不再接受这个登录状态。请在 WorkBuddy 桌面端重新登录该账号以恢复。",
			"row.creditsSoon": "3 天内到期",
			"row.creditsExpiresAt": "到期 {time}",
			"row.creditsExpiresSoonTitle": "3 天内到期",
			"row.creditsRefreshAt": "刷新 {time}",
			"row.checkinTitle": "每日签到",
			"row.checkinClaim": "签到",
			"row.checkinClaiming": "签到中…",
			"row.checkinClaimed": "今日已签到",
			"row.checkinInactive": "该账号当前无签到活动",
			"row.checkinStreak": "连签 {days} 天",
			"row.checkinDaily": "每日 +{credit} 积分",
			"row.checkinStreakBonus": "第 {days} 天额外 +{credit}",
			"row.checkinClaimedReward": "已领取 +{credit} 积分",
			"row.checkinError": "签到失败：{message}",
			"row.checkinUnavailable": "签到不可用",
			"row.checkinAllHint": "这里可以为每个账号分别领取每日签到奖励，无需先切换账号。",
			"row.modelsTitle": "模型",
			"row.modelsSummary": "实时目录中 {count} 个模型",
			"row.modelsHint": "读取自 WorkBuddy 实时目录；免费档位已标注。",
			"row.modelEnabled": "启用",
			"row.modelImage": "图片输入",
			"row.modelContextBudget": "上下文窗口",
			"row.modelContextNative": "{size}（最大）",
			"row.modelContextCapped": "{size}",
			"row.modelOutput": "输出 {size}",
			"row.modelReasoning": "思考档位：{efforts}",
			"row.modelsEnabledCount": "已启用 {enabled} / {total}",
			"row.modelsFallbackHint": "内置列表：没读到网关模型表",
			"row.modelsSave": "保存",
			"row.modelsSaving": "保存中…",
			"row.modelsDiscard": "放弃修改",
			"row.modelsSaved": "模型选择已保存",
			"row.modelsSaveError": "保存失败：{message}",
			"row.modelsEmpty": "至少要启用一个模型才能保存。",
			"row.catalogOffline": "内置列表（离线）",
			"row.catalogRefresh": "重新获取模型",
			"row.catalogRefreshing": "获取中…",
			"row.catalogRefreshHint": "重新从 WorkBuddy 拉取模型列表",
			"row.catalogRefreshed": "模型列表已更新（{count} 个模型）",
			"row.catalogRefreshOffline": "仍然离线，继续使用内置列表",
			"row.free": "免费",
			"row.limitedFree": "限量免费",
			"row.nightDiscount": "夜间",
			"row.nightFreeNow": "免费至 {time}",
			"row.nightFreeLater": "{time} 起免费",
			"row.promoUntil": "活动至 {date}",
			"row.paidTwin": "付费同款 {id}（{rate}x）",
			"row.paidTwinHint": "免费档先被限流；同一个模型的付费行不受这个限制影响",
			"row.rateLimitedPaidTwin": "提示：{id} 是同一个模型的付费行（{rate}x 积分），限流是分开算的 —— 切过去就能继续用",
			"row.skippedFiles": "有 {count} 个凭据文件读不出来",
			"row.skippedEncrypted": "已加密 —— 启动一次 WorkBuddy 才能取到密钥",
			"row.skippedUnreadable": "文件读不出来",
			"row.skippedMalformed": "不是凭据文件",
			"row.skippedExpired": "登录已过期 —— 重新登录一次",
			"row.imageCapable": "图片输入",
			"row.rate": "{rate}x 积分",
			"row.accountsRescan": "重新检测账号",
			"row.accountsScanning": "正在检测…",
			"row.distTitle": "账号使用方式",
			"row.distPriority": "优先模式",
			"row.distPriorityHint": "先用完一个账号，用完再换下一个",
			"row.distRoundRobin": "轮换模式",
			"row.distRoundRobinHint": "按顺序轮流使用，积分均匀分摊",
			"row.distBalanced": "均衡模式",
			"row.distBalancedHint": "随机抽取，闲置越久的账号被选中概率越高",
			"row.distSticky": "每对话固定",
			"row.distStickyHint": "一个对话只用一个账号，新对话自动换下一个账号——保住上游缓存，命中率和速度都更好",
			"row.distExpiry": "先花快到期的",
			"row.distExpiryHint": "优先使用积分包最快过期的账号——把要过期的积分花掉，别浪费",
			"row.distRecommended": "推荐",
			"row.resetCooldowns": "清除所有冷却",
			"row.resetCooldownsBusy": "正在清除…",
			"row.resetCooldownsDone": "冷却已清除",
			"row.accountsRescanned": "检测到 {count} 个账号",
			"row.error": "池状态不可用：{message}",
			"row.autoTitle": "积分自动化",
			"row.autoOn": "已开启",
			"row.autoOff": "已关闭",
			"row.autoBusy": "保存中…",
			"row.autoHintOn": "每天自动签到、上报活跃、领取任务奖励与连登奖励，并照看猫猫旅行。",
			"row.autoHintOff": "已关闭：不会替你发起任何后台请求。",
			"row.autoJob_report": "活跃上报",
			"row.autoJob_tasks": "任务奖励",
			"row.autoJob_checkin": "每日签到",
			"row.autoJob_streak": "连登奖励",
			"row.autoJob_travel": "猫猫旅行",
			"row.autoHourNone": "当天不跑",
			"row.autoNever": "还没跑过",
			"row.autoRun": "立即运行",
			"row.autoRunning": "运行中…",
			"row.autoRan": "完成：{count} 个账号正常，{failed} 个失败",
			"row.autoRanTasks": "完成：领取 {claimed} 个任务，+{credit} 积分，+{energy} 能量",
			"row.reserveTitle": "保留积分",
			"row.reserveUnit": "积分",
			"row.reserveSaving": "保存中…",
			"row.reserveSave": "保存",
			"row.reserveHolding": "已保留·暂停使用",
			"row.reserveSaved": "已保留 {credits} 积分",
			"row.reserveCleared": "已取消保留",
			"row.reserveFailed": "保存失败，请重试",
			"row.autoToday": "今日自动化",
			"row.autoEarned": "今日自动化获得",
			"row.autoEnergy": "能量",
			"row.autoTasksClaimed": "{count} 个任务",
			"row.autoRunAll": "立即运行",
			"row.autoRunDone": "自动化已执行完成",
			"row.autoRunTimeout": "仍在执行中，稍后查看结果",
			"row.autoAlreadyRunning": "已有一次执行正在进行",
			"row.autoRanAll": "已运行 {jobs} 项，{ok} 个正常，{failed} 个失败",
			"row.autoFromTasks": "任务 +{credit} 积分 · +{energy} 能量 · {count} 个",
			"row.autoFromCheckin": "签到 +{credit} 积分",
			"row.autoFromBonus": "连登奖励 +{credit} 积分",
			"row.autoFromTravel": "猫猫旅行 +{credit} 积分",
			"chip.tabLabel": "WorkBuddy 积分池",
			"chip.kicker": "插件",
			"chip.dialogTitle": "WorkBuddy 积分池",
			"chip.close": "关闭",
			"chip.dialogIntro": "一个包、两份能力：把本机每个 WorkBuddy 登录都接进 DSH 的积分池，以及用于提示词层检视的 dsh-purge。更新直接从 GitHub 仓库取，不用卸载重装，也不用重新粘链接。",
			"chip.includesLabel": "包含的插件",
			"chip.versionLoading": "正在读取已装版本…",
			"chip.versionUnknown": "读不出已装版本。",
			"chip.versionLine": "已装 {version} · {kind}",
			"chip.installKindRepo": "仓库安装",
			"chip.installKindSnapshot": "链接安装",
			"chip.checkButton": "检查更新",
			"chip.applyButton": "立即更新",
			"chip.checking": "正在询问 GitHub…",
			"chip.checkFailed": "检查失败：{message}",
			"chip.upToDate": "已是最新版本（{version}）。",
			"chip.newVersion": "发现新版本 {current} → {latest}。",
			"chip.applying": "正在下载并替换文件…",
			"chip.applyFailed": "更新失败：{message}",
			"chip.appliedRestart": "已更新 {from} → {to}（{how}）。重启 DSH 后生效。",
			"chip.appliedNoChange": "已经是 {version}，没有改动任何文件。",
			"chip.modeGit": "快进了仓库",
			"chip.modeOverlay": "替换了文件",
			"chip.requestFailed": "请求没有完成"
		};
		//#endregion
		//#region src/client/chip-styles.ts
		/**
		* Styles for the conversation-tab chip and its dialog.
		*
		* Kept in its own module (rather than appended to `styles.ts`) because the
		* settings card and this chip live in different DOM neighbourhoods: the card's
		* stylesheet is scoped under `.dsm-workbuddy-xdpool-page`, while the chip is
		* injected into the host's tab list and the dialog into `document.body`. Mixing
		* them would put host-row rules inside a container they never match.
		*
		* ## Copying the host, on purpose
		*
		* The chip must look like a native tab, so it reproduces the host's own metrics
		* — 13px/16px at weight 500, `padding: 0 0 9px`, tertiary label colour, a 2px
		* underline on the active state — read off
		* `dsh-client-ui-conversation/lib/client.js` (`Dc7zOa_tabs` / `Dc7zOa_tab`).
		* The row sets `gap: 36px`, so no horizontal padding or margin is added here;
		* adding any would visibly break the rhythm of the strip.
		*
		* ## Theme
		*
		* DSH adds `data-ds-dark-theme` to `<body>` for dark and reports light by
		* absence, so light is the base and dark overrides the same tokens. Never
		* `prefers-color-scheme`: DSH lets the user pin a theme independently of the OS,
		* and following the OS here is what made an earlier panel flash light on a dark
		* host.
		*
		* @module dsh-workbuddy-xdpool/client/chip-styles
		*/
		const POOL_CHIP_CSS = `
/*
 * ── Tab chip ─────────────────────────────────────────────────────────────
 * Lives inside the host's role="tablist" row, sized to match its siblings.
 */
.wbxc-chip{
  display:inline-flex;
  align-items:flex-end;
  flex:0 0 auto;
  /* The host row uses gap:36px between tabs; this keeps the chip inside it. */
  margin:0;
}
.wbxc-chip-btn{
  appearance:none;
  position:relative;
  background:transparent;
  border:none;
  cursor:pointer;
  padding:0 0 9px;
  font-size:13px;
  font-weight:500;
  line-height:16px;
  white-space:nowrap;
  color:var(--dsw-alias-label-tertiary,#81858c);
  /* Some host toolbars zero out font-size or make text transparent; both are
     fought here so the label stays readable whatever the strip inherits. */
  -webkit-text-fill-color:currentColor;
  transition:color .14s ease;
}
.wbxc-chip-btn:hover{color:var(--dsw-alias-label-primary,#0f1115)}
.wbxc-chip-btn:focus-visible{
  outline:2px solid var(--dsw-alias-state-business-primary,#5686fe);
  outline-offset:2px;
  border-radius:4px;
}

/*
 * ── Dialog ───────────────────────────────────────────────────────────────
 * Rendered into document.body, so it cannot inherit anything from the card.
 * Every token is therefore re-declared here.
 */
.wbxc-modal{
  --wbxc-label:var(--dsw-alias-label-primary,#0f1115);
  --wbxc-text-2:var(--dsw-alias-label-secondary,#61666b);
  --wbxc-text-3:var(--dsw-alias-label-tertiary,#81858c);
  --wbxc-border:var(--dsw-alias-border-l2,#0000001a);
  --wbxc-plane:var(--dsw-alias-bg-layer-1,#fff);
  --wbxc-sunk:color-mix(in oklab, var(--wbxc-label) 4%, var(--wbxc-plane));
  --wbxc-accent:var(--dsw-alias-state-business-primary,#5686fe);
  --wbxc-ok:color-mix(in oklab, var(--dsw-alias-state-success-primary,#22c55e), var(--wbxc-label) 40%);
  --wbxc-err:color-mix(in oklab, var(--dsw-alias-state-error-primary,#ec1313), var(--wbxc-label) 24%);
  position:fixed;
  inset:0;
  z-index:2147483000;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  box-sizing:border-box;
}
.wbxc-scrim{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.34);
  backdrop-filter:blur(2px);
}
.wbxc-card{
  position:relative;
  width:min(460px,100%);
  max-height:calc(100vh - 48px);
  overflow:auto;
  box-sizing:border-box;
  border-radius:16px;
  border:1px solid var(--wbxc-border);
  background:var(--wbxc-plane);
  color:var(--wbxc-label);
  box-shadow:0 1px 2px rgba(0,0,0,.06), 0 18px 48px -12px rgba(0,0,0,.28);
  padding:20px 20px 18px;
  display:flex;
  flex-direction:column;
  gap:12px;
}
.wbxc-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
}
.wbxc-heading{display:flex;flex-direction:column;gap:5px;min-width:0}
.wbxc-kicker{
  margin:0;
  font-size:10px;
  font-weight:600;
  letter-spacing:.09em;
  text-transform:uppercase;
  color:var(--wbxc-text-3);
}
.wbxc-title{
  margin:0;
  font-size:17px;
  font-weight:600;
  line-height:1.25;
  letter-spacing:-.01em;
}
.wbxc-close{
  appearance:none;
  flex:none;
  width:26px;
  height:26px;
  border-radius:7px;
  border:1px solid transparent;
  background:transparent;
  color:var(--wbxc-text-3);
  cursor:pointer;
  font-size:13px;
  line-height:1;
  display:inline-flex;
  align-items:center;
  justify-content:center;
}
.wbxc-close:hover{background:var(--wbxc-sunk);color:var(--wbxc-label);border-color:var(--wbxc-border)}
.wbxc-version{
  margin:0;
  font-size:12px;
  color:var(--wbxc-text-2);
  font-variant-numeric:tabular-nums;
}
.wbxc-intro{
  margin:0;
  font-size:12.5px;
  line-height:1.6;
  color:var(--wbxc-text-2);
}
.wbxc-sublabel{
  margin:4px 0 0;
  font-size:10px;
  font-weight:600;
  letter-spacing:.09em;
  text-transform:uppercase;
  color:var(--wbxc-text-3);
}
.wbxc-includes{
  margin:0;
  padding:0;
  list-style:none;
  display:flex;
  flex-direction:column;
  gap:0;
  border-top:1px solid var(--wbxc-border);
}
.wbxc-includes li{
  padding:7px 0;
  font-size:12.5px;
  border-bottom:1px solid var(--wbxc-border);
  color:var(--wbxc-label);
}
.wbxc-status{
  margin:0;
  min-height:18px;
  font-size:12px;
  line-height:1.55;
  color:var(--wbxc-text-2);
  word-break:break-word;
}
.wbxc-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:2px}
.wbxc-btn{
  appearance:none;
  border-radius:8px;
  border:1px solid var(--wbxc-border);
  background:var(--wbxc-plane);
  color:var(--wbxc-label);
  cursor:pointer;
  font-size:12.5px;
  font-weight:500;
  padding:7px 14px;
  transition:background .14s ease,border-color .14s ease;
}
.wbxc-btn:hover:not(:disabled){background:var(--wbxc-sunk)}
.wbxc-btn:disabled{opacity:.45;cursor:default}
.wbxc-btn-primary{
  background:var(--wbxc-label);
  border-color:var(--wbxc-label);
  color:var(--wbxc-plane);
}
.wbxc-btn-primary:hover:not(:disabled){
  background:color-mix(in oklab, var(--wbxc-label) 82%, var(--wbxc-plane));
}
.wbxc-btn:focus-visible{
  outline:2px solid var(--wbxc-accent);
  outline-offset:2px;
}

/*
 * ── Dark ─────────────────────────────────────────────────────────────────
 * DSH marks dark with the attribute, never with a media query.
 */
body[data-ds-dark-theme] .wbxc-chip-btn{
  color:var(--dsw-alias-label-tertiary,#81858c);
}
body[data-ds-dark-theme] .wbxc-chip-btn:hover{
  color:var(--dsw-alias-label-primary,#f9fafb);
}
body[data-ds-dark-theme] .wbxc-modal{
  --wbxc-label:var(--dsw-alias-label-primary,#f9fafb);
  --wbxc-text-2:var(--dsw-alias-label-secondary,#b6bac0);
  --wbxc-text-3:var(--dsw-alias-label-tertiary,#8d9199);
  --wbxc-border:var(--dsw-alias-border-l2,#ffffff1f);
  --wbxc-plane:var(--dsw-alias-bg-layer-2,#2c2c2e);
  --wbxc-sunk:color-mix(in oklab, var(--wbxc-label) 8%, var(--wbxc-plane));
}
body[data-ds-dark-theme] .wbxc-card{
  box-shadow:0 1px 2px rgba(0,0,0,.4), 0 18px 48px -12px rgba(0,0,0,.7);
}
body[data-ds-dark-theme] .wbxc-btn-primary{
  color:var(--dsw-alias-bg-base,#1a1a1b);
}
`.trim();
		//#endregion
		//#region src/client/UpdateChip.tsx
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
		* ## Why there is NO MutationObserver here (1.9.12)
		*
		* 1.9.11 watched `document.body` with `{childList: true, subtree: true}` and
		* re-placed the chip on every mutation. That is a self-feeding loop, and it
		* shipped a freeze:
		*
		*   1. Placing the chip is itself a childList mutation, so the observer callback
		*      re-triggers the placement code.
		*   2. The host re-renders the tab row on every streaming token, so `last` is a
		*      fresh element on the next pass and the chip is moved AGAIN.
		*   3. DSH streams output continuously, so mutations never stop — and neither
		*      does the placement work. The renderer's main thread is saturated: the
		*      window keeps repainting what it already drew, but click handlers never
		*      run. The only thing still alive is the OS title bar, so the app looks
		*      completely frozen and closing it is the only way out.
		*
		* Throttling that callback does NOT fix it — a throttle only caps the loop's
		* rate, and any host that re-renders between passes keeps it looping forever.
		*
		* So the observer is gone. Placement is driven by a plain interval, and every
		* pass starts with an O(1) gate: the work happens only when the row element is
		* a different node than last time, or the chip was detached by the host. In the
		* steady state a pass is one `isConnected` read and nothing else, and — because
		* the gate is on identity rather than on mutation events — the placement can
		* never feed itself.
		*
		* @module dsh-workbuddy-xdpool/client/UpdateChip
		*/
		/** Marker attribute on the row we inject, so duplicate mounts are impossible. */
		const CHIP_MARKER = "data-dsh-xdpool-chip";
		/** Marker on the dialog host element. */
		const DIALOG_MARKER = "data-dsh-xdpool-dialog";
		/**
		* Selectors for the conversation tab row, most specific first.
		*
		* `[data-conversation-tabs]` is the attribute the host's conversation package
		* puts on the `role="tablist"` container (see
		* `dsh-client-ui-conversation/lib/client.js`); the rest are fallbacks in case a
		* host line renames or drops that attribute.
		*/
		const TAB_ROW_SELECTORS = [
			"[data-conversation-tabs]",
			"[data-conversation-tabrow]",
			"[role='tablist'][aria-label*='对话'], [role='tablist'][aria-label*='Conversation' i]",
			"[class*='conversation' i][class*='tab' i][class*='row' i]"
		];
		/** How long the row may stay missing before a one-time diagnostic is logged. */
		const MISS_WARN_AFTER_MS = 2e4;
		/** Fallback re-scan period, in ms. */
		const RESCAN_INTERVAL_MS = 1e3;
		/** Inject the chip stylesheet once per document. */
		function injectChipCss() {
			if (typeof document === "undefined") return;
			const cssId = "dsh-workbuddy-xdpool/chip.css";
			const existing = document.querySelector(`style[data-plugin-css="${cssId}"]`);
			if (existing !== null) {
				existing.textContent = POOL_CHIP_CSS;
				return;
			}
			const styleTag = document.createElement("style");
			styleTag.dataset.plugin = "dsh-workbuddy-xdpool";
			styleTag.dataset.pluginCss = cssId;
			styleTag.textContent = POOL_CHIP_CSS;
			document.head.appendChild(styleTag);
		}
		/** First tab row present in the document, if any. */
		function findTabRow() {
			for (const selector of TAB_ROW_SELECTORS) {
				const found = document.querySelector(selector);
				if (found !== null) return found;
			}
		}
		/**
		* Place the chip immediately after the LAST native tab.
		*
		* Appending to the row would also work, but the host may render trailing
		* controls inside the same container; anchoring to the last `role="tab"` keeps
		* the chip in the tab strip regardless.
		*/
		function placeChip(row, chip) {
			const tabs = row.querySelectorAll(":scope > [role='tab']");
			const last = tabs[tabs.length - 1];
			if (last !== void 0) {
				if (chip.previousElementSibling !== last) last.after(chip);
				return;
			}
			if (chip.parentNode !== row) row.appendChild(chip);
		}
		/** JSON GET helper that never throws; returns `undefined` on any failure. */
		async function getJson(url, doFetch) {
			try {
				const response = await doFetch(url, { headers: { accept: "application/json" } });
				if (!response.ok) return void 0;
				return await response.json();
			} catch {
				return;
			}
		}
		/** JSON POST helper that never throws. */
		async function postJson(url, doFetch) {
			try {
				return await (await doFetch(url, {
					method: "POST",
					headers: {
						"content-type": "application/json",
						accept: "application/json"
					},
					body: "{}"
				})).json();
			} catch {
				return;
			}
		}
		/**
		* Build the dialog DOM. Returns the elements the caller updates later.
		*
		* Constructed once per open and discarded on close: the dialog holds live fetch
		* results, and reusing it would have to reset eight fields on every open.
		*/
		function buildDialog(t, close) {
			const root = document.createElement("div");
			root.setAttribute(DIALOG_MARKER, "");
			root.className = "wbxc-modal";
			const scrim = document.createElement("div");
			scrim.className = "wbxc-scrim";
			scrim.addEventListener("click", close);
			const card = document.createElement("div");
			card.className = "wbxc-card";
			card.setAttribute("role", "dialog");
			card.setAttribute("aria-modal", "true");
			const head = document.createElement("div");
			head.className = "wbxc-head";
			const heading = document.createElement("div");
			heading.className = "wbxc-heading";
			const kicker = document.createElement("p");
			kicker.className = "wbxc-kicker";
			kicker.textContent = t("chip.kicker");
			const title = document.createElement("h2");
			title.className = "wbxc-title";
			title.textContent = t("chip.dialogTitle");
			heading.append(kicker, title);
			const closeButton = document.createElement("button");
			closeButton.type = "button";
			closeButton.className = "wbxc-close";
			closeButton.setAttribute("aria-label", t("chip.close"));
			closeButton.textContent = "✕";
			closeButton.addEventListener("click", close);
			head.append(heading, closeButton);
			const version = document.createElement("p");
			version.className = "wbxc-version";
			version.textContent = t("chip.versionLoading");
			const intro = document.createElement("p");
			intro.className = "wbxc-intro";
			intro.textContent = t("chip.dialogIntro");
			const includesLabel = document.createElement("p");
			includesLabel.className = "wbxc-sublabel";
			includesLabel.textContent = t("chip.includesLabel");
			const includes = document.createElement("ul");
			includes.className = "wbxc-includes";
			const status = document.createElement("p");
			status.className = "wbxc-status";
			status.textContent = "";
			const actions = document.createElement("div");
			actions.className = "wbxc-actions";
			const checkButton = document.createElement("button");
			checkButton.type = "button";
			checkButton.className = "wbxc-btn";
			checkButton.textContent = t("chip.checkButton");
			const applyButton = document.createElement("button");
			applyButton.type = "button";
			applyButton.className = "wbxc-btn wbxc-btn-primary";
			applyButton.textContent = t("chip.applyButton");
			applyButton.disabled = true;
			actions.append(checkButton, applyButton);
			card.append(head, version, intro, includesLabel, includes, status, actions);
			root.append(scrim, card);
			return {
				root,
				version,
				includes,
				status,
				checkButton,
				applyButton
			};
		}
		/**
		* Mount the chip and return a disposer.
		*
		* Safe to call off the browser (returns a no-op): the node-side probe imports
		* the client entry for its types.
		*/
		function mountUpdateChip(options) {
			if (typeof document === "undefined") return () => void 0;
			injectChipCss();
			const doFetch = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
			const t = options.t;
			let disposed = false;
			let chip;
			let closeDialog;
			let mountedAt = Date.now();
			let warned = false;
			/**
			* The row node the chip was last placed in.
			*
			* This is the whole fix for the 1.9.11 freeze: placement is gated on node
			* IDENTITY, so a pass that changes nothing writes nothing. Nothing here can
			* re-enter itself, because no part of this file watches for mutations.
			*/
			let placedRow;
			/** Resolved once per page load; the install path does not change at runtime. */
			let about;
			const ensureChip = () => {
				if (disposed) return;
				const row = findTabRow();
				if (row === void 0) {
					placedRow = void 0;
					if (!warned && Date.now() - mountedAt > MISS_WARN_AFTER_MS) {
						warned = true;
						console.warn(`[dsh-workbuddy-xdpool] the conversation tab row could not be found, so the pool chip was not shown. selectors=${JSON.stringify(TAB_ROW_SELECTORS)}. This is cosmetic only — the provider and the Settings page still work. Please report this line so the selector can be updated.`);
					}
					return;
				}
				const tabs = row.querySelectorAll(":scope > [role='tab']");
				const last = tabs[tabs.length - 1];
				if (row === placedRow && chip !== void 0 && chip.isConnected && (last === void 0 ? chip.parentNode === row : chip.previousElementSibling === last)) return;
				if (chip === void 0) {
					chip = document.createElement("div");
					chip.className = "wbxc-chip";
					chip.setAttribute(CHIP_MARKER, "");
					const button = document.createElement("button");
					button.type = "button";
					button.className = "wbxc-chip-btn";
					button.textContent = t("chip.tabLabel");
					button.addEventListener("click", () => {
						openDialog();
					});
					chip.append(button);
				}
				placeChip(row, chip);
				placedRow = row;
			};
			const close = () => {
				closeDialog?.();
				closeDialog = void 0;
			};
			const openDialog = async () => {
				if (disposed) return;
				close();
				const elements = buildDialog(t, close);
				document.body.appendChild(elements.root);
				closeDialog = () => {
					elements.root.remove();
					document.removeEventListener("keydown", onKey);
				};
				const onKey = (event) => {
					if (event.key === "Escape") close();
				};
				document.addEventListener("keydown", onKey);
				const info = about ?? await getJson("/plugins/dsh-workbuddy-xdpool/about", doFetch);
				if (info !== void 0) {
					about = info;
					elements.version.textContent = t("chip.versionLine", {
						version: info.version,
						kind: info.installKind === "repo" ? t("chip.installKindRepo") : t("chip.installKindSnapshot")
					});
					elements.includes.replaceChildren(...info.includes.map((entry) => {
						const item = document.createElement("li");
						item.textContent = entry;
						return item;
					}));
				} else elements.version.textContent = t("chip.versionUnknown");
				let latest;
				const runCheck = async () => {
					elements.checkButton.disabled = true;
					elements.status.textContent = t("chip.checking");
					const result = await getJson(POOL_UPDATE_CHECK_PATH, doFetch);
					elements.checkButton.disabled = false;
					if (result === void 0) {
						elements.status.textContent = t("chip.checkFailed", { message: t("chip.requestFailed") });
						return;
					}
					if (!result.ok) {
						elements.status.textContent = t("chip.checkFailed", { message: result.error ?? t("chip.requestFailed") });
						return;
					}
					latest = result.latestVersion;
					if (result.upToDate === true) {
						elements.status.textContent = t("chip.upToDate", { version: result.currentVersion });
						elements.applyButton.disabled = true;
						return;
					}
					elements.status.textContent = t("chip.newVersion", {
						current: result.currentVersion,
						latest: result.latestVersion ?? ""
					});
					elements.applyButton.disabled = false;
				};
				elements.checkButton.addEventListener("click", () => {
					runCheck();
				});
				elements.applyButton.addEventListener("click", () => {
					(async () => {
						elements.applyButton.disabled = true;
						elements.checkButton.disabled = true;
						elements.status.textContent = t("chip.applying");
						const result = await postJson(POOL_UPDATE_APPLY_PATH, doFetch);
						elements.checkButton.disabled = false;
						if (result === void 0) {
							elements.status.textContent = t("chip.applyFailed", { message: t("chip.requestFailed") });
							return;
						}
						if (!result.ok) {
							elements.status.textContent = t("chip.applyFailed", { message: result.error ?? t("chip.requestFailed") });
							return;
						}
						if (result.restartRequired) {
							const how = result.mode === "git" ? t("chip.modeGit") : t("chip.modeOverlay");
							elements.status.textContent = t("chip.appliedRestart", {
								from: result.fromVersion,
								to: result.toVersion ?? latest ?? "",
								how
							});
						} else elements.status.textContent = t("chip.appliedNoChange", { version: result.toVersion ?? result.fromVersion });
					})();
				});
				runCheck();
			};
			ensureChip();
			const timer = setInterval(ensureChip, RESCAN_INTERVAL_MS);
			return () => {
				disposed = true;
				clearInterval(timer);
				close();
				chip?.remove();
				chip = void 0;
				placedRow = void 0;
				mountedAt = 0;
			};
		}
		//#endregion
		//#region src/client/index.tsx
		/** Stable browser-plugin name. */
		const name = "dsh-workbuddy-xdpool-client";
		/**
		* Client services required by the settings page.
		*
		* Deliberately only the two services present on BOTH host lines. The settings
		* surface differs by line — 0.1.5 provides `settingsScope`, 0.1.7 replaces it
		* with `configForms` — and cordis' dependency gate is hard: any inject entry the
		* running line does not provide keeps `apply` from ever running. Probing the one
		* that exists through `ctx.get()` (which returns undefined, never throws, for an
		* absent service) is what lets one build serve both lines.
		*/
		const inject = ["slots", "locale"];
		/** Settings namespace the host-side section registers (shared with the entry). */
		const WORKBUDDY_POOL_SETTINGS_NS = "workbuddy-xdpool";
		/**
		* Host plugin entry id this bundle is mounted under in `cordis.patch.yml`.
		*
		* `configForms` is addressed by this id on the 0.1.7 line.
		*/
		const WORKBUDDY_POOL_ENTRY_ID = "llm-workbuddy-xdpool";
		/** Register card copy and the pool page under Settings. */
		function apply(ctx) {
			try {
				const namespace = "settings.workbuddy-xdpool";
				ctx.effect(() => ctx.locale.register(namespace, {
					zh,
					en
				}), "dsh-workbuddy-xdpool: settings copy");
				const t = ctx.locale.bind(namespace);
				const softGet = (serviceName) => ctx.get(serviceName);
				const settingsScope = resolveSettingsScope(softGet);
				ctx.slots.inject("settings.section", () => ctx.slots.register({
					name: "settings.section",
					id: "workbuddy-xdpool",
					order: 440,
					label: () => t("row.navLabel"),
					inject: () => settingsScope === void 0 ? { t } : {
						t,
						settingsScope
					}
				}, PoolCard));
				installNavIcon(ctx, () => t("row.navLabel"));
				try {
					ctx.effect(() => mountUpdateChip({ t }), "dsh-workbuddy-xdpool: conversation tab chip");
				} catch (error) {
					console.error("[dsh-workbuddy-xdpool] the conversation tab chip could not be mounted:", error);
				}
			} catch (error) {
				console.error("[dsh-workbuddy-xdpool] client page failed to load (host provider unaffected):", error);
			}
		}
		/** Attribute carrying the nav-row marker this module installs. */
		const NAV_ICON_MARKER = "data-dsh-xdpool-nav-icon";
		/**
		* The settings nav rows, as the shell renders them. Scoped to the settings
		* dialog on purpose: the main sidebar has its own nav, and matching rows there
		* would stamp this glyph onto an unrelated control.
		*/
		const NAV_ROW_SELECTOR = "[role=\"dialog\"] nav button";
		/**
		* How many consecutive in-dialog passes may miss the nav row before the
		* diagnostic fires.
		*
		* Above 1 because a single miss is routine — the shell can re-render between
		* our mutation callback and the query. Small enough that a genuinely broken
		* selector is reported within a frame or two of opening the settings panel.
		*/
		const NAV_ICON_MISS_THRESHOLD = 3;
		/**
		* Draw this page's own glyph in its Settings nav row.
		*
		* The `settings.section` contract carries no icon: the shell decides the glyph
		* from the section id and falls back to a gear for anything it does not know.
		* So the row is matched by its LABEL (the same thunk passed to the
		* registration, re-read on every pass so a locale switch is followed) and
		* marked; CSS then hides the shell svg and masks this artwork into the row.
		*
		* Re-scanned on DOM mutations because the shell re-renders the nav on locale
		* and theme changes, which replaces the row elements and drops the marker.
		*
		* No-op off the browser (the node-side probe imports this module for types).
		*/
		function installNavIcon(ctx, resolveLabel) {
			if (typeof document === "undefined") return;
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-workbuddy-xdpool";
				tag.dataset.pluginCss = "dsh-workbuddy-xdpool/settings-nav-icon";
				tag.textContent = [
					`[${NAV_ICON_MARKER}] > svg { display: none; }`,
					`[${NAV_ICON_MARKER}]::before {`,
					"  content: '';",
					"  flex: none;",
					"  width: 16px;",
					"  height: 16px;",
					"  background-color: currentColor;",
					`  -webkit-mask-image: url("${POOL_NAV_ICON_MASK_URL}");`,
					`  mask-image: url("${POOL_NAV_ICON_MASK_URL}");`,
					"  -webkit-mask-repeat: no-repeat;",
					"  mask-repeat: no-repeat;",
					"  -webkit-mask-position: center;",
					"  mask-position: center;",
					"  -webkit-mask-size: 16px 16px;",
					"  mask-size: 16px 16px;",
					"}"
				].join("\n");
				document.head.appendChild(tag);
				let disposed = false;
				let scheduled = false;
				/**
				* The row element this icon was last applied to.
				*
				* Placement is gated on node IDENTITY (see the note on the poll below), so a
				* pass that changes nothing writes nothing and cannot re-enter itself.
				*/
				let appliedRow;
				/**
				* Consecutive passes that found no matching row.
				*
				* A miss is NORMAL most of the time: the settings dialog is closed, so its
				* nav is not in the DOM at all, and the icon stays unapplied by design.
				* Warning on the first miss would fire constantly and train everyone to
				* ignore it.
				*
				* What is worth reporting is a PERSISTENT miss while the dialog IS open —
				* that means the shell's nav markup changed and the selector no longer
				* matches, which is exactly the failure that looks like "nothing happened"
				* and cost hours to find. So the threshold is a burst of misses, and the
				* warning is emitted once per burst rather than once per mutation.
				*/
				let missStreak = 0;
				let warned = false;
				const sync = () => {
					scheduled = false;
					if (disposed) return;
					const wanted = String(resolveLabel() ?? "").trim();
					if (wanted === "") return;
					if (appliedRow !== void 0 && appliedRow.isConnected && appliedRow.hasAttribute(NAV_ICON_MARKER) && String(appliedRow.textContent ?? "").trim() === wanted) return;
					let matched = 0;
					let target;
					for (const row of document.querySelectorAll(NAV_ROW_SELECTOR)) if (String(row.textContent ?? "").trim() === wanted) {
						target = row;
						matched += 1;
						if (!row.hasAttribute(NAV_ICON_MARKER)) row.setAttribute(NAV_ICON_MARKER, "");
					} else if (row.hasAttribute(NAV_ICON_MARKER)) row.removeAttribute(NAV_ICON_MARKER);
					appliedRow = target;
					if (matched > 0) {
						missStreak = 0;
						warned = false;
						return;
					}
					if (document.querySelector(NAV_ROW_SELECTOR) === null) {
						missStreak = 0;
						return;
					}
					missStreak += 1;
					if (missStreak < NAV_ICON_MISS_THRESHOLD || warned) return;
					warned = true;
					const present = [...document.querySelectorAll(NAV_ROW_SELECTOR)].map((row) => String(row.textContent ?? "").trim()).filter((text) => text !== "");
					console.warn(`[dsh-workbuddy-xdpool] the settings nav row could not be found, so the icon was not applied. selector=${JSON.stringify(NAV_ROW_SELECTOR)} expectedLabel=${JSON.stringify(wanted)} rowsPresent=${JSON.stringify(present)}. This is cosmetic only — the card itself still works. Please report this line so the selector can be updated.`);
				};
				const schedule = () => {
					if (scheduled || disposed) return;
					scheduled = true;
					queueMicrotask(sync);
				};
				sync();
				const observer = new MutationObserver(schedule);
				observer.observe(document.body, {
					childList: true,
					subtree: true,
					characterData: true
				});
				return () => {
					disposed = true;
					observer.disconnect();
					for (const row of document.querySelectorAll(`[${NAV_ICON_MARKER}]`)) row.removeAttribute(NAV_ICON_MARKER);
					tag.remove();
				};
			}, "dsh-workbuddy-xdpool: settings nav icon");
		}
		/**
		* Bind the settings form the card reads and writes, on whichever line is
		* running.
		*
		* 0.1.7 exposes `configForms.get(entryId)`, keyed by the HOST plugin entry id —
		* the id this bundle registers under in `cordis.patch.yml`, not the settings
		* namespace. 0.1.5 exposes `settingsScope.bind({ namespace })`, keyed by the
		* namespace the host-side `installSection` registered. Both controllers answer
		* the same two methods the card uses (`getSnapshot()`, `set(field, value)`), so
		* the card needs no per-line branch of its own.
		*
		* Returns undefined when neither service is present (a locked-down host): the
		* card then renders read-only, which is the documented degradation.
		*/
		function resolveSettingsScope(softGet) {
			const forms = softGet("configForms");
			if (forms !== void 0) {
				let entryId = WORKBUDDY_POOL_ENTRY_ID;
				try {
					const namespaces = forms.describe().getSnapshot().view?.namespaces ?? [];
					const served = namespaces.find((entry) => entry.ns === WORKBUDDY_POOL_ENTRY_ID) ?? namespaces.find((entry) => /workbuddy-xdpool/.test(entry.ns));
					if (served !== void 0) entryId = served.ns;
				} catch {}
				return forms.get(entryId);
			}
			const scope = softGet("settingsScope");
			if (scope !== void 0) return scope.bind({ namespace: WORKBUDDY_POOL_SETTINGS_NS });
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
