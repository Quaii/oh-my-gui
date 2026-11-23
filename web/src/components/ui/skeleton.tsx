import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("amicro-skeleton rounded-md bg-accent", className)}
      {...props}
    />
  )
}

export { Skeleton }
