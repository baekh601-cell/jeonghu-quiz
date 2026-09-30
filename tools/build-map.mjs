// world-atlas(Natural Earth) 데이터를 SVG path 문자열로 변환해 data/map.js 를 만든다.
// 좌표계: x = 경도, y = -위도 (등장방형). 실행: npm run build:map
//   world : 세계 지도 나라 모양들 (지도 게임 배경)
//   iso   : world 와 같은 순서의 나라 코드 (위치 표시용)
//   korea : 한반도 고해상도
//   shapes: 실루엣 문제용 나라 모양 { ISO: { d, box:[x,y,w,h], lat } } — 먼 해외 영토는 빼고 본토 위주
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const isoCodes = require('i18n-iso-countries');
const load = (f) => JSON.parse(readFileSync(new URL(`../node_modules/world-atlas/${f}`, import.meta.url)));
const alpha2 = (id) => (id ? isoCodes.numericToAlpha2(String(id).padStart(3, '0')) || null : null);

const polysOf = (geom) => (geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : []);
function ringsToPath(polys, dp) {
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
// 다각형 넓이와 중심 (경위도 평면 근사)
function areaCenter(poly) {
  const ring = poly[0];
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
    const f = x0 * y1 - x1 * y0;
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  a /= 2;
  return a ? { area: Math.abs(a), x: cx / (6 * a), y: cy / (6 * a) } : { area: 0, x: ring[0][0], y: ring[0][1] };
}

const w50 = load('countries-50m.json');
const feats = feature(w50, w50.objects.countries).features.filter((f) => f.geometry);
const world = feats.map((f) => ringsToPath(polysOf(f.geometry), 2));
const iso = feats.map((f) => alpha2(f.id));

// 실루엣: 날짜변경선에 걸친 나라(러시아·피지 등)는 적은 쪽을 반대편으로 옮겨 붙이고,
// 본토에서 멀리 떨어진 작은 해외 영토(프랑스령 기아나, 하와이 등)는 뺀다.
const shapes = {};
for (const f of feats) {
  const code = alpha2(f.id);
  if (!code) continue;
  let polys = polysOf(f.geometry).map((p) => p.map((ring) => ring.map(([x, y]) => [x, y])));
  const lons = polys.flatMap((p) => p[0].map(([x]) => x));
  if (Math.min(...lons) < -150 && Math.max(...lons) > 150) {
    // 점이 더 많은 쪽으로 나머지 점들을 옮긴다 (러시아·피지는 동쪽으로, 미국 알류샨은 서쪽으로)
    const east = lons.filter((x) => x > 0).length, west = lons.length - east;
    const fix = east >= west ? (x) => (x < 0 ? x + 360 : x) : (x) => (x > 0 ? x - 360 : x);
    polys = polys.map((p) => p.map((ring) => ring.map(([x, y]) => [fix(x), y])));
  }
  const info = polys.map(areaCenter);
  const main = info.reduce((m, c) => (c.area > m.area ? c : m), info[0]);
  const totalArea = info.reduce((s, c) => s + c.area, 0);
  polys = polys.filter((_, i) => {
    const c = info[i], dist = Math.hypot(c.x - main.x, c.y - main.y);
    return c === main || dist < 20 || (c.area > main.area * 0.15 && dist < 35); // 알래스카·하와이 같은 먼 곳은 제외
  });
  // 같은 나라 코드를 쓰는 작은 부속 영토(애시모어 카르티에 제도 → 호주 등)가 본토를 덮어쓰지 않게
  if (shapes[code] && shapes[code].area >= totalArea) continue;
  const pts = polys.flatMap((p) => p[0]);
  const xs = pts.map(([x]) => x), ys = pts.map(([, y]) => -y);
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)].map((v) => +v.toFixed(2));
  shapes[code] = { d: ringsToPath(polys, 2), box, lat: +main.y.toFixed(1), area: +totalArea.toFixed(2) };
}

// 한반도는 10m 고해상도 (남한 410, 북한 408)
const w10 = load('countries-10m.json');
const korea = feature(w10, w10.objects.countries).features
  .filter((f) => f.geometry && ['410', '408'].includes(String(f.id)))
  .map((f) => ringsToPath(polysOf(f.geometry), 3));

const out = `// 자동 생성 파일 (tools/build-map.mjs). Natural Earth 데이터, 퍼블릭 도메인.
window.MAP_DATA = ${JSON.stringify({ world, iso, korea, shapes })};
`;
writeFileSync(new URL('../data/map.js', import.meta.url), out);
console.log(`world ${world.length} shapes, silhouettes ${Object.keys(shapes).length}, korea ${korea.length}, ${(out.length / 1024).toFixed(0)} KB`);
