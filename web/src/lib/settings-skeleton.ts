export function skeletonSettings(
  metadata: Record<string, any>,
  panel?: string,
  prefix?: string,
) {
  return Object.entries(metadata)
    .map(([id, row]) => ({
      ...row,
      id,
      label: typeof row.label === "string" ? row.label : id,
    }))
    .filter((row) =>
      prefix ? row.id.startsWith(prefix) : panel === "all" || row.tab === panel,
    );
}
