export const INSTALL_STEPS = [
  { id: "checks", label: "System checks" },
  { id: "package", label: "Verify package" },
  { id: "omp", label: "OMP runtime" },
  { id: "dependencies", label: "Windows checks" },
  { id: "files", label: "Install files" },
  { id: "verify", label: "Final checks" },
  { id: "complete", label: "Open setup" },
] as const;
export type InstallStage = (typeof INSTALL_STEPS)[number]["id"];
export type InstallMode = "install" | "update" | "reinstall" | "replace";
export type InstallProgress = {
  stage: InstallStage;
  detail: string;
  bytes?: number;
  totalBytes?: number;
  runtimeVersion?: string;
  error?: string;
};
export function nativeInstallStage(log: string) {
  const events = log.split(/\r?\n/).filter(Boolean);
  if (events.includes("integrated")) return "integrated";
  if (events.includes("files")) return "files";
  return undefined;
}
