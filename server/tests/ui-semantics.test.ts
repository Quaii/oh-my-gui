import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {detectPlatform,shortcutLabel} from '../../web/src/lib/platform.ts';
import {TOOL_ICON_NAMES,toolIconName,toolSettingIconName} from '../../web/src/lib/icon-semantics.ts';
test('keyboard hints distinguish Windows, macOS, and Linux without changing the actual shortcut',()=>{
 assert.equal(detectPlatform('Win32'),'windows');assert.equal(detectPlatform('MacIntel'),'mac');assert.equal(detectPlatform('Linux x86_64'),'linux');assert.equal(detectPlatform('','Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),'windows');
 assert.equal(shortcutLabel('K','windows'),'Ctrl+K');assert.equal(shortcutLabel('K','mac'),'⌘K');assert.equal(shortcutLabel('E','mac',true),'⌘⇧E');
});
test('built-in tools and tool behavior settings have semantic icons instead of the shared wrench fallback',()=>{
 const native=['read','edit','write','bash','grep','glob','find','eval','task','wait','todo','ask','web_search','lsp','ast_edit','debug','ida','ast_grep','github','checkpoint','rewind','context_notes','new_context','retain','recall','reflect','memory_edit','learn','manage_skill','security_scan'];
 for(const name of native)assert.notEqual(toolIconName(name),'Wrench',name);
 const screenshotTools=['debug','ida','ast_grep','github','checkpoint','manage_skill','security_scan'];assert.equal(new Set(screenshotTools.map(toolIconName)).size,screenshotTools.length);
 const schema=JSON.parse(readFileSync(new URL('../data/settings-ui.json',import.meta.url),'utf8'));for(const key of Object.keys(schema).filter(k=>k.startsWith('tools.')))assert.ok(toolSettingIconName(key),key);
 assert.equal(toolIconName('unknown-extension-tool'),'Wrench');assert.ok(Object.keys(TOOL_ICON_NAMES).length>=native.length);
});
