import {readFile,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
for(const path of ['dist/index.html','dist/style.css','dist/game.js','dist/core.mjs','dist/sprites.png','tests/fixtures/core-v1.mjs'])assert.ok((await stat(new URL(path,root))).isFile(),path);
const html=await readFile(new URL('dist/index.html',root),'utf8');
for(const [,ref] of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
 if(ref.startsWith('data:')||ref==='./')continue;
 assert.ok((await stat(new URL('dist/'+ref,root))).isFile(),`Missing local asset: ${ref}`);
}
const png=await readFile(new URL('dist/sprites.png',root));
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Sprite atlas must be a PNG');
assert.ok(html.includes('<kbd>Z</kbd>'),'Attack hint must use Z');
console.log('PASS: entrypoint, local references, sprite PNG, legacy fixture, and Z control hint.');
