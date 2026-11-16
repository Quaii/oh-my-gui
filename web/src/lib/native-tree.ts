export function flattenNativeTree(nodes: any[], depth = 0): any[] {
  const pending = nodes.map((node) => ({ node, depth })).reverse();
  const result: any[] = [];
  while (pending.length) {
    const { node, depth } = pending.pop()!;
    if (!node?.entry?.id) continue;
    result.push({ ...node.entry, label: node.label, depth });
    for (let i = (node.children?.length ?? 0) - 1; i >= 0; i--)
      pending.push({ node: node.children[i], depth: depth + 1 });
  }
  return result;
}
