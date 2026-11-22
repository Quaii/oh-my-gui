import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import postcss from "postcss";
import { optimize } from "@tailwindcss/node";

test("production CSS optimization retains standard backdrop blur on every frosted surface", async () => {
  const source = await readFile(
    new URL("../../web/src/index.css", import.meta.url),
    "utf8",
  );
  let checked = 0;
  postcss.parse(source).walkRules((rule) => {
    const blur = rule.nodes.some(
      (node) =>
        node.type === "decl" &&
        node.prop === "backdrop-filter" &&
        node.value.includes("blur("),
    );
    if (!blur) return;
    checked++;
    const built = postcss.parse(
      optimize(rule.toString(), { minify: true }).code,
    );
    let retained = false;
    built.walkDecls("backdrop-filter", (decl) => {
      if (decl.value.includes("blur(")) retained = true;
    });
    assert.ok(
      retained,
      `Production optimization removed backdrop blur from ${rule.selector}`,
    );
  });
  assert.ok(
    checked > 0,
    "Finds and checks the product blur surfaces",
  );
});
