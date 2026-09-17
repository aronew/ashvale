// Ashvale content tables: items, weapons, outfits, spells, supers, recipes, enemy archetypes.
// Pure data + pure helpers. No DOM, canvas, storage, timer or network access belongs in this file.

export const TILE = 32;

// Tile codes. 0-6 are the original Chapter I/II codes and must keep their meanings.
export const T = {
 VOID: 0, GRASS: 1, PATH: 2, WATER: 3, STONE: 4, BRIDGE: 5, GARDEN: 6,
 CAVE: 7, ROCK: 8, DIRT: 9, WOOD: 10, RUG: 11, LAVA: 12, MARKET: 13,
 MOSS: 14, CRYSTAL: 15, EMBER: 16, SAND: 17, CINDER: 18, CHASM: 19,
 WALL: 20, ASH: 21, THICKET: 22, FIELD: 23
};
// Tiles that block movement. Cinders (18) are walkable but hurt.
export const SOLID = new Set([T.VOID, T.WATER, T.ROCK, T.LAVA, T.CHASM, T.WALL]);
export const HAZARD = { [T.CINDER]: 6 };   // damage per tick while standing on it

export const ITEMS = {
 wood: 'Timber', stone: 'Stone', herb: 'Moonleaf', essence: 'Ember dust', potion: 'Healing tonic', core: 'Heart spark',
 iron: 'Iron ore', coal: 'Coal', leather: 'Tanned hide', silk: 'Spider silk', fang: 'Beast fang',
 crystal: 'Moon crystal', cinder: 'Cinder shard', moonsteel: 'Moonsteel ingot', relic: 'Ancient relic',
 seed: 'Heartwood seed', warrenkey: 'Warren sigil', elixir: 'Greater elixir', coin: 'Ember marks'
};
// Order used by the inventory grid.
export const ITEM_ORDER = ['wood','stone','iron','coal','herb','essence','leather','silk','fang','crystal','cinder','moonsteel','relic'];
export const ITEM_ART = { wood:4, stone:5, herb:15, essence:10, iron:5, coal:5, leather:6, silk:15, fang:13, crystal:10, cinder:10, moonsteel:5, relic:6, seed:15, warrenkey:6, potion:15, elixir:15, core:10, coin:6 };

// ---------------------------------------------------------------------------
// Swing sets. `duration` is the whole swing, `impact` is when damage lands,
// `range`/`cone` shape the hitbox, `multiplier` scales attack power.
// `arc` drives the renderer: [startAngle, endAngle] of the blade sweep, and
// `style` picks the motion curve. Model and renderer read the same table so
// visuals can never drift from hit timing.
// ---------------------------------------------------------------------------
export const SWINGS = [
 { name:'Crescent cut',    duration:.36, impact:.10, range:78, multiplier:1,    cone:-.1,  arc:[-0.95, 0.95], style:'slash',  lunge:9,  poise:8  },
 { name:'Rising backhand', duration:.34, impact:.09, range:84, multiplier:1.15, cone:-.4,  arc:[ 1.05,-1.00], style:'slash',  lunge:11, poise:10 },
 { name:'Sundering cleave',duration:.52, impact:.20, range:98, multiplier:1.75, cone:-.55, arc:[-1.25, 0.20], style:'cleave', lunge:16, poise:26 }
];

export const DAGGER_SWINGS = [
 { name:'Quick nick',   duration:.20, impact:.06, range:60, multiplier:.78, cone:.25,  arc:[-.55,.35],   style:'stab',  lunge:12, poise:3 },
 { name:'Cross slice',  duration:.20, impact:.06, range:62, multiplier:.82, cone:.2,   arc:[.6,-.4],     style:'stab',  lunge:12, poise:3 },
 { name:'Gut twist',    duration:.22, impact:.07, range:58, multiplier:.9,  cone:.3,   arc:[-.2,.18],    style:'thrust',lunge:20, poise:5 },
 { name:'Bleeding fan', duration:.40, impact:.13, range:74, multiplier:1.6, cone:-.75, arc:[-1.7,1.7],   style:'spin',  lunge:8,  poise:14, bleed:true }
];

export const GREAT_SWINGS = [
 { name:'Overhead break', duration:.62, impact:.26, range:104, multiplier:1.45, cone:-.35, arc:[-1.45,.25],  style:'cleave', lunge:18, poise:34 },
 { name:'Wide reaver',    duration:.74, impact:.31, range:118, multiplier:2.1,  cone:-.95, arc:[1.45,-1.45],  style:'reaver', lunge:22, poise:52 }
];

export const SPEAR_SWINGS = [
 { name:'Short thrust',  duration:.30, impact:.11, range:112, multiplier:1,    cone:.55,  arc:[-.14,.08],  style:'thrust', lunge:16, poise:9  },
 { name:'Piercing lunge',duration:.34, impact:.13, range:132, multiplier:1.3,  cone:.62,  arc:[.12,-.06], style:'thrust', lunge:30, poise:12 },
 { name:'Sweeping haft', duration:.50, impact:.19, range:104, multiplier:1.7,  cone:-.85, arc:[-1.5,1.5], style:'reaver', lunge:10, poise:30 }
];

export const SABER_SWINGS = [
 { name:'Moon draw',    duration:.30, impact:.09, range:86, multiplier:1,    cone:-.25, arc:[-1.05,0.95], style:'slash', lunge:13, poise:8  },
 { name:'Falling arc',  duration:.30, impact:.09, range:88, multiplier:1.2,  cone:-.3,  arc:[1.15,-1.05], style:'slash', lunge:13, poise:9  },
 { name:'Crescent turn',duration:.44, impact:.16, range:100, multiplier:1.85, cone:-.9, arc:[-1.85,1.65],  style:'spin',  lunge:18, poise:24 }
];

export const MAUL_SWINGS = [
 { name:'Rising hammer', duration:.58, impact:.24, range:92,  multiplier:1.5, cone:-.2,  arc:[1.25,-.15],  style:'cleave', lunge:14, poise:40 },
 { name:'Earthshatter',  duration:.80, impact:.34, range:110, multiplier:2.3, cone:-.6,  arc:[-1.5,.3],  style:'slam',   lunge:16, poise:75, shock:118 }
];

export const GLAIVE_SWINGS = [
 { name:'Storm cut',    duration:.34, impact:.11, range:100, multiplier:1.05, cone:-.45, arc:[-1.25,1.1], style:'slash',  lunge:12, poise:10 },
 { name:'Reverse reap', duration:.36, impact:.12, range:104, multiplier:1.25, cone:-.5,  arc:[1.3,-1.2], style:'slash',  lunge:14, poise:14 },
 { name:'Thunder whirl',duration:.56, impact:.21, range:116, multiplier:1.95, cone:-1,   arc:[-2.1,2.1], style:'spin',   lunge:16, poise:34, chain:3 }
];

export const SWING_SETS = { sword:SWINGS, dagger:DAGGER_SWINGS, great:GREAT_SWINGS, spear:SPEAR_SWINGS, saber:SABER_SWINGS, maul:MAUL_SWINGS, glaive:GLAIVE_SWINGS };

// Heavy attack (X / right click) per weapon class: one charged strike.
export const HEAVY = {
 sword:  { name:'Hearth breaker', duration:.66, impact:.28, range:112, multiplier:2.6, cone:-.7,  arc:[-1.6,.4],  style:'cleave', lunge:34, poise:60, shock:0   },
 dagger: { name:'Shadow flurry',  duration:.52, impact:.18, range:86,  multiplier:2.2, cone:-1,   arc:[-2.6,2.6],     style:'spin',   lunge:40, poise:26, shock:0   },
 great:  { name:'Worldsplitter',  duration:.95, impact:.42, range:132, multiplier:3.4, cone:-.6,  arc:[-1.7,.45],  style:'slam',   lunge:30, poise:110,shock:132 },
 spear:  { name:'Impaling drive', duration:.60, impact:.24, range:164, multiplier:2.8, cone:.7,   arc:[-.08,.04],  style:'thrust', lunge:58, poise:48, shock:0   },
 saber:  { name:'Moonfall arc',   duration:.60, impact:.22, range:124, multiplier:2.7, cone:-1.1, arc:[-2.2,2.2], style:'spin',   lunge:28, poise:44, shock:0   },
 maul:   { name:'Mountainfall',   duration:1.02,impact:.46, range:126, multiplier:3.6, cone:-.55, arc:[-1.65,.4],  style:'slam',   lunge:24, poise:140,shock:150 },
 glaive: { name:'Tempest coil',   duration:.72, impact:.27, range:136, multiplier:3.0, cone:-1.2, arc:[-2.6,2.6], style:'spin',   lunge:34, poise:70, shock:0, chain:5 }
};

// ---------------------------------------------------------------------------
// Weapons. `power` is base attack before level, upgrades, outfit and blessings.
// The starting hearthblade must stay at 17 so legacy damage numbers hold.
// ---------------------------------------------------------------------------
export const WEAPONS = {
 hearthblade:{ id:'hearthblade', short:'Hearthblade', name:'Worn hearthblade', kind:'sword', power:17, tier:1, trail:'#f7cd92', blade:'#d9c9a6',
  desc:'The blade Wren pressed into your hands. Honest steel, badly nicked.', perk:'' },
 tempered:{ id:'tempered', short:'Tempered', name:'Tempered blade', kind:'sword', power:24, tier:2, trail:'#ffe0a6', blade:'#e8dcb4',
  desc:'Reforged at the village workbench. It holds an edge now.', perk:'' },
 fenrazor:{ id:'fenrazor', short:'Fen razor', name:'Fen razor', kind:'dagger', power:19, tier:2, trail:'#b8f1e3', blade:'#cdeee6', speed:1.25,
  desc:'A fenstalker knife. Four cuts before a heavier blade finishes one.', perk:'bleed', perkText:'Bleed · finishers leave a wound that keeps burning' },
 rootcleaver:{ id:'rootcleaver', short:'Rootcleaver', name:'Rootcleaver', kind:'great', power:38, tier:3, trail:'#9fd7a2', blade:'#b6c9a8',
  desc:'Cut from the Bramble Warden’s own heartwood. It remembers the forest.', perk:'stagger', perkText:'Heavy poise · staggers most creatures in two hits' },
 wardenpike:{ id:'wardenpike', short:'Pike', name:'Warden’s pike', kind:'spear', power:26, tier:3, trail:'#cbd8ef', blade:'#dfe6f4',
  desc:'Hearthgate watch issue. Reach enough to fight from outside a claw’s arc.', perk:'reach', perkText:'Long reach · strikes land from well outside melee range' },
 emberbrand:{ id:'emberbrand', short:'Emberbrand', name:'Emberbrand', kind:'sword', power:33, tier:4, trail:'#ffa257', blade:'#ffcb8b',
  desc:'Quenched in the hearth’s own coals. The steel never quite cools.', perk:'burn', perkText:'Burn · struck enemies smoulder for extra damage' },
 moonsaber:{ id:'moonsaber', short:'Saber', name:'Moonlit saber', kind:'saber', power:30, tier:4, trail:'#c9d9ff', blade:'#e6ecff', speed:1.12,
  desc:'Moonsteel folded under an open sky. It finds the gap on its own.', perk:'crit', perkText:'Keen · +18% critical strike chance' },
 stoneheart:{ id:'stoneheart', short:'Maul', name:'Stoneheart maul', kind:'maul', power:46, tier:5, trail:'#d8c5a4', blade:'#b9a98e',
  desc:'A Warren rockling’s fist, bound to a haft. Slow. Final.', perk:'shock', perkText:'Shockwave · finishers crack the ground around the impact' },
 stormglaive:{ id:'stormglaive', short:'Glaive', name:'Stormcaller glaive', kind:'glaive', power:36, tier:5, trail:'#a9e8ff', blade:'#d8f4ff',
  desc:'Crystal from the deep warrens, still humming with weather.', perk:'chain', perkText:'Chain spark · spinning finishers arc between enemies' },
 reforged:{ id:'reforged', short:'Reforged', name:'The Reforged Hearthblade', kind:'sword', power:54, tier:6, trail:'#ffd88a', blade:'#fff0c4', speed:1.08,
  desc:'Hearth-fire, moonsteel and a heart spark. The last light, made sharp.', perk:'hearth', perkText:'Hearthlight · finishers heal you and burn what they touch' }
};
export const WEAPON_ORDER = ['hearthblade','tempered','fenrazor','wardenpike','rootcleaver','moonsaber','emberbrand','stormglaive','stoneheart','reforged'];

// Upgrade path shared by every weapon. Index is the current level.
export const UPGRADE_COST = [
 { iron:2, coal:1, coin:20 },
 { iron:4, coal:2, coin:45 },
 { iron:6, coal:3, crystal:1, coin:90 },
 { iron:8, coal:5, crystal:2, moonsteel:1, coin:160 },
 { iron:10, coal:7, crystal:3, moonsteel:3, coin:280 }
];
export const MAX_UPGRADE = 5;
export const upgradedPower = (base, lvl) => Math.round(base * (1 + lvl * 0.12));

// ---------------------------------------------------------------------------
// Outfits. `hue` re-tints the burgundy garment pixels of the hero sprite.
// ---------------------------------------------------------------------------
export const OUTFITS = {
 wayfarer:{ id:'wayfarer', name:'Wayfarer’s coat', hue:0, sat:1, armor:0, desc:'The coat you arrived in. Rain-stained, road-proof.', perkText:'No bonus — just history.' },
 hearthkeeper:{ id:'hearthkeeper', name:'Hearthkeeper’s robes', hue:58, sat:.95, armor:2, stamina:7, desc:'Wren’s spare robes, smelling of woodsmoke.', perkText:'+7 stamina recovery · +2 armour' },
 forgewright:{ id:'forgewright', name:'Forgewright’s apron', hue:32, sat:1.1, armor:5, fire:.3, forge:.15, desc:'Scorched leather from Dain’s bench.', perkText:'+5 armour · 30% fire resistance · 15% cheaper forging' },
 fenstalker:{ id:'fenstalker', name:'Fenstalker leathers', hue:170, sat:.9, armor:4, speed:16, dodge:.25, desc:'Cut close, dyed fen-green, silent in reeds.', perkText:'+4 armour · faster on foot · longer dodge window' },
 wardenplate:{ id:'wardenplate', name:'Warden’s plate', hue:200, sat:.7, armor:12, speed:-10, poise:.35, desc:'Hearthgate watch plate. Heavy, and worth it.', perkText:'+12 armour · harder to interrupt · slower on foot' },
 ashencloak:{ id:'ashencloak', name:'Ashen cloak', hue:278, sat:1, armor:6, crit:.14, desc:'Taken from the Choir. It drinks the lamplight.', perkText:'+6 armour · +14% critical strike chance' },
 moonweave:{ id:'moonweave', name:'Moonweave vestments', hue:212, sat:.6, armor:5, spell:.35, stamina:5, desc:'Woven by Lys from silk and moon crystal.', perkText:'+5 armour · +35% spell power · +5 stamina recovery' },
 emberheart:{ id:'emberheart', name:'Emberheart regalia', hue:20, sat:1.2, armor:14, fire:.5, attack:6, spell:.2, desc:'Forged for whoever ends this. That is you now.', perkText:'+14 armour · +6 attack · +20% spell power · 50% fire resistance' }
};
export const OUTFIT_ORDER = ['wayfarer','hearthkeeper','forgewright','fenstalker','wardenplate','ashencloak','moonweave','emberheart'];

// ---------------------------------------------------------------------------
// Spells (Q) and supers (F).
// ---------------------------------------------------------------------------
export const SPELLS = {
 ember:{ id:'ember', name:'Ember burst', cost:35, cooldown:3, radius:150, power:42, color:'#ffc579',
  desc:'A ring of hearth-fire bursts from you, scorching everything close.' },
 frost:{ id:'frost', name:'Frostbind', cost:40, cooldown:5, radius:190, power:34, color:'#9fe4ff', slow:3,
  desc:'A freezing cone. Damages and slows everything it touches.' },
 bolt:{ id:'bolt', name:'Chain spark', cost:38, cooldown:4.5, radius:260, power:46, color:'#a9e8ff', chain:4,
  desc:'A spark leaps between up to four enemies, losing little on the way.' },
 ward:{ id:'ward', name:'Warding light', cost:45, cooldown:9, radius:0, power:0, color:'#ffe6b0', shield:70, heal:25,
  desc:'A shell of hearthlight absorbs 70 damage and mends a little of yours.' },
 blink:{ id:'blink', name:'Shadowstep', cost:30, cooldown:4, radius:120, power:38, color:'#c9a4ff', dash:230,
  desc:'Step through the dark and cut everything where you land.' },
 sunfall:{ id:'sunfall', name:'Sunfall', cost:55, cooldown:12, radius:132, power:118, color:'#ffb45e', delay:1.1,
  desc:'Call a falling ember. It lands a breath later, and lands hard.' }
};
export const SPELL_ORDER = ['ember','frost','bolt','blink','ward','sunfall'];

export const SUPERS = {
 sword:{ name:'Hearthblade Nova', desc:'Three rings of hearth-fire expand from your blade.', power:2.6, duration:1.5 },
 dagger:{ name:'Thousand Cuts', desc:'You blur between every enemy in reach.', power:2.9, duration:1.6 },
 great:{ name:'Worldbreaker', desc:'A leaping slam that cracks the ground open.', power:3.6, duration:1.4 },
 spear:{ name:'Tempest Lance', desc:'A piercing line of light that skewers a whole corridor.', power:3.2, duration:1.2 },
 saber:{ name:'Moon Crescent', desc:'A crescent of moonlight big enough to fill a room.', power:3.0, duration:1.3 },
 maul:{ name:'Mountainfall', desc:'You bring the ceiling down on them.', power:4.0, duration:1.5 },
 glaive:{ name:'Stormcaller', desc:'Lightning walks the room, striking again and again.', power:3.1, duration:1.8 }
};

// ---------------------------------------------------------------------------
// Recipes. `at` marks which workbench can make it: 'pack' anywhere, 'forge' at
// Dain's anvil, 'alchemy' at Sera's bench.
// ---------------------------------------------------------------------------
export const RECIPES = {
 tonic:      { name:'Healing tonic',  at:'pack',    cost:{herb:2},                              give:{potion:1},  text:'Restores 65 health' },
 elixir:     { name:'Greater elixir', at:'alchemy', cost:{herb:4, crystal:1},                    give:{elixir:1},  text:'Restores 150 health and clears burning' },
 blade:      { name:'Tempered blade', at:'pack',    cost:{wood:6, stone:4, essence:4},           weapon:'tempered',text:'+7 attack over the worn hearthblade' },
 fenrazor:   { name:'Fen razor',      at:'forge',   cost:{iron:3, leather:2, fang:2, coin:40},   weapon:'fenrazor',text:'Fast four-hit dagger with a bleeding finisher' },
 wardenpike: { name:'Warden’s pike', at:'forge', cost:{iron:6, wood:4, stone:3, coin:90},   weapon:'wardenpike',text:'Long-reach spear, safe pokes from outside claw range' },
 rootcleaver:{ name:'Rootcleaver',    at:'forge',   cost:{seed:1, iron:8, wood:10, coin:120},    weapon:'rootcleaver',text:'Two-hit greatsword that staggers almost anything' },
 moonsaber:  { name:'Moonlit saber',  at:'forge',   cost:{moonsteel:2, crystal:3, iron:6, coin:180}, weapon:'moonsaber', text:'Keen saber with a wide spinning finisher' },
 emberbrand: { name:'Emberbrand',     at:'forge',   cost:{cinder:6, iron:8, coal:6, coin:210},   weapon:'emberbrand',text:'Sword that leaves its targets burning' },
 stormglaive:{ name:'Stormcaller glaive', at:'forge', cost:{crystal:6, moonsteel:3, iron:10, coin:300}, weapon:'stormglaive', text:'Glaive whose whirl arcs lightning between enemies' },
 stoneheart: { name:'Stoneheart maul', at:'forge',  cost:{stone:24, iron:12, cinder:4, coin:340},weapon:'stoneheart',text:'The heaviest thing you can lift, and it shows' },
 reforged:   { name:'The Reforged Hearthblade', at:'forge', cost:{moonsteel:6, cinder:10, crystal:6, coin:500}, weapon:'reforged', text:'Hearth-fire and moonsteel. The blade this ends with' },
 moonsteel:  { name:'Moonsteel ingot', at:'forge',  cost:{iron:4, crystal:1, coal:3},            give:{moonsteel:1}, text:'Refined bar for the finest work' },
 // Outfits are stitched at Lys’s loom in Hearthgate.
 hearthkeeper:{ name:'Hearthkeeper’s robes', at:'loom', cost:{silk:2, herb:6, coin:30},     outfit:'hearthkeeper', text:'+7 stamina recovery, +2 armour' },
 forgewright:{ name:'Forgewright’s apron', at:'loom', cost:{leather:5, iron:2, coin:60},    outfit:'forgewright', text:'+5 armour, fire resistance, cheaper forging' },
 fenstalker: { name:'Fenstalker leathers', at:'loom', cost:{leather:8, silk:3, fang:4, coin:110},outfit:'fenstalker', text:'+4 armour, faster movement, longer dodge' },
 wardenplate:{ name:'Warden’s plate', at:'loom', cost:{iron:12, leather:6, coin:190},       outfit:'wardenplate', text:'+12 armour, hard to interrupt' },
 ashencloak: { name:'Ashen cloak', at:'loom', cost:{silk:8, cinder:4, relic:1, coin:240},        outfit:'ashencloak', text:'+6 armour, +14% critical strike' },
 moonweave:  { name:'Moonweave vestments', at:'loom', cost:{silk:10, crystal:4, moonsteel:1, coin:300}, outfit:'moonweave', text:'+5 armour, +35% spell power' },
 emberheart: { name:'Emberheart regalia', at:'loom', cost:{moonsteel:4, cinder:8, silk:12, coin:420}, outfit:'emberheart', text:'+14 armour, +6 attack, +20% spell power' }
};

// ---------------------------------------------------------------------------
// Enemy archetypes. `ai` selects a behaviour block in core.mjs.
// ---------------------------------------------------------------------------
export const ENEMIES = {
 slime:    { name:'Bog slime',    hp:48,  dmg:9,  speed:60,  xp:18,  ai:'chase',  sprite:12, w:48,  h:43, poise:26, drops:{essence:2} },
 bat:      { name:'Hollow bat',   hp:34,  dmg:9,  speed:88,  xp:18,  ai:'flier',  sprite:13, w:49,  h:43, poise:14, drops:{essence:2} },
 wisp:     { name:'Cinder wisp',  hp:85,  dmg:14, speed:48,  xp:30,  ai:'caster', sprite:13, w:54,  h:49, poise:20, drops:{essence:3}, tint:'fire' },
 wolf:     { name:'Fen wolf',     hp:70,  dmg:13, speed:132, xp:28,  ai:'lunger', sprite:13, w:56,  h:46, poise:22, drops:{fang:1, leather:1}, tint:'wolf' },
 spider:   { name:'Silkback',     hp:64,  dmg:11, speed:74,  xp:26,  ai:'caster', sprite:12, w:50,  h:44, poise:18, drops:{silk:2}, tint:'spider', shot:{speed:150, dmg:11, slow:2, color:'#cfe6d2'} },
 sporeling:{ name:'Sporeling',    hp:52,  dmg:10, speed:66,  xp:24,  ai:'chase',  sprite:12, w:46,  h:42, poise:12, drops:{herb:2}, tint:'spore', burst:{radius:78, dmg:18} },
 brigand:  { name:'Choir zealot', hp:120, dmg:17, speed:84,  xp:44,  ai:'shielded',sprite:14,w:53,  h:62, poise:64, drops:{coin:14, leather:1}, tint:'choir' },
 archer:   { name:'Choir slinger',hp:78,  dmg:15, speed:70,  xp:38,  ai:'kiter',  sprite:14, w:53,  h:62, poise:18, drops:{coin:10}, tint:'choir', shot:{speed:250, dmg:15, color:'#e5d3a8'} },
 shade:    { name:'Ash shade',    hp:96,  dmg:19, speed:96,  xp:52,  ai:'blinker',sprite:13, w:54,  h:50, poise:24, drops:{essence:4, cinder:1}, tint:'shade' },
 rockling: { name:'Rockling',     hp:170, dmg:21, speed:44,  xp:56,  ai:'chase',  sprite:5,  w:60,  h:56, poise:110, armor:6, drops:{stone:3, iron:2}, tint:'rock' },
 crawler:  { name:'Deep crawler', hp:110, dmg:18, speed:110, xp:50,  ai:'lunger', sprite:12, w:52,  h:45, poise:30, drops:{crystal:1, fang:1}, tint:'crawl' },
 imp:      { name:'Cinder imp',   hp:104, dmg:20, speed:92,  xp:58,  ai:'caster', sprite:13, w:50,  h:45, poise:20, drops:{cinder:2}, tint:'flame', shot:{speed:210, dmg:20, color:'#ffb066', element:'fire', burn:true} },
 golem:    { name:'Ash golem',    hp:240, dmg:27, speed:46,  xp:88,  ai:'slammer',sprite:5,  w:72,  h:66, poise:150, armor:10, drops:{cinder:3, moonsteel:1}, tint:'ash' },
 // Bosses
 guardian: { name:'The Rootbound',        hp:340, dmg:19, speed:47, xp:100, ai:'boss-root',   sprite:12, w:112, h:98,  poise:999, boss:true, tint:'purple' },
 bramble:  { name:'The Bramble Warden',   hp:900, dmg:24, speed:58, xp:260, ai:'boss-bramble',sprite:4,  w:150, h:160, poise:999, boss:true, tint:'bramble' },
 devourer: { name:'The Warren Devourer',  hp:1450,dmg:30, speed:76, xp:420, ai:'boss-devour', sprite:12, w:168, h:150, poise:999, boss:true, tint:'devour' },
 choirlord:{ name:'The Ashen Choirmaster',hp:1050,dmg:26, speed:70, xp:330, ai:'boss-choir',  sprite:14, w:74,  h:86,  poise:999, boss:true, tint:'choir' },
 tyrant:   { name:'The Cinder Tyrant',    hp:2400,dmg:34, speed:64, xp:900, ai:'boss-tyrant', sprite:12, w:196, h:182, poise:999, boss:true, tint:'molten' }
};

export const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
export const distance = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
export function random(seed){ return () => { seed|=0; seed = seed+0x6D2B79F5|0; let t = Math.imul(seed^seed>>>15, 1|seed); t = t+Math.imul(t^t>>>7, 61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

// ---------------------------------------------------------------------------
// Gatherable nodes. `hp` is how many sword hits it takes, `give` what it drops.
// ---------------------------------------------------------------------------
export const GATHER = {
 tree:   { give:{wood:4},   hp:3, art:'tree',    radius:14, spark:'#78a887', regrow:95  },
 ore:    { give:{stone:3},  hp:2, art:'ore',     radius:17, spark:'#a9b8b6', regrow:110 },
 herb:   { give:{herb:2},   hp:2, art:'herb',    radius:0,  spark:'#dd92b2', regrow:70  },
 iron:   { give:{iron:2},   hp:3, art:'iron',    radius:16, spark:'#c2a58c', regrow:130 },
 coal:   { give:{coal:3},   hp:2, art:'coal',    radius:15, spark:'#6f6a74', regrow:120 },
 crystal:{ give:{crystal:1},hp:4, art:'crystal', radius:14, spark:'#a9e8ff', regrow:170 },
 cinder: { give:{cinder:2}, hp:3, art:'cinder',  radius:14, spark:'#ff9a55', regrow:150 },
 web:    { give:{silk:2},   hp:2, art:'web',     radius:0,  spark:'#d7e4dd', regrow:120 },
 shroom: { give:{herb:1, crystal:0}, hp:1, art:'shroom', radius:0, spark:'#b9d7a6', regrow:80 },
 bones:  { give:{fang:1},   hp:2, art:'bones',   radius:0,  spark:'#d8cdb4', regrow:160 }
};
export const GATHER_TYPES = Object.keys(GATHER);
