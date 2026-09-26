// Natural Earth 1:50m の国境データを取得し、アプリ用の TopoJSON（public/world.json）を作る。
// 使い方: npm run build:map
import { writeFile } from 'node:fs/promises';
import mapshaper from 'mapshaper';

const SOURCE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';

// 国として扱わない地域を、それが属する国にまとめる
const MERGE_INTO = { SOL: 'so', CYN: 'cy' };

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`download failed: ${res.status}`);
const geo = await res.json();

for (const f of geo.features) {
  const p = f.properties;
  const id = MERGE_INTO[p.ADM0_A3] ?? (p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH.toLowerCase() : `x-${p.ADM0_A3.toLowerCase()}`);
  f.properties = { id };
}

const { 'world.json': out } = await mapshaper.applyCommands(
  '-i in.json name=countries -dissolve id copy-fields=id -simplify 25% keep-shapes -o world.json format=topojson quantization=100000',
  { 'in.json': geo },
);

// quiz データに含まれる国が全部あるかを確認する
const { COUNTRIES } = await import('../src/data/countries.ts');
const ids = new Set(JSON.parse(out).objects.countries.geometries.map((g) => g.properties.id));
const missing = COUNTRIES.filter((c) => !ids.has(c.id)).map((c) => c.id);
if (missing.length) throw new Error(`missing countries in map: ${missing.join(', ')}`);

await writeFile(new URL('../public/world.json', import.meta.url), out);
console.log(`wrote public/world.json (${(out.length / 1024).toFixed(0)} KB)`);
