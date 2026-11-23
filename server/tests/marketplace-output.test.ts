import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMarketplaceList, parseMarketplacePlugins } from "../src/marketplace-output.ts";

test("marketplace output keeps catalog IDs, versions and source paths", () => {
  assert.deepEqual(parseMarketplaceList("Configured Marketplaces:\r\n\r\n  \x1b[36mdemo\x1b[0m  C:\\Local Catalog\r\n"),
    [{ name: "demo", source: "C:\\Local Catalog" }]);
  assert.deepEqual(parseMarketplacePlugins("Available Plugins (demo):\n\n  sample@1.2.0\n    A sample plugin\n  other\n", "demo"), [
    { id: "sample@demo", name: "sample", version: "1.2.0", description: "A sample plugin" },
    { id: "other@demo", name: "other", version: undefined, description: "" },
  ]);
  assert.deepEqual(parseMarketplaceList("No marketplaces configured\n"), []);
  assert.deepEqual(parseMarketplacePlugins("No plugins found in demo\n", "demo"), []);
  assert.throws(() => parseMarketplacePlugins("Available Plugins (other):\n  sample", "demo"), /unrecognized plugin list/);
});
