// All DOM: the HUD, the panels and the readouts. Talks to the model through
// the model's own action methods so keys, buttons and panels agree.
import {
 TILE, ITEMS, ITEM_ORDER, ITEM_ART, WEAPONS, WEAPON_ORDER, OUTFITS, OUTFIT_ORDER,
 SPELLS, SPELL_ORDER, SUPERS, RECIPES, ENEMIES, QUESTS, NPCS, SHOPS,
 SELL_PRICE, BOUNTIES, MAX_UPGRADE, ZONES
} from './core.mjs';
import { ZONE_LABELS } from './data/world.mjs';
import { drawMap } from './render.mjs';

const $ = s => document.querySelector(s);
let app = null, lastFocus = null, tab = 'items';
const chatter = {};   // how many times we have spoken to each person this session
export function initUI(a){ app = a; }
const G = () => app.game;

export function art(i){ return `<span class="sprite item-art" data-sprite="${i}"></span>`; }
export function spriteCSS(){
 document.querySelectorAll('[data-sprite]').forEach(el => {
  const i = +el.dataset.sprite;
  el.style.backgroundPosition = `${i%4*100/3}% ${Math.floor(i/4)*100/3}%`;
 });
}
export function openPanel(title, eyebrow, html){
 const panel = $('#panel');
 lastFocus = document.activeElement;
 $('#panel-title').textContent = title;
 $('#panel-eyebrow').textContent = eyebrow;
 $('#panel-content').innerHTML = html;
 app.clearInput();
 if(!panel.open) panel.showModal();
 $('#panel-content').scrollTop = 0;
 spriteCSS();
}
export function closePanel(){
 $('#panel').close();
 if(app.started()) $('#world').focus({ preventScroll:true }); else lastFocus?.focus();
}
export function toast(text){
 const el = document.createElement('div');
 el.className = 'toast'; el.textContent = text;
 $('#toasts').append(el);
 while($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
 setTimeout(() => el.remove(), 4200);
}
export function banner(text, sub = ''){
 $('#area-banner').innerHTML = `<b>${text}</b>${sub ? `<i>${sub}</i>` : ''}`;
 $('#area-banner').style.opacity = 1;
 clearTimeout(banner.t);
 banner.t = setTimeout(() => $('#area-banner').style.opacity = 0, 3200);
}

// =========================================================================
// HUD
// =========================================================================
let lastArea = '';
export function updateHud(){
 const g = G(), p = g.player;
 $('#health-fill').style.width = p.hp/p.maxHp*100 + '%';
 $('#health-label').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
 $('#stamina-fill').style.width = p.stamina + '%';
 $('#xp-fill').style.width = p.xp/(p.level*70)*100 + '%';
 $('#focus-fill').style.width = p.focus + '%';
 $('#focus-meter').classList.toggle('ready', p.focus >= 100);
 $('#level').textContent = p.level;
 $('#level-text').textContent = 'Level ' + p.level;
 $('#potion-count').textContent = g.bag.potion + (g.bag.elixir ? '+' + g.bag.elixir : '');
 $('#spell-cooldown').style.height = p.spell/(g.spellDef().cooldown||1)*100 + '%';
 $('#spell-name').textContent = g.spellDef().name.split(' ')[0];
 $('#weapon-name').textContent = g.weapon().short ?? g.weapon().name;
 $('#coin-count').textContent = g.bag.coin;
 $('#resource-summary').textContent = `${g.bag.wood} timber · ${g.bag.stone} stone · ${g.bag.iron} iron`;
 $('#shield-pip').hidden = p.shield <= 0;
 $('#shield-pip').textContent = '✦ ' + Math.ceil(p.shield);

 const q = g.trackedQuest();
 if(q){
  $('#quest-title').textContent = q.title;
  $('#quest-detail').textContent = q.summary;
  $('#quest-progress').innerHTML = g.questProgress(q).map(s => `${s.done?'✓':'◇'} ${s.text}`).join('<br>');
 } else {
  $('#quest-title').textContent = g.flags.ending ? 'The fire is out' : 'No work in hand';
  $('#quest-detail').textContent = g.flags.ending
   ? 'Ashvale stands. Hearthgate stands. The road is open both ways.'
   : 'Talk to the people of Hearthgate, or read the board in the Wayfarers’ Hall.';
  $('#quest-progress').innerHTML = '';
 }

 const def = ZONES[g.zone];
 $('#location').textContent = localName(g);
 $('#location-sub').textContent = def.sub;
 if(localName(g) !== lastArea){ if(lastArea && app.started()) banner(localName(g), def.sub); lastArea = localName(g); }
 drawMap(g, $('#minimap'));

 const combo = $('#combo-readout');
 const set = g.swingSet(), swing = g.currentSwing();
 combo.classList.toggle('visible', p.comboTimer > 0 || p.attack > 0);
 combo.innerHTML = `<span>${set.map((_,i) => `<i class="${i<=p.combo&&!p.heavy?'lit':''}"></i>`).join('')}</span> ${swing.name}${p.heavy ? ' · HEAVY' : p.combo === set.length-1 ? ' · FINISHER' : ''}`;

 const boss = g.here().find(e => ENEMIES[e.type].boss && e.hp > 0 && Math.hypot(e.x-p.x, e.y-p.y) < 560);
 const bar = $('#boss-bar');
 bar.hidden = !boss;
 if(boss){
  $('#boss-name').textContent = ENEMIES[boss.type].name;
  $('#boss-fill').style.width = Math.max(0, boss.hp/boss.maxHp*100) + '%';
  $('#boss-phase').textContent = ['I','II','III'][boss.phaseN ?? 0] ?? 'I';
 }
 $('.chapter').innerHTML = `${chapterName(g)} <span> / </span> ${def.name.toUpperCase()}`;
 $('#footer-time').textContent = `DAY ${Math.floor(g.time/420)+1} · ${g.dayLabel()}`;
}
function chapterName(g){
 if(g.flags.ending) return 'THE LAST LIGHT';
 if(g.questDone('q-warren')) return 'THE FIRE BENEATH';
 if(g.questDone('q-choir')) return 'WHAT DIGS UPWARD';
 if(g.questDone('q-road')) return 'THE ASHEN CHOIR';
 if(g.flags.beacons) return 'THE WEST ROAD';
 if(g.flags.hearth) return 'THE LIGHTS BEYOND';
 return 'THE HOLLOW WAKES';
}
function localName(g){
 const p = g.player;
 if(g.zone !== 'vale') return ZONES[g.zone].name;
 if(p.x > 59*TILE && p.y > 28*TILE) return 'The Moonfen';
 if(p.x > 56*TILE && p.y < 27*TILE) return 'The Rootvault';
 if(p.x > 43*TILE) return 'Whisperwood';
 return 'Ashvale Hollow';
}

// =========================================================================
// The pack: items, weapons, outfits, spells, crafting
// =========================================================================
const TABS = [['items','Pack'],['weapons','Weapons'],['outfits','Wardrobe'],['spells','Spells'],['craft','Workbench']];
export function pack(which){
 const g = G();
 if(which) tab = which;
 const body = tab === 'weapons' ? weaponsTab(g) : tab === 'outfits' ? outfitsTab(g)
  : tab === 'spells' ? spellsTab(g) : tab === 'craft' ? craftTab(g) : itemsTab(g);
 openPanel('The wayfarer’s pack', 'INVENTORY & GEAR', `
  <div class="tabs">${TABS.map(([id,label]) => `<button data-tab="${id}" class="${tab===id?'on':''}">${label}</button>`).join('')}</div>
  <div class="stats">
   <span>Level ${g.player.level}</span>
   <span>Attack ${g.attackPower()}</span>
   <span>Armour ${g.armour()}</span>
   <span>${g.bag.coin} ember marks</span>
   <span>${g.player.kills} defeated</span>
  </div>${body}`);
 document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => pack(b.dataset.tab));
 wireActions();
}
function itemsTab(g){
 const owned = ITEM_ORDER.filter(k => g.bag[k] > 0);
 return `<div class="inventory-grid">${
  (owned.length ? owned : ['wood','stone','herb','essence']).map(k =>
   `<div class="item-card">${art(ITEM_ART[k] ?? 4)}<b>${ITEMS[k]}</b><strong>${g.bag[k]}</strong></div>`).join('')
 }</div>
 <p>You carry <b>${g.bag.potion} healing tonics</b>${g.bag.elixir?` and <b>${g.bag.elixir} greater elixirs</b>`:''}${g.bag.core?' and the <span class="win">Heart Spark</span>':''}.</p>
 ${g.bag.seed?'<p class="win">You carry the Heartwood Seed.</p>':''}
 ${g.bag.warrenkey?'<p class="win">You carry the Warren sigil \u2014 the deep stair will open for you.</p>':''}
 ${g.flags.beacons?'<p class="win">Hearthblade blessing · +8 attack, faster stamina recovery.</p>':''}
 <p class="muted">Strike trees, ore, iron, coal, crystal and cinder with your weapon to gather. Silk, mushrooms and bones are taken by hand with <b>E</b>. Sell spare material to Corvin in the Hearthgate market.</p>`;
}
function weaponsTab(g){
 const owned = WEAPON_ORDER.filter(id => id in g.weapons);
 return `<div class="gear-list">${owned.map(id => {
  const w = WEAPONS[id], lv = g.weaponLevel(id), on = g.gear.weapon === id;
  return `<div class="gear-card ${on?'equipped':''}">
   <div class="gear-head"><h4>${w.name}${lv?` <em>+${lv}</em>`:''}</h4><span class="kind">${w.kind}</span></div>
   <p>${w.desc}</p>
   <div class="gear-stats"><span>Attack ${Math.round(w.power*(1+lv*.12))}</span><span>${(SUPERS[w.kind]??SUPERS.sword).name}</span>${w.perkText?`<span class="perk">${w.perkText}</span>`:''}</div>
   <button data-equip="weapon" data-id="${id}" ${on?'disabled':''}>${on?'Equipped':'Equip'}</button>
  </div>`; }).join('')}</div>
 ${owned.length < WEAPON_ORDER.length ? '<p class="muted">More weapons are forged at Dain’s anvil in Hearthgate, or earned from the people who need them made.</p>' : '<p class="win">You have found every weapon in Ashvale.</p>'}`;
}
function outfitsTab(g){
 const owned = OUTFIT_ORDER.filter(id => g.outfits[id]);
 return `<div class="gear-list">${owned.map(id => {
  const o = OUTFITS[id], on = g.gear.outfit === id;
  return `<div class="gear-card ${on?'equipped':''}">
   <div class="gear-head"><h4>${o.name}</h4><span class="swatch" style="background:hsl(${o.hue},45%,45%)"></span></div>
   <p>${o.desc}</p><div class="gear-stats"><span class="perk">${o.perkText}</span></div>
   <button data-equip="outfit" data-id="${id}" ${on?'disabled':''}>${on?'Worn':'Wear'}</button>
  </div>`; }).join('')}</div>
 ${owned.length < OUTFIT_ORDER.length ? '<p class="muted">Lys works her loom in Hearthgate. Bring her silk, leather and stranger things.</p>' : '<p class="win">Your wardrobe is complete.</p>'}`;
}
function spellsTab(g){
 const owned = SPELL_ORDER.filter(id => g.spells[id]);
 const sup = SUPERS[g.weapon().kind] ?? SUPERS.sword;
 return `<div class="gear-list">${owned.map(id => {
  const s = SPELLS[id], on = g.gear.spell === id;
  return `<div class="gear-card ${on?'equipped':''}">
   <div class="gear-head"><h4>${s.name}</h4><span class="kind">${s.cost} stamina</span></div>
   <p>${s.desc}</p><div class="gear-stats"><span>Cooldown ${s.cooldown}s</span>${s.power?`<span>Power ${s.power}</span>`:''}</div>
   <button data-equip="spell" data-id="${id}" ${on?'disabled':''}>${on?'Prepared':'Prepare'}</button>
  </div>`; }).join('')}</div>
 <h3>Focus · ${sup.name}</h3>
 <p>${sup.desc} Your focus fills as you land hits and time your dodges. At full focus press <b>F</b>.</p>
 <div class="meter focus wide"><div style="width:${g.player.focus}%"></div></div>
 ${owned.length < SPELL_ORDER.length ? '<p class="muted">Sera, Nima and Brother Aldric each teach something. So does the deep.</p>' : ''}`;
}
function craftTab(g){
 return `<h3>At your own pack</h3>${recipeRows(g,'pack')}
  <p class="muted">Heavier work needs a bench: Dain’s anvil forges and upgrades weapons, Lys’s loom makes outfits, Sera’s stillroom brews elixirs. Walk up to one and press <b>E</b>.</p>`;
}
function recipeRows(g, station){
 const rows = Object.entries(RECIPES).filter(([id,r]) => r.at === station && g.recipeKnown(id));
 if(!rows.length) return '<p class="muted">Nothing here you know how to make yet.</p>';
 return rows.map(([id,r]) => {
  const cost = g.recipeCost(id), have = g.has(cost);
  const owned = (r.weapon && r.weapon in g.weapons) || (r.outfit && g.outfits[r.outfit]);
  return `<div class="recipe"><div><h4>${r.name}</h4><p>${r.text}</p>
   <p class="cost">${Object.entries(cost).map(([k,v]) => `<span class="${(g.bag[k]||0)>=v?'ok':'short'}">${v} ${ITEMS[k]}</span>`).join('')}</p></div>
   <button data-craft="${id}" data-station="${station}" ${owned||!have?'disabled':''}>${owned?'Owned':'Make'}</button></div>`;
 }).join('');
}
function wireActions(){
 document.querySelectorAll('[data-craft]').forEach(b => b.onclick = () => {
  G().craft(b.dataset.craft, b.dataset.station); app.flush();
  if(b.dataset.station === 'pack') pack(); else station(b.dataset.station);
 });
 document.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => {
  G().equip(b.dataset.equip, b.dataset.id); app.flush(); pack();
 });
 document.querySelectorAll('[data-upgrade]').forEach(b => b.onclick = () => {
  G().upgradeWeapon(b.dataset.upgrade); app.flush(); station('forge');
 });
 document.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
  G().buy(b.dataset.shop, b.dataset.buy); app.flush(); shop(b.dataset.shop);
 });
 document.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => {
  G().sell(b.dataset.sell, +b.dataset.n || 1); app.flush(); shop(b.dataset.shop);
 });
}

// =========================================================================
// Workbenches and trade
// =========================================================================
export function station(kind){
 const g = G();
 if(kind === 'forge'){
  const owned = WEAPON_ORDER.filter(id => id in g.weapons);
  openPanel('Dain’s anvil', 'THE FORGE', `
   <p>The coals are white at the centre. Everything here is heavier when you pick it back up.</p>
   <h3>Temper a weapon</h3>
   <div class="gear-list">${owned.map(id => {
    const w = WEAPONS[id], lv = g.weaponLevel(id), cost = g.upgradeCost(id);
    return `<div class="gear-card"><div class="gear-head"><h4>${w.name}${lv?` <em>+${lv}</em>`:''}</h4><span class="kind">${lv}/${MAX_UPGRADE}</span></div>
     <div class="gear-stats"><span>Attack ${Math.round(w.power*(1+lv*.12))}${cost?` → ${Math.round(w.power*(1+(lv+1)*.12))}`:''}</span></div>
     ${cost?`<p class="cost">${Object.entries(cost).map(([k,v])=>`<span class="${(g.bag[k]||0)>=v?'ok':'short'}">${v} ${ITEMS[k]}</span>`).join('')}</p>`:'<p class="cost"><span class="ok">Fully tempered</span></p>'}
     <button data-upgrade="${id}" ${!cost||!g.has(cost)?'disabled':''}>Temper +${lv+1}</button></div>`;
   }).join('')}</div>
   <h3>Forge a weapon</h3>${recipeRows(g,'forge')}
   ${g.flags.forgeDiscount?'<p class="win">Dain’s standing discount · 10% off everything made here.</p>':''}`);
 } else if(kind === 'loom'){
  openPanel('Lys’s loom', 'THE WARDROBE', `<p>Thread, hide and whatever you dragged out of the dark. Lys does not ask where things came from.</p>${recipeRows(g,'loom')}`);
 } else {
  openPanel('The stillroom bench', 'ALCHEMY', `<p>Copper, glass and a smell you will not get out of your coat.</p>${recipeRows(g,'alchemy')}`);
 }
 wireActions();
}
export function shop(id){
 const g = G(), s = SHOPS[id];
 if(!s) return;
 const sellable = Object.keys(SELL_PRICE).filter(k => g.bag[k] > 0);
 openPanel(s.name, 'TRADE · ' + g.bag.coin + ' EMBER MARKS', `
  <h3>For sale</h3>
  ${s.stock.map(row => `<div class="recipe"><div><h4>${ITEMS[row.item]}</h4><p>${row.price} ember marks</p></div>
   <button data-buy="${row.item}" data-shop="${id}" ${g.bag.coin < row.price ? 'disabled':''}>Buy</button></div>`).join('')}
  <h3>They will buy</h3>
  ${sellable.length ? sellable.map(k => `<div class="recipe"><div><h4>${ITEMS[k]} × ${g.bag[k]}</h4><p>${SELL_PRICE[k]} marks each</p></div>
   <span class="sell-group"><button data-sell="${k}" data-n="1" data-shop="${id}">Sell 1</button>
   <button data-sell="${k}" data-n="${g.bag[k]}" data-shop="${id}">Sell all</button></span></div>`).join('')
   : '<p class="muted">You have nothing spare to sell.</p>'}`);
 wireActions();
}

// =========================================================================
// People
// =========================================================================
export function dialogue(npcId){
 const g = G(), topics = g.talkTo(npcId), npc = NPCS[npcId];
 if(!npc) return;
 const ready = topics.ready[0], offer = topics.offers[0], active = topics.active[0];
 let line, body = '', actions = '';
 if(ready){
  line = ready.done ?? '“That’s done, then. Good.”';
  const r = ready.reward ?? {};
  body = `<div class="journal-entry done"><div class="tag">✓ ${ready.title.toUpperCase()}</div>
   <p>${g.questProgress(ready).map(s=>`✓ ${s.text}`).join('<br>')}</p>
   <p class="reward">${rewardText(r)}</p></div>`;
  actions = `<button class="primary" id="quest-claim">Hand it in</button>`;
 } else if(offer){
  line = offer.brief ?? offer.summary;
  body = `<div class="journal-entry"><div class="tag">NEW WORK</div><h3>${offer.title}</h3><p>${offer.summary}</p>
   <p>${offer.steps.map(s=>`◇ ${s.text}`).join('<br>')}</p>
   <p class="reward">${rewardText(offer.reward ?? {})}</p></div>`;
  actions = `<button class="primary" id="quest-accept">I’ll do it</button><button id="quest-decline">Not yet</button>`;
 } else if(active){
  line = '“Still working on it? No shame in that. Come back when it’s done.”';
  body = `<div class="journal-entry"><div class="tag">IN HAND</div><h3>${active.title}</h3>
   <p>${g.questProgress(active).map(s=>`${s.done?'✓':'◇'} ${s.text}`).join('<br>')}</p></div>`;
  actions = `<button class="primary" id="dialogue-done">Right you are.</button>`;
 } else {
  // Rotate through what this person has to say, so talking twice is not the
  // same conversation twice.
  const lines = npc.idle ?? ['“Good road to you.”'];
  const seen = (chatter[npcId] = (chatter[npcId] ?? -1) + 1);
  line = npcId === 'wren' ? wrenLine(g) : lines[seen % lines.length];
  actions = `<button class="primary" id="dialogue-done">${npcId === 'wren' && topics.chapter ? 'I\u2019ll see what I can do.' : 'Good road to you.'}</button>`;
 }
 // Whoever is carrying the current chapter shows where it stands.
 if(topics.chapter && !ready && !offer){
  body = `<div class="journal-entry"><div class="tag">THE MAIN ROAD</div><h3>${topics.chapter.title}</h3>
   <p>${g.questProgress(topics.chapter).map(s=>`${s.done?'\u2713':'\u25c7'} ${s.text}`).join('<br>')}</p></div>` + body;
 }

 const extras = [];
 if(npc.shop) extras.push(`<button id="npc-shop">Trade</button>`);
 if(npc.forge && g.flags.forgeOpen) extras.push(`<button id="npc-forge">Use the anvil</button>`);
 if(npc.loom && g.flags.loomOpen) extras.push(`<button id="npc-loom">Use the loom</button>`);
 if(npc.alchemy) extras.push(`<button id="npc-alchemy">Use the bench</button>`);
 if(npc.board) extras.push(`<button id="npc-board">Read the board</button>`);
 extras.push(`<button id="dialogue-journal">Journal</button>`);

 openPanel(npc.name, npc.title.toUpperCase(), `
  <div class="dialogue-speaker"><span class="sprite portrait-sprite" data-sprite="${npc.art}" style="filter:hue-rotate(${npc.hue}deg)"></span><blockquote>${line}</blockquote></div>
  ${body}<div class="dialogue-actions">${actions}${extras.join('')}</div>`);
 const close = () => { closePanel(); app.save(); };
 $('#dialogue-done')?.addEventListener('click', close);
 $('#quest-decline')?.addEventListener('click', close);
 $('#quest-accept')?.addEventListener('click', () => { g.startQuest(offer.id); app.flush(); toast('Quest accepted · ' + offer.title); dialogue(npcId); });
 $('#quest-claim')?.addEventListener('click', () => { g.completeQuest(ready.id); app.flush(); dialogue(npcId); });
 $('#npc-shop')?.addEventListener('click', () => shop(npc.shop));
 $('#npc-forge')?.addEventListener('click', () => station('forge'));
 $('#npc-loom')?.addEventListener('click', () => station('loom'));
 $('#npc-alchemy')?.addEventListener('click', () => station('alchemy'));
 $('#npc-board')?.addEventListener('click', board);
 $('#dialogue-journal')?.addEventListener('click', journal);
 updateHud();
}
function wrenLine(g){
 const f = g.flags;
 if(!f.cottage) return '“A village isn’t its stones, stranger. It’s the people willing to put them back. Help me mend the workshop, and we might yet bring a little warmth to this hollow.”';
 if(!f.boss) return '“There’s a spark under the old roots. The creature that swallowed it won’t give it up easily. Cross our eastern bridge and follow the northward path. Take a tonic or two.”';
 if(!f.hearth) return '“You found it. I can feel the warmth from here. Bring it to the hearth. Let’s give this place a tomorrow.”';
 if(!f.beacons) return '“Our fire is only the beginning. Three beacons once guided travellers through the Moonfen. Take our light east, clear the cinder wisps, and feed each lantern two pinches of ember dust.”';
 if(!g.visited.town) return '“The beacons are burning — which means the west road is walkable again. Hearthgate is out that way. They have not answered a letter in two months.”';
 return '“Go on, then. Whatever’s out there, it has never met anyone like you. Come back and tell me about it.”';
}
function rewardText(r){
 const bits = [];
 if(r.xp) bits.push(r.xp + ' experience');
 if(r.coin) bits.push(r.coin + ' ember marks');
 for(const [k,n] of Object.entries(r.items ?? {})) bits.push(`${n} ${ITEMS[k]}`);
 if(r.weapon) bits.push(WEAPONS[r.weapon].name);
 if(r.outfit) bits.push(OUTFITS[r.outfit].name);
 if(r.spell) bits.push(SPELLS[r.spell].name + ' (spell)');
 if(r.recipe) bits.push((RECIPES[r.recipe]?.name ?? r.recipe) + ' (pattern)');
 return bits.length ? 'Reward · ' + bits.join(' · ') : 'Reward · their goodwill, which counts for more here than you think.';
}

export function journal(){
 const g = G();
 const group = (title, list) => list.length ? `<h3>${title}</h3>` + list.map(q => {
  const state = g.questDone(q.id) ? 'done' : g.questActive(q.id) ? '' : 'locked';
  const tag = g.questDone(q.id) ? '✓ COMPLETE' : g.questReady(q.id) ? '★ READY' : g.questActive(q.id) ? 'IN HAND' : 'NOT YET';
  return `<div class="journal-entry ${state}"><div class="tag">${tag}</div><h3>${q.title}</h3>
   <p>${q.summary}</p>
   ${g.quests[q.id] ? `<p>${g.questProgress(q).map(s=>`${s.done?'✓':'◇'} ${s.text}`).join('<br>')}</p>` : ''}
   ${q.giver && !g.questDone(q.id) ? `<p class="muted">Speak to ${NPCS[q.giver]?.name ?? q.giver}${NPCS[q.giver] ? ' · ' + ZONES[NPCS[q.giver].zone].name : ''}.</p>` : ''}
  </div>`;
 }).join('') : '';
 const known = QUESTS.filter(q => g.quests[q.id] || g.questOpen(q));
 openPanel('The road so far', 'QUEST JOURNAL', `
  <p>There used to be a light in every window. Wren believed there could be again. She was right, and it has turned out to be the smallest part of it.</p>
  ${group('The main road', known.filter(q => q.main))}
  ${group('Work taken on', known.filter(q => !q.main))}
  ${g.bounty ? `<h3>Bounty</h3><div class="journal-entry"><div class="tag">${g.bounty.killed>=g.bounty.count?'★ READY':'IN HAND'}</div>
   <h3>${BOUNTIES.find(b=>b.id===g.bounty.id)?.name}</h3><p>${g.bounty.killed} / ${g.bounty.count} · claim it at the Wayfarers’ Hall.</p></div>` : ''}`);
}
export function board(){
 const g = G();
 openPanel('The work board', 'WAYFARERS’ HALL', `
  <p>Nailed, re-nailed and written over. The Hall pays on completion, in ember marks, no questions asked about method.</p>
  ${g.bounty ? `<div class="journal-entry"><div class="tag">${g.bounty.killed>=g.bounty.count?'★ READY':'IN HAND'}</div>
   <h3>${BOUNTIES.find(b=>b.id===g.bounty.id)?.name}</h3><p>${g.bounty.killed} / ${g.bounty.count}</p>
   <button class="primary" id="claim-bounty" ${g.bounty.killed>=g.bounty.count?'':'disabled'}>Claim payment</button></div>` : ''}
  ${BOUNTIES.map(b => `<div class="recipe"><div><h4>${b.name}</h4><p>${b.count} ${ENEMIES[b.enemy].name} · ${b.coin} marks, ${b.xp} experience</p></div>
   <button data-bounty="${b.id}" ${g.bounty?'disabled':''}>Take</button></div>`).join('')}`);
 $('#claim-bounty')?.addEventListener('click', () => { g.claimBounty(); app.flush(); board(); });
 document.querySelectorAll('[data-bounty]').forEach(b => b.onclick = () => { g.takeBounty(b.dataset.bounty); app.flush(); board(); });
}

// =========================================================================
// Reference panels
// =========================================================================
export function mapPanel(){
 const g = G();
 const roads = g.roadsOut();
 // Naming every road out of the region you are standing in, with its tile
 // coordinates, so a waystone can never be sitting somewhere you never look.
 const roadList = roads.length ? `<h3>Roads from here</h3><div class="road-list">${roads.map(r => `
   <div class="road ${r.sealed ? 'sealed' : ''}">
    <b>${r.door ? '\u25a2' : '\u25c8'} ${r.label}</b>
    <span>to <em>${r.name}</em>${r.sealed ? ' \u00b7 sealed' : r.visited ? '' : ' \u00b7 not yet visited'}</span>
    <i>${r.sub ?? ''}</i>
    <small>on the map at ${r.tx}, ${r.ty}</small>
   </div>`).join('')}</div>`
  : '<h3>Roads from here</h3><p class="muted">No way onward from this room but the door you came in by.</p>';
 openPanel(ZONES[g.zone].name, 'MAP \u00b7 ' + ZONES[g.zone].sub, `
  <canvas id="big-map" width="560" height="${Math.round(560*ZONES[g.zone].h/ZONES[g.zone].w)}" aria-label="Map of ${ZONES[g.zone].name}"></canvas>
  <div class="map-legend"><span><i style="background:#f8eace"></i>You</span><span><i style="background:#8fd6c0"></i>Roads out</span>
   <span><i style="background:#e9c880"></i>Work offered</span><span><i style="background:#8fd6a8"></i>Ready to hand in</span><span><i style="background:#d77486"></i>Something large</span></div>
  ${roadList}
  <h3>The world, and how it joins up</h3>
  <div class="help-grid">${[
   ['Ashvale Hollow', 'vale', 'Where you started. Wren, the hearth, the garden. The Moonfen and its beacons lie east past the bridge; the Rootvault is the stone country north-east.'],
   ['Hearthgate', 'town', 'Take the <b>west road</b> out of the hollow \u2014 the lit waystone on the path at the far west edge. The forge, the loom, the market, the Hall, and the crypt under the chapel.'],
   ['Whisperwood Deep', 'forest', 'The <b>Whisperwood trail</b> north of the hollow, or Hearthgate\u2019s north postern. Wolves, silkbacks, and the Warden\u2019s grove.'],
   ['The Ashen Crypt', 'crypt', 'The crypt stair beside Hearthgate\u2019s chapel.'],
   ['The Sunken Warrens', 'warren', 'The cave mouth in the north-east of Whisperwood. Iron, coal, crystal, and worse.'],
   ['The Emberdeep', 'deep', 'The deep stair at the top of the Warrens. Sealed until the Devourer gives up its sigil.']
  ].map(([n,id,d]) => `<span class="${g.visited[id] ? 'been' : ''}"><b>${n}</b>${g.visited[id] ? ' \u2713' : ''}<br>${d}</span>`).join('')}</div>`);
 drawMap(g, $('#big-map'), true, ZONE_LABELS[g.zone] ?? []);
}
export function help(){
 openPanel('Finding your feet', 'HOW TO PLAY', `
  <div class="help-grid">
   <span><kbd>WASD / ↑↓←→</kbd> Move</span><span><kbd>Z / Click</kbd> Attack &amp; gather</span>
   <span><kbd>X / Right click</kbd> Heavy strike</span><span><kbd>E</kbd> Talk, open, travel</span>
   <span><kbd>Space</kbd> Dodge</span><span><kbd>Q</kbd> Cast spell</span>
   <span><kbd>C</kbd> Next spell</span><span><kbd>F</kbd> Focus attack</span>
   <span><kbd>R</kbd> Drink tonic</span><span><kbd>I</kbd> Pack &amp; gear</span>
   <span><kbd>L</kbd> Journal</span><span><kbd>M</kbd> Map</span><span><kbd>Esc</kbd> Pause</span>
  </div>
  <h3>Fighting well</h3>
  <p>Tap or hold <b>Z</b> to chain your weapon’s combo. Each weapon has its own chain: a sword cuts three times, a dagger four, a greatsword twice and much harder. The last hit of a chain is the finisher — more damage, more reach, more stagger, and it breaks resource nodes in one go.</p>
  <p><b>X</b> is a committed heavy strike. It costs stamina, it cannot be cancelled, and it staggers almost anything. Use it on something that is winding up, not on something already swinging.</p>
  <p>Enemies telegraph before they commit. A ring on the ground means a slam; a dotted line means a shot. <b>Space</b> dodges through both, and a dodge at the last moment refunds focus and slows the world for a beat.</p>
  <p>Every hit fills <b>focus</b>. At full focus, <b>F</b> unleashes your weapon’s own focus attack — different for every weapon class.</p>
  <h3>Getting stronger</h3>
  <p>Weapons are forged at Dain’s anvil and tempered up to <b>+5</b> there. Outfits come from Lys’s loom and change armour, speed, spell power and critical chance. Spells are taught by Sera, Nima and Brother Aldric. Nothing is missable: every weapon, outfit and spell can still be obtained after the story ends.</p>
  <h3>Getting around</h3>
  <p>Waystones on the roads take you between regions — walk up and press <b>E</b>. Doors work the same way. The world map (<b>M</b>) always shows the region you are standing in.</p>
  <p class="muted">On touch screens, use the direction pad and action buttons. The game pauses while a panel is open or this tab is hidden. Progress saves on this browser every 15 seconds and after milestones.</p>`);
}
export function pause(){
 const g = G();
 openPanel('A moment by the fire', 'PAUSED', `
  <div class="stats"><span>Level ${g.player.level}</span><span>${g.player.kills} defeated</span>
   <span>${Math.floor(g.time/60)} minutes</span><span>${Object.values(g.quests).filter(q=>q.state==='done').length} quests done</span></div>
  <div class="menu-actions">
   <button class="primary" id="resume-btn">Return to Ashvale</button>
   <button id="save-btn">Save adventure</button>
   <button id="controls-btn">Controls &amp; help</button>
   <button id="new-btn" class="danger">Start a new adventure</button>
  </div>`);
 $('#resume-btn').onclick = closePanel;
 $('#save-btn').onclick = () => toast(app.save() ? 'Adventure saved on this browser.' : 'This browser could not save your adventure.');
 $('#controls-btn').onclick = help;
 $('#new-btn').onclick = () => {
  openPanel('Leave this adventure?', 'START AGAIN',
   '<p>This replaces your saved adventure on this browser. Your current progress will be lost.</p>' +
   '<div class="dialogue-actions"><button id="cancel-reset">Keep my adventure</button><button class="danger" id="confirm-reset">Start again</button></div>');
  $('#cancel-reset').onclick = pause;
  $('#confirm-reset').onclick = () => app.reset();
 };
}

// Story panels -------------------------------------------------------------
export function chapterPanel(eyebrow, title, headline, lines, stats, button){
 openPanel(title, eyebrow, `<div style="text-align:center">
  <h3 class="win">${headline}</h3><p>${lines.join('<br>')}</p>
  ${stats?.length ? `<div class="stats" style="justify-content:center">${stats.map(s=>`<span>${s}</span>`).join('')}</div>` : ''}
  <p class="muted">Your progress is saved on this browser.</p>
  <button class="primary" id="chapter-done">${button}</button></div>`);
 $('#chapter-done').onclick = closePanel;
}
export function repairPanel(){
 const g = G();
 if(g.flags.cottage){
  openPanel('The restored workshop', 'ASHVALE HOLLOW',
   '<p>A steady light fills the workshop. Tools line the walls, ready for the village’s next chapter.</p><button class="primary" id="workbench-btn">Open crafting</button>');
  $('#workbench-btn').onclick = () => pack('craft');
  return;
 }
 openPanel('A place to begin again', 'RESTORE THE WORKSHOP', `
  <p>The roof has fallen in, but its foundations are sound. With a little work, this can be the heart of Ashvale’s recovery.</p>
  <div class="stats"><span>${g.bag.wood} / 12 timber</span><span>${g.bag.stone} / 8 stone</span></div>
  <p class="muted">Reward: 2 healing tonics, 35 experience, and the next step toward restoring the hearth.</p>
  <button class="primary" id="repair-btn" ${g.bag.wood<12||g.bag.stone<8?'disabled':''}>Restore workshop</button>`);
 $('#repair-btn').onclick = () => { if(g.repair()){ closePanel(); app.flush(); banner('The workshop is restored'); app.save(); } };
}
export function hearthPanel(){
 const g = G();
 if(g.flags.hearth){ g.player.hp = g.player.maxHp; toast('The hearth warms you. Health restored.'); return; }
 openPanel('The last hearth', 'A LIGHT IN THE HOLLOW', `
  <p>A ring of cold stones. The ashes remember a fire that once kept the whole village warm.</p>
  <div class="journal-entry"><p>${g.flags.cottage?'✓ The workshop tools are ready.':'◇ Restore the workshop to mend the hearth.'}<br>
   ${g.bag.core?'✓ You carry the Heart Spark.':'◇ Recover the Heart Spark from the Rootvault guardian.'}</p></div>
  <button class="primary" id="rekindle-btn" ${!g.flags.cottage||!g.bag.core?'disabled':''}>Rekindle the hearth</button>`);
 $('#rekindle-btn').onclick = () => { if(g.rekindle()){ closePanel(); app.flush(); } };
}
