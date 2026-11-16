import test from 'node:test';
import assert from 'node:assert/strict';
import { isDmgMountFailure } from '../../scripts/desktop-dmg.mjs';

test('DMG recovery recognizes the runner eject failure without masking compilation or signing errors', () => {
  assert.equal(isDmgMountFailure("failed to run bundle_dmg.sh: hdiutil: couldn't eject disk2 - Resource busy"), true);
  assert.equal(isDmgMountFailure('error: could not compile omp-desktop'), false);
  assert.equal(isDmgMountFailure('bundle_dmg.sh: codesign failed'), false);
  assert.equal(isDmgMountFailure('Resource busy'), false);
});
