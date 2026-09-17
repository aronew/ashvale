// Browser layer: input, camera, the frame loop, and turning model events into
// sound, panels and effects. All rules live in core.mjs.
import { Game, TILE, clamp, ZONES, SPELLS, SPELL_ORDER, WEAPONS } from './core.mjs';
import * as R from './render.mjs';
import * as UI from './ui.mjs';
import * as A from './audio.mjs';

const $ = s => document.querySelector(s);
const canvas = $('#world'), ctx = canvas.getContext('2d'), panel = $('#panel');
const SAVE_KEY = 'ashvale-adventure-v1';

let saved = null;
try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch {}
let game = new Game(saved);
let started = false, ready = false;
let keys = new Set(), pointerDown = false, heavyDown = false, pointerAim = false;
let last = 0, hudTimer = 0, saveTimer = 0, hitstop = 0, shake = 0, zoom = 1.5;
let cam = { x:0, y:0 }, camInit = false, ghostTimer = 0;

// -------------------------------------------------------------------- boot
function uiApp(){
 return {
  get game(){ return game; },
  started: () => started,
  save,
  flush: () => { events(); UI.updateHud(); },
  clearInput: () => { keys.clear(); pointerDown = false; heavyDown = false; },
  reset(){ game = new Game(); try{ localStorage.removeItem(SAVE_KEY); }catch{} R.clearFx(); UI.closePanel(); UI.updateHud(); UI.toast('A new arrival in Ashvale. Find Wren by the hearth.'); save(); }
 };
}
UI.initUI(uiApp());

R.loadAtlas('sprites.png', () => {
 ready = true;
 $('#start-btn').disabled = false;
 $('#start-btn').textContent = saved ? 'Continue adventure' : 'Enter the hollow';
 UI.spriteCSS();
 UI.updateHud();
}, () => {
 $('#load-error').hidden = false;
 $('#start-btn').textContent = 'Reload artwork';
 $('#start-btn').disabled = false;
 $('#start-btn').onclick = () => location.reload();
});

function resize(){
 const r = canvas.getBoundingClientRect();
 zoom = r.width < 650 ? 1.15 : Math.min(1.65, Math.max(1.2, r.width/900));
 canvas.width = Math.round(r.width/zoom);
 canvas.height = Math.round(r.height/zoom);
 ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize); resize();

function save(){
 try {
  localStorage.setItem(SAVE_KEY, JSON.stringify(game.serialize()));
  $('#save-status').textContent = 'Adventure saved';
  setTimeout(() => $('#save-status').textContent = 'Local adventure', 1800);
  return true;
 } catch { $('#save-status').textContent = 'Saving unavailable'; return false; }
}

// ------------------------------------------------------------------ events
function events(){
 for(const e of game.events.splice(0)){
  switch(e.type){
   case 'toast': UI.toast(e.text); break;
   case 'dialogue': UI.dialogue(e.npc); break;
   case 'repair': UI.repairPanel(); break;
   case 'hearth': UI.hearthPanel(); break;
   case 'station': UI.station(e.station); break;
   case 'board': UI.board(); break;
   case 'victory': save(); chapterOne(); A.tone(440,1); A.tone(587.33,1.3,'sine',.03,.17); break;
   case 'moonfen-complete': save(); chapterTwo(); break;
   case 'hurt': shake = 3.4; A.sweep(160,70,.18,'sawtooth',.03); A.noise(.1,.03,600); break;
   case 'shielded': A.tone(520,.2,'triangle',.03); break;
   case 'attack': A.swingSound(game.weapon().kind, e.combo, e.heavy); break;
   case 'impact': {
    hitstop = e.heavy ? .085 : e.combo === game.swingSet().length-1 ? .065 : .028;
    shake = e.heavy ? 4.2 : e.combo === game.swingSet().length-1 ? 3.2 : 1.3;
    const p = game.player;
    R.addFx('slash', { x:p.x + Math.cos(p.attackAngle)*34, y:p.y-20 + Math.sin(p.attackAngle)*34,
     angle:p.attackAngle, color:game.weapon().trail, heavy:e.heavy, r:(game.currentSwing().range||80)*.6, life:.26 });
    A.impactSound(e.heavy, e.combo, e.killed);
    break; }
   case 'stagger': A.tone(150,.3,'square',.028); break;
   case 'burst': shake = Math.max(shake, 3); A.noise(.22,.05,700); break;
   case 'scorched': shake = Math.max(shake, 2); A.noise(.12,.03,900); break;
   case 'shockwave': shake = Math.max(shake, 4); A.sweep(120,40,.4,'sine',.035); break;
   case 'arc': R.addFx('arc', { x1:e.x1, y1:e.y1, x2:e.x2, y2:e.y2, life:.22 }); A.tone(880,.08,'square',.02); break;
   case 'meteor': shake = Math.max(shake, 5); A.sweep(200,50,.5,'sawtooth',.04); break;
   case 'slam': case 'enemy-slam': case 'erupt': shake = Math.max(shake, 4.5); A.sweep(110,38,.45,'sine',.035); break;
   case 'telegraph': A.tone(330,.18,'triangle',.016); break;
   case 'enemy-shot': A.tone(420,.12,'sawtooth',.016); break;
   case 'blink': case 'summon': A.sweep(300,600,.22,'sine',.02); break;
   case 'beacon-lit': save(); UI.banner('A light in the mist'); A.tone(660,.8); break;
   case 'chop': A.noise(.06,.02,800); break;
   case 'pickup': A.tone(580,.08,'sine',.018); break;
   case 'spell': {
    const s = SPELLS[e.id];
    R.addFx('ring', { x:game.player.x, y:game.player.y, r:s.radius||120, color:s.color, life:.45 });
    A.sweep(240, e.id === 'frost' ? 700 : 120, .45, e.id === 'bolt' ? 'square' : 'triangle', .035);
    break; }
   case 'super': {
    shake = 6; hitstop = .09;
    R.addFx('ring', { x:game.player.x, y:game.player.y, r:230, color:game.weapon().trail, life:.7 });
    UI.banner(e.name, 'FOCUS');
    A.sweep(120, 700, .6, 'sawtooth', .04); A.tone(880,.7,'triangle',.03,.1);
    break; }
   case 'perfect': A.tone(1200,.18,'sine',.028); break;
   case 'dash': A.noise(.09,.02,2200); break;
   case 'heal': A.tone(440,.4); break;
   case 'craft': A.noise(.14,.04,500); A.tone(380,.3); save(); break;
   case 'upgrade': A.noise(.2,.05,400); A.tone(300,.4,'triangle',.035); A.tone(450,.4,'triangle',.03,.12); save(); break;
   case 'trade': A.tone(700,.12,'sine',.02); save(); break;
   case 'chest': A.tone(520,.25,'triangle',.028); break;
   case 'lamp': A.tone(760,.2,'sine',.022); break;
   case 'locked': A.tone(110,.28,'square',.026); break;
   case 'level': UI.banner('Level ' + game.player.level); A.tone(660,.6); A.tone(880,.7,'sine',.025,.15); break;
   case 'unlock': A.tone(520,.5,'triangle',.03); A.tone(780,.6,'triangle',.025,.16); save(); break;
   case 'equip': save(); break;
   case 'quest-start': UI.banner(e.title, 'NEW WORK'); A.tone(494,.4); save(); break;
   case 'quest-step': A.tone(660,.2,'sine',.022); break;
   case 'quest-done': questDone(e); break;
   case 'bounty': A.tone(440,.3); save(); break;
   case 'bounty-done': A.tone(700,.5); save(); break;
   case 'boss-defeated': bossDown(e); break;
   case 'boss-phase': shake = 5; UI.banner(e.name, 'PHASE ' + ['I','II','III'][e.phase]); A.sweep(90,300,.7,'sawtooth',.035); break;
   case 'zone': arriveZone(e); break;
   case 'respawn': save(); break;
   case 'world-changed': break;
  }
 }
}
function arriveZone(e){
 R.clearFx();
 R.bakeZone(game, e.zone);
 camInit = false;
 A.setTheme(ZONES[e.zone].music);
 UI.banner(e.name, e.sub);
 UI.updateHud();
 save();
 if(e.first) UI.toast('New region discovered · ' + e.name);
}
function questDone(e){
 UI.banner(e.title, 'COMPLETE');
 A.tone(587,.5); A.tone(784,.7,'sine',.028,.16);
 save();
 if(e.id === 'q-deep') ending();
}
function bossDown(e){
 shake = 8; hitstop = .2;
 UI.banner(e.name + ' falls', 'VICTORY');
 A.sweep(300,60,1.1,'sawtooth',.045); A.tone(523,1,'sine',.03,.3); A.tone(784,1.2,'sine',.025,.5);
 save();
 if(e.type === 'bramble') UI.chapterPanel('WHISPERWOOD DEEP','The Bramble Warden','The wood can breathe again.',
  ['It was a guardian once. Something in the ground under it went wrong,','and it spent a hundred years strangling the thing it was made to protect.','In its heart, a seed — still warm.'],
  ['Heartwood Seed recovered','Rootcleaver pattern available from Dain'],'Take the seed to Nima');
 if(e.type === 'devourer') UI.chapterPanel('THE SUNKEN WARRENS','The Warren Devourer','It was digging upward.',
  ['Eleven days Gormel counted in the dark, and you ended it in an afternoon.','The tunnels it made go down further than any mine.','Something down there was telling it where to dig.'],
  ['Moonsteel recovered','Gormel walks out behind you'],'Get him to the surface');
 if(e.type === 'choirlord') UI.chapterPanel('THE ASHEN CRYPT','The Ashen Choirmaster','The singing stops.',
  ['Twelve names on the wall. Twelve people who walked down here believing','the fire under the world wanted them.','It did. That is the part nobody in Hearthgate wants to hear.'],
  ['Ashen cloak taken from the altar','Relic recovered'],'Climb back into the light');
}
function chapterOne(){
 UI.chapterPanel('CHAPTER I COMPLETE','A light in the hollow','Ashvale has a heartbeat again.',
  ['The workshop stands. The roots are quiet.','And in the hollow, a small fire refuses to go out.'],
  [`Level ${game.player.level}`, `${game.player.kills} creatures defeated`, `${Math.floor(game.time/60)} minutes adventured`],
  'On to the Moonfen');
}
function chapterTwo(){
 UI.chapterPanel('CHAPTER II COMPLETE','A brighter horizon','Three beacons. One way home.',
  ['The Moonfen no longer belongs to the mist.','Warm light traces a road back to Ashvale — and west, past the hollow,','a road nobody has walked in two months. Hearthgate is out there.'],
  ['Hearthblade blessing · +8 attack','Faster stamina recovery','3 healing tonics'],
  'Take the west road');
 A.tone(587,.8);
}
function ending(){
 UI.chapterPanel('THE LAST LIGHT','The fire beneath','It was a hearth before it was a throne.',
  ['You walked into the fire under the world and you walked back out of it.',
   'Ashvale is lit. Hearthgate’s gates stand open at night now, which the watch',
   'still finds unnerving. Wren keeps a chair by the fire that nobody else sits in.',
   'The road is open, both ways, for as long as somebody keeps the light.'],
  [`Level ${game.player.level}`, `${game.player.kills} defeated`,
   `${Object.values(game.quests).filter(q=>q.state==='done').length} quests completed`,
   `${Math.floor(game.time/60)} minutes in Ashvale`],
  'Keep the light');
}

// ------------------------------------------------------------------- input
function action(name, ...args){
 if(!started || panel.open) return;
 game[name]?.(...args);
 events(); UI.updateHud();
 canvas.focus({ preventScroll:true });
}
function cycleSpell(dir = 1){
 const owned = SPELL_ORDER.filter(id => game.spells[id]);
 if(owned.length < 2) return;
 const i = owned.indexOf(game.gear.spell);
 game.equip('spell', owned[(i + dir + owned.length) % owned.length]);
 UI.toast('Prepared · ' + game.spellDef().name);
 events(); UI.updateHud();
}

$('#start-btn').onclick = () => {
 if(!ready) return;
 started = true;
 $('#start-screen').remove();
 canvas.focus({ preventScroll:true });
 R.bakeZone(game);
 A.setTheme(ZONES[game.zone].music);
 UI.banner(ZONES[game.zone].name, ZONES[game.zone].sub);
 UI.toast(saved ? 'Welcome back to the hollow.' : 'Find Wren near the hearth. WASD to move · E to speak.');
 UI.updateHud();
};
$('#close-panel').onclick = UI.closePanel;
panel.addEventListener('cancel', () => { keys.clear(); pointerDown = false; heavyDown = false; });
panel.addEventListener('close', () => { keys.clear(); pointerDown = false; heavyDown = false; canvas.focus({ preventScroll:true }); });
panel.addEventListener('click', e => {
 if(e.target !== panel) return;
 const r = panel.getBoundingClientRect();
 if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) UI.closePanel();
});
$('#inventory-btn').onclick = () => started && UI.pack();
$('#journal-btn').onclick = () => started && UI.journal();
$('#map-btn').onclick = () => started && UI.mapPanel();
$('#menu-btn').onclick = () => started && UI.pause();
$('#help-btn').onclick = UI.help;
$('#sound-btn').onclick = () => {
 const on = A.toggle();
 $('#sound-btn span').textContent = on ? 'Sound on' : 'Sound off';
 $('#sound-btn').setAttribute('aria-label', on ? 'Disable sound' : 'Enable sound');
};
$('#touch-interact').onclick = () => action('interact');
document.querySelectorAll('[data-action]').forEach(b => b.onclick = () => {
 const a = b.dataset.action;
 if(a === 'heavy') action('heavyAttack');
 else if(a === 'super') action('useSuper');
 else if(a === 'spell') action('cast');
 else action(a);
});
$('#spell-cycle')?.addEventListener('click', () => started && !panel.open && cycleSpell(1));

const HELD = [' ','arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','z','x','q','r','e','f','c'];
window.addEventListener('keydown', e => {
 if(!started || panel.open){
  if(panel.open && e.key === 'Escape') return;
  return;
 }
 const key = e.key.toLowerCase();
 if(HELD.includes(key)) e.preventDefault();
 if(e.repeat) return;
 keys.add(key);
 if(key === 'z') action('attack');
 else if(key === 'x') action('heavyAttack');
 else if(key === 'e') action('interact');
 else if(key === 'q') action('cast');
 else if(key === 'f') action('useSuper');
 else if(key === 'c') cycleSpell(1);
 else if(key === 'r') action('heal');
 else if(key === ' ') action('dash');
 else if(key === 'i') UI.pack();
 else if(key === 'l') UI.journal();
 else if(key === 'm') UI.mapPanel();
 else if(key === 'escape') UI.pause();
 else if(key === '?' || key === 'h') UI.help();
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); pointerDown = false; heavyDown = false; });
document.addEventListener('visibilitychange', () => { keys.clear(); pointerDown = false; heavyDown = false; if(started) save(); });
window.addEventListener('pagehide', () => { if(started) save(); });

function aimAt(e){
 const r = canvas.getBoundingClientRect();
 game.player.angle = Math.atan2((e.clientY-r.top)/zoom + cam.y - game.player.y, (e.clientX-r.left)/zoom + cam.x - game.player.x);
 game.player.aiming = true; pointerAim = true;
}
canvas.addEventListener('pointerdown', e => {
 if(!started || panel.open || e.pointerType === 'touch') return;
 canvas.setPointerCapture(e.pointerId);
 aimAt(e);
 if(e.button === 2){ heavyDown = true; action('heavyAttack'); }
 else { pointerDown = true; action('attack'); }
});
canvas.addEventListener('pointermove', e => { if(pointerDown || heavyDown) aimAt(e); });
canvas.addEventListener('pointerup', () => { pointerDown = false; heavyDown = false; setTimeout(() => { if(!pointerDown && !heavyDown){ pointerAim = false; game.player.aiming = false; } }, 400); });
canvas.addEventListener('pointercancel', () => { pointerDown = false; heavyDown = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.querySelectorAll('[data-key]').forEach(b => {
 b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); keys.add(b.dataset.key.toLowerCase()); });
 for(const name of ['pointerup','pointercancel','lostpointercapture']) b.addEventListener(name, () => keys.delete(b.dataset.key.toLowerCase()));
});

// -------------------------------------------------------------------- loop
function loop(now){
 let dt = Math.min((now-last)/1000 || .016, .035);
 last = now;
 const t = now/1000;
 if(started && !panel.open && !document.hidden){
  const x = (keys.has('d')||keys.has('arrowright')?1:0) - (keys.has('a')||keys.has('arrowleft')?1:0);
  const y = (keys.has('s')||keys.has('arrowdown')?1:0) - (keys.has('w')||keys.has('arrowup')?1:0);
  if(hitstop > 0) hitstop = Math.max(0, hitstop - dt);
  else {
   const scale = game.slowmo > 0 ? .34 : 1;
   game.update(dt*scale, { x, y, attack: keys.has('z') || pointerDown, aim: pointerAim });
   // Dash afterimages, drawn from whatever the player is wearing.
   if(game.player.dash > 0){
    ghostTimer -= dt;
    if(ghostTimer <= 0){ ghostTimer = .035; R.addFx('ghost', { x:game.player.x, y:game.player.y, sprite:R.playerSprite(game), life:.24 }); }
   }
  }
  events();
  saveTimer += dt;
  if(saveTimer > 15){ save(); saveTimer = 0; }
 }
 R.stepFx(dt);
 shake = Math.max(0, shake - dt*18);

 // Camera: follow with a little lead in the direction you are facing.
 const p = game.player, cw = canvas.width, ch = canvas.height;
 const def = ZONES[game.zone], fw = def.w*TILE, fh = def.h*TILE;
 const leadX = Math.cos(p.angle)*34, leadY = Math.sin(p.angle)*24;
 const tx = clamp(p.x + leadX - cw/2, 0, Math.max(0, fw-cw));
 const ty = clamp(p.y + leadY - ch*.54, 0, Math.max(0, fh-ch));
 if(!camInit){ cam.x = tx; cam.y = ty; camInit = true; }
 else { const k = Math.min(1, dt*7.5); cam.x += (tx-cam.x)*k; cam.y += (ty-cam.y)*k; }

 R.renderScene(ctx, game, cam, cw, ch, t, { shake });
 prompt(cw, ch);

 hudTimer += dt;
 if(hudTimer > .12){ UI.updateHud(); hudTimer = 0; }
 requestAnimationFrame(loop);
}
function prompt(cw, ch){
 const el = $('#interact-prompt');
 const near = started && !panel.open ? game.nearest() : null;
 if(!near){ el.style.display = 'none'; return; }
 el.style.display = 'block';
 el.querySelector('span').textContent = game.promptFor(near);
 el.style.left = clamp((near.x-cam.x)/cw*100, 18, 82) + '%';
 el.style.top = clamp((near.y-cam.y+22)/ch*100, 26, 78) + '%';
}
requestAnimationFrame(loop);
UI.updateHud();

// --------------------------------------------------- optional WebMCP tools
if(document.modelContext?.registerTool){
 const controller = new AbortController();
 const register = t => { try { Promise.resolve(document.modelContext.registerTool(t, { signal:controller.signal })).catch(()=>{}); } catch {} };
 register({ name:'read_adventure', description:'Read the current player health, gear, supplies and quest progress in Ashvale.',
  inputSchema:{ type:'object', properties:{}, additionalProperties:false }, annotations:{ readOnlyHint:true },
  execute: () => ({ health:game.player.hp, level:game.player.level, region:ZONES[game.zone].name,
   weapon:WEAPONS[game.gear.weapon].name, outfit:game.gear.outfit, supplies:{ ...game.bag },
   milestones:{ ...game.flags },
   quests:Object.fromEntries(Object.entries(game.quests).map(([k,v]) => [k, v.state])) }) });
 register({ name:'open_adventure_journal', description:'Open the quest journal in the game. Does not complete any quests.',
  inputSchema:{ type:'object', properties:{}, additionalProperties:false }, annotations:{ readOnlyHint:false },
  execute: () => { if(!started) throw new Error('Enter the hollow first.'); UI.journal(); return { opened:'journal' }; } });
 window.addEventListener('pagehide', () => controller.abort(), { once:true });
}
