/**
 * The Rare UI registry ships Next-flavoured imports (next/link, next/navigation).
 * This app is a Vite SPA, so both module ids are aliased here in vite.config.ts
 * and tsconfig paths. Behaviour matches the subset the components use.
 */
import * as React from "react";

type LinkProps = React.ComponentPropsWithoutRef<"a"> & { href?: string; prefetch?: boolean; scroll?: boolean };

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, prefetch: _p, scroll: _s, ...props },
  ref
) {
  return (
    <a
      ref={ref}
      href={href}
      onClick={(e) => {
        props.onClick?.(e);
        if (e.defaultPrevented || !href || href.startsWith("http") || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        window.history.pushState({}, "", href);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }}
      {...props}
    />
  );
});

export default Link;

export function usePathname(): string {
  const [path, setPath] = React.useState(() => (typeof window === "undefined" ? "/" : window.location.pathname));
  React.useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

export function useRouter() {
  return {
    push: (href: string) => {
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    replace: (href: string) => window.history.replaceState({}, "", href),
    back: () => window.history.back(),
    refresh: () => {},
  };
}
