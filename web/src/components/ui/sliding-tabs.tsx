import { useEffect, useRef, useState, type ReactNode } from "react";

/** Adapted from Transitions.dev's free P16 Sliding Tabs example.
 * https://transitions.dev/library.html — measured indicator, controlled selection. */
export function SlidingTabs({ tabs, value, onChange, label, controls }: {
  tabs: { id: string; label: string; icon?: ReactNode }[];
  value: string; onChange: (id: string) => void; label: string; controls: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState({ left: 0, width: 0 });
  useEffect(() => {
    const sync = () => {
      const tab = root.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (tab) setRect({ left: tab.offsetLeft, width: tab.offsetWidth });
    };
    sync();
    const observer = new ResizeObserver(sync);
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [value]);
  return <div ref={root} className="sliding-tabs" role="tablist" aria-label={label}>
    <span className="sliding-tabs-indicator" aria-hidden="true" style={{ width: rect.width, transform: `translateX(${rect.left}px)` }} />
    {tabs.map((tab, i) => <button key={tab.id} id={`idea-tab-${tab.id}`} role="tab" aria-selected={value === tab.id} aria-controls={controls} tabIndex={value === tab.id ? 0 : -1} onClick={() => onChange(tab.id)} onKeyDown={event => {
      let next = i;
      if (event.key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (event.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault(); onChange(tabs[next].id);
      root.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }}>{tab.icon}{tab.label}</button>)}
  </div>;
}
