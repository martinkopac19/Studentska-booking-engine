/**
 * Loads Beer CSS for as long as the booking page is mounted, and takes it away
 * again on the way out.
 *
 * Why this is not a plain `import "beercss/…css"` in `main.tsx`:
 *
 * Beer CSS calls one of its builds "scoped", but only the *element* rules are
 * scoped to `.beer`. Measured against 5.0.3, the same file still ships 97 rules
 * that target `html`, `body`, `nav`, `header`, `footer`, `a` and friends
 * globally, plus its Material tokens on `:root`. Three of those token names —
 * `--background`, `--primary`, `--secondary` — are also used by the guide's
 * shadcn theme, which wraps them as `hsl(var(--x))`. A hex inside `hsl()` is
 * invalid, so every colour on the guide collapsed to transparent and the page
 * rendered black and empty.
 *
 * Loading it per route keeps the two design systems from ever being in the
 * document at the same time. The token rewrite below is still worth doing on
 * top of that: it keeps Material's palette on `.beer`, so nothing depends on
 * the order in which stylesheets happen to land.
 */

import { useEffect } from "react";
import beerCss from "beercss/dist/cdn/beer.scoped.min.css?raw";
import iconFont from "@/assets/material-symbols-booking.woff2?url";

/**
 * The package entry (`import "beercss"`) pulls in `beer.min.css` — the
 * *unscoped* stylesheet — as a side effect, which is how the guide ended up
 * with Beer CSS in its document even after the explicit CSS import was
 * removed. Importing the browser bundle directly gives the behaviour without
 * the stylesheet.
 */

const STYLE_ID = "beercss-scoped";

/** Material tokens belong to the booking wrapper, not to the whole document. */
const tokensScoped = beerCss.split(":root{").join(".beer{");

/**
 * Inlining the stylesheet moves its `url()`s onto the page's own address, so
 * `url(material-symbols-outlined.woff2)` asked the site root for a font that is
 * not there. Beer CSS lists jsdelivr as the second source in the same
 * `@font-face`, so the icons did appear — from a third party, and only with a
 * working internet connection. Without it every `<i>` falls back to its own
 * text and the page reads "arrow_drop_down" out loud.
 *
 * What gets served instead is a subset built from Beer's own file: the eleven
 * ligatures this flow actually uses, which is 3 KB against the full 453 KB.
 * The FILL axis survives the subsetting, because Beer switches filled icons on
 * with `font-variation-settings: "FILL" 1`. `scripts/build-icon-font.sh`
 * rebuilds it; run that after adding an icon, or the new one renders as its own
 * name in text.
 *
 * `--font-icon` names the Outlined family and nothing here uses the Rounded,
 * Sharp or Subset faces, so only this one face is repointed. Every remaining
 * jsdelivr source is then dropped outright: an unused face silently reaching a
 * CDN is the thing this is meant to prevent.
 */
const scoped = tokensScoped
  .replace(
    /(@font-face\{[^}]*?font-family:Material Symbols Outlined[^}]*?src:)[^}]*/,
    `$1url(${iconFont}) format("woff2")`,
  )
  .replace(/,?url\(https:\/\/cdn\.jsdelivr\.net[^)]*\)\s*format\("woff2"\)/g, "");

export function useBeerCss(): void {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = scoped;
    document.head.append(style);

    // Behaviour only (dialogs, menus, ripples); this path ships no CSS.
    void import("beercss/dist/cdn/beer.min.js");

    return () => {
      style.remove();
    };
  }, []);
}
