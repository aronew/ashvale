// Ashvale world definition: the original vale map plus the zones added for the
// expanded game. Every builder returns a plain 2D array of tile codes, so the
// whole world stays testable without a browser.
import { T, TILE, random } from './content.mjs';

export const MW = 80, MH = 58;   // legacy vale dimensions, kept for save/compat maths

// --- tiny map painting helpers -------------------------------------------
const grid = (w,h,t=T.VOID) => Array.from({length:h}, () => Array(w).fill(t));
function fill(m,x,y,w,h,t){ for(let j=y;j<y+h;j++) for(let i=x;i<x+w;i++) if(m[j]?.[i]!==undefined) m[j][i]=t; }
function frame(m,x,y,w,h,t,thick=1){ fill(m,x,y,w,thick,t); fill(m,x,y+h-thick,w,thick,t); fill(m,x,y,thick,h,t); fill(m,x+w-thick,y,thick,h,t); }
function hall(m,x1,x2,y,w,t){ fill(m, Math.min(x1,x2), y-(w>>1), Math.abs(x2-x1)+1, w, t); }
function shaft(m,x,y1,y2,w,t){ fill(m, x-(w>>1), Math.min(y1,y2), w, Math.abs(y2-y1)+1, t); }
function blob(m,cx,cy,rx,ry,t){ for(let j=Math.floor(cy-ry);j<=cy+ry;j++) for(let i=Math.floor(cx-rx);i<=cx+rx;i++){ if(((i-cx)/rx)**2+((j-cy)/ry)**2<=1 && m[j]?.[i]!==undefined) m[j][i]=t; } }
function speckle(m,x,y,w,h,t,chance,rng){ for(let j=y;j<y+h;j++) for(let i=x;i<x+w;i++) if(m[j]?.[i]!==undefined && rng()<chance) m[j][i]=t; }
function speckleOn(m,x,y,w,h,from,to,chance,rng){ for(let j=y;j<y+h;j++) for(let i=x;i<x+w;i++) if(m[j]?.[i]===from && rng()<chance) m[j][i]=to; }

// =========================================================================
// ZONE 1 — Ashvale Hollow / Whisperwood / the Moonfen.
// FROZEN. Changing a single tile here can re-map every legacy save's object
// IDs, because the original resource scatter filters on tile type.
// =========================================================================
export function makeMap(){
 const map = Array.from({length:MH}, () => Array(MW).fill(3));
 for(let y=0;y<MH;y++) for(let x=0;x<MW;x++){
  if(x<2||y<2||x>77||y>54) map[y][x]=0;
  const main = ((x-24)/20)**2 + ((y-34)/19)**2 < 1;
  const east = x>=44 && x<=59 && y>=12 && y<=42;
  if(main||east) map[y][x]=1;
  if(x>=57&&x<=75&&y>=6&&y<=24) map[y][x]=4;
  if(x>=60&&x<=72&&y>=3&&y<=8) map[y][x]=4;
  if(x>=19&&x<=32&&y>=27&&y<=39) map[y][x]=4;
  if((y>=33&&y<=35&&x>=9&&x<=54)||(x>=25&&x<=27&&y>=20&&y<=47)) map[y][x]=2;
  if(x>=49&&x<=51&&y>=17&&y<=34) map[y][x]=2;
  if(y>=16&&y<=18&&x>=50&&x<=62) map[y][x]=4;
  if(x>=39&&x<=43&&y>=18&&y<=47) map[y][x]=3;
  if(x>=38&&x<=45&&y>=33&&y<=35) map[y][x]=5;
  if(x>=16&&x<=20&&y>=40&&y<=42) map[y][x]=6;
  if(x>=60&&((x-68)/10)**2+((y-42)/11)**2<1) map[y][x]=4;
  if(x>=60&&x<=70&&y>=34&&y<=36) map[y][x]=2;
 }
 return map;
}

// =========================================================================
// ZONE 2 — Hearthgate, the walled town.
// =========================================================================
export const TOWN_BUILDINGS = [
 { id:'temple',  x:8,  y:7,  w:11, h:8, style:'temple', name:'Chapel of the Last Light', door:[13,15] },
 { id:'hall',    x:23, y:7,  w:12, h:8, style:'hall',   name:'Wayfarers\u2019 Hall',      door:[28,15] },
 { id:'granary', x:41, y:7,  w:9,  h:7, style:'keep',   name:'The Granary',              door:[45,14] },
 { id:'loom',    x:52, y:7,  w:12, h:7, style:'loom',   name:'Lys\u2019s Loom',           door:[57,14] },
 { id:'forge',   x:11, y:17, w:11, h:9, style:'forge',  name:'Dain\u2019s Forge',         door:[16,26] },
 { id:'tavern',  x:51, y:17, w:13, h:9, style:'tavern', name:'The Gilded Lantern',       door:[57,26] },
 { id:'alchemy', x:10, y:33, w:10, h:6, style:'house',  name:'Sera\u2019s Stillroom',     door:[14,39] },
 { id:'barracks',x:56, y:33, w:12, h:6, style:'keep',   name:'Watch Barracks',           door:[61,39] },
 { id:'house1',  x:24, y:33, w:7,  h:6, style:'house',  name:'Row houses',               door:[27,39] },
 { id:'house2',  x:40, y:33, w:7,  h:6, style:'house',  name:'Row houses',               door:[43,39] },
 { id:'house3',  x:48, y:33, w:7,  h:6, style:'house',  name:'Row houses',               door:[51,39] },
 { id:'house4',  x:12, y:45, w:8,  h:3, style:'house',  name:'Dockside cottages',        door:[15,48] },
 { id:'house5',  x:46, y:45, w:8,  h:3, style:'house',  name:'Dockside cottages',        door:[49,48] }
];

export function makeTown(){
 const m = grid(78,58,T.VOID), rng = random(9021);
 fill(m,2,2,74,54,T.GRASS);                    // open ground outside the walls
 fill(m,7,7,64,44,T.DIRT);                     // town ground
 frame(m,5,5,68,48,T.WALL,2);                  // curtain wall
 // Gates: east to the vale road, south to the moor, north postern to the wood.
 fill(m,71,27,7,5,T.PATH);
 fill(m,35,51,5,7,T.PATH);
 fill(m,35,2,5,5,T.PATH);
 // Streets
 fill(m,7,27,64,5,T.PATH);        // the high street
 fill(m,35,7,5,44,T.PATH);        // market road, gate to gate
 fill(m,7,15,64,2,T.PATH);        // upper lane
 fill(m,7,39,64,3,T.PATH);        // dockside road
 // Market square, with the road kept clear through the middle
 fill(m,27,19,22,13,T.MARKET);
 fill(m,35,19,5,13,T.PATH);
 // The canal and its three crossings, then the quay
 fill(m,7,42,64,3,T.WATER);
 fill(m,18,42,4,3,T.BRIDGE); fill(m,35,42,5,3,T.BRIDGE); fill(m,54,42,4,3,T.BRIDGE);
 fill(m,7,45,64,6,T.SAND);
 // Allotments and the orchard
 fill(m,23,48,10,2,T.FIELD); fill(m,65,17,5,8,T.FIELD);
 for(const b of TOWN_BUILDINGS){
  fill(m,b.x,b.y,b.w,b.h,T.WALL);
  fill(m,b.door[0]-1,b.door[1],3,1,T.WOOD);     // doorstep
 }
 speckleOn(m,8,8,62,42,T.DIRT,T.MOSS,.02,rng);
 return m;
}

// =========================================================================
// ZONE 3 — Whisperwood Deep, the forest world.
// =========================================================================
export function makeForest(){
 const m = grid(82,64,T.VOID), rng = random(4471);
 fill(m,2,2,78,60,T.THICKET);
 frame(m,2,2,78,60,T.ROCK,3);
 // Southern road in from the vale, forking north and east
 fill(m,38,58,6,4,T.DIRT);
 shaft(m,41,20,60,6,T.DIRT);
 hall(m,10,70,30,5,T.DIRT);
 shaft(m,14,30,50,5,T.DIRT);
 shaft(m,67,8,32,5,T.DIRT);
 // Stream running north to south with two log crossings
 shaft(m,25,5,60,4,T.WATER);
 fill(m,23,28,5,4,T.BRIDGE); fill(m,23,46,5,4,T.BRIDGE);
 // Clearings
 blob(m,14,48,9,7,T.GRASS);             // the ranger camp
 blob(m,66,12,10,8,T.GRASS);            // Nima's hollow
 blob(m,41,33,12,9,T.GRASS);            // waystone crossing
 blob(m,13,14,10,8,T.STONE);            // the standing stones
 blob(m,58,50,13,10,T.MOSS);            // the Warden's grove (boss arena)
 fill(m,52,48,4,3,T.DIRT);              // grove approach
 hall(m,44,54,50,5,T.DIRT);
 // Rock walls breaking sightlines
 blob(m,32,10,5,4,T.ROCK); blob(m,53,23,5,3,T.ROCK); blob(m,19,37,4,4,T.ROCK);
 blob(m,71,35,4,5,T.ROCK); blob(m,33,52,4,3,T.ROCK);
 // Cave mouth in the north-east
 fill(m,64,6,7,4,T.CAVE);
 speckle(m,4,4,74,56,T.MOSS,.05,rng);
 speckle(m,4,4,74,56,T.GRASS,.03,rng);
 return m;
}

// =========================================================================
// ZONE 4 — The Sunken Warrens, the cave system.
// Rooms are placed explicitly and joined by corridors so connectivity is
// guaranteed rather than hoped for.
// =========================================================================
export const WARREN_ROOMS = [
 [5,47,16,12,T.CAVE],    // entry hall
 [7,28,18,14,T.CAVE],    // the abandoned dig
 [30,34,22,18,T.MOSS],   // mushroom cavern
 [56,30,24,18,T.CRYSTAL],// crystal gallery
 [29,5,28,21,T.CAVE],    // Devourer's pit
 [62,6,16,14,T.CAVE]     // the deep stair
];
export function makeWarren(){
 const m = grid(84,62,T.ROCK), rng = random(7733);
 frame(m,0,0,84,62,T.VOID,2);
 for(const [x,y,w,h,t] of WARREN_ROOMS) fill(m,x,y,w,h,t);
 // corridors
 shaft(m,12,41,48,5,T.CAVE);
 hall(m,24,31,37,5,T.CAVE);
 hall(m,51,57,40,5,T.CAVE);
 shaft(m,42,25,35,5,T.CAVE);
 shaft(m,68,19,31,5,T.CAVE);
 hall(m,56,63,13,5,T.CAVE);
 shaft(m,20,20,48,4,T.CAVE);
 hall(m,20,30,20,4,T.CAVE);
 // chasms to route around, each with a plank crossing
 fill(m,33,28,18,4,T.CHASM); fill(m,40,28,5,4,T.BRIDGE);
 fill(m,66,21,5,5,T.CHASM);  fill(m,66,22,5,3,T.BRIDGE);
 fill(m,18,24,4,6,T.CHASM);  fill(m,18,26,4,3,T.BRIDGE);
 // underground pool
 blob(m,41,44,6,4,T.WATER);
 // stair down to the Emberdeep
 fill(m,68,8,5,4,T.STONE);
 speckle(m,3,3,78,56,T.MOSS,.02,rng);
 return m;
}

// =========================================================================
// ZONE 5 — The Emberdeep, the last dungeon.
// =========================================================================
export function makeDeep(){
 const m = grid(74,56,T.ROCK), rng = random(3312);
 frame(m,0,0,74,56,T.VOID,2);
 fill(m,5,44,17,9,T.EMBER);       // arrival ledge at the foot of the stair
 fill(m,8,24,7,21,T.EMBER);       // west shaft up to the great hall
 fill(m,7,23,58,6,T.EMBER);       // the great hall runs the width of the dungeon
 fill(m,57,10,7,14,T.EMBER);      // east shaft
 fill(m,24,6,34,17,T.EMBER);      // the furnace: the Tyrant's arena
 fill(m,38,21,8,4,T.EMBER);       // arena mouth onto the hall
 fill(m,40,28,8,14,T.EMBER);      // causeway south
 fill(m,30,40,26,7,T.EMBER);      // the slag floor
 // Lava, placed only where it shapes a fight rather than closing a road.
 blob(m,19,34,3,5,T.LAVA); blob(m,30,34,5,4,T.LAVA); blob(m,54,35,5,4,T.LAVA);
 blob(m,67,31,3,7,T.LAVA); blob(m,30,13,4,3,T.LAVA); blob(m,51,13,4,3,T.LAVA);
 blob(m,34,44,4,2,T.LAVA); blob(m,52,44,3,2,T.LAVA);
 fill(m,42,40,4,7,T.BRIDGE);      // a causeway of old iron over the slag
 speckleOn(m,3,3,68,50,T.EMBER,T.CINDER,.06,rng);
 return m;
}

// =========================================================================
// ZONE 6 — The Ashen Crypt beneath Hearthgate (optional dungeon).
// =========================================================================
export function makeCrypt(){
 const m = grid(62,48,T.WALL), rng = random(2158);
 frame(m,0,0,62,48,T.VOID,2);
 fill(m,4,38,14,7,T.STONE);           // entry stair
 shaft(m,10,20,41,5,T.STONE);
 hall(m,8,52,22,5,T.STONE);
 shaft(m,30,12,24,5,T.STONE);
 shaft(m,49,14,36,5,T.STONE);
 fill(m,22,6,20,14,T.RUG);            // the reliquary
 fill(m,44,26,14,12,T.STONE);         // ossuary
 fill(m,6,6,12,10,T.STONE);           // cold cells
 hall(m,10,22,10,5,T.STONE);
 hall(m,42,50,32,5,T.STONE);
 speckle(m,3,3,56,42,T.MOSS,.03,rng);
 return m;
}

// --- interiors ------------------------------------------------------------
function room(w,h,floor,rug){
 const m = grid(w,h,T.VOID);
 fill(m,1,1,w-2,h-2,T.WALL);
 fill(m,2,2,w-4,h-4,floor);
 if(rug) fill(m,Math.floor(w/2)-3,Math.floor(h/2)-2,7,4,T.RUG);
 fill(m,Math.floor(w/2)-1,h-3,3,2,T.WOOD);
 return m;
}
export const makeForgeRoom  = () => room(24,17,T.STONE,false);
export const makeTavernRoom = () => room(26,17,T.WOOD,true);
export const makeHallRoom   = () => room(24,17,T.WOOD,true);

// =========================================================================
// Zone registry
// =========================================================================
export const ZONES = {
 vale:   { id:'vale',   name:'Ashvale Hollow',     sub:'A quiet place, waiting for a spark', make:makeMap,     w:80, h:58, spawn:[25.5,36], light:'dusk',   music:'vale'   },
 town:   { id:'town',   name:'Hearthgate',         sub:'The last town with its gates still shut', make:makeTown,  w:78, h:58, spawn:[73,29.5], light:'dusk',  music:'town'   },
 forest: { id:'forest', name:'Whisperwood Deep',   sub:'Older than the road, and less forgiving', make:makeForest, w:82, h:64, spawn:[41,59],  light:'night', music:'forest' },
 warren: { id:'warren', name:'The Sunken Warrens', sub:'Something has been digging up, not down', make:makeWarren, w:84, h:62, spawn:[12,54],  light:'cave',  music:'cave'   },
 deep:   { id:'deep',   name:'The Emberdeep',      sub:'The fire beneath every hearth', make:makeDeep,    w:74, h:56, spawn:[12,48],  light:'ember', music:'deep'  },
 crypt:  { id:'crypt',  name:'The Ashen Crypt',    sub:'Hearthgate buries its dead in rows', make:makeCrypt,  w:62, h:48, spawn:[10,41],  light:'cave',  music:'cave'   },
 forge:  { id:'forge',  name:'Dain’s Forge',   sub:'Coal smoke and hammer-song', make:makeForgeRoom,  w:24, h:17, spawn:[12,13],  light:'warm',  music:'town', interior:true },
 tavern: { id:'tavern', name:'The Gilded Lantern', sub:'Every road in the vale ends here', make:makeTavernRoom, w:26, h:17, spawn:[13,13], light:'warm', music:'town', interior:true },
 hall:   { id:'hall',   name:'Wayfarers’ Hall',sub:'Work for anyone willing', make:makeHallRoom,   w:24, h:17, spawn:[12,13],  light:'warm',  music:'town', interior:true }
};
export const ZONE_ORDER = ['vale','town','forest','warren','crypt','deep','forge','tavern','hall'];

// =========================================================================
// Portals. Every pair is two-way; `to`/`at` is the arrival tile in the target.
// =========================================================================
export const PORTALS = [
 { id:'p-vale-town',   zone:'vale',   x:9.5,  y:34.5, to:'town',   at:[73,29.5], label:'The west road',        sub:'Hearthgate lies an hour’s walk west.' },
 { id:'p-town-vale',   zone:'town',   x:75,   y:29.5, to:'vale',   at:[10.6,34.5],label:'The vale road',       sub:'Back east to Ashvale Hollow.' },
 { id:'p-vale-forest', zone:'vale',   x:46.5, y:13,   to:'forest', at:[41,59],   label:'Whisperwood trail',    sub:'The old trail north into the deep wood.' },
 { id:'p-forest-vale', zone:'forest', x:41,   y:61,   to:'vale',   at:[45.2,14.8],label:'Trail south',         sub:'Down out of the trees to the vale.' },
 { id:'p-town-forest', zone:'town',   x:37.5, y:3.5,  to:'forest', at:[14.5,49], label:'North postern',        sub:'A guarded gate onto the ranger road.' },
 { id:'p-forest-town', zone:'forest', x:14,   y:47,   to:'town',   at:[37.5,6.5],label:'Ranger road',          sub:'South-west, back to Hearthgate’s postern.' },
 { id:'p-forest-warren',zone:'forest',x:67.5, y:7.5,  to:'warren', at:[12,54],   label:'The Warren mouth',     sub:'Cold air comes up out of the dark.' },
 { id:'p-warren-forest',zone:'warren',x:12,   y:56,   to:'forest', at:[67.5,10], label:'Back to the surface',  sub:'Daylight, somewhere up there.' },
 { id:'p-warren-deep', zone:'warren', x:70.5, y:9.5,  to:'deep',   at:[12,48],   label:'The deep stair',       sub:'Heat rises from the steps below.' },
 { id:'p-deep-warren', zone:'deep',   x:12,   y:50,   to:'warren', at:[70.5,12], label:'Up the deep stair',    sub:'Back toward cold stone.' },
 { id:'p-town-crypt',  zone:'town',   x:20.5, y:10.5, to:'crypt',  at:[10,41],   label:'Crypt stair',          sub:'Beside the chapel. It has not been swept in years.' },
 { id:'p-crypt-town',  zone:'crypt',  x:10,   y:43,   to:'town',   at:[20.5,13.6],label:'Chapel stair',        sub:'Back up into the light.' },
 { id:'d-forge',  zone:'town',  x:16.5, y:26.6, to:'forge',  at:[12,13],   label:'Dain’s Forge',        sub:'Enter the forge', door:true },
 { id:'d-forge-out', zone:'forge', x:12, y:14.4, to:'town',  at:[16.5,27.5],label:'Out to the high street', sub:'Leave the forge', door:true },
 { id:'d-tavern', zone:'town',  x:57.5, y:26.6, to:'tavern', at:[13,13],   label:'The Gilded Lantern',      sub:'Enter the tavern', door:true },
 { id:'d-tavern-out',zone:'tavern',x:13, y:14.4, to:'town',  at:[57.5,27.5],label:'Out to the high street',  sub:'Leave the tavern', door:true },
 { id:'d-hall',   zone:'town',  x:36.5, y:18.6, to:'hall',   at:[12,13],   label:'Wayfarers’ Hall',    sub:'Enter the hall', door:true },
 { id:'d-hall-out',zone:'hall', x:12,  y:14.4, to:'town',    at:[28.5,17.5],label:'Out to the lane',        sub:'Leave the hall', door:true }
];

// Named map labels drawn on the world map panel.
export const ZONE_LABELS = {
 vale:  [[24,48,'ASHVALE'],[50,40,'WHISPERWOOD'],[66,27,'THE ROOTVAULT'],[68,55,'THE MOONFEN'],[10,34,'WEST ROAD']],
 town:  [[38,27,'MARKET SQUARE'],[16,22,'THE FORGE'],[57,22,'THE LANTERN'],[36,13,'WAYFARERS’ HALL'],[38,50,'THE QUAY']],
 forest:[[41,33,'THE WAYSTONE'],[13,14,'STANDING STONES'],[66,12,'NIMA’S HOLLOW'],[62,54,'THE WARDEN’S GROVE'],[67,7,'WARREN MOUTH']],
 warren:[[12,52,'ENTRY HALL'],[15,34,'THE OLD DIG'],[40,43,'MUSHROOM CAVERN'],[67,38,'CRYSTAL GALLERY'],[43,15,'THE DEVOURER’S PIT']],
 deep:  [[12,48,'THE LONG STAIR'],[43,18,'THE FURNACE'],[44,46,'CAUSEWAY']],
 crypt: [[10,41,'CRYPT STAIR'],[31,12,'THE RELIQUARY'],[50,31,'OSSUARY']],
 forge: [[12,8,'THE ANVIL']], tavern: [[13,8,'THE COMMON ROOM']], hall: [[12,8,'THE BOARD']]
};
