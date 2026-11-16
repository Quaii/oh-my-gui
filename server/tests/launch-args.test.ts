import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLaunchArgs, formatLaunchArgs, validateGuiLaunchArgs } from '../../shared/launch-args.ts';
test('quoted flags preserve Windows paths, spaces, empty values and escaped quotes', () => {
  const args = ['--config', 'C:\\My Files\\settings.yml', '--append-system-prompt', 'say "hello"', '--profile', '', 'C:\\My Files\\'];
  assert.deepEqual(parseLaunchArgs(formatLaunchArgs(args)), args);
  assert.deepEqual(parseLaunchArgs("--profile 'work team' --no-tools"), ['--profile', 'work team', '--no-tools']);
  assert.throws(() => parseLaunchArgs('--config "unfinished'), /quoted/);
});
test('GUI launches cannot replace their transport or leak keys through local storage', () => {
  for (const arg of ['--mode=text', '--cwd', '--print', '--goal=test', '--api-key=secret']) assert.throws(() => validateGuiLaunchArgs([arg]));
  assert.deepEqual(validateGuiLaunchArgs(['--profile', 'work', '--no-lsp']), ['--profile', 'work', '--no-lsp']);
});
