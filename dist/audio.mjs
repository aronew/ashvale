// Synthesised sound. No audio files ship with Ashvale.
let ctx = null, on = false, loop = null, layer = null;

export const isOn = () => on;
export function tone(freq = 220, duration = .12, type = 'sine', gain = .03, when = 0){
 if(!on || !ctx) return;
 const t0 = ctx.currentTime + when;
 const o = ctx.createOscillator(), g = ctx.createGain();
 o.type = type; o.frequency.setValueAtTime(freq, t0);
 g.gain.setValueAtTime(gain, t0);
 g.gain.exponentialRampToValueAtTime(.0008, t0 + duration);
 o.connect(g); g.connect(ctx.destination);
 o.start(t0); o.stop(t0 + duration);
}
export function sweep(from, to, duration = .2, type = 'sawtooth', gain = .03){
 if(!on || !ctx) return;
 const t0 = ctx.currentTime;
 const o = ctx.createOscillator(), g = ctx.createGain();
 o.type = type; o.frequency.setValueAtTime(from, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20,to), t0+duration);
 g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(.0008, t0+duration);
 o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0+duration);
}
export function noise(duration = .12, gain = .05, filterHz = 1200){
 if(!on || !ctx) return;
 const n = Math.floor(ctx.sampleRate*duration);
 const buf = ctx.createBuffer(1, n, ctx.sampleRate), data = buf.getChannelData(0);
 for(let i=0;i<n;i++) data[i] = (Math.random()*2-1) * (1 - i/n);
 const src = ctx.createBufferSource(); src.buffer = buf;
 const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterHz;
 const g = ctx.createGain(); g.gain.value = gain;
 src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
}

// Each zone gets its own slow motif so travelling feels like going somewhere.
const THEMES = {
 vale:  { notes:[146.83,220,293.66,261.63,196,220,174.61,130.81], drone:73.42, step:1600, wave:'sine' },
 town:  { notes:[174.61,261.63,329.63,293.66,261.63,196,220,174.61], drone:87.31, step:1400, wave:'triangle' },
 forest:{ notes:[130.81,196,233.08,174.61,146.83,196,155.56,130.81], drone:65.41, step:1750, wave:'sine' },
 cave:  { notes:[110,164.81,130.81,98,110,146.83,116.54,87.31], drone:55, step:2100, wave:'sine' },
 deep:  { notes:[103.83,155.56,123.47,92.5,103.83,138.59,116.54,77.78], drone:51.91, step:1900, wave:'sawtooth' }
};
let current = 'vale';
export function setTheme(name){
 if(name === current) return;
 current = THEMES[name] ? name : 'vale';
 if(on) startLoop();
}
function startLoop(){
 clearInterval(loop);
 const theme = THEMES[current] ?? THEMES.vale;
 let step = 0;
 const play = () => {
  if(document.hidden) return;
  tone(theme.notes[step % theme.notes.length], 2.4, theme.wave, .02);
  if(step % 2 === 0) tone(theme.drone, 3, 'sine', .011);
  if(step % 4 === 2) tone(theme.notes[(step+3) % theme.notes.length]*2, 1.1, 'triangle', .008);
  step++;
 };
 play();
 loop = setInterval(play, theme.step);
}
export function toggle(){
 if(on){ on = false; clearInterval(loop); return false; }
 try{
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume(); on = true; startLoop(); tone(293.66,.5);
 }catch{ on = false; }
 return on;
}

// Combat sounds, keyed to what the model actually did.
export function swingSound(kind, combo, heavy){
 const base = { sword:190, dagger:300, great:110, spear:230, saber:250, maul:90, glaive:170 }[kind] ?? 190;
 if(heavy){ sweep(base*1.5, base*.55, .34, 'sawtooth', .032); noise(.2,.03,900); return; }
 sweep(base*1.35, base*.7, combo === 2 ? .2 : .11, combo === 2 ? 'sawtooth' : 'triangle', .022);
}
export function impactSound(heavy, combo, killed){
 noise(heavy ? .17 : .1, heavy ? .07 : .045, heavy ? 700 : 1100);
 tone(heavy ? 58 : combo === 2 ? 68 : 115, .12, 'triangle', .034);
 if(killed) sweep(420, 120, .3, 'triangle', .025);
}
