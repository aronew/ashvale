export const TILE=32, MW=80, MH=58;
export const ITEMS={wood:'Timber',stone:'Stone',herb:'Moonleaf',essence:'Ember dust',potion:'Healing tonic',core:'Heart spark'};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function makeMap(){
 const map=Array.from({length:MH},()=>Array(MW).fill(3));
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
  if(x<2||y<2||x>77||y>54)map[y][x]=0;
  const main=((x-24)/20)**2+((y-34)/19)**2<1;
  const east=x>=44&&x<=59&&y>=12&&y<=42;
  if(main||east)map[y][x]=1;
  if(x>=57&&x<=75&&y>=6&&y<=24)map[y][x]=4;
  if(x>=60&&x<=72&&y>=3&&y<=8)map[y][x]=4;
  if(x>=19&&x<=32&&y>=27&&y<=39)map[y][x]=4;
  if((y>=33&&y<=35&&x>=9&&x<=54)||(x>=25&&x<=27&&y>=20&&y<=47))map[y][x]=2;
  if(x>=49&&x<=51&&y>=17&&y<=34)map[y][x]=2;
  if(y>=16&&y<=18&&x>=50&&x<=62)map[y][x]=4;
  if(x>=39&&x<=43&&y>=18&&y<=47)map[y][x]=3;
  if(x>=38&&x<=45&&y>=33&&y<=35)map[y][x]=5;
  if(x>=16&&x<=20&&y>=40&&y<=42)map[y][x]=6;
 }
 return map;
}
export class Game{
 constructor(saved){
  this.map=makeMap();this.time=0;this.events=[];this.objects=[];this.enemies=[];this.particles=[];this.projectiles=[];this.texts=[];
  this.player={x:25.5*TILE,y:36*TILE,hp:100,maxHp:100,stamina:100,xp:0,level:1,dir:0,angle:-Math.PI/2,attack:0,dash:0,dashCd:0,spell:0,invincible:0,kills:0};
  this.bag={wood:0,stone:0,herb:0,essence:0,potion:3,core:0};this.flags={met:false,cottage:false,boss:false,hearth:false,upgrade:false};this.removed=new Set();this.harvests={};this.lastSave=0;
  this.build();if(saved)this.restore(saved);
 }
 build(){
  let n=0;const add=(type,x,y,props={})=>{const o={id:'o'+n++,type,x:x*TILE,y:y*TILE,hp:3,...props};this.objects.push(o);return o;};
  add('cottage',20.4,28,{radius:43});add('ruin',31.7,27.9,{radius:43});add('hearth',27.5,33,{radius:19});add('npc',25,31.5,{radius:12});add('arch',57.2,17.1,{radius:0});
  [[21,32],[31,32],[24,26],[28,39],[37.8,33],[44.8,33],[50,23],[59,17],[69,20],[10,34],[26,46]].forEach(p=>add('lamp',...p,{radius:6}));
  [[14,31],[34,38],[48,27],[61,20],[72,8]].forEach(p=>add('chest',...p,{radius:12}));
  for(let y=40;y<=42;y++)for(let x=17;x<=19;x++)add('plot',x+.5,y+.5,{radius:0,growing:0,ripe:false});
  const rand=random(145);for(let i=0;i<180;i++){
   const x=5+rand()*51,y=11+rand()*40,tx=Math.floor(x),ty=Math.floor(y);
   if(this.map[ty]?.[tx]!==1||this.objects.some(o=>distance(o,{x:x*TILE,y:y*TILE})<75))continue;
   const type=i%5===0?'ore':i%7===0?'herb':'tree';add(type,x,y,{radius:type==='tree'?14:type==='ore'?17:0,hp:type==='tree'?3:2});
  }
  [[12,39],[14,42],[34,29],[35,32],[46,22],[46,36],[51,29],[53,20],[55,36],[60,12],[62,20],[65,8],[71,19]].forEach((p,i)=>this.enemies.push({id:'e'+i,type:i%3===0?'bat':'slime',x:p[0]*TILE,y:p[1]*TILE,homeX:p[0]*TILE,homeY:p[1]*TILE,hp:i%3===0?34:48,maxHp:i%3===0?34:48,cd:0,hit:0,phase:i*.6,windup:0}));
  this.enemies.push({id:'boss',type:'guardian',x:69*TILE,y:12*TILE,homeX:69*TILE,homeY:12*TILE,hp:340,maxHp:340,cd:1,hit:0,phase:0,windup:0,slamCd:4});
 }
 tile(x,y){return this.map[Math.floor(y/TILE)]?.[Math.floor(x/TILE)]??0;}
 walkable(x,y,r=9){for(const [ox,oy] of [[-r,-r],[r,-r],[-r,r],[r,r]]){const t=this.tile(x+ox,y+oy);if(t===0||t===3)return false;}return !this.objects.some(o=>!this.removed.has(o.id)&&o.radius>0&&distance(o,{x,y})<o.radius+r);}
 move(entity,dx,dy,r=9){if(this.walkable(entity.x+dx,entity.y,r))entity.x+=dx;if(this.walkable(entity.x,entity.y+dy,r))entity.y+=dy;}
 event(type,data={}){this.events.push({type,...data});}
 toast(text){this.event('toast',{text});}
 gain(item,n,x=this.player.x,y=this.player.y){this.bag[item]+=n;this.float('+'+n+' '+ITEMS[item],x,y-30,'#eed39a');this.event('pickup');}
 float(text,x,y,color='#efcf8a'){this.texts.push({text,x,y,color,life:1.6});}
 particlesAt(x,y,color,n=10){const r=random(Math.floor(this.time*500)+n);for(let i=0;i<n;i++)this.particles.push({x,y,vx:(r()-.5)*120,vy:(r()-.5)*100-25,life:.3+r()*.5,max:1,color,size:1+r()*3});}
 exp(n){const p=this.player;p.xp+=n;while(p.xp>=p.level*70){p.xp-=p.level*70;p.level++;p.maxHp+=15;p.hp=p.maxHp;this.toast('Level '+p.level+' · Health restored');this.event('level');}}
 attack(){const p=this.player;if(p.attack>0)return false;p.attack=.32;this.event('attack');let nearest=this.enemies.filter(e=>e.hp>0&&distance(e,p)<90).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(nearest)p.angle=Math.atan2(nearest.y-p.y,nearest.x-p.x);
  for(const e of this.enemies)if(e.hp>0&&distance(e,p)<(e.type==='guardian'?90:76)&&Math.cos(Math.atan2(e.y-p.y,e.x-p.x)-p.angle)>-.1)this.hitEnemy(e,(this.flags.upgrade?24:17)+(p.level-1)*3);
  for(const o of this.objects)if(!this.removed.has(o.id)&&['tree','ore','herb'].includes(o.type)&&distance(o,p)<65&&Math.cos(Math.atan2(o.y-p.y,o.x-p.x)-p.angle)>-.4){o.hp--;o.hit=.18;this.particlesAt(o.x,o.y-15,o.type==='tree'?'#78a887':o.type==='ore'?'#a9b8b6':'#dd92b2',6);this.event('chop');if(o.hp<=0){this.removed.add(o.id);this.gain(o.type==='tree'?'wood':o.type==='ore'?'stone':'herb',o.type==='tree'?4:o.type==='ore'?3:2,o.x,o.y);this.exp(5);}}
  return true;
 }
 hitEnemy(e,amount){e.hp-=amount;e.hit=.15;const p=this.player,a=Math.atan2(e.y-p.y,e.x-p.x);this.move(e,Math.cos(a)*13,Math.sin(a)*13,8);this.float(String(amount),e.x,e.y-27,'#f4dbc3');this.particlesAt(e.x,e.y-10,'#a986c2',8);if(e.hp<=0){p.kills++;this.exp(e.type==='guardian'?100:18);this.gain('essence',e.type==='guardian'?8:2,e.x,e.y);if(e.type==='guardian'){this.flags.boss=true;this.gain('core',1,e.x,e.y);this.toast('The Heart Spark is yours. Return to the village hearth.');this.event('boss-defeated');}else if(p.kills%3===0)this.gain('herb',1,e.x,e.y);}}
 hurt(n){const p=this.player;if(p.invincible>0||p.dash>0)return;p.hp=Math.max(0,p.hp-n);p.invincible=.8;this.float('-'+n,p.x,p.y-36,'#ee8d9e');this.event('hurt');if(p.hp<=0){p.x=25.5*TILE;p.y=36*TILE;p.hp=p.maxHp;p.stamina=100;p.invincible=3;this.toast('Wren found you in the mist. Your belongings are safe.');this.event('respawn');for(const e of this.enemies){e.x=e.homeX;e.y=e.homeY;if(e.type==='guardian'&&!this.flags.boss)e.hp=e.maxHp;}}}
 dash(){const p=this.player;if(p.stamina<25||p.dashCd>0)return false;p.stamina-=25;p.dash=.18;p.dashCd=.6;this.event('dash');return true;}
 spell(){const p=this.player;if(p.stamina<35||p.spell>0)return false;p.stamina-=35;p.spell=3;this.event('spell');this.particlesAt(p.x,p.y-10,'#ffc579',35);for(const e of this.enemies)if(e.hp>0&&distance(p,e)<150)this.hitEnemy(e,42+(p.level-1)*4);return true;}
 heal(){const p=this.player;if(p.hp>=p.maxHp){this.toast('Your health is already full.');return false;}if(this.bag.potion<1){this.toast('No tonics left. Craft one in your pack (I).');return false;}this.bag.potion--;p.hp=Math.min(p.maxHp,p.hp+65);this.particlesAt(p.x,p.y,'#94d4b8',20);this.toast('Healing tonic · +65 health');this.event('heal');return true;}
 craft(recipe){const recipes={tonic:{cost:{herb:2},run:()=>this.bag.potion++},blade:{cost:{wood:6,stone:4,essence:4},run:()=>this.flags.upgrade=true}};const r=recipes[recipe];if(!r||recipe==='blade'&&this.flags.upgrade)return false;if(Object.entries(r.cost).some(([k,v])=>this.bag[k]<v)){this.toast('You need more materials.');return false;}for(const [k,v]of Object.entries(r.cost))this.bag[k]-=v;r.run();this.toast(recipe==='tonic'?'Crafted a healing tonic.':'Forged a tempered blade · +7 attack');this.event('craft');return true;}
 nearest(){return this.objects.filter(o=>!this.removed.has(o.id)&&!['tree','ore','lamp'].includes(o.type)&&distance(o,this.player)<(o.type==='cottage'||o.type==='ruin'?95:68)).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];}
 interact(){const o=this.nearest();if(!o)return false;if(o.type==='npc'){this.flags.met=true;this.event('dialogue');}else if(o.type==='chest'){this.removed.add(o.id);this.gain('potion',1,o.x,o.y);this.gain('wood',3,o.x,o.y);this.gain('stone',2,o.x,o.y);this.toast('Supply cache opened.');}else if(o.type==='herb'){this.removed.add(o.id);this.gain('herb',2,o.x,o.y);}else if(o.type==='ruin'){this.event('repair');}else if(o.type==='cottage'){this.player.hp=this.player.maxHp;this.toast('You rest at the Lantern Inn. Health restored.');this.event('heal');}else if(o.type==='hearth'){this.event('hearth');}else if(o.type==='arch'){this.toast('The Rootvault · Follow the stone passage east.');}else if(o.type==='plot'){if(o.ripe){this.gain('herb',2,o.x,o.y);o.ripe=false;o.growing=0;this.toast('Moonleaf harvested. The soil is ready again.');}else if(!o.growing){o.growing=30;this.toast('Moonleaf planted. It will grow in 30 seconds.');}else this.toast('Growing · '+Math.ceil(o.growing)+' seconds until harvest.');}return true;}
 repair(){if(this.flags.cottage)return false;if(this.bag.wood<12||this.bag.stone<8){this.toast('You need 12 timber and 8 stone.');return false;}this.bag.wood-=12;this.bag.stone-=8;this.flags.cottage=true;this.exp(35);this.bag.potion+=2;this.toast('The workshop is restored. Wren left you two tonics.');this.event('craft');return true;}
 rekindle(){if(this.flags.hearth)return false;if(!this.flags.cottage){this.toast('Restore the workshop first. Its tools will mend the hearth.');return false;}if(!this.bag.core){this.toast('The Heart Spark waits beneath the Rootvault.');return false;}this.bag.core--;this.flags.hearth=true;this.player.hp=this.player.maxHp;this.exp(100);this.event('victory');return true;}
 update(dt,input){this.time+=dt;const p=this.player;for(const k of ['attack','dash','dashCd','spell','invincible'])p[k]=Math.max(0,p[k]-dt);p.stamina=Math.min(100,p.stamina+dt*19);
  let dx=input.x||0,dy=input.y||0,mag=Math.hypot(dx,dy);if(mag){dx/=mag;dy/=mag;p.angle=Math.atan2(dy,dx);p.dir=Math.abs(dx)>Math.abs(dy)?dx<0?2:3:dy<0?1:0;}
  const speed=p.dash>0?530:145;if(p.dash>0&&!mag){dx=Math.cos(p.angle);dy=Math.sin(p.angle);}this.move(p,dx*speed*dt,dy*speed*dt);p.moving=mag>0;
  if(input.attack)this.attack();for(const o of this.objects){o.hit=Math.max(0,(o.hit||0)-dt);if(o.growing>0){o.growing=Math.max(0,o.growing-dt);if(o.growing===0)o.ripe=true;}}
  for(const e of this.enemies){if(e.hp<=0)continue;e.cd=Math.max(0,e.cd-dt);e.hit=Math.max(0,e.hit-dt);e.phase+=dt;const d=distance(e,p),boss=e.type==='guardian';if(d<(boss?320:235)&&d>29){let a=Math.atan2(p.y-e.y,p.x-e.x),speed=boss?47:e.type==='bat'?88:60;if(e.windup<=0)this.move(e,Math.cos(a)*dt*speed,Math.sin(a)*dt*speed,9);}else if(d>350&&distance(e,{x:e.homeX,y:e.homeY})>10){const a=Math.atan2(e.homeY-e.y,e.homeX-e.x);this.move(e,Math.cos(a)*dt*35,Math.sin(a)*dt*35);}
   if(d<(boss?55:34)&&e.cd===0){this.hurt(boss?19:9);e.cd=1.2;}
   if(boss&&d<360){e.slamCd-=dt;if(e.slamCd<=0&&e.windup<=0){e.windup=1.15;e.slamCd=5;}if(e.windup>0){e.windup-=dt;if(e.windup<=0){if(distance(e,p)<120)this.hurt(28);this.particlesAt(e.x,e.y,'#d1a877',30);this.event('slam',{x:e.x,y:e.y});}}}
  }
  for(const t of this.texts){t.life-=dt;t.y-=dt*19;}this.texts=this.texts.filter(t=>t.life>0);
  for(const a of this.particles){a.life-=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=dt*40;}this.particles=this.particles.filter(a=>a.life>0);
 }
 serialize(){return{version:1,player:{...this.player,attack:0,dash:0,invincible:0},bag:this.bag,flags:this.flags,removed:[...this.removed],objects:this.objects.map(o=>({id:o.id,hp:o.hp,growing:o.growing,ripe:o.ripe})),enemies:this.enemies.map(e=>({id:e.id,hp:e.hp})),time:this.time};}
 restore(s){if(s.version!==1||!s.player||!s.bag||!s.flags)return;for(const k of Object.keys(this.bag))if(Number.isFinite(s.bag[k]))this.bag[k]=clamp(Math.floor(s.bag[k]),0,9999);for(const k of Object.keys(this.flags))this.flags[k]=s.flags[k]===true;for(const k of ['x','y','hp','maxHp','stamina','xp','level','dir','kills'])if(Number.isFinite(s.player[k]))this.player[k]=s.player[k];this.player.level=clamp(this.player.level,1,99);this.player.maxHp=100+(this.player.level-1)*15;this.player.hp=clamp(this.player.hp,1,this.player.maxHp);this.player.stamina=clamp(this.player.stamina,0,100);this.removed=new Set(Array.isArray(s.removed)?s.removed:[]);for(const o of this.objects){const v=s.objects?.find(x=>x.id===o.id);if(v){if(Number.isFinite(v.hp))o.hp=v.hp;if(Number.isFinite(v.growing))o.growing=clamp(v.growing,0,30);o.ripe=v.ripe===true;}}for(const e of this.enemies){const v=s.enemies?.find(x=>x.id===e.id);if(v&&Number.isFinite(v.hp))e.hp=v.hp;}this.time=s.time||0;if(!this.walkable(this.player.x,this.player.y)){this.player.x=25.5*TILE;this.player.y=36*TILE;}}
}
