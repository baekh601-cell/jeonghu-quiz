// world-atlas(Natural Earth) 데이터를 SVG path 문자열로 변환해 data/map.js 를 만든다.
// 좌표계: x = 경도, y = -위도 (등장방형). 실행: npm run build:map
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';

const load = (f) => JSON.parse(readFileSync(new URL(`../node_modules/world-atlas/${f}`, import.meta.url)));

function toPath(geom, dp) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  const r = (v) => +v.toFixed(dp);
  let d = '';
  for (const poly of polys) {
    for (const ring of poly) {
      let prev = '';
      ring.forEach(([lon, lat], i) => {
        const pt = `${r(lon)},${r(-lat)}`;
        if (pt === prev) return;
        d += (i === 0 ? 'M' : 'L') + pt;
        prev = pt;
      });
      d += 'Z';
    }
  }
  return d;
}

const w50 = load('countries-50m.json');
const world = feature(w50, w50.objects.countries).features
  .filter((f) => f.geometry)
  .map((f) => toPath(f.geometry, 2));

// 한반도는 10m 고해상도 (남한 410, 북한 408)
const w10 = load('countries-10m.json');
const korea = feature(w10, w10.objects.countries).features
  .filter((f) => f.geometry && ['410', '408'].includes(String(f.id)))
  .map((f) => toPath(f.geometry, 3));

const out = `// 자동 생성 파일 (tools/build-map.mjs). Natural Earth 데이터, 퍼블릭 도메인.
window.MAP_DATA = ${JSON.stringify({ world, korea })};
`;
writeFileSync(new URL('../data/map.js', import.meta.url), out);
console.log(`world ${world.length} shapes, korea ${korea.length} shapes, ${(out.length / 1024).toFixed(0)} KB`);
