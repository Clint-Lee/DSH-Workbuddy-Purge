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
 * ── Tokens ────────────────────────────────────────────────────────────────
 * Surfaces are a luminance step off the host tokens, so one rule set serves both
 * themes. Per-theme calibration lives at the bottom of the file.
 */
.dsm-workbuddy-xdpool-page{
  --wbx-label:var(--dsw-alias-label-primary,#0f1115);
  --wbx-text-1:var(--wbx-label);
  --wbx-text-2:var(--dsw-alias-label-secondary,#61666b);
  /* The host tertiary is tuned for flat white; these surfaces sit a step deeper,
     which costs contrast, so the tone is pulled toward the label. */
  --wbx-text-3:color-mix(in oklab, var(--dsw-alias-label-tertiary,#81858c), var(--wbx-label) 36%);
  --wbx-border:var(--dsw-alias-border-l2,#0000001a);
  /* The plane: the host's own layer-1 in light, layer-2 in dark (below). */
  --wbx-plane:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base,#fff));
  /* Rows inside the plane — a whisper of tint for the odd sub-block. */
  --wbx-row:color-mix(in oklab, var(--wbx-label) 3%, var(--wbx-plane));
  /* The recessed track behind a segmented control. */
  --wbx-sunk:color-mix(in oklab, var(--wbx-label) 8%, var(--wbx-plane));
  /* The lifted chip: the far end of the scale from the plane. */
  --wbx-lift:var(--dsw-alias-bg-layer-3,#fff);
  --wbx-hairline:var(--wbx-border);
  --wbx-hairline-soft:color-mix(in oklab, var(--wbx-border) 55%, transparent);
  --wbx-shadow-a:.5;
  --wbx-shadow:0 1px 2px rgba(0,0,0,calc(.14 * var(--wbx-shadow-a)));

  /* State. The harness exposes these as FILLS and uses the same green in both
     themes, which is right for a spine or a dot and unreadable as 11px text on a
     white plane. Hence three roles: fill, ink, and ink-for-tinted-pill. */
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
  /* The one solid button: a fill deep enough to carry its own foreground. */
  --wbx-ok-fill:color-mix(in oklab, var(--wbx-ok), var(--wbx-label) 42%);
  --wbx-on-fill:var(--dsw-alias-label-primary-foreground,#fff);
  --wbx-brand:var(--dsw-alias-brand-primary,#5686fe);
  /* The status spine, repainted per state by the status section's data-state. */
  --wbx-spine:var(--wbx-ok);

  --wbx-r:14px;
  --wbx-r-sm:8px;
  --wbx-ease:cubic-bezier(.2,.7,.25,1);
  --wbx-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Cascadia Mono",monospace;
}

/* Page shell: rhythm only — the settings column pads its own edges. */
.dsm-workbuddy-xdpool-page{max-width:900px;display:flex;flex-direction:column;gap:18px}

/* ── Header ────────────────────────────────────────────────────────────────
   The mark, the name, the two verbs. Deliberately OUTSIDE the plane: the panel
   is the machine, this is its caption. */
.dsm-workbuddy-xdpool-page-head{align-items:center;gap:13px;flex-wrap:wrap;display:flex}
.dsm-workbuddy-xdpool-page-icon{
  width:34px;height:34px;flex:none;border-radius:9px;padding:6px;box-sizing:border-box;
  object-fit:contain;
  background:var(--wbx-lift);
  border:1px solid var(--wbx-hairline);
}
.dsm-workbuddy-xdpool-page-copy{flex-direction:column;gap:2px;min-width:0;flex:1 1 240px;display:flex}
.dsm-workbuddy-xdpool-page-title{
  margin:0;color:var(--wbx-text-1);font-size:16px;font-weight:660;line-height:1.3;
  letter-spacing:-.012em;text-wrap:balance;
}
.dsm-workbuddy-xdpool-page-desc{margin:0;color:var(--wbx-text-3);font-size:12px;line-height:1.5;max-width:58ch;text-wrap:pretty}
.dsm-workbuddy-xdpool-page-actions{align-items:center;gap:8px;flex-wrap:wrap;flex:none;display:flex}

/* ── Buttons ───────────────────────────────────────────────────────────────
   Two weights. Outline = reversible. Solid = the single primary action, and the
   only element painted in the label colour. */
.dsm-btn{
  appearance:none;font:inherit;cursor:pointer;border:1px solid transparent;border-radius:var(--wbx-r-sm);
  padding:5px 12px;font-size:12px;line-height:1.5;font-weight:520;white-space:nowrap;
  transition:color .15s var(--wbx-ease),border-color .15s var(--wbx-ease),
             background .15s var(--wbx-ease),transform .1s var(--wbx-ease);
}
.dsm-btn:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-btn:disabled{opacity:.4;cursor:default}
.dsm-btn:active:not(:disabled){transform:translateY(.5px)}
.dsm-btn-outline{border-color:var(--wbx-hairline);color:var(--wbx-text-2);background:transparent}
.dsm-btn-outline:hover:not(:disabled){
  color:var(--wbx-text-1);
  border-color:color-mix(in oklab,var(--wbx-text-3) 55%,transparent);
  background:color-mix(in oklab,var(--wbx-label) 5%,transparent);
}
.dsm-btn-primary{background:var(--wbx-text-1);color:var(--wbx-plane);font-weight:600}
.dsm-btn-primary:hover:not(:disabled){opacity:.88}

/* ── The plane ─────────────────────────────────────────────────────────────
   One surface for the whole card, spine down the left edge. Sections are rows:
   a hairline above, a small capitalised label, content. The spine is what makes
   the stack read as one instrument rather than five independent panels, and its
   colour is the pool's health. */
.dsm-workbuddy-xdpool-card{
  position:relative;
  display:flex;flex-direction:column;gap:14px;
  padding:16px 18px 18px 21px;
  border:1px solid var(--wbx-hairline);
  border-left:3px solid var(--wbx-spine);
  border-radius:0 var(--wbx-r) var(--wbx-r) 0;
  background:var(--wbx-plane);
}
/* The spine is the status section's; the sections stacked under it keep the
   indent so the column stays aligned. */
.dsm-workbuddy-xdpool-page-head + .dsm-workbuddy-xdpool-card{
  border-radius:0 var(--wbx-r) 0 0;
  border-bottom:0;
}
.dsm-workbuddy-xdpool-page > .dsm-workbuddy-xdpool-card + .dsm-workbuddy-xdpool-card{
  margin-top:-14px;
  border-left:1px solid var(--wbx-hairline);
  border-radius:0;
}
.dsm-workbuddy-xdpool-page > .dsm-workbuddy-xdpool-card:last-child{
  border-bottom:1px solid var(--wbx-hairline);
  border-radius:0 0 var(--wbx-r) var(--wbx-r);
}

/* ── Health state → spine colour ───────────────────────────────────────────
   data-state is set by the component on the status section. The spine is the
   only thing that changes colour, so the page reports health without a single
   coloured banner. */
.dsm-workbuddy-xdpool-status[data-state="ok"]{--wbx-spine:var(--wbx-ok)}
.dsm-workbuddy-xdpool-status[data-state="idle"]{--wbx-spine:var(--wbx-text-3)}
.dsm-workbuddy-xdpool-status[data-state="error"]{--wbx-spine:var(--wbx-err)}

/* ── Region switch ─────────────────────────────────────────────────────────
   A segmented control: recessed track, lifted chip. The health dot lives inside
   the tab, so the control never changes colour itself. */
.dsm-workbuddy-xdpool-tabs{
  display:flex;gap:3px;padding:3px;
  border-radius:var(--wbx-r-sm);
  background:var(--wbx-sunk);
}
.dsm-workbuddy-xdpool-tab{
  appearance:none;font:inherit;cursor:pointer;flex:1 1 0;min-width:0;border:0;border-radius:6px;
  padding:6px 10px;color:var(--wbx-text-3);font-size:12px;font-weight:560;line-height:18px;
  background:transparent;display:inline-flex;align-items:center;justify-content:center;gap:7px;
  /* One line: a wrapped label would outgrow the track and the control would jump
     when the region changes. */
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  transition:color .15s var(--wbx-ease),background .15s var(--wbx-ease),box-shadow .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-tab:hover:not(.dsm-workbuddy-xdpool-tab-active){color:var(--wbx-text-2)}
.dsm-workbuddy-xdpool-tab:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-tab-active{
  color:var(--wbx-text-1);background:var(--wbx-lift);
  box-shadow:inset 0 1px 0 var(--wbx-hairline),var(--wbx-shadow);
}
.dsm-workbuddy-xdpool-tab-dot{
  display:inline-block;width:6px;height:6px;border-radius:50%;flex:none;
  background:var(--wbx-ok);
  box-shadow:0 0 0 3px color-mix(in oklab,var(--wbx-ok) 18%,transparent);
}
.dsm-workbuddy-xdpool-tab-dot[data-state="error"]{background:var(--wbx-err);box-shadow:0 0 0 3px color-mix(in oklab,var(--wbx-err) 18%,transparent)}
.dsm-workbuddy-xdpool-tab-dot[data-state="idle"]{background:var(--wbx-text-3);box-shadow:none}

/* ── The readout ───────────────────────────────────────────────────────────
   The health line, at body size but 650 weight: the spine already carries the
   alarm, so the text only has to confirm it. */
.dsm-workbuddy-xdpool-usage-head{display:flex;flex-direction:column;gap:13px;min-width:0}
.dsm-workbuddy-xdpool-usage-copy{display:flex;flex-direction:column;gap:3px;min-width:0}
.dsm-workbuddy-xdpool-usage-status{
  display:flex;align-items:center;gap:9px;
  font-size:14px;font-weight:650;color:var(--wbx-text-1);letter-spacing:-.01em;
  text-wrap:balance;
}
.dsm-workbuddy-xdpool-usage-dot{
  width:8px;height:8px;border-radius:50%;flex:none;
  box-shadow:0 0 0 3px color-mix(in oklab,currentColor 16%,transparent);
}
.dsm-workbuddy-xdpool-usage-hint{margin:0;color:var(--wbx-text-3);font-size:11.5px;line-height:1.55;text-wrap:pretty}
.dsm-workbuddy-xdpool-usage-hint code{font-family:var(--wbx-mono);font-size:11px;font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-usage-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}

/* ── Rotation policy ───────────────────────────────────────────────────────
   Equal chips in one wrapping row. Selected = lifted chip with an inset accent
   bar; a tinted wash alone is indistinguishable from hover and, on a plane this
   quiet, invisible. */
.dsm-workbuddy-xdpool-dist{display:flex;flex-direction:column;gap:9px}
.dsm-workbuddy-xdpool-dist-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.dsm-workbuddy-xdpool-dist-title{
  color:var(--wbx-text-3);font-size:10.5px;line-height:16px;
  letter-spacing:.1em;text-transform:uppercase;font-weight:680;
}
/* "now: X" — an echo of the selection, as quiet text behind a rule. */
.dsm-workbuddy-xdpool-dist-now{
  flex:none;padding:0 0 0 9px;border-left:2px solid var(--wbx-hairline);
  color:var(--wbx-text-2);font-size:11px;font-weight:600;line-height:16px;white-space:nowrap;
}
.dsm-workbuddy-xdpool-dist-options{display:flex;flex-wrap:wrap;gap:6px}
.dsm-workbuddy-xdpool-dist-option{
  flex:1 1 118px;min-width:0;appearance:none;font:inherit;cursor:pointer;text-align:left;
  display:flex;flex-direction:column;justify-content:center;gap:2px;min-height:42px;
  border:1px solid var(--wbx-hairline);border-radius:var(--wbx-r-sm);padding:8px 11px;
  background:transparent;color:var(--wbx-text-3);
  transition:color .15s var(--wbx-ease),border-color .15s var(--wbx-ease),
             background .15s var(--wbx-ease),transform .1s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-dist-option:hover:not(:disabled):not(.dsm-workbuddy-xdpool-dist-option-active){
  color:var(--wbx-text-2);
  border-color:color-mix(in oklab,var(--wbx-text-3) 50%,transparent);
  background:color-mix(in oklab,var(--wbx-label) 4%,transparent);
}
.dsm-workbuddy-xdpool-dist-option:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-dist-option:active:not(:disabled){transform:translateY(.5px)}
.dsm-workbuddy-xdpool-dist-option-active{
  background:var(--wbx-lift);
  border-color:color-mix(in oklab,var(--wbx-text-1) 24%,transparent);
  box-shadow:inset 2px 0 0 var(--wbx-text-1);
  color:var(--wbx-text-1);
}
.dsm-workbuddy-xdpool-dist-option:disabled{cursor:default;opacity:.55}
.dsm-workbuddy-xdpool-dist-option-top{display:flex;align-items:center;gap:6px;min-width:0}
.dsm-workbuddy-xdpool-dist-option-name{font-size:12px;line-height:17px;font-weight:600;min-width:0;overflow-wrap:anywhere}
.dsm-workbuddy-xdpool-dist-option-badge{
  flex:none;margin-left:auto;padding:1px 6px;border-radius:999px;
  background:var(--wbx-ok-tint);color:var(--wbx-ok-pill-ink);
  font-size:9px;font-weight:700;line-height:14px;white-space:nowrap;letter-spacing:.04em;
  text-transform:uppercase;
}
.dsm-workbuddy-xdpool-dist-hint{color:var(--wbx-text-3);font-size:11px;line-height:1.5;margin:0;text-wrap:pretty}

/* ── Section headings ──────────────────────────────────────────────────────
   Small capitals, not 13.5px bold sentences: hierarchy comes from the size jump
   between a label and a number, not from making every heading loud. */
.dsm-workbuddy-xdpool-accounts-head,
.dsm-workbuddy-xdpool-models-head,
.dsm-workbuddy-xdpool-ignored-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dsm-workbuddy-xdpool-models-heading{display:flex;flex-direction:column;gap:1px;min-width:0}
.dsm-workbuddy-xdpool-models-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dsm-workbuddy-xdpool-accounts-title,
.dsm-workbuddy-xdpool-models-title,
.dsm-workbuddy-xdpool-ignored-title{
  margin:0;color:var(--wbx-text-3);font-size:10.5px;font-weight:680;line-height:16px;
  letter-spacing:.1em;text-transform:uppercase;
}
.dsm-workbuddy-xdpool-accounts-summary,
.dsm-workbuddy-xdpool-models-summary,
.dsm-workbuddy-xdpool-ignored-summary{margin:0;color:var(--wbx-text-3);font-size:11px;line-height:16px}

/* ── The serving account ───────────────────────────────────────────────────
   A left rule inside the section, not a capsule: the section already has the
   spine, and a second rounded box would compete with it. */
.dsm-workbuddy-xdpool-current{
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0;padding:7px 0 7px 11px;
  border-left:2px solid var(--wbx-ok);
  background:transparent;
}
.dsm-workbuddy-xdpool-current-dot{
  width:6px;height:6px;border-radius:50%;flex:none;background:var(--wbx-ok);
  box-shadow:0 0 0 3px color-mix(in oklab,var(--wbx-ok) 18%,transparent);
}
.dsm-workbuddy-xdpool-current-label{
  color:var(--wbx-ok-pill-ink);font-size:10px;line-height:16px;font-weight:700;
  letter-spacing:.1em;flex:none;text-transform:uppercase;
}
.dsm-workbuddy-xdpool-current-name{
  color:var(--wbx-text-1);font-size:12px;line-height:16px;font-weight:600;
  font-family:var(--wbx-mono);
  min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.dsm-workbuddy-xdpool-current-note{color:var(--wbx-warn-ink);font-size:10.5px;line-height:16px}

/* ── Account rows ──────────────────────────────────────────────────────────
   Rows in a table: identity on the left, credit readout on the right, one
   hairline between accounts. No nested cards and no shadows — five shadowed
   tiles inside a panel is the definition of visual noise. */
.dsm-workbuddy-xdpool-accounts{gap:12px}
.dsm-workbuddy-xdpool-account{
  display:flex;flex-direction:column;gap:0;padding:0;
  border:0;border-top:1px solid var(--wbx-hairline-soft);border-radius:0;
  background:transparent;overflow:hidden;
}
.dsm-workbuddy-xdpool-account:first-of-type{border-top:0}
.dsm-workbuddy-xdpool-account-off{opacity:.5}
.dsm-workbuddy-xdpool-account-head{
  display:flex;align-items:center;gap:9px;min-width:0;padding:9px 0 7px;
  border:0;background:transparent;
}
.dsm-workbuddy-xdpool-account-label{
  color:var(--wbx-text-1);font-size:12px;font-weight:620;line-height:18px;
  font-family:var(--wbx-mono);letter-spacing:-.01em;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.dsm-workbuddy-xdpool-account-head .dsm-workbuddy-xdpool-account-toggle{margin-left:auto}
.dsm-workbuddy-xdpool-account-body{display:flex;align-items:stretch;gap:0;flex-wrap:wrap}
.dsm-workbuddy-xdpool-account-copy{
  display:flex;flex-direction:column;align-items:flex-start;gap:6px;justify-content:flex-start;
  /* A share, not a pixel cap: with a fixed 330px the identity block and the
     credit grid drifted apart on wide panels and the last credit cell was
     clipped by the section padding. */
  flex:1 1 240px;min-width:0;
  padding:0 16px 10px 0;background:transparent;
}

/* Pill switch: in rotation / off. */
.dsm-workbuddy-xdpool-account-toggle{
  appearance:none;font:inherit;display:inline-flex;align-items:center;gap:5px;cursor:pointer;flex:none;
  border:1px solid var(--wbx-hairline);border-radius:999px;padding:2px 9px;
  font-size:10.5px;line-height:16px;background:transparent;color:var(--wbx-text-3);
  transition:color .15s var(--wbx-ease),border-color .15s var(--wbx-ease),background .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-account-toggle:hover:not(:disabled){color:var(--wbx-text-1);border-color:color-mix(in oklab,var(--wbx-text-3) 55%,transparent)}
.dsm-workbuddy-xdpool-account-toggle:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-account-toggle:disabled{cursor:default;opacity:.6}
.dsm-workbuddy-xdpool-account-toggle-on{
  background:color-mix(in oklab,var(--wbx-ok) 11%,transparent);
  border-color:color-mix(in oklab,var(--wbx-ok) 42%,transparent);
  color:var(--wbx-ok-pill-ink);font-weight:620;
}
.dsm-workbuddy-xdpool-account-toggle-dot{width:5px;height:5px;border-radius:50%;flex:none;background:currentColor;opacity:.9}
/* "Remove": destructive but reversible, so quiet until hovered. */
.dsm-workbuddy-xdpool-account-ignore{
  appearance:none;font:inherit;flex:none;cursor:pointer;border:1px solid transparent;border-radius:999px;
  padding:2px 9px;font-size:10.5px;line-height:16px;background:transparent;color:var(--wbx-text-3);
  transition:color .15s var(--wbx-ease),border-color .15s var(--wbx-ease),background .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-account-ignore:hover:not(:disabled){
  color:var(--wbx-err-ink);border-color:color-mix(in oklab,var(--wbx-err) 40%,transparent);
  background:color-mix(in oklab,var(--wbx-err) 8%,transparent);
}
.dsm-workbuddy-xdpool-account-ignore:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-account-ignore:disabled{cursor:default;opacity:.6}

/* ── State pills ───────────────────────────────────────────────────────────
   One vocabulary for every state; the ink is the deep pill tone because these
   sit on tinted fills. */
.dsm-workbuddy-xdpool-account-tags{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.dsm-workbuddy-xdpool-account-tag{
  padding:1px 7px;border-radius:4px;font-size:10px;line-height:16px;font-weight:650;
  letter-spacing:.02em;
  background:var(--wbx-ok-tint);color:var(--wbx-ok-pill-ink);
}
.dsm-workbuddy-xdpool-account-tag-cooling{background:var(--wbx-warn-tint);color:var(--wbx-warn-pill-ink)}
/* A rejected sign-in is red, not amber: waiting will not clear it, and it is the
   one state where the user has to go do something. */
.dsm-workbuddy-xdpool-account-tag-error,
.dsm-workbuddy-xdpool-account-tag-dead{background:var(--wbx-err-tint);color:var(--wbx-err-pill-ink)}
.dsm-workbuddy-xdpool-account-meta{
  color:var(--wbx-text-3);font-size:10.5px;line-height:16px;
  display:flex;flex-wrap:wrap;gap:9px;
  font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
}
.dsm-workbuddy-xdpool-account-meta-dead{color:var(--wbx-err-ink)}
.dsm-workbuddy-xdpool-account-modelcool{display:flex;flex-wrap:wrap;gap:5px}
.dsm-workbuddy-xdpool-account-modelcool-chip{
  display:inline-flex;align-items:center;gap:4px;padding:1px 7px;border-radius:4px;
  font-size:10px;line-height:16px;
  background:var(--wbx-warn-tint);color:var(--wbx-warn-pill-ink);
}
/* The way out, not a second problem: keeps the hue, drops the weight. */
.dsm-workbuddy-xdpool-account-modelcool-twin{color:var(--wbx-text-2);cursor:help}
.dsm-workbuddy-xdpool-account-error{margin:0;color:var(--wbx-err-ink);font-size:11.5px;line-height:18px}

/* ── Credit readout ────────────────────────────────────────────────────────
   Packages left, total right, split by a vertical hairline. The total is the
   only element with a tinted background: it is the answer, so it gets the one
   piece of colour the layout can afford. */
.dsm-workbuddy-xdpool-stats{
  display:grid;grid-template-columns:minmax(0,1fr) minmax(150px,.6fr);gap:0;
  flex:1 1 300px;min-width:0;max-width:100%;
}
.dsm-workbuddy-xdpool-panel{display:flex;flex-direction:column;min-width:0;gap:6px;padding:10px 14px}
.dsm-workbuddy-xdpool-panel + .dsm-workbuddy-xdpool-panel{border-left:1px solid var(--wbx-hairline-soft)}
.dsm-workbuddy-xdpool-panel-title{
  color:var(--wbx-text-3);font-size:10px;line-height:15px;
  letter-spacing:.1em;text-transform:uppercase;font-weight:680;
}
.dsm-workbuddy-xdpool-panel-empty{color:var(--wbx-text-3);font-size:12.5px;line-height:19px}
.dsm-workbuddy-xdpool-panel-error{color:var(--wbx-err-ink);font-size:10.5px;line-height:17px;word-break:break-word}
/* A rejected sign-in collapses to a chip: the upstream paragraph is long, and
   printed inline it pushed the total off screen. */
.dsm-workbuddy-xdpool-panel-error-dead{
  display:inline-flex;align-items:center;align-self:flex-start;padding:1px 7px;border-radius:4px;
  background:var(--wbx-err-tint);color:var(--wbx-err-pill-ink);
  font-size:10px;line-height:16px;white-space:nowrap;cursor:help;
}
.dsm-workbuddy-xdpool-panel-packages{display:flex;flex-direction:column;gap:6px;min-width:0}
.dsm-workbuddy-xdpool-panel-foot{
  display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:7px;padding-top:7px;
  border-top:1px solid var(--wbx-hairline-soft);color:var(--wbx-text-2);font-size:11px;line-height:17px;
}
.dsm-workbuddy-xdpool-panel-foot strong{
  color:var(--wbx-text-1);font-size:14px;font-weight:650;
  font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
}
/* One credit package: name + amount, deadline beneath. A two-row grid keeps the
   amounts aligned across rows. */
.dsm-workbuddy-xdpool-packages{display:flex;flex-direction:column;gap:5px;margin:0;padding:0;list-style:none}
.dsm-workbuddy-xdpool-packages li{
  display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:10px;row-gap:0;align-items:baseline;
  color:var(--wbx-text-2);font-size:11px;line-height:17px;
}
.dsm-workbuddy-xdpool-packages-name{grid-column:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-workbuddy-xdpool-packages-value{
  grid-column:2;justify-self:end;color:var(--wbx-text-1);font-size:11.5px;font-weight:620;
  font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
}
/* Per-package deadline folds onto its own line; imminent ones are tinted. */
.dsm-workbuddy-xdpool-packages-when{
  grid-column:1/-1;color:var(--wbx-text-3);font-size:10px;line-height:14px;
  font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
}
.dsm-workbuddy-xdpool-packages-when-soon{color:var(--wbx-warn-ink)}

/* THE headline: the only type above 17px, in mono so digits keep their column.
   The wash is the state hue at very low alpha — enough to say "this is the
   number", not enough to become a coloured block. */
.dsm-workbuddy-xdpool-panel-total{
  position:relative;align-items:center;text-align:center;justify-content:center;
  background:linear-gradient(180deg,
    color-mix(in oklab,var(--wbx-ok) 7%,transparent),
    transparent 78%);
}
.dsm-workbuddy-xdpool-total-value{
  color:var(--wbx-ok-ink);font-size:30px;line-height:34px;font-weight:700;letter-spacing:-.03em;
  white-space:nowrap;font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
}

/* Check-in, docked under the total. */
.dsm-workbuddy-xdpool-checkin{
  display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;
  margin-top:8px;padding-top:9px;border-top:1px solid var(--wbx-hairline-soft);
}
.dsm-workbuddy-xdpool-checkin-meta{display:flex;flex-direction:column;align-items:center;gap:1px;width:100%}
.dsm-workbuddy-xdpool-checkin-streak{
  color:var(--wbx-text-2);font-size:11px;line-height:16px;
  font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
}
.dsm-workbuddy-xdpool-checkin-daily{color:var(--wbx-ok-ink);font-size:10.5px;line-height:16px;font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-checkin-bonus{
  padding:1px 7px;border-radius:4px;font-size:10px;line-height:16px;text-align:center;
  background:var(--wbx-ok-tint);color:var(--wbx-ok-pill-ink);
}
.dsm-workbuddy-xdpool-checkin-btn{
  width:100%;padding:6px 10px;border-radius:var(--wbx-r-sm);border:1px solid transparent;
  font:inherit;font-size:11.5px;font-weight:650;line-height:17px;cursor:pointer;
  background:var(--wbx-ok-fill);color:var(--wbx-on-fill);
  transition:opacity .15s var(--wbx-ease),transform .1s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-checkin-btn:hover:not(:disabled){opacity:.88}
.dsm-workbuddy-xdpool-checkin-btn:active:not(:disabled){transform:translateY(.5px)}
.dsm-workbuddy-xdpool-checkin-btn:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-checkin-btn:disabled{cursor:default;background:transparent;border-color:var(--wbx-hairline);color:var(--wbx-text-3);opacity:1}
.dsm-workbuddy-xdpool-checkin-error{color:var(--wbx-err-ink);font-size:10px;line-height:15px;text-align:center;word-break:break-word}

/* ── Removed accounts ──────────────────────────────────────────────────────
   Visible proof that "remove" can be undone. */
.dsm-workbuddy-xdpool-ignored-list{display:flex;flex-direction:column}
.dsm-workbuddy-xdpool-ignored-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0}
.dsm-workbuddy-xdpool-ignored-row + .dsm-workbuddy-xdpool-ignored-row{border-top:1px solid var(--wbx-hairline-soft)}
.dsm-workbuddy-xdpool-ignored-label{
  color:var(--wbx-text-2);font-size:11px;line-height:17px;font-family:var(--wbx-mono);
  min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.dsm-workbuddy-xdpool-ignored-restore{
  appearance:none;font:inherit;flex:none;cursor:pointer;border:1px solid var(--wbx-hairline);border-radius:999px;
  padding:2px 9px;font-size:10.5px;line-height:16px;background:transparent;color:var(--wbx-text-2);
  transition:color .15s var(--wbx-ease),border-color .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-ignored-restore:hover:not(:disabled){color:var(--wbx-text-1);border-color:color-mix(in oklab,var(--wbx-text-3) 55%,transparent)}
.dsm-workbuddy-xdpool-ignored-restore:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-ignored-restore:disabled{cursor:default;opacity:.6}

/* ── Model directory ───────────────────────────────────────────────────────
   A table: rows separated by hairlines, ids in mono, one row lifts on hover. No
   perimeter — the section provides it, and a boxed list inside a boxed section is
   the nesting this design exists to avoid. */
.dsm-workbuddy-xdpool-models{gap:10px}
/* "built-in list (offline)": the roster is SHORTER than the gateway's, so this is
   a warning tint, not a neutral chip. */
.dsm-workbuddy-xdpool-catalog-offline{
  flex:none;padding:1px 7px;border-radius:4px;font-size:10px;line-height:16px;font-weight:680;
  background:var(--wbx-warn-tint);color:var(--wbx-warn-pill-ink);white-space:nowrap;
  letter-spacing:.02em;
}
.dsm-workbuddy-xdpool-model-list{
  display:flex;flex-direction:column;border:0;
  border-top:1px solid var(--wbx-hairline-soft);
  border-radius:0;overflow:hidden;
  background:transparent;
}
.dsm-workbuddy-xdpool-model{
  display:grid;grid-template-columns:minmax(0,1fr);gap:5px;padding:9px 0;
  background:transparent;
  transition:background .15s var(--wbx-ease),opacity .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-model:hover{background:color-mix(in oklab,var(--wbx-label) 3%,transparent)}
.dsm-workbuddy-xdpool-model + .dsm-workbuddy-xdpool-model{border-top:1px solid var(--wbx-hairline-soft)}
.dsm-workbuddy-xdpool-model-off{opacity:.5}
.dsm-workbuddy-xdpool-model-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;flex-wrap:wrap}
.dsm-workbuddy-xdpool-model-copy{display:flex;align-items:baseline;gap:8px;min-width:0;flex-wrap:wrap}
.dsm-workbuddy-xdpool-model-name{
  display:inline-flex;align-items:baseline;gap:7px;color:var(--wbx-text-1);
  font-size:12px;font-weight:580;line-height:18px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.dsm-workbuddy-xdpool-model-name-rate{
  color:var(--wbx-text-3);font-size:10px;font-weight:400;line-height:15px;flex:none;
  font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
}
/* The id is what the user copies into a config, so it keeps its contrast. */
.dsm-workbuddy-xdpool-model-id{
  color:var(--wbx-text-3);font-size:10px;line-height:15px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--wbx-mono);
}
.dsm-workbuddy-xdpool-model-meta{
  display:flex;align-items:center;gap:7px;flex-wrap:wrap;
  color:var(--wbx-text-3);font-size:10px;line-height:15px;
}
.dsm-workbuddy-xdpool-model-meta-tag{
  padding:0 6px;border-radius:3px;font-size:10px;line-height:15px;
  background:var(--wbx-row);color:var(--wbx-text-2);
}
/* "free from HH:00": quieter than a badge on purpose — the model costs credits
   right now, so it must not read as a promo the user can spend against. */
.dsm-workbuddy-xdpool-model-meta-later{
  padding:0 6px;border-radius:3px;font-size:10px;line-height:15px;
  border:1px dashed color-mix(in oklab,var(--wbx-text-3) 45%,transparent);color:var(--wbx-text-3);
}
/* "活动至 10-31": context for planning, not a claim about the current price. */
.dsm-workbuddy-xdpool-model-meta-promo{color:var(--wbx-text-3);font-size:10px;line-height:15px;opacity:.9}
/* "付费同款 …": the way out when the free row is rate-limited. */
.dsm-workbuddy-xdpool-model-meta-twin{color:var(--wbx-text-3);font-size:10px;line-height:15px;opacity:.9;cursor:help}
.dsm-workbuddy-xdpool-model-cap{
  color:var(--wbx-text-3);font-size:10px;line-height:15px;
  font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
}
/* Row controls: checkbox + image toggle + context-budget radios. */
.dsm-workbuddy-xdpool-model-check{display:flex;align-items:center;gap:8px;min-width:0;flex:1;cursor:pointer}
.dsm-workbuddy-xdpool-model-check input{margin:0;accent-color:var(--wbx-brand);flex:none}
.dsm-workbuddy-xdpool-model-controls{display:flex;align-items:center;gap:9px;flex:none;flex-wrap:wrap;justify-content:flex-end}
.dsm-workbuddy-xdpool-model-image{display:inline-flex;align-items:center;gap:5px;flex:none;cursor:pointer;color:var(--wbx-text-2);font-size:10px;line-height:15px}
.dsm-workbuddy-xdpool-model-image input{margin:0;accent-color:var(--wbx-brand)}
.dsm-workbuddy-xdpool-model-budget{
  display:flex;align-items:center;gap:8px;flex:none;margin:0;padding:0;border:0;
  color:var(--wbx-text-2);font-size:10px;line-height:15px;
}
.dsm-workbuddy-xdpool-model-budget label{display:inline-flex;align-items:center;gap:4px;cursor:pointer}
.dsm-workbuddy-xdpool-model-budget input{margin:0;accent-color:var(--wbx-brand)}

/* Unreadable credential files: a warning tint, because it explains a smaller pool
   and "encrypted" is actionable (start the app once). */
.dsm-workbuddy-xdpool-skipped{
  display:flex;flex-direction:column;gap:2px;margin:2px 0 0;padding:8px 10px;border-radius:var(--wbx-r-sm);
  background:var(--wbx-warn-tint);
}
.dsm-workbuddy-xdpool-skipped-summary{margin:0;font-size:11px;line-height:17px;font-weight:650;color:var(--wbx-warn-pill-ink)}
.dsm-workbuddy-xdpool-skipped-row{
  margin:0;display:flex;gap:7px;align-items:baseline;flex-wrap:wrap;
  font-size:10px;line-height:15px;
}
.dsm-workbuddy-xdpool-skipped-file{
  font-family:var(--wbx-mono);color:color-mix(in oklab, var(--wbx-text-1) 80%, var(--wbx-warn-tint));
  max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.dsm-workbuddy-xdpool-skipped-reason{color:color-mix(in oklab, var(--wbx-text-1) 72%, var(--wbx-warn-tint))}

/* ── Automation ────────────────────────────────────────────────────────────
   A sub-block opened by a hairline: schedule, last run, earned. No inset slab —
   on a plain plane a second fill reads as a foreign object. */
.dsm-workbuddy-xdpool-auto{
  margin:0;padding:11px 0 0;border:0;border-top:1px solid var(--wbx-hairline-soft);border-radius:0;
  background:transparent;box-shadow:none;
}
.dsm-workbuddy-xdpool-auto-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dsm-workbuddy-xdpool-auto-title{
  color:var(--wbx-text-3);font-size:10.5px;font-weight:680;line-height:16px;
  letter-spacing:.1em;text-transform:uppercase;
}
.dsm-workbuddy-xdpool-auto-run{flex:none}
.dsm-workbuddy-xdpool-auto-switch{
  padding:2px 10px;border:1px solid var(--wbx-hairline);border-radius:999px;background:transparent;
  font:inherit;color:var(--wbx-text-2);font-size:10.5px;line-height:16px;cursor:pointer;
  transition:color .15s var(--wbx-ease),border-color .15s var(--wbx-ease),background .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-auto-switch:hover:not(:disabled){border-color:color-mix(in oklab,var(--wbx-text-3) 55%,transparent);color:var(--wbx-text-1)}
.dsm-workbuddy-xdpool-auto-switch:disabled{opacity:.5;cursor:not-allowed}
.dsm-workbuddy-xdpool-auto-switch-on{
  border-color:color-mix(in oklab,var(--wbx-ok) 48%,transparent);
  color:var(--wbx-ok-pill-ink);background:color-mix(in oklab,var(--wbx-ok) 10%,transparent);
}
.dsm-workbuddy-xdpool-auto-hint{margin:5px 0 0;color:var(--wbx-text-2);font-size:11px;line-height:1.55}
.dsm-workbuddy-xdpool-auto-total{
  display:flex;flex-direction:column;gap:3px;margin-top:8px;padding:0 0 0 10px;
  border-left:2px solid color-mix(in oklab,var(--wbx-ok) 45%,transparent);
  background:transparent;font-size:10px;
}
.dsm-workbuddy-xdpool-auto-total-label{color:var(--wbx-text-3);font-size:10px;line-height:15px}
.dsm-workbuddy-xdpool-auto-total-list{display:flex;flex-direction:column;gap:1px}
.dsm-workbuddy-xdpool-auto-total-row{
  color:var(--wbx-ok-ink);font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
}
.dsm-workbuddy-xdpool-auto-jobs{margin-top:8px;display:flex;flex-direction:column;gap:4px}
.dsm-workbuddy-xdpool-auto-job{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--wbx-text-2)}
.dsm-workbuddy-xdpool-auto-job-name{flex:0 0 auto;min-width:70px;color:var(--wbx-text-1);font-weight:560}
.dsm-workbuddy-xdpool-auto-job-when{
  flex:1 1 auto;color:var(--wbx-text-2);
  font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
}
.dsm-workbuddy-xdpool-auto-job-last{
  flex:0 0 auto;text-align:right;color:var(--wbx-text-3);white-space:nowrap;
  font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
}
.dsm-workbuddy-xdpool-auto-job-note{flex:0 0 auto;color:var(--wbx-text-2)}
.dsm-workbuddy-xdpool-auto-job-detail{grid-column:1/-1;color:var(--wbx-text-3);font-size:10px;line-height:15px}
.dsm-workbuddy-xdpool-earned{
  display:flex;flex-direction:column;gap:3px;margin-top:7px;padding-top:7px;
  border-top:1px dashed var(--wbx-hairline-soft);font-size:10px;
}
.dsm-workbuddy-xdpool-earned-label{color:var(--wbx-text-3);font-size:10px;line-height:15px}
.dsm-workbuddy-xdpool-earned-list{display:flex;flex-direction:column;gap:1px}
.dsm-workbuddy-xdpool-earned-row{
  color:var(--wbx-ok-ink);font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
}
.dsm-workbuddy-xdpool-earned-value{
  color:var(--wbx-ok-ink);font-weight:650;
  font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
}

/* Reserved credits: one inline number field. An explicit Save commits the draft —
   blur must not silently rewrite a credit floor. */
.dsm-workbuddy-xdpool-reserve{
  display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:7px;padding-top:7px;
  border-top:1px dashed var(--wbx-hairline-soft);font-size:10px;color:var(--wbx-text-3);
}
.dsm-workbuddy-xdpool-reserve-label{flex:0 0 auto}
.dsm-workbuddy-xdpool-reserve-input{
  width:76px;padding:2px 7px;border:1px solid var(--wbx-hairline);border-radius:5px;background:transparent;
  color:var(--wbx-text-1);font:inherit;font-size:10.5px;
  font-family:var(--wbx-mono);font-variant-numeric:tabular-nums;
  transition:border-color .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-reserve-input:focus{outline:none;border-color:var(--wbx-ok)}
.dsm-workbuddy-xdpool-reserve-input:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-reserve-input:disabled{opacity:.6}
.dsm-workbuddy-xdpool-reserve-unit{flex:0 0 auto}
.dsm-workbuddy-xdpool-reserve-badge{
  flex:0 0 auto;padding:0 6px;border-radius:3px;background:var(--wbx-err-tint);
  color:var(--wbx-err-pill-ink);font-size:9.5px;line-height:15px;
}
.dsm-workbuddy-xdpool-reserve-save{
  flex:0 0 auto;appearance:none;font:inherit;font-size:10px;font-weight:650;line-height:15px;
  padding:2px 10px;border-radius:5px;
  border:1px solid color-mix(in oklab,var(--wbx-ok) 46%,transparent);
  background:color-mix(in oklab,var(--wbx-ok) 11%,transparent);
  color:var(--wbx-ok-pill-ink);cursor:pointer;
  transition:opacity .15s var(--wbx-ease),background .15s var(--wbx-ease),border-color .15s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-reserve-save:hover:not(:disabled){background:color-mix(in oklab,var(--wbx-ok) 19%,transparent);border-color:var(--wbx-ok)}
.dsm-workbuddy-xdpool-reserve-save:disabled{cursor:default;border-color:var(--wbx-hairline);background:transparent;color:var(--wbx-text-3);opacity:.75}
.dsm-workbuddy-xdpool-reserve-note{flex:0 0 auto;font-size:10px;line-height:15px}
.dsm-workbuddy-xdpool-reserve-note-ok{color:var(--wbx-ok-ink)}
.dsm-workbuddy-xdpool-reserve-note-bad{color:var(--wbx-err-ink);font-weight:650}

/* ── Empty-region guide ────────────────────────────────────────────────────
   Numbered steps, because this is the first screen a new user sees. */
.dsm-workbuddy-xdpool-empty{gap:10px}
.dsm-workbuddy-xdpool-empty-title{
  margin:0;color:var(--wbx-text-3);font-size:10.5px;font-weight:680;line-height:16px;
  letter-spacing:.1em;text-transform:uppercase;
}
.dsm-workbuddy-xdpool-empty-steps{
  display:flex;flex-direction:column;gap:5px;padding:11px 12px;border-radius:var(--wbx-r-sm);
  background:var(--wbx-row);border:0;
}
.dsm-workbuddy-xdpool-empty-steps-title{margin:0;color:var(--wbx-text-1);font-size:11.5px;font-weight:650;line-height:17px}
.dsm-workbuddy-xdpool-empty-list{
  margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px;
  color:var(--wbx-text-2);font-size:11px;line-height:17px;
}
.dsm-workbuddy-xdpool-empty-list li{min-width:0}
.dsm-workbuddy-xdpool-empty-note{margin:0;color:var(--wbx-text-3);font-size:10px;line-height:15px}

/* Inline notes. */
.dsm-workbuddy-xdpool-note{margin:0;color:var(--wbx-text-3);font-size:11px;line-height:18px}
.dsm-workbuddy-xdpool-error{margin:0;color:var(--wbx-err-ink);font-size:11px;line-height:18px}

/* ── Responsive ────────────────────────────────────────────────────────────
   Below 760px the credit grid stacks and the chips give up their desktop
   min-height. The spine stays: it is the cheapest status cue on a phone. */
@media (max-width:760px){
  .dsm-workbuddy-xdpool-page{gap:14px}
  .dsm-workbuddy-xdpool-card{padding:13px 13px 15px 17px}
  .dsm-workbuddy-xdpool-stats{grid-template-columns:1fr}
  .dsm-workbuddy-xdpool-panel + .dsm-workbuddy-xdpool-panel{border-left:0;border-top:1px solid var(--wbx-hairline-soft)}
  .dsm-workbuddy-xdpool-panel-total{align-items:stretch;text-align:left}
  .dsm-workbuddy-xdpool-total-value{text-align:left}
  .dsm-workbuddy-xdpool-checkin{align-items:stretch}
  .dsm-workbuddy-xdpool-checkin-meta{align-items:flex-start}
  .dsm-workbuddy-xdpool-checkin-bonus{text-align:left}
  .dsm-workbuddy-xdpool-dist-option{min-height:0;flex:1 1 100%}
}

/* Respect the OS "reduce motion" preference: transitions are decoration. */
@media (prefers-reduced-motion:reduce){
  .dsm-workbuddy-xdpool-page *{transition:none!important}
}

/*
 * ── Theme ─────────────────────────────────────────────────────────────────
 *
 * Light is the BASE and dark overrides the same tokens. That is how the harness
 * publishes it: the presenter writes html{color-scheme} for UA chrome and *adds*
 * body[data-ds-dark-theme] when the resolved scheme is dark. Every --dsw-*
 * stylesheet in DSH is written this way (a dark attribute block over a light
 * base), so this card follows the same rule instead of guessing from the OS.
 *
 * NOT prefers-color-scheme, deliberately: a user may pin light or dark in DSH
 * while the OS says the opposite, and a media query would then paint a white
 * panel into a black page.
 *
 * Values from the harness stylesheet:
 *
 *            layer-1/2/3            border-l2      label-primary
 *   light    #fff  #fff  #fff        #0000001a      #0f1115
 *   dark     #232324 #2c2c2e #353638 #ffffff1f      #f9fafb
 *
 * So the dark plane moves UP to layer-2 (it must sit above the page), and its
 * hairlines need more alpha: a 12%-white border over #2c2c2e is the only thing
 * separating two dark surfaces.
 */
body[data-ds-dark-theme] .dsm-workbuddy-xdpool-page,
html[data-ds-dark-theme] .dsm-workbuddy-xdpool-page{
  --wbx-label:var(--dsw-alias-label-primary,#f9fafb);
  --wbx-text-2:var(--dsw-alias-label-secondary,#cfd3d6);
  --wbx-text-3:var(--dsw-alias-label-tertiary,#adb2b8);
  --wbx-border:var(--dsw-alias-border-l2,#ffffff1f);
  --wbx-plane:var(--dsw-alias-bg-layer-2,#2c2c2e);
  --wbx-lift:color-mix(in oklab, var(--dsw-alias-bg-layer-3,#353638), var(--wbx-label) 9%);
  --wbx-row:color-mix(in oklab, var(--wbx-label) 5%, var(--wbx-plane));
  --wbx-sunk:color-mix(in oklab, #000 26%, var(--wbx-plane));
  --wbx-hairline:color-mix(in oklab, var(--wbx-border) 88%, transparent);
  --wbx-hairline-soft:color-mix(in oklab, var(--wbx-border) 46%, transparent);
  --wbx-shadow-a:1;
  /* On a dark plane the bright state colours are the legible ones, so the inks
     move much less toward the label than they do on paper. */
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

/* Engines without color-mix: collapse every derived surface onto the host's own
   flat layer. The plane and the spine still read as a panel; the subtle steps are
   what get lost. Both themes need the reset, because the dark block derives its
   surfaces with color-mix too. */
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
