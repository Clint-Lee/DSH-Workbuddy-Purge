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

export const POOL_CARD_CSS = `
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
`.trim()
