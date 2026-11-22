/** Native skill metadata may contain structured source objects. Only render text fields. */
export function normalizeSkills(value: unknown) {
  const rows = Array.isArray(value) ? value : (value as any)?.skills;
  if (!Array.isArray(rows)) throw Error("OMP returned an invalid skill list");
  return rows
    .filter((row) => row && typeof row.name === "string" && row.name.trim())
    .map((row) => ({
      name: row.name,
      description:
        typeof row.description === "string" ? row.description : undefined,
      filePath: typeof row.filePath === "string" ? row.filePath : undefined,
      source:
        typeof row.source === "string"
          ? row.source
          : typeof row.source?.type === "string"
            ? row.source.type
            : "unknown",
    }));
}
