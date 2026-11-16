import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNativeHelp, nativeArguments, needsNativeTerminal, powershellLiteral, posixLiteral } from '../../shared/native-help.ts';

const help = parseNativeHelp(`Manage packages

USAGE
  $ omp plugin install PACKAGE

ARGUMENTS
  PACKAGE  (required) Package name

FLAGS
  -f, --force          Replace an existing package
      --scope=<value>  Target scope [options: user, project]
      --api-key=<value>  Credential

COMMANDS
  install  Install a package
  list     Show installed packages
`);
test('native help becomes named arguments, switches and native command choices', () => {
  assert.equal(help.arguments[0].name, 'PACKAGE');
  assert.equal(help.arguments[0].required, true);
  assert.deepEqual(help.commands.map(command => command.name), ['install', 'list']);
  assert.equal(help.flags[0].value, false);
  assert.equal(help.flags[1].value, true);
  assert.deepEqual(help.flags[1].choices, ['user', 'project']);
});
test('guided arguments use argv rather than shell interpretation', () => {
  const descriptor = { ...help, flags: help.flags.map(flag => ({ ...flag, choices: [] })) };
  assert.deepEqual(nativeArguments(descriptor, { '--force': true, '--scope': 'project' }, ['name; $(do not execute)']), ['--force', '--scope=project', '--', 'name; $(do not execute)']);
  assert.throws(() => nativeArguments(help, { '--unknown': true }, []), /advertise/);
  assert.throws(() => nativeArguments(help, { '--api-key': 'secret' }, []), /terminal/);
  assert.equal(needsNativeTerminal(['auth', 'export']), true);
  assert.equal(needsNativeTerminal(['token']), true);
  assert.equal(needsNativeTerminal(['ps', 'list']), false);
});
test('terminal command quoting treats apostrophes and substitutions as data', () => {
  assert.equal(powershellLiteral("it's $(literal)"), "'it''s $(literal)'");
  assert.equal(posixLiteral("it's $(literal)"), "'it'\\''s $(literal)'");
});
