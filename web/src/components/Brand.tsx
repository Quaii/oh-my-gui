import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className={cn("size-7 text-primary", className)}>
      <path d="M6 9v14M12.5 5v22M19 9v14M25.5 12v8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
