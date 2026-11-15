import assert from 'node:assert/strict';
import test from 'node:test';
import {approvalLaunchOverride,approvalMode} from '../../shared/permissions.ts';
test('permission controls accept only native modes and report authoritative launch overrides',()=>{
 assert.equal(approvalMode('yolo'),'yolo');assert.equal(approvalMode('bypass'),null);
 assert.equal(approvalLaunchOverride([]),null);
 assert.equal(approvalLaunchOverride(['--approval-mode','write']),'write');
 assert.equal(approvalLaunchOverride(['--approval-mode=always-ask']),'always-ask');
 assert.equal(approvalLaunchOverride(['--auto-approve','--approval-mode','always-ask']),'yolo');
});
