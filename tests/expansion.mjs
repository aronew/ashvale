import assert from 'node:assert/strict';
import {Game as OldGame} from './fixtures/core-v1.mjs';
import {Game,SWINGS,TILE,distance} from '../dist/core.mjs';
const step=(g,t,input={})=>{while(t>1e-8){const dt=Math.min(.01,t);g.update(dt,input);t-=dt;}};
const g=new Game();g.objects=[];const p=g.player;
const target={id:'dummy',type:'slime',x:p.x+38,y:p.y,homeX:p.x+38,homeY:p.y,hp:1000,maxHp:1000,cd:999,hit:0,phase:0,windup:999};g.enemies=[target];
for(let i=0;i<3;i++){
 const hp=target.hp;assert.equal(g.attack(),true);assert.equal(p.combo,i);
 step(g,SWINGS[i].impact-.02);assert.equal(target.hp,hp,'Damage must wait for the swing impact');
 step(g,.03);assert.equal(hp-target.hp,Math.round(17*SWINGS[i].multiplier));
 step(g,SWINGS[i].duration);assert.equal(hp-target.hp,Math.round(17*SWINGS[i].multiplier),'Only one impact per swing');
 target.x=p.x+38;target.y=p.y;
}
step(g,1);g.attack();assert.equal(p.combo,0,'Combo resets after idle');step(g,.22);g.attack();step(g,.15);assert.equal(p.combo,1,'Buffered press chains into next swing');
const hold=new Game();hold.enemies=[];step(hold,1.3,{attack:true});assert.ok(hold.events.filter(e=>e.type==='attack').length>=3,'Holding attack chains swings');
const old=new OldGame();old.flags.hearth=true;old.flags.cottage=true;old.flags.boss=true;old.flags.met=true;old.bag.wood=23;old.removed.add(old.objects.find(o=>o.type==='tree').id);
const migrated=new Game(JSON.parse(JSON.stringify(old.serialize())));
assert.equal(migrated.flags.hearth,true);assert.equal(migrated.bag.wood,23);assert.equal(migrated.flags.beacons,false);
for(const o of old.objects){const newer=migrated.objects.find(n=>n.id===o.id);assert.deepEqual([newer.type,newer.x,newer.y],[o.type,o.x,o.y],'Original object IDs must not shift');}
const world=new Game();const q=[[25,36]],seen=new Set(['25,36']);for(let i=0;i<q.length;i++){const[x,y]=q[i];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(!seen.has(k)&&world.walkable((nx+.5)*TILE,(ny+.5)*TILE)){seen.add(k);q.push([nx,ny]);}}}
for(const o of world.objects.filter(o=>['beacon','npc','ruin','hearth'].includes(o.type)))assert.ok(q.some(([x,y])=>distance(o,{x:(x+.5)*TILE,y:(y+.5)*TILE})<60),'Required quest location must be reachable: '+o.id);
const beacons=world.objects.filter(o=>o.type==='beacon');world.player.x=beacons[0].x+35;world.player.y=beacons[0].y;world.bag.essence=6;assert.equal(world.lightBeacon(beacons[0]),false,'Chapter I gate');world.flags.hearth=true;world.enemies=[];
for(const b of beacons){world.player.x=b.x+35;world.player.y=b.y;assert.equal(world.lightBeacon(b),true);}
assert.equal(world.flags.beacons,true);assert.equal(world.bag.essence,0);assert.equal(world.bag.potion,6);assert.equal(world.lightBeacon(beacons[2]),false,'Completion rewards cannot be duplicated');
const roundtrip=new Game(JSON.parse(JSON.stringify(world.serialize())));assert.equal(roundtrip.flags.beacons,true);assert.equal(roundtrip.flags.beacon2,true);
const ranged=new Game();ranged.flags.hearth=true;const wisp=ranged.enemies.find(e=>e.type==='wisp');ranged.enemies=[wisp];ranged.player.x=wisp.x-130;ranged.player.y=wisp.y;wisp.cd=0;step(ranged,.8);assert.equal(ranged.projectiles.length,1,'Wisp fires a telegraphed projectile');
const hp=ranged.player.hp;ranged.projectiles=[{x:ranged.player.x,y:ranged.player.y,vx:0,vy:0,life:1}];ranged.player.dash=.1;step(ranged,.01);assert.equal(ranged.player.hp,hp,'Dodge avoids firebolt damage');
console.log('PASS: three timed swings, finisher damage, single-hit damage, combo reset, press buffering, held attack, legacy save migration, reachable beacons, chapter gates, completion rewards, persistence, ranged attacks and dodge immunity.');
