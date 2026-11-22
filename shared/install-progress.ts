export const INSTALL_STEPS = [
  { id: "checks", label: "System checks" },
  { id: "package", label: "Verify package" },
  { id: "dependencies", label: "Windows dependencies" },
  { id: "files", label: "App and runtime" },
  { id: "verify", label: "Verify installation" },
  { id: "complete", label: "Open setup" },
] as const;
export type InstallStage = (typeof INSTALL_STEPS)[number]["id"];
export type InstallProgress = {
  stage: InstallStage;
  detail: string;
  bytes?: number;
  totalBytes?: number;
  error?: string;
};
export function nativeInstallStage(log: string) {
  const events = log.split(/\r?\n/).filter(Boolean);
  if (events.includes("integrated")) return "integrated";
  if (events.includes("files")) return "files";
  return undefined;
}
