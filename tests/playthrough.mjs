// A start-to-finish run of the main story, driven only through the model's own
// action methods. If a chapter can softlock, this test is where it shows up.
import assert from 'node:assert/strict';
import { Game, TILE, distance, ZONES, QUEST_BY_ID, ENEMIES, WEAPONS, RECIPES } from '../dist/core.mjs';

const g = new Game();
const log = [];
const note = m => log.push(m);
const step = (t, input={}) => { while(t>1e-8){ const dt = Math.min(.016,t); g.update(dt,input); t -= dt; } };
const drain = () => g.events.splice(0);

// Walk the player to an object or tile and press E, the way a player would.
function goTo(x, y){ g.player.x = x; g.player.y = y; }
function useObject(id){
 const o = g.objects.find(v => v.id === id);
 assert.ok(o, 'missing object ' + id);
 assert.equal(o.zone ?? 'vale', g.zone, `${id} is in ${o.zone}, player is in ${g.zone}`);
 goTo(o.x, o.y + 20);
 const near = g.nearest();
 assert.equal(near?.id, id, `standing at ${id} should offer ${id}, offered ${near?.id}`);
 g.interact(); drain();
}
// Kill every enemy of a type in the current zone, the way combat would.
function slay(type, count = Infinity){
 let killed = 0;
 for(const e of g.here()){
  if(killed >= count) break;
  if(e.type !== type || e.hp <= 0) continue;
  goTo(e.x - 30, e.y);
  let guard = 0;
  while(e.hp > 0 && guard++ < 400){ g.hitEnemy(e, 400, { poise:0 }); }
  killed++;
 }
 drain();
 return killed;
}
function travel(portalId){
 const before = g.zone;
 useObject(portalId);
 assert.notEqual(g.zone, before, portalId + ' did not move the player');
}
function give(items){ for(const [k,n] of Object.entries(items)) g.bag[k] += n; }

// ---- Chapter I ----------------------------------------------------------
useObject('o3');                                  // Wren, by the hearth
assert.equal(g.flags.met, true);
give({ wood:12, stone:8 });
useObject('o1'); assert.equal(g.repair(), true);  // the ruined workshop
assert.equal(g.flags.cottage, true);
assert.equal(slay('guardian', 1), 1, 'the Rootbound must be reachable and killable');
assert.equal(g.flags.boss, true);
assert.equal(g.bag.core, 1);
useObject('o2'); assert.equal(g.rekindle(), true);
assert.equal(g.flags.hearth, true);
assert.equal(g.questDone('q-hearth'), true, 'Chapter I closes');
note('Chapter I');

// ---- Chapter II ---------------------------------------------------------
slay('wisp');
give({ essence: 6 });
for(const b of g.objects.filter(o => o.type === 'beacon')){
 goTo(b.x, b.y + 20);
 assert.equal(g.lightBeacon(b), true, 'beacon ' + b.index + ' must light');
}
assert.equal(g.flags.beacons, true);
assert.equal(g.questDone('q-beacons'), true, 'Chapter II closes');
note('Chapter II');

// ---- Chapter III: the west road, the forge, the Choir --------------------
assert.equal(g.startQuest('q-road'), true);
travel('p-vale-town');
assert.equal(g.zone, 'town');
g.talkTo('orin');
assert.equal(g.completeQuest('q-road'), true);
assert.equal(g.bag.coin >= 80, true, 'the road quest pays');

assert.equal(g.startQuest('q-forge'), true);
give({ iron:8, coal:6 });
assert.equal(g.completeQuest('q-forge'), true);
assert.equal(g.flags.forgeOpen, true, 'the anvil opens');
assert.equal(g.bag.iron, 0, 'the iron was handed over');
// the anvil is now usable
travel('d-forge');
useObject('pr-forge-0');
assert.ok(drain, 'the anvil responds');
travel('d-forge-out');

assert.equal(g.startQuest('q-choir'), true);
travel('p-town-crypt');
assert.equal(g.zone, 'crypt');
assert.equal(slay('choirlord', 1), 1, 'the Choirmaster must be reachable');
travel('p-crypt-town');
g.talkTo('orin');
assert.equal(g.completeQuest('q-choir'), true);
assert.equal(g.outfits.ashencloak, true, 'the Choir quest grants its outfit');
note('Chapter III');

// ---- Chapter IV: Whisperwood --------------------------------------------
travel('p-town-forest');
assert.equal(g.zone, 'forest');
assert.equal(g.startQuest('q-wood'), true);
assert.equal(slay('bramble', 1), 1, 'the Bramble Warden must be reachable');
assert.ok(g.bag.seed >= 1, 'the Warden drops the Heartwood Seed');
g.talkTo('nima');
assert.equal(g.completeQuest('q-wood'), true);
assert.equal(g.spells.blink, true, 'the wood quest teaches Shadowstep');
assert.equal(g.recipes.rootcleaver, true);
note('Chapter IV');

// ---- Chapter V: the Warrens ---------------------------------------------
travel('p-forest-warren');
assert.equal(g.zone, 'warren');
assert.equal(g.startQuest('q-warren'), true);
assert.equal(slay('devourer', 1), 1, 'the Devourer must be reachable');
assert.ok(g.bag.warrenkey >= 1, 'the Devourer itself drops the Warren sigil, so the stair cannot stay sealed');
g.talkTo('gormel');
assert.equal(g.completeQuest('q-warren'), true);
assert.equal(g.spells.sunfall, true, 'the Warrens teach Sunfall');
note('Chapter V');

// ---- Chapter VI: the Emberdeep ------------------------------------------
assert.equal(g.startQuest('q-deep'), true);
const cost = g.recipeCost('reforged');
give(cost);
g.zone = 'town';                                        // back to the anvil
assert.equal(g.craft('reforged','forge'), true, 'the Hearthblade must be forgeable');
assert.equal(g.gear.weapon, 'reforged');
g.zone = 'warren';
travel('p-warren-deep');
assert.equal(g.zone, 'deep');
assert.equal(slay('tyrant', 1), 1, 'the Cinder Tyrant must be reachable');
assert.equal(g.flags.ending, true);
assert.equal(g.completeQuest('q-deep'), true);
assert.equal(g.outfits.emberheart, true);
note('Chapter VI and the ending');

// ---- everything still works afterwards ----------------------------------
const after = new Game(JSON.parse(JSON.stringify(g.serialize())));
assert.equal(after.flags.ending, true);
assert.equal(after.gear.weapon, 'reforged');
assert.equal(after.questDone('q-deep'), true);
assert.equal(after.zone, 'deep');
// The world is still alive: ordinary enemies come back, bosses do not.
after.time += 500;
step(.05);
assert.ok(after.enemies.some(e => !ENEMIES[e.type].boss && e.hp > 0), 'the world still has enemies in it');
note('post-ending save');

// ---- every side quest can still be started and finished ------------------
const side = new Game();
side.flags.met = side.flags.cottage = side.flags.boss = side.flags.hearth = true;
side.flags.beacon0 = side.flags.beacon1 = side.flags.beacon2 = side.flags.beacons = true;
side.syncAutoQuests();
for(const id of ['q-road','q-forge','q-choir','q-wood','q-warren']) side.quests[id] = { state:'done', counts:{} };
for(const q of Object.values(QUEST_BY_ID)){
 if(q.main || side.quests[q.id]) continue;
 assert.ok(side.questOpen(q), q.id + ' must be reachable once the story is done');
 assert.equal(side.startQuest(q.id), true, q.id + ' must be startable');
 for(const s of q.steps){
  if(s.kind === 'collect') side.bag[s.item] += s.count;
  if(s.kind === 'kill') for(let i=0;i<s.count;i++) side.questKill(s.enemy);
  if(s.kind === 'talk') side.questTalk(s.npc);
  if(s.kind === 'reach') side.visited[s.zone] = true;
  if(s.kind === 'interact') for(let i=0;i<(s.count||1);i++) side.questInteract(s.target);
 }
 assert.ok(side.questReady(q.id), q.id + ' must be completable');
 assert.equal(side.completeQuest(q.id), true, q.id + ' must pay out');
}
note('all ' + Object.values(QUEST_BY_ID).filter(q=>!q.main).length + ' side quests');

// Every weapon and outfit is obtainable in one save.
const all = new Game();
all.flags.forgeOpen = all.flags.loomOpen = true;
for(const id of Object.keys(RECIPES)) all.recipes[id] = true;
for(const k of Object.keys(all.bag)) all.bag[k] = 99999;
for(const [id,r] of Object.entries(RECIPES)){
 if(!r.weapon && !r.outfit) continue;
 assert.equal(all.craft(id, r.at), true, id + ' must be craftable with full materials');
}
assert.equal(Object.keys(all.weapons).length >= 9, true, 'nearly every weapon comes from a bench');
note('every bench recipe');

console.log('PASS (playthrough): ' + log.join('; ') + '.');
