import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { normalizeSkills } from "../../shared/skills.ts";
import { skeletonSettings } from "../../web/src/lib/settings-skeleton.ts";
import { skillFolder } from "../src/skills.ts";
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

test("opens only the parent folder of a discovered skill file", async (t) => {
  const folder = await mkdtemp(path.join(os.tmpdir(), "omp-skill-location-"));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const filePath = path.join(folder, "SKILL.md");
  const otherPath = path.join(folder, "other.md");
  await Promise.all([writeFile(filePath, "# Skill"), writeFile(otherPath, "# Other")]);
  const skills = [{ name: "example", filePath }];

  assert.equal(await skillFolder(skills, "example", filePath), await realpath(folder));
  await assert.rejects(skillFolder(skills, "example", otherPath), /no longer available/);
  await assert.rejects(skillFolder(skills, "wrong-name", filePath), /no longer available/);
  await rm(filePath);
  await assert.rejects(skillFolder(skills, "example", filePath), /could not be found/);
});
