// Ashvale game model. Deterministic, and deliberately free of DOM, canvas,
// localStorage, timers and network APIs so the whole game can be unit tested.
import {
 TILE, SOLID, HAZARD, ITEMS, GATHER, WEAPONS, OUTFITS,
 SPELLS, SUPERS, RECIPES, ENEMIES, SWINGS, SWING_SETS, HEAVY,
 UPGRADE_COST, MAX_UPGRADE, upgradedPower, clamp, distance, random
} from './data/content.mjs';
import { ZONES, ZONE_ORDER, PORTALS, MW, MH, makeMap } from './data/world.mjs';
import { SPAWNS, CHESTS, LAMPS } from './data/spawns.mjs';
import { NPCS, QUESTS, QUEST_BY_ID, BOUNTIES, SHOPS, SELL_PRICE } from './data/quests.mjs';

export { TILE, MW, MH, SWINGS, ITEMS, clamp, distance, random, makeMap };
export * from './data/content.mjs';
export { ZONES, ZONE_ORDER, PORTALS } from './data/world.mjs';
export { NPCS, QUESTS, QUEST_BY_ID, BOUNTIES, SHOPS, SELL_PRICE } from './data/quests.mjs';

export const DAY_LENGTH = 420;          // seconds of simulated time per full day
export const RESPAWN_MOB = 75;          // seconds before an ordinary enemy returns
const BUCKET = 96;

// =========================================================================
export class Game {
 constructor(saved){
  this.maps = {}; for(const id of ZONE_ORDER) this.maps[id] = ZONES[id].make();
  this.zone = 'vale';
  this.time = 0; this.clock = 0.30;                 // 0..1 through the day; start at dusk
  this.events = []; this.objects = []; this.enemies = [];
  this.particles = []; this.projectiles = []; this.texts = []; this.shocks = [];
  this.player = {
   x:25.5*TILE, y:36*TILE, hp:100, maxHp:100, stamina:100, xp:0, level:1, dir:0, angle:-Math.PI/2,
   attack:0, dash:0, dashCd:0, spell:0, invincible:0, kills:0, combo:0, comboTimer:0,
   attackDuration:0, attackAngle:0, attackHit:true, attackBuffer:0,
   heavy:false, charge:0, focus:0, superT:0, shield:0, burnT:0, perfect:0, slow:0, hitLag:0
  };
  this.bag = { wood:0, stone:0, herb:0, essence:0, potion:3, core:0,
   iron:0, coal:0, leather:0, silk:0, fang:0, crystal:0, cinder:0, moonsteel:0, relic:0,
   seed:0, warrenkey:0, elixir:0, coin:25 };
  this.flags = { met:false, cottage:false, boss:false, hearth:false, upgrade:false,
   beacon0:false, beacon1:false, beacon2:false, beacons:false,
   forgeOpen:false, forgeDiscount:false, loomOpen:false, ending:false, warrenOpen:false };
  this.gear = { weapon:'hearthblade', outfit:'wayfarer', spell:'ember' };
  this.weapons = { hearthblade:0 };            // id -> upgrade level
  this.outfits = { wayfarer:true };
  this.spells = { ember:true };
  this.recipes = { tonic:true, blade:true };   // known recipes beyond the always-available ones
  this.quests = {};                            // id -> {state, step, counts}
  this.bounty = null;                          // {id, killed}
  this.killLog = {};                           // enemy type -> total kills
  this.removed = new Set(); this.harvests = {}; this.lastSave = 0;
  this.slowmo = 0; this.visited = { vale:true };
  this.build(); this.index();
  if(saved) this.restore(saved);
  this.index();
  this.syncAutoQuests();
  this.events.length = 0;        // construction is not something the UI should react to
 }

 get map(){ return this.maps[this.zone]; }
 get zoneDef(){ return ZONES[this.zone]; }
 get mapW(){ return ZONES[this.zone].w; }
 get mapH(){ return ZONES[this.zone].h; }

 // ---------------------------------------------------------------- build
 build(){
  let n = 0;
  const add = (type,x,y,props={}) => { const o = { id:'o'+n++, type, x:x*TILE, y:y*TILE, hp:3, zone:'vale', ...props }; this.objects.push(o); return o; };
  // ---- ORIGINAL SEQUENCE. Do not reorder, insert into, or re-seed. -------
  add('cottage',20.4,28,{radius:43}); add('ruin',31.7,27.9,{radius:43}); add('hearth',27.5,33,{radius:19}); add('npc',25,31.5,{radius:12,npc:'wren',name:'Wren'}); add('arch',57.2,17.1,{radius:0});
  [[21,32],[31,32],[24,26],[28,39],[37.8,33],[44.8,33],[50,23],[59,17],[69,20],[10,34],[26,46]].forEach(p=>add('lamp',...p,{radius:6}));
  [[14,31],[34,38],[48,27],[61,20],[72,8]].forEach(p=>add('chest',...p,{radius:12}));
  for(let y=40;y<=42;y++) for(let x=17;x<=19;x++) add('plot',x+.5,y+.5,{radius:0,growing:0,ripe:false});
  const rand = random(145);
  for(let i=0;i<180;i++){
   const x = 5+rand()*51, y = 11+rand()*40, tx = Math.floor(x), ty = Math.floor(y);
   if(this.maps.vale[ty]?.[tx]!==1 || this.objects.some(o=>distance(o,{x:x*TILE,y:y*TILE})<75)) continue;
   const type = i%5===0?'ore':i%7===0?'herb':'tree';
   add(type,x,y,{radius:type==='tree'?14:type==='ore'?17:0,hp:type==='tree'?3:2});
  }
  [[12,39],[14,42],[34,29],[35,32],[46,22],[46,36],[51,29],[53,20],[55,36],[60,12],[62,20],[65,8],[71,19]].forEach((p,i)=>this.enemies.push(
   this.makeMob(i%3===0?'bat':'slime', p[0], p[1], 'vale', { id:'e'+i, legacy:true })));
  this.enemies.push(this.makeMob('guardian',69,12,'vale',{ id:'boss', once:true, cd:1, slamCd:4 }));
  // Chapter II appendix (original expansion, keep in place)
  [[63,41],[72,35],[72,48]].forEach((p,i)=>add('beacon',...p,{id:'beacon'+i,radius:13,index:i}));
  [[62,34],[68,38],[75,43],[65,48]].forEach((p,i)=>add('herb',...p,{id:'moonfen-herb'+i,radius:0,hp:1}));
  [[61,36],[74,46]].forEach((p,i)=>add('chest',...p,{id:'moonfen-cache'+i,radius:12}));
  [[61,40],[64,33],[67,50],[75,39],[74,49]].forEach((p,i)=>add('tree',...p,{id:'moonfen-tree'+i,radius:14,hp:3}));
  [[64,38],[68,40],[71,45],[65,47],[73,39],[69,50]].forEach((p,i)=>this.enemies.push(
   this.makeMob('wisp',p[0],p[1],'vale',{ id:'wisp'+i, cd:1+i*.2 })));
  // ---- END ORIGINAL SEQUENCE --------------------------------------------

  const put = (id,zone,type,x,y,props={}) => { this.objects.push({ id, zone, type, x:x*TILE, y:y*TILE, hp:3, radius:0, ...props }); };

  for(const p of PORTALS) put(p.id, p.zone, 'portal', p.x, p.y, { radius:0, to:p.to, at:p.at, label:p.label, sub:p.sub, door:!!p.door, needs:p.needs, locked:p.locked });
  for(const c of CHESTS) put(c.id, c.zone, 'chest', c.x, c.y, { radius:12, loot:c.loot });
  for(const [zone,list] of Object.entries(LAMPS)) list.forEach(([x,y],i)=>put(`lamp-${zone}-${i}`, zone, 'lamp', x, y, { radius:6, lit:zone!=='town'||i<9 }));

  for(const [zone,spec] of Object.entries(SPAWNS)){
   (spec.props||[]).forEach(([art,x,y,opts={}],i)=>{ if(opts.hidden) return; put(`pr-${zone}-${i}`, zone, 'prop', x, y, { art, radius:opts.radius??0, ...opts }); });
   (spec.npcs||[]).forEach(([npc,x,y],i)=>put(`npc-${zone}-${i}`, zone, 'npc', x, y, { radius:12, npc, name:NPCS[npc]?.name ?? '' }));
   (spec.nodes||[]).forEach(([type,x,y],i)=>{ const g = GATHER[type]; put(`nd-${zone}-${i}`, zone, type, x+.5, y+.5, { radius:g.radius, hp:g.hp }); });
   (spec.mobs||[]).forEach(([type,x,y,opts={}],i)=>this.enemies.push(this.makeMob(type,x,y,zone,{ id:`m-${zone}-${i}`, ...opts })));
  }
  // Pim's cat, tucked into the forest.
  put('cat-ash','forest','prop',22.5,45.5,{ art:'cat', radius:0, label:'A small grey cat', tag:'cat' });
  // The forge, loom, stillroom and board benches are props tagged for interaction.
  this.objects.push({ id:'legacy-anchor', zone:'none', type:'marker', x:0, y:0, radius:0, hp:0 });
 }

 makeMob(type,x,y,zone,props={}){
  const d = ENEMIES[type];
  return { id:props.id, type, zone, x:x*TILE, y:y*TILE, homeX:x*TILE, homeY:y*TILE,
   hp:d.hp, maxHp:d.hp, cd:0, hit:0, phase:(x+y)%6, windup:0, cast:0, aim:0,
   poise:d.poise, maxPoise:d.poise, stagger:0, burn:0, slowT:0, deadUntil:0, phaseN:0, dash:0,
   ...props };
 }

 // Bucket solid objects per zone so movement checks stay cheap in big maps.
 index(){
  this.buckets = {}; this.zoneEnemies = {}; this.zoneObjects = {};
  this._oRef = this.objects; this._eRef = this.enemies;
  for(const o of this.objects){
   const oz = o.zone ?? this.zone;
   (this.zoneObjects[oz] ??= []).push(o);
   if(!(o.radius>0)) continue;
   const b = (this.buckets[oz] ??= new Map());
   const x0 = Math.floor((o.x-o.radius-12)/BUCKET), x1 = Math.floor((o.x+o.radius+12)/BUCKET);
   const y0 = Math.floor((o.y-o.radius-12)/BUCKET), y1 = Math.floor((o.y+o.radius+12)/BUCKET);
   for(let j=y0;j<=y1;j++) for(let i=x0;i<=x1;i++){ const k = i+','+j; (b.get(k) ?? b.set(k,[]).get(k)).push(o); }
  }
  for(const e of this.enemies) (this.zoneEnemies[e.zone ?? this.zone] ??= []).push(e);
 }
 // Callers (and tests) may swap the whole entity array; re-index when they do.
 here(){ if(this._eRef !== this.enemies || this._zRef !== this.zone) this.reindex(); return this.zoneEnemies[this.zone] ?? []; }
 props(){ if(this._oRef !== this.objects || this._zRef !== this.zone) this.reindex(); return this.zoneObjects[this.zone] ?? []; }
 reindex(){ this._zRef = this.zone; this.index(); }

 // -------------------------------------------------------------- terrain
 tile(x,y,zone=this.zone){ return this.maps[zone][Math.floor(y/TILE)]?.[Math.floor(x/TILE)] ?? 0; }
 blocked(t){ return SOLID.has(t); }
 walkable(x,y,r=9,zone=this.zone){
  for(const [ox,oy] of [[-r,-r],[r,-r],[-r,r],[r,r]]) if(this.blocked(this.tile(x+ox,y+oy,zone))) return false;
  const b = this.buckets[zone]; if(!b) return true;
  const list = b.get(Math.floor(x/BUCKET)+','+Math.floor(y/BUCKET));
  if(!list) return true;
  for(const o of list) if(!this.removed.has(o.id) && distance(o,{x,y}) < o.radius+r) return false;
  return true;
 }
 move(entity,dx,dy,r=9){
  const z = entity.zone ?? this.zone;
  if(this.walkable(entity.x+dx,entity.y,r,z)) entity.x += dx;
  if(this.walkable(entity.x,entity.y+dy,r,z)) entity.y += dy;
 }
 event(type,data={}){
  this.events.push({ type, ...data });
  // Chapter I and II follow the original flags, so any state change can close them.
  if(!this._syncing && AUTO_SYNC.has(type)){ this._syncing = true; try { this.syncAutoQuests(); } finally { this._syncing = false; } }
 }
 toast(text){ this.event('toast',{ text }); }
 float(text,x,y,color='#efcf8a',size=11){ this.texts.push({ text,x,y,color,size,life:1.6 }); }
 particlesAt(x,y,color,n=10,spread=1){
  const r = random(Math.floor(this.time*500)+n);
  for(let i=0;i<n;i++) this.particles.push({ x, y, vx:(r()-.5)*120*spread, vy:(r()-.5)*100*spread-25, life:.3+r()*.5, max:1, color, size:1+r()*3 });
 }
 shock(x,y,radius,color='#ffcf94'){ this.shocks.push({ x, y, r:6, max:radius, life:.42, color }); }

 // ---------------------------------------------------------------- items
 gain(item,n,x=this.player.x,y=this.player.y){
  if(!(item in this.bag)) return;
  this.bag[item] += n;
  this.float('+'+n+' '+ITEMS[item], x, y-30, item==='coin'?'#f4d98b':'#eed39a');
  this.event('pickup');
  this.questCollect();
 }
 has(cost){ return Object.entries(cost).every(([k,v]) => (this.bag[k]??0) >= v); }
 spend(cost){ for(const [k,v] of Object.entries(cost)) this.bag[k] -= v; }
 costText(cost){ return Object.entries(cost).map(([k,v]) => `${v} ${ITEMS[k]}`).join(' · '); }
 exp(n){
  const p = this.player; p.xp += n;
  while(p.xp >= p.level*70){ p.xp -= p.level*70; p.level++; p.maxHp += 15; p.hp = p.maxHp; this.toast('Level '+p.level+' · Health restored'); this.event('level'); }
 }

 // ------------------------------------------------------------ equipment
 weapon(){ return WEAPONS[this.gear.weapon] ?? WEAPONS.hearthblade; }
 outfit(){ return OUTFITS[this.gear.outfit] ?? OUTFITS.wayfarer; }
 spellDef(){ return SPELLS[this.gear.spell] ?? SPELLS.ember; }
 swingSet(){ return SWING_SETS[this.weapon().kind] ?? SWINGS; }
 currentSwing(){ const p = this.player; return p.heavy ? HEAVY[this.weapon().kind] : this.swingSet()[p.combo % this.swingSet().length]; }
 weaponLevel(id=this.gear.weapon){ return this.weapons[id] ?? 0; }
 attackPower(){
  const w = this.weapon();
  return upgradedPower(w.power, this.weaponLevel(w.id))
   + (this.player.level-1)*3
   + (this.flags.beacons?8:0)
   + (this.outfit().attack||0);
 }
 armour(){ return this.outfit().armor||0; }
 critChance(){ return (this.outfit().crit||0) + (this.weapon().perk==='crit'?.18:0); }
 moveSpeed(){ return 145 + (this.outfit().speed||0); }
 equip(kind,id){
  if(kind==='weapon'){ if(!(id in this.weapons)) return false; this.gear.weapon = id; this.player.combo = 0; this.player.comboTimer = 0; }
  else if(kind==='outfit'){ if(!this.outfits[id]) return false; this.gear.outfit = id; }
  else if(kind==='spell'){ if(!this.spells[id]) return false; this.gear.spell = id; }
  else return false;
  this.event('equip',{ kind, id }); return true;
 }
 unlockWeapon(id){ if(id in this.weapons) return false; this.weapons[id] = 0; this.gear.weapon = id; this.player.combo = 0; this.event('unlock',{ kind:'weapon', id }); this.toast('Acquired · '+WEAPONS[id].name); return true; }
 unlockOutfit(id){ if(this.outfits[id]) return false; this.outfits[id] = true; this.event('unlock',{ kind:'outfit', id }); this.toast('Acquired · '+OUTFITS[id].name); return true; }
 unlockSpell(id){ if(this.spells[id]) return false; this.spells[id] = true; this.gear.spell = id; this.event('unlock',{ kind:'spell', id }); this.toast('Learned · '+SPELLS[id].name); return true; }
 superDef(){ return SUPERS[this.weapon().kind] ?? SUPERS.sword; }

 // ================================================================ combat
 // A swing is started here and lands exactly once, in update(), at the
 // swing's configured impact time. Visuals read the same table.
 attack(heavy=false){
  const p = this.player;
  if(p.superT > 0) return false;
  if(p.attack > 0){ p.attackBuffer = .2; return false; }
  if(heavy){
   if(p.stamina < 30) { this.toast('Not enough stamina for a heavy strike.'); return false; }
   p.stamina -= 30; p.heavy = true; p.combo = 0; p.comboTimer = 0;
  } else {
   p.heavy = false;
   const set = this.swingSet();
   p.combo = p.comboTimer > 0 ? (p.combo+1) % set.length : 0;
  }
  const swing = this.currentSwing();
  const rate = 1/(this.weapon().speed ?? 1);
  p.attack = swing.duration*rate; p.attackDuration = swing.duration*rate; p.attackHit = false; p.attackBuffer = 0;
  p.comboTimer = heavy ? 0 : p.attackDuration + .7;
  // Soft target assist, unless the player is actively aiming with a pointer.
  if(!p.aiming){
   const near = this.here().filter(e => e.hp>0 && distance(e,p) < 110).sort((a,b)=>distance(a,p)-distance(b,p))[0];
   if(near) p.angle = Math.atan2(near.y-p.y, near.x-p.x);
  }
  p.attackAngle = p.angle;
  p.dir = Math.abs(Math.cos(p.angle)) > Math.abs(Math.sin(p.angle)) ? (Math.cos(p.angle)<0?2:3) : (Math.sin(p.angle)<0?1:0);
  this.event('attack',{ combo:p.combo, heavy, name:swing.name });
  return true;
 }
 heavyAttack(){ return this.attack(true); }

 strike(){
  const p = this.player, swing = this.currentSwing(), w = this.weapon();
  const reachBonus = w.perk==='reach' ? 14 : 0;
  const base = Math.round(this.attackPower() * swing.multiplier);
  let hits = 0, killed = 0;
  for(const e of this.here()){
   if(e.hp <= 0) continue;
   const d = distance(e,p), lenient = ENEMIES[e.type].boss ? 16 : 0;
   if(d > swing.range + reachBonus + lenient) continue;
   if(Math.cos(Math.atan2(e.y-p.y, e.x-p.x) - p.attackAngle) <= swing.cone) continue;
   const crit = this.roll() < this.critChance();
   const before = e.hp;
   this.hitEnemy(e, crit ? Math.round(base*1.85) : base, { poise:swing.poise, crit, knock:swing.multiplier*10 });
   if(w.perk === 'burn' || (w.perk === 'hearth' && p.combo === this.swingSet().length-1)) e.burn = Math.max(e.burn, 3.2);
   if(w.perk === 'bleed' && swing.bleed) e.burn = Math.max(e.burn, 4.5);
   if(before > 0 && e.hp <= 0) killed++;
   hits++;
  }
  // Finisher extras that give each weapon class its own feel.
  if(swing.shock) this.shockwave(p.x + Math.cos(p.attackAngle)*40, p.y + Math.sin(p.attackAngle)*40, swing.shock, Math.round(base*.55));
  if(swing.chain || (w.perk==='chain' && swing.style==='spin')) this.chain(p.x, p.y, swing.chain||3, Math.round(base*.5));
  if(w.perk === 'hearth' && p.combo === this.swingSet().length-1 && hits){ const heal = Math.min(12, this.player.maxHp-this.player.hp); if(heal>0){ this.player.hp += heal; this.float('+'+heal, p.x, p.y-44, '#94d4b8'); } }

  // Gathering shares the swing, with the finisher biting deeper.
  const finisher = p.heavy || p.combo === this.swingSet().length-1;
  for(const o of this.props()){
   if(this.removed.has(o.id) || !GATHER[o.type]) continue;
   if(distance(o,p) > (finisher?82:70)) continue;
   if(Math.cos(Math.atan2(o.y-p.y, o.x-p.x) - p.attackAngle) <= -.4) continue;
   const g = GATHER[o.type];
   o.hp -= finisher ? 2 : 1; o.hit = .18;
   this.particlesAt(o.x, o.y-15, g.spark, finisher?15:7);
   this.event('chop'); hits++;
   if(o.hp <= 0){
    this.removed.add(o.id); o.respawnAt = this.time + g.regrow;
    for(const [item,amount] of Object.entries(g.give)) if(amount>0) this.gain(item, amount, o.x, o.y);
    this.exp(5);
   }
  }
  if(hits) this.event('impact',{ combo:p.combo, heavy:p.heavy, killed, style:swing.style });
  if(finisher) this.particlesAt(p.x+Math.cos(p.attackAngle)*48, p.y+Math.sin(p.attackAngle)*48-12, this.weapon().trail, 18);
 }

 roll(){ this._r ??= random(99); return this._r(); }

 // A shockwave with no damage is pure spectacle; it must not chip everything
 // standing nearby for a point.
 shockwave(x,y,radius,damage){
  this.shock(x,y,radius);
  if(damage > 0) for(const e of this.here()) if(e.hp>0 && distance(e,{x,y}) < radius) this.hitEnemy(e, damage, { poise:40, knock:22 });
  this.event('shockwave',{ x, y, radius });
 }
 chain(x,y,links,damage){
  const pool = this.here().filter(e => e.hp>0 && distance(e,{x,y}) < 240).sort((a,b)=>distance(a,{x,y})-distance(b,{x,y})).slice(0,links);
  let from = { x, y };
  for(const e of pool){ this.event('arc',{ x1:from.x, y1:from.y-18, x2:e.x, y2:e.y-18 }); this.hitEnemy(e, damage, { poise:12 }); from = e; }
 }

 hitEnemy(e, amount, opts={}){
  const d = ENEMIES[e.type];
  let dealt = Math.max(1, amount - (d.armor||0));
  if(e.stagger > 0) dealt = Math.round(dealt*1.3);
  e.hp -= dealt; e.hit = .15;
  const p = this.player, a = Math.atan2(e.y-p.y, e.x-p.x);
  if(!d.boss){ const k = opts.knock ?? 12; this.move(e, Math.cos(a)*k, Math.sin(a)*k, 8); }
  this.float(String(dealt) + (opts.crit?'!':''), e.x, e.y-27, opts.crit?'#ffd873':'#f4dbc3', opts.crit?15:11);
  this.particlesAt(e.x, e.y-10, opts.crit?'#ffd071':'#a986c2', opts.crit?14:8);
  if(this.player.superT <= 0) this.player.focus = Math.min(100, this.player.focus + (d.boss?2.2:1.4));
  if(opts.poise && !d.boss){
   e.poise -= opts.poise;
   if(e.poise <= 0){ e.poise = e.maxPoise; e.stagger = 1.25; e.windup = 0; e.cast = 0; this.float('STAGGER', e.x, e.y-46, '#ffe9a8', 12); this.event('stagger',{ x:e.x, y:e.y }); }
  }
  if(e.hp <= 0) this.killEnemy(e);
 }

 killEnemy(e){
  const d = ENEMIES[e.type], p = this.player;
  e.hp = 0; p.kills++;
  this.killLog[e.type] = (this.killLog[e.type]||0) + 1;
  this.exp(d.xp);
  this.particlesAt(e.x, e.y-14, d.boss?'#ffcf8c':'#b07fc7', d.boss?60:18, d.boss?2:1);
  for(const [item,n] of Object.entries(d.drops||{})) this.gain(item, n, e.x, e.y);
  if(!d.boss && p.kills % 3 === 0) this.gain('herb', 1, e.x, e.y);
  if(p.superT <= 0) p.focus = Math.min(100, p.focus + (d.boss?40:6));
  if(e.once || d.boss) e.deadUntil = Infinity; else e.deadUntil = this.time + RESPAWN_MOB;
  this.questKill(e.type);
  if(this.bounty && this.bounty.enemy === e.type){ this.bounty.killed++; if(this.bounty.killed >= this.bounty.count) this.toast('Bounty complete · report to the Wayfarers’ Hall.'); }

  if(e.type === 'guardian'){
   this.flags.boss = true; this.gain('core',1,e.x,e.y);
   this.toast('The Heart Spark is yours. Return to the village hearth.'); this.event('boss-defeated',{ name:d.name });
  } else if(d.boss){
   this.gain('coin', e.type==='tyrant'?400:180, e.x, e.y);
   if(e.type === 'bramble'){ this.gain('seed',1,e.x,e.y); }
   // The sigil drops from the thing itself, so the deep stair can never be
   // left sealed by a quest the player has not handed in yet.
   if(e.type === 'devourer'){ this.gain('moonsteel',2,e.x,e.y); this.gain('warrenkey',1,e.x,e.y); this.flags.warrenOpen = true; }
   if(e.type === 'choirlord'){ this.gain('relic',1,e.x,e.y); }
   if(e.type === 'tyrant'){ this.flags.ending = true; }
   this.event('boss-defeated',{ name:d.name, type:e.type });
  }
  // A sporeling bursts when it dies, and the burst is aimed at you, not at
  // the things standing next to it.
  if(d.burst){
   this.shock(e.x, e.y, d.burst.radius, '#b9d7a6');
   this.particlesAt(e.x, e.y-10, '#b9d7a6', 26, 1.6);
   this.event('burst',{ x:e.x, y:e.y });
   if(distance(e, p) < d.burst.radius) this.hurt(d.burst.dmg);
  }
 }

 hurt(n, source){
  const p = this.player;
  if(p.invincible > 0 || p.dash > 0){
   // A dodge that beats an attack by a hair pays you back in focus.
   if(p.dash > 0 && p.perfect <= 0){ p.perfect = .9; p.focus = Math.min(100, p.focus+18); this.slowmo = .28; this.float('PERFECT', p.x, p.y-52, '#bff4e6', 13); this.event('perfect'); }
   return false;
  }
  let dmg = Math.max(1, Math.round(n * (1 - Math.min(.65, this.armour()/45))));
  if(source === 'fire') dmg = Math.round(dmg * (1 - (this.outfit().fire||0)));
  if(p.shield > 0){ const absorbed = Math.min(p.shield, dmg); p.shield -= absorbed; dmg -= absorbed; this.event('shielded'); if(dmg <= 0){ this.float('WARDED', p.x, p.y-40, '#ffe6b0', 12); return false; } }
  p.hp = Math.max(0, p.hp - dmg); p.invincible = .8;
  this.float('-'+dmg, p.x, p.y-36, '#ee8d9e');
  this.event('hurt',{ amount:dmg });
  if(p.hp <= 0) this.die();
  return true;
 }

 die(){
  const p = this.player, home = ZONES[this.zone].interior ? 'town' : this.zone;
  const spawn = ZONES[home].spawn;
  this.setZone(home, spawn[0], spawn[1], true);
  p.hp = p.maxHp; p.stamina = 100; p.invincible = 3; p.focus = Math.max(0, p.focus-40); p.shield = 0;
  const lost = Math.min(this.bag.coin, Math.floor(this.bag.coin*.1));
  if(lost > 0) this.bag.coin -= lost;
  this.toast(lost > 0 ? `You wake at the nearest hearth. ${lost} ember marks lost.` : 'You wake at the nearest hearth. Your belongings are safe.');
  this.event('respawn');
  for(const e of this.enemies){ if(e.deadUntil > this.time) continue; e.x = e.homeX; e.y = e.homeY; e.stagger = 0; e.windup = 0; e.cast = 0; if(ENEMIES[e.type].boss && !e.once) e.hp = e.maxHp; }
  const bossHere = this.here().find(e => ENEMIES[e.type].boss && e.hp > 0 && e.hp < e.maxHp);
  if(bossHere){ bossHere.hp = bossHere.maxHp; bossHere.phaseN = 0; }
 }

 dash(){
  const p = this.player;
  if(p.stamina < 25 || p.dashCd > 0 || p.superT > 0) return false;
  p.stamina -= 25; p.dash = .18 + (this.outfit().dodge||0)*.18; p.dashCd = .55;
  p.attack = 0; p.attackHit = true;                        // dodge cancels a swing
  this.event('dash'); return true;
 }

 cast(){
  const p = this.player, s = this.spellDef();
  if(p.spell > 0){ this.toast(s.name+' is still gathering.'); return false; }
  if(p.stamina < s.cost){ this.toast('Not enough stamina for '+s.name+'.'); return false; }
  p.stamina -= s.cost; p.spell = s.cooldown;
  const power = Math.round(s.power * (1 + (this.outfit().spell||0) + (p.level-1)*.05));
  this.event('spell',{ id:s.id });
  if(s.id === 'ward'){ p.shield = s.shield; p.hp = Math.min(p.maxHp, p.hp + s.heal); this.particlesAt(p.x,p.y-12,s.color,28); return true; }
  if(s.id === 'blink'){
   const nx = p.x + Math.cos(p.angle)*s.dash, ny = p.y + Math.sin(p.angle)*s.dash;
   if(this.walkable(nx,ny)){ this.particlesAt(p.x,p.y-12,s.color,20); p.x = nx; p.y = ny; }
   p.invincible = Math.max(p.invincible, .35);
   this.particlesAt(p.x,p.y-12,s.color,24);
   for(const e of this.here()) if(e.hp>0 && distance(e,p) < s.radius) this.hitEnemy(e, power, { poise:24, knock:18 });
   return true;
  }
  if(s.id === 'bolt'){ this.chain(p.x, p.y, s.chain, power); this.particlesAt(p.x,p.y-12,s.color,18); return true; }
  if(s.id === 'sunfall'){
   this.projectiles.push({ kind:'meteor', x:p.x+Math.cos(p.angle)*140, y:p.y+Math.sin(p.angle)*140, vx:0, vy:0, life:s.delay, fuse:s.delay, radius:s.radius, dmg:power, friendly:true, color:s.color });
   return true;
  }
  // ember / frost: a burst centred on the player
  this.particlesAt(p.x, p.y-10, s.color, 35, 1.6);
  this.shock(p.x, p.y, s.radius, s.color);
  for(const e of this.here()){
   if(e.hp <= 0 || distance(e,p) >= s.radius) continue;
   if(s.id === 'frost' && Math.cos(Math.atan2(e.y-p.y,e.x-p.x)-p.angle) < -.2) continue;
   this.hitEnemy(e, power, { poise:26 });
   if(s.slow) e.slowT = Math.max(e.slowT, s.slow);
  }
  return true;
 }
 spell(){ return this.cast(); }      // legacy action name

 useSuper(){
  const p = this.player;
  if(p.focus < 100 || p.superT > 0) return false;
  const def = this.superDef();
  p.focus = 0; p.superT = def.duration; p.superTick = 0; p.invincible = Math.max(p.invincible, def.duration*.6);
  this.event('super',{ name:def.name, kind:this.weapon().kind });
  return true;
 }
 superTickDamage(dt){
  const p = this.player, def = this.superDef(), kind = this.weapon().kind;
  p.superTick = (p.superTick||0) + dt;
  if(p.superTick < .18) return;
  p.superTick = 0;
  const power = Math.round(this.attackPower() * def.power * .28);
  const radius = kind==='maul'||kind==='great' ? 200 : kind==='spear' ? 240 : 170;
  for(const e of this.here()){
   if(e.hp <= 0 || distance(e,p) > radius) continue;
   if(kind==='spear' && Math.cos(Math.atan2(e.y-p.y,e.x-p.x)-p.angle) < .5) continue;
   this.hitEnemy(e, power, { poise:30, knock:8 });
  }
  this.shock(p.x, p.y, radius, this.weapon().trail);
  this.particlesAt(p.x, p.y-14, this.weapon().trail, 14, 1.8);
 }

 heal(){
  const p = this.player;
  if(p.hp >= p.maxHp){ this.toast('Your health is already full.'); return false; }
  if(this.bag.potion < 1 && this.bag.elixir < 1){ this.toast('No tonics left. Craft one in your pack (I).'); return false; }
  if(this.bag.potion > 0){ this.bag.potion--; p.hp = Math.min(p.maxHp, p.hp+65); this.toast('Healing tonic · +65 health'); }
  else { this.bag.elixir--; p.hp = Math.min(p.maxHp, p.hp+150); p.burnT = 0; this.toast('Greater elixir · +150 health'); }
  this.particlesAt(p.x, p.y, '#94d4b8', 20); this.event('heal'); return true;
 }

 // ================================================================ update
 update(dt, input = {}){
  this.time += dt;
  this.clock = (this.clock + dt/DAY_LENGTH) % 1;
  if(this.slowmo > 0) this.slowmo = Math.max(0, this.slowmo - dt);
  const p = this.player;
  for(const k of ['attack','dash','dashCd','spell','invincible','comboTimer','attackBuffer','superT','perfect','burnT']) p[k] = Math.max(0, p[k]-dt);
  p.stamina = Math.min(100, p.stamina + dt*(19 + (this.flags.beacons?6:0) + (this.outfit().stamina||0)));
  if(p.burnT > 0){
   p.burnTick = (p.burnTick ?? 0) + dt;
   if(p.burnTick >= .6){ p.burnTick = 0; const n = Math.max(1, Math.round(4*(1-(this.outfit().fire||0))));
    p.hp = Math.max(0, p.hp - n); this.float('-'+n, p.x, p.y-30, '#ff9a55'); if(p.hp <= 0) this.die(); }
  } else p.burnTick = 0;

  // movement
  let dx = input.x||0, dy = input.y||0;
  const mag = Math.hypot(dx,dy);
  if(mag){ dx/=mag; dy/=mag; if(!input.aim) p.angle = Math.atan2(dy,dx); if(p.attack<=0) p.dir = Math.abs(dx)>Math.abs(dy) ? (dx<0?2:3) : (dy<0?1:0); }
  let speed = p.dash > 0 ? 520 : this.moveSpeed();
  if(p.attack > 0 && p.dash <= 0) speed *= .42;                      // committed while swinging
  if(p.superT > 0) speed *= 1.35;
  if(p.dash > 0 && !mag){ dx = Math.cos(p.angle); dy = Math.sin(p.angle); }
  this.move(p, dx*speed*dt, dy*speed*dt);
  p.moving = mag > 0;
  // A swing pulls the body forward so the blade has weight behind it, but it
  // must never carry you past the thing you are hitting.
  if(p.attack > 0 && !p.attackHit){
   const swing = this.currentSwing(), push = (swing.lunge||0)*dt*3.2;
   const crowded = this.here().some(e => e.hp > 0 && distance(e,p) < 46);
   if(!crowded) this.move(p, Math.cos(p.attackAngle)*push, Math.sin(p.attackAngle)*push);
  }
  // Hazard floors burn on their own clock, and never grant dodge frames.
  const t = this.tile(p.x,p.y);
  if(HAZARD[t]){
   p.hazardT = (p.hazardT ?? 0) + dt;
   if(p.hazardT >= .8){
    p.hazardT = 0;
    const burn = Math.max(1, Math.round(HAZARD[t] * (1 - (this.outfit().fire||0))));
    p.hp = Math.max(0, p.hp - burn);
    this.float('-'+burn, p.x, p.y-36, '#ff9a55');
    this.event('scorched');
    if(p.hp <= 0) this.die();
   }
  } else p.hazardT = 0;

  if(!p.attackHit && p.attackDuration - p.attack >= this.currentSwing().impact/(this.weapon().speed??1)){ p.attackHit = true; this.strike(); }
  if(p.attack <= 0 && (input.attack || p.attackBuffer > 0)) this.attack(false);
  if(p.superT > 0) this.superTickDamage(dt);

  for(const o of this.props()){
   o.hit = Math.max(0, (o.hit||0) - dt);
   if(o.growing > 0){ o.growing = Math.max(0, o.growing - dt); if(o.growing === 0) o.ripe = true; }
   if(o.respawnAt && this.removed.has(o.id) && this.time >= o.respawnAt){ this.removed.delete(o.id); o.hp = GATHER[o.type]?.hp ?? 3; o.respawnAt = 0; this.dirty = true; }
  }

  for(const e of this.here()) this.updateEnemy(e, dt, p);

  for(const b of this.projectiles){
   if(b.fuse !== undefined){ b.life -= dt; if(b.life <= 0){ this.shock(b.x,b.y,b.radius,b.color); this.particlesAt(b.x,b.y,b.color,30,1.6);
     for(const e of this.here()) if(e.hp>0 && distance(e,b) < b.radius) this.hitEnemy(e, b.dmg, { poise:60, knock:20 });
     this.event('meteor',{ x:b.x, y:b.y }); } continue; }
   b.life -= dt; b.x += b.vx*dt; b.y += b.vy*dt;
   if(b.friendly){ for(const e of this.here()) if(e.hp>0 && distance(b,e) < 22){ this.hitEnemy(e, b.dmg, { poise:14 }); b.life = 0; break; } }
   else if(distance(b,p) < 16){ this.hurt(b.dmg ?? 14, b.element); if(b.slow) p.slow = b.slow; if(b.burn) p.burnT = 3; b.life = 0; }
   if(this.blocked(this.tile(b.x,b.y))) b.life = 0;
  }
  this.projectiles = this.projectiles.filter(b => b.life > 0);
  for(const s of this.shocks){ s.life -= dt; s.r += (s.max - s.r) * Math.min(1, dt*9); }
  this.shocks = this.shocks.filter(s => s.life > 0);
  for(const x of this.texts){ x.life -= dt; x.y -= dt*19; }
  this.texts = this.texts.filter(x => x.life > 0);
  for(const a of this.particles){ a.life -= dt; a.x += a.vx*dt; a.y += a.vy*dt; a.vy += dt*40; }
  this.particles = this.particles.filter(a => a.life > 0);
  if(this.dirty){ this.dirty = false; this.event('world-changed'); }
 }

 // --------------------------------------------------------------- enemy AI
 updateEnemy(e, dt, p){
  const d = ENEMIES[e.type];
  if(e.hp <= 0){
   if(e.deadUntil !== Infinity && this.time >= e.deadUntil && !e.once){
    e.hp = e.maxHp; e.poise = e.maxPoise; e.x = e.homeX; e.y = e.homeY; e.stagger = 0; e.burn = 0; e.phaseN = 0;
   }
   return;
  }
  e.cd = Math.max(0, e.cd - dt); e.hit = Math.max(0, e.hit - dt); e.phase += dt;
  e.stagger = Math.max(0, e.stagger - dt); e.slowT = Math.max(0, e.slowT - dt);
  if(e.burn > 0){ e.burn -= dt; if(Math.floor(this.time*3) !== Math.floor((this.time-dt)*3)){ e.hp -= 5; this.float('5', e.x+6, e.y-32, '#ff9d5e', 9); if(e.hp <= 0){ this.killEnemy(e); return; } } }
  if(e.poise < e.maxPoise) e.poise = Math.min(e.maxPoise, e.poise + dt*7);
  if(e.stagger > 0) return;

  const dist = distance(e,p), toP = Math.atan2(p.y-e.y, p.x-e.x);
  e.face = toP;
  const slow = e.slowT > 0 ? .45 : 1;
  const step = (a, mult=1) => this.move(e, Math.cos(a)*dt*d.speed*mult*slow, Math.sin(a)*dt*d.speed*mult*slow, 9);
  const melee = (reach, dmg = d.dmg, cool = 1.2) => { if(dist < reach && e.cd === 0){ this.hurt(dmg); e.cd = cool; e.swing = .25; this.event('enemy-swing',{ x:e.x, y:e.y }); } };
  const goHome = () => { if(distance(e,{x:e.homeX,y:e.homeY}) > 10){ step(Math.atan2(e.homeY-e.y, e.homeX-e.x), .7); } };
  e.swing = Math.max(0, (e.swing||0) - dt);

  switch(d.ai){
   case 'chase':
    if(dist < 260 && dist > 26) step(toP); else if(dist >= 360) goHome();
    melee(34); break;

   case 'flier':
    if(dist < 300 && dist > 22) step(toP + Math.sin(e.phase*3)*.5); else if(dist >= 380) goHome();
    melee(32, d.dmg, 1); break;

   case 'lunger':
    if(e.dash > 0){ e.dash -= dt; step(e.aim, 3.1); melee(38, d.dmg+4, .8); break; }
    if(e.windup > 0){ e.windup -= dt; if(e.windup <= 0){ e.dash = .32; e.aim = toP; this.event('lunge',{ x:e.x, y:e.y }); } break; }
    if(dist < 230 && e.cd === 0 && dist > 60){ e.windup = .45; e.cd = 2.4; this.event('telegraph',{ x:e.x, y:e.y, kind:'lunge' }); break; }
    if(dist < 260 && dist > 30) step(toP, .8); else if(dist >= 360) goHome();
    melee(34); break;

   case 'caster': {
    const gate = e.type === 'wisp' ? this.flags.hearth : true;
    if(dist < 330 && gate){
     if(e.cast > 0){ e.cast -= dt; if(e.cast <= 0){ this.fire(e, d.shot ?? { speed:175, dmg:14 }); e.cd = 2.1; } }
     else if(e.cd <= 0){ e.cast = .65; e.aim = toP; this.event('telegraph',{ x:e.x, y:e.y, kind:'cast' }); }
     else if(dist > 155) step(toP, .6);
     else if(dist < 95) step(toP + Math.PI, .5);
    } else { e.cast = 0; if(dist >= 400) goHome(); }
    break; }

   case 'kiter':
    if(dist < 120) step(toP + Math.PI, 1.1);
    else if(dist > 260) step(toP, .9);
    if(e.cast > 0){ e.cast -= dt; if(e.cast <= 0){ this.fire(e, d.shot); e.cd = 1.8; } }
    else if(e.cd <= 0 && dist < 320){ e.cast = .5; e.aim = toP; this.event('telegraph',{ x:e.x, y:e.y, kind:'aim' }); }
    break;

   case 'shielded':
    if(e.windup > 0){ e.windup -= dt; if(e.windup <= 0){ if(dist < 72) this.hurt(d.dmg+8); this.shock(e.x,e.y,86,'#c9a2a2'); this.event('enemy-slam',{ x:e.x, y:e.y }); } break; }
    if(dist < 240 && dist > 30) step(toP, .9); else if(dist >= 340) goHome();
    if(dist < 90 && e.cd === 0){ e.windup = .7; e.cd = 3.2; this.event('telegraph',{ x:e.x, y:e.y, kind:'slam' }); }
    melee(36, d.dmg, 1.5); break;

   case 'blinker':
    if(e.cd === 0 && dist > 120 && dist < 420){
     const a = this.roll()*Math.PI*2, nx = p.x + Math.cos(a)*70, ny = p.y + Math.sin(a)*70;
     if(this.walkable(nx,ny)){ this.particlesAt(e.x,e.y-14,'#9d7bc4',16); e.x = nx; e.y = ny; this.particlesAt(e.x,e.y-14,'#9d7bc4',16); e.cd = 2.6; this.event('blink',{ x:e.x, y:e.y }); }
     else e.cd = .4;
    } else if(dist < 240 && dist > 28) step(toP, 1);
    melee(36, d.dmg, 1.1); break;

   case 'slammer':
    if(e.windup > 0){ e.windup -= dt; if(e.windup <= 0){ if(dist < 132) this.hurt(d.dmg+6); this.shockwave(e.x, e.y, 132, 0); this.event('enemy-slam',{ x:e.x, y:e.y }); } break; }
    if(dist < 300 && dist > 34) step(toP); else if(dist >= 400) goHome();
    if(dist < 190 && e.cd === 0){ e.windup = 1.1; e.cd = 4.5; this.event('telegraph',{ x:e.x, y:e.y, kind:'slam', radius:132 }); }
    melee(42, d.dmg, 1.6); break;

   default: this.boss(e, d, dt, p, dist, toP, step, melee);
  }
 }

 fire(e, shot){
  const a = e.aim ?? 0;
  this.projectiles.push({ x:e.x, y:e.y-14, vx:Math.cos(a)*shot.speed, vy:Math.sin(a)*shot.speed, life:2.6,
   dmg:shot.dmg, slow:shot.slow, burn:shot.burn, color:shot.color ?? '#ffb77a', element:shot.element });
  this.event('enemy-shot',{ x:e.x, y:e.y });
 }

 // ------------------------------------------------------------------ bosses
 boss(e, d, dt, p, dist, toP, step, melee){
  const hpFrac = e.hp/e.maxHp;
  const phase = hpFrac > .66 ? 0 : hpFrac > .33 ? 1 : 2;
  if(phase !== e.phaseN){ e.phaseN = phase; e.cd = .8; this.event('boss-phase',{ phase, name:d.name }); this.shock(e.x, e.y, 200, '#ffd8a0'); }

  if(d.ai === 'boss-root'){
   if(dist < 320 && dist > 29 && e.windup <= 0) step(toP);
   else if(dist >= 380) step(Math.atan2(e.homeY-e.y, e.homeX-e.x), .7);
   melee(55, d.dmg, 1.2);
   if(dist < 360){
    e.slamCd = (e.slamCd ?? 4) - dt;
    if(e.slamCd <= 0 && e.windup <= 0){ e.windup = 1.15; e.slamCd = phase===2?3.2:5; this.event('telegraph',{ x:e.x, y:e.y, kind:'slam', radius:120 }); }
    if(e.windup > 0){ e.windup -= dt; if(e.windup <= 0){ if(distance(e,p) < 120) this.hurt(28); this.particlesAt(e.x,e.y,'#d1a877',30); this.shockwave(e.x,e.y,120,0); this.event('slam',{ x:e.x, y:e.y }); } }
   }
   return;
  }

  if(d.ai === 'boss-bramble'){
   // Roots the arena, summons sporelings, and charges when wounded.
   if(e.windup > 0){ e.windup -= dt; if(e.windup <= 0){
     if(e.move === 'slam'){ if(distance(e,p) < 150) this.hurt(d.dmg+8); this.shockwave(e.x,e.y,150,0); this.event('slam',{ x:e.x, y:e.y }); }
     if(e.move === 'vines'){ for(let i=0;i<6+phase*3;i++){ const a = i/(6+phase*3)*Math.PI*2 + e.phase; this.projectiles.push({ x:e.x, y:e.y-20, vx:Math.cos(a)*130, vy:Math.sin(a)*130, life:2.6, dmg:16, color:'#9fd7a2' }); } this.event('enemy-shot',{ x:e.x, y:e.y }); }
     if(e.move === 'charge'){ e.dash = .55; e.aim = toP; }
    } return; }
   if(e.dash > 0){ e.dash -= dt; step(e.aim, 3.4); melee(64, d.dmg+10, .6); return; }
   if(e.cd <= 0){
    const roll = this.roll();
    e.move = roll < .38 ? 'slam' : roll < .72 ? 'vines' : 'charge';
    e.windup = e.move === 'charge' ? .7 : .95;
    e.cd = phase === 2 ? 2.1 : phase === 1 ? 2.8 : 3.5;
    this.event('telegraph',{ x:e.x, y:e.y, kind:e.move, radius:e.move==='slam'?150:0 });
    if(phase >= 1 && roll > .82) this.summon(e, 'sporeling', 2);
    return;
   }
   if(dist > 90) step(toP, .8);
   melee(70, d.dmg, 1.4);
   return;
  }

  if(d.ai === 'boss-devour'){
   // Burrows, erupts under the player, and shakes the cavern.
   if(e.burrow > 0){
    e.burrow -= dt; e.hidden = true;
    step(toP, 1.8);
    if(e.burrow <= 0){ e.hidden = false; if(distance(e,p) < 110) this.hurt(d.dmg+10); this.shockwave(e.x,e.y,120,0); this.particlesAt(e.x,e.y,'#8e7a63',40,1.6); this.event('erupt',{ x:e.x, y:e.y }); }
    return;
   }
   if(e.windup > 0){ e.windup -= dt; if(e.windup <= 0){
     if(e.move === 'spikes'){ for(let i=0;i<8;i++){ const a = i/8*Math.PI*2; this.projectiles.push({ x:e.x, y:e.y-10, vx:Math.cos(a)*165, vy:Math.sin(a)*165, life:2.2, dmg:18, color:'#cbb79a' }); } }
     if(e.move === 'quake'){ this.shockwave(e.x, e.y, 210, 0); if(distance(e,p) < 210) this.hurt(d.dmg); this.event('slam',{ x:e.x, y:e.y }); }
     if(e.move === 'burrow'){ e.burrow = 1.4 - phase*.25; this.particlesAt(e.x,e.y,'#8e7a63',30); }
    } return; }
   if(e.cd <= 0){
    const roll = this.roll();
    e.move = roll < .34 ? 'spikes' : roll < .66 ? 'quake' : 'burrow';
    e.windup = .8; e.cd = phase===2?1.9:2.9;
    this.event('telegraph',{ x:e.x, y:e.y, kind:e.move, radius:e.move==='quake'?210:0 });
    if(phase >= 1 && roll > .9) this.summon(e, 'crawler', 2);
    return;
   }
   if(dist > 70) step(toP);
   melee(58, d.dmg, 1.1);
   return;
  }

  if(d.ai === 'boss-choir'){
   // Sings shades into being and throws aimed dark bolts.
   if(e.windup > 0){ e.windup -= dt; if(e.windup <= 0){
     if(e.move === 'volley'){ for(let i=-2;i<=2;i++){ const a = toP + i*.22; this.projectiles.push({ x:e.x, y:e.y-24, vx:Math.cos(a)*230, vy:Math.sin(a)*230, life:2.4, dmg:17, color:'#c6a6e2' }); } }
     if(e.move === 'choir'){ this.summon(e, 'shade', 2 + phase); this.shock(e.x,e.y,170,'#b294d6'); }
     if(e.move === 'wave'){ this.shockwave(e.x,e.y,180,0); if(distance(e,p) < 180) this.hurt(d.dmg); }
    } return; }
   if(dist < 130) step(toP + Math.PI, .9); else if(dist > 300) step(toP, .9);
   if(e.cd <= 0){
    const roll = this.roll();
    e.move = roll < .46 ? 'volley' : roll < .78 ? 'wave' : 'choir';
    e.windup = .65; e.cd = phase===2?1.5:2.4;
    this.event('telegraph',{ x:e.x, y:e.y, kind:e.move, radius:e.move==='wave'?180:0 });
   }
   melee(46, d.dmg, 1.6);
   return;
  }

  // boss-tyrant: three escalating phases of fire.
  if(e.windup > 0){ e.windup -= dt; if(e.windup <= 0){
    if(e.move === 'ring'){ for(let i=0;i<12+phase*4;i++){ const a = i/(12+phase*4)*Math.PI*2 + e.phase*.4; this.projectiles.push({ x:e.x, y:e.y-30, vx:Math.cos(a)*175, vy:Math.sin(a)*175, life:3, dmg:20, color:'#ffa257', element:'fire', burn:true }); } }
    if(e.move === 'meteor'){ for(let i=0;i<3+phase;i++){ const a = this.roll()*Math.PI*2, r = 60+this.roll()*140;
      this.projectiles.push({ kind:'meteor', x:p.x+Math.cos(a)*r, y:p.y+Math.sin(a)*r, vx:0, vy:0, life:1.2, fuse:1.2, radius:96, dmg:26, color:'#ff9a55', hostile:true }); } this.event('telegraph',{ x:p.x, y:p.y, kind:'meteor' }); }
    if(e.move === 'charge'){ e.dash = .7; e.aim = toP; }
    if(e.move === 'pillars'){ this.shockwave(e.x,e.y,230,0); if(distance(e,p) < 230) this.hurt(d.dmg,'fire'); this.event('slam',{ x:e.x, y:e.y }); }
   } return; }
  if(e.dash > 0){ e.dash -= dt; step(e.aim, 3.2); melee(74, d.dmg+10, .6); return; }
  if(e.cd <= 0){
   const roll = this.roll();
   e.move = roll < .3 ? 'ring' : roll < .58 ? 'meteor' : roll < .82 ? 'pillars' : 'charge';
   e.windup = e.move === 'charge' ? .8 : 1;
   e.cd = phase === 2 ? 1.7 : phase === 1 ? 2.4 : 3.2;
   this.event('telegraph',{ x:e.x, y:e.y, kind:e.move, radius:e.move==='pillars'?230:0 });
   if(phase >= 1 && roll > .93) this.summon(e, 'imp', 2);
   return;
  }
  if(dist > 110) step(toP, .9);
  melee(76, d.dmg, 1.3);
 }

 // Hostile meteors reuse the projectile fuse path but hit the player instead.
 summon(e, type, n){
  for(let i=0;i<n;i++){
   const a = this.roll()*Math.PI*2, r = 70 + this.roll()*60;
   const x = e.x + Math.cos(a)*r, y = e.y + Math.sin(a)*r;
   if(!this.walkable(x,y)) continue;
   const mob = this.makeMob(type, x/TILE, y/TILE, e.zone, { id:`sum-${e.id}-${this.enemies.length}`, summoned:true, once:true });
   this.enemies.push(mob); (this.zoneEnemies[e.zone] ??= []).push(mob);
   this.particlesAt(x, y-12, '#c6a6e2', 14);
  }
  this.event('summon',{ x:e.x, y:e.y });
 }

 // ============================================================ world moves
 setZone(zone, tx, ty, silent=false){
  if(!ZONES[zone]) return false;
  const p = this.player;
  this.zone = zone; p.zone = zone;
  p.x = tx*TILE; p.y = ty*TILE;
  p.attack = 0; p.attackHit = true; p.dash = 0; p.combo = 0; p.comboTimer = 0;
  this.projectiles.length = 0; this.particles.length = 0; this.texts.length = 0; this.shocks.length = 0;
  if(!this.walkable(p.x,p.y)){
   // Nudge to the nearest open tile so a moved portal can never trap a save.
   outer: for(let r=1;r<14;r++) for(let j=-r;j<=r;j++) for(let i=-r;i<=r;i++){
    const nx = (tx+i)*TILE, ny = (ty+j)*TILE;
    if(this.walkable(nx,ny)){ p.x = nx; p.y = ny; break outer; }
   }
  }
  const first = !this.visited[zone];
  this.visited[zone] = true;
  this.questReach(zone);
  if(!silent) this.event('zone',{ zone, first, name:ZONES[zone].name, sub:ZONES[zone].sub });
  return true;
 }

 nearest(){
  const p = this.player;
  return this.props().filter(o => {
   if(this.removed.has(o.id)) return false;
   if(o.type === 'lamp' && o.lit !== false) return false;
   if(['tree','ore','iron','coal','crystal','cinder'].includes(o.type)) return false;
   if(o.type === 'prop' && !INTERACTIVE_PROPS.has(o.art)) return false;
   const reach = (o.type === 'cottage' || o.type === 'ruin') ? 95 : o.type === 'portal' ? 58 : 68;
   return distance(o,p) < reach;
  }).sort((a,b) => distance(a,p) - distance(b,p))[0];
 }

 promptFor(o){
  if(!o) return '';
  switch(o.type){
   case 'portal':
    if(o.needs && !(this.bag[o.needs] > 0)) return o.label + ' · sealed';
    return o.door ? o.label : 'Travel · ' + o.label;
   case 'npc': return 'Speak to ' + (NPCS[o.npc]?.name ?? 'someone');
   case 'chest': return 'Open supply cache';
   case 'lamp': return 'Relight the lamp';
   case 'beacon': return this.flags['beacon'+o.index] ? 'Rest at beacon' : 'Light beacon · 2 ember dust';
   case 'hearth': return this.flags.hearth ? 'Rest at the hearth' : 'Examine the hearth';
   case 'ruin': return this.flags.cottage ? 'Visit the workshop' : 'Restore the workshop';
   case 'cottage': return 'Rest at the Lantern Inn';
   case 'arch': return 'Enter the Rootvault';
   case 'herb': case 'shroom': case 'web': case 'bones': return 'Gather ' + (o.type==='web'?'spider silk':o.type==='bones'?'beast fang':o.type==='shroom'?'cave mushrooms':'moonleaf');
   case 'plot': return o.ripe ? 'Harvest moonleaf' : o.growing ? 'Check moonleaf' : 'Plant moonleaf';
   case 'prop': return PROP_PROMPT[o.art] ?? (o.label || 'Examine');
   default: return 'Examine';
  }
 }

 interact(){
  const o = this.nearest();
  if(!o) return false;
  switch(o.type){
   case 'portal':
    // A gated road tells you what is missing rather than simply refusing.
    if(o.needs && !(this.bag[o.needs] > 0)){ this.toast(o.locked ?? 'This way is closed to you.'); this.event('locked'); return true; }
    this.setZone(o.to, o.at[0], o.at[1]);
    return true;
   case 'npc': this.flags.met = this.flags.met || o.npc === 'wren'; this.event('dialogue',{ npc:o.npc }); return true;
   case 'beacon': this.lightBeacon(o); return true;
   case 'chest': {
    this.removed.add(o.id);
    const loot = o.loot ?? { potion:1, wood:3, stone:2 };
    for(const [item,n] of Object.entries(loot)) this.gain(item, n, o.x, o.y);
    this.toast('Supply cache opened.'); this.event('chest'); return true; }
   case 'lamp': o.lit = true; this.questInteract('lamp'); this.toast('The lamp catches.'); this.event('lamp'); return true;
   case 'ruin': this.event('repair'); return true;
   case 'cottage': this.player.hp = this.player.maxHp; this.toast('You rest at the Lantern Inn. Health restored.'); this.event('heal'); return true;
   case 'hearth': this.event('hearth'); return true;
   case 'arch': this.toast('The Rootvault · Follow the stone passage east.'); return true;
   case 'herb': case 'shroom': case 'web': case 'bones': {
    const g = GATHER[o.type] ?? GATHER.herb;
    this.removed.add(o.id); o.respawnAt = this.time + g.regrow;
    for(const [item,n] of Object.entries(g.give)) if(n>0) this.gain(item, n, o.x, o.y);
    return true; }
   case 'plot':
    if(o.ripe){ this.gain('herb',2,o.x,o.y); o.ripe = false; o.growing = 0; this.toast('Moonleaf harvested. The soil is ready again.'); }
    else if(!o.growing){ o.growing = 30; this.toast('Moonleaf planted. It will grow in 30 seconds.'); }
    else this.toast('Growing · ' + Math.ceil(o.growing) + ' seconds until harvest.');
    return true;
   case 'prop': return this.useProp(o);
  }
  return true;
 }

 useProp(o){
  switch(o.art){
   case 'anvil': case 'forgefire':
    if(!this.flags.forgeOpen){ this.toast('Dain has not opened the anvil to you yet.'); return true; }
    this.event('station',{ station:'forge' }); return true;
   case 'loom':
    if(!this.flags.loomOpen){ this.toast('Lys wants six spider silk before she opens the loom.'); return true; }
    this.event('station',{ station:'loom' }); return true;
   case 'cauldron': this.event('station',{ station:'alchemy' }); return true;
   case 'board': this.event('board'); return true;
   case 'campfire': this.player.hp = this.player.maxHp; this.player.stamina = 100; this.toast('You rest by the fire. Health and stamina restored.'); this.event('heal'); return true;
   case 'fountain': this.player.hp = this.player.maxHp; this.toast('The fountain is cold and clean. Health restored.'); this.event('heal'); return true;
   case 'shrine': this.player.shield = Math.max(this.player.shield, 50); this.toast('A warding light settles over you.'); this.event('heal'); return true;
   case 'cat':
    if(this.questInteract('cat')){ this.toast('Ash the cat allows herself to be carried.'); this.event('cat'); }
    else this.toast('A small grey cat. She is not lost; she is exploring.');
    return true;
   case 'statue': case 'sign': this.toast(o.text ?? o.label ?? 'Weathered stone, older than the road.'); return true;
   default: this.toast(o.label ?? 'Nothing more to find here.'); return true;
  }
 }

 // ------------------------------------------------- legacy chapter actions
 repair(){
  if(this.flags.cottage) return false;
  if(this.bag.wood < 12 || this.bag.stone < 8){ this.toast('You need 12 timber and 8 stone.'); return false; }
  this.bag.wood -= 12; this.bag.stone -= 8; this.flags.cottage = true; this.exp(35); this.bag.potion += 2;
  this.toast('The workshop is restored. Wren left you two tonics.'); this.event('craft'); return true;
 }
 rekindle(){
  if(this.flags.hearth) return false;
  if(!this.flags.cottage){ this.toast('Restore the workshop first. Its tools will mend the hearth.'); return false; }
  if(!this.bag.core){ this.toast('The Heart Spark waits beneath the Rootvault.'); return false; }
  this.bag.core--; this.flags.hearth = true; this.player.hp = this.player.maxHp; this.exp(100); this.event('victory'); return true;
 }
 lightBeacon(o){
  if(!o || o.type !== 'beacon' || distance(o,this.player) > 68) return false;
  if(!this.flags.hearth){ this.toast('Restore the village hearth before carrying its light into the Moonfen.'); return false; }
  if(this.flags['beacon'+o.index]){ this.player.hp = this.player.maxHp; this.toast('The beacon restores your health.'); return false; }
  if(this.enemies.some(e => e.hp>0 && e.type==='wisp' && distance(e,o) < 180)){ this.toast('Clear the cinder wisps around this beacon first.'); return false; }
  if(this.bag.essence < 2){ this.toast('A beacon needs 2 ember dust. Cinder wisps carry it.'); return false; }
  this.bag.essence -= 2; this.flags['beacon'+o.index] = true; this.player.hp = this.player.maxHp; this.exp(40); this.event('beacon-lit');
  if([0,1,2].every(i => this.flags['beacon'+i])){ this.flags.beacons = true; this.bag.potion += 3; this.exp(100); this.event('moonfen-complete'); }
  else this.toast('A beacon burns again. Health restored.');
  return true;
 }

 // ================================================================= quests
 questState(id){ return this.quests[id] ?? null; }
 questDone(id){ return this.quests[id]?.state === 'done'; }
 questActive(id){ return this.quests[id]?.state === 'active'; }
 questOpen(q){
  if(this.quests[q.id]) return false;
  return (q.requires ?? []).every(r => this.questDone(r));
 }
 startQuest(id){
  const q = QUEST_BY_ID[id];
  if(!q || this.quests[id] || !this.questOpen(q)) return false;
  this.quests[id] = { state:'active', counts:{} };
  this.event('quest-start',{ id, title:q.title });
  this.syncAutoQuests();
  return true;
 }
 stepDone(q, i){
  const s = q.steps[i], st = this.quests[q.id];
  if(!st) return false;
  switch(s.kind){
   case 'flag':   return this.flags[s.flag] === true;
   case 'kill':   return (st.counts[s.enemy]||0) >= s.count;
   case 'collect':return (this.bag[s.item]||0) >= s.count;
   case 'talk':   return st.counts['talk:'+s.npc] > 0;
   case 'reach':  return this.visited[s.zone] === true;
   case 'interact': return (st.counts['use:'+s.target]||0) >= (s.count||1);
   case 'craft':  return s.weapon in this.weapons;
   default: return false;
  }
 }
 questStepIndex(q){ for(let i=0;i<q.steps.length;i++) if(!this.stepDone(q,i)) return i; return q.steps.length; }
 questReady(id){ const q = QUEST_BY_ID[id]; return this.questActive(id) && q.steps.every((_,i)=>this.stepDone(q,i)); }
 questProgress(q){ return q.steps.map((s,i) => ({ text:this.stepText(q,s), done:this.stepDone(q,i) })); }
 stepText(q,s){
  const st = this.quests[q.id];
  if(s.kind === 'kill')    return `${s.text} (${Math.min(st?.counts[s.enemy]||0, s.count)}/${s.count})`;
  if(s.kind === 'collect') return `${s.text} (${Math.min(this.bag[s.item]||0, s.count)}/${s.count})`;
  if(s.kind === 'interact')return `${s.text} (${Math.min(st?.counts['use:'+s.target]||0, s.count||1)}/${s.count||1})`;
  return s.text;
 }
 questKill(type){
  for(const [id,st] of Object.entries(this.quests)){
   if(st.state !== 'active') continue;
   const q = QUEST_BY_ID[id]; if(!q) continue;
   const i = this.questStepIndex(q); const s = q.steps[i];
   if(s && s.kind === 'kill' && s.enemy === type){
    st.counts[type] = (st.counts[type]||0) + 1;
    if(st.counts[type] >= s.count) this.event('quest-step',{ id, text:s.text });
   }
  }
  this.syncAutoQuests();
 }
 questCollect(){ this.syncAutoQuests(); }
 questReach(zone){
  for(const [id,st] of Object.entries(this.quests)){
   if(st.state !== 'active') continue;
   const q = QUEST_BY_ID[id]; if(!q) continue;
   const s = q.steps[this.questStepIndex(q)];
   if(s && s.kind === 'reach' && s.zone === zone) this.event('quest-step',{ id, text:s.text });
  }
  this.syncAutoQuests();
 }
 questInteract(target){
  let matched = false;
  for(const [id,st] of Object.entries(this.quests)){
   if(st.state !== 'active') continue;
   const q = QUEST_BY_ID[id]; if(!q) continue;
   const s = q.steps[this.questStepIndex(q)];
   if(s && s.kind === 'interact' && s.target === target){
    st.counts['use:'+target] = (st.counts['use:'+target]||0) + 1; matched = true;
    this.event('quest-step',{ id, text:s.text });
   }
  }
  this.syncAutoQuests();
  return matched;
 }
 questTalk(npc){
  for(const [id,st] of Object.entries(this.quests)){
   if(st.state !== 'active') continue;
   const q = QUEST_BY_ID[id]; if(!q) continue;
   const s = q.steps[this.questStepIndex(q)];
   if(s && s.kind === 'talk' && s.npc === npc) st.counts['talk:'+npc] = 1;
  }
  this.syncAutoQuests();
 }
 // Chapter I and II track the original flags, so they open and close themselves.
 syncAutoQuests(){
  for(const q of QUESTS){
   if(!q.auto) continue;
   if(!this.quests[q.id] && this.questOpen(q)) this.quests[q.id] = { state:'active', counts:{} };
   if(this.questActive(q.id) && q.steps.every((_,i)=>this.stepDone(q,i))) this.completeQuest(q.id, true);
  }
 }
 completeQuest(id, silent=false){
  const q = QUEST_BY_ID[id], st = this.quests[id];
  if(!q || !st || st.state !== 'active') return false;
  if(!q.steps.every((_,i)=>this.stepDone(q,i))) return false;
  for(const s of q.steps) if(s.kind === 'collect') this.bag[s.item] -= s.count;   // hand the goods over
  st.state = 'done';
  const r = q.reward ?? {};
  if(r.xp) this.exp(r.xp);
  if(r.coin) this.gain('coin', r.coin);
  for(const [item,n] of Object.entries(r.items ?? {})) this.gain(item, n);
  if(r.weapon) this.unlockWeapon(r.weapon);
  if(r.outfit) this.unlockOutfit(r.outfit);
  if(r.spell) this.unlockSpell(r.spell);
  if(r.recipe) this.recipes[r.recipe] = true;
  if(r.flag) this.flags[r.flag] = true;
  if(!silent) this.event('quest-done',{ id, title:q.title, reward:r });
  this.syncAutoQuests();
  return true;
 }

 // What this person has to say right now. Chapter I and II close themselves,
 // so they are never offered or handed in across a counter; the NPC narrates
 // them in their own words instead.
 npcTopics(npcId){
  const mine = QUESTS.filter(q => q.giver === npcId && !q.auto);
  return {
   npc: NPCS[npcId],
   ready: mine.filter(q => this.questReady(q.id)),
   offers: mine.filter(q => this.questOpen(q)),
   active: mine.filter(q => this.questActive(q.id) && !this.questReady(q.id)),
   chapter: QUESTS.find(q => q.giver === npcId && q.auto && this.questActive(q.id)) ?? null
  };
 }
 talkTo(npcId){ this.questTalk(npcId); return this.npcTopics(npcId); }

 // ================================================================= making
 stationHas(station){ return Object.entries(RECIPES).filter(([id,r]) => r.at === station && this.recipeKnown(id)); }
 recipeKnown(id){
  const r = RECIPES[id];
  if(!r) return false;
  if(r.at === 'pack') return true;
  if(r.weapon || r.outfit) return this.recipes[id] === true || (r.at === 'forge' && ['fenrazor','wardenpike','moonsaber','emberbrand','stormglaive','stoneheart','reforged'].includes(id));
  return this.recipes[id] === true || r.at === 'alchemy';
 }
 recipeCost(id){
  const r = RECIPES[id], cut = this.flags.forgeDiscount ? .9 : 1, apron = 1 - (this.outfit().forge||0);
  const scale = r.at === 'forge' ? cut*apron : 1;
  return Object.fromEntries(Object.entries(r.cost).map(([k,v]) => [k, Math.max(1, Math.round(v*scale))]));
 }
 craft(id, station='pack'){
  const r = RECIPES[id];
  if(!r) return false;
  if(r.at !== station && !(station === 'any')){ this.toast('You need the right workbench for that.'); return false; }
  if(!this.recipeKnown(id)){ this.toast('You do not know that pattern yet.'); return false; }
  if(r.weapon && r.weapon in this.weapons){ this.toast('You already own that weapon.'); return false; }
  if(r.outfit && this.outfits[r.outfit]){ this.toast('You already own that outfit.'); return false; }
  const cost = this.recipeCost(id);
  if(!this.has(cost)){ this.toast('You need more materials.'); return false; }
  this.spend(cost);
  if(r.give) for(const [k,v] of Object.entries(r.give)) this.bag[k] += v;
  if(r.weapon){ this.unlockWeapon(r.weapon); if(r.weapon === 'tempered') this.flags.upgrade = true; }
  if(r.outfit) this.unlockOutfit(r.outfit);
  if(id === 'blade') this.flags.upgrade = true;
  this.toast(id === 'tonic' ? 'Crafted a healing tonic.' : id === 'blade' ? 'Forged a tempered blade · +7 attack' : 'Crafted · ' + r.name);
  this.event('craft',{ id });
  this.syncAutoQuests();
  return true;
 }
 upgradeCost(id = this.gear.weapon){
  const lvl = this.weaponLevel(id);
  if(lvl >= MAX_UPGRADE) return null;
  const base = UPGRADE_COST[lvl], cut = (this.flags.forgeDiscount ? .9 : 1) * (1 - (this.outfit().forge||0));
  return Object.fromEntries(Object.entries(base).map(([k,v]) => [k, Math.max(1, Math.round(v*cut))]));
 }
 upgradeWeapon(id = this.gear.weapon){
  if(!(id in this.weapons)){ this.toast('You do not carry that weapon.'); return false; }
  const cost = this.upgradeCost(id);
  if(!cost){ this.toast(WEAPONS[id].name + ' is already fully tempered.'); return false; }
  if(!this.has(cost)){ this.toast('Dain needs more material: ' + this.costText(cost)); return false; }
  this.spend(cost); this.weapons[id]++;
  this.toast(WEAPONS[id].name + ' · +' + this.weapons[id]);
  this.event('upgrade',{ id, level:this.weapons[id] });
  return true;
 }
 buy(shopId, item){
  const shop = SHOPS[shopId], row = shop?.stock.find(s => s.item === item);
  if(!row) return false;
  if(this.bag.coin < row.price){ this.toast('Not enough ember marks.'); return false; }
  this.bag.coin -= row.price; this.bag[item]++;
  this.toast('Bought ' + ITEMS[item] + ' · ' + row.price + ' marks');
  this.event('trade'); this.questCollect(); return true;
 }
 sell(item, n = 1){
  const price = SELL_PRICE[item];
  if(!price || (this.bag[item]||0) < n){ this.toast('Nothing to sell.'); return false; }
  this.bag[item] -= n; this.bag.coin += price*n;
  this.toast('Sold ' + n + ' ' + ITEMS[item] + ' · ' + price*n + ' marks');
  this.event('trade'); return true;
 }
 takeBounty(id){
  const b = BOUNTIES.find(x => x.id === id);
  if(!b) return false;
  if(this.bounty && this.bounty.killed < this.bounty.count){ this.toast('Finish your current bounty first.'); return false; }
  this.bounty = { id:b.id, enemy:b.enemy, count:b.count, killed:0 };
  this.toast('Bounty taken · ' + b.name); this.event('bounty'); return true;
 }
 claimBounty(){
  const b = this.bounty && BOUNTIES.find(x => x.id === this.bounty.id);
  if(!b || this.bounty.killed < b.count){ this.toast('That bounty is not finished.'); return false; }
  this.gain('coin', b.coin); this.exp(b.xp); this.bounty = null;
  this.toast('Bounty paid · ' + b.coin + ' marks'); this.event('bounty-done'); return true;
 }

 // --------------------------------------------------------------- reading
 isNight(){ const light = ZONES[this.zone].light; if(light !== 'dusk' && light !== 'night') return light === 'cave' || light === 'ember'; const h = this.clock*24; return h < 6.5 || h > 19; }
 hour(){ return this.clock*24; }
 dayLabel(){
  const h = this.hour();
  return h < 5 ? 'NIGHT' : h < 8 ? 'DAWN' : h < 12 ? 'MORNING' : h < 17 ? 'AFTERNOON' : h < 20 ? 'DUSK' : 'NIGHT';
 }
 trackedQuest(){
  const active = QUESTS.filter(q => this.questActive(q.id));
  return active.find(q => q.main) ?? active[0] ?? null;
 }

 // ============================================================ persistence
 serialize(){
  return {
   version:2, zone:this.zone, time:this.time, clock:this.clock,
   player:{ ...this.player, attack:0, dash:0, invincible:0, superT:0, charge:0, heavy:false },
   bag:this.bag, flags:this.flags, gear:this.gear, weapons:this.weapons,
   outfits:this.outfits, spells:this.spells, recipes:this.recipes,
   quests:this.quests, bounty:this.bounty, killLog:this.killLog, visited:this.visited,
   removed:[...this.removed],
   // Only entries that differ from how they were built, so the save does not
   // grow with the world.
   objects:this.objects.filter(o => o.hp !== (GATHER[o.type]?.hp ?? 3) || o.growing || o.ripe || o.respawnAt || o.lit === true)
    .map(o => ({ id:o.id, hp:o.hp, growing:o.growing, ripe:o.ripe, respawnAt:o.respawnAt, lit:o.lit })),
   enemies:this.enemies.filter(e => !e.summoned)
    .map(e => ({ id:e.id, hp:e.hp, dead:e.hp > 0 ? 0 : (e.deadUntil === Infinity ? -1 : e.deadUntil) }))
  };
 }

 restore(s){
  if(!s || !s.player || !s.bag || !s.flags) return;
  if(s.version !== 1 && s.version !== 2) return;
  for(const k of Object.keys(this.bag)) if(Number.isFinite(s.bag[k])) this.bag[k] = clamp(Math.floor(s.bag[k]), 0, 999999);
  for(const k of Object.keys(this.flags)) this.flags[k] = s.flags[k] === true;
  for(const k of ['x','y','hp','maxHp','stamina','xp','level','dir','kills','focus'])
   if(Number.isFinite(s.player[k])) this.player[k] = s.player[k];
  this.player.level = clamp(this.player.level, 1, 99);
  this.player.maxHp = 100 + (this.player.level-1)*15;
  this.player.hp = clamp(this.player.hp, 1, this.player.maxHp);
  this.player.stamina = clamp(this.player.stamina, 0, 100);
  this.player.focus = clamp(this.player.focus||0, 0, 100);
  this.time = Number.isFinite(s.time) ? s.time : 0;
  this.clock = Number.isFinite(s.clock) ? s.clock : .30;
  this.removed = new Set(Array.isArray(s.removed) ? s.removed : []);

  // gear: version 1 saves only knew the tempered blade flag
  if(s.version === 2){
   if(s.weapons && typeof s.weapons === 'object')
    for(const [id,lvl] of Object.entries(s.weapons)) if(id in WEAPONS) this.weapons[id] = clamp(Math.floor(lvl)||0, 0, MAX_UPGRADE);
   if(s.outfits) for(const id of Object.keys(s.outfits)) if(id in OUTFITS && s.outfits[id]) this.outfits[id] = true;
   if(s.spells) for(const id of Object.keys(s.spells)) if(id in SPELLS && s.spells[id]) this.spells[id] = true;
   if(s.recipes && typeof s.recipes === 'object') for(const id of Object.keys(s.recipes)) if(id in RECIPES && s.recipes[id]) this.recipes[id] = true;
   if(s.gear){
    if(s.gear.weapon in this.weapons) this.gear.weapon = s.gear.weapon;
    if(this.outfits[s.gear.outfit]) this.gear.outfit = s.gear.outfit;
    if(this.spells[s.gear.spell]) this.gear.spell = s.gear.spell;
   }
   if(s.quests && typeof s.quests === 'object'){
    for(const [id,st] of Object.entries(s.quests)){
     if(!QUEST_BY_ID[id] || !st || (st.state !== 'active' && st.state !== 'done')) continue;
     this.quests[id] = { state:st.state, counts:(st.counts && typeof st.counts === 'object') ? { ...st.counts } : {} };
    }
   }
   if(s.bounty && s.bounty.id && BOUNTIES.some(b => b.id === s.bounty.id)) this.bounty = { ...s.bounty };
   if(s.killLog && typeof s.killLog === 'object') for(const [k,v] of Object.entries(s.killLog)) if(k in ENEMIES && Number.isFinite(v)) this.killLog[k] = v;
   if(s.visited && typeof s.visited === 'object') for(const k of Object.keys(s.visited)) if(k in ZONES && s.visited[k]) this.visited[k] = true;
  }
  if(this.flags.upgrade){ this.weapons.tempered ??= 0; if(this.gear.weapon === 'hearthblade' && s.version !== 2) this.gear.weapon = 'tempered'; }

  for(const o of this.objects){
   const v = s.objects?.find(x => x.id === o.id);
   if(!v) continue;
   if(Number.isFinite(v.hp)) o.hp = v.hp;
   if(Number.isFinite(v.growing)) o.growing = clamp(v.growing, 0, 30);
   o.ripe = v.ripe === true;
   if(Number.isFinite(v.respawnAt)) o.respawnAt = v.respawnAt;
   if(v.lit === true) o.lit = true;
  }
  for(const e of this.enemies){
   const v = s.enemies?.find(x => x.id === e.id);
   if(!v) continue;
   if(Number.isFinite(v.hp)) e.hp = v.hp;
   if(v.dead === -1) e.deadUntil = Infinity;
   else if(Number.isFinite(v.dead) && v.dead > 0) e.deadUntil = v.dead;
   if(e.hp <= 0 && e.deadUntil !== Infinity && this.time >= e.deadUntil){ e.hp = e.maxHp; e.poise = e.maxPoise; }
  }
  // Enemies killed once in a legacy save must stay dead.
  if(s.version === 1) for(const e of this.enemies) if(e.hp <= 0) e.deadUntil = this.time + RESPAWN_MOB;

  const zone = (s.version === 2 && ZONES[s.zone]) ? s.zone : 'vale';
  this.zone = zone; this.player.zone = zone; this.visited[zone] = true;
  this.index();
  if(!this.walkable(this.player.x, this.player.y)){
   const sp = ZONES[zone].spawn; this.player.x = sp[0]*TILE; this.player.y = sp[1]*TILE;
  }
  this.syncAutoQuests();
 }
}

// Events that can move Chapter I or II forward.
const AUTO_SYNC = new Set(['victory','beacon-lit','moonfen-complete','boss-defeated','craft','dialogue','pickup','quest-done','chest']);

// Props the player can walk up to and press E on.
const INTERACTIVE_PROPS = new Set(['anvil','forgefire','loom','cauldron','board','campfire','fountain','shrine','cat','statue','sign']);
const PROP_PROMPT = {
 anvil:'Use the anvil', forgefire:'Use the forge', loom:'Use the loom', cauldron:'Use the stillroom bench',
 board:'Read the work board', campfire:'Rest by the fire', fountain:'Drink from the fountain',
 shrine:'Pray at the shrine', cat:'Pick up the cat', statue:'Read the inscription', sign:'Read the sign'
};
