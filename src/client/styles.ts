/**
 * Client styles for the WorkBuddy XD Pool card.
 *
 * The card uses the same dark-theme token vocabulary as the built-in plugin
 * cards (`--dsw-alias-*`), so the pooled account and model directory sit
 * naturally next to the other configuration rows instead of looking like a
 * bright Google-Material block on top of DSH's dark surface.
 *
 * The page renders at full height with no collapse affordance, and its content is
 * split into cards: a header row with the primary actions, a status card (region
 * switch + distribution), then one card per feature area. The inner
 * workbuddy-specific classes are namespaced `dsm-workbuddy-xdpool-*`.
 *
 * Visual language, in one paragraph: every surface is a *layer* (layer-1 shell,
 * layer-2 cards, layer-3 raised chip), never a flat rectangle with a border. A
 * 1px top highlight plus a soft drop shadow is what makes a card read as lifted
 * rather than outlined; the accent (this card's own neutral "current" bar, the
 * health green, the warning amber) is spent only on state, never decoration.
 * Numbers are tabular and sized by importance, so the two things a user actually
 * comes here for — how many credits are left, and whether the pool is healthy —
 * are legible at a glance without reading a sentence.
 *
 * @module dsh-workbuddy-xdpool/client/styles
 */

export const POOL_CARD_CSS = `
/*
 * ── Design tokens ─────────────────────────────────────────────────────────
 * Every surface is derived RELATIVE to the host's own tokens instead of being
 * pinned to a dark literal, because DSH ships a light theme as well as a dark
 * one and a hard-coded #232529 card renders as a grey block on a white page.
 *
 * The trick is the direction of each relationship, not the colour:
 *   - a card is the page surface nudged toward the label colour (so it lifts on
 *     dark AND recedes correctly on light);
 *   - a raised chip is one more step in the same direction;
 *   - the top highlight is the label colour at very low alpha (white-ish on a
 *     dark theme, ink-ish on a light one);
 *   - shadows stay neutral black, only their alpha changes.
 * --wbx-on-light is a 0/1 switch flipped by the media query at the bottom of
 * this file, for the two places where the alpha really does have to differ.
 */
.dsm-workbuddy-xdpool-page{
  --wbx-label:var(--dsw-alias-label-primary,#e6e6e6);
  --wbx-text-1:var(--wbx-label);
  --wbx-text-2:var(--dsw-alias-label-secondary,#c6c9d0);
  --wbx-text-3:var(--dsw-alias-label-tertiary,#9aa0a8);
  --wbx-border:var(--dsw-alias-border-l2,#3a3d45);
  /* page surface = whatever the shell already paints behind us */
  --wbx-surface-1:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base,#1c1e22));
  /* A card is the layer-2 surface pushed toward the label colour. The WEIGHT
     form matters: 'color-mix(A 100%, B 6%)' renormalises to a 3% blend, which is
     invisible on a white page — the plain 'color-mix(A, B 7%)' is a real 7% step. */
  --wbx-surface-2:color-mix(in oklab, var(--dsw-alias-bg-layer-2,#232529), var(--wbx-label) 7%);
  /* raised chip / header strip: one more step in the same direction */
  --wbx-surface-3:color-mix(in oklab, var(--dsw-alias-bg-layer-3,#2a2c33), var(--wbx-label) 14%);
  /* recessed track (tabs, wells): away from the label */
  --wbx-well:color-mix(in oklab, var(--wbx-surface-2), transparent 35%);
  --wbx-hairline:color-mix(in oklab, var(--wbx-border) 72%, transparent);
  --wbx-hairline-soft:color-mix(in oklab, var(--wbx-border) 42%, transparent);
  --wbx-toplight:color-mix(in oklab, var(--wbx-label) 7%, transparent);
  --wbx-shadow:0 1px 2px rgba(0,0,0,calc(.2 * var(--wbx-on-light,1))),0 6px 18px -12px rgba(0,0,0,calc(.45 * var(--wbx-on-light,1)));
  --wbx-accent:var(--wbx-label);
  --wbx-ok:var(--dsw-alias-state-success-primary,#22a06b);
  --wbx-warn:var(--dsw-alias-state-warning-primary,#d97706);
  --wbx-err:var(--dsw-alias-state-error-primary,#ef4444);
  --wbx-brand:var(--dsw-alias-brand-primary,#5686fe);
  --wbx-radius:14px;
  --wbx-ease:cubic-bezier(.2,.7,.3,1);
}

/*
 * Page shell. The settings shell renders this inside its own scrollable content
 * column, so the page supplies only the rhythm and the cards — no outer border
 * and no extra margin (the column pads its own edges).
 */
.dsm-workbuddy-xdpool-page{max-width:860px;flex-direction:column;gap:14px;display:flex}

/*
 * Header row: identity on the left, primary actions on the right. Wraps so a
 * narrow panel drops the buttons below the title instead of squeezing it.
 */
.dsm-workbuddy-xdpool-page-head{align-items:center;gap:13px;flex-wrap:wrap;display:flex;padding:2px 2px 6px}
/* The plugin mark sits on its own raised tile, so the header has a fixed visual
   anchor even when the title wraps to two lines. */
.dsm-workbuddy-xdpool-page-icon{
  width:34px;height:34px;flex:none;border-radius:10px;
  border:1px solid var(--wbx-hairline);
  background:linear-gradient(180deg,var(--wbx-surface-3),var(--wbx-surface-2));
  box-shadow:inset 0 1px 0 var(--wbx-toplight),var(--wbx-shadow);
}
.dsm-workbuddy-xdpool-page-copy{flex-direction:column;gap:3px;min-width:0;flex:1 1 220px;display:flex}
.dsm-workbuddy-xdpool-page-title{margin:0;color:var(--wbx-text-1);font-size:16px;font-weight:650;line-height:1.35;letter-spacing:-.01em}
.dsm-workbuddy-xdpool-page-desc{margin:0;color:var(--wbx-text-3);font-size:12.5px;line-height:1.55;max-width:56ch}
.dsm-workbuddy-xdpool-page-actions{align-items:center;gap:8px;flex-wrap:wrap;flex:none;display:flex}

/*
 * One feature area per card.
 *
 * The surface is what separates the sections: layer-2 fill, a hairline, a 1px
 * inset top highlight (light from above, the way the host's own panels read) and
 * a soft shadow that keeps the card off the page background. Without the
 * highlight a darkened fill on a dark page looks like a hole, not a panel.
 */
.dsm-workbuddy-xdpool-card{
  position:relative;
  border:1px solid var(--wbx-hairline);
  background:var(--wbx-surface-2);
  box-shadow:inset 0 1px 0 var(--wbx-toplight),var(--wbx-shadow);
  border-radius:var(--wbx-radius);
  flex-direction:column;gap:13px;padding:16px;display:flex;
}/* Status card: the region switch sits above the state line, then the switch. */
.dsm-workbuddy-xdpool-status{gap:15px}

/* Reusable button primitives shared with the rest of the card body. */
.dsm-btn{
  appearance:none;font:inherit;cursor:pointer;border:1px solid transparent;border-radius:8px;
  padding:5px 13px;font-size:12.5px;line-height:1.5;font-weight:500;
  transition:color .16s var(--wbx-ease),border-color .16s var(--wbx-ease),background .16s var(--wbx-ease),transform .1s var(--wbx-ease);
}
.dsm-btn:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-btn:disabled{opacity:.4;cursor:default}
.dsm-btn:active:not(:disabled){transform:translateY(.5px)}
.dsm-btn-outline{border-color:var(--wbx-hairline);color:var(--wbx-text-2);background:transparent}
.dsm-btn-outline:hover:not(:disabled){
  color:var(--wbx-text-1);
  border-color:color-mix(in oklab,var(--wbx-text-3) 60%,transparent);
  background:color-mix(in oklab,var(--wbx-surface-3) 70%,transparent);
}
.dsm-btn-primary{background:var(--wbx-text-1);color:var(--wbx-surface-3);font-weight:600}
.dsm-btn-primary:hover:not(:disabled){opacity:.9}

/* ── Region tabs: two independent suppliers, one shown at a time ──────────
   A segmented control: the container is a recessed track, the active tab is
   lifted onto the card surface with a highlight. The dot carries health, so
   the tab itself never has to change colour. */
.dsm-workbuddy-xdpool-tabs{
  display:flex;gap:4px;padding:4px;
  border:1px solid var(--wbx-hairline-soft);
  border-radius:11px;
  background:color-mix(in oklab,var(--wbx-surface-1) 82%,var(--wbx-surface-2));
  box-shadow:inset 0 1px 2px rgba(0,0,0,.28);
}
.dsm-workbuddy-xdpool-tab{
  appearance:none;font:inherit;cursor:pointer;flex:1;border:0;border-radius:8px;
  padding:7px 10px;color:var(--wbx-text-3);font-size:12.5px;font-weight:550;line-height:18px;
  background:transparent;
  transition:color .16s var(--wbx-ease),background .16s var(--wbx-ease),box-shadow .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-tab:hover:not(.dsm-workbuddy-xdpool-tab-active){color:var(--wbx-text-2)}
.dsm-workbuddy-xdpool-tab:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-tab-active{
  color:var(--wbx-text-1);
  background:var(--wbx-surface-3);
  box-shadow:inset 0 1px 0 var(--wbx-toplight),0 1px 3px rgba(0,0,0,.4);
}
.dsm-workbuddy-xdpool-tab-dot{
  display:inline-block;width:7px;height:7px;border-radius:50%;
  margin-right:7px;vertical-align:baseline;background:var(--wbx-ok);
  box-shadow:0 0 0 3px color-mix(in oklab,var(--wbx-ok) 16%,transparent);
}
.dsm-workbuddy-xdpool-tab-dot[data-state="error"]{background:var(--wbx-err);box-shadow:0 0 0 3px color-mix(in oklab,var(--wbx-err) 16%,transparent)}
.dsm-workbuddy-xdpool-tab-dot[data-state="idle"]{background:var(--wbx-text-3);box-shadow:none}

/* ── Health line: the one sentence the user came for ──────────────────────
   Sized above body copy, with the dot doing the "is it alive" work. */
.dsm-workbuddy-xdpool-usage-head{display:flex;flex-direction:column;gap:13px;min-width:0}
.dsm-workbuddy-xdpool-usage-copy{display:flex;flex-direction:column;gap:4px;min-width:0}
.dsm-workbuddy-xdpool-usage-status{
  display:flex;align-items:center;gap:10px;
  font-size:15px;font-weight:650;color:var(--wbx-text-1);letter-spacing:-.01em;
}
.dsm-workbuddy-xdpool-usage-dot{
  width:9px;height:9px;border-radius:50%;flex:0 0 auto;
  box-shadow:0 0 0 4px color-mix(in oklab,currentColor 14%,transparent);
}
.dsm-workbuddy-xdpool-usage-hint{margin:0;color:var(--wbx-text-3);font-size:12px;line-height:1.6}
/* Monospace-looking URL endpoint: it is an address, not prose. */
.dsm-workbuddy-xdpool-usage-hint code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}

/*
 * Distribution picker.
 *
 * The selection cue is an inset accent bar plus a raised surface — the same
 * "current one is a lifted chip" language the account list uses for the serving
 * account. Deliberately NOT the brand blue (that is the host's, not ours) and
 * not the health green (that already means "this account works" further down).
 */
.dsm-workbuddy-xdpool-dist{display:flex;flex-direction:column;gap:9px}
.dsm-workbuddy-xdpool-dist-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.dsm-workbuddy-xdpool-dist-title{
  color:var(--wbx-text-3);font-size:10.5px;line-height:16px;
  letter-spacing:.06em;text-transform:uppercase;font-weight:650;
}
/* "now: X" — repeats the answer in the header so the user does not have to
   scan five cards for the raised one. */
.dsm-workbuddy-xdpool-dist-now{
  flex:none;padding:2px 10px;border-radius:999px;
  border:1px solid color-mix(in oklab,var(--wbx-text-1) 24%,transparent);
  background:color-mix(in oklab,var(--wbx-text-1) 9%,transparent);
  color:var(--wbx-text-1);font-size:11.5px;font-weight:600;line-height:18px;white-space:nowrap;
}
/* One row of equal chips; the row itself decides when it has to break. */
.dsm-workbuddy-xdpool-dist-options{display:flex;flex-wrap:wrap;gap:8px}
.dsm-workbuddy-xdpool-dist-option{
  flex:1 1 112px;min-width:0;appearance:none;font:inherit;cursor:pointer;text-align:left;
  display:flex;flex-direction:column;justify-content:center;gap:3px;min-height:44px;
  border:1px solid var(--wbx-hairline-soft);border-radius:11px;padding:9px 12px;
  background:transparent;color:var(--wbx-text-3);
  transition:color .16s var(--wbx-ease),border-color .16s var(--wbx-ease),background .16s var(--wbx-ease),box-shadow .16s var(--wbx-ease),transform .1s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-dist-option:hover:not(:disabled):not(.dsm-workbuddy-xdpool-dist-option-active){
  color:var(--wbx-text-2);
  border-color:color-mix(in oklab,var(--wbx-text-3) 55%,transparent);
  background:color-mix(in oklab,var(--wbx-surface-3) 55%,transparent);
}
.dsm-workbuddy-xdpool-dist-option:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-dist-option:active:not(:disabled){transform:translateY(.5px)}
/* Selected: raised onto layer-3 with an inset accent bar. The bar is what
   survives a glance — a tinted wash alone is indistinguishable from hover. */
.dsm-workbuddy-xdpool-dist-option-active{
  background:var(--wbx-surface-3);
  border-color:color-mix(in oklab,var(--wbx-text-1) 30%,transparent);
  box-shadow:inset 3px 0 0 var(--wbx-accent),inset 0 1px 0 var(--wbx-toplight),0 1px 3px rgba(0,0,0,.35);
  color:var(--wbx-text-1);
}
.dsm-workbuddy-xdpool-dist-option-active .dsm-workbuddy-xdpool-dist-option-name{color:var(--wbx-text-1)}
.dsm-workbuddy-xdpool-dist-option:disabled{cursor:default;opacity:.55}
.dsm-workbuddy-xdpool-dist-option-top{display:flex;align-items:center;gap:6px;min-width:0}
/* The name may wrap rather than ellipsize: a truncated mode name is unreadable,
   a two-line one is merely taller. */
.dsm-workbuddy-xdpool-dist-option-name{font-size:12.5px;line-height:17px;font-weight:600;min-width:0;overflow-wrap:anywhere}
/* "recommended" chip: quiet, and only on the mode this release argues for. */
.dsm-workbuddy-xdpool-dist-option-badge{
  flex:none;margin-left:auto;padding:1px 6px;border-radius:999px;
  background:var(--dsw-alias-state-success-subtle,rgba(34,160,107,.14));
  color:var(--wbx-ok);font-size:9.5px;font-weight:650;line-height:15px;white-space:nowrap;
  letter-spacing:.02em;
}
/* One line of prose under the row explains the mode that is selected. */
.dsm-workbuddy-xdpool-dist-hint{color:var(--wbx-text-3);font-size:11.5px;line-height:1.55;margin:0}
.dsm-workbuddy-xdpool-usage-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}

/* ── Account list ─────────────────────────────────────────────────────────
   Each account is its own raised subpanel. The serving account gets a green
   hairline + tint: a status read, not a call to action. */
.dsm-workbuddy-xdpool-accounts{gap:13px}
.dsm-workbuddy-xdpool-accounts-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dsm-workbuddy-xdpool-current{
  display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:0;padding:9px 13px;
  border:1px solid color-mix(in oklab,var(--wbx-ok) 30%,transparent);border-radius:11px;
  background:color-mix(in oklab,var(--wbx-ok) 8%,transparent);
}
.dsm-workbuddy-xdpool-current-dot{
  width:7px;height:7px;border-radius:50%;flex:none;background:var(--wbx-ok);
  box-shadow:0 0 0 3px color-mix(in oklab,var(--wbx-ok) 18%,transparent);
}
.dsm-workbuddy-xdpool-current-label{color:var(--wbx-ok);font-size:11px;line-height:18px;font-weight:650;letter-spacing:.03em;flex:none;text-transform:uppercase}
.dsm-workbuddy-xdpool-current-name{color:var(--wbx-text-1);font-size:12.5px;line-height:18px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-workbuddy-xdpool-current-note{color:var(--wbx-warn);font-size:11px;line-height:16px}
.dsm-workbuddy-xdpool-accounts-title{margin:0;color:var(--wbx-text-1);font-size:13.5px;font-weight:650;line-height:20px;letter-spacing:-.01em}
.dsm-workbuddy-xdpool-accounts-summary{margin:2px 0 0;color:var(--wbx-text-3);font-size:11.5px;line-height:18px}

.dsm-workbuddy-xdpool-account{
  display:flex;flex-direction:column;gap:0;padding:0;
  border:1px solid var(--wbx-hairline);
  border-radius:13px;
  background:color-mix(in oklab,var(--wbx-surface-2) 72%,var(--wbx-surface-1));
  box-shadow:inset 0 1px 0 var(--wbx-toplight),0 1px 2px rgba(0,0,0,.22);
  overflow:hidden;
  transition:border-color .16s var(--wbx-ease),box-shadow .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-account:hover{border-color:color-mix(in oklab,var(--wbx-text-3) 40%,transparent)}
/* Body row inside a card: identity on the left, credit panels on the right.
   flex-wrap lets the panels drop below on a narrow card instead of squeezing. */
.dsm-workbuddy-xdpool-account-body{display:flex;align-items:stretch;gap:0;flex-wrap:wrap}
.dsm-workbuddy-xdpool-account-copy{display:flex;flex-direction:column;align-items:flex-start;gap:6px;flex:1 1 200px;min-width:0;padding:14px 16px;justify-content:center}
.dsm-workbuddy-xdpool-account-label{color:var(--wbx-text-1);font-size:13.5px;font-weight:650;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-workbuddy-xdpool-account-head .dsm-workbuddy-xdpool-account-toggle{margin-left:auto}
.dsm-workbuddy-xdpool-account-head{
  display:flex;align-items:center;gap:10px;min-width:0;padding:11px 16px;
  border-bottom:1px solid var(--wbx-hairline-soft);
  background:color-mix(in oklab,var(--wbx-surface-3) 42%,transparent);
}
/* Account switched off on the card: still listed (so it can be turned back on)
   but visually muted. */
.dsm-workbuddy-xdpool-account-off{opacity:.5}
/* Small pill switch: "in rotation" vs "off". */
.dsm-workbuddy-xdpool-account-toggle{
  appearance:none;font:inherit;display:inline-flex;align-items:center;gap:5px;cursor:pointer;flex:none;
  border:1px solid var(--wbx-hairline);border-radius:999px;padding:3px 10px;
  font-size:11px;line-height:17px;background:transparent;color:var(--wbx-text-3);
  transition:color .16s var(--wbx-ease),border-color .16s var(--wbx-ease),background .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-account-toggle:hover:not(:disabled){color:var(--wbx-text-1);border-color:color-mix(in oklab,var(--wbx-text-3) 60%,transparent)}
.dsm-workbuddy-xdpool-account-toggle:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-account-toggle:disabled{cursor:default;opacity:.6}
.dsm-workbuddy-xdpool-account-toggle-on{
  background:color-mix(in oklab,var(--wbx-ok) 13%,transparent);
  border-color:color-mix(in oklab,var(--wbx-ok) 48%,transparent);
  color:var(--wbx-ok);font-weight:600;
}
.dsm-workbuddy-xdpool-account-toggle-dot{width:6px;height:6px;border-radius:50%;flex:none;background:currentColor;opacity:.9}
/* "Remove" button: destructive but reversible, so quiet until hovered. */
.dsm-workbuddy-xdpool-account-ignore{
  appearance:none;font:inherit;flex:none;cursor:pointer;border:1px solid transparent;border-radius:999px;
  padding:3px 10px;font-size:11px;line-height:17px;background:transparent;color:var(--wbx-text-3);
  transition:color .16s var(--wbx-ease),border-color .16s var(--wbx-ease),background .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-account-ignore:hover:not(:disabled){
  color:var(--wbx-err);border-color:color-mix(in oklab,var(--wbx-err) 42%,transparent);
  background:color-mix(in oklab,var(--wbx-err) 9%,transparent);
}
.dsm-workbuddy-xdpool-account-ignore:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-account-ignore:disabled{cursor:default;opacity:.6}

/* Ignored-account list: visible proof that "remove" can be undone. */
.dsm-workbuddy-xdpool-ignored-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:11px 16px;border-bottom:1px solid var(--wbx-hairline-soft)}
.dsm-workbuddy-xdpool-ignored-title{margin:0;color:var(--wbx-text-1);font-size:12.5px;font-weight:650;line-height:19px}
.dsm-workbuddy-xdpool-ignored-summary{margin:0;color:var(--wbx-text-3);font-size:11px;line-height:17px}
.dsm-workbuddy-xdpool-ignored-list{display:flex;flex-direction:column}
.dsm-workbuddy-xdpool-ignored-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 16px}
.dsm-workbuddy-xdpool-ignored-row+.dsm-workbuddy-xdpool-ignored-row{border-top:1px solid var(--wbx-hairline-soft)}
.dsm-workbuddy-xdpool-ignored-label{color:var(--wbx-text-2);font-size:12px;line-height:18px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-workbuddy-xdpool-ignored-restore{
  appearance:none;font:inherit;flex:none;cursor:pointer;border:1px solid var(--wbx-hairline);border-radius:999px;
  padding:3px 10px;font-size:11px;line-height:17px;background:transparent;color:var(--wbx-text-2);
  transition:color .16s var(--wbx-ease),border-color .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-ignored-restore:hover:not(:disabled){color:var(--wbx-text-1);border-color:color-mix(in oklab,var(--wbx-text-3) 60%,transparent)}
.dsm-workbuddy-xdpool-ignored-restore:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-ignored-restore:disabled{cursor:default;opacity:.6}

/* Status pills: one vocabulary for every account/model state. */
.dsm-workbuddy-xdpool-account-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dsm-workbuddy-xdpool-account-tag{
  padding:1px 8px;border-radius:999px;font-size:10.5px;line-height:18px;font-weight:600;
  background:var(--dsw-alias-state-success-subtle,rgba(34,160,107,.12));color:var(--wbx-ok);
}
.dsm-workbuddy-xdpool-account-tag-cooling{background:var(--dsw-alias-state-warning-subtle,rgba(217,119,6,.15));color:var(--wbx-warn)}
.dsm-workbuddy-xdpool-account-tag-error{background:var(--dsw-alias-state-error-subtle,rgba(239,68,68,.12));color:var(--wbx-err)}
/* A rejected sign-in is red, not amber: unlike a cooldown it will not clear by
   waiting, and it is the one state where the user has to go do something. */
.dsm-workbuddy-xdpool-account-tag-dead{background:var(--dsw-alias-state-error-subtle,rgba(239,68,68,.12));color:var(--wbx-err)}
.dsm-workbuddy-xdpool-account-meta{color:var(--wbx-text-3);font-size:11.5px;line-height:18px;display:flex;flex-wrap:wrap;gap:10px;font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-account-meta-dead{color:var(--wbx-err)}
.dsm-workbuddy-xdpool-account-modelcool{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
.dsm-workbuddy-xdpool-account-modelcool-chip{
  display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:999px;
  font-size:10.5px;line-height:18px;
  background:var(--dsw-alias-state-warning-subtle,rgba(217,119,6,.12));color:var(--wbx-warn);
}
/* "→ deepseek-v4.1-flash-sg (0.03x) still works" inside a cooling chip: keeps
   the warning tint of its parent but drops the weight — it is the way out, not
   a second problem. */
.dsm-workbuddy-xdpool-account-modelcool-twin{color:var(--wbx-text-2);cursor:help}
.dsm-workbuddy-xdpool-account-error{margin:0;color:var(--wbx-err);font-size:12.5px;line-height:20px}

/* ── Stats: packages on the left, total + check-in on the right ───────────
   A single inset well split by a hairline, so the two columns read as one
   panel rather than two floating blocks. */
.dsm-workbuddy-xdpool-stats{
  display:grid;grid-template-columns:minmax(0,1.45fr) minmax(168px,.85fr);gap:0;
  flex:1 1 420px;min-width:0;max-width:660px;
  border-top:1px solid var(--wbx-hairline-soft);
}
.dsm-workbuddy-xdpool-panel{display:flex;flex-direction:column;min-width:0;gap:7px;padding:13px 16px}
.dsm-workbuddy-xdpool-panel-title{
  color:var(--wbx-text-3);font-size:10.5px;line-height:16px;
  letter-spacing:.06em;text-transform:uppercase;font-weight:650;
}
.dsm-workbuddy-xdpool-panel-empty{color:var(--wbx-text-3);font-size:13.5px;line-height:20px}
.dsm-workbuddy-xdpool-panel-error{color:var(--wbx-err);font-size:11.5px;line-height:18px;word-break:break-word}
/* A rejected sign-in gets a compact chip: the upstream paragraph is long, and
   printed inline it pushed the neighbouring "Total" panel off screen. */
.dsm-workbuddy-xdpool-panel-error-dead{
  display:inline-flex;align-items:center;align-self:flex-start;padding:1px 8px;border-radius:999px;
  background:var(--dsw-alias-state-error-subtle,rgba(239,68,68,.12));
  font-size:10.5px;line-height:18px;white-space:nowrap;cursor:help;
}
.dsm-workbuddy-xdpool-panel-foot{
  display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:9px;padding-top:9px;
  border-top:1px solid var(--wbx-hairline-soft);color:var(--wbx-text-2);font-size:11.5px;line-height:18px;
}
.dsm-workbuddy-xdpool-panel-foot strong{color:var(--wbx-text-1);font-size:15px;font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-packages{display:flex;flex-direction:column;gap:5px;margin:0;padding:0;list-style:none}
/* One credit package: name + amount on the first line, its deadline beneath.
   A two-row grid keeps the columns aligned across rows. */
.dsm-workbuddy-xdpool-packages li{
  display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:10px;row-gap:1px;align-items:baseline;
  color:var(--wbx-text-2);font-size:11.5px;line-height:18px;
}
.dsm-workbuddy-xdpool-packages-name{grid-column:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-workbuddy-xdpool-packages-value{grid-column:2;justify-self:end;color:var(--wbx-text-3);font-size:11px;font-variant-numeric:tabular-nums}
/* Per-package deadline: each row carries its own timestamp; the soon ones are
   tinted so they fold onto their own line. */
.dsm-workbuddy-xdpool-packages-when{grid-column:1/-1;color:var(--wbx-text-3);font-size:10.5px;line-height:15px;font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-packages-when-soon{color:var(--wbx-warn)}

/* The headline number. This is the single most important value on the page, so
   it gets the only gradient fill and the largest type; everything else defers. */
.dsm-workbuddy-xdpool-panel-total{
  position:relative;align-items:center;text-align:center;justify-content:center;overflow:hidden;
  background:
    radial-gradient(120% 90% at 50% 0%,color-mix(in oklab,var(--wbx-ok) 12%,transparent),transparent 70%),
    var(--wbx-surface-2);
}
.dsm-workbuddy-xdpool-panel-total::before{
  content:"";position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--wbx-ok),transparent);opacity:.85;
}
.dsm-workbuddy-xdpool-total-value{
  color:var(--wbx-ok);font-size:30px;line-height:34px;font-weight:800;letter-spacing:-.03em;
  white-space:nowrap;font-variant-numeric:tabular-nums;
  text-shadow:0 1px 12px color-mix(in oklab,var(--wbx-ok) 28%,transparent);
}

/* ── Model directory ─────────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-models{gap:11px}
.dsm-workbuddy-xdpool-models-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dsm-workbuddy-xdpool-models-title{margin:0;color:var(--wbx-text-1);font-size:13.5px;font-weight:650;line-height:20px;letter-spacing:-.01em}
.dsm-workbuddy-xdpool-models-summary{margin:2px 0 0;color:var(--wbx-text-3);font-size:11.5px;line-height:18px}
.dsm-workbuddy-xdpool-model-list{
  display:flex;flex-direction:column;border:1px solid var(--wbx-hairline);
  border-radius:11px;overflow:hidden;
  background:color-mix(in oklab,var(--wbx-surface-2) 72%,var(--wbx-surface-1));
}
.dsm-workbuddy-xdpool-model{
  display:grid;grid-template-columns:minmax(0,1fr);gap:7px;padding:10px 12px;
  background:transparent;
  transition:background .16s var(--wbx-ease),opacity .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-model:hover{background:color-mix(in oklab,var(--wbx-surface-3) 46%,transparent)}
.dsm-workbuddy-xdpool-model+.dsm-workbuddy-xdpool-model{border-top:1px solid var(--wbx-hairline-soft)}
.dsm-workbuddy-xdpool-model-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
.dsm-workbuddy-xdpool-model-copy{display:flex;align-items:baseline;gap:8px;min-width:0;flex-wrap:wrap}
.dsm-workbuddy-xdpool-model-name{
  display:inline-flex;align-items:baseline;gap:7px;color:var(--wbx-text-1);
  font-size:12.5px;font-weight:550;line-height:19px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.dsm-workbuddy-xdpool-model-name-rate{color:var(--wbx-text-3);font-size:10.5px;font-weight:400;line-height:16px;flex:none;font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-model-id{
  color:color-mix(in oklab,var(--wbx-text-3) 88%,transparent);font-size:10.5px;line-height:16px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
.dsm-workbuddy-xdpool-model-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--wbx-text-3);font-size:10.5px;line-height:16px}
.dsm-workbuddy-xdpool-model-meta-tag{padding:1px 8px;border-radius:999px;font-size:10.5px;line-height:16px;background:rgba(174,179,187,.1);color:var(--wbx-text-2)}
/* "free from HH:00": quieter than the badge on purpose — the model costs
   credits right now, so it must not read as a promo the user can spend against. */
.dsm-workbuddy-xdpool-model-meta-later{padding:1px 8px;border-radius:999px;font-size:10.5px;line-height:16px;border:1px dashed color-mix(in oklab,var(--wbx-text-3) 50%,transparent);color:var(--wbx-text-3)}
/* "活动至 10-31": the campaign's end date. Muted — context for planning, not a
   claim about the current price. */
.dsm-workbuddy-xdpool-model-meta-promo{color:var(--wbx-text-3);font-size:10.5px;line-height:16px;opacity:.85}
/* "付费同款 …": the way out when the free row is rate-limited. Muted like the
   other meta chips — an alternative, not a warning. */
.dsm-workbuddy-xdpool-model-meta-twin{color:var(--wbx-text-3);font-size:10.5px;line-height:16px;opacity:.85;cursor:help}
/* Unreadable credential files: a warning tint, since it explains a smaller pool
   and "encrypted" is actionable (start the app once). */
.dsm-workbuddy-xdpool-skipped{
  margin:6px 0 0;padding:8px 11px;border-radius:9px;
  background:var(--dsw-alias-state-warning-subtle,rgba(217,119,6,.12));
  display:flex;flex-direction:column;gap:3px;
}
.dsm-workbuddy-xdpool-skipped-summary{margin:0;font-size:11.5px;line-height:18px;font-weight:650;color:var(--wbx-warn)}
.dsm-workbuddy-xdpool-skipped-row{margin:0;display:flex;gap:8px;align-items:baseline;font-size:10.5px;line-height:16px;flex-wrap:wrap}
.dsm-workbuddy-xdpool-skipped-file{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--wbx-text-2);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-workbuddy-xdpool-skipped-reason{color:var(--wbx-text-3)}
.dsm-workbuddy-xdpool-model-cap{color:var(--wbx-text-3);font-size:10.5px;line-height:16px;font-variant-numeric:tabular-nums}
/* Model row: checkbox + image toggle + context-budget radios. */
.dsm-workbuddy-xdpool-model-off{opacity:.5}
.dsm-workbuddy-xdpool-model-check{display:flex;align-items:center;gap:8px;min-width:0;flex:1;cursor:pointer}
.dsm-workbuddy-xdpool-model-check input{margin:0;accent-color:var(--wbx-brand);flex:none}
.dsm-workbuddy-xdpool-model-controls{display:flex;align-items:center;gap:10px;flex:none;flex-wrap:wrap;justify-content:flex-end}
.dsm-workbuddy-xdpool-model-image{display:inline-flex;align-items:center;gap:5px;flex:none;cursor:pointer;color:var(--wbx-text-2);font-size:10.5px;line-height:16px}
.dsm-workbuddy-xdpool-model-image input{margin:0;accent-color:var(--wbx-brand)}
.dsm-workbuddy-xdpool-model-budget{display:flex;align-items:center;gap:9px;flex:none;margin:0;padding:0;border:0;color:var(--wbx-text-2);font-size:10.5px;line-height:16px}
.dsm-workbuddy-xdpool-model-budget label{display:inline-flex;align-items:center;gap:4px;cursor:pointer}
.dsm-workbuddy-xdpool-model-budget input{margin:0;accent-color:var(--wbx-brand)}
.dsm-workbuddy-xdpool-models-heading{display:flex;flex-direction:column;gap:2px;min-width:0}
.dsm-workbuddy-xdpool-models-actions{display:flex;align-items:center;gap:8px;flex:none}
/* "Built-in list (offline)" chip: a warning tint, since the user is looking at a
   SHORTER roster than the gateway offers and may wonder where models went. */
.dsm-workbuddy-xdpool-catalog-offline{
  flex:none;padding:2px 9px;border-radius:999px;font-size:10.5px;line-height:17px;font-weight:650;
  background:var(--dsw-alias-state-warning-subtle,rgba(217,119,6,.15));color:var(--wbx-warn);white-space:nowrap;
}

/* ── Automation ──────────────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-auto-run{flex:none}
.dsm-workbuddy-xdpool-auto-job-detail{grid-column:1/-1;color:var(--wbx-text-3);font-size:10.5px;line-height:16px}
.dsm-workbuddy-xdpool-panel-packages{display:flex;flex-direction:column;gap:7px;min-width:0}

/* Check-in docked under the total, inside the right-hand panel. */
.dsm-workbuddy-xdpool-checkin{display:flex;flex-direction:column;align-items:center;gap:7px;width:100%;margin-top:10px;padding-top:11px;border-top:1px solid var(--wbx-hairline-soft)}
.dsm-workbuddy-xdpool-checkin-meta{display:flex;flex-direction:column;align-items:center;gap:2px;width:100%}
.dsm-workbuddy-xdpool-checkin-streak{color:var(--wbx-text-2);font-size:11.5px;line-height:17px;font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-checkin-daily{color:var(--wbx-ok);font-size:11px;line-height:16px;font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-checkin-bonus{
  padding:1px 8px;border-radius:999px;font-size:10.5px;line-height:16px;text-align:center;
  background:var(--dsw-alias-state-success-subtle,rgba(51,160,107,.14));color:var(--wbx-ok);
}
.dsm-workbuddy-xdpool-checkin-btn{
  width:100%;padding:6px 10px;border-radius:9px;border:1px solid transparent;
  font-size:12px;font-weight:650;line-height:18px;cursor:pointer;
  background:var(--wbx-ok);color:#fff;
  transition:opacity .16s var(--wbx-ease),background .16s var(--wbx-ease),transform .1s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-checkin-btn:hover:not(:disabled){opacity:.88}
.dsm-workbuddy-xdpool-checkin-btn:active:not(:disabled){transform:translateY(.5px)}
.dsm-workbuddy-xdpool-checkin-btn:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-checkin-btn:disabled{cursor:default;background:transparent;border-color:var(--wbx-hairline);color:var(--wbx-text-3);opacity:1}
.dsm-workbuddy-xdpool-checkin-error{color:var(--wbx-err);font-size:10.5px;line-height:16px;text-align:center;word-break:break-word}

/* Inline notes + error messages. */
.dsm-workbuddy-xdpool-note{margin:0;color:var(--wbx-text-3);font-size:12.5px;line-height:20px}
.dsm-workbuddy-xdpool-error{margin:0;color:var(--wbx-err);font-size:12.5px;line-height:20px}

/* ── Empty-region guide ──────────────────────────────────────────────────── */
.dsm-workbuddy-xdpool-empty{gap:10px}
.dsm-workbuddy-xdpool-empty-title{margin:0;color:var(--wbx-text-1);font-size:13.5px;font-weight:650;line-height:20px}
.dsm-workbuddy-xdpool-empty-steps{display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:11px;background:color-mix(in oklab,var(--wbx-surface-3) 60%,transparent);border:1px solid var(--wbx-hairline-soft)}
.dsm-workbuddy-xdpool-empty-steps-title{margin:0;color:var(--wbx-text-2);font-size:11.5px;font-weight:650;line-height:18px}
.dsm-workbuddy-xdpool-empty-list{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:5px;color:var(--wbx-text-3);font-size:11.5px;line-height:18px}
.dsm-workbuddy-xdpool-empty-list li{min-width:0}
.dsm-workbuddy-xdpool-empty-note{margin:0;color:var(--wbx-text-3);font-size:10.5px;line-height:17px}

/* Automation panel: schedule and last-run summary, collapsed behind a switch. */
.dsm-workbuddy-xdpool-auto{
  margin-top:2px;padding:12px 13px;border:1px solid var(--wbx-hairline-soft);border-radius:11px;
  background:color-mix(in oklab,var(--wbx-surface-1) 62%,var(--wbx-surface-2));
  box-shadow:inset 0 1px 2px rgba(0,0,0,.2);
}
.dsm-workbuddy-xdpool-auto-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dsm-workbuddy-xdpool-auto-title{color:var(--wbx-text-1);font-size:12px;font-weight:650}
.dsm-workbuddy-xdpool-auto-switch{
  padding:3px 12px;border:1px solid var(--wbx-hairline);border-radius:999px;background:transparent;
  color:var(--wbx-text-2);font-size:11.5px;cursor:pointer;
  transition:color .16s var(--wbx-ease),border-color .16s var(--wbx-ease),background .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-auto-switch:hover:not(:disabled){border-color:color-mix(in oklab,var(--wbx-text-3) 60%,transparent);color:var(--wbx-text-1)}
.dsm-workbuddy-xdpool-auto-switch:disabled{opacity:.5;cursor:not-allowed}
.dsm-workbuddy-xdpool-auto-switch-on{border-color:color-mix(in oklab,var(--wbx-ok) 55%,transparent);color:var(--wbx-ok);background:color-mix(in oklab,var(--wbx-ok) 12%,transparent)}
.dsm-workbuddy-xdpool-auto-hint{margin:6px 0 0;color:var(--wbx-text-2);font-size:11.5px;line-height:1.6}
.dsm-workbuddy-xdpool-auto-total{display:flex;flex-direction:column;gap:4px;margin-top:8px;padding:7px 9px;border-radius:9px;background:color-mix(in oklab,var(--wbx-ok) 7%,transparent);font-size:10.5px}
.dsm-workbuddy-xdpool-auto-total-label{color:var(--wbx-text-2);font-size:11.5px}
.dsm-workbuddy-xdpool-auto-total-list{display:flex;flex-direction:column;gap:2px}
.dsm-workbuddy-xdpool-auto-total-row{color:var(--wbx-ok);font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-earned{display:flex;flex-direction:column;gap:4px;margin-top:8px;padding-top:8px;border-top:1px dashed var(--wbx-hairline-soft);font-size:10.5px}
.dsm-workbuddy-xdpool-earned-label{color:var(--wbx-text-2);font-size:11.5px}
.dsm-workbuddy-xdpool-earned-list{display:flex;flex-direction:column;gap:2px}
.dsm-workbuddy-xdpool-earned-row{color:var(--wbx-ok);font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-earned-value{color:var(--wbx-ok);font-weight:650;font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-auto-jobs{margin-top:8px;display:flex;flex-direction:column;gap:4px}
.dsm-workbuddy-xdpool-auto-job{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11.5px;color:var(--wbx-text-2)}
.dsm-workbuddy-xdpool-auto-job-name{flex:0 0 auto;min-width:72px;color:var(--wbx-text-1);font-weight:550}
.dsm-workbuddy-xdpool-auto-job-when{flex:1 1 auto;color:var(--wbx-text-2);font-variant-numeric:tabular-nums}
.dsm-workbuddy-xdpool-auto-job-last{flex:0 0 auto;text-align:right;color:var(--wbx-text-2);font-variant-numeric:tabular-nums;white-space:nowrap}
.dsm-workbuddy-xdpool-auto-job-note{flex:0 0 auto;color:var(--wbx-text-2)}

/* Reserved credits: one inline number field per account. */
.dsm-workbuddy-xdpool-reserve{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px;padding-top:8px;border-top:1px dashed var(--wbx-hairline-soft);font-size:10.5px;color:var(--wbx-text-3)}
.dsm-workbuddy-xdpool-reserve-label{flex:0 0 auto}
.dsm-workbuddy-xdpool-reserve-input{
  width:84px;padding:3px 8px;border:1px solid var(--wbx-hairline);border-radius:7px;background:transparent;
  color:var(--wbx-text-1);font:inherit;font-variant-numeric:tabular-nums;
  transition:border-color .16s var(--wbx-ease),background .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-reserve-input:focus{outline:none;border-color:var(--wbx-ok);background:color-mix(in oklab,var(--wbx-ok) 6%,transparent)}
.dsm-workbuddy-xdpool-reserve-input:focus-visible{outline:2px solid var(--wbx-brand);outline-offset:1px}
.dsm-workbuddy-xdpool-reserve-input:disabled{opacity:.6}
.dsm-workbuddy-xdpool-reserve-unit{flex:0 0 auto}
.dsm-workbuddy-xdpool-reserve-badge{flex:0 0 auto;padding:1px 7px;border-radius:999px;background:rgba(232,90,90,.14);color:#e85a5a;font-size:10px}
/* Explicit Save: the field is a draft, so the button (not a blur) commits it. */
.dsm-workbuddy-xdpool-reserve-save{
  flex:0 0 auto;appearance:none;font:inherit;font-size:10.5px;font-weight:650;line-height:16px;
  padding:3px 12px;border-radius:7px;
  border:1px solid color-mix(in oklab,var(--wbx-ok) 52%,transparent);
  background:color-mix(in oklab,var(--wbx-ok) 13%,transparent);
  color:var(--wbx-ok);cursor:pointer;
  transition:opacity .16s var(--wbx-ease),background .16s var(--wbx-ease),border-color .16s var(--wbx-ease),color .16s var(--wbx-ease);
}
.dsm-workbuddy-xdpool-reserve-save:hover:not(:disabled){background:color-mix(in oklab,var(--wbx-ok) 22%,transparent);border-color:var(--wbx-ok)}
.dsm-workbuddy-xdpool-reserve-save:disabled{cursor:default;border-color:var(--wbx-hairline);background:transparent;color:var(--wbx-text-3);opacity:.75}
.dsm-workbuddy-xdpool-reserve-note{flex:0 0 auto;font-size:10.5px;line-height:16px}
.dsm-workbuddy-xdpool-reserve-note-ok{color:var(--wbx-ok)}
.dsm-workbuddy-xdpool-reserve-note-bad{color:var(--wbx-err);font-weight:650}

/* ── Responsive: stack the stats columns on narrow screens ───────────────── */
@media (max-width:760px){
  .dsm-workbuddy-xdpool-stats{grid-template-columns:1fr;border-top:1px solid var(--wbx-hairline-soft)}
  .dsm-workbuddy-xdpool-panel-total{align-items:stretch;text-align:left}
  .dsm-workbuddy-xdpool-total-value{text-align:left}
  .dsm-workbuddy-xdpool-checkin{align-items:stretch}
  .dsm-workbuddy-xdpool-checkin-meta{align-items:flex-start}
  .dsm-workbuddy-xdpool-checkin-bonus{text-align:left}
  /* The chips wrap on their own (auto-fit); stop reserving desktop height for
     rows that are now one chip tall. */
  .dsm-workbuddy-xdpool-dist-option{min-height:0}
  .dsm-workbuddy-xdpool-page{gap:12px}
  .dsm-workbuddy-xdpool-card{padding:13px}
}

/* Respect the OS "reduce motion" preference: transitions are decoration. */
@media (prefers-reduced-motion:reduce){
  .dsm-workbuddy-xdpool-page *{transition:none!important}
}

/*
 * Light-theme calibration.
 *
 * On a dark surface a 1px inset highlight reads as "lit from above"; on a white
 * surface the same trick needs a much lower alpha or it turns into a visible
 * grey band, and the drop shadow has to all but disappear. --wbx-on-light
 * scales both, so the two themes share one rule set instead of forking the CSS.
 */
@media (prefers-color-scheme:light){
  .dsm-workbuddy-xdpool-page{
    --wbx-on-light:.45;
    --wbx-toplight:color-mix(in oklab, var(--wbx-label) 4%, transparent);
  }
}
`.trim()
