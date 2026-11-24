#!/usr/bin/env node
'use strict';

// Assemble a campaign's complete token library without regenerating its scenes.
// node _engine/make_campaign_pack.cjs --campaign ../Campaigns/Last_Kingdom \
//   --inventory _dev/token-audit.json [--tokens <folder>] [--game <GAME folder>]
// Inventory: [{ id, name, file?: 'final.png', existing?: 'original.webp', dpi? }].
// A supplied file takes precedence over existing; every row must resolve to art.
const fs = require('node:fs');
const path = require('node:path');

const IMAGE = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const jsonBytes = data => Buffer.from(JSON.stringify(data, null, 2) + '\n');

function filename(value, label) {
  if (typeof value !== 'string' || !value.trim() || value !== path.basename(value)
      || /[\\/]/.test(value) || value === '.' || value === '..') {
    throw new Error(`${label}: expected a plain filename`);
  }
  return value;
}

function validateLibrary(library) {
  const ids = new Set();
  for (const entry of library) {
    if (!entry || typeof entry.id !== 'string' || !entry.id.trim()
        || typeof entry.name !== 'string' || !entry.name.trim()) {
      throw new Error('Every tokenLibrary entry needs a nonempty id and name');
    }
    if (ids.has(entry.id)) throw new Error(`Duplicate tokenLibrary id: ${entry.id}`);
    ids.add(entry.id);
    const parts = typeof entry.src === 'string' ? entry.src.split('/') : [];
    if (parts.length < 2 || parts[0] !== 'tokens' || /[\\:]/.test(entry.src)
        || parts.some(part => !part || part === '.' || part === '..') || !IMAGE.test(entry.src)) {
      throw new Error(`tokenLibrary ${entry.id}: src must be an image under tokens/ without traversal`);
    }
    if (entry.dpi !== undefined && (!Number.isFinite(entry.dpi) || entry.dpi <= 0)) {
      throw new Error(`tokenLibrary ${entry.id}: dpi must be a positive finite number`);
    }
  }
}

function buildCampaignPack(options = {}) {
  if (!options.campaignDir || !options.inventoryPath) {
    throw new Error('campaignDir and inventoryPath are required');
  }
  const campaignDir = path.resolve(options.campaignDir);
  const tokenSourceDir = path.resolve(options.tokenSourceDir || path.join(campaignDir, 'Tokens'));
  const gameDir = path.resolve(options.gameDir || path.join(__dirname, '..'));
  const packDir = path.join(campaignDir, 'Owlbear_Pack');
  const manifestPath = path.join(packDir, 'scenario.json');
  const manifest = readJson(manifestPath);
  const inventory = readJson(path.resolve(options.inventoryPath));
  if (!Array.isArray(inventory)) throw new Error('Token inventory must be an array');
  if (manifest.tokenLibrary != null && !Array.isArray(manifest.tokenLibrary)) {
    throw new Error('scenario.json tokenLibrary must be an array');
  }
  const library = [...(manifest.tokenLibrary || [])];
  validateLibrary(library);
  const images = new Map();
  const ids = new Set();
  const inventoryFiles = new Set();

  // Read every input before creating directories or changing any output file.
  for (const row of inventory) {
    if (!row || typeof row.id !== 'string' || !row.id.trim()
        || typeof row.name !== 'string' || !row.name.trim()) {
      throw new Error('Every inventory row needs a nonempty id and name');
    }
    if (ids.has(row.id)) throw new Error(`Duplicate inventory id: ${row.id}`);
    ids.add(row.id);
    const source = row.file ?? row.existing;
    if (!source) throw new Error(`${row.name}: missing image source filename`);
    const file = filename(source, row.name);
    if (!IMAGE.test(file)) throw new Error(`${row.name}: unsupported image file ${file}`);
    const sourcePath = path.join(tokenSourceDir, file);
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      throw new Error(`${row.name}: missing image file ${sourcePath}`);
    }
    if (row.dpi != null && (!Number.isFinite(row.dpi) || row.dpi <= 0)) {
      throw new Error(`${row.name}: dpi must be a positive number`);
    }
    images.set(file, fs.readFileSync(sourcePath));
    inventoryFiles.add(file);
    const entry = { id: row.id, name: row.name, src: `tokens/${file}` };
    if (row.dpi != null) entry.dpi = row.dpi;
    const previous = library.findIndex(item => item.id === row.id);
    if (previous < 0) library.push(entry);
    else library[previous] = { ...library[previous], ...entry };
  }

  // Include older and newly generated artwork even when it has no inventory row.
  for (const file of fs.readdirSync(tokenSourceDir).sort()) {
    if (!IMAGE.test(file) || !fs.statSync(path.join(tokenSourceDir, file)).isFile()) continue;
    if (!images.has(file)) images.set(file, fs.readFileSync(path.join(tokenSourceDir, file)));
    if (inventoryFiles.has(file) || library.some(item => item.src === `tokens/${file}`)) continue;
    const base = `art:${file}`;
    let id = base;
    let suffix = 2;
    while (library.some(item => item.id === id)) id = `${base}:${suffix++}`;
    library.push({ id, name: path.parse(file).name, src: `tokens/${file}` });
  }

  validateLibrary(library);
  for (const entry of library) {
    if (images.has(entry.src.slice('tokens/'.length))) continue;
    const sourcePath = path.resolve(packDir, entry.src);
    const relative = path.relative(packDir, sourcePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)
        || !fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      throw new Error(`${entry.name || entry.id}: missing image file ${entry.src}`);
    }
  }

  const outputs = new Map();
  const scenarioName = options.scenarioFile || manifest.appScenario;
  if (scenarioName) {
    filename(scenarioName, 'App scenario');
    for (const dir of [campaignDir, packDir]) {
      const scenarioPath = path.join(dir, scenarioName);
      const scenario = readJson(scenarioPath);
      for (const id of Object.keys(scenario.monsters || {})) {
        if (!ids.has(id)) throw new Error(`Monster ${id}: missing from token inventory`);
      }
      for (const row of inventory) {
        if (scenario.monsters && Object.hasOwn(scenario.monsters, row.id)) {
          scenario.monsters[row.id].token = `custom/${row.file ?? row.existing}`;
        }
      }
      outputs.set(scenarioPath, jsonBytes(scenario));
    }
  }

  const customDir = path.join(gameDir, 'assets/tokens/custom');
  const indexPath = path.join(customDir, 'index.json');
  const index = fs.existsSync(indexPath) ? readJson(indexPath) : [];
  if (!Array.isArray(index) || index.some(file => typeof file !== 'string')) {
    throw new Error('Custom token index must be an array of filenames');
  }
  const indexFiles = new Set(index);
  if (fs.existsSync(customDir)) {
    for (const file of fs.readdirSync(customDir)) {
      if (IMAGE.test(file) && fs.statSync(path.join(customDir, file)).isFile()) indexFiles.add(file);
    }
  }
  for (const [file, bytes] of images) {
    const destination = path.join(customDir, file);
    if (fs.existsSync(destination)
        && (!fs.statSync(destination).isFile() || !fs.readFileSync(destination).equals(bytes))) {
      throw new Error(`Token ${file}: existing custom artwork differs; use a unique filename`);
    }
    outputs.set(path.join(packDir, 'tokens', file), bytes);
    outputs.set(destination, bytes);
    indexFiles.add(file);
  }
  manifest.tokenLibrary = library;
  outputs.set(manifestPath, jsonBytes(manifest));
  outputs.set(indexPath, jsonBytes([...indexFiles].sort()));

  for (const [file, bytes] of outputs) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
  }
  return { inventoryEntries: inventory.length, libraryEntries: library.length,
    imageFiles: images.size, manifestPath, indexPath };
}

function main(args) {
  const keys = { '--campaign': 'campaignDir', '--inventory': 'inventoryPath',
    '--tokens': 'tokenSourceDir', '--game': 'gameDir', '--scenario': 'scenarioFile' };
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node make_campaign_pack.cjs --campaign <folder> --inventory <json> [--tokens <folder>] [--game <GAME folder>] [--scenario <filename>]');
    return;
  }
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = keys[args[i]];
    if (!key || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error(`Unknown option or missing value: ${args[i]}`);
    }
    options[key] = args[i + 1];
  }
  console.log(JSON.stringify(buildCampaignPack(options), null, 2));
}

module.exports = { buildCampaignPack };
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
