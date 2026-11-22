import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileChangeTree, type FileChangeNode } from '../../web/src/lib/file-change-tree.ts';
import type { FileChange } from '../../web/src/lib/file-changes.ts';

const change = (path: string): FileChange => ({ path, added: 2, removed: 1, diff: '+new\n-old', calls: 1 });
const names = (nodes: Map<string, FileChangeNode>) => [...nodes.values()].map(node => node.name);

test('mixed absolute and relative changes start at the Windows chat folder', () => {
  const cwd = 'C:\\Users\\Me\\Downloads\\sources\\menu';
  const native = change(cwd + '\\build\\native_check.ps1');
  const tree = fileChangeTree([native, change('src/app/Application.cpp'), change('./README.md')], cwd);
  assert.deepEqual(names(tree), ['build', 'src', 'README.md']);
  assert.equal(tree.get('build')?.children.get('native_check.ps1')?.file, native);
  assert.equal(tree.get('src')?.children.get('app')?.children.get('Application.cpp')?.file?.path, 'src/app/Application.cpp');
});

test('a single deep change retains its folders relative to the project root', () => {
  const tree = fileChangeTree([change('C:/WORK/Menu/src/app/Application.cpp')], 'c:/work/menu/');
  assert.deepEqual(names(tree), ['src']);
  assert.deepEqual(names(tree.get('src')!.children), ['app']);
});

test('nested working folders resolve relative changes against cwd within the registered project', () => {
  const tree = fileChangeTree([change('./app/../main.cpp')], '/work/menu/src', '/work/menu');
  assert.deepEqual(names(tree), ['src']);
  assert.deepEqual(names(tree.get('src')!.children), ['main.cpp']);
  assert.equal(fileChangeTree([change('/README.md')], '/').get('README.md')?.file?.path, '/README.md');
});

test('outside changes are explicit without ancestor chains, prefix confusion or dropped same-name files', () => {
  const files = [change('C:/work/menu-other/a.cpp'), change('../sibling/a.cpp'), change('D:/other/a.cpp'), change('C:/work/menu/../external/b.cpp')];
  const tree = fileChangeTree(files, 'C:/work/menu');
  assert.deepEqual(names(tree), ['Outside project']);
  const outside = tree.get('\0outside')!;
  assert.deepEqual(names(outside.children), ['a.cpp', 'a.cpp', 'a.cpp', 'b.cpp']);
  assert.deepEqual([...outside.children.values()].map(node => node.file), files);
});
