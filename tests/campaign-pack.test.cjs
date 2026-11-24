const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const builderPath = path.resolve(__dirname, '../_engine/make_campaign_pack.cjs');
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-pack-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const campaignDir = path.join(root, 'Campaign');
  const gameDir = path.join(root, 'GAME');
  const tokenSourceDir = path.join(campaignDir, 'Tokens');
  const pack = path.join(campaignDir, 'Owlbear_Pack');
  const custom = path.join(gameDir, 'assets/tokens/custom');
  for (const dir of [tokenSourceDir, pack, custom]) fs.mkdirSync(dir, { recursive: true });
  const scene = {
    name: 'Underground kingdom', notes: 'Keep this lore.', appScenario: 'Kingdom.scenario.json',
    encounters: [{ name: 'Patrol', monsters: [{ mid: 'srd:guard', qty: 2 }] }],
    scenes: [{ name: 'The gate', map: 'maps/gate.webp', cellPx: 50, walls: [[1, 2]],
      tokens: [{ monster: 'srd:guard', x: 3, y: 4, hidden: true }], fog: true }],
    tokenLibrary: [{ id: 'legacy', name: 'An old friend', src: 'tokens/legacy.webp', dpi: 150 }]
  };
  writeJson(path.join(pack, 'scenario.json'), scene);
  const app = { id: 'kingdom', name: 'All lore survives', monsters: {
    guard: { name: 'Guard', traits: 'Carries a silver badge', token: 'old/default' }
  }, shops: [{ name: 'Market', stock: ['rope'] }] };
  for (const dir of [campaignDir, pack]) writeJson(path.join(dir, 'Kingdom.scenario.json'), app);
  fs.mkdirSync(path.join(pack, 'tokens'));
  fs.writeFileSync(path.join(pack, 'tokens/legacy.webp'), 'legacy image');
  fs.writeFileSync(path.join(custom, 'unrelated.webp'), 'unrelated image');
  writeJson(path.join(custom, 'index.json'), ['unrelated.webp']);
  fs.writeFileSync(path.join(tokenSourceDir, 'Страж.webp'), 'guard image');
  const inventoryPath = path.join(root, 'inventory.json');
  const inventory = [
    { id: 'guard', name: 'Страж ворот', existing: 'Страж.webp', dpi: 96 },
    { id: 'captain', name: 'Captain Rowan', existing: 'Страж.webp', type: 'NPC' }
  ];
  writeJson(inventoryPath, inventory);
  return { root, campaignDir, tokenSourceDir, gameDir, inventoryPath, inventory, pack, custom, scene, app };
}

function build(f) {
  return require(builderPath).buildCampaignPack(f);
}

function snapshot(root) {
  const files = {};
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else files[path.relative(root, file)] = fs.readFileSync(file).toString('base64');
    }
  }
  walk(root);
  return files;
}

test('missing inventory art fails before any pack, scenario or index writes', t => {
  const f = fixture(t);
  f.inventory.push({ id: 'absent', name: 'The unseen queen', existing: null });
  writeJson(f.inventoryPath, f.inventory);
  const before = snapshot(f.root);
  assert.throws(() => build(f), /The unseen queen.*(image|file|source)/i);
  assert.deepEqual(snapshot(f.root), before);
});

test('a nonexistent declared source fails before copying any earlier valid art', t => {
  const f = fixture(t);
  f.inventory.push({ id: 'absent', name: 'The unseen queen', file: 'missing.png', existing: 'Страж.webp' });
  writeJson(f.inventoryPath, f.inventory);
  const before = snapshot(f.root);
  assert.throws(() => build(f), /The unseen queen.*missing image file/i);
  assert.deepEqual(snapshot(f.root), before);
});

test('an app monster absent from the inventory cannot retain fallback art silently', t => {
  const f = fixture(t);
  const app = structuredClone(f.app);
  app.monsters.queen = { name: 'The unseen queen', token: 'generic/person' };
  writeJson(path.join(f.campaignDir, 'Kingdom.scenario.json'), app);
  const before = snapshot(f.root);
  assert.throws(() => build(f), /queen.*inventory/i);
  assert.deepEqual(snapshot(f.root), before);
});

test('duplicate inventory identities are rejected without dropping a named creature', t => {
  const f = fixture(t);
  f.inventory[1].id = 'guard';
  writeJson(f.inventoryPath, f.inventory);
  const before = snapshot(f.root);
  assert.throws(() => build(f), /Duplicate inventory id: guard/);
  assert.deepEqual(snapshot(f.root), before);
});

test('missing previously declared library art fails without emitting a broken pack', t => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.pack, 'tokens/legacy.webp'));
  const before = snapshot(f.root);
  assert.throws(() => build(f), /An old friend.*missing image/i);
  assert.deepEqual(snapshot(f.root), before);
});

test('a broken custom index is detected before scenario files or art are changed', t => {
  const f = fixture(t);
  writeJson(path.join(f.custom, 'index.json'), { files: [] });
  const before = snapshot(f.root);
  assert.throws(() => build(f), /index must be an array/i);
  assert.deepEqual(snapshot(f.root), before);
});

test('different existing custom artwork fails with a unique-filename instruction before any writes', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.custom, 'Страж.webp'), 'a different original guard');
  const before = snapshot(f.root);
  assert.throws(() => build(f), /Страж\.webp.*unique filename/i);
  assert.deepEqual(snapshot(f.root), before);
});

test('identical existing custom artwork is accepted', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.custom, 'Страж.webp'), 'guard image');
  build(f);
  assert.equal(readJson(path.join(f.pack, 'scenario.json')).tokenLibrary.find(row => row.id === 'guard').src,
    'tokens/Страж.webp');
  assert.equal(fs.readFileSync(path.join(f.custom, 'Страж.webp'), 'utf8'), 'guard image');
});

const malformedLibraryEntries = [
  ['traversal to the manifest', { src: 'tokens/../scenario.json' }],
  ['dot segment', { src: 'tokens/./legacy.webp' }],
  ['backslash', { src: 'tokens\\legacy.webp' }],
  ['absolute path', { src: '/tokens/legacy.webp' }],
  ['empty path segment', { src: 'tokens//legacy.webp' }],
  ['outside tokens', { src: 'scenario.json' }],
  ['non-image', { src: 'tokens/notes.txt' }],
  ['missing id', { id: undefined }],
  ['blank id', { id: ' ' }],
  ['numeric id', { id: 7 }],
  ['missing name', { name: undefined }],
  ['blank name', { name: '\t' }],
  ['numeric name', { name: 7 }],
  ['zero dpi', { dpi: 0 }],
  ['negative dpi', { dpi: -5 }],
  ['nonnumeric dpi', { dpi: '150' }],
  ['null dpi', { dpi: null }],
  ['duplicate id', { id: 'guard' }]
];
for (const [label, fields] of malformedLibraryEntries) {
  test(`retained library ${label} is rejected without output writes`, t => {
    const f = fixture(t);
    // Keep malformed source targets present, so existence alone cannot pass validation.
    fs.writeFileSync(path.join(f.pack, 'tokens/notes.txt'), 'notes');
    const entry = { ...f.scene.tokenLibrary[0], ...fields };
    f.scene.tokenLibrary = label === 'duplicate id'
      ? [entry, { ...entry, name: 'Another identity' }]
      : [entry];
    writeJson(path.join(f.pack, 'scenario.json'), f.scene);
    const before = snapshot(f.root);
    assert.throws(() => build(f), /tokenLibrary/i);
    assert.deepEqual(snapshot(f.root), before);
  });
}

test('retained safe nested token paths and positive numeric dpi remain usable', t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.pack, 'tokens/old portraits'));
  fs.writeFileSync(path.join(f.pack, 'tokens/old portraits/friend.JPG'), 'old friend art');
  f.scene.tokenLibrary[0].src = 'tokens/old portraits/friend.JPG';
  f.scene.tokenLibrary[0].dpi = 72.5;
  writeJson(path.join(f.pack, 'scenario.json'), f.scene);
  build(f);
  assert.deepEqual(readJson(path.join(f.pack, 'scenario.json')).tokenLibrary.find(row => row.id === 'legacy'),
    { id: 'legacy', name: 'An old friend', src: 'tokens/old portraits/friend.JPG', dpi: 72.5 });
});

test('assembly retains scene metadata, named aliases and all additional source artwork', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.tokenSourceDir, 'Forgotten prince.png'), 'prince image');
  build(f);
  const result = readJson(path.join(f.pack, 'scenario.json'));
  const { tokenLibrary, ...metadata } = result;
  const { tokenLibrary: previous, ...expected } = f.scene;
  assert.deepEqual(metadata, expected);
  assert.deepEqual(tokenLibrary.find(row => row.id === 'legacy'), previous[0]);
  assert.deepEqual(tokenLibrary.find(row => row.id === 'guard'), {
    id: 'guard', name: 'Страж ворот', src: 'tokens/Страж.webp', dpi: 96
  });
  assert.deepEqual(tokenLibrary.find(row => row.id === 'captain'), {
    id: 'captain', name: 'Captain Rowan', src: 'tokens/Страж.webp'
  });
  assert.equal(tokenLibrary.filter(row => row.src === 'tokens/Страж.webp').length, 2);
  assert.ok(tokenLibrary.some(row => row.name === 'Forgotten prince' && row.src === 'tokens/Forgotten prince.png'));
  for (const dir of [path.join(f.pack, 'tokens'), f.custom]) {
    assert.equal(fs.readFileSync(path.join(dir, 'Страж.webp'), 'utf8'), 'guard image');
    assert.equal(fs.readFileSync(path.join(dir, 'Forgotten prince.png'), 'utf8'), 'prince image');
  }
  assert.equal(fs.readFileSync(path.join(f.tokenSourceDir, 'Страж.webp'), 'utf8'), 'guard image');
  assert.deepEqual(readJson(path.join(f.custom, 'index.json')), ['Forgotten prince.png', 'unrelated.webp', 'Страж.webp']);
  const once = snapshot(f.root);
  build(f);
  assert.deepEqual(snapshot(f.root), once, 'rebuilding must not duplicate records');
});

test('explicit generated files update matching monsters in both scenario copies while preserving lore', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.tokenSourceDir, 'guard-final.png'), 'new guard image');
  f.inventory[0].file = 'guard-final.png';
  writeJson(f.inventoryPath, f.inventory);
  build(f);
  const expected = structuredClone(f.app);
  expected.monsters.guard.token = 'custom/guard-final.png';
  for (const dir of [f.campaignDir, f.pack]) {
    assert.deepEqual(readJson(path.join(dir, 'Kingdom.scenario.json')), expected);
  }
  assert.equal(readJson(path.join(f.pack, 'scenario.json')).tokenLibrary.find(row => row.id === 'guard').src,
    'tokens/guard-final.png');
});

test('CLI accepts generic campaign paths and produces the same usable pack', t => {
  const f = fixture(t);
  const run = spawnSync(process.execPath, [builderPath, '--campaign', f.campaignDir,
    '--inventory', f.inventoryPath, '--tokens', f.tokenSourceDir, '--game', f.gameDir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(readJson(path.join(f.pack, 'scenario.json')).tokenLibrary.find(row => row.id === 'guard').src,
    'tokens/Страж.webp');
});
