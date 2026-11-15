// Source: user-supplied shadcn.io manual component.
"use client";

import { ArrowRightIcon, MinusIcon, PackageIcon, PlusIcon } from "lucide-react";
import type * as React from "react";
import { createContext, useContext } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type PackageInfoChange = "major" | "minor" | "patch" | "added" | "removed";

interface PackageInfoContextValue {
  changeType?: PackageInfoChange;
  currentVersion?: string;
  name: string;
  newVersion?: string;
}

const PackageInfoContext = createContext<PackageInfoContextValue>({
  name: "",
});

/** Each change's Badge: a breaking major in red, a removal muted. */
const CHANGE_VARIANTS: Record<
  PackageInfoChange,
  "destructive" | "warning" | "success" | "info" | "secondary"
> = {
  added: "info",
  major: "destructive",
  minor: "warning",
  patch: "success",
  removed: "secondary",
};

function PackageInfo({
  name,
  currentVersion,
  newVersion,
  changeType,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** The package's name, as in `package.json`. */
  name: string;
  /** The version installed before the change. */
  currentVersion?: string;
  /** The version after it. */
  newVersion?: string;
  /** What kind of change it is: a semver bump, or the package added or removed. */
  changeType?: PackageInfoChange;
}) {
  return (
    <PackageInfoContext.Provider
      value={{ changeType, currentVersion, name, newVersion }}
    >
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-2 rounded-lg border bg-background p-4 text-sm",
          className
        )}
        data-change-type={changeType}
        data-slot="package-info"
        {...props}
      >
        {children ?? (
          <>
            <PackageInfoHeader>
              <PackageInfoName />
              {changeType ? <PackageInfoChangeType /> : null}
            </PackageInfoHeader>
            {currentVersion || newVersion ? <PackageInfoVersion /> : null}
          </>
        )}
      </div>
    </PackageInfoContext.Provider>
  );
}

function PackageInfoHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-3",
        className
      )}
      data-slot="package-info-header"
      {...props}
    />
  );
}

function PackageInfoName({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { name } = useContext(PackageInfoContext);

  return (
    <div
      className={cn("flex min-w-0 items-center gap-2", className)}
      data-slot="package-info-name"
      {...props}
    >
      <PackageIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
      <span
        className="min-w-0 truncate font-medium font-mono text-sm"
        dir="ltr"
      >
        {children ?? name}
      </span>
    </div>
  );
}

function PackageInfoChangeType({
  variant,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Badge>) {
  const { changeType } = useContext(PackageInfoContext);

  if (!changeType) {
    return null;
  }

  return (
    <Badge
      className={cn("gap-1 capitalize", className)}
      data-change-type={changeType}
      data-slot="package-info-change-type"
      variant={variant ?? CHANGE_VARIANTS[changeType]}
      {...props}
    >
      {changeType === "added" ? (
        <PlusIcon aria-hidden="true" className="size-3" />
      ) : null}
      {changeType === "removed" ? (
        <MinusIcon aria-hidden="true" className="size-3" />
      ) : null}
      {changeType !== "added" && changeType !== "removed" ? (
        <ArrowRightIcon
          aria-hidden="true"
          className="size-3 rtl:-scale-x-100"
        />
      ) : null}
      {children ?? changeType}
    </Badge>
  );
}

function PackageInfoVersion({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { currentVersion, newVersion } = useContext(PackageInfoContext);

  if (!(currentVersion || newVersion || children)) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2 font-mono text-muted-foreground text-sm",
        className
      )}
      data-slot="package-info-version"
      {...props}
    >
      {children ?? (
        <>
          {currentVersion ? <span dir="ltr">{currentVersion}</span> : null}
          {currentVersion && newVersion ? (
            <>
              <ArrowRightIcon
                aria-hidden="true"
                className="size-3 shrink-0 rtl:-scale-x-100"
              />
              <span className="sr-only">to</span>
            </>
          ) : null}
          {newVersion ? (
            <span className="font-medium text-foreground" dir="ltr">
              {newVersion}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}

function PackageInfoDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-pretty text-muted-foreground text-sm", className)}
      data-slot="package-info-description"
      {...props}
    />
  );
}

function PackageInfoContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-1 border-t pt-3", className)}
      data-slot="package-info-content"
      {...props}
    />
  );
}

function PackageInfoDependencies({
  label = "Dependencies",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /**
   * The list's heading.
   *
   * @default "Dependencies"
   */
  label?: string;
}) {
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-2", className)}
      data-slot="package-info-dependencies"
      {...props}
    >
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <ul aria-label={label} className="flex flex-col gap-1">
        {children}
      </ul>
    </div>
  );
}

function PackageInfoDependency({
  name,
  version,
  className,
  children,
  ...props
}: React.ComponentProps<"li"> & {
  /** The dependency's name. */
  name: string;
  /** Its version range, such as `^1.1.0`. */
  version?: string;
}) {
  return (
    <li
      className={cn(
        "flex min-w-0 items-center justify-between gap-4 text-xs",
        className
      )}
      data-slot="package-info-dependency"
      {...props}
    >
      {children ?? (
        <>
          <span
            className="min-w-0 truncate font-mono text-muted-foreground"
            dir="ltr"
          >
            {name}
          </span>
          {version ? (
            <span className="shrink-0 font-mono" dir="ltr">
              {version}
            </span>
          ) : null}
        </>
      )}
    </li>
  );
}

export {
  PackageInfo,
  PackageInfoChangeType,
  PackageInfoContent,
  PackageInfoDependencies,
  PackageInfoDependency,
  PackageInfoDescription,
  PackageInfoHeader,
  PackageInfoName,
  PackageInfoVersion,
};
