const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Exercise the real folder importer. Only the browser/remote Owlbear boundary is replaced.
function importer(uploadScenes) {
  const status = { innerHTML: '' };
  const notices = [];
  const U = {
    T: (s, ...args) => s.replace(/\{(\d+)\}/g, (_, n) => args[n]),
    S: { chars: [], monsters: [], encounters: [] }, D: {}, E: { uid: () => 'id' },
    esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    ACT: {}, ON: {}, DM: true, renderTop() {}, render() {},
    saveMonsters() {}, saveEncounters() {}, toast: s => notices.push(s)
  };
  function builder(initial = {}) {
    const data = { ...initial };
    return new Proxy({}, { get: (_, key) => key === 'build' ? () => data : value => {
      data[key] = value;
      return builder(data);
    } });
  }
  const window = {
    UI: U, ONLINE: { owlbear: true },
    OBR: { assets: { uploadScenes }, scene: {
      items: { onChange() {} }, onReadyChange() {}
    } },
    OBR_SDK: { buildImageUpload: file => builder({ file }), buildSceneUpload: () => builder() }
  };
  const context = vm.createContext({
    window, document: { baseURI: 'https://example.com/', getElementById: id => id === 'scMsg' ? status : null },
    URL, Blob, File, console: { warn() {} }, setTimeout() {}, clearTimeout() {},
    fetch: async () => ({ ok: true, json: async () => [] }),
    localStorage: { getItem: () => null, setItem() {} }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../_engine/app/obr-scenes.js'), 'utf8'), context);
  return { run: U._importScenario, status, notices };
}

function folder(scenes, images = []) {
  const manifest = new File([JSON.stringify({ name: 'Campaign', scenes })], 'scenario.json');
  Object.defineProperty(manifest, 'webkitRelativePath', { value: 'Owlbear_Pack/scenario.json' });
  return [manifest, ...images];
}

test('selected PNG files are copied before crossing the Owlbear frame boundary', async () => {
  const selected = new File(['image bytes'], 'map.png', { type: 'image/png' });
  Object.defineProperty(selected, 'webkitRelativePath', { value: 'Owlbear_Pack/maps/map.png' });
  const uploaded = [];
  const imp = importer(async scenes => {
    for (const scene of scenes) {
      // A selected, disk-backed File cannot be shared directly with Owlbear (SDK docs).
      if (scene.baseMap.file === selected) throw new Error('File cannot cross the frame boundary');
      uploaded.push(await scene.baseMap.file.text());
    }
  });
  await imp.run(folder([{ name: 'Hall', map: 'maps/map.png', heroes: false }], [selected]));
  assert.deepEqual(uploaded, ['image bytes']);
  assert.match(imp.status.innerHTML, /1 of 1/);
});

test('failed Owlbear uploads are reported as failures, without a success badge', async () => {
  const imp = importer(async () => { throw new Error('Network Error'); });
  await imp.run(folder([{ name: 'Hall', map: 'map.png', heroes: false }], [new File(['png'], 'map.png', { type: 'image/png' })]));
  assert.match(imp.status.innerHTML, /Network Error/);
  assert.doesNotMatch(imp.status.innerHTML, /^✅/);
  assert.ok(imp.notices.some(s => s.includes('Network Error')), 'failure must also be visible outside the scrolled status line');
});

test('a missing map is counted as an import failure', async () => {
  const imp = importer(async () => {});
  await imp.run(folder([{ name: 'Lost hall', map: 'missing.png', heroes: false }]));
  assert.doesNotMatch(imp.status.innerHTML, /^✅/);
  assert.match(imp.status.innerHTML, /missing.png/);
});
