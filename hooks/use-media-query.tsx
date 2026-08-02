import * as React from "react";

/**
 * Subscribe to a CSS media query from JS.
 *
 * Use this — not a hardcoded pixel guess — whenever a layout decision has to be
 * made in JS that must agree with a Tailwind breakpoint. Getting the two out of
 * step produces a dead band where neither the mobile nor the desktop branch
 * renders.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * True below Tailwind's `lg` breakpoint (1024px) — i.e. everything the `lg:`
 * variants do NOT apply to. Pair this with `lg:hidden` / `hidden lg:block`
 * so the JS branch and the CSS branch always agree.
 */
export function useIsCompact(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}
