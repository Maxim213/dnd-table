// Table music: the music the DM picks plays for EVERYONE in the Owlbear room (classic script → window.TableMusic).
// Two kinds:
//   • moods — endless music made right in the browser (no files): tavern, travel, calm, dungeon, mystery, battle, boss, sad
//   • YouTube — a video link; everybody starts it at the same moment (the DM's start time)
// The state comes from the room metadata 'dndtable/music' = { on, kind: 'mood'|'yt', mood, yt, t } (t = start time, ms).
// Each person has their own volume: localStorage 'dnd.tableVol' (0..1, default 0.6) and 'dnd.tableMute' ('1' = muted).
window.TableMusic = (function () {
  'use strict';
  const vol = () => { try { const m = localStorage.getItem('dnd.tableMute') === '1'; const v = Number(localStorage.getItem('dnd.tableVol')); return m ? 0 : (isNaN(v) || localStorage.getItem('dnd.tableVol') == null ? 0.6 : v); } catch (e) { return 0.6; } };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  // ---------- moods: chords (MIDI notes), melody scale, bar length (s), how busy the melody is, drums ----------
  const MOODS = {
    tavern: { icon: '🍺', en: 'Tavern', ru: 'Таверна', bar: 2.4, steps: 8, dens: 0.55, cut: 1100, wave: 'sawtooth', perc: 'light',
      chords: [[50, 57, 62, 65], [48, 55, 60, 64], [43, 50, 59, 62], [45, 52, 57, 60]], scale: [62, 64, 65, 67, 69, 71, 72, 74, 76] },
    travel: { icon: '🌲', en: 'Travel', ru: 'Путешествие', bar: 3.2, steps: 8, dens: 0.45, cut: 1300, wave: 'triangle', perc: 'soft',
      chords: [[43, 55, 59, 62], [48, 55, 60, 64], [50, 57, 62, 66], [40, 52, 55, 59]], scale: [62, 64, 66, 67, 69, 71, 74, 76] },
    calm: { icon: '🌙', en: 'Calm / camp', ru: 'Спокойствие / привал', bar: 5.2, steps: 8, dens: 0.25, cut: 800, wave: 'sine', perc: '',
      chords: [[41, 53, 57, 60], [46, 53, 58, 62], [48, 55, 60, 64], [45, 53, 57, 60]], scale: [65, 67, 69, 72, 74, 77] },
    dungeon: { icon: '🕯', en: 'Dungeon', ru: 'Подземелье', bar: 6.4, steps: 8, dens: 0.16, cut: 420, wave: 'triangle', perc: 'drip',
      chords: [[38, 45, 50, 51], [38, 44, 50, 53], [37, 44, 49, 52], [38, 45, 50, 51]], scale: [50, 51, 53, 55, 56, 58, 62] },
    mystery: { icon: '🔮', en: 'Mystery', ru: 'Тайна', bar: 5, steps: 8, dens: 0.22, cut: 900, wave: 'triangle', perc: '',
      chords: [[48, 54, 58, 64], [50, 56, 60, 66], [46, 52, 58, 62], [48, 54, 60, 64]], scale: [60, 62, 64, 66, 68, 70, 72] },
    battle: { icon: '⚔️', en: 'Battle', ru: 'Бой', bar: 1.8, steps: 16, dens: 0.6, cut: 1600, wave: 'sawtooth', perc: 'battle',
      chords: [[45, 52, 57, 60], [41, 53, 57, 60], [43, 50, 55, 59], [40, 52, 56, 59]], scale: [57, 59, 60, 62, 64, 65, 67, 69, 72] },
    boss: { icon: '💀', en: 'Boss fight', ru: 'Босс', bar: 2.2, steps: 16, dens: 0.5, cut: 1200, wave: 'sawtooth', perc: 'heavy',
      chords: [[36, 48, 51, 55], [32, 44, 48, 51], [34, 46, 50, 53], [31, 43, 47, 50]], scale: [48, 50, 51, 53, 55, 56, 59, 60, 63] },
    sad: { icon: '🥀', en: 'Sad', ru: 'Грусть', bar: 5.6, steps: 8, dens: 0.3, cut: 700, wave: 'sine', perc: '',
      chords: [[45, 57, 60, 64], [50, 57, 62, 65], [41, 53, 57, 60], [40, 52, 56, 59]], scale: [64, 65, 67, 69, 71, 72, 74, 76] }
  };

  // ---------- the generator ----------
  let ctx = null, out = null, inBus = null, noise = null, timer = null, mood = null, nextBar = 0, barNo = 0, lastNote = 64;
  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    out = ctx.createGain(); out.connect(ctx.destination);
    inBus = ctx.createGain(); inBus.connect(out);
    const n = Math.floor(ctx.sampleRate * 2.6), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    const verb = ctx.createConvolver(); verb.buffer = b; const wet = ctx.createGain(); wet.gain.value = 0.4; inBus.connect(verb); verb.connect(wet); wet.connect(out);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    setVolume(); return true;
  }
  function setVolume() { if (out && ctx) out.gain.setTargetAtTime(vol() * 0.35, ctx.currentTime, 0.1); if (yt && yt.setVolume) try { yt.setVolume(Math.round(vol() * 100)); } catch (e) {} }
  function pad(t, notes, M) {
    notes.forEach((m, i) => {
      const o = ctx.createOscillator(); o.type = i ? 'triangle' : 'sine'; o.frequency.value = hz(m); o.detune.value = (Math.random() - 0.5) * 8;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = M.cut * 0.6;
      const g = ctx.createGain(); const peak = i ? 0.03 : 0.05;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + Math.min(1.4, M.bar * 0.3)); g.gain.setValueAtTime(peak, t + M.bar - 0.4); g.gain.linearRampToValueAtTime(0.0001, t + M.bar + 1);
      o.connect(f); f.connect(g); g.connect(inBus); o.start(t); o.stop(t + M.bar + 1.1);
    });
  }
  function note(t, m, peak, M, len) {
    const o = ctx.createOscillator(); o.type = M.wave; o.frequency.value = hz(m);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(M.cut * 2, t); f.frequency.exponentialRampToValueAtTime(Math.max(200, M.cut * 0.35), t + 0.5);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + (len || 1.4));
    o.connect(f); f.connect(g); g.connect(inBus); o.start(t); o.stop(t + (len || 1.4) + 0.1);
  }
  function hit(t, freq, q, peak, dur) {
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(inBus); s.start(t, Math.random() * 0.5, dur + 0.05);
  }
  function kick(t, peak) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.25); const g = ctx.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.4); }
  function bar(t) {
    const M = mood; const ch = M.chords[barNo % M.chords.length]; barNo++; const step = M.bar / M.steps;
    pad(t, ch.slice(1), M); note(t, ch[0], 0.06, M, M.bar * 0.9);
    for (let s = 0; s < M.steps; s++) {
      const ts = t + s * step;
      if (M.perc === 'battle' || M.perc === 'heavy') { if (s % 4 === 0) kick(ts, M.perc === 'heavy' ? 0.5 : 0.35); if (s % 8 === 4) hit(ts, 1800, 0.8, 0.12, 0.12); if (M.perc === 'battle' && s % 2 === 1) hit(ts, 7000, 3, 0.03, 0.04); if (s % 2 === 0) note(ts, ch[0] + (M.perc === 'heavy' ? 0 : 12), 0.035, M, step * 1.6); }
      if (M.perc === 'light' && s % 2 === 1) hit(ts, 6500, 4, 0.025, 0.05);
      if (M.perc === 'soft' && s % 4 === 2) hit(ts, 5000, 3, 0.018, 0.06);
      if (M.perc === 'drip' && Math.random() < 0.05) note(ts, 84 + Math.floor(Math.random() * 6), 0.02, Object.assign({}, M, { wave: 'sine', cut: 3000 }), 0.3);
      if (Math.random() > M.dens * (s % 2 ? 0.7 : 1)) continue;
      const opts = M.scale.filter(m => Math.abs(m - lastNote) <= 5); let m = opts[Math.floor(Math.random() * opts.length)] || M.scale[0];
      if (Math.random() < 0.4) { const tones = ch.map(x => x + 12).filter(x => x >= M.scale[0] && x <= M.scale[M.scale.length - 1]); if (tones.length) m = tones[Math.floor(Math.random() * tones.length)]; }
      lastNote = m; note(ts + (Math.random() - 0.5) * 0.02, m, 0.03 + Math.random() * 0.02, M, Math.min(1.6, step * 3));
    }
  }
  function tick() { if (!mood) return; while (nextBar < ctx.currentTime + 1.2) { bar(nextBar); nextBar += mood.bar; } }
  function playMood(key) {
    stopYt();
    if (!init()) return false;
    try { ctx.resume(); } catch (e) {}
    const M = MOODS[key] || MOODS.tavern; if (mood === M && timer) return true;
    mood = M; barNo = 0; nextBar = ctx.currentTime + 0.2; clearInterval(timer); tick(); timer = setInterval(tick, 300);
    return true;
  }
  function stopMood() { mood = null; clearInterval(timer); timer = null; }

  // ---------- YouTube ----------
  let yt = null, ytId = '', ytBox = null, ytApi = null;
  const ytIdOf = url => { const s = String(url || '').trim(); const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : /^[\w-]{11}$/.test(s) ? s : ''; };
  function loadApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytApi) return ytApi;
    ytApi = new Promise(ok => { window.onYouTubeIframeAPIReady = ok; const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s); });
    return ytApi;
  }
  async function playYt(id, startedAt) {
    stopMood();
    const offset = Math.max(0, Math.floor((Date.now() - (startedAt || Date.now())) / 1000));
    await loadApi();
    if (yt && ytId === id) { try { yt.playVideo(); } catch (e) {} return; }
    stopYt(); ytId = id;
    ytBox = document.createElement('div'); ytBox.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:180px'; const inner = document.createElement('div'); ytBox.appendChild(inner); document.body.appendChild(ytBox);
    yt = new window.YT.Player(inner, {
      videoId: id, width: 320, height: 180,
      playerVars: { autoplay: 1, start: offset, loop: 1, playlist: id, controls: 0, playsinline: 1 },
      events: { onReady: e => { try { e.target.setVolume(Math.round(vol() * 100)); e.target.playVideo(); } catch (er) {} } }
    });
  }
  function stopYt() { if (yt) { try { yt.destroy(); } catch (e) {} } yt = null; ytId = ''; if (ytBox) ytBox.remove(); ytBox = null; }

  // ---------- public ----------
  let current = null;
  function apply(st) {
    current = st || null;
    if (!st || !st.on) { stopMood(); stopYt(); return; }
    if (st.kind === 'yt' && st.yt) playYt(st.yt, st.t); else playMood(st.mood);
  }
  const blocked = () => !!(ctx && ctx.state === 'suspended' && mood);
  return { MOODS, apply, setVolume, ytIdOf, blocked, resume: () => { if (ctx) ctx.resume(); if (current) apply(current); }, current: () => current };
})();
