import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { normalizeSkills } from "../../shared/skills.ts";
import { skeletonSettings } from "../../web/src/lib/settings-skeleton.ts";
import { archiveLocalSkill, installSkill, skillFolder } from "../src/skills.ts";
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

test("removing a standalone skill preserves its whole folder outside discovery", async (t) => {
  const workspace = await realpath(await mkdtemp(path.join(os.tmpdir(), "omp-skill-remove-")));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "skills");
  const folder = path.join(root, "example");
  await mkdir(folder, { recursive: true });
  const skill = path.join(folder, "SKILL.md");
  await writeFile(skill, "# Skill");
  await writeFile(path.join(folder, "reference.md"), "Supporting content");
  const moved = await archiveLocalSkill(skill, root);
  assert.ok(moved.startsWith(path.join(workspace, "removed-skills") + path.sep));
  assert.equal(await readFile(path.join(moved, "reference.md"), "utf8"), "Supporting content");
  await assert.rejects(stat(skill), { code: "ENOENT" });
  await assert.rejects(archiveLocalSkill(path.join(moved, "SKILL.md"), root), /no longer a standalone/);
  await symlink(moved, path.join(root, "linked"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(archiveLocalSkill(path.join(root, "linked", "SKILL.md"), root), /no longer a standalone/);
  assert.equal(await readFile(path.join(moved, "SKILL.md"), "utf8"), "# Skill");
});

test("skill installs accept only native registry package syntax before launching OMP", () => {
  for (const input of ["--registry=https://example.com", "C:/skills/example", "@scope/../other", "@scope/example@x@another", "@scope/example@--yes"]) {
    assert.throws(() => installSkill(input, false), /Enter a Skillshare package/);
  }
});
