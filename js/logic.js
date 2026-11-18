/* Rules the app calculates from your plantings, zones and the crop library. */
const DEFAULT_ZONES = [
  { name: 'Trellis', type: 'trellis', x: 0, y: 0, w: 20, h: 3 },
  { name: 'Quick A', type: 'quick', x: 0, y: 3, w: 9, h: 8 },
  { name: 'Quick B', type: 'quick', x: 0, y: 11, w: 9, h: 9 },
  { name: 'Long A', type: 'long', x: 11, y: 3, w: 9, h: 8 },
  { name: 'Long B', type: 'long', x: 11, y: 11, w: 9, h: 9 }
];
const ZONE_TYPES = { trellis: 'Trellis', quick: 'Quick (resown often)', long: 'Long (set once)', other: 'Other' };
const ZONE_FILL = { trellis: '#E3DA9A', quick: '#CDEBD1', long: '#BFD9C8', other: '#E0D6BD' };

const windowsOf = c => (c.windows || '').split(',').filter(Boolean).map(x => { const [s, e] = x.split(':'); return { s, e }; });
const inWindow = (c, iso) => { const md = iso.slice(5); return windowsOf(c).some(w => w.s <= md && md <= w.e); };
function openWindow(c, iso) {
  const md = iso.slice(5), y = iso.slice(0, 4);
  const w = windowsOf(c).find(w => w.s <= md && md <= w.e);
  return w ? { ...w, daysLeft: diffDays(iso, `${y}-${w.e}`) } : null;
}
function nextOpening(c, iso) {
  const y = +iso.slice(0, 4); let best = null;
  for (const w of windowsOf(c)) for (const yy of [y, y + 1]) {
    const d = `${yy}-${w.s}`, n = diffDays(iso, d);
    if (n > 0 && (!best || n < best.days)) best = { days: n, date: d, w };
  }
  return best;
}
const holdDays = c => c.family === 'Onion family' ? Math.max(c.dmax, 150) : c.dmax + (CONTINUOUS.has(c.id) ? 45 : 0);
const spFt = c => Math.max(c.sp / 12, 0.05);
const isActive = p => p.status !== 'finished';
const zoneById = id => S.zones.find(z => z.id === id);
const activeIn = zid => S.plantings.filter(p => p.zoneId === zid && isActive(p));
const harvestRange = (p, c) => ({ from: addDays(p.start, c.dmin), to: addDays(p.start, c.dmax) });
const plantCount = (p, c) => { const s = spFt(c); return Math.max(1, Math.floor(p.w / s)) * Math.max(1, Math.floor(p.h / s)); };

function rectsOverlap(a, b) { return a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6; }
function overlapsExisting(zone, rect, excludeId) {
  return activeIn(zone.id).some(p => p.id !== excludeId && rectsOverlap(rect, p));
}
function findSpot(zone, w, h) {
  w = Math.min(w, zone.w); h = Math.min(h, zone.h);
  for (let y = 0; y <= zone.h - h + 1e-6; y += 0.5)
    for (let x = 0; x <= zone.w - w + 1e-6; x += 0.5)
      if (!overlapsExisting(zone, { x, y, w, h })) return { x, y, w, h };
  return null;
}
function defaultArea(zone, crop) {
  const h = Math.min(zone.h, Math.max(2, Math.ceil(spFt(crop) * 2)));
  return findSpot(zone, zone.w, h) || findSpot(zone, zone.w, Math.min(h, 2)) || { x: 0, y: 0, w: zone.w, h };
}
const freeArea = zone => Math.max(0, zone.w * zone.h - activeIn(zone.id).reduce((s, p) => s + p.w * p.h, 0));

/* Rotation: the same family should not return to a zone before its rotation gap has passed. */
function rotationConflict(zoneId, crop, iso, excludeId) {
  const gap = crop.rot || 0; if (!gap) return null;
  return S.plantings.filter(p => p.zoneId === zoneId && p.id !== excludeId).map(p => ({ p, c: cropById(p.cropId) }))
    .filter(({ p, c }) => c && c.family === crop.family && !(c.id === crop.id && crop.succ > 0)
      && Math.abs(diffDays(p.start, iso)) < gap * 365 && !(p.status === 'failed'))
    .sort((a, b) => b.p.start.localeCompare(a.p.start))[0] || null;
}
/* Shade: shadows fall north in NC, so a tall crop shades any zone directly north of it. */
function shadeWarning(zone, crop) {
  if (crop.ht !== 'tall') return null;
  const north = S.zones.filter(z => z.id !== zone.id && z.y + z.h <= zone.y + 0.01 && z.x < zone.x + zone.w && zone.x < z.x + z.w);
  for (const z of north) {
    const low = activeIn(z.id).map(p => ({ p, c: cropById(p.cropId) })).find(({ c }) => c && c.ht !== 'tall');
    if (low) return `Tall crop: it will shade ${low.c.name} in ${z.name}, which sits north of ${zone.name}.`;
  }
  return null;
}
function zoneFits(zone, c) {
  if (zone.type === 'trellis') return c.trellis;
  if (c.trellis) return zone.type === 'other';
  const hold = holdDays(c);
  if (zone.type === 'quick') return hold <= 100;
  if (zone.type === 'long') return hold >= 90;
  return true;
}
/* Suggestions for a zone: crops open to plant now, crops opening soon, and why others are held back. */
function suggestions(zone, iso) {
  const now = [], soon = [];
  const free = freeArea(zone);
  for (const c of allCrops()) {
    if (!zoneFits(zone, c)) continue;
    const conflict = rotationConflict(zone.id, c, iso);
    const open = openWindow(c, iso);
    const next = nextOpening(c, iso);
    const item = { c, open, next, conflict, shade: shadeWarning(zone, c) };
    if (open) { if (!conflict && free > 1) now.push(item); }
    else if (next && next.days <= 60 && !conflict) soon.push(item);
  }
  now.sort((a, b) => (a.c.conf === 's' ? 0 : 1) - (b.c.conf === 's' ? 0 : 1) || a.open.daysLeft - b.open.daysLeft);
  soon.sort((a, b) => a.next.days - b.next.days);
  return { now, soon };
}
function frostRisk(iso) {
  const s = S.settings; if (!s) return null;
  const y = +iso.slice(0, 4);
  const cand = [`${y}-${s.firstFrost}`, `${y + 1}-${s.firstFrost}`].map(d => ({ d, n: diffDays(iso, d) })).filter(x => x.n >= -3)[0];
  return cand || null;
}

function genTasks(iso) {
  const out = [], dismissed = (S.settings && S.settings.dismissed) || {};
  const add = (key, text, when, kind, extra = {}) => { if (!dismissed[key]) out.push({ key, text, when, kind, ...extra }); };
  for (const p of S.plantings.filter(isActive)) {
    const c = cropById(p.cropId), z = zoneById(p.zoneId); if (!c || !z) continue;
    const hr = harvestRange(p, c);
    if (iso < p.start && diffDays(iso, p.start) <= 14) add(`start-${p.id}`, `Plant ${c.name} in ${z.name}`, p.start, 'plant');
    if (iso >= hr.from && iso <= addDays(hr.to, 60)) add(`harvest-${p.id}-${hr.from}`, `Harvest ${c.name} in ${z.name}: ready since ${fmt(hr.from)}`, hr.from, 'harvest', { pid: p.id });
    else if (iso < hr.from && diffDays(iso, hr.from) <= 14) add(`soon-${p.id}`, `${c.name} in ${z.name} is ready to harvest from ${fmt(hr.from)}`, hr.from, 'info');
    if (iso > addDays(p.start, holdDays(c) + 30)) add(`finish-${p.id}`, `Past its expected harvest: finish ${c.name} in ${z.name}?`, addDays(p.start, holdDays(c)), 'finish', { pid: p.id });
    if (c.succ > 0) {
      const last = S.plantings.filter(q => q.zoneId === z.id && q.cropId === c.id).sort((a, b) => b.start.localeCompare(a.start))[0];
      const due = addDays(last.start, c.succ * 7);
      if (last.id === p.id && due <= addDays(iso, 7) && inWindow(c, due > iso ? due : iso)) add(`resow-${p.id}-${due}`, `Resow ${c.name} in ${z.name} (every ${c.succ} weeks)`, due, 'resow', { zid: z.id, cid: c.id });
    }
  }
  for (const z of S.zones) {
    if (!activeIn(z.id).length) {
      const n = suggestions(z, iso).now.length;
      if (n) add(`empty-${z.id}-${iso.slice(0, 7)}`, `${z.name} is open: ${n} crop${n > 1 ? 's' : ''} fit right now`, iso, 'empty', { zid: z.id });
    }
  }
  const fr = frostRisk(iso);
  if (fr && fr.n <= 21) {
    const tender = S.plantings.filter(isActive).map(p => cropById(p.cropId)).filter(c => c && c.frost === 'tender');
    if (tender.length) add(`frost-${fr.d}`, `First frost is expected around ${fmt(fr.d)}: protect or harvest ${[...new Set(tender.map(c => c.name))].join(', ')}`, fr.d, 'frost');
  }
  const fo = frostOutlook();
  if (fo) for (const n of fo.nights.slice(0, 2)) if (n.risks.length) add(`frostcover-${n.date}`, `${n.name}: low ${n.low}°F. Protect ${riskNames(n.risks)}`, n.date, 'frostcover');
  return out.sort((a, b) => a.when.localeCompare(b.when));
}

function exportData() {
  return JSON.stringify({ app: 'garden-planner', version: 1, exportedAt: new Date().toISOString(), settings: S.settings, zones: S.zones, plantings: S.plantings, logs: S.logs, crops: S.crops }, null, 1);
}
async function importData(text) {
  const d = JSON.parse(text);
  if (d.app !== 'garden-planner') throw new Error('This is not a Garden Planner backup.');
  await wipeAll();
  if (d.settings) await put('meta', d.settings);
  for (const k of ['zones', 'plantings', 'logs', 'crops']) for (const o of d[k] || []) await put(k, o);
}
