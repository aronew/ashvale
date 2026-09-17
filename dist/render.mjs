// Canvas rendering for Ashvale: terrain baking, entity drawing, the sword
// motion system, effects and lighting. Reads the model, never writes to it.
import { TILE, T, clamp, distance, random, ENEMIES, OUTFITS } from './core.mjs';
import { ZONES, TOWN_BUILDINGS } from './data/world.mjs';

export const sprites = [];
const atlas = new Image();
const heroCache = new Map();
let ready = false;

export function loadAtlas(src, onReady, onError){
 atlas.src = src;
 atlas.onload = () => {
  for(let i=0;i<16;i++){
   const c = document.createElement('canvas'); c.width = c.height = 96;
   const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
   g.drawImage(atlas, (i%4)*atlas.width/4, Math.floor(i/4)*atlas.height/4, atlas.width/4, atlas.height/4, 0, 0, 96, 96);
   c.key = 'a'+i;
   sprites.push(c);
  }
  ready = true; onReady();
 };
 atlas.onerror = onError;
}
export const atlasReady = () => ready;

// --- outfit recolouring ---------------------------------------------------
// The hero's garment sits in the 300-360 hue band; skin and hair sit outside
// it. Rotating only that band swaps clothes without repainting the sprite.
function rgbToHsl(r,g,b){
 r/=255; g/=255; b/=255;
 const mx = Math.max(r,g,b), mn = Math.min(r,g,b), l = (mx+mn)/2;
 let h = 0, s = 0;
 if(mx !== mn){ const d = mx-mn; s = l > .5 ? d/(2-mx-mn) : d/(mx+mn);
  h = mx === r ? ((g-b)/d + (g<b?6:0)) : mx === g ? ((b-r)/d + 2) : ((r-g)/d + 4); h *= 60; }
 return [h,s,l];
}
function hslToRgb(h,s,l){
 h = ((h%360)+360)%360;
 if(s === 0){ const v = Math.round(l*255); return [v,v,v]; }
 const q = l < .5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
 const f = t => { t = ((t%1)+1)%1;
  return t < 1/6 ? p+(q-p)*6*t : t < .5 ? q : t < 2/3 ? p+(q-p)*(2/3-t)*6 : p; };
 return [Math.round(f(h/360+1/3)*255), Math.round(f(h/360)*255), Math.round(f(h/360-1/3)*255)];
}
export function heroSprites(outfitId){
 if(heroCache.has(outfitId)) return heroCache.get(outfitId);
 const fit = OUTFITS[outfitId] ?? OUTFITS.wayfarer;
 const out = [];
 for(let i=0;i<4;i++){
  const src = sprites[i];
  if(!src){ return sprites.slice(0,4); }
  const c = document.createElement('canvas'); c.width = c.height = 96;
  c.key = 'h' + outfitId + i;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src,0,0);
  if(fit.hue !== 0 || fit.sat !== 1){
   const img = g.getImageData(0,0,96,96), d = img.data;
   for(let p=0;p<d.length;p+=4){
    if(d[p+3] < 24) continue;
    const [h,s,l] = rgbToHsl(d[p],d[p+1],d[p+2]);
    if(s < .12) continue;                          // leave charcoal outlines alone
    if(h < 296 && h > 20) continue;                // leave skin, hair and leather alone
    const shift = ((fit.hue - 340) + 360) % 360;
    const [r,gg,b] = hslToRgb(h + shift, clamp(s*(fit.sat ?? 1), 0, 1), l);
    d[p] = r; d[p+1] = gg; d[p+2] = b;
   }
   g.putImageData(img,0,0);
  }
  out.push(c);
 }
 heroCache.set(outfitId, out);
 return out;
}

export const TINTS = {
 fire:'hue-rotate(125deg) saturate(1.5) brightness(1.3)',
 flame:'hue-rotate(58deg) saturate(1.9) brightness(1.35)',
 molten:'hue-rotate(195deg) saturate(2) brightness(1.25)',
 purple:'hue-rotate(75deg) saturate(.6)',
 wolf:'hue-rotate(35deg) saturate(.75) brightness(1.15)',
 spider:'hue-rotate(110deg) saturate(.7) brightness(.95)',
 spore:'hue-rotate(300deg) saturate(1.2) brightness(1.1)',
 choir:'hue-rotate(195deg) saturate(.45) brightness(.82)',
 shade:'hue-rotate(245deg) saturate(1.25) brightness(.7)',
 rock:'saturate(.18) brightness(1.15)',
 crawl:'hue-rotate(150deg) saturate(1.2) brightness(1)',
 ash:'saturate(.12) brightness(.8)',
 bramble:'hue-rotate(320deg) saturate(1.5) brightness(.95)',
 devour:'hue-rotate(200deg) saturate(.8) brightness(1)'
};

// =========================================================================
// Terrain
// =========================================================================
const bakes = new Map();
export function bakeZone(game, zone = game.zone){
 if(bakes.has(zone)) return bakes.get(zone);
 const def = ZONES[zone], map = game.maps[zone];
 const c = document.createElement('canvas');
 c.width = def.w*TILE; c.height = def.h*TILE;
 const f = c.getContext('2d');
 const rng = random(zone === 'vale' ? 341 : 977);
 const deep = zone === 'vale';
 f.fillStyle = zone === 'warren' || zone === 'crypt' ? '#07080e' : zone === 'deep' ? '#150a09' : '#10101a';
 f.fillRect(0,0,c.width,c.height);

 for(let y=0;y<def.h;y++) for(let x=0;x<def.w;x++){
  const t = map[y][x], px = x*TILE, py = y*TILE;
  if(t === T.VOID) continue;
  paint(f, t, px, py, x, y, rng, zone, deep, map);
  // Dither the seam between two kinds of ground so regions stop looking tiled.
  if(SOFT.has(t)) for(const [ox,oy] of [[0,-1],[-1,0],[1,0],[0,1]]){
   const n = map[y+oy]?.[x+ox];
   if(n === undefined || n === t || !SOFT.has(n)) continue;
   f.fillStyle = BASE[n];
   for(let i=0;i<9;i++){
    const d = Math.floor(rng()*7), along = Math.floor(rng()*30);
    const bx = ox === 0 ? px+along : px + (ox===1 ? 31-d : d);
    const by = oy === 0 ? py+along : py + (oy===1 ? 31-d : d);
    f.fillRect(bx, by, 1+Math.floor(rng()*3), 1+Math.floor(rng()*2));
   }
  }
  // Charcoal lips where solid ground meets water or void, as in Chapter I.
  for(const [ox,oy] of [[0,-1],[-1,0],[1,0],[0,1]]){
   const n = map[y+oy]?.[x+ox];
   if(n !== T.WATER && n !== T.VOID && n !== T.CHASM && n !== T.LAVA) continue;
   f.fillStyle = zone === 'deep' ? '#25120e' : '#172222';
   if(oy === 1){ f.fillRect(px,py+24,32,8); f.fillStyle = edgeLip(zone); f.fillRect(px,py+23,32,2);
    f.fillStyle = '#38453e55'; f.fillRect(px+2,py+27,13,3); f.fillRect(px+18,py+28,12,3); }
   else if(oy === -1){ f.fillRect(px,py,32,5); f.fillStyle = edgeLip(zone); f.fillRect(px,py+4,32,2); }
   else { f.fillRect(px+(ox===1?27:0),py,5,32); f.fillStyle = edgeLip(zone); f.fillRect(px+(ox===1?26:5),py,1,32); }
  }
 }
 if(zone === 'vale') valeDressing(f);
 if(zone === 'town') townDressing(f, rng);
 // Baked glow so lava and crystal read as light sources without a per-frame cost.
 for(let y=0;y<def.h;y++) for(let x=0;x<def.w;x++){
  const t = map[y][x];
  if(t === T.LAVA) radial(f, x*TILE+16, y*TILE+16, 46, 'rgba(255,124,48,.22)');
  else if(t === T.CRYSTAL && (x+y)%7 === 0) radial(f, x*TILE+16, y*TILE+16, 58, 'rgba(120,214,255,.16)');
  else if(t === T.CINDER) radial(f, x*TILE+16, y*TILE+16, 26, 'rgba(255,140,60,.10)');
 }
 bakes.set(zone, c);
 if(bakes.size > 3) bakes.delete([...bakes.keys()].find(k => k !== zone));
 return c;
}
// Ground types that blend into one another, and the colour they blend with.
const SOFT = new Set([T.GRASS,T.THICKET,T.MOSS,T.DIRT,T.SAND,T.CAVE,T.EMBER,T.PATH,T.MARKET,T.STONE,T.FIELD,T.CINDER,T.CRYSTAL,T.ASH]);
const BASE = { [T.GRASS]:'#293933', [T.THICKET]:'#1e2c26', [T.MOSS]:'#20291f', [T.DIRT]:'#3b352d',
 [T.SAND]:'#4a4336', [T.CAVE]:'#23222b', [T.EMBER]:'#2c1c19', [T.PATH]:'#47453b', [T.MARKET]:'#4b473d',
 [T.STONE]:'#424745', [T.FIELD]:'#3e3a2a', [T.CINDER]:'#331a12', [T.CRYSTAL]:'#1d2733', [T.ASH]:'#4a4650' };
function edgeLip(zone){ return zone === 'deep' ? '#6b4030' : zone === 'warren' || zone === 'crypt' ? '#4a4a52' : '#62655a'; }
function radial(f,x,y,r,color){
 const g = f.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,color); g.addColorStop(1,'rgba(0,0,0,0)');
 f.fillStyle = g; f.fillRect(x-r,y-r,r*2,r*2);
}
const pick = (rng,arr) => arr[Math.floor(rng()*arr.length)];

function paint(f, t, px, py, x, y, rng, zone, vale, map){
 switch(t){
  case T.WATER:
   f.fillStyle = (x+y)%4===0 ? '#16353b' : '#153139'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<2;i++){ f.fillStyle = '#24464b'; f.fillRect(px+rng()*26, py+rng()*29, 3+rng()*9, 1); }
   return;
  case T.GRASS:
   f.fillStyle = '#293933'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<13;i++){ f.fillStyle = pick(rng,['#344a3b','#23382f','#3b4b3b','#415443']);
    f.fillRect(px+Math.floor(rng()*31), py+Math.floor(rng()*31), 1+rng()*3, 1+rng()*3); }
   if(rng()<.15){ f.fillStyle = '#8a9a6577'; f.fillRect(px+8,py+17,2,2); }
   return;
  case T.THICKET:
   f.fillStyle = '#1e2c26'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<16;i++){ f.fillStyle = pick(rng,['#26382e','#1a2a23','#2e4234','#324a38']);
    f.fillRect(px+Math.floor(rng()*31), py+Math.floor(rng()*31), 1+rng()*4, 1+rng()*2); }
   if(rng()<.1){ f.fillStyle = '#6f8f5f55'; f.fillRect(px+rng()*26,py+rng()*26,3,1); }
   return;
  case T.PATH: case T.MARKET: case T.STONE: {
   const stone = t === T.STONE;
   f.fillStyle = t === T.MARKET ? '#4b473d' : stone ? (vale ? (x>59&&y>28?'#35483f':x>55?'#30323e':'#424745') : '#3c4048') : '#47453b';
   f.fillRect(px,py,TILE,TILE);
   for(let row=0;row<4;row++) for(let col=0;col<3;col++){
    const sx = px+col*12-(row%2)*6, sy = py+row*8;
    f.fillStyle = stone
     ? pick(rng, vale ? (x>59&&y>28?['#3d5149','#45594e','#34473e']:x>55?['#363a42','#3e4248','#30353c']:['#4c514c','#444c46','#51574f']) : ['#474b54','#3f434b','#4d525b'])
     : pick(rng, t === T.MARKET ? ['#54503f','#5e5847','#4a4739'] : ['#504f43','#5a5749','#484a40']);
    f.fillRect(Math.max(px,sx)+1, sy+1, Math.min(11, px+32-Math.max(px,sx)), 6);
    f.fillStyle = '#77786b25'; f.fillRect(Math.max(px,sx)+2, sy+1, 6, 1);
   }
   return; }
  case T.BRIDGE:
   f.fillStyle = '#2b2828'; f.fillRect(px,py,32,2);
   f.fillStyle = '#866747'; f.fillRect(px,py+3,32,2);
   for(let i=0;i<4;i++){ f.fillStyle = i%2 ? '#705239' : '#614a35'; f.fillRect(px+1,py+7+i*6,30,5); }
   f.fillStyle = '#b78c5e'; f.fillRect(px+2,py+4,2,2); f.fillRect(px+28,py+4,2,2);
   return;
  case T.GARDEN:
   f.fillStyle = '#44372f'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<4;i++){ f.fillStyle = '#211f26'; f.fillRect(px+4,py+5+i*7,24,2); f.fillStyle = '#65513a'; f.fillRect(px+4,py+7+i*7,24,1); }
   return;
  case T.FIELD:
   f.fillStyle = '#3e3a2a'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<4;i++){ f.fillStyle = '#4c4630'; f.fillRect(px+2,py+4+i*7,28,3); f.fillStyle = '#6d7c4a'; f.fillRect(px+3+((i*7)%9),py+4+i*7,4,2); }
   return;
  case T.DIRT:
   f.fillStyle = '#3b352d'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<16;i++){ f.fillStyle = pick(rng,['#474038','#312c25','#4e463a','#3f3a30']);
    f.fillRect(px+Math.floor(rng()*30), py+Math.floor(rng()*30), 1+rng()*4, 1+rng()*2); }
   if(rng()<.3){ f.fillStyle = '#5a5142'; f.fillRect(px+Math.floor(rng()*24), py+Math.floor(rng()*24), 5+rng()*4, 2); }
   if(rng()<.12){ f.fillStyle = '#26221c'; f.fillRect(px+Math.floor(rng()*26), py+Math.floor(rng()*26), 4, 3); }
   return;
  case T.SAND:
   f.fillStyle = '#4a4336'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<12;i++){ f.fillStyle = pick(rng,['#554d3d','#433c31','#5d5443']);
    f.fillRect(px+Math.floor(rng()*30), py+Math.floor(rng()*30), 2+rng()*3, 1); }
   return;
  case T.CAVE:
   f.fillStyle = '#2d2b36'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<13;i++){ f.fillStyle = pick(rng,['#373542','#24232d','#3f3d4c','#2a2833']);
    f.fillRect(px+Math.floor(rng()*30), py+Math.floor(rng()*30), 2+rng()*4, 1+rng()*2); }
   if(rng()<.12){ f.fillStyle = '#5a5470'; f.fillRect(px+rng()*24,py+rng()*24,3,2); }
   return;
  case T.MOSS:
   f.fillStyle = '#20291f'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<13;i++){ f.fillStyle = pick(rng,['#2b3826','#243020','#35422c','#3d4d33']);
    f.fillRect(px+Math.floor(rng()*30), py+Math.floor(rng()*30), 2+rng()*4, 1+rng()*3); }
   if(rng()<.12){ f.fillStyle = '#7fa06a66'; f.fillRect(px+rng()*24,py+rng()*24,2,2); }
   return;
  case T.CRYSTAL:
   f.fillStyle = '#1d2733'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<9;i++){ f.fillStyle = pick(rng,['#25313f','#1a232e','#2c3b4c']);
    f.fillRect(px+Math.floor(rng()*30), py+Math.floor(rng()*30), 2+rng()*4, 1+rng()*2); }
   if(rng()<.22){ f.fillStyle = '#6fc2e0'; f.fillRect(px+8+rng()*12, py+10+rng()*10, 2, 3); }
   return;
  case T.EMBER:
   f.fillStyle = '#2c1c19'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<11;i++){ f.fillStyle = pick(rng,['#36221d','#241614','#3f2a22']);
    f.fillRect(px+Math.floor(rng()*30), py+Math.floor(rng()*30), 2+rng()*4, 1+rng()*2); }
   return;
  case T.CINDER:
   f.fillStyle = '#331a12'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<9;i++){ f.fillStyle = pick(rng,['#6b2c14','#8a3a15','#4a2010']);
    f.fillRect(px+Math.floor(rng()*28), py+Math.floor(rng()*28), 2+rng()*5, 2); }
   f.fillStyle = '#ff8a3c66'; f.fillRect(px+6+rng()*16, py+8+rng()*14, 3, 2);
   return;
  case T.LAVA:
   f.fillStyle = '#8c2f10'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<8;i++){ f.fillStyle = pick(rng,['#c4551a','#e8802a','#a53c12']);
    f.fillRect(px+Math.floor(rng()*26), py+Math.floor(rng()*26), 3+rng()*7, 2+rng()*3); }
   f.fillStyle = '#ffc46a'; f.fillRect(px+rng()*22, py+rng()*22, 3, 2);
   return;
  case T.ROCK: {
   const dark = zone === 'deep' ? '#190d0c' : '#13121a';
   const face = zone === 'deep' ? '#3a1f18' : '#2b2935';
   const lip  = zone === 'deep' ? '#5d3521' : '#413e51';
   f.fillStyle = dark; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<7;i++){ f.fillStyle = zone === 'deep' ? '#221210' : '#1b1a24';
    f.fillRect(px+Math.floor(rng()*28), py+Math.floor(rng()*28), 3+rng()*5, 2+rng()*2); }
   // Only the side that faces open ground gets a lit cliff face.
   for(const [ox,oy] of [[0,1],[0,-1],[1,0],[-1,0]]){
    const n = map[y+oy]?.[x+ox];
    if(n === undefined || n === T.ROCK || n === T.VOID || n === T.WALL) continue;
    if(oy === 1){ f.fillStyle = face; f.fillRect(px,py+18,32,14); f.fillStyle = lip; f.fillRect(px,py+18,32,3);
     for(let i=0;i<4;i++){ f.fillStyle = dark; f.fillRect(px+2+i*8, py+23, 3, 6+rng()*4); } }
    else if(oy === -1){ f.fillStyle = face; f.fillRect(px,py,32,8); f.fillStyle = lip; f.fillRect(px,py+7,32,2); }
    else { f.fillStyle = face; f.fillRect(px+(ox===1?22:0),py,10,32); f.fillStyle = lip; f.fillRect(px+(ox===1?22:8),py,2,32); }
   }
   return; }
  case T.CHASM:
   f.fillStyle = '#05060b'; f.fillRect(px,py,TILE,TILE);
   f.fillStyle = '#0b0d15'; f.fillRect(px+2,py+2,28,28);
   return;
  case T.WALL:
   f.fillStyle = '#211f28'; f.fillRect(px,py,TILE,TILE);
   for(let row=0;row<4;row++) for(let col=0;col<2;col++){
    const sx = px+col*16-(row%2)*8, sy = py+row*8;
    f.fillStyle = pick(rng,['#33303c','#2b2934','#3a3745']);
    f.fillRect(Math.max(px,sx)+1, sy+1, Math.min(15, px+32-Math.max(px,sx)), 6);
    f.fillStyle = '#4a4757aa'; f.fillRect(Math.max(px,sx)+1, sy+1, Math.min(15, px+32-Math.max(px,sx)), 1);
   }
   return;
  case T.WOOD:
   f.fillStyle = '#4a3527'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<4;i++){ f.fillStyle = i%2 ? '#56402e' : '#402d21'; f.fillRect(px,py+i*8,32,7);
    f.fillStyle = '#2b1e16'; f.fillRect(px,py+i*8+7,32,1); }
   return;
  case T.RUG: {
   // One continuous carpet: only the outer tiles carry a border.
   f.fillStyle = '#5d2c37'; f.fillRect(px,py,TILE,TILE);
   for(let i=0;i<10;i++){ f.fillStyle = pick(rng,['#67333f','#552832','#6e3a46']);
    f.fillRect(px+Math.floor(rng()*30), py+Math.floor(rng()*30), 2+rng()*4, 2); }
   f.fillStyle = '#a5794a33';
   f.fillRect(px+((x%2)?4:12), py+((y%2)?4:12), 8, 8);
   for(const [ox,oy] of [[0,-1],[-1,0],[1,0],[0,1]]){
    if(map[y+oy]?.[x+ox] === T.RUG) continue;
    f.fillStyle = '#8f6440';
    if(oy === -1) f.fillRect(px,py,32,4); else if(oy === 1) f.fillRect(px,py+28,32,4);
    else f.fillRect(px+(ox===1?28:0),py,4,32);
    f.fillStyle = '#c89a5e66';
    if(oy === -1) f.fillRect(px,py+4,32,1); else if(oy === 1) f.fillRect(px,py+27,32,1);
    else f.fillRect(px+(ox===1?27:4),py,1,32);
   }
   return; }
  default:
   f.fillStyle = '#33313a'; f.fillRect(px,py,TILE,TILE);
 }
}

// Chapter I hand-placed dressing, kept exactly where it was.
function valeDressing(f){
 for(const row of [32.75,35.85]) for(let x=38;x<45;x++){
  const px = x*TILE, py = row*TILE;
  f.fillStyle = '#342529'; f.fillRect(px,py-13,34,4); f.fillRect(px+1,py-20,5,25);
  f.fillStyle = '#8b6250'; f.fillRect(px+1,py-20,4,2); f.fillRect(px,py-13,32,1);
 }
 for(const [x,y] of [[17,29],[17,30],[17,31],[34,30],[34,31],[34,32],[14,39],[14,40],[14,41],[14,42]]){
  f.fillStyle = '#432e31'; f.fillRect(x*TILE,y*TILE-6,5,18); f.fillRect(x*TILE+2,y*TILE-4,31,3); f.fillRect(x*TILE+2,y*TILE+4,31,3);
  f.fillStyle = '#8a6051'; f.fillRect(x*TILE,y*TILE-7,5,2);
 }
}
function townDressing(f, rng){
 // Cart ruts down the high street and the market road.
 f.globalAlpha = .18; f.fillStyle = '#20201c';
 for(let x=7*TILE;x<71*TILE;x+=6){ f.fillRect(x, 28.4*TILE, 4, 2); f.fillRect(x, 30.1*TILE, 4, 2); }
 for(let y=7*TILE;y<51*TILE;y+=6){ f.fillRect(36.3*TILE, y, 2, 4); f.fillRect(38.1*TILE, y, 2, 4); }
 f.globalAlpha = 1;
 // Curtain wall: walkway, parapet and crenellations.
 const wallRuns = [[5,5,68,2,'h'],[5,51,68,2,'h'],[5,5,2,48,'v'],[71,5,2,48,'v']];
 for(const [wx,wy,ww,wh,dir] of wallRuns){
  const px = wx*TILE, py = wy*TILE, pw = ww*TILE, ph = wh*TILE;
  f.fillStyle = '#3b3846'; f.fillRect(px+4, py+4, pw-8, ph-8);
  f.fillStyle = '#2a2833'; f.fillRect(px+4, py+4, pw-8, 3);
  if(dir === 'h') for(let i=0;i<pw;i+=22){ f.fillStyle = '#4a4757'; f.fillRect(px+i+3, py-4, 13, 8); f.fillRect(px+i+3, py+ph-4, 13, 8); }
  else for(let i=0;i<ph;i+=22){ f.fillStyle = '#4a4757'; f.fillRect(px-4, py+i+3, 8, 13); f.fillRect(px+pw-4, py+i+3, 8, 13); }
 }
 // The three gate arches.
 for(const [gx,gy,gw,gh] of [[71,27,2,5],[35,51,5,2],[35,5,5,2]]){
  f.fillStyle = '#171520'; f.fillRect(gx*TILE, gy*TILE, gw*TILE, gh*TILE);
  f.fillStyle = '#5b4a3a'; f.fillRect(gx*TILE, gy*TILE, gw*TILE, 4); f.fillRect(gx*TILE, (gy+gh)*TILE-4, gw*TILE, 4);
 }
}

// =========================================================================
// Sword motion. One pose function feeds both the blade and its trail, so the
// arc you see is exactly the arc the model swung.
// =========================================================================
export function bladePose(swing, phase, impactPhase){
 const [a0,a1] = swing.arc;
 const style = swing.style;
 if(phase < impactPhase){
  // Anticipation: wind back past the start and coil in.
  const w = phase/Math.max(.0001,impactPhase);
  const back = style === 'thrust' || style === 'stab' ? 0 : (a1 > a0 ? -.55 : .55);
  return { angle: a0 + back*(1-Math.pow(1-w,2)), reach: style === 'thrust' || style === 'stab' ? .55 : .74 - w*.1, wind:true, t:w };
 }
 const p = clamp((phase-impactPhase)/(1-impactPhase), 0, 1);
 const ease = 1 - Math.pow(1-p, style === 'slam' || style === 'cleave' ? 2.2 : 3);
 if(style === 'thrust' || style === 'stab'){
  const punch = p < .34 ? p/.34 : 1 - (p-.34)/.66*.55;
  return { angle: a0 + (a1-a0)*ease, reach: .55 + punch*.85, t:p };
 }
 if(style === 'cleave' || style === 'slam'){
  // Overhead: the blade drops and the reach opens out as it falls.
  return { angle: a0 + (a1-a0)*ease, reach: .48 + ease*.72, t:p };
 }
 return { angle: a0 + (a1-a0)*ease, reach: .92 + Math.sin(p*Math.PI)*.22, t:p };
}

// A tapered ribbon swept along the blade tip: the single biggest difference
// between a sword that "swings weird" and one that reads as a real arc.
// Hit reach and blade length are deliberately different numbers — the hitbox
// is generous, the weapon stays the size a person could actually hold.
export const BLADE_LEN = { sword:34, dagger:22, great:48, spear:54, saber:38, maul:38, glaive:50 };
export const BLADE_WIDTH = { sword:4.5, dagger:3, great:7.5, spear:3.2, saber:4, maul:9, glaive:5 };
const HAND = 12;

function tipAt(swing, phase, impactPhase, blade){
 const pose = bladePose(swing, phase, impactPhase);
 return { pose, r: HAND + blade*pose.reach };
}
function ribbon(ctx, swing, phase, impactPhase, blade, color, alpha){
 const samples = 14, span = .40;
 const outer = [], inner = [];
 for(let i=0;i<=samples;i++){
  const t = phase - span*(1 - i/samples);
  if(t < impactPhase) continue;
  const { pose, r } = tipAt(swing, Math.min(t, phase), impactPhase, blade);
  outer.push([Math.cos(pose.angle)*r, Math.sin(pose.angle)*r]);
  const ir = HAND + blade*.22;
  inner.push([Math.cos(pose.angle)*ir, Math.sin(pose.angle)*ir]);
 }
 if(outer.length < 3) return;
 ctx.beginPath();
 ctx.moveTo(outer[0][0], outer[0][1]);
 for(let i=1;i<outer.length;i++) ctx.lineTo(outer[i][0], outer[i][1]);
 for(let i=inner.length-1;i>=0;i--) ctx.lineTo(inner[i][0], inner[i][1]);
 ctx.closePath();
 const tip = outer[outer.length-1];
 const g = ctx.createLinearGradient(outer[0][0], outer[0][1], tip[0], tip[1]);
 g.addColorStop(0, color+'00');
 g.addColorStop(.5, color+'4d');
 g.addColorStop(1, color+'b3');
 ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fill();
 ctx.beginPath(); ctx.moveTo(outer[0][0], outer[0][1]);
 for(let i=1;i<outer.length;i++) ctx.lineTo(outer[i][0], outer[i][1]);
 ctx.strokeStyle = '#fff8e2'; ctx.lineWidth = 1.6; ctx.globalAlpha = alpha*.75; ctx.stroke();
 ctx.globalAlpha = 1;
}

export function drawSwing(ctx, game, p, phase){
 const swing = game.currentSwing(), w = game.weapon();
 const impactPhase = clamp((swing.impact/(w.speed??1)) / Math.max(.0001, p.attackDuration), 0, .95);
 const pose = bladePose(swing, phase, impactPhase);
 const blade = BLADE_LEN[w.kind] ?? 34, halfW = BLADE_WIDTH[w.kind] ?? 4.5;
 const color = w.trail, heavy = p.heavy;

 ctx.save();
 ctx.translate(p.x, p.y - 20);
 ctx.rotate(p.attackAngle);
 ctx.scale(1, .84);                       // the world is seen at a slight tilt

 if(!pose.wind){
  const fade = 1 - Math.pow(pose.t, 1.7);
  if(heavy){
   ctx.globalCompositeOperation = 'lighter';
   ribbon(ctx, swing, phase, impactPhase, blade*1.12, color, fade*.45);
   ctx.globalCompositeOperation = 'source-over';
  }
  ribbon(ctx, swing, phase, impactPhase, blade, color, fade*.95);
  if(swing.style === 'spin' || swing.style === 'reaver'){
   ctx.globalAlpha = fade*.3; ctx.strokeStyle = color; ctx.lineWidth = 2.5;
   ctx.beginPath(); ctx.arc(0, 0, HAND + blade*.8, pose.angle-2.6, pose.angle); ctx.stroke();
   ctx.globalAlpha = 1;
  }
 }

 // The weapon itself: pommel, grip, guard and blade, along the current pose.
 const r = HAND + blade*pose.reach;
 ctx.rotate(pose.angle);
 ctx.globalAlpha = pose.wind ? .8 : Math.min(1, (1-pose.t)*2.6 + .3);
 ctx.fillStyle = '#c8a066'; ctx.fillRect(HAND-13, -3, 3, 6);            // pommel
 ctx.fillStyle = '#6a4a33'; ctx.fillRect(HAND-10, -2.2, 10, 4.4);       // grip
 ctx.fillStyle = '#e2bd7c'; ctx.fillRect(HAND, -halfW-2.5, 3.5, halfW*2+5); // cross guard
 ctx.beginPath();
 if(swing.style === 'thrust' || swing.style === 'stab'){
  ctx.moveTo(HAND+3, -halfW*.7); ctx.lineTo(r-5, -halfW*.55); ctx.lineTo(r, 0);
  ctx.lineTo(r-5, halfW*.55); ctx.lineTo(HAND+3, halfW*.7);
 } else {
  ctx.moveTo(HAND+3, -halfW); ctx.lineTo(r-blade*.16, -halfW*.7); ctx.lineTo(r, 0);
  ctx.lineTo(r-blade*.16, halfW*.75); ctx.lineTo(HAND+3, halfW);
 }
 ctx.closePath(); ctx.fillStyle = w.blade ?? '#ddd0b0'; ctx.fill();
 ctx.strokeStyle = '#fff6dc'; ctx.lineWidth = 1;
 ctx.beginPath(); ctx.moveTo(HAND+4, -.5); ctx.lineTo(r-3, -.5); ctx.stroke();
 ctx.globalAlpha = 1;
 ctx.restore();
}

// Held-weapon pose while walking, so the character is never empty-handed.
export function drawIdleWeapon(ctx, game, p, bob){
 const w = game.weapon();
 const left = p.dir === 2;
 ctx.save();
 ctx.translate(p.x + (left?-15:15), p.y - 22 + bob);
 ctx.rotate(left ? -.55 : .55);
 ctx.fillStyle = '#6a4a33'; ctx.fillRect(-4,-2,10,4);
 ctx.fillStyle = '#e2bd7c'; ctx.fillRect(5,-4,3,8);
 const len = (BLADE_LEN[w.kind] ?? 34)*.8;
 ctx.beginPath(); ctx.moveTo(8,-3); ctx.lineTo(8+len,0); ctx.lineTo(8,3); ctx.closePath();
 ctx.fillStyle = w.blade ?? '#ddd0b0'; ctx.fill();
 ctx.restore();
}

// =========================================================================
// Props, buildings and entities
// =========================================================================
const SPR = { tree:4, ore:5, chest:6, lamp:7, cottage:8, ruin:9, hearth:10, arch:11, npc:14, herb:15, beacon:7 };
const SIZE = { tree:[116,138], ore:[55,51], chest:[42,38], lamp:[38,73], cottage:[188,184], ruin:[176,169],
 hearth:[72,66], arch:[135,133], npc:[53,62], herb:[42,40], beacon:[64,109] };
const NODE = {
 iron:   { i:5, w:58, h:54, filter:'sepia(.5) hue-rotate(-18deg) saturate(1.4) brightness(1.05)' },
 coal:   { i:5, w:52, h:48, filter:'saturate(.1) brightness(.5)' },
 crystal:{ i:5, w:54, h:58, filter:'hue-rotate(150deg) saturate(1.8) brightness(1.3)' },
 cinder: { i:5, w:54, h:50, filter:'hue-rotate(-30deg) saturate(2) brightness(1.2)' },
 web:    { i:15, w:44, h:42, filter:'saturate(.15) brightness(1.7)' },
 shroom: { i:15, w:36, h:34, filter:'hue-rotate(60deg) saturate(1.2) brightness(1.1)' },
 bones:  { i:15, w:40, h:30, filter:'saturate(.1) brightness(1.5)' }
};

export function shadow(ctx,x,y,w=20,h=7){ ctx.fillStyle = '#080c1690'; ctx.beginPath(); ctx.ellipse(x,y,w,h,0,0,Math.PI*2); ctx.fill(); }
// Colour treatments are baked into cached canvases once. Setting ctx.filter
// per draw costs a separate compositing pass per sprite and was, on its own,
// the difference between 18fps and 60fps in the larger regions.
const tintCache = new Map();
function tinted(src, filter){
 if(!filter || !src.key) return src;
 const key = src.key + '|' + filter;
 let out = tintCache.get(key);
 if(out) return out;
 out = document.createElement('canvas');
 out.width = src.width; out.height = src.height; out.key = key;
 const g = out.getContext('2d');
 g.imageSmoothingEnabled = false; g.filter = filter;
 g.drawImage(src, 0, 0);
 if(tintCache.size > 256) tintCache.clear();
 tintCache.set(key, out);
 return out;
}
const HIT_FILTER = 'brightness(1.9) saturate(.4)';
const DARK_FILTER = 'brightness(.48) saturate(.5)';
export function drawSprite(ctx,i,x,y,w,h,opts={}){
 let src = opts.sprite ?? sprites[i];
 if(!src) return;
 const filter = opts.hit ? HIT_FILTER : opts.filter ? opts.filter : opts.dark ? DARK_FILTER : null;
 if(filter) src = tinted(src, filter);
 ctx.save(); ctx.globalAlpha = opts.alpha ?? 1;
 ctx.translate(Math.round(x), Math.round(y));
 if(opts.rotation) ctx.rotate(opts.rotation);
 if(opts.flip) ctx.scale(-1,1);
 if(opts.squash) ctx.scale(1+opts.squash, 1-opts.squash*.8);
 ctx.drawImage(src, Math.round(-w/2), Math.round(-h*.89), w, h);
 ctx.restore();
}
export function glow(ctx,x,y,r,color){
 const g = ctx.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,color); g.addColorStop(1,'#ffae4800');
 ctx.fillStyle = g; ctx.fillRect(x-r,y-r,r*2,r*2);
}

// Roof colours follow the atlas cottage: burgundy tiles, copper trim.
const BUILD_STYLE = {
 forge:   { wall:'#3d3229', roof:'#6d3423', trim:'#a5652f', lit:'#ffb055' },
 tavern:  { wall:'#42352a', roof:'#7d2634', trim:'#c08347', lit:'#ffc470' },
 hall:    { wall:'#39353f', roof:'#5b3350', trim:'#a58bb4', lit:'#e7cf92' },
 temple:  { wall:'#3d3d45', roof:'#455473', trim:'#a9b4c6', lit:'#ffe7ae' },
 loom:    { wall:'#3e323b', roof:'#6c2f57', trim:'#b87da4', lit:'#ffd0e0' },
 keep:    { wall:'#363a44', roof:'#3f4c63', trim:'#8e9aaa', lit:'#cfd8e6' },
 house:   { wall:'#3d352d', roof:'#782030', trim:'#a4713f', lit:'#ffc97e' }
};
export function drawBuilding(ctx, b, t, night){
 const s = BUILD_STYLE[b.style] ?? BUILD_STYLE.house;
 const x = b.x*TILE, y = b.y*TILE, w = b.w*TILE, h = b.h*TILE;
 const wallH = 26;                                     // the sliver of front wall we can see
 const roofB = y + h - wallH, ridge = y + (roofB - y)*.52;
 ctx.fillStyle = '#080a1266'; ctx.fillRect(x+8, y+h-2, w, 12);

 // Front wall
 ctx.fillStyle = s.wall; ctx.fillRect(x, roofB, w, wallH+2);
 for(let i=0;i<Math.ceil(w/18);i++){
  ctx.fillStyle = i%2 ? '#ffffff0c' : '#00000018';
  ctx.fillRect(x+i*18, roofB+3, 16, wallH-4);
 }
 ctx.fillStyle = '#00000055'; ctx.fillRect(x, y+h, w, 3);

 // Roof: two pitches meeting at a ridge, read from directly above.
 ctx.fillStyle = shade(s.roof, -.10); ctx.fillRect(x-7, y, w+14, ridge-y);          // far slope
 ctx.fillStyle = shade(s.roof, .05);  ctx.fillRect(x-7, ridge, w+14, roofB-ridge);  // near slope
 for(let r=0; y+r*6 < roofB-3; r++){                                                // shingle courses
  const ry = y + r*6, near = ry >= ridge;
  ctx.fillStyle = near ? '#00000045' : '#00000038';
  ctx.fillRect(x-7, ry+5, w+14, 1);
  for(let c=0;c<Math.ceil((w+14)/11);c++){
   ctx.fillStyle = (r+c)%2 ? (near ? '#ffffff1c' : '#ffffff12') : '#00000022';
   ctx.fillRect(x-7+c*11+(r%2?5:0), ry, 10, 5);
  }
 }
 ctx.fillStyle = shade(s.trim, .12); ctx.fillRect(x-8, ridge-3, w+16, 4);           // ridge cap
 ctx.fillStyle = '#ffffff14';        ctx.fillRect(x-8, ridge-3, w+16, 1);
 ctx.fillStyle = s.trim;             ctx.fillRect(x-9, roofB-3, w+18, 4);           // eaves
 ctx.fillStyle = '#00000040';        ctx.fillRect(x-9, roofB+1, w+18, 3);
 ctx.fillStyle = shade(s.roof,-.3);  ctx.fillRect(x-9, y-2, w+18, 3);               // ridge board

 // Windows in the wall, lit after dark.
 const count = Math.max(1, Math.floor(w/76));
 for(let i=0;i<count;i++){
  const wx = x + (w/(count+1))*(i+1) - 7;
  if(Math.abs(wx - b.door[0]*TILE) < 26) continue;
  ctx.fillStyle = night ? s.lit : '#171720';
  ctx.fillRect(wx, roofB+6, 14, 13);
  ctx.fillStyle = '#00000066'; ctx.fillRect(wx+6, roofB+6, 2, 13); ctx.fillRect(wx, roofB+12, 14, 2);
  ctx.fillStyle = s.trim; ctx.fillRect(wx-2, roofB+4, 18, 2);
 }
 // Doorway
 const dx = b.door[0]*TILE, dy = b.door[1]*TILE;
 ctx.fillStyle = '#17100c'; ctx.fillRect(dx-11, dy-26, 22, 26);
 ctx.fillStyle = shade(s.trim,-.1); ctx.fillRect(dx-13, dy-29, 26, 4);
 ctx.fillStyle = '#3a2a1e'; ctx.fillRect(dx-9, dy-24, 18, 24);
 ctx.fillStyle = '#c9a56a'; ctx.fillRect(dx+4, dy-13, 3, 3);
 if(night){ ctx.fillStyle = s.lit+'55'; ctx.fillRect(dx-11, dy-4, 22, 5); }

 if(b.style === 'forge' || b.style === 'tavern' || b.style === 'house'){
  ctx.fillStyle = '#231e19'; ctx.fillRect(x+w-34, y+6, 14, 22);
  ctx.fillStyle = '#332c24'; ctx.fillRect(x+w-36, y+4, 18, 5);
  ctx.globalAlpha = .16; ctx.fillStyle = '#cfc8ba';
  for(let i=0;i<3;i++){ const p = (t*.3+i*.33)%1;
   ctx.beginPath(); ctx.arc(x+w-27+Math.sin(t+i)*8, y+2-p*42, 4+p*10, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
 }
 // Hanging sign
 ctx.font = '9px Georgia'; ctx.textAlign = 'center';
 ctx.fillStyle = '#12100f99'; ctx.fillRect(x+w/2-b.name.length*2.7, roofB-17, b.name.length*5.4, 12);
 ctx.fillStyle = '#cbb894'; ctx.fillText(b.name.toUpperCase(), x+w/2, roofB-8);
}
function shade(hex, amount){
 const n = parseInt(hex.slice(1),16);
 const f = v => Math.max(0, Math.min(255, Math.round(v + 255*amount)));
 return '#' + [f(n>>16), f((n>>8)&255), f(n&255)].map(v=>v.toString(16).padStart(2,'0')).join('');
}

export function drawProp(ctx, o, t, game){
 const x = o.x, y = o.y, night = game.isNight();
 switch(o.art){
  case 'stall': {
   shadow(ctx,x,y,26,8);
   ctx.fillStyle = '#3a2b22'; ctx.fillRect(x-26,y-26,52,26);
   ctx.fillStyle = o.tint ?? '#7a4a4a'; ctx.fillRect(x-32,y-44,64,20);
   for(let i=0;i<8;i++){ ctx.fillStyle = i%2 ? '#00000026' : '#ffffff18'; ctx.fillRect(x-32+i*8, y-44, 4, 20); }
   ctx.fillStyle = '#2b2018'; ctx.fillRect(x-30,y-24,4,24); ctx.fillRect(x+26,y-24,4,24);
   ctx.fillStyle = '#c9a56a'; ctx.fillRect(x-18,y-30,10,5); ctx.fillRect(x+4,y-30,12,5);
   return; }
  case 'barrel':
   shadow(ctx,x,y,11,4);
   ctx.fillStyle = '#54402c'; ctx.fillRect(x-10,y-26,20,26);
   ctx.fillStyle = '#6b5236'; ctx.fillRect(x-10,y-26,20,4);
   ctx.fillStyle = '#39291c'; ctx.fillRect(x-10,y-18,20,3); ctx.fillRect(x-10,y-8,20,3);
   return;
  case 'crate':
   shadow(ctx,x,y,12,4);
   ctx.fillStyle = '#5a452e'; ctx.fillRect(x-12,y-24,24,24);
   ctx.fillStyle = '#3d2d1e'; ctx.fillRect(x-12,y-24,24,3);
   ctx.strokeStyle = '#7a613f'; ctx.lineWidth = 2;
   ctx.beginPath(); ctx.moveTo(x-12,y-24); ctx.lineTo(x+12,y); ctx.moveTo(x+12,y-24); ctx.lineTo(x-12,y); ctx.stroke();
   return;
  case 'cart':
   shadow(ctx,x,y,30,7);
   ctx.fillStyle = '#4a3625'; ctx.fillRect(x-30,y-26,60,18);
   ctx.fillStyle = '#5d452e'; ctx.fillRect(x-30,y-28,60,4);
   ctx.fillStyle = '#241a12'; ctx.beginPath(); ctx.arc(x-17,y-4,9,0,7); ctx.arc(x+17,y-4,9,0,7); ctx.fill();
   ctx.strokeStyle = '#6a5138'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x-17,y-4,9,0,7); ctx.arc(x+17,y-4,9,0,7); ctx.stroke();
   return;
  case 'well':
   shadow(ctx,x,y,20,7);
   ctx.fillStyle = '#4b4a45'; ctx.beginPath(); ctx.ellipse(x,y-8,20,10,0,0,7); ctx.fill();
   ctx.fillStyle = '#16181d'; ctx.beginPath(); ctx.ellipse(x,y-10,13,6,0,0,7); ctx.fill();
   ctx.fillStyle = '#3a2b21'; ctx.fillRect(x-16,y-44,4,34); ctx.fillRect(x+12,y-44,4,34);
   ctx.fillStyle = '#5a3d2c'; ctx.fillRect(x-22,y-52,44,9);
   return;
  case 'fountain':
   shadow(ctx,x,y,30,10);
   ctx.fillStyle = '#4e4d48'; ctx.beginPath(); ctx.ellipse(x,y-8,30,15,0,0,7); ctx.fill();
   ctx.fillStyle = '#1d3339'; ctx.beginPath(); ctx.ellipse(x,y-10,23,11,0,0,7); ctx.fill();
   ctx.fillStyle = '#56555060'; ctx.beginPath(); ctx.ellipse(x,y-11,23,11,0,0,7); ctx.fill();
   ctx.fillStyle = '#5c5a53'; ctx.fillRect(x-6,y-40,12,30);
   ctx.fillStyle = '#7a7870'; ctx.beginPath(); ctx.ellipse(x,y-42,11,5,0,0,7); ctx.fill();
   ctx.globalAlpha = .5; ctx.fillStyle = '#9fd0da';
   for(let i=0;i<7;i++){ const a = i/7*Math.PI*2 + t; ctx.fillRect(x+Math.cos(a)*(10+Math.sin(t*3+i)*4), y-38+Math.abs(Math.sin(t*2+i))*20, 2, 5); }
   ctx.globalAlpha = 1;
   return;
  case 'statue':
   shadow(ctx,x,y,16,6);
   ctx.fillStyle = '#4a4841'; ctx.fillRect(x-16,y-14,32,14);
   ctx.fillStyle = '#5c5a52'; ctx.fillRect(x-9,y-56,18,42);
   ctx.fillStyle = '#6d6a60'; ctx.beginPath(); ctx.arc(x,y-62,9,0,7); ctx.fill();
   ctx.fillStyle = '#3d3b35'; ctx.fillRect(x-13,y-46,26,4);
   return;
  case 'pillar':
   shadow(ctx,x,y,15,6);
   ctx.fillStyle = '#3f3d46'; ctx.fillRect(x-14,y-8,28,10);
   ctx.fillStyle = '#4c4a55'; ctx.fillRect(x-11,y-76,22,70);
   for(let i=0;i<5;i++){ ctx.fillStyle = '#00000026'; ctx.fillRect(x-11,y-70+i*14,22,3); }
   ctx.fillStyle = '#585665'; ctx.fillRect(x-15,y-84,30,10);
   return;
  case 'shrine':
   shadow(ctx,x,y,18,7);
   ctx.fillStyle = '#42404a'; ctx.fillRect(x-18,y-12,36,12);
   ctx.fillStyle = '#4e4c58'; ctx.fillRect(x-12,y-50,24,38);
   ctx.fillStyle = '#d7b978'; ctx.globalAlpha = .55+Math.sin(t*2)*.25;
   ctx.beginPath(); ctx.arc(x,y-56,7,0,7); ctx.fill(); ctx.globalAlpha = 1;
   glow(ctx,x,y-56,52,'#ffdc9a2e');
   return;
  case 'campfire': case 'brazier': case 'forgefire': {
   const h = o.art === 'brazier' ? 30 : o.art === 'forgefire' ? 12 : 0;
   shadow(ctx,x,y,14,5);
   if(o.art === 'brazier'){ ctx.fillStyle = '#3a3630'; ctx.fillRect(x-4,y-30,8,30); ctx.fillStyle = '#4e463c'; ctx.fillRect(x-12,y-38,24,9); }
   else if(o.art === 'forgefire'){
    ctx.fillStyle = '#26221f'; ctx.fillRect(x-24,y-14,48,14);
    ctx.fillStyle = '#332d28'; ctx.fillRect(x-26,y-20,52,7);
    ctx.fillStyle = '#100c0a'; ctx.fillRect(x-16,y-32,32,18);
    ctx.fillStyle = '#3d352e'; ctx.fillRect(x-20,y-38,40,7);
    ctx.fillStyle = '#231e1a'; ctx.fillRect(x-7,y-62,14,24);           // chimney hood
    ctx.fillStyle = '#4a3f36'; ctx.fillRect(x-11,y-66,22,6);
    ctx.fillStyle = '#ff7a2e'; ctx.globalAlpha = .5+Math.sin(t*5)*.2;
    ctx.fillRect(x-13,y-28,26,12); ctx.globalAlpha = 1;
   }
   else { ctx.fillStyle = '#2f2823'; for(let i=0;i<5;i++){ const a = i/5*Math.PI*2; ctx.fillRect(x+Math.cos(a)*11-3, y+Math.sin(a)*5-2, 7, 4); } }
   for(let i=0;i<4;i++){
    const f = (t*3+i*.7)%1, s = (1-f)*(o.art==='forgefire'?11:8);
    ctx.globalAlpha = (1-f)*.85;
    ctx.fillStyle = f < .4 ? '#ffe9a8' : f < .7 ? '#ff9f45' : '#c3421f';
    ctx.beginPath(); ctx.arc(x+Math.sin(t*5+i*2)*4, y-h-6-f*20, s, 0, 7); ctx.fill();
   }
   ctx.globalAlpha = 1;
   glow(ctx,x,y-h-12, o.art==='forgefire'?110:80, '#ff9f4540');
   return; }
  case 'anvil':
   shadow(ctx,x,y,14,5);
   ctx.fillStyle = '#2e2a2c'; ctx.fillRect(x-8,y-14,16,14);
   ctx.fillStyle = '#3d383b'; ctx.fillRect(x-16,y-26,32,12);
   ctx.fillStyle = '#4f494c'; ctx.fillRect(x-16,y-28,32,3);
   ctx.fillStyle = '#5c5457'; ctx.beginPath(); ctx.moveTo(x+14,y-26); ctx.lineTo(x+26,y-22); ctx.lineTo(x+14,y-18); ctx.closePath(); ctx.fill();
   return;
  case 'loom':
   shadow(ctx,x,y,16,5);
   ctx.fillStyle = '#4a3828'; ctx.fillRect(x-16,y-44,5,44); ctx.fillRect(x+11,y-44,5,44);
   ctx.fillStyle = '#5c4632'; ctx.fillRect(x-18,y-48,36,5);
   ctx.strokeStyle = '#b9a98e88'; ctx.lineWidth = 1;
   for(let i=0;i<9;i++){ ctx.beginPath(); ctx.moveTo(x-12+i*3, y-43); ctx.lineTo(x-12+i*3, y-8); ctx.stroke(); }
   ctx.fillStyle = '#8d5f86'; ctx.fillRect(x-12,y-24,25,9);
   return;
  case 'cauldron':
   shadow(ctx,x,y,14,5);
   ctx.fillStyle = '#26242a'; ctx.beginPath(); ctx.ellipse(x,y-16,16,14,0,0,7); ctx.fill();
   ctx.fillStyle = '#4d7a5f'; ctx.beginPath(); ctx.ellipse(x,y-26,13,5,0,0,7); ctx.fill();
   ctx.globalAlpha = .6; ctx.fillStyle = '#9fe0b8';
   for(let i=0;i<3;i++){ const p = (t*.8+i*.4)%1; ctx.beginPath(); ctx.arc(x+Math.sin(t*2+i)*6, y-30-p*22, 3+p*3, 0, 7); ctx.fill(); }
   ctx.globalAlpha = 1; glow(ctx,x,y-26,46,'#6fd2a02a');
   return;
  case 'board':
   shadow(ctx,x,y,14,5);
   ctx.fillStyle = '#3b2c20'; ctx.fillRect(x-4,y-22,4,22); ctx.fillRect(x+2,y-22,4,22);
   ctx.fillStyle = '#5b452f'; ctx.fillRect(x-22,y-54,44,34);
   ctx.fillStyle = '#7a5f40'; ctx.fillRect(x-22,y-54,44,3);
   for(const [px,py,w,h] of [[-17,-49,14,11],[1,-50,16,13],[-15,-34,17,10],[4,-33,13,9]]){
    ctx.fillStyle = '#d6cbb0'; ctx.fillRect(x+px,y+py,w,h);
    ctx.fillStyle = '#8a8070'; for(let i=0;i<3;i++) ctx.fillRect(x+px+2, y+py+2+i*3, w-4, 1);
   }
   return;
  case 'banner':
   ctx.fillStyle = '#332b26'; ctx.fillRect(x-2,y-72,4,72);
   ctx.fillStyle = '#6a2f3a'; ctx.fillRect(x+2,y-70,20,38);
   ctx.fillStyle = '#8b4250'; ctx.fillRect(x+2,y-70,20,4);
   ctx.beginPath(); ctx.moveTo(x+2,y-32); ctx.lineTo(x+12,y-24); ctx.lineTo(x+22,y-32); ctx.closePath(); ctx.fillStyle = '#6a2f3a'; ctx.fill();
   ctx.fillStyle = '#e0bd82'; ctx.fillRect(x+10,y-58,5,12); ctx.fillRect(x+7,y-52,11,4);
   return;
  case 'tent':
   shadow(ctx,x,y,26,7);
   ctx.fillStyle = '#4a4436'; ctx.beginPath(); ctx.moveTo(x-26,y); ctx.lineTo(x,y-44); ctx.lineTo(x+26,y); ctx.closePath(); ctx.fill();
   ctx.fillStyle = '#585141'; ctx.beginPath(); ctx.moveTo(x-26,y); ctx.lineTo(x,y-44); ctx.lineTo(x-4,y); ctx.closePath(); ctx.fill();
   ctx.fillStyle = '#1b1812'; ctx.beginPath(); ctx.moveTo(x-8,y); ctx.lineTo(x,y-24); ctx.lineTo(x+8,y); ctx.closePath(); ctx.fill();
   return;
  case 'table':
   shadow(ctx,x,y,20,6);
   ctx.fillStyle = '#3a2a1d'; ctx.fillRect(x-18,y-14,36,8);
   ctx.fillStyle = '#5b4229'; ctx.fillRect(x-20,y-20,40,7);
   ctx.fillStyle = '#c9b183'; ctx.fillRect(x-9,y-24,7,5); ctx.fillRect(x+4,y-23,6,4);
   return;
  case 'bookshelf':
   shadow(ctx,x,y,16,5);
   ctx.fillStyle = '#3b2c1f'; ctx.fillRect(x-18,y-58,36,58);
   for(let r=0;r<3;r++){ ctx.fillStyle = '#241a12'; ctx.fillRect(x-16,y-54+r*18,32,16);
    for(let i=0;i<7;i++){ ctx.fillStyle = ['#7a3b46','#3f5a6a','#6a5a35','#4a3f5e'][i%4]; ctx.fillRect(x-15+i*4.4, y-52+r*18, 3, 12); } }
   return;
  case 'sign':
   ctx.fillStyle = '#3b2c20'; ctx.fillRect(x-2,y-26,4,26);
   ctx.fillStyle = '#6a5138'; ctx.fillRect(x-20,y-42,40,18);
   ctx.fillStyle = '#8a6d49'; ctx.fillRect(x-20,y-42,40,3);
   ctx.font = '7px Georgia'; ctx.textAlign = 'center'; ctx.fillStyle = '#d9c9a8';
   ctx.fillText((o.text||'').slice(0,16), x, y-31);
   return;
  case 'stump':
   shadow(ctx,x,y,13,5);
   ctx.fillStyle = '#3d2e22'; ctx.fillRect(x-12,y-14,24,14);
   ctx.fillStyle = '#6a5136'; ctx.beginPath(); ctx.ellipse(x,y-14,12,6,0,0,7); ctx.fill();
   ctx.strokeStyle = '#4a3924'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x,y-14,7,3.5,0,0,7); ctx.stroke();
   return;
  case 'cat': {
   const bob = Math.sin(t*2)*1.5;
   shadow(ctx,x,y,9,3);
   ctx.fillStyle = '#6a6a72'; ctx.beginPath(); ctx.ellipse(x,y-9+bob,11,7,0,0,7); ctx.fill();
   ctx.beginPath(); ctx.arc(x-9,y-14+bob,6,0,7); ctx.fill();
   ctx.beginPath(); ctx.moveTo(x-13,y-18+bob); ctx.lineTo(x-11,y-24+bob); ctx.lineTo(x-8,y-18+bob); ctx.closePath(); ctx.fill();
   ctx.beginPath(); ctx.moveTo(x-7,y-18+bob); ctx.lineTo(x-5,y-24+bob); ctx.lineTo(x-2,y-18+bob); ctx.closePath(); ctx.fill();
   ctx.strokeStyle = '#6a6a72'; ctx.lineWidth = 3; ctx.beginPath();
   ctx.moveTo(x+10,y-10+bob); ctx.quadraticCurveTo(x+19,y-14+bob, x+16,y-22+bob+Math.sin(t*3)*3); ctx.stroke();
   ctx.fillStyle = '#d7e07a'; ctx.fillRect(x-11,y-15+bob,2,2); ctx.fillRect(x-7,y-15+bob,2,2);
   return; }
  default:
   shadow(ctx,x,y,10,4);
   ctx.fillStyle = '#4a4650'; ctx.fillRect(x-8,y-16,16,16);
 }
}

export function drawObject(ctx, o, t, game){
 const { x, y, type } = o;
 if(type === 'prop'){ drawProp(ctx, o, t, game); return; }
 if(type === 'portal'){
  o.sealed = !!(o.needs && !(game.bag[o.needs] > 0));
  if(o.door){ ctx.globalAlpha = .55 + Math.sin(t*2)*.2; ctx.fillStyle = '#e9c880';
   ctx.font = '12px Georgia'; ctx.textAlign = 'center'; ctx.fillText('▼', x, y-30); ctx.globalAlpha = 1; return; }
  // A road marker: a lit waystone you can see from a distance.
  shadow(ctx,x,y,14,5);
  ctx.fillStyle = '#4a4850'; ctx.fillRect(x-9,y-34,18,34);
  ctx.fillStyle = '#5c5a64'; ctx.fillRect(x-12,y-40,24,8);
  const sealed = o.sealed;
  ctx.globalAlpha = sealed ? .45 : .6+Math.sin(t*2)*.3;
  ctx.fillStyle = sealed ? '#7f8aa0' : '#ffd493';
  ctx.beginPath(); ctx.arc(x,y-46,5,0,7); ctx.fill(); ctx.globalAlpha = 1;
  if(!sealed) glow(ctx,x,y-46,56,'#ffc97a33');
  ctx.font = '9px Georgia'; ctx.textAlign = 'center'; ctx.fillStyle = sealed ? '#8c8798' : '#cbb894';
  ctx.fillText(o.label.toUpperCase() + (sealed ? ' \u00b7 SEALED' : ''), x, y-56);
  return;
 }
 if(type === 'plot'){ if(o.growing>0||o.ripe) drawSprite(ctx,15,x,y,o.ripe?29:18,o.ripe?28:18,{alpha:o.ripe?1:.7}); return; }
 if(NODE[type]){
  const n = NODE[type];
  shadow(ctx,x,y,n.w*.26,n.h*.08);
  drawSprite(ctx, n.i, x + (o.hit?Math.sin(o.hit*70)*3:0), y, n.w, n.h, { filter:o.hit>0?undefined:n.filter, hit:o.hit>0 });
  if(type === 'crystal') glow(ctx,x,y-20,44,'#7ad0ff30');
  if(type === 'cinder') glow(ctx,x,y-20,44,'#ff8a4030');
  return;
 }
 const size = SIZE[type]; if(!size) return;
 const [w,h] = size;
 if(type === 'beacon'){
  ctx.strokeStyle = game.flags['beacon'+o.index] ? '#dabe7955' : '#7d91a744';
  ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x,y,38,18,0,0,Math.PI*2); ctx.stroke();
 }
 shadow(ctx,x,y,w*.28,h*.07);
 let i = SPR[type]; if(type === 'ruin' && game.flags.cottage) i = 8;
 const bob = o.hit ? Math.sin(o.hit*70)*3 : 0;
 // People breathe, and lean toward you when you come close enough to talk.
 const sway = type === 'npc' ? Math.sin(t*1.6 + o.x*.05)*1.4 : 0;
 const lean = type === 'npc' && distance(o, game.player) < 130
  ? clamp((game.player.x - x)/260, -.09, .09) : 0;
 drawSprite(ctx, i, x+bob, y+sway, w, h, { hit:o.hit>0, rotation:lean,
  dark: (type==='hearth' && !game.flags.hearth) || (type==='beacon' && !game.flags['beacon'+o.index]) || (type==='lamp' && o.lit===false) });
 if(type === 'beacon'){
  ctx.font = '11px Georgia'; ctx.textAlign = 'center';
  ctx.fillStyle = game.flags['beacon'+o.index] ? '#f2d399' : '#b5aec5';
  ctx.fillText(['Dawn beacon','Mist beacon','Dusk beacon'][o.index], x, y-h-5);
 }
 if(type === 'npc'){
  const p = game.player, near = distance(o, p) < 130;
  if(near){
   ctx.globalAlpha = .18; ctx.fillStyle = '#e9c880';
   ctx.beginPath(); ctx.ellipse(x, y+2, 22, 9, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  const marker = npcMarker(game, o.npc);
  if(marker){ ctx.fillStyle = marker === '!' ? '#e9c880' : marker === '?' ? '#8fd6a8' : '#9aa6c0';
   ctx.font = 'bold 15px Georgia'; ctx.textAlign = 'center'; ctx.fillText(marker, x, y-h-6+Math.sin(t*3)*2); }
  ctx.font = '9px Georgia'; ctx.textAlign = 'center'; ctx.fillStyle = '#c3b294cc';
  ctx.fillText(o.name ?? '', x, y-h+2);
 }
 if(type === 'chest'){ ctx.fillStyle = '#deb983'; ctx.globalAlpha = .5+Math.sin(t*3+o.x)*.4; ctx.fillRect(x+15,y-29,2,2); ctx.globalAlpha = 1; }
}
function npcMarker(game, id){
 if(!id) return '';
 const topics = game.npcTopics(id);
 if(topics.ready.length) return '?';
 if(topics.offers.length) return '!';
 return '◇';
}

// =========================================================================
// Effects the renderer owns: impact crescents, lightning arcs, afterimages.
// =========================================================================
const fx = [];
export function addFx(kind, data){ fx.push({ kind, life:data.life ?? .32, max:data.life ?? .32, ...data }); }
export function stepFx(dt){ for(const f of fx) f.life -= dt; for(let i=fx.length-1;i>=0;i--) if(fx[i].life <= 0) fx.splice(i,1); }
export function clearFx(){ fx.length = 0; }

function drawFx(ctx, t){
 for(const f of fx){
  const p = 1 - f.life/f.max;
  ctx.save();
  if(f.kind === 'slash'){
   ctx.translate(f.x, f.y); ctx.rotate(f.angle); ctx.scale(1,.8);
   ctx.globalCompositeOperation = 'lighter';
   ctx.globalAlpha = (1-p)*.9;
   ctx.strokeStyle = f.color ?? '#fff3d0'; ctx.lineWidth = (f.heavy?9:6)*(1-p);
   ctx.beginPath(); ctx.arc(0,0, (f.r??54)*(.7+p*.5), -1.1, 1.1); ctx.stroke();
   ctx.globalAlpha = (1-p)*.55; ctx.lineWidth = 2;
   ctx.beginPath(); ctx.arc(0,0, (f.r??54)*(.55+p*.75), -.8, .8); ctx.stroke();
  } else if(f.kind === 'arc'){
   ctx.globalCompositeOperation = 'lighter';
   ctx.globalAlpha = (1-p);
   ctx.strokeStyle = '#bdefff'; ctx.lineWidth = 3;
   ctx.beginPath(); ctx.moveTo(f.x1,f.y1);
   const segs = 5;
   for(let i=1;i<=segs;i++){
    const q = i/segs, jx = (Math.sin(i*97+t*40)*10)*(1-Math.abs(q-.5)*2);
    ctx.lineTo(f.x1+(f.x2-f.x1)*q + jx, f.y1+(f.y2-f.y1)*q + jx*.6);
   }
   ctx.stroke();
   ctx.globalAlpha = (1-p)*.5; ctx.lineWidth = 7; ctx.stroke();
  } else if(f.kind === 'ghost'){
   ctx.globalAlpha = (1-p)*.32;
   drawSprite(ctx, 0, f.x, f.y, 57, 65, { sprite:f.sprite, filter:'brightness(1.4) saturate(.5)' });
  } else if(f.kind === 'death'){
   // The body folds in on itself rather than blinking out of existence.
   const d = ENEMIES[f.type];
   ctx.globalAlpha = (1-p)*.85;
   ctx.translate(f.x, f.y);
   ctx.rotate(p*.5*(f.spin ?? 1));
   ctx.scale(1 + p*.35, Math.max(.05, 1 - p*1.1));
   drawSprite(ctx, d.sprite, 0, 0, d.w, d.h, { filter:TINTS[d.tint] });
  } else if(f.kind === 'ring'){
   ctx.globalCompositeOperation = 'lighter';
   ctx.globalAlpha = (1-p)*.6; ctx.strokeStyle = f.color ?? '#ffcf94'; ctx.lineWidth = 4*(1-p)+1;
   ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r*(.3+p*.9), f.r*(.3+p*.9)*.5, 0, 0, 7); ctx.stroke();
  }
  ctx.restore();
 }
 ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

// =========================================================================
// Enemies
// =========================================================================
export function drawEnemy(ctx, e, t, game, p){
 const d = ENEMIES[e.type];
 if(e.hidden){                                     // burrowed: only the mound shows
  ctx.fillStyle = '#4a3c2c'; ctx.beginPath(); ctx.ellipse(e.x, e.y, 26, 12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#6a5642'; ctx.beginPath(); ctx.ellipse(e.x, e.y-4, 20, 8, 0, 0, 7); ctx.fill();
  return;
 }
 const boss = !!d.boss, flier = d.ai === 'flier' || e.type === 'wisp' || e.type === 'shade';
 const floatY = flier ? e.y - 15 + Math.sin(t*4+e.phase)*5 : e.y + Math.sin(t*5+e.phase)*2;
 shadow(ctx, e.x, e.y, boss ? 34 : d.w*.3, boss ? 11 : d.h*.11);

 // Telegraphs read before the hit, never after.
 if(e.windup > 0){
  const r = e.type === 'guardian' ? 120 : d.ai === 'slammer' ? 132 : boss ? 170 : 90;
  const charge = 1 - clamp(e.windup, 0, 1);
  ctx.strokeStyle = '#e08a65'; ctx.fillStyle = '#d77d4428'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(e.x, e.y, r, r*.62, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#ffd1a1'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(e.x, e.y, r*charge, r*.62*charge, 0, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = '#ffd1a1'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillText('DODGE', e.x, e.y - r*.62 - 8);
 }
 if(e.cast > 0){
  ctx.save(); ctx.translate(e.x, floatY-18); ctx.rotate(e.aim);
  ctx.strokeStyle = '#ffb77a'; ctx.setLineDash([4,5]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(20,0); ctx.lineTo(150,0); ctx.stroke(); ctx.restore();
 }
 if(e.dash > 0){
  ctx.strokeStyle = '#ffc6a070'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(e.x, floatY-14); ctx.lineTo(e.x-Math.cos(e.aim)*40, floatY-14-Math.sin(e.aim)*40); ctx.stroke();
 }

 if(boss) bossFlourish(ctx, e, d, t, floatY);
 else enemyFlourish(ctx, e, d, t, floatY);
 const facingLeft = Math.cos(e.face ?? 0) < 0;
 const squash = e.swing > 0 ? .12 : e.stagger > 0 ? -.1 : 0;
 drawSprite(ctx, d.sprite, e.x, floatY, d.w, d.h, {
  hit: e.hit > 0, filter: e.hit > 0 ? undefined : TINTS[d.tint],
  flip: (d.ai === 'lunger' || d.ai === 'kiter' || d.ai === 'shielded') && facingLeft,
  squash, rotation: e.stagger > 0 ? Math.sin(t*22)*.12 : 0
 });
 if(e.burn > 0){
  ctx.globalAlpha = .6;
  for(let i=0;i<3;i++){ ctx.fillStyle = i ? '#ff9b46' : '#ffe0a0';
   ctx.fillRect(e.x - 8 + i*8 + Math.sin(t*9+i)*3, floatY - 24 - ((t*60+i*13)%26), 3, 4); }
  ctx.globalAlpha = 1;
 }
 if(e.slowT > 0){ ctx.globalAlpha = .3; ctx.fillStyle = '#9fe4ff';
  ctx.beginPath(); ctx.ellipse(e.x, floatY-12, d.w*.4, d.h*.4, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
 if(e.type === 'wisp' || e.type === 'imp') glow(ctx, e.x, floatY-20, e.cast>0?56:36, e.cast>0?'#ff995855':'#dc85402a');
 if(e.type === 'shade') glow(ctx, e.x, floatY-20, 44, '#9a6fd42a');

 if(!boss && (e.hp < e.maxHp)){
  const w = 34;
  ctx.fillStyle = '#251b2a'; ctx.fillRect(e.x-w/2, floatY-d.h*.92-8, w, 4);
  ctx.fillStyle = e.stagger > 0 ? '#ffe08a' : '#c96a80';
  ctx.fillRect(e.x-w/2+1, floatY-d.h*.92-7, (w-2)*Math.max(0,e.hp/e.maxHp), 2);
 }
 if(boss && distance(e,p) < 520){
  const w = 96;
  ctx.fillStyle = '#211723'; ctx.fillRect(e.x-w/2, e.y-d.h*.92-16, w, 6);
  ctx.fillStyle = '#d08b73'; ctx.fillRect(e.x-w/2+1, e.y-d.h*.92-15, (w-2)*Math.max(0,e.hp/e.maxHp), 4);
  ctx.font = '10px Georgia'; ctx.fillStyle = '#dfbda5'; ctx.textAlign = 'center';
  ctx.fillText(d.name.toUpperCase(), e.x, e.y-d.h*.92-22);
 }
}

// Small procedural marks that tell one tinted sprite from another at a glance.
function enemyFlourish(ctx, e, d, t, fy){
 const x = e.x, w = d.w, h = d.h;
 ctx.save();
 switch(e.type){
  case 'spider': {
   ctx.strokeStyle = '#2b3a30'; ctx.lineWidth = 3; ctx.lineCap = 'round';
   for(let i=0;i<4;i++){ const a = .5 + i*.34, wob = Math.sin(t*6+i)*.12;
    for(const side of [-1,1]){
     ctx.beginPath(); ctx.moveTo(x + side*8, fy-14);
     ctx.quadraticCurveTo(x + side*(22+i*3), fy-26-i*3, x + side*(30+i*4), fy-4+Math.sin(a+wob)*7);
     ctx.stroke();
    } }
   break; }
  case 'wolf':
   ctx.fillStyle = '#4a3b2e';
   ctx.beginPath(); ctx.moveTo(x-16,fy-26); ctx.lineTo(x-12,fy-38); ctx.lineTo(x-7,fy-26); ctx.closePath(); ctx.fill();
   ctx.beginPath(); ctx.moveTo(x+7,fy-26); ctx.lineTo(x+12,fy-38); ctx.lineTo(x+16,fy-26); ctx.closePath(); ctx.fill();
   ctx.strokeStyle = '#4a3b2e'; ctx.lineWidth = 5; ctx.lineCap = 'round';
   ctx.beginPath(); ctx.moveTo(x+18,fy-12); ctx.quadraticCurveTo(x+30,fy-18+Math.sin(t*7)*5, x+26,fy-28); ctx.stroke();
   break;
  case 'brigand':
   ctx.fillStyle = e.stagger > 0 ? '#5a4a52' : '#40414e';
   ctx.beginPath(); ctx.ellipse(x - (Math.cos(e.face??0)<0?20:-20), fy-30, 11, 16, 0, 0, 7); ctx.fill();
   ctx.strokeStyle = '#7c6d5a'; ctx.lineWidth = 2; ctx.stroke();
   break;
  case 'archer':
   ctx.strokeStyle = '#6a5138'; ctx.lineWidth = 3;
   ctx.beginPath(); ctx.arc(x + (Math.cos(e.face??0)<0?-18:18), fy-30, 14, -1.1, 1.1); ctx.stroke();
   ctx.strokeStyle = '#cfc3a6'; ctx.lineWidth = 1;
   ctx.beginPath(); ctx.moveTo(x + (Math.cos(e.face??0)<0?-18:18) + Math.cos(-1.1)*14, fy-30+Math.sin(-1.1)*14);
   ctx.lineTo(x + (Math.cos(e.face??0)<0?-18:18) + Math.cos(1.1)*14, fy-30+Math.sin(1.1)*14); ctx.stroke();
   break;
  case 'rockling': case 'golem':
   ctx.fillStyle = '#4e4a45';
   for(let i=0;i<5;i++){ const a = i/5*Math.PI*2 + e.phase*.3;
    ctx.fillRect(x + Math.cos(a)*w*.34 - 4, fy - h*.45 + Math.sin(a)*h*.24, 9, 7); }
   ctx.fillStyle = '#d9853f'; ctx.globalAlpha = .5+Math.sin(t*3+e.phase)*.3;
   ctx.fillRect(x-5, fy-h*.52, 4, 4); ctx.fillRect(x+2, fy-h*.52, 4, 4);
   ctx.globalAlpha = 1;
   break;
  case 'crawler':
   ctx.strokeStyle = '#6b5a72'; ctx.lineWidth = 4; ctx.lineCap = 'round';
   for(const side of [-1,1]){ ctx.beginPath(); ctx.moveTo(x+side*10, fy-16);
    ctx.quadraticCurveTo(x+side*24, fy-24, x+side*18+Math.sin(t*8)*3, fy-34); ctx.stroke(); }
   break;
  case 'imp':
   ctx.fillStyle = '#7a2d16';
   ctx.beginPath(); ctx.moveTo(x-11,fy-30); ctx.lineTo(x-14,fy-42); ctx.lineTo(x-5,fy-32); ctx.closePath(); ctx.fill();
   ctx.beginPath(); ctx.moveTo(x+11,fy-30); ctx.lineTo(x+14,fy-42); ctx.lineTo(x+5,fy-32); ctx.closePath(); ctx.fill();
   break;
  case 'shade':
   ctx.globalAlpha = .28; ctx.fillStyle = '#7c5da8';
   for(let i=0;i<4;i++) ctx.fillRect(x-10+i*5, fy+2+i*4, 20-i*4, 3);
   ctx.globalAlpha = 1;
   break;
  case 'sporeling':
   ctx.fillStyle = '#7d9a5e';
   ctx.beginPath(); ctx.ellipse(x, fy-h*.72, w*.36, 9, 0, Math.PI, 0); ctx.fill();
   ctx.fillStyle = '#c4d8a6';
   for(let i=0;i<3;i++) ctx.fillRect(x-10+i*9, fy-h*.76, 4, 3);
   break;
 }
 ctx.restore();
}
function bossFlourish(ctx, e, d, t, fy){
 const x = e.x, w = d.w, h = d.h;
 ctx.save();
 if(e.type === 'bramble'){
  ctx.strokeStyle = '#3d5a35'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for(let i=0;i<7;i++){ const a = i/7*Math.PI*2 + Math.sin(t*.6)*.2;
   ctx.beginPath(); ctx.moveTo(x, e.y-6);
   ctx.quadraticCurveTo(x+Math.cos(a)*58, e.y-14+Math.sin(a)*20, x+Math.cos(a)*96, e.y+Math.sin(a)*34); ctx.stroke(); }
  ctx.fillStyle = '#c4e08a'; ctx.globalAlpha = .55+Math.sin(t*2.5)*.3;
  ctx.beginPath(); ctx.arc(x, fy-h*.52, 13, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  glow(ctx, x, fy-h*.52, 110, '#9fd7a234');
 } else if(e.type === 'devourer'){
  ctx.fillStyle = '#5c4b38';
  for(let i=0;i<9;i++){ const a = -Math.PI*.15 - i/9*Math.PI*.7;
   ctx.fillRect(x+Math.cos(a)*w*.42-5, fy-h*.5+Math.sin(a)*h*.36, 11, 9); }
  ctx.strokeStyle = '#8b7150'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  for(const side of [-1,1]){ ctx.beginPath(); ctx.moveTo(x+side*24, fy-24);
   ctx.quadraticCurveTo(x+side*52, fy-46, x+side*34+Math.sin(t*3)*6, fy-72); ctx.stroke(); }
  ctx.fillStyle = '#2a1c14'; ctx.beginPath(); ctx.ellipse(x, fy-h*.34, w*.22, h*.16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#d98b4f'; ctx.globalAlpha = .6+Math.sin(t*4)*.25;
  ctx.fillRect(x-14, fy-h*.34-2, 28, 4); ctx.globalAlpha = 1;
 } else if(e.type === 'choirlord'){
  ctx.globalAlpha = .5; ctx.fillStyle = '#c6a6e2';
  for(let i=0;i<6;i++){ const a = i/6*Math.PI*2 + t*.7;
   ctx.beginPath(); ctx.arc(x+Math.cos(a)*62, fy-40+Math.sin(a)*26, 4, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e4d7c0'; ctx.beginPath(); ctx.ellipse(x, fy-h*.78, 11, 14, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#231a2c'; ctx.fillRect(x-7, fy-h*.8, 5, 4); ctx.fillRect(x+2, fy-h*.8, 5, 4);
  glow(ctx, x, fy-h*.5, 130, '#a884d43a');
 } else if(e.type === 'tyrant'){
  glow(ctx, x, fy-h*.45, 190, '#ff7a3044');
  ctx.fillStyle = '#ffae5c'; ctx.globalAlpha = .55+Math.sin(t*3)*.25;
  for(let i=0;i<7;i++){ const a = -Math.PI*.2 - i/7*Math.PI*.6;
   ctx.fillRect(x+Math.cos(a)*w*.3-3, fy-h*.55+Math.sin(a)*h*.3, 6, 10); }
  ctx.globalAlpha = 1;
  // a crown of fire
  for(let i=0;i<6;i++){
   const f = (t*2.2+i*.4)%1, cx = x-42+i*17;
   ctx.globalAlpha = (1-f)*.9;
   ctx.fillStyle = f<.4?'#ffe9a8':f<.72?'#ff9f45':'#c3421f';
   ctx.beginPath(); ctx.arc(cx+Math.sin(t*4+i)*3, fy-h*.86-f*24, (1-f)*9, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#ff8a3a'; ctx.lineWidth = 2;
  for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(x-30+i*20, fy-h*.7);
   ctx.lineTo(x-24+i*20, fy-h*.4); ctx.lineTo(x-34+i*20, fy-h*.15); ctx.stroke(); }
 } else if(e.type === 'guardian'){
  ctx.strokeStyle = '#6b5a45'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for(let i=0;i<5;i++){ const a = i/5*Math.PI*2 + Math.sin(t*.5)*.15;
   ctx.beginPath(); ctx.moveTo(x, e.y-4);
   ctx.quadraticCurveTo(x+Math.cos(a)*40, e.y-10+Math.sin(a)*14, x+Math.cos(a)*66, e.y+Math.sin(a)*24); ctx.stroke(); }
 }
 ctx.restore();
}

// =========================================================================
// Ambient life: the small moving things that stop a region looking painted.
// Purely decorative, seeded per zone, and never touched by the model.
// =========================================================================
const AMBIENT = {
 vale:   { kind:'bird',   count:6,  night:'firefly' },
 town:   { kind:'bird',   count:5,  night:'moth' },
 forest: { kind:'leaf',   count:14, night:'firefly' },
 warren: { kind:'drip',   count:10 },
 crypt:  { kind:'drip',   count:8 },
 deep:   { kind:'spark',  count:18 },
 forge:  { kind:'spark',  count:6 },
 tavern: { kind:'moth',   count:4 },
 hall:   { kind:'moth',   count:3 }
};
function ambient(ctx, game, cam, cw, ch, t){
 const spec = AMBIENT[game.zone];
 if(!spec) return;
 const kind = (game.isNight() && spec.night) ? spec.night : spec.kind;
 const n = spec.count;
 for(let i=0;i<n;i++){
  const seed = i*137.51;
  let x, y;
  if(kind === 'drip' || kind === 'spark'){
   x = cam.x + ((seed*7.3) % cw);
   const fall = ((t*(kind==='drip'?90:34) + seed*11) % (ch+40));
   y = cam.y + (kind === 'spark' ? ch - fall : fall) - 20;
  } else {
   const sp = kind === 'bird' ? 46 : kind === 'leaf' ? 26 : 16;
   x = cam.x + ((seed*9.7 + t*sp) % (cw+80)) - 40;
   y = cam.y + ((seed*5.1) % (ch-60)) + 30 + Math.sin(t*(kind==='moth'?3.4:1.3) + seed)*(kind==='leaf'?18:9);
  }
  switch(kind){
   case 'bird': {
    const flap = Math.sin(t*9 + seed) > 0 ? 1 : -1;
    ctx.strokeStyle = 'rgba(28,26,34,.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x-4, y+flap*2); ctx.lineTo(x, y-flap); ctx.lineTo(x+4, y+flap*2); ctx.stroke();
    break; }
   case 'leaf':
    ctx.fillStyle = `rgba(${110+((i*37)%50)},${120+((i*23)%40)},70,.5)`;
    ctx.save(); ctx.translate(x,y); ctx.rotate(t*2+seed); ctx.fillRect(-2,-1,4,2); ctx.restore();
    break;
   case 'firefly': {
    const a = .25 + Math.sin(t*2.6 + seed)*.35;
    if(a > 0){ ctx.fillStyle = `rgba(214,231,140,${a})`; ctx.fillRect(x,y,2,2);
     ctx.fillStyle = `rgba(214,231,140,${a*.18})`; ctx.fillRect(x-3,y-3,8,8); }
    break; }
   case 'moth':
    ctx.fillStyle = 'rgba(228,216,186,.4)';
    ctx.fillRect(x + Math.sin(t*7+seed)*4, y + Math.cos(t*6+seed)*4, 2, 2);
    break;
   case 'drip':
    ctx.fillStyle = 'rgba(150,178,196,.45)'; ctx.fillRect(x, y, 1, 5);
    break;
   case 'spark': {
    const a = .5 - ((t*34 + seed*11) % (ch+40))/(ch+40)*.45;
    ctx.fillStyle = `rgba(255,${150+((i*17)%60)},80,${Math.max(0,a)})`;
    ctx.fillRect(x + Math.sin(t*3+seed)*5, y, 2, 2);
    break; }
  }
 }
}

// =========================================================================
// Scene
// =========================================================================
let lightCanvas = null, lctx = null;
function ensureLight(w,h){
 if(!lightCanvas){ lightCanvas = document.createElement('canvas'); lctx = lightCanvas.getContext('2d'); }
 if(lightCanvas.width !== w || lightCanvas.height !== h){ lightCanvas.width = w; lightCanvas.height = h; }
 return lctx;
}
const DARK = {
 dusk:  { color:'#080d20', night:.74 },
 night: { color:'#060a18', night:.78 },
 cave:  { color:'#080a14', night:.46 },
 ember: { color:'#180608', night:.32 },
 warm:  { color:'#120c08', night:.18 }
};
export function darkness(game){
 const def = ZONES[game.zone], mode = DARK[def.light] ?? DARK.dusk;
 if(def.light === 'cave' || def.light === 'ember' || def.light === 'warm') return { color:mode.color, alpha:mode.night };
 const h = game.hour();
 // Smooth day curve: full dark at 1am, full light at midday.
 const day = clamp(Math.sin((h-6)/24*Math.PI*2)*.5+.5, 0, 1);
 return { color:mode.color, alpha:mode.night*(1-day)*(def.light==='night'?1:.92) + (def.light==='night'?.14:0) };
}

export function renderScene(ctx, game, cam, cw, ch, t, opts = {}){
 const p = game.player;
 const floor = bakeZone(game);
 const def = ZONES[game.zone];
 ctx.clearRect(0,0,cw,ch);
 ctx.save();
 ctx.translate(-Math.round(cam.x) + (opts.shake ? Math.sin(t*130)*opts.shake : 0), -Math.round(cam.y) + (opts.shake ? Math.cos(t*161)*opts.shake*.6 : 0));
 ctx.drawImage(floor, 0, 0);

 // Living water and lava, drawn only for the tiles on screen.
 const x0 = Math.floor(cam.x/TILE), y0 = Math.floor(cam.y/TILE);
 for(let y=y0;y<y0+ch/TILE+1;y++) for(let x=x0;x<x0+cw/TILE+1;x++){
  const tile = game.maps[game.zone][y]?.[x];
  if(tile === T.WATER){ const a = .09+Math.sin(t*1.3+x*2+y)*.06;
   ctx.fillStyle = `rgba(127,184,177,${a})`; ctx.fillRect(x*TILE+6+Math.sin(t+x)*4, y*TILE+14, 11, 1); }
  else if(tile === T.LAVA){ const a = .2+Math.sin(t*1.7+x*1.7+y*2.3)*.18;
   ctx.fillStyle = `rgba(255,186,96,${Math.max(0,a)})`; ctx.fillRect(x*TILE+5+Math.sin(t*.7+x)*6, y*TILE+10+Math.cos(t*.6+y)*5, 12, 3); }
  else if(tile === T.CINDER && (x*7+y*13)%5===0){ const a = .18+Math.sin(t*3+x+y)*.16;
   ctx.fillStyle = `rgba(255,150,70,${Math.max(0,a)})`; ctx.fillRect(x*TILE+12, y*TILE+12-((t*24+x*9)%16), 2, 3); }
 }

 // Draw order: everything sorted by its ground line so the world has depth.
 const pad = 200;
 const vis = game.props().filter(o => !game.removed.has(o.id) && o.x > cam.x-pad && o.x < cam.x+cw+pad && o.y > cam.y-40 && o.y < cam.y+ch+pad);
 const mobs = game.here().filter(e => e.hp > 0 && e.x > cam.x-pad && e.x < cam.x+cw+pad && e.y > cam.y-pad && e.y < cam.y+ch+pad);
 const ents = [
  ...vis.map(o => ({ kind:'object', y:o.y, o })),
  ...(game.zone === 'town' ? TOWN_BUILDINGS.map(b => ({ kind:'building', y:(b.y+b.h)*TILE, b })) : []),
  ...mobs.map(e => ({ kind:'enemy', y:e.y, e })),
  { kind:'player', y:p.y }
 ].sort((a,b) => a.y - b.y);

 const night = game.isNight();
 for(const it of ents){
  if(it.kind === 'object') drawObject(ctx, it.o, t, game);
  else if(it.kind === 'building') drawBuilding(ctx, it.b, t, night);
  else if(it.kind === 'enemy') drawEnemy(ctx, it.e, t, game, p);
  else drawPlayer(ctx, game, p, t, opts);
 }

 for(const o of vis){
  if(o.type === 'beacon' && game.flags['beacon'+o.index]) glow(ctx, o.x, o.y-73, 145, '#a7cbaa35');
  else if(o.type === 'lamp' && o.lit !== false) glow(ctx, o.x, o.y-46, 83, '#efaa3c26');
  else if(o.type === 'cottage' || (o.type === 'ruin' && game.flags.cottage)) glow(ctx, o.x, o.y-37, 65, '#efac3920');
  else if(o.type === 'hearth' && game.flags.hearth){
   glow(ctx, o.x, o.y-18, 140, '#ffac5540');
   if(Math.sin(t*14) > .1){ ctx.fillStyle = '#efbf70'; ctx.fillRect(o.x+Math.sin(t*7)*10, o.y-30-(t*13%30), 2, 2); }
  }
 }

 for(const b of game.projectiles){
  if(b.fuse !== undefined){                       // a falling ember, with its landing marked
   const p2 = 1 - b.life/b.fuse;
   ctx.strokeStyle = b.hostile ? '#ff8b5a' : '#ffd08a'; ctx.lineWidth = 2;
   ctx.beginPath(); ctx.ellipse(b.x, b.y, b.radius*.9, b.radius*.45, 0, 0, 7); ctx.stroke();
   ctx.fillStyle = (b.hostile ? '#ff6a3a' : '#ffbe6a') + '33';
   ctx.beginPath(); ctx.ellipse(b.x, b.y, b.radius*.9*p2, b.radius*.45*p2, 0, 0, 7); ctx.fill();
   glow(ctx, b.x, b.y - 320*(1-p2), 40, '#ffb15855');
   ctx.fillStyle = '#ffe9b0'; ctx.beginPath(); ctx.arc(b.x, b.y - 320*(1-p2), 8, 0, 7); ctx.fill();
   continue;
  }
  glow(ctx, b.x, b.y-18, 22, (b.color ?? '#ff8f45')+'55');
  ctx.fillStyle = '#fff1b5'; ctx.beginPath(); ctx.arc(b.x, b.y-18, 4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = b.color ?? '#f1a566'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(b.x, b.y-18); ctx.lineTo(b.x-b.vx*.07, b.y-18-b.vy*.07); ctx.stroke();
 }

 for(const s of game.shocks){
  const a = Math.max(0, s.life/.42);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a*.55; ctx.strokeStyle = s.color; ctx.lineWidth = 3+a*4;
  ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r*.5, 0, 0, Math.PI*2); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
 }
 drawFx(ctx, t);

 for(const a of game.particles){ ctx.globalAlpha = Math.min(1, a.life*2); ctx.fillStyle = a.color; ctx.fillRect(a.x, a.y, a.size, a.size); }
 ctx.globalAlpha = 1;

 ambient(ctx, game, cam, cw, ch, t);

 // Drifting motes, tinted to the zone.
 const mote = def.light === 'cave' ? '134,160,190' : def.light === 'ember' ? '255,150,90' : '179,191,134';
 for(let i=0;i<25;i++){
  const x = cam.x + ((i*97.1 + t*6) % (cw+30)), y = cam.y + (i*67.8 % ch) + Math.sin(t+i)*9;
  ctx.fillStyle = `rgba(${mote},${.15+Math.sin(t*2+i)*.13})`; ctx.fillRect(x, y, 1.5, 1.5);
 }

 ctx.restore();

 // Lighting pass, in screen space.
 const dark = darkness(game);
 if(dark.alpha > .04){
  const l = ensureLight(cw, ch);
  l.globalCompositeOperation = 'source-over';
  l.clearRect(0,0,cw,ch);
  l.fillStyle = dark.color; l.globalAlpha = dark.alpha; l.fillRect(0,0,cw,ch); l.globalAlpha = 1;
  l.globalCompositeOperation = 'destination-out';
  // Underground you carry the only reliable light, so it reaches further.
  const wide = def.light === 'cave' || def.light === 'ember' ? 1.5 : 1;
  const punch = (x,y,r,strength=1) => {
   r *= wide;
   const gx = x-cam.x, gy = y-cam.y;
   if(gx < -r || gy < -r || gx > cw+r || gy > ch+r) return;
   const g = l.createRadialGradient(gx,gy,0,gx,gy,r);
   g.addColorStop(0,`rgba(0,0,0,${strength})`); g.addColorStop(.42,`rgba(0,0,0,${strength*.82})`);
   g.addColorStop(.72,`rgba(0,0,0,${strength*.4})`); g.addColorStop(1,'rgba(0,0,0,0)');
   l.fillStyle = g; l.fillRect(gx-r, gy-r, r*2, r*2);
  };
  punch(p.x, p.y-16, def.light === 'cave' || def.light === 'ember' ? 230 : 165, .9);
  for(const o of vis){
   if(o.type === 'lamp' && o.lit !== false) punch(o.x, o.y-40, 118, .92);
   else if(o.type === 'beacon' && game.flags['beacon'+o.index]) punch(o.x, o.y-60, 200, 1);
   else if(o.type === 'hearth' && game.flags.hearth) punch(o.x, o.y-18, 190, 1);
   else if(o.type === 'portal' && !o.door && !o.sealed) punch(o.x, o.y-40, 92, .75);
   else if(o.type === 'prop' && (o.art === 'campfire' || o.art === 'brazier' || o.art === 'forgefire')) punch(o.x, o.y-20, o.art==='forgefire'?180:128, 1);
   else if(o.type === 'prop' && (o.art === 'shrine' || o.art === 'cauldron')) punch(o.x, o.y-40, 95, .7);
   else if(o.type === 'crystal') punch(o.x, o.y-20, 88, .7);
   else if(o.type === 'cinder') punch(o.x, o.y-20, 80, .7);
  }
  // Lit windows spill a little onto the street, but they do not light it.
  if(game.zone === 'town' && night) for(const b of TOWN_BUILDINGS) punch((b.door[0])*TILE, (b.door[1])*TILE-8, 58, .45);
  for(const b of game.projectiles) punch(b.x, b.y-18, 62, .7);
  for(const s of game.shocks) punch(s.x, s.y, s.r*1.2, .7);
  if(p.attack > 0) punch(p.x + Math.cos(p.attackAngle)*40, p.y-16 + Math.sin(p.attackAngle)*40, 105, .75);
  l.globalCompositeOperation = 'source-over';
  ctx.drawImage(lightCanvas, 0, 0);
 }

 // Floating damage numbers sit above the lighting so they stay readable.
 ctx.save();
 ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
 for(const a of game.texts){
  ctx.globalAlpha = Math.min(1, a.life);
  ctx.font = `bold ${a.size ?? 11}px Arial`; ctx.textAlign = 'center';
  ctx.fillStyle = '#17131d'; ctx.fillText(a.text, a.x+1, a.y+1);
  ctx.fillStyle = a.color; ctx.fillText(a.text, a.x, a.y);
 }
 ctx.globalAlpha = 1;
 ctx.restore();
}

function drawPlayer(ctx, game, p, t, opts){
 const set = heroSprites(game.gear.outfit);
 const bob = p.moving ? Math.sin(t*15)*2 : Math.sin(t*2)*.5;
 const swinging = p.attack > 0;
 const phase = swinging ? 1 - p.attack/p.attackDuration : 0;
 const swing = swinging ? game.currentSwing() : null;
 const drive = swinging ? Math.sin(phase*Math.PI) * (p.heavy ? 15 : swing.style === 'thrust' ? 12 : 8) : 0;
 const lean = swinging ? Math.sin(phase*Math.PI) * (swing.arc[1] > swing.arc[0] ? -.16 : .16) : 0;
 shadow(ctx, p.x, p.y, 14, 5);
 if(p.superT > 0) glow(ctx, p.x, p.y-22, 130, (game.weapon().trail ?? '#ffd88a')+'44');
 if(p.shield > 0){
  ctx.globalAlpha = .35 + Math.sin(t*6)*.1; ctx.strokeStyle = '#ffe6b0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(p.x, p.y-22, 26, 32, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
 }
 if(!swinging) drawIdleWeapon(ctx, game, p, bob);
 drawSprite(ctx, p.dir, p.x + Math.cos(p.attackAngle)*drive, p.y + bob + Math.sin(p.attackAngle)*drive, 57, 65, {
  sprite: set[p.dir],
  alpha: p.invincible > 0 && Math.floor(t*12)%2 === 0 ? .45 : 1,
  rotation: lean,
  squash: p.dash > 0 ? .14 : 0,
  filter: p.perfect > 0 ? 'brightness(1.3) saturate(1.2)' : undefined
 });
 if(swinging) drawSwing(ctx, game, p, phase);
 if(p.dash > 0){
  ctx.strokeStyle = '#a5ded970'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p.x, p.y-20); ctx.lineTo(p.x-Math.cos(p.angle)*45, p.y-20-Math.sin(p.angle)*45); ctx.stroke();
 }
 if(p.burnT > 0){
  ctx.globalAlpha = .7;
  for(let i=0;i<3;i++){ ctx.fillStyle = i ? '#ff9b46' : '#ffe0a0'; ctx.fillRect(p.x-8+i*8+Math.sin(t*9+i)*3, p.y-34-((t*60+i*13)%26), 3, 4); }
  ctx.globalAlpha = 1;
 }
}
export const playerSprite = (game) => heroSprites(game.gear.outfit)[game.player.dir];

// =========================================================================
// Maps
// =========================================================================
const MAP_COLORS = {
 0:'#0d0d14', 1:'#365549', 2:'#766b50', 3:'#203f48', 4:'#5c5c5b', 5:'#987459', 6:'#725642',
 7:'#2c2b35', 8:'#171620', 9:'#4a4238', 10:'#54402e', 11:'#6d3340', 12:'#a8451a', 13:'#5d5847',
 14:'#2f3b2c', 15:'#2c3b4c', 16:'#3a2620', 17:'#544c3e', 18:'#6b3018', 19:'#07080e',
 20:'#2a2731', 21:'#4a4650', 22:'#26382e', 23:'#4c4630'
};
export function drawMap(game, target, big = false, labels = []){
 const def = ZONES[game.zone], map = game.maps[game.zone];
 const c = target.getContext('2d'), sx = target.width/def.w, sy = target.height/def.h;
 c.fillStyle = '#12141c'; c.fillRect(0,0,target.width,target.height);
 for(let y=0;y<def.h;y++) for(let x=0;x<def.w;x++){
  c.fillStyle = MAP_COLORS[map[y][x]] ?? '#33313a';
  c.fillRect(x*sx, y*sy, Math.ceil(sx), Math.ceil(sy));
 }
 const mark = (x,y,col,r) => { c.fillStyle = col; c.beginPath(); c.arc(x/TILE*sx, y/TILE*sy, r, 0, 7); c.fill(); };
 for(const o of game.props()){
  if(game.removed.has(o.id)) continue;
  if(o.type === 'portal') mark(o.x,o.y,'#8fd6c0', big?4:2.5);
  else if(o.type === 'npc') mark(o.x,o.y, game.npcTopics(o.npc).ready.length ? '#8fd6a8' : game.npcTopics(o.npc).offers.length ? '#e9c880' : '#9aa6c0', big?4:2);
  else if(['hearth','ruin','arch','beacon'].includes(o.type)) mark(o.x,o.y,'#ddb67d', big?4:2);
  else if(o.type === 'chest') mark(o.x,o.y,'#cfa964', big?3:1.5);
 }
 for(const e of game.here()) if(e.hp > 0 && ENEMIES[e.type].boss) mark(e.x,e.y,'#d77486', big?5:3);
 mark(game.player.x, game.player.y, '#f8eace', big?5:3);
 if(big){
  c.font = '12px Georgia'; c.textAlign = 'center'; c.fillStyle = '#f0e0bd';
  for(const [x,y,text] of labels) c.fillText(text, x*sx, y*sy);
 }
}
