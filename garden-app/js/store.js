/* Storage: everything lives in IndexedDB on the phone. Falls back to memory if the browser blocks it. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoOf(new Date());
const parseISO = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
const fmt = iso => parseISO(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fmtY = iso => parseISO(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtMD = md => { const [m, d] = md.split('-').map(Number); return `${MONTHS[m - 1]} ${d}`; };

const STORES = ['zones', 'plantings', 'logs', 'crops', 'meta'];
let memoryOnly = false;
const mem = { zones: [], plantings: [], logs: [], crops: [], meta: [] };
let idb = null;
const wrapReq = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const objStore = (s, mode) => idb.transaction(s, mode).objectStore(s);
function openDB() {
  return new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('no indexedDB'));
    const r = indexedDB.open('garden-planner', 1);
    r.onupgradeneeded = () => { STORES.forEach(s => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); }); };
    r.onsuccess = () => { idb = r.result; res(); };
    r.onerror = () => rej(r.error);
  });
}

const S = {
  settings: null, forecast: null, demo: false, frostError: '', frostBusy: false, zones: [], plantings: [], logs: [], crops: [],
  view: 'plot', mode: 'crops', modals: [], plantsFilter: { q: '', season: 'all', open: false },
  planSeason: null, historyFilter: 'all', persistWarn: false
};

async function loadAll() {
  try { await openDB(); } catch (e) { memoryOnly = true; S.persistWarn = true; }
  const get = async s => memoryOnly ? mem[s].slice() : await wrapReq(objStore(s, 'readonly').getAll());
  S.zones = await get('zones');
  S.plantings = await get('plantings');
  S.logs = await get('logs');
  S.crops = await get('crops');
  const meta = await get('meta');
  S.settings = meta.find(m => m.id === 'settings') || null;
  S.forecast = meta.find(m => m.id === 'forecast') || null;
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* optional */ }
}
async function persist(store, obj) {
  if (memoryOnly) { const i = mem[store].findIndex(o => o.id === obj.id); if (i >= 0) mem[store][i] = obj; else mem[store].push(obj); return; }
  await wrapReq(objStore(store, 'readwrite').put(obj));
}
async function unpersist(store, id) {
  if (memoryOnly) { mem[store] = mem[store].filter(o => o.id !== id); return; }
  await wrapReq(objStore(store, 'readwrite').delete(id));
}
function upsertLocal(list, obj) { const i = list.findIndex(o => o.id === obj.id); if (i >= 0) list[i] = obj; else list.push(obj); }
async function put(store, obj) {
  if (store === 'meta') { if (obj.id === 'forecast') S.forecast = obj; else S.settings = obj; } else upsertLocal(S[store], obj);
  await persist(store, obj);
}
async function del(store, id) {
  S[store] = S[store].filter(o => o.id !== id);
  await unpersist(store, id);
}
async function wipeAll() {
  for (const s of STORES) {
    if (memoryOnly) mem[s] = []; else await wrapReq(objStore(s, 'readwrite').clear());
  }
  S.settings = null; S.forecast = null; S.demo = false; S.zones = []; S.plantings = []; S.logs = []; S.crops = [];
}

/* The crop library = built-in crops, with any edits you made on top, plus crops you added. */
function allCrops() {
  const list = Object.values(BUILTIN).map(c => ({ ...c }));
  for (const o of S.crops) {
    const i = list.findIndex(c => c.id === o.id);
    if (i >= 0) list[i] = { ...o, edited: true };
    else list.push({ ...o, custom: true });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}
const cropById = id => allCrops().find(c => c.id === id);
