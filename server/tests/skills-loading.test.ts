import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeSkills } from "../../shared/skills.ts";
import { skeletonSettings } from "../../web/src/lib/settings-skeleton.ts";
test("skills skeleton tolerates supplemental metadata without embedded ids", () => {
  const metadata = JSON.parse(
    readFileSync(new URL("../data/settings-ui.json", import.meta.url), "utf8"),
  );
  const rows = skeletonSettings(metadata, undefined, "skills.");
  assert.ok(rows.length > 0);
  assert.ok(
    rows.every(
      (row) => row.id.startsWith("skills.") && typeof row.label === "string",
    ),
  );
  assert.deepEqual(
    skeletonSettings(
      { "skills.test": { type: "boolean" } },
      undefined,
      "skills.",
    ).map((r) => r.label),
    ["skills.test"],
  );
});
test("skills normalize structured sources and reject malformed collections", () => {
  assert.deepEqual(
    normalizeSkills({
      skills: [
        {
          name: "test",
          source: { type: "project" },
          description: { bad: true },
        },
      ],
    }),
    [
      {
        name: "test",
        source: "project",
        description: undefined,
        filePath: undefined,
      },
    ],
  );
  assert.throws(() => normalizeSkills({ skills: {} }), /invalid skill list/);
});
