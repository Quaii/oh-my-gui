import { stripVTControlCharacters } from "node:util";

const namePattern = "[a-z0-9](?:[a-z0-9.-]{0,62}[a-z0-9])?";
const catalogLine = new RegExp(`^ {2}(?<name>${namePattern}) {2,}(?<source>.+)$`);
const pluginLine = new RegExp(`^ {2}(?<name>${namePattern})(?:@(?<version>[^\\s]+))?$`);

export function parseMarketplaceList(output: string) {
  const lines = stripVTControlCharacters(output).split(/\r?\n/);
  if (lines.some(line => line.trim() === "No marketplaces configured")) return [];
  if (!lines.some(line => line.trim() === "Configured Marketplaces:")) {
    throw new Error("OMP returned an unrecognized marketplace list.");
  }
  return lines.flatMap(line => {
    const entry = line.trimEnd().match(catalogLine)?.groups;
    return entry ? [{ name: entry.name, source: entry.source }] : [];
  });
}

export function parseMarketplacePlugins(output: string, marketplace: string) {
  const lines = stripVTControlCharacters(output).split(/\r?\n/);
  if (lines.some(line => line.trim() === `No plugins found in ${marketplace}`)) return [];
  if (!lines.some(line => line.trim() === `Available Plugins (${marketplace}):`)) {
    throw new Error("OMP returned an unrecognized plugin list.");
  }
  return lines.flatMap((line, index) => {
    const entry = line.trimEnd().match(pluginLine)?.groups;
    if (!entry) return [];
    const description = lines[index + 1]?.startsWith("    ") ? lines[index + 1].trim() : "";
    return [{ id: `${entry.name}@${marketplace}`, name: entry.name, version: entry.version, description }];
  });
}
