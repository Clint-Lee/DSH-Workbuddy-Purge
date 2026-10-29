/**
 * Client styles for the WorkBuddy pool card.
 *
 * Design language: a quiet instrument panel, not a settings form.
 *
 * Everything here is built from three moves:
 *   1. DEPTH BY TONE, NOT BY BORDER. Surfaces differ by a luminance step derived
 *      from the host's own layer tokens; a 1px hairline is a seam, never the
 *      thing that defines a panel.
 *   2. ONE LOUD NUMBER. The credit total is the only large type on the page.
 *      Every other number is tabular and one step quieter, so the eye lands in
 *      the right place without being told to.
 *   3. STATE IS A DOT AND A HUE, NEVER A FILLED BANNER. Health reads from a 7px
 *      dot plus a tinted capsule; nothing turns into a coloured block.
 *
 * Theme handling is deliberately attribute-based (see "Theme calibration" at the
 * bottom): DSH publishes light as the default and *adds* body[data-ds-dark-theme]
 * for dark, so light is the base and dark overrides the same tokens. A
 * prefers-color-scheme query would flip these surfaces when the user pins a theme
 * different from the OS, which is the bug this file exists to avoid.
 *
 * The inner classes are namespaced `dsm-workbuddy-xdpool-*`. Nothing here relies
 * on markup structure beyond the class names the component renders.
 *
 * @module dsh-workbuddy-xdpool/client/styles
 */

export const POOL_CARD_CSS = `
/*
 * ── Tokens ────────────────────────────────────────────────────────────────
 * Every surface is derived RELATIVE to the host tokens, because both themes must
 * work from one rule set. The direction of each relationship, not the colour, is
 * what makes that possible:
 *   - a card is the page surface pushed toward the label;
 *   - a chip is one more step;
 *   - the top highlight is white-ish on dark, and a white bevel on light;
 *   - shadows stay black, only their alpha changes.
 * Per-theme calibration (how far to push, how strong the shadow) is applied in
 * the block at the bottom of this file.
 */
.dsm-workbuddy-xdpool-page{
  --wbx-label:var(--dsw-alias-label-primary,#0f1115);
  --wbx-text-1:var(--wbx-label);
  --wbx-text-2:var(--dsw-alias-label-secondary,#61666b);
  /* The host's light tertiary is tuned for flat white; these cards are a grey
     step deeper, which costs contrast, so the tone is pulled toward the label. */
  --wbx-text-3:color-mix(in oklab, var(--dsw-alias-label-tertiary,#81858c), var(--wbx-label) 34%);
  --wbx-border:var(--dsw-alias-border-l2,#0000001a);
  --wbx-surface-1:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base,#fff));
  --wbx-surface-2:var(--dsw-alias-bg-layer-2,#fff);
  /* A tint used only where something is chosen or measured. */
  --wbx-surface-sunk:color-mix(in oklab, var(--wbx-label) 5%, var(--wbx-surface-2));
  /* Lifted = back to the host's layer-3. In light that is pure white, i.e. the
     raised end of the scale is brightness; mixing toward the label would make a
     selected chip DARKER than its own track and read as a dent. */
  --wbx-surface-3:var(--dsw-alias-bg-layer-3,#fff);
  --wbx-line:120%;
  --wbx-line-soft:70%;
  --wbx-hairline:var(--wbx-border);
  --wbx-plane:color-mix(in oklab, var(--wbx-border), var(--wbx-label) 18%);
  --wbx-hairline-soft:color-mix(in oklab, var(--wbx-border) var(--wbx-line-soft), transparent);
  --wbx-tabs-bg:color-mix(in oklab, var(--wbx-label) 6%, var(--wbx-surface-1));
  --wbx-chip-bg:color-mix(in oklab, var(--wbx-label) 4%, var(--wbx-surface-2));
  --wbx-toplight:rgb(255 255 255 / .72);
  --wbx-shadow-a:.5;
  --wbx-shadow-sm:0 1px 2px rgba(0,0,0,calc(.16 * var(--wbx-shadow-a)));
  --wbx-accent:var(--wbx-label);
  /* State. The harness exposes state colours as FILLS (success-primary is the
     same green in both themes), which is right for a dot and wrong for 11px
     text on a white card, so fills and inks are separate roles here. */
  --wbx-ok:var(--dsw-alias-state-success-primary,#22c55e);
  --wbx-warn:var(--dsw-alias-state-warn-primary,var(--dsw-static-amber-500,#f59e0b));
  --wbx-err:var(--dsw-alias-state-error-primary,#ec1313);
  --wbx-ok-tint:color-mix(in oklab, var(--wbx-ok) 12%, var(--wbx-surface-2));
  --wbx-warn-tint:color-mix(in oklab, var(--wbx-warn) 12%, var(--wbx-surface-2));
  --wbx-err-tint:color-mix(in oklab, var(--wbx-err) 11%, var(--wbx-surface-2));
  --wbx-ok-ink:color-mix(in oklab, var(--wbx-ok), var(--wbx-label) 46%);
  --wbx-warn-ink:color-mix(in oklab, var(--dsw-alias-state-warn-label,#dd8629), var(--wbx-label) 40%);
  --wbx-err-ink:color-mix(in oklab, var(--wbx-err), var(--wbx-label) 30%);
  /* Ink for text sitting ON a tinted pill: it has to beat the tint, not the
     card, so it goes much deeper than the --wbx-*-ink roles. */
  --wbx-ok-pill-ink:color-mix(in oklab, var(--wbx-ok), var(--wbx-label) 64%);
  --wbx-warn-pill-ink:color-mix(in oklab, var(--wbx-warn), var(--wbx-label) 74%);
  --wbx-err-pill-ink:color-mix(in oklab, var(--wbx-err), var(--wbx-label) 36%);
  /* A solid state button needs a fill deep enough to carry its own foreground:
     green-500 under white text is 2.1:1, which looks disabled. */
  --wbx-ok-fill:color-mix(in oklab, var(--wbx-ok), var(--wbx-label) 42%);
  --wbx-on-fill:var(--dsw-alias-label-primary-foreground,#fff);
  --wbx-brand:var(--dsw-alias-brand-primary,#5686fe);
  --wbx-r-lg:16px;
  --wbx-r-md:12px;
  --wbx-r-sm:9px;
  --wbx-ease:cubic-bezier(.2,.7,.25,1);
  --wbx-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}

/* Page shell. The settings column pads its own edges, so this supplies rhythm
   only — no outer border, no extra margin.
   The gap is deliberately small: the cards are meant to read as one continuous
   stack of sections, not as five separate things floating on a page. */
.dsm-workbuddy-xdpool-page{max-width:880px;display:flex;flex-direction:column;gap:10px}

/* ── Header ────────────────────────────────────────────────────────────────
   Identity left, actions right. The mark is a tile with the icon inset, so the
   header keeps a fixed anchor when the description wraps. */
.dsm-workbuddy-xdpool-page-head{align-items:center;gap:14px;flex-wrap:wrap;display:flex;padding:2px}
.dsm-workbuddy-xdpool-page-icon{
  width:38px;height:38px;flex:none;border-radius:11px;
  border:1px solid var(--wbx-hairline);
  background:linear-gradient(180deg,var(--wbx-surface-3),var(--wbx-surface-2));
  box-shadow:inset 0 1px 0 var(--wbx-toplight),var(--wbx-shadow-sm);
  padding:7px;box-sizing:border-box;object-fit:contain;
}
.dsm-workbuddy-xdpool-page-copy{flex-direction:column;gap:4px;min-width:0;flex:1 1 240px;display:flex}
.dsm-workbuddy-xdpool-page-title{
  margin:0;color:var(--wbx-text-1);font-size:17px;font-weight:660;line-height:1.3;
  letter-spacing:-.015em;text-wrap:balance;
}
.dsm-workbuddy-xdpool-page-desc{margin:0;color:var(--wbx-text-3);font-size:12.5px;line-height:1.55;max-width:60ch;text-wrap:pretty}
.dsm-workbuddy-xdpool-page-actions{align-items:center;gap:8px;flex-wrap:wrap;flex:none;display:flex}

/* ── Buttons ───────────────────────────────────────────────────────────────
   Two weights only: a quiet outline for anything reversible, one solid for the
   primary action. */
.dsm-btn{
  appearance:none;font:inherit;cursor:pointer;border:1px solid transparent;border-radius:var(--wbx-r-sm);
  padding:5px 13px;font-size:12.5px;line-height:1.5;font-weight:520;white-space:nowrap;
  transition:color .16s var(--wbx-ease),border-color .16s var(--wbx-ease),
             background .16s var(--wbx-ease),transform .1s var(--wbx-ease),
             box-shadow .16s var(--wbx-ease);
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
.dsm-btn-primary{background:var(--wbx-text-1);color:var(--wbx-surface-3);font-weight:600;box-shadow:var(--wbx-shadow-sm)}
.dsm-btn-primary:hover:not(:disabled){opacity:.9}

/* ── Sections ──────────────────────────────────────────────────────────────
   One continuous panel, not a stack of boxes.
   The page carries the surface: a single rounded plane with a perimeter hairline.
   The sections inside it are borderless and separated by a hairline, so the
   column reads as one object with a beginning and an end rather than five grey
   tiles of slightly different sizes — which is what a page assembled from
   repeated card components always ends up looking like.
   The header sits outside the plane, so the panel starts at the region switch.
   Selectors are structural but fixed: the component always renders <header>
   first and the cards after it, and the last card always closes the plane. */
.dsm-workbuddy-xdpool-card{
  position:relative;
  border:0;
  border-top:1px solid var(--wbx-hairline);
  border-left:1px solid var(--wbx-hairline);
  border-right:1px solid var(--wbx-hairline);
  background:var(--wbx-surface-2);
  border-radius:0;
  box-shadow:none;
  display:flex;flex-direction:column;gap:14px;padding:18px 20px;
}
/* First section after the header opens the plane. */
.dsm-workbuddy-xdpool-page-head + .dsm-workbuddy-xdpool-card{
  border-top:0;
  border-top-left-radius:var(--wbx-r-lg);border-top-right-radius:var(--wbx-r-lg);
  box-shadow:inset 0 1px 0 var(--wbx-toplight);
}
/* Last section closes it. */
.dsm-workbuddy-xdpool-page > .dsm-workbuddy-xdpool-card:last-child{
  border-bottom:1px solid var(--wbx-hairline);
  border-bottom-left-radius:var(--wbx-r-lg);border-bottom-right-radius:var(--wbx-r-lg);
  box-shadow:inset 0 -1px 0 var(--wbx-toplight);
}
/* A section that starts a new topic group gets a little more air above it. */
.dsm-workbuddy-xdpool-accounts,
.dsm-workbuddy-xdpool-models{padding-top:20px}
.dsm-workbuddy-xdpool-status{gap:16px}

/* ── Region tabs ───────────────────────────────────────────────────────────
   A segmented control: recessed track, lifted chip. The dot carries health, so
   the tab itself never has to change colour. */
.dsm-workbuddy-xdpool-tabs{
  display:flex;gap:4px;padding:4px;
  border:1px solid var(--wbx-hairline-soft);border-radius:var(--wbx-r-md);
  background:var(--wbx-tabs-bg);
  box-shadow:inset 0 1px 2px rgba(0,0,0,calc(.22 * var(--wbx-shadow-a)));
}
.dsm-workbuddy-xdpool-tab{
  appearance:none;font:inherit;cursor:pointer;flex:1 1 0;min-width:0;border:0;border-radius:var(--wbx-r-sm);
  padding:7px 12px;color:var(--wbx-text-3);font-size:12.5px;font-weight:560;line-height:18px;
  background:transparent;display:inline-flex;align-items:center;justify-content:center;gap:7px;
  /* One line per tab: a wrapped label would outgrow the track and the whole
     control would jump when the region changes. */
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  transition:color .16s var(--wbx-ease),background .16s var(--wbx-ease),box-shadow .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-tab:hover:not(.dsm-workbuddy-xdpool-tab-active){color:var(--wbx-text-2)}
.dsm-workbuddy-xdpool-tab:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-tab-active{
  color:var(--wbx-text-1);
  background:var(--wbx-surface-3);
  box-shadow:inset 0 1px 0 var(--wbx-toplight),var(--wbx-shadow-sm);
}
.dsm-workbuddy-xdpool-tab-dot{
  display:inline-block;width:7px;height:7px;border-radius:50%;flex:none;
  background:var(--wbx-ok);
  box-shadow:0 0 0 3px color-mix(in oklab,var(--wbx-ok) 16%,transparent);
}
.dsm-workbuddy-xdpool-tab-dot[data-state="error"]{background:var(--wbx-err);box-shadow:0 0 0 3px color-mix(in oklab,var(--wbx-err) 16%,transparent)}
.dsm-workbuddy-xdpool-tab-dot[data-state="idle"]{background:var(--wbx-text-3);box-shadow:none}

/* ── Health line ───────────────────────────────────────────────────────────
   The one sentence the user came for. Sized above body copy; the dot does the
   "is it alive" work, so the text does not have to shout. */
.dsm-workbuddy-xdpool-usage-head{display:flex;flex-direction:column;gap:14px;min-width:0}
.dsm-workbuddy-xdpool-usage-copy{display:flex;flex-direction:column;gap:5px;min-width:0}
.dsm-workbuddy-xdpool-usage-status{
  display:flex;align-items:center;gap:10px;
  font-size:15px;font-weight:640;color:var(--wbx-text-1);letter-spacing:-.012em;
  text-wrap:balance;
}
.dsm-workbuddy-xdpool-usage-dot{
  width:9px;height:9px;border-radius:50%;flex:none;
  box-shadow:0 0 0 4px color-mix(in oklab,currentColor 14%,transparent);
}
.dsm-workbuddy-xdpool-usage-hint{margin:0;color:var(--wbx-text-3);font-size:12px;line-height:1.6;text-wrap:pretty}
/* An address, not prose. */
.dsm-workbuddy-xdpool-usage-hint code{font-family:var(--wbx-mono);font-size:11.5px}
.dsm-workbuddy-xdpool-usage-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}

/* ── Account-usage picker ──────────────────────────────────────────────────
   One row of equal chips; the row decides when it has to break. Selection is a
   lifted surface plus an inset accent bar — a tinted wash alone is
   indistinguishable from hover. */
.dsm-workbuddy-xdpool-dist{display:flex;flex-direction:column;gap:10px}
.dsm-workbuddy-xdpool-dist-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.dsm-workbuddy-xdpool-dist-title{
  color:var(--wbx-text-3);font-size:10.5px;line-height:16px;
  letter-spacing:.07em;text-transform:uppercase;font-weight:650;
}
/* "now: X" — echoes the selection below. A quiet outline, not a filled pill: as
   a filled pill it read as a second, competing control. */
.dsm-workbuddy-xdpool-dist-now{
  flex:none;padding:2px 10px;border-radius:999px;
  border:1px solid var(--wbx-hairline);background:transparent;
  color:var(--wbx-text-2);font-size:11.5px;font-weight:600;line-height:18px;white-space:nowrap;
}
.dsm-workbuddy-xdpool-dist-options{display:flex;flex-wrap:wrap;gap:8px}
.dsm-workbuddy-xdpool-dist-option{
  flex:1 1 116px;min-width:0;appearance:none;font:inherit;cursor:pointer;text-align:left;
  display:flex;flex-direction:column;justify-content:center;gap:3px;min-height:46px;
  border:1px solid var(--wbx-hairline-soft);border-radius:var(--wbx-r-md);padding:9px 12px;
  background:transparent;color:var(--wbx-text-3);
  transition:color .16s var(--wbx-ease),border-color .16s var(--wbx-ease),
             background .16s var(--wbx-ease),box-shadow .16s var(--wbx-ease),
             transform .1s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-dist-option:hover:not(:disabled):not(.dsm-workbuddy-xdpool-dist-option-active){
  color:var(--wbx-text-2);
  border-color:color-mix(in oklab,var(--wbx-text-3) 50%,transparent);
  background:color-mix(in oklab,var(--wbx-label) 4%,transparent);
}
.dsm-workbuddy-xdpool-dist-option:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-dist-option:active:not(:disabled){transform:translateY(.5px)}
.dsm-workbuddy-xdpool-dist-option-active{
  background:var(--wbx-surface-3);
  border-color:color-mix(in oklab,var(--wbx-text-1) 26%,transparent);
  box-shadow:inset 3px 0 0 var(--wbx-accent),inset 0 1px 0 var(--wbx-toplight),var(--wbx-shadow-sm);
  color:var(--wbx-text-1);
}
.dsm-workbuddy-xdpool-dist-option:disabled{cursor:default;opacity:.55}
.dsm-workbuddy-xdpool-dist-option-top{display:flex;align-items:center;gap:6px;min-width:0}
/* Wrapping beats ellipsis here: a truncated mode name is unreadable, a two-line
   one is merely taller. */
.dsm-workbuddy-xdpool-dist-option-name{font-size:12.5px;line-height:17px;font-weight:600;min-width:0;overflow-wrap:anywhere}
.dsm-workbuddy-xdpool-dist-option-badge{
  flex:none;margin-left:auto;padding:1px 6px;border-radius:999px;
  background:var(--wbx-ok-tint);color:var(--wbx-ok-pill-ink);
  font-size:9.5px;font-weight:680;line-height:15px;white-space:nowrap;letter-spacing:.02em;
}
/* One line of prose under the row explains the selected mode only. */
.dsm-workbuddy-xdpool-dist-hint{color:var(--wbx-text-3);font-size:11.5px;line-height:1.55;margin:0;text-wrap:pretty}

/* ── Section headers shared by the account / model / ignored cards ───────── */
.dsm-workbuddy-xdpool-accounts{gap:14px}
.dsm-workbuddy-xdpool-accounts-head,
.dsm-workbuddy-xdpool-models-head,
.dsm-workbuddy-xdpool-ignored-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dsm-workbuddy-xdpool-accounts-title,
.dsm-workbuddy-xdpool-models-title,
.dsm-workbuddy-xdpool-ignored-title{
  margin:0;color:var(--wbx-text-1);font-size:13.5px;font-weight:650;line-height:20px;letter-spacing:-.01em;
}
.dsm-workbuddy-xdpool-accounts-summary,
.dsm-workbuddy-xdpool-models-summary,
.dsm-workbuddy-xdpool-ignored-summary{margin:2px 0 0;color:var(--wbx-text-3);font-size:11.5px;line-height:18px}

/* ── The serving account ───────────────────────────────────────────────────
   A rule, not a box. A full rounded capsule here fought with the panel it sits
   in and made the section look like it had two headers; a left accent rule plus
   a soft wash says "this row is live" without adding another rectangle. */
.dsm-workbuddy-xdpool-current{
  display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:0;padding:8px 12px 8px 13px;
  border:0;
  border-left:3px solid var(--wbx-ok);
  border-radius:0 var(--wbx-r-sm) var(--wbx-r-sm) 0;
  background:linear-gradient(90deg,
    color-mix(in oklab,var(--wbx-ok) 9%,transparent),
    color-mix(in oklab,var(--wbx-ok) 2%,transparent) 60%,
    transparent);
}
.dsm-workbuddy-xdpool-current-dot{
  width:7px;height:7px;border-radius:50%;flex:none;background:var(--wbx-ok);
  box-shadow:0 0 0 3px color-mix(in oklab,var(--wbx-ok) 18%,transparent);
}
.dsm-workbuddy-xdpool-current-label{
  color:var(--wbx-ok-pill-ink);font-size:10.5px;line-height:18px;font-weight:680;
  letter-spacing:.06em;flex:none;text-transform:uppercase;
}
.dsm-workbuddy-xdpool-current-name{
  color:var(--wbx-text-1);font-size:12.5px;line-height:18px;font-weight:600;
  font-family:var(--wbx-mono);
  min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.dsm-workbuddy-xdpool-current-note{color:var(--wbx-warn-ink);font-size:11px;line-height:16px}

/* ── Account rows ──────────────────────────────────────────────────────────
   A row, not a nested card. The account list is already inside the panel, so an
   outlined, rounded, tinted box per account produced boxes inside boxes; here the
   account is defined by a hairline above it and its own header tone, which is
   enough to separate five accounts without five more rectangles.
   The first account drops its top rule, since the section heading already
   provides that edge. */
.dsm-workbuddy-xdpool-account{
  display:flex;flex-direction:column;gap:0;padding:12px 0 2px;
  border:0;
  border-top:1px solid var(--wbx-hairline-soft);
  border-radius:0;
  background:transparent;
  overflow:hidden;
}
.dsm-workbuddy-xdpool-account:first-of-type{border-top:0;padding-top:2px}
.dsm-workbuddy-xdpool-account-off{opacity:.52}
.dsm-workbuddy-xdpool-account-head{
  display:flex;align-items:center;gap:10px;min-width:0;padding:9px 2px;
  border-bottom:0;
  background:transparent;
}
.dsm-workbuddy-xdpool-account-label{
  color:var(--wbx-text-1);font-size:12.5px;font-weight:620;line-height:20px;
  font-family:var(--wbx-mono);letter-spacing:-.01em;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.dsm-workbuddy-xdpool-account-head .dsm-workbuddy-xdpool-account-toggle{margin-left:auto}
/* flex-wrap lets the credit panel drop below the identity block on a narrow
   card instead of squeezing both. */
.dsm-workbuddy-xdpool-account-body{display:flex;align-items:stretch;gap:0;flex-wrap:wrap}
.dsm-workbuddy-xdpool-account-copy{
  display:flex;flex-direction:column;align-items:flex-start;gap:7px;justify-content:center;
  flex:1 1 190px;max-width:min(100%,340px);min-width:0;
  padding:4px 16px 12px 2px;background:transparent;
}

/* Small pill switch: "in rotation" vs "off". */
.dsm-workbuddy-xdpool-account-toggle{
  appearance:none;font:inherit;display:inline-flex;align-items:center;gap:5px;cursor:pointer;flex:none;
  border:1px solid var(--wbx-hairline);border-radius:999px;padding:3px 10px;
  font-size:11px;line-height:17px;background:transparent;color:var(--wbx-text-3);
  transition:color .16s var(--wbx-ease),border-color .16s var(--wbx-ease),background .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-account-toggle:hover:not(:disabled){color:var(--wbx-text-1);border-color:color-mix(in oklab,var(--wbx-text-3) 55%,transparent)}
.dsm-workbuddy-xdpool-account-toggle:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-account-toggle:disabled{cursor:default;opacity:.6}
.dsm-workbuddy-xdpool-account-toggle-on{
  background:color-mix(in oklab,var(--wbx-ok) 12%,transparent);
  border-color:color-mix(in oklab,var(--wbx-ok) 44%,transparent);
  color:var(--wbx-ok-pill-ink);font-weight:620;
}
.dsm-workbuddy-xdpool-account-toggle-dot{width:6px;height:6px;border-radius:50%;flex:none;background:currentColor;opacity:.9}
/* "Remove": destructive but reversible, so quiet until hovered. */
.dsm-workbuddy-xdpool-account-ignore{
  appearance:none;font:inherit;flex:none;cursor:pointer;border:1px solid transparent;border-radius:999px;
  padding:3px 10px;font-size:11px;line-height:17px;background:transparent;color:var(--wbx-text-3);
  transition:color .16s var(--wbx-ease),border-color .16s var(--wbx-ease),background .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-account-ignore:hover:not(:disabled){
  color:var(--wbx-err-ink);border-color:color-mix(in oklab,var(--wbx-err) 40%,transparent);
  background:color-mix(in oklab,var(--wbx-err) 8%,transparent);
}
.dsm-workbuddy-xdpool-account-ignore:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-account-ignore:disabled{cursor:default;opacity:.6}

/* ── State pills ───────────────────────────────────────────────────────────
   One vocabulary for every account/model state. The ink is the deep pill tone,
   not the fill: these sit on tinted backgrounds. */
.dsm-workbuddy-xdpool-account-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dsm-workbuddy-xdpool-account-tag{
  padding:1px 8px;border-radius:999px;font-size:10.5px;line-height:18px;font-weight:620;
  background:var(--wbx-ok-tint);color:var(--wbx-ok-pill-ink);
}
.dsm-workbuddy-xdpool-account-tag-cooling{background:var(--wbx-warn-tint);color:var(--wbx-warn-pill-ink)}
/* A rejected sign-in is red, not amber: waiting will not clear it, and it is the
   one state where the user has to go do something. */
.dsm-workbuddy-xdpool-account-tag-error,
.dsm-workbuddy-xdpool-account-tag-dead{background:var(--wbx-err-tint);color:var(--wbx-err-pill-ink)}
.dsm-workbuddy-xdpool-account-meta{
  color:var(--wbx-text-3);font-size:11px;line-height:18px;
  display:flex;flex-wrap:wrap;gap:10px;font-variant-numeric:tabular-nums;
}
.dsm-workbuddy-xdpool-account-meta-dead{color:var(--wbx-err-ink)}
.dsm-workbuddy-xdpool-account-modelcool{display:flex;flex-wrap:wrap;gap:6px;margin-top:1px}
.dsm-workbuddy-xdpool-account-modelcool-chip{
  display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:999px;
  font-size:10.5px;line-height:18px;
  background:var(--wbx-warn-tint);color:var(--wbx-warn-pill-ink);
}
/* The way out, not a second problem: keeps the warning hue, drops the weight. */
.dsm-workbuddy-xdpool-account-modelcool-twin{color:var(--wbx-text-2);cursor:help}
.dsm-workbuddy-xdpool-account-error{margin:0;color:var(--wbx-err-ink);font-size:12px;line-height:20px}

/* ── Credit panel ──────────────────────────────────────────────────────────
   Packages on the left, the total on the right, split by a vertical hairline.
   No border-top: the panel starts beside the identity block, so a top rule would
   cut straight across the middle of the card. */
.dsm-workbuddy-xdpool-stats{
  display:grid;grid-template-columns:minmax(0,1fr) minmax(170px,.72fr);gap:0;
  flex:1 1 330px;min-width:0;max-width:100%;
  /* The grid is the last element in the row, so its tinted column would sit on
     the panel perimeter; a small right inset keeps the plane unbroken. */
  padding-right:2px;
}
.dsm-workbuddy-xdpool-panel{display:flex;flex-direction:column;min-width:0;gap:7px;padding:13px 15px}
.dsm-workbuddy-xdpool-panel + .dsm-workbuddy-xdpool-panel{border-left:1px solid var(--wbx-hairline-soft)}
.dsm-workbuddy-xdpool-panel-total{border-radius:var(--wbx-r-sm)}
.dsm-workbuddy-xdpool-panel-title{
  color:var(--wbx-text-3);font-size:10.5px;line-height:16px;
  letter-spacing:.07em;text-transform:uppercase;font-weight:650;
}
.dsm-workbuddy-xdpool-panel-empty{color:var(--wbx-text-3);font-size:13px;line-height:20px}
.dsm-workbuddy-xdpool-panel-error{color:var(--wbx-err-ink);font-size:11px;line-height:18px;word-break:break-word}
/* A rejected sign-in gets a compact chip: the upstream paragraph is long, and
   printed inline it pushed the neighbouring total off screen. */
.dsm-workbuddy-xdpool-panel-error-dead{
  display:inline-flex;align-items:center;align-self:flex-start;padding:1px 8px;border-radius:999px;
  background:var(--wbx-err-tint);color:var(--wbx-err-pill-ink);
  font-size:10.5px;line-height:18px;white-space:nowrap;cursor:help;
}
.dsm-workbuddy-xdpool-panel-packages{display:flex;flex-direction:column;gap:7px;min-width:0}
.dsm-workbuddy-xdpool-panel-foot{
  display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:9px;padding-top:9px;
  border-top:1px solid var(--wbx-hairline-soft);color:var(--wbx-text-2);font-size:11.5px;line-height:18px;
}
.dsm-workbuddy-xdpool-panel-foot strong{color:var(--wbx-text-1);font-size:15px;font-variant-numeric:tabular-nums}
/* One credit package: name + amount on the first line, its deadline beneath. A
   two-row grid keeps the amounts aligned across rows. */
.dsm-workbuddy-xdpool-packages{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}
.dsm-workbuddy-xdpool-packages li{
  display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:10px;row-gap:1px;align-items:baseline;
  color:var(--wbx-text-2);font-size:11.5px;line-height:18px;
}
.dsm-workbuddy-xdpool-packages-name{grid-column:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-workbuddy-xdpool-packages-value{
  grid-column:2;justify-self:end;color:var(--wbx-text-1);font-size:11.5px;font-weight:600;
  font-variant-numeric:tabular-nums;
}
/* Per-package deadline folds onto its own line; imminent ones are tinted. */
.dsm-workbuddy-xdpool-packages-when{grid-column:1/-1;color:var(--wbx-text-3);font-size:10.5px;line-height:15px;font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-packages-when-soon{color:var(--wbx-warn-ink)}

/* The headline. The only large type on the page, over a soft wash of the state
   hue and nothing else competing. */
.dsm-workbuddy-xdpool-panel-total{
  position:relative;align-items:center;text-align:center;justify-content:center;
  background:
    radial-gradient(140% 100% at 50% 0%,color-mix(in oklab,var(--wbx-ok) 9%,transparent),transparent 72%),
    transparent;
}
.dsm-workbuddy-xdpool-total-value{
  color:var(--wbx-ok-ink);font-size:32px;line-height:36px;font-weight:780;letter-spacing:-.035em;
  white-space:nowrap;font-variant-numeric:tabular-nums;
  text-shadow:0 1px 12px color-mix(in oklab,var(--wbx-ok) calc(24% * var(--wbx-shadow-a)),transparent);
}

/* Check-in, docked under the total. */
.dsm-workbuddy-xdpool-checkin{
  display:flex;flex-direction:column;align-items:center;gap:7px;width:100%;
  margin-top:10px;padding-top:11px;border-top:1px solid var(--wbx-hairline-soft);
}
.dsm-workbuddy-xdpool-checkin-meta{display:flex;flex-direction:column;align-items:center;gap:2px;width:100%}
.dsm-workbuddy-xdpool-checkin-streak{color:var(--wbx-text-2);font-size:11.5px;line-height:17px;font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-checkin-daily{color:var(--wbx-ok-ink);font-size:11px;line-height:16px;font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-checkin-bonus{
  padding:1px 8px;border-radius:999px;font-size:10.5px;line-height:16px;text-align:center;
  background:var(--wbx-ok-tint);color:var(--wbx-ok-pill-ink);
}
.dsm-workbuddy-xdpool-checkin-btn{
  width:100%;padding:6px 10px;border-radius:var(--wbx-r-sm);border:1px solid transparent;
  font:inherit;font-size:12px;font-weight:650;line-height:18px;cursor:pointer;
  background:var(--wbx-ok-fill);color:var(--wbx-on-fill);
  transition:opacity .16s var(--wbx-ease),background .16s var(--wbx-ease),transform .1s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-checkin-btn:hover:not(:disabled){opacity:.88}
.dsm-workbuddy-xdpool-checkin-btn:active:not(:disabled){transform:translateY(.5px)}
.dsm-workbuddy-xdpool-checkin-btn:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-checkin-btn:disabled{cursor:default;background:transparent;border-color:var(--wbx-hairline);color:var(--wbx-text-3);opacity:1}
.dsm-workbuddy-xdpool-checkin-error{color:var(--wbx-err-ink);font-size:10.5px;line-height:16px;text-align:center;word-break:break-word}

/* ── Removed accounts ──────────────────────────────────────────────────────
   Visible proof that "remove" can be undone. */
.dsm-workbuddy-xdpool-ignored-list{display:flex;flex-direction:column;margin-top:-4px}
.dsm-workbuddy-xdpool-ignored-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0}
.dsm-workbuddy-xdpool-ignored-row + .dsm-workbuddy-xdpool-ignored-row{border-top:1px solid var(--wbx-hairline-soft)}
.dsm-workbuddy-xdpool-ignored-label{
  color:var(--wbx-text-2);font-size:11.5px;line-height:18px;font-family:var(--wbx-mono);
  min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.dsm-workbuddy-xdpool-ignored-restore{
  appearance:none;font:inherit;flex:none;cursor:pointer;border:1px solid var(--wbx-hairline);border-radius:999px;
  padding:3px 10px;font-size:11px;line-height:17px;background:transparent;color:var(--wbx-text-2);
  transition:color .16s var(--wbx-ease),border-color .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-ignored-restore:hover:not(:disabled){color:var(--wbx-text-1);border-color:color-mix(in oklab,var(--wbx-text-3) 55%,transparent)}
.dsm-workbuddy-xdpool-ignored-restore:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-ignored-restore:disabled{cursor:default;opacity:.6}

/* ── Model directory ───────────────────────────────────────────────────────
   A table, not a stack of cards: rows separated by hairlines, the id monospace
   and quiet, hover lifts one row at a time. The list has no perimeter of its own
   — the section already provides it, and a boxed list inside a boxed section is
   the nesting this redesign exists to remove. */
.dsm-workbuddy-xdpool-models{gap:12px}
.dsm-workbuddy-xdpool-models-heading{display:flex;flex-direction:column;gap:2px;min-width:0}
.dsm-workbuddy-xdpool-models-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
/* "built-in list (offline)": the user is looking at a SHORTER roster than the
   gateway offers, so this is a warning tint, not a neutral chip. */
.dsm-workbuddy-xdpool-catalog-offline{
  flex:none;padding:2px 9px;border-radius:999px;font-size:10.5px;line-height:17px;font-weight:650;
  background:var(--wbx-warn-tint);color:var(--wbx-warn-pill-ink);white-space:nowrap;
}
.dsm-workbuddy-xdpool-model-list{
  display:flex;flex-direction:column;border:0;
  border-top:1px solid var(--wbx-hairline-soft);
  border-bottom:1px solid var(--wbx-hairline-soft);
  border-radius:0;overflow:hidden;
  background:transparent;
}
.dsm-workbuddy-xdpool-model{
  display:grid;grid-template-columns:minmax(0,1fr);gap:6px;padding:10px 2px;
  background:transparent;
  transition:background .16s var(--wbx-ease),opacity .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-model:hover{background:color-mix(in oklab,var(--wbx-label) 4%,transparent)}
.dsm-workbuddy-xdpool-model + .dsm-workbuddy-xdpool-model{border-top:1px solid var(--wbx-hairline-soft)}
.dsm-workbuddy-xdpool-model-off{opacity:.5}
.dsm-workbuddy-xdpool-model-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;flex-wrap:wrap}
.dsm-workbuddy-xdpool-model-copy{display:flex;align-items:baseline;gap:8px;min-width:0;flex-wrap:wrap}
.dsm-workbuddy-xdpool-model-name{
  display:inline-flex;align-items:baseline;gap:7px;color:var(--wbx-text-1);
  font-size:12.5px;font-weight:580;line-height:19px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.dsm-workbuddy-xdpool-model-name-rate{
  color:var(--wbx-text-3);font-size:10.5px;font-weight:400;line-height:16px;flex:none;
  font-variant-numeric:tabular-nums;
}
/* The id is what the user copies into a config, so it keeps its contrast. */
.dsm-workbuddy-xdpool-model-id{
  color:var(--wbx-text-3);font-size:10.5px;line-height:16px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--wbx-mono);
}
.dsm-workbuddy-xdpool-model-meta{
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  color:var(--wbx-text-3);font-size:10.5px;line-height:16px;
}
.dsm-workbuddy-xdpool-model-meta-tag{
  padding:1px 8px;border-radius:999px;font-size:10.5px;line-height:16px;font-weight:520;
  /* A NEUTRAL wash decoded from the label's own polarity: on light the chip sits
     on a grey card and needs a slightly darker fill; on dark it needs a slightly
     lighter one. --wbx-chip-bg is calibrated per theme for exactly this, because
     a wash of text-1 or text-2 resolves the wrong way in the other theme. */
  background:var(--wbx-chip-bg);color:var(--wbx-text-1);
}
/* "free from HH:00": quieter than a badge on purpose — the model costs credits
   right now, so it must not read as a promo the user can spend against. */
.dsm-workbuddy-xdpool-model-meta-later{
  padding:1px 8px;border-radius:999px;font-size:10.5px;line-height:16px;
  border:1px dashed color-mix(in oklab,var(--wbx-text-3) 46%,transparent);color:var(--wbx-text-3);
}
/* "活动至 10-31": context for planning, not a claim about the current price. */
.dsm-workbuddy-xdpool-model-meta-promo{color:var(--wbx-text-3);font-size:10.5px;line-height:16px;opacity:.9}
/* "付费同款 …": the way out when the free row is rate-limited. */
.dsm-workbuddy-xdpool-model-meta-twin{color:var(--wbx-text-3);font-size:10.5px;line-height:16px;opacity:.9;cursor:help}
.dsm-workbuddy-xdpool-model-cap{color:var(--wbx-text-3);font-size:10.5px;line-height:16px;font-variant-numeric:tabular-nums}
/* Model row controls: checkbox + image toggle + context-budget radios. */
.dsm-workbuddy-xdpool-model-check{display:flex;align-items:center;gap:8px;min-width:0;flex:1;cursor:pointer}
.dsm-workbuddy-xdpool-model-check input{margin:0;accent-color:var(--wbx-brand);flex:none}
.dsm-workbuddy-xdpool-model-controls{display:flex;align-items:center;gap:10px;flex:none;flex-wrap:wrap;justify-content:flex-end}
.dsm-workbuddy-xdpool-model-image{display:inline-flex;align-items:center;gap:5px;flex:none;cursor:pointer;color:var(--wbx-text-2);font-size:10.5px;line-height:16px}
.dsm-workbuddy-xdpool-model-image input{margin:0;accent-color:var(--wbx-brand)}
.dsm-workbuddy-xdpool-model-budget{
  display:flex;align-items:center;gap:9px;flex:none;margin:0;padding:0;border:0;
  color:var(--wbx-text-2);font-size:10.5px;line-height:16px;
}
.dsm-workbuddy-xdpool-model-budget label{display:inline-flex;align-items:center;gap:4px;cursor:pointer}
.dsm-workbuddy-xdpool-model-budget input{margin:0;accent-color:var(--wbx-brand)}

/* Unreadable credential files: a warning tint, since it explains a smaller pool
   and "encrypted" is actionable (start the app once). */
.dsm-workbuddy-xdpool-skipped{
  display:flex;flex-direction:column;gap:3px;margin:0;padding:9px 12px;border-radius:var(--wbx-r-sm);
  background:var(--wbx-warn-tint);
}
.dsm-workbuddy-xdpool-skipped-summary{margin:0;font-size:11.5px;line-height:18px;font-weight:650;color:var(--wbx-warn-pill-ink)}
.dsm-workbuddy-xdpool-skipped-row{
  margin:0;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;
  font-size:10.5px;line-height:16px;
}
.dsm-workbuddy-xdpool-skipped-file{
  font-family:var(--wbx-mono);color:color-mix(in oklab, var(--wbx-text-1) 80%, var(--wbx-warn-tint));
  max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.dsm-workbuddy-xdpool-skipped-reason{color:color-mix(in oklab, var(--wbx-text-1) 72%, var(--wbx-warn-tint))}

/* ── Automation ────────────────────────────────────────────────────────────
   A recessed well inside its card: schedule and last-run summary, behind a
   switch. Inset shadow, not a border, so it reads as "deeper" rather than as
   another card. */
.dsm-workbuddy-xdpool-auto{
  margin-top:0;padding:13px 14px;border:1px solid var(--wbx-hairline-soft);border-radius:var(--wbx-r-md);
  background:transparent;
  padding:13px 0 2px;border:0;border-top:1px solid var(--wbx-hairline-soft);border-radius:0;
  box-shadow:none;
}
.dsm-workbuddy-xdpool-auto-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dsm-workbuddy-xdpool-auto-title{color:var(--wbx-text-1);font-size:12px;font-weight:650}
.dsm-workbuddy-xdpool-auto-run{flex:none}
.dsm-workbuddy-xdpool-auto-switch{
  padding:3px 12px;border:1px solid var(--wbx-hairline);border-radius:999px;background:transparent;
  font:inherit;color:var(--wbx-text-2);font-size:11.5px;cursor:pointer;
  transition:color .16s var(--wbx-ease),border-color .16s var(--wbx-ease),background .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-auto-switch:hover:not(:disabled){border-color:color-mix(in oklab,var(--wbx-text-3) 55%,transparent);color:var(--wbx-text-1)}
.dsm-workbuddy-xdpool-auto-switch:disabled{opacity:.5;cursor:not-allowed}
.dsm-workbuddy-xdpool-auto-switch-on{
  border-color:color-mix(in oklab,var(--wbx-ok) 50%,transparent);
  color:var(--wbx-ok-pill-ink);background:color-mix(in oklab,var(--wbx-ok) 11%,transparent);
}
.dsm-workbuddy-xdpool-auto-hint{margin:6px 0 0;color:var(--wbx-text-2);font-size:11.5px;line-height:1.6}
.dsm-workbuddy-xdpool-auto-total{
  display:flex;flex-direction:column;gap:4px;margin-top:9px;padding:8px 10px;
  border-radius:var(--wbx-r-sm);background:color-mix(in oklab,var(--wbx-ok) 7%,var(--wbx-surface-2));
  font-size:10.5px;
}
.dsm-workbuddy-xdpool-auto-total-label{color:var(--wbx-text-2);font-size:11.5px}
.dsm-workbuddy-xdpool-auto-total-list{display:flex;flex-direction:column;gap:2px}
.dsm-workbuddy-xdpool-auto-total-row{color:var(--wbx-ok-ink);font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-auto-jobs{margin-top:9px;display:flex;flex-direction:column;gap:5px}
.dsm-workbuddy-xdpool-auto-job{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11.5px;color:var(--wbx-text-2)}
.dsm-workbuddy-xdpool-auto-job-name{flex:0 0 auto;min-width:72px;color:var(--wbx-text-1);font-weight:560}
.dsm-workbuddy-xdpool-auto-job-when{flex:1 1 auto;color:var(--wbx-text-2);font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-auto-job-last{flex:0 0 auto;text-align:right;color:var(--wbx-text-2);font-variant-numeric:tabular-nums;white-space:nowrap}
.dsm-workbuddy-xdpool-auto-job-note{flex:0 0 auto;color:var(--wbx-text-2)}
.dsm-workbuddy-xdpool-auto-job-detail{grid-column:1/-1;color:var(--wbx-text-3);font-size:10.5px;line-height:16px}
.dsm-workbuddy-xdpool-earned{
  display:flex;flex-direction:column;gap:4px;margin-top:8px;padding-top:8px;
  border-top:1px dashed var(--wbx-hairline-soft);font-size:10.5px;
}
.dsm-workbuddy-xdpool-earned-label{color:var(--wbx-text-2);font-size:11.5px}
.dsm-workbuddy-xdpool-earned-list{display:flex;flex-direction:column;gap:2px}
.dsm-workbuddy-xdpool-earned-row{color:var(--wbx-ok-ink);font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-earned-value{color:var(--wbx-ok-ink);font-weight:650;font-variant-numeric:tabular-nums}

/* Reserved credits: one inline number field per account. An explicit Save
   commits the draft — blur must not silently rewrite a credit floor. */
.dsm-workbuddy-xdpool-reserve{
  display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px;padding-top:8px;
  border-top:1px dashed var(--wbx-hairline-soft);font-size:10.5px;color:var(--wbx-text-3);
}
.dsm-workbuddy-xdpool-reserve-label{flex:0 0 auto}
.dsm-workbuddy-xdpool-reserve-input{
  width:84px;padding:3px 8px;border:1px solid var(--wbx-hairline);border-radius:7px;background:transparent;
  color:var(--wbx-text-1);font:inherit;font-size:10.5px;font-variant-numeric:tabular-nums;
  transition:border-color .16s var(--wbx-ease),background .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-reserve-input:focus{outline:none;border-color:var(--wbx-ok);background:color-mix(in oklab,var(--wbx-ok) 6%,transparent)}
.dsm-workbuddy-xdpool-reserve-input:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-reserve-input:disabled{opacity:.6}
.dsm-workbuddy-xdpool-reserve-unit{flex:0 0 auto}
.dsm-workbuddy-xdpool-reserve-badge{
  flex:0 0 auto;padding:1px 7px;border-radius:999px;background:var(--wbx-err-tint);
  color:var(--wbx-err-pill-ink);font-size:10px;
}
.dsm-workbuddy-xdpool-reserve-save{
  flex:0 0 auto;appearance:none;font:inherit;font-size:10.5px;font-weight:650;line-height:16px;
  padding:3px 12px;border-radius:7px;
  border:1px solid color-mix(in oklab,var(--wbx-ok) 48%,transparent);
  background:color-mix(in oklab,var(--wbx-ok) 12%,transparent);
  color:var(--wbx-ok-pill-ink);cursor:pointer;
  transition:opacity .16s var(--wbx-ease),background .16s var(--wbx-ease),
             border-color .16s var(--wbx-ease),color .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-reserve-save:hover:not(:disabled){background:color-mix(in oklab,var(--wbx-ok) 20%,transparent);border-color:var(--wbx-ok)}
.dsm-workbuddy-xdpool-reserve-save:disabled{cursor:default;border-color:var(--wbx-hairline);background:transparent;color:var(--wbx-text-3);opacity:.75}
.dsm-workbuddy-xdpool-reserve-note{flex:0 0 auto;font-size:10.5px;line-height:16px}
.dsm-workbuddy-xdpool-reserve-note-ok{color:var(--wbx-ok-ink)}
.dsm-workbuddy-xdpool-reserve-note-bad{color:var(--wbx-err-ink);font-weight:650}

/* ── Empty-region guide ────────────────────────────────────────────────────
   A numbered "how to sign in" block: this is the first screen a new user sees,
   so it is structured as steps rather than prose. */
.dsm-workbuddy-xdpool-empty{gap:12px}
.dsm-workbuddy-xdpool-empty-title{margin:0;color:var(--wbx-text-1);font-size:13.5px;font-weight:650;line-height:20px}
.dsm-workbuddy-xdpool-empty-steps{
  display:flex;flex-direction:column;gap:6px;padding:13px;border-radius:var(--wbx-r-md);
  background:color-mix(in oklab,var(--wbx-label) 4%,transparent);
  border:1px solid var(--wbx-hairline-soft);
}
.dsm-workbuddy-xdpool-empty-steps-title{margin:0;color:var(--wbx-text-2);font-size:11.5px;font-weight:650;line-height:18px}
.dsm-workbuddy-xdpool-empty-list{
  margin:0;padding-left:20px;display:flex;flex-direction:column;gap:5px;
  color:var(--wbx-text-3);font-size:11.5px;line-height:18px;
}
.dsm-workbuddy-xdpool-empty-list li{min-width:0}
.dsm-workbuddy-xdpool-empty-note{margin:0;color:var(--wbx-text-3);font-size:10.5px;line-height:17px}

/* Inline notes. */
.dsm-workbuddy-xdpool-note{margin:0;color:var(--wbx-text-3);font-size:12px;line-height:20px}
.dsm-workbuddy-xdpool-error{margin:0;color:var(--wbx-err-ink);font-size:12px;line-height:20px}

/* ── Responsive ────────────────────────────────────────────────────────────
   Below 760px the credit grid stacks, the chips stop reserving desktop height,
   and the check-in column goes flush left with the rest of the copy. */
@media (max-width:760px){
  .dsm-workbuddy-xdpool-page{gap:13px}
  .dsm-workbuddy-xdpool-card{padding:14px}
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
 * ── Theme calibration ─────────────────────────────────────────────────────
 *
 * Light is the BASE (every token above is tuned for it) and dark overrides the
 * same tokens — the direction DSH itself publishes them in: the theme presenter
 * writes html{color-scheme} for the UA chrome and *adds* the
 * body[data-ds-dark-theme] attribute when the resolved scheme is dark, then
 * lets this card follow. Every --dsw-* stylesheet in the harness is written the
 * same way: a dark attribute block over a light base.
 *
 * Deliberately NOT prefers-color-scheme: DSH lets the user pin light or dark
 * independently of the OS, so with the OS on light and DSH pinned to dark a
 * media query would paint these panels light inside a dark page — exactly the
 * bug this block fixes. "system" is the only preference that follows the OS, and
 * the host has already resolved it into the attribute by the time this CSS
 * applies. If the attribute ever disappears, the light tuning lands on a dark
 * page and the panels merely read one step brighter; the inverse (light panels
 * that vanish into a white page) is what we cannot afford.
 *
 * Token values, straight from the harness stylesheet:
 *
 *            layer-1/2/3            border-l2      label-primary
 *   light    #fff  #fff  #fff        #0000001a      #0f1115
 *   dark     #232324 #2c2c2e #353638 #ffffff1f      #f9fafb
 *
 * Hence the 12% light lift: on white, 7% lands on ~#f7f7f8, which is not a step
 * at all. On dark, layer-2 is already #2c2c2e, so 12% would wash the panel out
 * and 7% is a clean step.
 */
body[data-ds-dark-theme] .dsm-workbuddy-xdpool-page,
html[data-ds-dark-theme] .dsm-workbuddy-xdpool-page{
  --wbx-label:var(--dsw-alias-label-primary,#f9fafb);
  --wbx-text-2:var(--dsw-alias-label-secondary,#cfd3d6);
  --wbx-text-3:var(--dsw-alias-label-tertiary,#adb2b8);
  --wbx-border:var(--dsw-alias-border-l2,#ffffff1f);
  --wbx-surface-1:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base,#232324));
  --wbx-lift:7%;
  --wbx-surface-2:var(--dsw-alias-bg-layer-2,#2c2c2e);
  --wbx-surface-sunk:color-mix(in oklab, var(--wbx-label) 6%, var(--wbx-surface-2));
  /* On dark the raised end of the scale IS the label-derived step. */
  --wbx-surface-3:color-mix(in oklab, var(--dsw-alias-bg-layer-3,#353638), var(--wbx-label) 14%);
  --wbx-line:72%;
  --wbx-line-soft:42%;
  --wbx-tabs-bg:color-mix(in oklab, var(--wbx-surface-1) 70%, var(--wbx-surface-2));
  --wbx-chip-bg:color-mix(in oklab, var(--wbx-label) 7%, var(--wbx-surface-2));
  --wbx-toplight:color-mix(in oklab, var(--wbx-label) 7%, transparent);
  --wbx-shadow-a:1;
  /* The bright state colours ARE the legible ones on a dark card, so the inks
     move much less toward the label than they do on paper. */
  --wbx-ok-ink:color-mix(in oklab, var(--wbx-ok), var(--wbx-label) 26%);
  --wbx-warn-ink:color-mix(in oklab, var(--wbx-warn), var(--wbx-label) 34%);
  --wbx-err-ink:color-mix(in oklab, var(--wbx-err), var(--wbx-label) 22%);
  --wbx-ok-pill-ink:color-mix(in oklab, var(--wbx-ok), var(--wbx-label) 40%);
  --wbx-warn-pill-ink:color-mix(in oklab, var(--wbx-warn), var(--wbx-label) 52%);
  --wbx-err-pill-ink:color-mix(in oklab, var(--wbx-err), var(--wbx-label) 46%);
  --wbx-ok-fill:var(--wbx-ok);
  --wbx-on-fill:var(--dsw-alias-label-primary-foreground,#0f1115);
}

/* Old engines without color-mix: every derived surface collapses to the host's
   own flat layer, which still reads as a panel because the hairline and the
   highlight survive. Both themes need the reset — the dark block derives its
   surfaces with color-mix too, so it would otherwise compute to nothing. */
@supports not (background:color-mix(in oklab,#000,#fff)){
  .dsm-workbuddy-xdpool-page{
    --wbx-surface-2:var(--dsw-alias-bg-layer-2,#fff);
    --wbx-surface-3:var(--dsw-alias-bg-layer-3,#fff);
    --wbx-text-3:var(--dsw-alias-label-tertiary,#81858c);
    --wbx-hairline:var(--wbx-border);
    --wbx-hairline-soft:var(--wbx-border);
    --wbx-tabs-bg:var(--wbx-surface-1);
    --wbx-toplight:transparent;
  }
  body[data-ds-dark-theme] .dsm-workbuddy-xdpool-page,
  html[data-ds-dark-theme] .dsm-workbuddy-xdpool-page{
    --wbx-surface-2:var(--dsw-alias-bg-layer-2,#2c2c2e);
    --wbx-surface-3:var(--dsw-alias-bg-layer-3,#353638);
    --wbx-text-3:var(--dsw-alias-label-tertiary,#adb2b8);
    --wbx-tabs-bg:var(--wbx-surface-1);
  }
}
`.trim()
