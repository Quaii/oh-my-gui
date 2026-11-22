import type { FileChange } from './file-changes';

export type FileChangeNode = {
  name: string;
  path: string;
  children: Map<string, FileChangeNode>;
  file?: FileChange;
};

function normalize(value: string) {
  const path = value.replaceAll('\\', '/');
  const prefix = path.match(/^(?:[a-z]:\/|\/\/|\/)/i)?.[0] ?? '';
  const parts: string[] = [];
  for (const part of path.slice(prefix.length).split('/')) {
    if (!part || part === '.') continue;
    if (part === '..' && parts.length && parts.at(-1) !== '..') parts.pop();
    else if (part !== '..' || !prefix) parts.push(part);
  }
  return prefix + parts.join('/');
}

const absolute = (value: string) => /^(?:[a-z]:\/|\/)/i.test(value);
const comparison = (value: string) => /^[a-z]:\/|^\/\//i.test(value) ? value.toLowerCase() : value;

/** Display project-relative paths without changing the native path used to open a file. */
export function fileChangeTree(files: FileChange[], cwd: string, projectRoot = cwd) {
  const root: FileChangeNode = { name: '', path: '', children: new Map() };
  const base = normalize(projectRoot).replace(/\/$/, '') || (projectRoot.startsWith('/') ? '/' : '');
  const prefix = base === '/' ? '/' : base + '/';
  for (const file of files) {
    const original = normalize(file.path);
    const resolved = absolute(original) ? original : normalize(cwd + '/' + original);
    const inside = base && comparison(resolved).startsWith(comparison(prefix));
    // Keep genuine out-of-project changes visible without building an ancestor tree.
    const names = inside
      ? resolved.slice(prefix.length).split('/')
      : ['Outside project', original.split('/').at(-1) || file.path];
    let parent = root;
    for (const [index, name] of names.entries()) {
      const key = !inside ? (index === 0 ? '\0outside' : file.path) : name;
      if (!parent.children.has(key)) {
        parent.children.set(key, { name, path: parent.path + '/' + key, children: new Map() });
      }
      parent = parent.children.get(key)!;
    }
    parent.file = file;
  }
  return root.children;
}
