import {LoadingIndicator} from '../amicro/LoadingIndicator';
import type { ReactNode, CSSProperties } from "react";
import "./skeleton-reveal.css";
import { Skeleton } from "./skeleton";

/** Transitions.dev P14. Adapted to real fetch state; no artificial loading delay. */
export function SkeletonReveal({ loading, skeleton, children, className = "", label = "Loading" }: {
  loading: boolean; skeleton: ReactNode; children: ReactNode; className?: string; label?: string;
}) {
  return <div className={`t-skel omp-skeleton-reveal ${loading ? "" : "is-revealed"} ${className}`} aria-busy={loading} style={{ "--pulse-dur": "1000ms", "--pulse-count": "infinite", "--pulse-min": .5, "--reveal-dur": "180ms", "--reveal-blur": "0px", "--reveal-ease": "cubic-bezier(0.22, 1, 0.36, 1)" } as CSSProperties}>
    <div className={`t-skel-skeleton ${loading ? "is-pulsing" : ""}`} aria-hidden="true">{loading&&<div className="amicro-loading-caption"><LoadingIndicator aria-hidden="true" className="size-4"/><span>{label}</span></div>}{skeleton}</div>
    <div className="t-skel-content" aria-hidden={loading || undefined} inert={loading}>{children}</div>
    {loading && <span role="status" className="sr-only">{label}</span>}
  </div>;
}

export function SettingsSkeleton({ rows = 4 }: { rows?: number }) {
  return <div className="settings-skeleton">{Array.from({ length: rows }, (_, i) => <div className="settings-skeleton-row" key={i}><Skeleton className="size-9 shrink-0 rounded-lg" /><div><Skeleton className="h-3 rounded-md" style={{ width: `${44 + i % 3 * 15}%` }} /><Skeleton className="h-2.5 rounded-md" style={{ width: `${70 - i % 2 * 18}%` }} /></div><Skeleton className="h-5 w-9 shrink-0 rounded-full" /></div>)}</div>;
}
