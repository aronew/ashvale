// What lives in each zone: props, gatherable nodes, people and monsters.
// Positions are tile coordinates; the model multiplies by TILE.
// Nothing here may collide with a legacy object ID: all ids are namespaced.

// prop: [art, x, y, opts?]  — decorative or interactive scenery
// node: [type, x, y]        — gatherable resource
// npc:  [id, x, y]          — looked up in quests.mjs NPCS
// mob:  [type, x, y, opts?] — enemy spawn (respawns unless once:true)

export const SPAWNS = {
 vale: {
  props: [
   ['sign', 9.5, 32.6, { text:'WEST — Hearthgate' }],
   ['sign', 46.5, 15.2, { text:'NORTH — Whisperwood' }],
   ['campfire', 23.4, 37.6], ['barrel', 21.6, 30.4], ['crate', 22.4, 30.6],
   ['cart', 29.3, 34.2], ['stump', 33.6, 40.1], ['banner', 26.2, 30.2]
  ],
  npcs: [['tam', 18.5, 38.4], ['rowan', 28.6, 35.4]],
  nodes: [], mobs: []
 },

 town: {
  props: [
   ['fountain', 31, 24.5, { radius:24 }],
   ['well', 24, 29.5, { radius:12 }],
   ['statue', 44, 24.5, { radius:15, text:'\u201cHEARTHGATE. THE GATE HOLDS BECAUSE WE HOLD IT.\u201d' }],
   ['stall', 30.5, 21.5, { tint:'#8c4a4a' }], ['stall', 30.5, 29.5, { tint:'#4a6b8c' }],
   ['stall', 45.5, 21.5, { tint:'#7a6b3c' }], ['stall', 45.5, 29.5, { tint:'#55705c' }],
   ['crate', 29.4, 23.2], ['barrel', 32.6, 23.2], ['crate', 46.4, 31.2], ['barrel', 43.4, 31.2],
   ['cart', 47.5, 28.4], ['cart', 33.5, 20.5],
   ['brazier', 33.5, 18.5], ['brazier', 41.5, 18.5], ['brazier', 33.5, 32.5], ['brazier', 41.5, 32.5],
   ['board', 25.5, 27.6, { radius:10, label:'Notice board' }],
   ['loom', 61, 13.5, { radius:12, label:'Lys\u2019s loom' }],
   ['cauldron', 17.5, 40.5, { radius:12, label:'Sera\u2019s stillroom bench' }],
   ['banner', 36, 9.5], ['banner', 38.5, 9.5], ['banner', 70.4, 26.5], ['banner', 70.4, 32.5],
   ['tent', 62.5, 48.5], ['tent', 66.5, 48.5],
   ['sign', 69.5, 32.6, { text:'EAST \u2014 the vale road' }],
   ['sign', 33.6, 9.5, { text:'NORTH \u2014 the ranger road' }],
   ['crate', 21.4, 26.4], ['barrel', 20.2, 26.4], ['cart', 33.4, 36.5], ['barrel', 51.5, 26.4],
   ['stump', 66.5, 27.5], ['crate', 10.5, 29.5], ['barrel', 11.8, 29.5], ['tent', 21, 48.5],
   ['well', 60.5, 29.5, { radius:12 }], ['brazier', 19.5, 43.5], ['brazier', 56.5, 43.5],
   ['banner', 12.4, 26.5], ['banner', 62.5, 26.5]
  ],
  npcs: [
   ['orin', 61.5, 40.5], ['sera', 14.5, 40.5], ['corvin', 36.5, 24.5], ['lys', 58, 13.5],
   ['ondt', 30.5, 46.5], ['pim', 42.5, 28.5], ['hesta', 44.5, 21.5], ['aldric', 12.5, 13.5],
   ['vell', 20.8, 14.5], ['rook', 69.5, 29.5], ['gwen', 27.5, 40.5], ['mabe', 49.5, 40.5]
  ],
  nodes: [],
  mobs: []
 },

 forge:  { props:[['anvil',12,9.5,{radius:13,label:'Dain’s anvil'}],['forgefire',17.5,8.5,{radius:12}],['barrel',6.5,8.4],['crate',6.5,11.4],['bookshelf',19.5,12.4],['table',9,12.5]], npcs:[['dain',13.6,9.6]], nodes:[], mobs:[] },
 tavern: { props:[['table',9,8.5],['table',17,8.5],['table',9,12.5],['table',17,12.5],['barrel',4.5,5.4],['barrel',6,5.4],['brazier',21.5,6.5],['bookshelf',21.5,11.4]], npcs:[['mira',13,6.6],['jorin',9,10.2],['tessa',17,10.2]], nodes:[], mobs:[] },
 hall:   { props:[['board',12,6.4,{radius:14,label:'The work board'}],['table',6.5,11.5],['table',17.5,11.5],['bookshelf',4.5,6.4],['bookshelf',19.5,6.4],['brazier',8.5,8.5],['brazier',15.5,8.5]], npcs:[['bell',12,8.6]], nodes:[], mobs:[] },

 forest: {
  props: [
   ['campfire', 13.5, 49.5], ['tent', 11, 47.4], ['tent', 16.5, 47.4],
   ['sign', 41, 56.5, { text:'SOUTH — Ashvale' }],
   ['sign', 14.5, 45.5, { text:'WEST — Hearthgate postern' }],
   ['pillar', 10.5, 12.5, { radius:12 }], ['pillar', 16.5, 12.5, { radius:12 }],
   ['pillar', 10.5, 17.5, { radius:12 }], ['pillar', 16.5, 17.5, { radius:12 }],
   ['shrine', 13.5, 14.8, { radius:14, label:'The standing stones' }],
   ['cauldron', 66.5, 11.5, { radius:12, label:'Nima’s cauldron' }],
   ['tent', 69.5, 13.4], ['bones', 57.5, 45.5], ['bones', 63.5, 56.5],
   ['stump', 44.5, 34.5], ['stump', 37.5, 31.5], ['statue', 41, 30.5, { radius:14, label:'The waystone' }]
  ],
  npcs: [['bracken', 14.5, 50.6], ['nima', 66.5, 12.8]],
  nodes: [
   ['tree', 18, 22], ['tree', 20, 26], ['tree', 31, 20], ['tree', 34, 25], ['tree', 36, 40],
   ['tree', 48, 20], ['tree', 52, 33], ['tree', 55, 16], ['tree', 60, 28], ['tree', 64, 34],
   ['tree', 30, 46], ['tree', 46, 52], ['tree', 70, 22], ['tree', 74, 44], ['tree', 8, 34],
   ['herb', 42, 35], ['herb', 44, 31], ['herb', 12, 46], ['herb', 66, 16], ['herb', 60, 52],
   ['herb', 22, 34], ['herb', 50, 42], ['herb', 68, 47],
   ['web', 34, 15], ['web', 37, 13], ['web', 50, 27], ['web', 55, 21], ['web', 76, 38],
   ['web', 17, 40], ['web', 47, 46], ['web', 29, 55],
   ['shroom', 57, 51], ['shroom', 62, 55], ['shroom', 66, 50], ['shroom', 39, 44],
   ['ore', 71, 30], ['ore', 17, 33], ['ore', 8, 20], ['iron', 74, 18], ['iron', 9, 55],
   ['bones', 28, 8], ['bones', 75, 55]
  ],
  mobs: [
   ['wolf', 20, 30], ['wolf', 13, 34], ['wolf', 35, 44], ['wolf', 48, 38], ['wolf', 12, 40],
   ['wolf', 57, 20], ['wolf', 63, 40], ['wolf', 70, 50],
   ['spider', 33, 17], ['spider', 38, 14], ['spider', 49, 27], ['spider', 55, 20],
   ['spider', 17, 42], ['spider', 47, 48], ['spider', 75, 33],
   ['sporeling', 59, 53], ['sporeling', 64, 56], ['sporeling', 67, 48], ['sporeling', 41, 46],
   ['bat', 15, 20], ['bat', 20, 11], ['bat', 45, 16], ['bat', 68, 26], ['bat', 31, 49],
   ['slime', 21, 50], ['slime', 44, 24], ['slime', 62, 32],
   ['bramble', 62, 54, { once:true, boss:true }]
  ]
 },

 warren: {
  props: [
   ['campfire', 12, 52.5], ['tent', 9.5, 50.4], ['crate', 15.5, 50.4], ['barrel', 17, 50.4],
   ['cart', 14.5, 33.5], ['bones', 20, 31.5], ['bones', 46, 20.5], ['bones', 64, 41.5],
   ['pillar', 34, 10.5, { radius:13 }], ['pillar', 51, 10.5, { radius:13 }],
   ['pillar', 34, 21.5, { radius:13 }], ['pillar', 51, 21.5, { radius:13 }],
   ['shrine', 66, 34.5, { radius:14, label:'A choir shrine' }],
   ['brazier', 30, 47.5], ['brazier', 48, 47.5]
  ],
  npcs: [['gormel', 40, 40.6]],
  nodes: [
   ['iron', 9, 31], ['iron', 12, 36], ['iron', 18, 30], ['iron', 21, 38], ['iron', 10, 39],
   ['iron', 60, 33], ['iron', 74, 44], ['coal', 15, 32], ['coal', 19, 35], ['coal', 8, 35],
   ['coal', 22, 30], ['coal', 63, 45], ['coal', 45, 37], ['coal', 12, 49],
   ['crystal', 60, 36], ['crystal', 66, 31], ['crystal', 71, 38], ['crystal', 76, 44],
   ['crystal', 58, 45], ['crystal', 68, 46], ['crystal', 74, 33],
   ['shroom', 33, 38], ['shroom', 36, 41], ['shroom', 41, 48], ['shroom', 45, 43],
   ['shroom', 48, 36], ['shroom', 31, 49], ['shroom', 50, 50],
   ['ore', 16, 55], ['ore', 8, 50], ['ore', 19, 52], ['bones', 35, 50], ['bones', 55, 42]
  ],
  mobs: [
   ['bat', 11, 44], ['bat', 20, 26], ['bat', 21, 22], ['bat', 40, 30], ['bat', 55, 41],
   ['sporeling', 34, 40], ['sporeling', 37, 47], ['sporeling', 46, 39], ['sporeling', 47, 48],
   ['sporeling', 32, 45], ['sporeling', 49, 42],
   ['rockling', 10, 33], ['rockling', 20, 34], ['rockling', 62, 40], ['rockling', 72, 41],
   ['crawler', 59, 33], ['crawler', 67, 35], ['crawler', 74, 39], ['crawler', 64, 46],
   ['crawler', 42, 33], ['shade', 70, 12], ['shade', 66, 16], ['shade', 30, 20],
   ['devourer', 43, 15, { once:true, boss:true }]
  ]
 },

 crypt: {
  props: [
   ['brazier', 8, 40.5], ['brazier', 15, 40.5], ['pillar', 26, 9.5, { radius:12 }],
   ['pillar', 37, 9.5, { radius:12 }], ['pillar', 26, 16.5, { radius:12 }], ['pillar', 37, 16.5, { radius:12 }],
   ['shrine', 31.5, 12.5, { radius:14, label:'The reliquary' }],
   ['bones', 47, 30.5], ['bones', 52, 34.5], ['bones', 55, 29.5], ['bones', 9, 9.5], ['bones', 14, 12.5],
   ['bookshelf', 8, 7.4], ['bookshelf', 15, 7.4], ['banner', 30, 6.4], ['banner', 34, 6.4]
  ],
  npcs: [],
  nodes: [['bones', 12, 14], ['bones', 50, 32], ['cinder', 54, 36], ['crystal', 46, 29]],
  mobs: [
   ['shade', 10, 30], ['shade', 10, 24], ['shade', 30, 22], ['shade', 49, 30], ['shade', 53, 35],
   ['archer', 33, 22], ['archer', 47, 18], ['archer', 20, 22], ['archer', 44, 32],
   ['brigand', 30, 12], ['brigand', 36, 10], ['brigand', 50, 28], ['brigand', 13, 10],
   ['bat', 22, 22], ['bat', 49, 24],
   ['choirlord', 31.5, 11, { once:true, boss:true }]
  ]
 },

 deep: {
  props: [
   ['brazier', 9, 47.5], ['brazier', 19, 47.5], ['bones', 11, 27.5], ['bones', 50, 44.5],
   ['pillar', 27, 9.5, { radius:14 }], ['pillar', 55, 9.5, { radius:14 }],
   ['pillar', 27, 19.5, { radius:14 }], ['pillar', 55, 19.5, { radius:14 }],
   ['shrine', 44, 26.5, { radius:14, label:'The last anvil' }],
   ['statue', 41, 8.5, { radius:16, text:'\u201cIT WAS A HEARTH BEFORE IT WAS A THRONE.\u201d' }]
  ],
  npcs: [],
  nodes: [
   ['cinder', 8, 46], ['cinder', 11, 31], ['cinder', 13, 39], ['cinder', 32, 43], ['cinder', 50, 42],
   ['cinder', 20, 24], ['cinder', 30, 25], ['cinder', 47, 24], ['cinder', 60, 25],
   ['crystal', 60, 13], ['crystal', 62, 20], ['iron', 9, 28], ['coal', 17, 47], ['coal', 26, 20]
  ],
  mobs: [
   ['imp', 11, 34], ['imp', 22, 26], ['imp', 34, 25], ['imp', 44, 33], ['imp', 52, 25],
   ['imp', 61, 16], ['imp', 39, 44], ['imp', 48, 44],
   ['golem', 12, 40], ['golem', 44, 44], ['golem', 60, 26], ['golem', 30, 26],
   ['shade', 30, 19], ['shade', 52, 19], ['shade', 44, 19], ['shade', 38, 9],
   ['tyrant', 41, 14, { once:true, boss:true }]
  ]
 }
};

// Chests. `loot` is granted once; ids are stable and one-time.
export const CHESTS = [
 { id:'c-town-1', zone:'town', x:63.5, y:22.5, loot:{ coin:35, potion:1 } },
 { id:'c-town-2', zone:'town', x:11.5, y:50.5, loot:{ silk:2, coin:20 } },
 { id:'c-forest-1', zone:'forest', x:13, y:16.5, loot:{ coin:40, iron:2, potion:1 } },
 { id:'c-forest-2', zone:'forest', x:70, y:20.5, loot:{ leather:3, fang:2 } },
 { id:'c-forest-3', zone:'forest', x:60, y:56.5, loot:{ crystal:1, coin:60, elixir:1 } },
 { id:'c-forest-4', zone:'forest', x:9, y:36.5, loot:{ silk:3, herb:4 } },
 { id:'c-warren-1', zone:'warren', x:16, y:29.5, loot:{ iron:4, coal:3, coin:45 } },
 { id:'c-warren-2', zone:'warren', x:74, y:35.5, loot:{ crystal:2, moonsteel:1, coin:70 } },
 { id:'c-warren-3', zone:'warren', x:52, y:9.5,  loot:{ coin:90, elixir:1, relic:1 } },
 { id:'c-warren-4', zone:'warren', x:35, y:47.5, loot:{ herb:6, potion:2 } },
 { id:'c-crypt-1', zone:'crypt', x:8, y:13.5,  loot:{ relic:1, coin:55 } },
 { id:'c-crypt-2', zone:'crypt', x:55, y:31.5, loot:{ relic:1, silk:4, coin:80 } },
 { id:'c-crypt-3', zone:'crypt', x:28, y:8.5,  loot:{ relic:1, moonsteel:1, elixir:1 } },
 { id:'c-deep-1', zone:'deep', x:19, y:26.5, loot:{ cinder:4, coin:110 } },
 { id:'c-deep-2', zone:'deep', x:60, y:15.5, loot:{ moonsteel:2, crystal:3, elixir:2 } },
 { id:'c-deep-3', zone:'deep', x:47, y:11.5, loot:{ coin:250, moonsteel:3, elixir:3 } }
];

// Lamp posts that light the towns and roads at night.
export const LAMPS = {
 town: [[9,26.5],[9,32.5],[23,26.5],[23,32.5],[31,32.5],[45,32.5],[55,32.5],[68,26.5],[68,32.5],
        [36.5,14.5],[38.5,14.5],[22,40.5],[33,40.5],[52,40.5],[26,49.5],[50,49.5],[9,40.5],[68,40.5],[9,17.5],[70,14.5],[34,17.5],[47,17.5],[20,50.5]],
 vale: [], forest: [[41,57],[41,50],[15,45],[67,9],[41,36],[13,49]],
 warren: [[12,48],[12,36],[33,36],[45,36],[60,34],[42,26],[42,12],[68,17]],
 crypt: [[10,36],[10,22],[24,22],[40,22],[49,28],[31,8]],
 deep: [[11,42],[11,30],[30,26],[44,26],[41,10],[60,20],[9,46],[52,26]],
 forge: [[6,6],[19,6]], tavern: [[5,6],[21,6],[13,14]], hall: [[5,6],[19,6]]
};
