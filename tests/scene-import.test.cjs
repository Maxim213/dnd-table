const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Only browser decoding/rendering and the remote Owlbear boundary are replaced.
function importer(options = {}) {
  const statuses = [];
  let currentStatus = '';
  const status = { get innerHTML() { return currentStatus; }, set innerHTML(value) { currentStatus = value; statuses.push(value); } };
  const pop = { innerHTML: '', classList: { add() {} } };
  const notices = [], calls = [], inputs = [], canvases = [], added = [], confirmations = [];
  const U = {
    T: (s, ...args) => s.replace(/\{(\d+)\}/g, (_, n) => args[n]),
    S: { chars: [], monsters: [], encounters: [] }, D: {}, E: { uid: () => 'id' },
    esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    ACT: {}, ON: {}, DM: true, renderTop() {}, render() {}, byId: id => U.S.chars.find(c => c.id === id),
    saveMonsters() {}, saveEncounters() {}, toast: s => notices.push(s)
  };
  function builder(initial = {}) {
    const data = { ...initial };
    return new Proxy({}, { get: (_, key) => key === 'build' ? () => data : value => {
      data[key] = value; return builder(data);
    } });
  }
  class Picture {
    naturalWidth = 1024; naturalHeight = 512;
    set src(value) { this.url = value; queueMicrotask(() => this.onload()); }
  }
  const window = {
    UI: U, ONLINE: { owlbear: true },
    OBR: {
      assets: {
        uploadScenes: async scenes => { calls.push({ kind: 'scenes', list: scenes }); await options.uploadScenes?.(scenes); },
        uploadImages: async (list, category) => { calls.push({ kind: 'images', list, category }); await options.uploadImages?.(list); }
      },
      viewport: { getWidth: async () => 1000, getHeight: async () => 800, getScale: async () => 1, getPosition: async () => ({ x: 0, y: 0 }) },
      scene: { items: { onChange() {}, getItems: async () => [], addItems: async list => added.push(...list) }, onReadyChange() {} }
    },
    OBR_SDK: { buildImageUpload: file => builder({ file }), buildSceneUpload: () => builder(), buildImage: image => builder({ image }) }
  };
  const context = vm.createContext({
    window, document: {
      baseURI: 'https://example.com/',
      getElementById: id => id === 'scMsg' ? status : id === 'pop' ? pop : null,
      body: { appendChild() {} },
      createElement: tag => {
        if (tag === 'input') { const input = { style: {}, setAttribute() {}, remove() {}, click() {} }; inputs.push(input); return input; }
        if (tag === 'canvas') { const canvas = { width: 0, height: 0, getContext: () => ({ drawImage() {} }), toBlob: (cb, type) => cb(new Blob(['resized'], { type })) }; canvases.push(canvas); return canvas; }
        throw new Error('Unexpected element ' + tag);
      }
    },
    URL, Blob, File, Image: Picture, queueMicrotask, console: { warn() {} }, setTimeout() {}, clearTimeout() {},
    confirm: text => { confirmations.push(text); return options.confirm?.(text) ?? false; },
    fetch: async () => ({ ok: true, json: async () => [] }),
    localStorage: { getItem: () => null, setItem() {} }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../_engine/app/obr-scenes.js'), 'utf8'), context);
  return { run: U._importScenario, U, status, statuses, pop, notices, calls, inputs, canvases, added, confirmations };
}

function asset(name, type = 'image/png', contents = 'image bytes') {
  const file = new File([contents], name.split('/').pop(), { type });
  Object.defineProperty(file, 'webkitRelativePath', { value: 'Campaign_Pack/' + name });
  return file;
}
function folder(scenes, images = [], extra = {}) {
  return [asset('scenario.json', 'application/json', JSON.stringify({ name: 'Campaign', scenes, ...extra })), ...images];
}
const hall = { name: 'Hall', map: 'maps/map.png', heroes: false };
const pack = extra => folder([hall], [asset('maps/map.png')], extra);

test('selected map files are copied and the SDK acknowledgment is reported only as a handoff', async () => {
  const selected = asset('maps/map.png');
  const imp = importer();
  await imp.run(folder([hall], [selected]));
  assert.notEqual(imp.calls[0].list[0].baseMap.file, selected);
  assert.equal(await imp.calls[0].list[0].baseMap.file.text(), 'image bytes');
  assert.match(imp.status.innerHTML, /Scenes handed to Owlbear: 1 of 1/);
  assert.doesNotMatch(imp.status.innerHTML, /✅|Scenes uploaded|loaded:/);
});

test('a failed scene handoff is surfaced once without blind retries', async () => {
  const imp = importer({ uploadScenes: async () => { throw new Error('Network Error'); } });
  await imp.run(pack());
  assert.equal(imp.calls.length, 1);
  assert.match(imp.status.innerHTML, /Network Error/);
  assert.doesNotMatch(imp.status.innerHTML, /✅/);
  assert.ok(imp.notices.some(s => s.includes('Network Error')));
});

test('an explicitly confirmed scene retry updates the handoff count without claiming cloud completion', async () => {
  let attempts = 0;
  const imp = importer({ confirm: () => true, uploadScenes: async () => { if (++attempts === 1) throw new Error('First acknowledgment lost'); } });
  await imp.run(pack());
  await imp.U.ACT.scRetryScenes();
  assert.equal(imp.calls.length, 2);
  assert.match(imp.status.innerHTML, /Scenes handed to Owlbear: 1 of 1/);
  assert.doesNotMatch(imp.status.innerHTML, /✅|uploaded|loaded:/);
});

test('token files resolve beside a manifest inside a selected parent folder', async () => {
  const imp = importer();
  const nested = name => {
    const file = new File([name.endsWith('json') ? JSON.stringify({ tokenLibrary: [{ id: 'a', name: 'Guard', src: 'tokens/a.png' }] }) : 'png'], name.split('/').pop(), { type: name.endsWith('png') ? 'image/png' : 'application/json' });
    Object.defineProperty(file, 'webkitRelativePath', { value: 'Parent/Pack/' + name }); return file;
  };
  await imp.run([nested('scenario.json'), nested('tokens/a.png')]);
  assert.match(imp.status.innerHTML, /Tokens prepared: 1 of 1/);
  await imp.U.ACT.scTokens();
  assert.equal(imp.calls[0].kind, 'images');
});

test('a missing map is counted as a preparation failure', async () => {
  const imp = importer();
  await imp.run(folder([{ ...hall, map: 'missing.png' }]));
  assert.equal(imp.calls.length, 0);
  assert.match(imp.status.innerHTML, /missing.png/);
  assert.doesNotMatch(imp.status.innerHTML, /✅/);
});

test('all declared library tokens wait for explicit scene confirmation and survive modal reopening', async () => {
  const imp = importer();
  const files = folder([hall], [asset('maps/map.png'), asset('tokens/a.webp', 'image/webp'), asset('tokens/b.png')], {
    tokenLibrary: [{ id: 'a', name: 'Лесной страж', src: 'tokens/a.webp', dpi: 1024 }, { id: 'b', name: 'Не в бою', src: 'tokens/b.png' }]
  });
  await imp.run(files);
  assert.deepEqual(imp.calls.map(c => c.kind), ['scenes']);
  imp.U.ACT.scenes();
  assert.match(imp.pop.innerHTML, /data-act="scTokens"/);
  assert.match(imp.pop.innerHTML, /data-act="scFolder" disabled/);
  assert.doesNotMatch(imp.pop.innerHTML, /Last Kingdom/);
  assert.match(imp.status.innerHTML, /Tokens prepared: 2 of 2/);
  await imp.U.ACT.scTokens();
  assert.deepEqual(imp.calls.map(c => c.kind), ['scenes', 'images']);
  assert.equal(imp.calls[1].category, 'CHARACTER');
  assert.deepEqual(Array.from(imp.calls[1].list, t => t.name), ['Лесной страж', 'Не в бою']);
  assert.ok(imp.canvases.length === 2 && imp.canvases.every(c => c.width <= 512 && c.height <= 512));
  assert.equal(imp.calls[1].list[0].file.type, 'image/png');
  assert.equal(imp.calls[1].list[0].dpi, 512);
  assert.equal(await files[2].text(), 'image bytes');
  assert.match(imp.status.innerHTML, /Tokens handed to Owlbear: 2/);
  assert.doesNotMatch(imp.status.innerHTML, /✅|uploaded|loaded:/);
});

test('missing token files are reported without substituting a generic creature', async () => {
  const imp = importer();
  await imp.run(pack({ tokenLibrary: [{ id: 'lost', name: 'Lost guard', src: 'tokens/lost.png' }] }));
  assert.match(imp.status.innerHTML, /tokens\/lost.png/);
  assert.match(imp.status.innerHTML, /Tokens prepared: 0 of 1/);
  assert.equal(imp.calls.length, 1);
});

test('every compiler-supported source image format is decoded into a PNG library upload', async () => {
  const imp = importer();
  const sources = ['guard.jpg', 'scout.jpeg', 'ghost.gif', 'mage.avif', 'rune.svg'];
  await imp.run(folder([], sources.map(name => asset('tokens/' + name)), {
    tokenLibrary: sources.map(name => ({ id: name, name, src: 'tokens/' + name }))
  }));
  assert.match(imp.status.innerHTML, /Tokens prepared: 5 of 5/);
  await imp.U.ACT.scTokens();
  assert.equal(imp.calls[0].category, 'CHARACTER');
  assert.equal(imp.calls[0].list.length, 5);
  assert.ok(imp.calls[0].list.every(entry => entry.file.type === 'image/png'));
});

test('token preparation reports its current entry and total before the handoff', async () => {
  const imp = importer();
  await imp.run(folder([], [asset('tokens/a.png'), asset('tokens/b.png')], {
    tokenLibrary: [{ id: 'a', name: 'Guard', src: 'tokens/a.png' }, { id: 'b', name: 'Scout', src: 'tokens/b.png' }]
  }));
  assert.ok(imp.statuses.some(value => /Preparing tokens: 1 of 2/.test(value)));
  assert.ok(imp.statuses.some(value => /Preparing tokens: 2 of 2/.test(value)));
  assert.equal(imp.calls.length, 0);
});

test('folder picker locks immediately and cancellation or invalid input releases it', async () => {
  const imp = importer();
  imp.U.ACT.scFolder(); imp.U.ACT.scFolder();
  assert.equal(imp.inputs.length, 1);
  imp.inputs[0].oncancel();
  imp.U.ACT.scFolder();
  assert.equal(imp.inputs.length, 2);
  imp.inputs[1].files = [];
  await imp.inputs[1].onchange();
  imp.U.ACT.scFolder();
  assert.equal(imp.inputs.length, 3);
  imp.inputs[2].files = [asset('wrong.json')];
  await imp.inputs[2].onchange();
  imp.U.ACT.scFolder();
  assert.equal(imp.inputs.length, 4);
});

test('imports cannot overlap while an SDK request or scene confirmation is pending', async () => {
  let release;
  const imp = importer({ uploadScenes: () => new Promise(resolve => { release = resolve; }) });
  const work = imp.run(pack());
  while (!release) await new Promise(resolve => setImmediate(resolve));
  const second = imp.run(pack()); imp.U.ACT.scFolder();
  assert.equal(imp.calls.length, 1);
  assert.equal(imp.inputs.length, 0);
  release(); await work; await second;
  await imp.run(pack()); imp.U.ACT.scFolder();
  assert.equal(imp.calls.length, 1);
  assert.equal(imp.inputs.length, 0);
});

test('the lock also covers asynchronous folder reading before scene preparation', async () => {
  const imp = importer();
  const files = pack();
  const source = await files[0].text();
  let release;
  files[0].text = () => new Promise(resolve => { release = () => resolve(source); });
  const work = imp.run(files);
  imp.U.ACT.scFolder(); await imp.run(files);
  assert.equal(imp.inputs.length, 0);
  assert.equal(imp.calls.length, 0);
  release(); await work;
  assert.equal(imp.calls.length, 1);
});

test('a pending or failed token handoff stays guarded until an explicit finish or retry', async () => {
  let reject;
  const imp = importer({ uploadImages: () => new Promise((_, fail) => { reject = fail; }) });
  await imp.run(folder([], [asset('tokens/a.png')], { tokenLibrary: [{ id: 'a', name: 'Guard', src: 'tokens/a.png' }] }));
  const work = imp.U.ACT.scTokens();
  await imp.U.ACT.scTokens(); imp.U.ACT.scFinish(); imp.U.ACT.scFolder();
  assert.equal(imp.calls.length, 1);
  assert.equal(imp.inputs.length, 0);
  reject(new Error('Token acknowledgment lost')); await work;
  assert.match(imp.status.innerHTML, /Token acknowledgment lost/);
  await imp.U.ACT.scTokens();
  assert.equal(imp.calls.length, 1);
  imp.U.ACT.scFinish(); imp.U.ACT.scFolder();
  assert.equal(imp.inputs.length, 1);
});

test('aborting after a scene handoff error restores folder selection without opening tokens', async () => {
  const imp = importer({ confirm: () => true, uploadScenes: async () => { throw new Error('Scene acknowledgment lost'); } });
  const files = folder([hall], [asset('maps/map.png'), asset('tokens/a.png')], { tokenLibrary: [{ id: 'a', name: 'Guard', src: 'tokens/a.png' }] });
  await imp.run(files);
  assert.match(imp.pop.innerHTML, /data-act="scCancel"/);
  imp.U.ACT.scCancel();
  assert.doesNotMatch(imp.pop.innerHTML, /data-act="scFolder" disabled|data-act="scTokens"|Scene acknowledgment lost/);
  imp.U.ACT.scFolder();
  assert.equal(imp.inputs.length, 1);
  imp.inputs[0].oncancel();
  assert.deepEqual(imp.calls.map(call => call.kind), ['scenes']);
  await imp.run(files);
  assert.ok(imp.confirmations.some(value => value.includes('already handed to Owlbear')), 'aborting retains the receipt for a deliberate reupload');
});

test('a token-only pending import can be abandoned before opening the Owlbear dialog', async () => {
  const imp = importer({ confirm: () => true });
  await imp.run(folder([], [asset('tokens/a.png')], { tokenLibrary: [{ id: 'a', name: 'Guard', src: 'tokens/a.png' }] }));
  assert.match(imp.pop.innerHTML, /data-act="scCancel"/);
  imp.U.ACT.scCancel();
  await imp.U.ACT.scTokens();
  imp.U.ACT.scFolder();
  assert.equal(imp.calls.length, 0);
  assert.equal(imp.inputs.length, 1);
});

test('declining cancellation preserves prepared tokens and the current workflow', async () => {
  const imp = importer({ confirm: () => false });
  await imp.run(folder([], [asset('tokens/a.png')], { tokenLibrary: [{ id: 'a', name: 'Guard', src: 'tokens/a.png' }] }));
  imp.U.ACT.scCancel();
  imp.U.ACT.scFolder();
  assert.equal(imp.inputs.length, 0);
  await imp.U.ACT.scTokens();
  assert.equal(imp.calls[0].list[0].name, 'Guard');
  assert.match(imp.pop.innerHTML, /data-act="scCancel"/);
});

test('finishing blocks a duplicate folder unless reupload is deliberately confirmed', async () => {
  let allow = false;
  const imp = importer({ confirm: () => allow });
  const files = pack();
  await imp.run(files); imp.U.ACT.scFinish();
  await imp.run(files);
  assert.equal(imp.calls.length, 1);
  assert.equal(imp.confirmations.length, 1);
  allow = true;
  await imp.run(files);
  assert.equal(imp.calls.length, 2);
});

test('explicit hero token wins over the class default when placed on the scene', async () => {
  const imp = importer();
  imp.U.S.chars.push({ id: 'hero', name: 'Hero', classKey: 'wizard', token: 'https://example.com/my-hero.png' });
  await imp.U.ACT.heroToScene({ id: 'hero' });
  assert.equal(imp.added[0].image.url, 'https://example.com/my-hero.png');
});
