import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const repository = "Quaii/omp-frontend";
export function mergeUpdateFragments(fragments) {
  if (!fragments.length) throw Error("No signed update fragments found.");
  const first = fragments[0],
    platforms = {};
  for (const fragment of fragments) {
    if (fragment.version !== first.version || fragment.notes !== first.notes)
      throw Error("Release fragments do not match.");
    for (const [target, asset] of Object.entries(fragment.platforms)) {
      if (platforms[target]) throw Error(`Duplicate update target: ${target}`);
      const url = new URL(asset.url);
      if (
        url.protocol !== "https:" ||
        url.host !== "github.com" ||
        !url.pathname.startsWith(
          `/${repository}/releases/download/v${first.version}/`,
        ) ||
        !asset.signature?.trim()
      )
        throw Error("Invalid signed update asset.");
      platforms[target] = asset;
    }
  }
  return {
    version: first.version,
    notes: first.notes,
    pub_date: new Date().toISOString(),
    platforms,
  };
}
async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const pkg = JSON.parse(
    await fs.readFile(path.join(root, "package.json"), "utf8"),
  );
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version))
    throw Error("This stable channel requires a stable version.");
  if (process.env.RELEASE_TAG !== `v${pkg.version}`)
    throw Error("The release tag and app version must match.");
  const folder = path.resolve(
    process.argv[3] || path.join(root, ".tmp/update-release"),
  );
  if (process.argv[2] === "--merge") {
    const fragments = [];
    for (const item of await fs.readdir(folder, { recursive: true })) {
      if (
        path.basename(item).startsWith("update-fragment-") &&
        item.endsWith(".json")
      )
        fragments.push(
          JSON.parse(await fs.readFile(path.join(folder, item), "utf8")),
        );
    }
    const manifest = mergeUpdateFragments(fragments);
    const required = [
      "windows-x86_64",
      "darwin-aarch64",
      "darwin-x86_64",
      "linux-x86_64",
    ];
    if (!required.every((key) => manifest.platforms[key]))
      throw Error("The release is missing a supported platform.");
    await fs.writeFile(
      path.join(folder, "latest.json"),
      JSON.stringify(manifest, null, 2),
    );
    await fs.writeFile(
      path.join(folder, "release-notes.md"),
      manifest.notes + "\n",
    );
    const sums = [];
    for (const name of (await fs.readdir(folder)).filter((name) =>
      name.startsWith("omp_"),
    )) {
      sums.push(
        createHash("sha256")
          .update(await fs.readFile(path.join(folder, name)))
          .digest("hex") +
          "  " +
          name,
      );
    }
    await fs.writeFile(path.join(folder, "SHA256SUMS"), sums.join("\n") + "\n");
    return;
  }
  const platform = { win32: "windows", darwin: "darwin", linux: "linux" }[
    process.platform
  ];
  const arch = { x64: "x86_64", arm64: "aarch64" }[process.arch];
  if (!platform || !arch) throw Error("Unsupported release platform.");
  const bundle = path.join(root, "src-tauri/target/release/bundle");
  const extension =
    process.platform === "win32"
      ? "-setup.exe"
      : process.platform === "darwin"
        ? ".app.tar.gz"
        : ".AppImage";
  const candidates = (await fs.readdir(bundle, { recursive: true })).filter(
    (file) => file.endsWith(extension),
  );
  if (candidates.length !== 1)
    throw Error(
      "Expected one updater package. Clean old bundle output before building a release.",
    );
  const source = path.join(bundle, candidates[0]);
  const signature = (await fs.readFile(source + ".sig", "utf8")).trim();
  if (!signature) throw Error("The update package has no signature.");
  const release = JSON.parse(
    await fs.readFile(path.join(root, "shared/app-release.json"), "utf8"),
  ).releases.find((item) => item.version === pkg.version);
  if (!release)
    throw Error("Add release notes for this version before packaging.");
  const target = `${platform}-${arch}`;
  const name = `omp_${pkg.version}_${target}${process.platform === "win32" ? ".exe" : extension}`;
  await fs.mkdir(folder, { recursive: true });
  await fs.copyFile(source, path.join(folder, name));
  // Keep the branded first-install package separate from the engine used for upgrades.
  const initialDirectory =
    process.platform === "win32"
      ? "custom"
      : process.platform === "darwin"
        ? "dmg"
        : "deb";
  const initialExtension =
    process.platform === "win32"
      ? ".exe"
      : process.platform === "darwin"
        ? ".dmg"
        : ".deb";
  const initialFiles = (
    await fs.readdir(path.join(bundle, initialDirectory))
  ).filter((file) => file.endsWith(initialExtension));
  if (initialFiles.length !== 1)
    throw Error("Expected one first-install package.");
  await fs.copyFile(
    path.join(bundle, initialDirectory, initialFiles[0]),
    path.join(
      folder,
      `omp_${pkg.version}_${target}_installer${initialExtension}`,
    ),
  );
  await fs.writeFile(path.join(folder, name + ".sig"), signature + "\n");
  await fs.writeFile(
    path.join(folder, `update-fragment-${target}.json`),
    JSON.stringify(
      {
        version: pkg.version,
        notes:
          release.title +
          "\n\n" +
          release.changes.map((item) => "- " + item).join("\n"),
        platforms: {
          [target]: {
            url: `https://github.com/${repository}/releases/download/v${pkg.version}/${name}`,
            signature,
          },
        },
      },
      null,
      2,
    ),
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
