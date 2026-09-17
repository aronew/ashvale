import assert from 'node:assert/strict';
import {Game as OldGame} from './fixtures/core-v1.mjs';
import {
 Game, SWINGS, TILE, distance, ZONES, ZONE_ORDER, PORTALS, WEAPONS, OUTFITS, SPELLS,
 RECIPES, ENEMIES, QUEST_BY_ID, UPGRADE_COST, GATHER
} from '../dist/core.mjs';

const step = (g,t,input={}) => { while(t>1e-8){ const dt = Math.min(.01,t); g.update(dt,input); t -= dt; } };
const done = [];
const ok = m => done.push(m);

// ---------------------------------------------------------------- combat
{
 const g = new Game(); g.objects = []; const p = g.player;
 const target = { id:'dummy', type:'slime', zone:'vale', x:p.x+38, y:p.y, homeX:p.x+38, homeY:p.y, hp:1000, maxHp:1000, cd:999, hit:0, phase:0, windup:999, poise:9999, maxPoise:9999, stagger:0, burn:0, slowT:0, deadUntil:0 };
 g.enemies = [target];
 for(let i=0;i<3;i++){
  const hp = target.hp;
  assert.equal(g.attack(), true); assert.equal(p.combo, i);
  step(g, SWINGS[i].impact-.02); assert.equal(target.hp, hp, 'Damage must wait for the swing impact');
  step(g,.03); assert.equal(hp-target.hp, Math.round(17*SWINGS[i].multiplier), 'Base damage is unchanged for a fresh save');
  step(g, SWINGS[i].duration); assert.equal(hp-target.hp, Math.round(17*SWINGS[i].multiplier), 'Only one impact per swing');
  target.x = p.x+38; target.y = p.y;
 }
 step(g,1); g.attack(); assert.equal(p.combo,0,'Combo resets after idle');
 step(g,.22); g.attack(); step(g,.15); assert.equal(p.combo,1,'Buffered press chains into the next swing');
 ok('three timed swings, finisher damage, single-hit damage, combo reset, press buffering');
}
{
 const hold = new Game(); hold.enemies = [];
 step(hold,1.3,{attack:true});
 assert.ok(hold.events.filter(e=>e.type==='attack').length>=3,'Holding attack chains swings');
 ok('held attack');
}
{ // Heavy attack is its own strike on its own timing, and costs stamina.
 const g = new Game(); g.objects = [];
 const t = { id:'d', type:'slime', zone:'vale', x:g.player.x+86, y:g.player.y, homeX:0, homeY:0, hp:9000, maxHp:9000, cd:999, hit:0, phase:0, windup:999, poise:9999, maxPoise:9999, stagger:0, burn:0, slowT:0, deadUntil:0 };
 g.enemies = [t]; g.player.stamina = 100;
 assert.equal(g.heavyAttack(), true);
 assert.equal(g.player.stamina, 70, 'Heavy attack costs 30 stamina');
 const before = t.hp; step(g,.9);
 assert.ok(before - t.hp > Math.round(17*SWINGS[2].multiplier), 'Heavy strike out-damages the standard finisher');
 g.player.stamina = 10; assert.equal(g.heavyAttack(), false, 'Heavy attack needs stamina');
 ok('heavy attack timing, cost and damage');
}
{ // Every weapon class has a complete, sane swing table.
 for(const [id,w] of Object.entries(WEAPONS)){
  const g = new Game(); g.weapons[id] = 0; g.gear.weapon = id;
  const set = g.swingSet();
  assert.ok(set.length >= 2, id+' needs at least two swings');
  for(const s of set){
   assert.ok(s.impact > 0 && s.impact < s.duration, id+' impact must land inside the swing');
   assert.ok(s.range > 0 && s.multiplier > 0, id+' needs reach and damage');
   assert.ok(Array.isArray(s.arc) && s.arc.length === 2, id+' needs a render arc');
  }
  assert.ok(g.attackPower() >= w.power, id+' power must not be lost');
 }
 ok('every weapon swing table is complete');
}
{ // Upgrades cost, cap, and raise damage.
 const g = new Game();
 g.bag.iron = 99; g.bag.coal = 99; g.bag.crystal = 99; g.bag.moonsteel = 99; g.bag.coin = 9999;
 const base = g.attackPower();
 assert.equal(g.upgradeWeapon('hearthblade'), true);
 assert.ok(g.attackPower() > base, 'An upgrade must increase attack power');
 for(let i=1;i<UPGRADE_COST.length;i++) assert.equal(g.upgradeWeapon('hearthblade'), true);
 assert.equal(g.upgradeCost('hearthblade'), null, 'Upgrades cap out');
 assert.equal(g.upgradeWeapon('hearthblade'), false);
 ok('weapon upgrade path and cap');
}
{ // Staggering opens a damage window; armour blunts small hits.
 const g = new Game(); g.objects = [];
 const e = g.makeMob('brigand', 10, 10, 'vale', { id:'b1' }); g.enemies = [e];
 g.hitEnemy(e, 10, { poise:999 });
 assert.ok(e.stagger > 0, 'Poise damage staggers');
 const rock = g.makeMob('rockling', 10, 10, 'vale', { id:'r1' }); g.enemies = [rock];
 const before = rock.hp; g.hitEnemy(rock, 10, {});
 assert.equal(before - rock.hp, 10 - ENEMIES.rockling.armor, 'Armour reduces damage');
 ok('stagger and armour');
}
{ // Outfits change armour, and the ward spell soaks a hit.
 const g = new Game();
 g.outfits.wardenplate = true; g.equip('outfit','wardenplate');
 assert.equal(g.armour(), OUTFITS.wardenplate.armor);
 const plain = new Game();
 g.player.invincible = 0; plain.player.invincible = 0;
 g.hurt(40); plain.hurt(40);
 assert.ok(g.player.hp > plain.player.hp, 'Armour reduces incoming damage');
 const w = new Game(); w.spells.ward = true; w.equip('spell','ward'); w.player.stamina = 100;
 assert.equal(w.cast(), true); assert.ok(w.player.shield > 0);
 const hp = w.player.hp; w.player.invincible = 0; w.hurt(20);
 assert.equal(w.player.hp, hp, 'A ward absorbs the hit instead of your health');
 ok('outfit armour and warding shield');
}
{ // A dodge still beats a firebolt, and a clean dodge pays focus back.
 const g = new Game(); g.flags.hearth = true;
 const wisp = g.enemies.find(e=>e.type==='wisp'); g.enemies = [wisp];
 g.player.x = wisp.x-130; g.player.y = wisp.y; wisp.cd = 0;
 step(g,.8); assert.equal(g.projectiles.length, 1, 'Wisp fires a telegraphed projectile');
 const hp = g.player.hp;
 g.projectiles = [{ x:g.player.x, y:g.player.y, vx:0, vy:0, life:1, dmg:14 }];
 g.player.dash = .1; step(g,.01);
 assert.equal(g.player.hp, hp, 'Dodge avoids firebolt damage');
 assert.ok(g.player.focus > 0, 'A clean dodge builds focus');
 ok('ranged attacks, dodge immunity and perfect-dodge focus');
}
{ // The super needs a full focus meter and then hits everything near you.
 const g = new Game(); g.objects = [];
 const e = g.makeMob('slime', g.player.x/TILE+1, g.player.y/TILE, 'vale', { id:'s1' });
 e.hp = e.maxHp = 5000; g.enemies = [e];
 assert.equal(g.useSuper(), false, 'A super needs focus');
 g.player.focus = 100;
 assert.equal(g.useSuper(), true);
 const before = e.hp; step(g,1);
 assert.ok(before > e.hp, 'The super damages nearby enemies');
 assert.equal(g.player.focus, 0);
 ok('focus meter and weapon supers');
}

// ------------------------------------------------------------------ world
{
 for(const id of ZONE_ORDER){
  const g = new Game(), def = ZONES[id];
  const start = [Math.floor(def.spawn[0]), Math.floor(def.spawn[1])];
  assert.ok(g.walkable((start[0]+.5)*TILE,(start[1]+.5)*TILE,9,id), id+' spawn must be standable');
  const seen = new Set([start.join(',')]), q = [start];
  for(let i=0;i<q.length;i++){
   const [x,y] = q[i];
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx = x+dx, ny = y+dy, k = nx+','+ny;
    if(seen.has(k) || nx<0 || ny<0 || nx>=def.w || ny>=def.h) continue;
    if(!g.walkable((nx+.5)*TILE,(ny+.5)*TILE,9,id)) continue;
    seen.add(k); q.push([nx,ny]);
   }
  }
  const reach = (x,y,slack) => { for(let r=0;r<=slack;r++) for(let j=-r;j<=r;j++) for(let i=-r;i<=r;i++) if(seen.has((Math.floor(x/TILE)+i)+','+(Math.floor(y/TILE)+j))) return true; return false; };
  for(const o of g.objects){
   if((o.zone ?? 'vale') !== id || o.type === 'marker') continue;
   assert.ok(reach(o.x,o.y, o.radius>20?3:2), `${id}: ${o.id} must be reachable`);
  }
  for(const e of g.enemies){
   if(e.zone !== id) continue;
   assert.ok(reach(e.x,e.y,0), `${id}: ${e.id} (${e.type}) must not spawn inside terrain`);
  }
 }
 ok('every zone is traversable and no content is walled in');
}
{ // Portals pair up and land you somewhere you can stand.
 const g = new Game();
 for(const p of PORTALS){
  assert.ok(ZONES[p.to], p.id+' targets a real zone');
  const o = g.objects.find(x=>x.id===p.id);
  assert.ok(o, p.id+' exists in the world');
  assert.ok(g.walkable(p.at[0]*TILE, p.at[1]*TILE, 9, p.to), p.id+' must land on open ground');
 }
 for(const id of ZONE_ORDER){
  if(id === 'vale') continue;
  assert.ok(PORTALS.some(p=>p.zone===id), id+' needs a way out');
  assert.ok(PORTALS.some(p=>p.to===id), id+' needs a way in');
 }
 ok('portals are paired and land on open ground');
}
{ // Travelling actually moves you, and remembers where you have been.
 const g = new Game();
 const gate = g.objects.find(o=>o.id==='p-vale-town');
 g.player.x = gate.x; g.player.y = gate.y;
 assert.equal(g.interact(), true);
 assert.equal(g.zone, 'town'); assert.equal(g.visited.town, true);
 assert.ok(g.walkable(g.player.x, g.player.y), 'You arrive on solid ground');
 const back = g.objects.find(o=>o.id==='p-town-vale');
 g.player.x = back.x; g.player.y = back.y; g.interact();
 assert.equal(g.zone, 'vale');
 ok('zone travel both ways');
}
{ // Standing in fire hurts; standing on stone does not.
 const g = new Game();
 g.setZone('deep', 12, 48, true);
 const hp = g.player.hp; g.player.invincible = 0;
 const cinder = [];
 for(let y=0;y<ZONES.deep.h;y++) for(let x=0;x<ZONES.deep.w;x++) if(g.maps.deep[y][x] === 18) cinder.push([x,y]);
 assert.ok(cinder.length > 0, 'The Emberdeep has cinder floors');
 g.player.x = (cinder[0][0]+.5)*TILE; g.player.y = (cinder[0][1]+.5)*TILE;
 step(g,1.2);
 assert.ok(g.player.hp < hp, 'Cinder floors burn');
 ok('hazard floors');
}

// ----------------------------------------------------------------- quests
{
 const g = new Game();
 // Chapter I and II still drive themselves off the original flags.
 g.flags.met = g.flags.cottage = g.flags.boss = g.flags.hearth = true;
 g.syncAutoQuests();
 assert.equal(g.questDone('q-hearth'), true, 'Chapter I closes itself from its flags');
 assert.equal(g.questOpen(QUEST_BY_ID['q-road']), false, 'Chapter III waits for Chapter II');
 g.flags.beacon0 = g.flags.beacon1 = g.flags.beacon2 = true; g.syncAutoQuests();
 assert.equal(g.questDone('q-beacons'), true);
 assert.equal(g.startQuest('q-road'), true);
 assert.equal(g.questReady('q-road'), false);
 g.setZone('town', ...ZONES.town.spawn, true);
 g.talkTo('orin');
 assert.equal(g.questReady('q-road'), true, 'Reaching town and reporting in finishes the quest');
 const coin = g.bag.coin;
 assert.equal(g.completeQuest('q-road'), true);
 assert.equal(g.bag.coin, coin + QUEST_BY_ID['q-road'].reward.coin, 'Rewards are paid');
 assert.equal(g.completeQuest('q-road'), false, 'A quest cannot be claimed twice');
 ok('quest chain gating, talk/reach steps and one-time rewards');
}
{ // Fetch quests take the goods when you hand them in.
 const g = new Game();
 g.quests['s-brew'] = { state:'active', counts:{} };
 g.bag.herb = 10;
 assert.equal(g.questReady('s-brew'), true);
 g.completeQuest('s-brew');
 assert.equal(g.bag.herb, 4, 'Handed-in materials leave your pack');
 ok('collect quests consume their materials');
}
{ // Kill counters only tick for the quest that asked.
 const g = new Game();
 g.quests['s-wolves'] = { state:'active', counts:{} };
 for(let i=0;i<8;i++) g.questKill('wolf');
 g.questKill('bat');
 assert.equal(g.quests['s-wolves'].counts.wolf, 8);
 assert.equal(g.questReady('s-wolves'), true);
 ok('kill counters');
}
{ // Every quest is completable: its giver exists and its requirements resolve.
 for(const q of Object.values(QUEST_BY_ID)){
  assert.ok(q.steps.length > 0, q.id+' needs steps');
  for(const r of q.requires ?? []) assert.ok(QUEST_BY_ID[r], q.id+' requires a real quest: '+r);
  for(const s of q.steps){
   if(s.kind === 'kill') assert.ok(ENEMIES[s.enemy], q.id+' targets a real enemy');
   if(s.kind === 'reach') assert.ok(ZONES[s.zone], q.id+' targets a real zone');
   if(s.kind === 'craft') assert.ok(WEAPONS[s.weapon], q.id+' targets a real weapon');
  }
  const r = q.reward ?? {};
  if(r.weapon) assert.ok(WEAPONS[r.weapon], q.id+' rewards a real weapon');
  if(r.outfit) assert.ok(OUTFITS[r.outfit], q.id+' rewards a real outfit');
  if(r.spell) assert.ok(SPELLS[r.spell], q.id+' rewards a real spell');
  if(r.recipe) assert.ok(RECIPES[r.recipe], q.id+' rewards a real recipe');
 }
 // Every enemy a quest asks for must actually live somewhere.
 const world = new Game();
 for(const q of Object.values(QUEST_BY_ID)) for(const s of q.steps){
  if(s.kind !== 'kill') continue;
  const supply = world.enemies.filter(e=>e.type===s.enemy);
  assert.ok(supply.length > 0, q.id+' needs '+s.enemy+' to exist in the world');
  if(!ENEMIES[s.enemy].boss) assert.ok(supply.length >= 4, q.id+' needs a renewable supply of '+s.enemy);
 }
 ok('quest definitions are coherent and every objective is reachable');
}

// -------------------------------------------------------------- economy
{
 const g = new Game();
 g.bag.coin = 100;
 assert.equal(g.buy('general','potion'), true);
 assert.equal(g.bag.coin, 76);
 g.bag.coin = 0; assert.equal(g.buy('general','potion'), false, 'You cannot buy on credit');
 g.bag.iron = 3; assert.equal(g.sell('iron',2), true); assert.equal(g.bag.iron, 1); assert.ok(g.bag.coin > 0);
 assert.equal(g.sell('iron',9), false, 'You cannot sell what you do not have');
 ok('shops buy and sell');
}
{ // Recipes cost what they say and grant exactly once.
 const g = new Game();
 g.recipes.fenrazor = true; g.flags.forgeOpen = true;
 g.bag.iron = 9; g.bag.leather = 9; g.bag.fang = 9; g.bag.coin = 999;
 assert.equal(g.craft('fenrazor','pack'), false, 'Forge work needs the forge');
 assert.equal(g.craft('fenrazor','forge'), true);
 assert.ok('fenrazor' in g.weapons);
 assert.equal(g.craft('fenrazor','forge'), false, 'A weapon is only forged once');
 const legacy = new Game();
 legacy.bag.wood = 9; legacy.bag.stone = 9; legacy.bag.essence = 9;
 assert.equal(legacy.craft('blade'), true);
 assert.equal(legacy.flags.upgrade, true, 'The tempered blade still sets its original flag');
 assert.equal(legacy.attackPower(), 24, 'The tempered blade still reads 24 attack');
 ok('crafting, forge gating and the legacy tempered blade');
}

// --------------------------------------------------------------- respawn
{
 const g = new Game();
 const tree = g.objects.find(o=>o.type==='tree' && o.zone==='vale');
 g.removed.add(tree.id); tree.respawnAt = g.time + 1;
 g.time += 2; step(g,.02);
 assert.equal(g.removed.has(tree.id), false, 'Harvested resources grow back');
 const bat = g.enemies.find(e=>e.type==='bat' && e.zone==='vale');
 bat.hp = 0; bat.deadUntil = g.time + 1;
 g.time += 2; step(g,.02);
 assert.ok(bat.hp > 0, 'Ordinary enemies return so the world stays alive');
 const boss = g.enemies.find(e=>e.id==='boss');
 g.killEnemy(boss);
 assert.equal(boss.deadUntil, Infinity, 'Bosses stay dead');
 assert.equal(g.flags.boss, true);
 assert.equal(g.bag.core, 1, 'The Heart Spark drops exactly once');
 ok('resource and enemy respawn, one-time boss rewards');
}

// ---------------------------------------------------- legacy save support
{
 const old = new OldGame();
 old.flags.hearth = true; old.flags.cottage = true; old.flags.boss = true; old.flags.met = true;
 old.bag.wood = 23; old.removed.add(old.objects.find(o=>o.type==='tree').id);
 const migrated = new Game(JSON.parse(JSON.stringify(old.serialize())));
 assert.equal(migrated.flags.hearth, true);
 assert.equal(migrated.bag.wood, 23);
 assert.equal(migrated.flags.beacons, false);
 assert.equal(migrated.zone, 'vale', 'A legacy save starts where it left off, in the vale');
 assert.equal(migrated.gear.weapon, 'hearthblade');
 assert.equal(migrated.bag.coin, 25, 'New currencies take their default, not zero');
 for(const o of old.objects){
  const newer = migrated.objects.find(n=>n.id===o.id);
  assert.deepEqual([newer.type,newer.x,newer.y],[o.type,o.x,o.y],'Original object IDs must not shift');
 }
 const upgraded = new OldGame(); upgraded.flags.upgrade = true;
 const m2 = new Game(JSON.parse(JSON.stringify(upgraded.serialize())));
 assert.equal(m2.gear.weapon, 'tempered', 'A legacy tempered blade is still equipped');
 assert.equal(m2.attackPower(), 24);
 ok('legacy version 1 saves migrate without shifting entity IDs');
}
{ // Chapter II still gates, still rewards, still cannot be farmed.
 const world = new Game();
 const beacons = world.objects.filter(o=>o.type==='beacon');
 world.player.x = beacons[0].x+35; world.player.y = beacons[0].y; world.bag.essence = 6;
 assert.equal(world.lightBeacon(beacons[0]), false, 'Chapter I gate');
 world.flags.hearth = true; world.enemies = [];
 for(const b of beacons){ world.player.x = b.x+35; world.player.y = b.y; assert.equal(world.lightBeacon(b), true); }
 assert.equal(world.flags.beacons, true);
 assert.equal(world.bag.essence, 0);
 assert.equal(world.bag.potion, 6);
 assert.equal(world.lightBeacon(beacons[2]), false, 'Completion rewards cannot be duplicated');
 const roundtrip = new Game(JSON.parse(JSON.stringify(world.serialize())));
 assert.equal(roundtrip.flags.beacons, true);
 assert.equal(roundtrip.flags.beacon2, true);
 ok('chapter gates, completion rewards and persistence');
}
{ // A version 2 save carries the whole expanded game back.
 const g = new Game();
 g.setZone('warren', ...ZONES.warren.spawn, true);
 g.unlockWeapon('moonsaber'); g.weapons.moonsaber = 3;
 g.unlockOutfit('fenstalker'); g.equip('outfit','fenstalker');
 g.unlockSpell('frost'); g.equip('spell','frost');
 g.bag.coin = 412; g.bag.crystal = 7;
 g.quests['s-wolves'] = { state:'active', counts:{ wolf:5 } };
 g.recipes.wardenplate = true;
 g.takeBounty('b-wolf'); g.bounty.killed = 3;
 g.killLog.wolf = 12;
 const lamp = g.objects.find(o=>o.type==='lamp' && o.zone==='town'); lamp.lit = true;
 const back = new Game(JSON.parse(JSON.stringify(g.serialize())));
 assert.equal(back.zone, 'warren');
 assert.equal(back.gear.weapon, 'moonsaber');
 assert.equal(back.weapons.moonsaber, 3);
 assert.equal(back.gear.outfit, 'fenstalker');
 assert.equal(back.gear.spell, 'frost');
 assert.equal(back.bag.coin, 412);
 assert.equal(back.quests['s-wolves'].counts.wolf, 5);
 assert.equal(back.recipes.wardenplate, true);
 assert.equal(back.bounty.killed, 3);
 assert.equal(back.killLog.wolf, 12);
 assert.equal(back.objects.find(o=>o.id===lamp.id).lit, true);
 assert.equal(back.visited.warren, true);
 ok('version 2 saves round-trip zone, gear, quests, bounties and world state');
}
{ // A junk save must never wipe a player.
 const g = new Game(JSON.parse('{"version":99,"player":{},"bag":{},"flags":{}}'));
 assert.equal(g.player.hp, 100); assert.equal(g.zone, 'vale');
 const g2 = new Game({ version:2, player:{ level:9999, hp:1e9 }, bag:{ coin:-50 }, flags:{ hearth:'yes' }, gear:{ weapon:'nope' } });
 assert.ok(g2.player.level <= 99 && g2.player.hp <= g2.player.maxHp, 'Absurd values are clamped');
 assert.equal(g2.flags.hearth, false, 'Only real booleans set a flag');
 assert.equal(g2.gear.weapon, 'hearthblade', 'An unknown weapon falls back to the starter');
 assert.ok(g2.bag.coin >= 0);
 ok('damaged and hostile saves are clamped, not discarded silently');
}
{ // Content sanity: nothing references an item or art that does not exist.
 const g = new Game();
 for(const [id,r] of Object.entries(RECIPES)){
  for(const k of Object.keys(r.cost)) assert.ok(k in g.bag, id+' costs an unknown item: '+k);
  for(const k of Object.keys(r.give ?? {})) assert.ok(k in g.bag, id+' gives an unknown item: '+k);
  if(r.weapon) assert.ok(WEAPONS[r.weapon], id+' makes an unknown weapon');
  if(r.outfit) assert.ok(OUTFITS[r.outfit], id+' makes an unknown outfit');
 }
 for(const [id,e] of Object.entries(ENEMIES)){
  for(const k of Object.keys(e.drops ?? {})) assert.ok(k in g.bag, id+' drops an unknown item: '+k);
  assert.ok(e.hp > 0 && e.dmg > 0 && e.xp > 0, id+' needs stats');
 }
 for(const [id,n] of Object.entries(GATHER)) for(const k of Object.keys(n.give)) assert.ok(k in g.bag, id+' yields an unknown item: '+k);
 // Every outfit and weapon must be obtainable somehow.
 const fromRecipes = new Set(Object.values(RECIPES).map(r=>r.weapon).filter(Boolean));
 const fromQuests = new Set(Object.values(QUEST_BY_ID).map(q=>q.reward?.weapon).filter(Boolean));
 for(const id of Object.keys(WEAPONS)) assert.ok(id==='hearthblade' || fromRecipes.has(id) || fromQuests.has(id), id+' is unobtainable');
 const outfitSources = new Set([...Object.values(RECIPES).map(r=>r.outfit), ...Object.values(QUEST_BY_ID).map(q=>q.reward?.outfit)].filter(Boolean));
 for(const id of Object.keys(OUTFITS)) assert.ok(id==='wayfarer' || outfitSources.has(id), id+' is unobtainable');
 const spellSources = new Set(Object.values(QUEST_BY_ID).map(q=>q.reward?.spell).filter(Boolean));
 for(const id of Object.keys(SPELLS)) assert.ok(id==='ember' || spellSources.has(id), id+' is unlearnable');
 ok('all items, weapons, outfits and spells are defined and obtainable');
}

{ // Gathering: the sword breaks a node and the material lands in the pack.
 const g = new Game();
 const tree = g.props().find(o => o.type === 'tree' && !g.removed.has(o.id));
 g.player.x = tree.x; g.player.y = tree.y + 40;
 g.player.angle = -Math.PI/2; g.player.aiming = true;
 const wood = g.bag.wood;
 for(let i=0;i<GATHER.tree.hp;i++){ g.attack(); step(g,.5); }
 assert.equal(g.removed.has(tree.id), true, 'A tree falls after its hit points are spent');
 assert.equal(g.bag.wood, wood + GATHER.tree.give.wood, 'Felling a tree yields timber exactly once');
 // Hand-gathered nodes need E, not the sword.
 const web = g.objects.find(o => o.type === 'web');
 g.setZone(web.zone, web.x/TILE, web.y/TILE + 1, true);
 const silk = g.bag.silk;
 assert.equal(g.interact(), true);
 assert.equal(g.bag.silk, silk + GATHER.web.give.silk, 'Silk is taken by hand');
 ok('gathering with the sword and by hand');
}
{ // Chapter quests are narrated by their giver, never handed in over a counter.
 const g = new Game();
 const wren = g.npcTopics('wren');
 assert.equal(wren.offers.length, 0, 'Wren does not offer Chapter I as a job');
 assert.equal(wren.active.length, 0, 'Chapter I is not an ordinary active quest');
 assert.ok(wren.chapter && wren.chapter.id === 'q-hearth', 'Wren carries the current chapter');
 g.flags.met = g.flags.cottage = g.flags.boss = g.flags.hearth = true;
 g.flags.beacon0 = g.flags.beacon1 = g.flags.beacon2 = true;
 g.syncAutoQuests();
 const after = g.npcTopics('wren');
 assert.equal(after.chapter, null, 'Once the chapters are done she has nothing left to narrate');
 assert.equal(after.offers[0]?.id, 'q-road', 'and she offers the west road instead');
 ok('chapter quests are narrated, side work is offered');
}

console.log('PASS: ' + done.join('; ') + '.');
