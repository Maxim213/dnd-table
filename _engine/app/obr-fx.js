// D&D Table — atmosphere effects over the map (fog, ash, dripping water, sparks, rain, snow, gloom).
// The DM sets levels in the scene metadata 'dndtable/fx' = { fog: 0..3, ash: 0..3, … }.
// Every client (DM and players) draws them itself as LOCAL Owlbear "Effect" items: animated SkSL shaders
// attached to the map picture. Owlbear gives every effect shader `time` (seconds) and `size` (the parent's size).
// Our own shaders (written for this app). Layer RULER = above the tokens, under our vision fog (FOG layer),
// so darkness still hides them.

const KEY = 'dndtable/fx', MINE = 'dndtable/fxitem';

// ---------- shaders ----------
const HEAD = `
uniform float time;
uniform vec2 size;
uniform float level;
float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 h2(vec2 p) { return vec2(h1(p), h1(p + vec2(17.3, 51.9))); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float a = h1(i), b = h1(i + vec2(1.0, 0.0)), c = h1(i + vec2(0.0, 1.0)), d = h1(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
// one layer of drifting round particles; cell = size of a cell in scene units, vel = movement per second
float dots(vec2 coord, float cell, vec2 vel, float rad, float chance, float sway) {
  vec2 q = (coord + vel * time) / cell;
  vec2 id = floor(q); vec2 f = fract(q);
  vec2 r = 0.2 + 0.6 * h2(id);
  r.x += sway * sin(time * 1.3 + h1(id) * 6.28) * 0.15;
  float d = length(f - r);
  float on = step(h1(id + vec2(3.1, 7.7)), chance);
  return on * (1.0 - smoothstep(rad * 0.3, rad, d));
}
// streaks (rain, drips): particles stretched along y
float streaks(vec2 coord, float cell, vec2 vel, float w, float len, float chance) {
  vec2 q = (coord + vel * time) / cell;
  vec2 id = floor(q); vec2 f = fract(q);
  vec2 r = 0.15 + 0.7 * h2(id);
  vec2 d = (f - r) * vec2(1.0 / w, 1.0 / len);
  float on = step(h1(id + vec2(9.4, 1.3)), chance);
  return on * (1.0 - smoothstep(0.2, 1.0, length(d)));
}
`;

const SHADERS = {
  // slow rolling fog banks, light grey-blue
  fog: HEAD + `
half4 main(float2 coord) {
  vec2 p = coord / 150.0;
  float n = fbm(p * 0.18 + vec2(time * 0.035, time * 0.012));
  float m = fbm(p * 0.37 - vec2(time * 0.021, -time * 0.017) + n);
  float a = smoothstep(0.38, 0.85, n * 0.55 + m * 0.45) * (0.22 + 0.16 * level);
  vec3 c = vec3(0.78, 0.82, 0.88);
  return vec4(c * a, a);
}`,
  // grey ash flakes falling slowly and swaying
  ash: HEAD + `
half4 main(float2 coord) {
  float k = 0.25 + 0.25 * level;
  float a = dots(coord, 90.0, vec2(-6.0, -22.0), 0.07, k, 1.0) * 0.8;
  a += dots(coord + 37.0, 140.0, vec2(4.0, -16.0), 0.06, k, 1.0) * 0.55;
  a += dots(coord + 91.0, 60.0, vec2(-3.0, -30.0), 0.08, k * 0.8, 1.0) * 0.9;
  a = clamp(a, 0.0, 1.0) * 0.85;
  vec3 c = vec3(0.62, 0.6, 0.58);
  return vec4(c * a, a);
}`,
  // orange embers rising and flickering
  sparks: HEAD + `
half4 main(float2 coord) {
  float k = 0.12 + 0.12 * level;
  float fl = 0.6 + 0.4 * sin(time * 9.0 + coord.x * 0.05);
  float a = dots(coord, 110.0, vec2(5.0, 48.0), 0.09, k, 1.0) * 1.3;
  a += dots(coord + 53.0, 70.0, vec2(-7.0, 70.0), 0.07, k, 1.0);
  a = clamp(a * fl, 0.0, 1.0);
  vec3 c = mix(vec3(1.0, 0.45, 0.1), vec3(1.0, 0.85, 0.4), fl);
  return vec4(c * a, a);
}`,
  // rare drops falling from the cave roof
  drip: HEAD + `
half4 main(float2 coord) {
  float k = 0.06 + 0.06 * level;
  float a = streaks(coord, 160.0, vec2(0.0, -420.0), 0.012, 0.09, k);
  a += streaks(coord + 71.0, 230.0, vec2(0.0, -520.0), 0.01, 0.07, k);
  a = clamp(a, 0.0, 1.0) * 0.55;
  vec3 c = vec3(0.7, 0.85, 1.0);
  return vec4(c * a, a);
}`,
  // rain for the surface: dense slanted streaks + a slight grey veil
  rain: HEAD + `
half4 main(float2 coord) {
  float k = 0.25 + 0.2 * level;
  vec2 v = vec2(-160.0, -900.0);
  float a = streaks(coord, 70.0, v, 0.015, 0.22, k);
  a += streaks(coord + 23.0, 110.0, v * 1.2, 0.012, 0.2, k) * 0.8;
  a = clamp(a, 0.0, 1.0) * 0.45;
  float veil = 0.06 + 0.04 * level;
  vec3 c = vec3(0.75, 0.8, 0.9);
  return vec4(c * a + vec3(0.1, 0.12, 0.15) * veil, a + veil);
}`,
  // snow for the surface
  snow: HEAD + `
half4 main(float2 coord) {
  float k = 0.3 + 0.2 * level;
  float a = dots(coord, 80.0, vec2(-12.0, -35.0), 0.08, k, 1.5);
  a += dots(coord + 41.0, 130.0, vec2(8.0, -25.0), 0.07, k, 1.5) * 0.7;
  a = clamp(a, 0.0, 1.0) * 0.9;
  return vec4(vec3(1.0) * a, a);
}`,
  // darkness creeping in from the edges, slowly breathing
  gloom: HEAD + `
half4 main(float2 coord) {
  vec2 uv = coord / size;
  float d = length((uv - 0.5) * vec2(size.x / max(size.y, 1.0), 1.0));
  float pulse = 0.04 * sin(time * 0.8);
  float a = smoothstep(0.25 - 0.05 * level + pulse, 0.75, d) * (0.35 + 0.15 * level);
  return vec4(vec3(0.0), a);
}`
};
export const FX_LIST = ['fog', 'ash', 'drip', 'sparks', 'rain', 'snow', 'gloom'];

export function startFx(OBR) {
  let busy = false, again = false, last = '';
  async function reconcile() {
    if (busy) { again = true; return; } busy = true;
    try {
      const md = (await OBR.scene.getMetadata()) || {}; const fx = md[KEY] || {};
      const maps = await OBR.scene.items.getItems(it => it.layer === 'MAP' && it.type === 'IMAGE');
      const want = FX_LIST.filter(k => Number(fx[k]) > 0);
      const sig = JSON.stringify([want.map(k => k + fx[k]), maps.map(m => m.id + ':' + m.position.x + ',' + m.position.y + ':' + (m.scale && m.scale.x))]);
      if (sig === last) return; last = sig;
      const old = await OBR.scene.local.getItems(it => it.metadata && it.metadata[MINE]);
      if (old.length) await OBR.scene.local.deleteItems(old.map(it => it.id));
      const B = window.OBR_SDK; if (!B || !B.buildEffect || !want.length || !maps.length) return;
      const add = [];
      maps.forEach(m => want.forEach((k, i) => {
        add.push(B.buildEffect().attachedTo(m.id).position(m.position).rotation(m.rotation || 0).effectType('ATTACHMENT')
          .sksl(SHADERS[k]).uniforms([{ name: 'level', value: Math.min(3, Math.max(1, Number(fx[k]) || 1)) }])
          .layer('RULER').zIndex(i).locked(true).disableHit(true).disableAutoZIndex(true).metadata({ [MINE]: k }).build());
      }));
      await OBR.scene.local.addItems(add);
    } catch (e) { console.warn('fx', e); last = ''; }
    finally { busy = false; if (again) { again = false; reconcile(); } }
  }
  let t = 0; const soon = () => { clearTimeout(t); t = setTimeout(reconcile, 250); };
  try { OBR.scene.onMetadataChange(soon); } catch (e) {}
  try { OBR.scene.items.onChange(soon); } catch (e) {}
  try { OBR.scene.onReadyChange(r => { last = ''; if (r) soon(); }); } catch (e) {}
  OBR.scene.isReady().then(r => { if (r) soon(); }).catch(() => {});
  return { soon };
}
