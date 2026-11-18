/* Wiring: screens, taps, forms, and startup. */
let ignorePop = false;
const useHistory = !window.GP_EMBEDDED;
/* Confirm dialog drawn by the app (browsers' own pop-ups are blocked in some viewers). */
function ask(msg, ok = 'Delete', danger = true) {
  return new Promise(res => {
    const el = $('#ask');
    el.innerHTML = `<div class="askbox" role="alertdialog" aria-modal="true" aria-label="${esc(msg)}"><p>${esc(msg)}</p><div class="row gap"><button class="btn grow" data-ask="0">Cancel</button><button class="btn grow ${danger ? 'danger' : 'primary'}" data-ask="1">${esc(ok)}</button></div></div>`;
    el.classList.add('open');
    const done = v => { el.classList.remove('open'); el.innerHTML = ''; el.removeEventListener('click', h); res(v); };
    const h = e => { const b = e.target.closest('[data-ask]'); if (b) done(b.dataset.ask === '1'); else if (e.target === el) done(false); };
    el.addEventListener('click', h); $('button[data-ask="1"]', el).focus();
  });
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
}
function renderView() {
  const views = { plot: plotView, plan: planView, plants: plantsView, history: historyView };
  const banner = S.persistWarn ? '<div class="banner">This browser is blocking storage. Entries will be lost when you close the app. Try opening it in a normal (not private) window.</div>' : '';
  $('#view').innerHTML = S.settings ? banner + views[S.view]() : '';
  $$('#nav [data-v]').forEach(b => { const on = b.dataset.v === S.view; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
  $('#nav').style.display = S.settings ? '' : 'none';
}
function render() { renderView(); renderModal(); }
async function checkFrost(force) {
  const ran = await refreshForecast(force);
  if (ran || S.frostError) { renderView(); const t = topModal(); if (t && t.type === 'frost') renderModal(); }
  return ran;
}
function renderModal() {
  const el = $('#modal'), m = topModal();
  if (!m) { el.innerHTML = ''; el.classList.remove('open'); document.body.classList.remove('lock'); return; }
  const old = $('.sheetbody', el), top = old ? old.scrollTop : 0;
  const activeId = document.activeElement && el.contains(document.activeElement) ? document.activeElement.id : '';
  el.innerHTML = modalHtml(m); el.classList.add('open'); document.body.classList.add('lock');
  const nb = $('.sheetbody', el); if (nb) nb.scrollTop = top;
  if (activeId) { const a = document.getElementById(activeId); if (a && a.tagName !== 'SELECT') a.focus({ preventScroll: true }); }
}
function openModal(type, props = {}, draft) {
  S.modals.push({ type, props, draft });
  if (useHistory) try { history.pushState({ m: S.modals.length }, ''); } catch (e) { /* fine */ }
  renderModal();
  const sb = $('#modal .sheetbody'); if (sb) sb.scrollTop = 0;
}
function closeModal() {
  if (!S.modals.length) return;
  S.modals.pop();
  if (useHistory && history.state && history.state.m) { ignorePop = true; history.back(); }
  renderModal();
}
function syncDraft() {
  const m = topModal(), f = $('#mf'); if (!m || !f) return;
  const d = { ...(m.draft || {}), ...readForm() };
  $$('input[type=checkbox]', f).forEach(c => { d[c.name] = c.checked; });
  m.draft = d;
}
const num_ = v => (v === '' || v == null ? NaN : +v);
const mdStr = (mm, dd) => `${pad(Math.min(12, Math.max(1, +mm)))}-${pad(Math.min(31, Math.max(1, +dd || 1)))}`;

function initPlantingArea(d, zone, crop) {
  const a = defaultArea(zone, crop);
  Object.assign(d, { x: a.x, y: a.y, w: a.w, h: a.h });
}
function resizeImage(file) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => {
      const k = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.72));
    }; img.onerror = () => res(''); img.src = r.result; };
    r.onerror = () => res(''); r.readAsDataURL(file);
  });
}

async function saveLoc(loc) {
  syncDraft();
  await put('meta', { ...S.settings, loc });
  S.frostError = '';
  const ok = await refreshForecast(true);
  renderModal(); renderView();
  toast(ok ? `Location saved: ${loc.label}. Forecast loaded.` : S.frostError || 'Location saved.');
}
const H = {
  nav(el) { S.view = el.dataset.v; S.modals = []; render(); window.scrollTo(0, 0); },
  mode(el) { S.mode = el.dataset.v; render(); },
  planSeason(el) { S.planSeason = el.dataset.v; render(); },
  pfilter(el) { const k = el.dataset.k; if (k === 'open') S.plantsFilter.open = !S.plantsFilter.open; else S.plantsFilter[k] = el.dataset.v; render(); },
  hfilter(el) { S.historyFilter = el.value; render(); },
  frost() { openModal('frost'); },
  async refreshFrost() { toast('Checking the forecast…'); const ok = await checkFrost(true); toast(ok ? 'Forecast updated.' : (S.frostError || 'Forecast not updated.')); },
  demoOn() { S.demo = true; renderView(); openModal('frost'); },
  demoOff() { S.demo = false; closeModal(); renderView(); },
  async findLoc() {
    const v = (($('#zip') || {}).value || '').trim();
    const m = v.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
    try {
      if (m) { const lat = +m[1], lon = +m[2]; if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return toast('Those coordinates are not valid.'); return await saveLoc({ lat, lon, label: `${lat.toFixed(2)}, ${lon.toFixed(2)}` }); }
      if (/^\d{5}$/.test(v)) return await saveLoc(await geocodeZip(v));
      return toast('Enter a 5-digit ZIP code, or latitude and longitude like 34.23, -77.94.');
    } catch (e) { toast('Could not look up that ZIP code. Check it, or enter latitude and longitude.'); }
  },
  useLoc() {
    if (!navigator.geolocation) return toast('This browser cannot share your location. Enter your ZIP code instead.');
    navigator.geolocation.getCurrentPosition(p => saveLoc({ lat: p.coords.latitude, lon: p.coords.longitude, label: 'Your location' }), () => toast('Location is blocked. Enter your ZIP code instead.'), { timeout: 12000 });
  },
  async clearLoc() { syncDraft(); const s = { ...S.settings }; delete s.loc; await put('meta', s); await unpersist('meta', 'forecast'); S.forecast = null; S.frostError = ''; renderModal(); renderView(); toast('Location removed.'); },
  async dismiss(el) { const s = { ...S.settings, dismissed: { ...(S.settings.dismissed || {}), [el.dataset.key]: today() } }; await put('meta', s); render(); },
  zone(el) { openModal('zone', { id: el.dataset.id }); },
  closeModal() { closeModal(); },
  settings() { openModal('settings'); },
  logOpen() { openModal('log'); },
  logFor(el) { openModal('log', { pid: el.dataset.pid, zid: el.dataset.zid }); },
  crop(el) { openModal('crop', { id: el.dataset.id }); },
  newCrop() { openModal('cropEdit', { crop: null }); },
  editCrop(el) { openModal('cropEdit', { crop: cropById(el.dataset.id) }); },
  newZone() { syncDraft(); openModal('zoneEdit', { zone: { type: 'quick', x: 0, y: 0, w: 4, h: 4, name: '' } }); },
  editZone(el) { openModal('zoneEdit', { zone: zoneById(el.dataset.id) }); },
  addPlanting(el) {
    const z = zoneById(el.dataset.zone), d = { cropId: el.dataset.crop || '', start: today(), notes: '' };
    const c = d.cropId && cropById(d.cropId); if (c) initPlantingArea(d, z, c); else Object.assign(d, { x: 0, y: 0, w: z.w, h: Math.min(z.h, 2) });
    openModal('addPlanting', { zoneId: z.id, cropId: d.cropId }, d);
  },
  logAct(el) {
    syncDraft(); const d = topModal().draft, a = el.dataset.v;
    d.sel = d.sel.includes(a) ? d.sel.filter(x => x !== a) : [...d.sel, a]; renderModal();
  },
  async timerStart() { syncDraft(); const t = S.settings.timer || { accMs: 0 }; await put('meta', { ...S.settings, timer: { accMs: t.accMs || 0, running: true, startedAt: Date.now() } }); renderModal(); },
  async timerPause() { syncDraft(); const t = S.settings.timer; await put('meta', { ...S.settings, timer: { accMs: timerMs(), running: false } }); renderModal(); },
  async timerStop() { syncDraft(); const d = topModal().draft; d.minutes = Math.max(1, Math.round(timerMs() / 60000)); await put('meta', { ...S.settings, timer: null }); renderModal(); },
  async photo(el) { syncDraft(); const f = el.files[0]; if (!f) return; topModal().draft.photo = await resizeImage(f); renderModal(); },
  rmPhoto() { syncDraft(); topModal().draft.photo = ''; renderModal(); },

  async saveSettings() {
    syncDraft(); const d = topModal().draft || {}, first = topModal().type === 'setup', old = S.settings || {};
    const w = num_(d.w), l = num_(d.l);
    if (!(w >= 4 && l >= 4)) return toast('Enter the plot width and length in feet.');
    const lastFrost = mdStr(d.lastM, d.lastD), firstFrost = mdStr(d.firstM, d.firstD);
    if (!first) { const bad = S.zones.find(z => z.x + z.w > w + 1e-6 || z.y + z.h > l + 1e-6); if (bad) return toast(`${bad.name} would fall outside the smaller plot. Resize it first.`); }
    const s = { ...old, id: 'settings', plotName: (d.plotName || '').trim() || 'Main plot', w, l, lastFrost, firstFrost, dismissed: old.dismissed || {}, timer: old.timer || null };
    await put('meta', s);
    if (first && d.seedZones !== false) for (const z of DEFAULT_ZONES) if (z.x + z.w <= w && z.y + z.h <= l) await put('zones', { id: uid(), ...z });
    S.modals = []; try { if (useHistory && history.state && history.state.m) { ignorePop = true; history.go(-(history.state.m)); } } catch (e) { /* fine */ }
    render(); toast(first ? 'Garden ready. Tap a zone to start.' : 'Settings saved.');
  },
  async saveZone() {
    syncDraft(); const m = topModal(), d = m.draft || {}, z = m.props.zone, s = S.settings;
    const g = { name: (d.name ?? z.name ?? '').trim(), type: d.type ?? z.type, x: num_(d.x ?? z.x), y: num_(d.y ?? z.y), w: num_(d.w ?? z.w), h: num_(d.h ?? z.h) };
    if (!g.name) return toast('Give the zone a name.');
    if (![g.x, g.y, g.w, g.h].every(Number.isFinite) || g.w <= 0 || g.h <= 0 || g.x < 0 || g.y < 0) return toast('Check the zone numbers.');
    if (g.x + g.w > s.w + 1e-6 || g.y + g.h > s.l + 1e-6) return toast(`The zone must fit inside the ${s.w} × ${s.l} ft plot.`);
    const hit = S.zones.find(o => o.id !== z.id && rectsOverlap(g, o));
    if (hit && !(await ask(`${g.name} overlaps ${hit.name}. Save anyway?`, 'Save anyway', false))) return;
    const soil = { date: d.soilDate ?? (z.soil && z.soil.date) ?? '', ph: d.soilPh ?? (z.soil && z.soil.ph) ?? '', om: d.soilOm ?? (z.soil && z.soil.om) ?? '', notes: d.soilNotes ?? (z.soil && z.soil.notes) ?? '' };
    await put('zones', { ...z, ...g, id: z.id || uid(), soil });
    closeModal(); render(); toast('Zone saved.');
  },
  async delZone(el) {
    const z = zoneById(el.dataset.id); if (!z || !(await ask(`Delete ${z.name} and its plantings? Your log history stays.`))) return;
    for (const p of S.plantings.filter(p => p.zoneId === z.id)) await del('plantings', p.id);
    await del('zones', z.id); S.modals = S.modals.filter(m => m.type === 'settings'); renderModal(); render(); toast('Zone deleted.');
  },
  async savePlanting() {
    syncDraft(); const m = topModal(), z = zoneById(m.props.zoneId), d = m.draft, c = cropById(d.cropId);
    if (!c) return toast('Choose a crop.');
    const r = { x: num_(d.x), y: num_(d.y), w: num_(d.w), h: num_(d.h) };
    if (![r.x, r.y, r.w, r.h].every(Number.isFinite) || r.w <= 0 || r.h <= 0 || r.x < 0 || r.y < 0 || r.x + r.w > z.w + 1e-6 || r.y + r.h > z.h + 1e-6) return toast(`The area must fit inside the zone (${z.w} × ${z.h} ft).`);
    if (!d.start) return toast('Pick a start date.');
    await put('plantings', { id: uid(), zoneId: z.id, cropId: c.id, start: d.start, ...r, method: c.method, status: 'active', notes: (d.notes || '').trim() });
    closeModal(); render(); toast(`${c.name} added to ${z.name}.`);
  },
  async finishPlanting(el) {
    const p = S.plantings.find(p => p.id === el.dataset.id); if (!p) return;
    if (!(await ask('Mark this planting finished? The space becomes free and it moves to the zone history.', 'Finish', false))) return;
    await put('plantings', { ...p, status: 'finished', end: today() }); render(); toast('Planting finished.');
  },
  async delPlanting(el) {
    if (!(await ask('Remove this planting? Use Finish instead if it was harvested: Remove erases it from your history.', 'Remove'))) return;
    await del('plantings', el.dataset.id); render();
  },
  async saveLog() {
    syncDraft(); const d = topModal().draft, [kind, id] = (d.target || '').split(':');
    let zoneId = '', plantingId = '';
    if (kind === 'p') { const p = S.plantings.find(p => p.id === id); if (p) { plantingId = p.id; zoneId = p.zoneId; } } else zoneId = id;
    if (!zoneId) return toast('Choose where you worked.');
    const minutes = num_(d.minutes), lb = num_(d.lb), note = (d.note || '').trim();
    if (!d.sel.length && !note && !(minutes > 0)) return toast('Pick what you did, add a note, or add the time.');
    const now = new Date(), time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    await put('logs', { id: uid(), ts: `${d.date || today()}T${time}`, zoneId, plantingId, actions: d.sel, minutes: minutes > 0 ? Math.round(minutes) : 0, lb: lb > 0 ? lb : 0, note, photo: d.photo || '' });
    closeModal(); render(); toast('Logged.');
  },
  async delLog(el) { if (!(await ask('Delete this log entry?'))) return; await del('logs', el.dataset.id); render(); },
  async saveCrop() {
    syncDraft(); const m = topModal(), c = m.props.crop || {}, d = m.draft || {}, g = k => d[k] ?? c[k];
    const name = (g('name') || '').trim(), family = (g('family') || '').trim(), windows = (g('windows') || '').replace(/\s/g, '');
    if (!name || !family) return toast('A crop needs a name and a family.');
    const okWin = windows === '' || (/^\d\d-\d\d:\d\d-\d\d(,\d\d-\d\d:\d\d-\d\d)*$/.test(windows) && windows.split(',').every(w => { const [s, e] = w.split(':'); const ok = x => +x.slice(0, 2) >= 1 && +x.slice(0, 2) <= 12 && +x.slice(3) >= 1 && +x.slice(3) <= 31; return ok(s) && ok(e) && s <= e; }));
    if (!okWin) return toast('Windows look like 02-15:04-05,08-01:09-30 (start:end, month-day).');
    const dmin = num_(g('dmin')), dmax = num_(g('dmax')), sp = num_(g('sp'));
    if (!(dmin > 0 && dmax >= dmin && sp > 0)) return toast('Check days to harvest and spacing.');
    const obj = { id: c.id || 'custom-' + uid(), name, family, cat: g('cat'), season: g('season'), method: g('method'), dmin, dmax, sp, frost: g('frost'), ht: g('ht'), succ: Math.max(0, num_(g('succ')) || 0), rot: Math.max(0, num_(g('rot')) || 0), trellis: !!(d.trellis ?? c.trellis), windows, conf: 's', note: g('note') || '' };
    await put('crops', obj); closeModal();
    const t = topModal(); if (t && t.type === 'crop') t.props.id = obj.id;
    render(); toast('Crop saved.');
  },
  async resetCrop(el) { if (!(await ask('Go back to the built-in values for this crop?', 'Reset', false))) return; await del('crops', el.dataset.id); closeModal(); render(); },
  async delCrop(el) {
    if (S.plantings.some(p => p.cropId === el.dataset.id)) return toast('This crop is used in a planting. Remove those first.');
    if (!(await ask('Delete this crop?'))) return; await del('crops', el.dataset.id); S.modals = []; renderModal(); render();
  },
  export() {
    if (window.GP_EMBEDDED) return H.copyBackup();
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
    a.download = `garden-backup-${today()}.json`; document.body.appendChild(a); a.click(); a.remove(); toast('Backup downloaded.');
  },
  async copyBackup() {
    const text = exportData();
    try { await navigator.clipboard.writeText(text); toast('Backup copied. Paste it into a note to keep it.'); }
    catch (e) { const t = $('#pasteBackup'); if (t) { t.value = text; t.focus(); t.select(); } toast('Copy was blocked. The text is selected below: copy it by hand.'); }
  },
  async restorePaste() {
    const t = $('#pasteBackup'); if (!t || !t.value.trim()) return toast('Paste your backup text first.');
    try { if (!(await ask('Restoring replaces everything on this phone. Continue?', 'Replace', false))) return; await importData(t.value); S.modals = []; render(); toast('Backup restored.'); }
    catch (e) { toast('That text is not a Garden Planner backup.'); }
  },
  async import(el) {
    const f = el.files[0]; if (!f) return;
    try { if (!(await ask('Importing replaces everything on this phone. Continue?', 'Replace', false))) return; await importData(await f.text()); S.modals = []; render(); toast('Backup restored.'); }
    catch (e) { toast(e.message || 'Could not read that file.'); }
  },
  async reset() {
    if (!(await ask('Erase every zone, planting and log on this phone? Export a backup first if unsure.', 'Erase everything'))) return;
    await wipeAll(); S.modals = []; render(); openModal('setup');
  }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const h = H[el.dataset.act]; if (h) { e.preventDefault(); h(el, e); }
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('svg g[data-act]')) { e.preventDefault(); H[e.target.dataset.act](e.target); }
  if (e.key === 'Escape' && S.modals.length && topModal().type !== 'setup') closeModal();
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.actChange) { H[t.dataset.actChange](t, e); return; }
  if (!t.closest('#mf')) return;
  const m = topModal();
  syncDraft();
  if (m.type === 'addPlanting' && t.dataset.live !== undefined) {
    if (t.dataset.live === 'crop') { const z = zoneById(m.props.zoneId), c = cropById(m.draft.cropId); if (c) initPlantingArea(m.draft, z, c); }
    renderModal();
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { S.plantsFilter.q = e.target.value; $('#plist').innerHTML = plantsList(); }
});
window.addEventListener('popstate', () => {
  if (ignorePop) { ignorePop = false; return; }
  const m = topModal(); if (!m || m.type === 'setup') return;
  S.modals.pop(); renderModal();
});
setInterval(() => { const o = $('#timerOut'); if (o && S.settings) o.textContent = fmtTimer(timerMs()); }, 1000);

(async function boot() {
  await loadAll();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
  if (!S.settings) openModal('setup');
  render();
  checkFrost(false);
})();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.settings) { renderView(); checkFrost(false); } });
