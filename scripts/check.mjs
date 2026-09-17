import {readFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const sources=['dist/game.js','dist/core.mjs','dist/render.mjs','dist/ui.mjs','dist/audio.mjs',
 'dist/data/content.mjs','dist/data/world.mjs','dist/data/spawns.mjs','dist/data/quests.mjs',
 'scripts/serve.mjs','scripts/check.mjs','tests/expansion.mjs','tests/playthrough.mjs','tests/fixtures/core-v1.mjs'];
for(const path of ['dist/index.html','dist/style.css','dist/sprites.png',...sources])assert.ok((await stat(new URL(path,root))).isFile(),path);
for(const path of sources)execFileSync(process.execPath,['--check',new URL(path,root).pathname]);
const html=await readFile(new URL('dist/index.html',root),'utf8');
for(const [,ref] of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
 if(ref.startsWith('data:')||ref==='./')continue;
 assert.ok((await stat(new URL('dist/'+ref,root))).isFile(),`Missing local asset: ${ref}`);
}
const png=await readFile(new URL('dist/sprites.png',root));
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Sprite atlas must be a PNG');
assert.ok(html.includes('<kbd>Z</kbd>'),'Attack hint must use Z');
assert.ok(html.includes('<kbd>X</kbd>'),'Heavy attack hint must use X');
// Every module the page pulls in must exist on disk next to it.
for(const file of sources.filter(f=>f.startsWith('dist/'))){
 const src=await readFile(new URL(file,root),'utf8');
 const dir=file.slice(0,file.lastIndexOf('/')+1);
 for(const [,ref] of src.matchAll(/from\s+'(\.[^']+)'/g)){
  const resolved=new URL(dir+ref.replace(/^\.\//,''),root);
  assert.ok((await stat(resolved)).isFile(),`${file} imports a missing module: ${ref}`);
 }
}
console.log('PASS: entrypoint, every source parses, local references and imports resolve, sprite PNG, legacy fixture, and Z/X control hints.');
