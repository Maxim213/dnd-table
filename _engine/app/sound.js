// =====================================================================
//  Quiet sounds made right in the browser (no audio files needed):
//  button clicks, dice rattle + landing, and soft fantasy background music.
//  Settings live in localStorage 'dnd.sound'.
// =====================================================================
window.SND = (function () {
  'use strict';
  const KEY = 'dnd.sound';
  const S = Object.assign({ master: 0.6, sfx: 0.7, music: 0.45, musicOn: false, mute: false }, read());
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  let ctx = null, master, sfxBus, musicBus, musicIn, noise;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(master);
    // music goes through a soft room reverb
    musicIn = ctx.createGain(); musicIn.connect(musicBus);
    const verb = ctx.createConvolver(); verb.buffer = impulse(2.8);
    const wet = ctx.createGain(); wet.gain.value = 0.45; musicIn.connect(verb); verb.connect(wet); wet.connect(musicBus);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    apply(); return true;
  }
  function impulse(sec) {
    const n = Math.floor(ctx.sampleRate * sec); const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    return b;
  }
  // everything is kept quiet on purpose: full sliders are still soft
  function apply() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(S.mute ? 0 : S.master * 0.55, t, 0.05);
    sfxBus.gain.setTargetAtTime(S.sfx, t, 0.05);
    musicBus.gain.setTargetAtTime(S.music * 0.5, t, 0.2);
  }
  const ok = () => !S.mute && S.master > 0 && init();

  // ---------- effects ----------
  function env(g, t, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function burst(t, freq, q, peak, dur) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); env(g, t, peak, dur);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random() * 0.8, dur + 0.03);
  }
  function tone(t, freq, type, peak, dur, bus, endFreq) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = ctx.createGain(); env(g, t, peak, dur); o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function click() {
    if (!ok() || S.sfx <= 0) return;
    const t = ctx.currentTime; tone(t, 1700, 'triangle', 0.06, 0.05, null, 900);
  }
  function roll(dur) {
    if (!ok() || S.sfx <= 0) return;
    dur = dur || 0.55; const t = ctx.currentTime;
    for (let x = 0; x < dur; x += 0.025 + Math.random() * 0.05) burst(t + x, 1800 + Math.random() * 2600, 5, (0.1 + Math.random() * 0.2) * (1 - x / dur * 0.6), 0.025);
  }
  function land(kind) {
    if (!ok() || S.sfx <= 0) return;
    const t = ctx.currentTime;
    burst(t, 1200, 3, 0.35, 0.07); burst(t + 0.05, 2200, 6, 0.12, 0.04); tone(t, 190, 'sine', 0.18, 0.12, null, 120);
    if (kind === 'crit') [880, 1108.7, 1318.5, 1760].forEach((f, i) => tone(t + 0.08 + i * 0.07, f, 'sine', 0.09, 0.6));
    if (kind === 'fumble') tone(t + 0.06, 220, 'triangle', 0.12, 0.7, null, 98);
  }

  // ---------- background music (endless, calm, made from notes) ----------
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // D dorian — a "fantasy tavern / old map" feeling
  const CHORDS = [[50, 57, 62, 65], [48, 55, 60, 64], [43, 50, 59, 62], [50, 57, 62, 65], [53, 60, 65, 69], [48, 55, 60, 64], [45, 52, 60, 64], [50, 57, 62, 69]];
  const SCALE = [62, 64, 65, 67, 69, 71, 72, 74, 76, 77];
  const BAR = 4.8, STEP = BAR / 8;
  let playing = false, timer = null, nextBar = 0, barNo = 0, lastNote = 69;
  function pad(t, notes) {
    notes.forEach((m, i) => {
      const o = ctx.createOscillator(); o.type = i ? 'triangle' : 'sine'; o.frequency.value = hz(m); o.detune.value = (Math.random() - 0.5) * 8;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      const g = ctx.createGain(); const peak = i ? 0.035 : 0.06;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 1.4); g.gain.setValueAtTime(peak, t + BAR - 0.6); g.gain.linearRampToValueAtTime(0.0001, t + BAR + 1.2);
      o.connect(f); f.connect(g); g.connect(musicIn); o.start(t); o.stop(t + BAR + 1.3);
    });
  }
  function pluck(t, m, peak) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.5);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(f); f.connect(g); g.connect(musicIn); o.start(t); o.stop(t + 1.7);
  }
  function scheduleBar(t) {
    const ch = CHORDS[barNo % CHORDS.length]; barNo++;
    pad(t, ch.slice(1));
    pluck(t, ch[0], 0.05); // soft bass note
    for (let s = 0; s < 8; s++) {
      if (Math.random() > (s % 2 ? 0.35 : 0.6)) continue;
      // walk the melody: mostly small steps, prefer chord tones
      const opts = SCALE.filter(m => Math.abs(m - lastNote) <= 4);
      let m = opts[Math.floor(Math.random() * opts.length)] || 69;
      if (Math.random() < 0.5) { const tones = ch.map(x => x + 12).filter(x => x >= 62 && x <= 77); if (tones.length) m = tones[Math.floor(Math.random() * tones.length)]; }
      lastNote = m; pluck(t + s * STEP + (Math.random() - 0.5) * 0.03, m, 0.035 + Math.random() * 0.02);
    }
  }
  function tick() { while (nextBar < ctx.currentTime + 1.5) { scheduleBar(nextBar); nextBar += BAR; } }
  function musicStart() {
    if (playing || S.mute || !init()) return;
    playing = true; nextBar = ctx.currentTime + 0.15; barNo = 0; tick(); timer = setInterval(tick, 400);
  }
  function musicStop() { playing = false; clearInterval(timer); timer = null; }

  // browsers allow sound only after the first click on the page
  function unlock() {
    document.removeEventListener('pointerdown', unlock, true);
    if (S.musicOn && !S.mute) musicStart();
  }
  document.addEventListener('pointerdown', unlock, true);

  return {
    get: k => S[k],
    set(k, v) {
      S[k] = v; save(); apply();
      if (k === 'musicOn') { if (v) musicStart(); else musicStop(); }
      if (k === 'mute') { if (v) musicStop(); else if (S.musicOn) musicStart(); }
    },
    click, roll, land
  };
})();
