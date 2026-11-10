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

export const POOL_CHIP_CSS = `
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
`.trim()
