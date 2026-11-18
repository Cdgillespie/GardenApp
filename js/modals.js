/* Sheets that slide over the screens: setup, zones, plantings, quick log, crops. */
function sheet(title, body, opts = {}) {
  const left = opts.noBack ? '' : `<button class="iconbtn" data-act="closeModal" aria-label="Close">${ic('back')}</button>`;
  return `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheethead">${left}<h2>${esc(title)}</h2></div><div class="sheetbody">${body}</div>${opts.foot ? `<div class="sheetfoot">${opts.foot}</div>` : ''}</div>`;
}
const field = (label, input, id, hint = '') => `<div class="field"><label for="${id}">${label}</label>${input}${hint ? `<small class="muted">${hint}</small>` : ''}</div>`;
const num = (name, v, extra = '') => `<input id="f-${name}" name="${name}" type="number" inputmode="decimal" step="any" value="${esc(v ?? '')}" ${extra}>`;
const txt = (name, v, extra = '') => `<input id="f-${name}" name="${name}" type="text" value="${esc(v ?? '')}" ${extra}>`;
const sel = (name, opts, v, extra = '') => `<select id="f-${name}" name="${name}" ${extra}>${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const monthOpts = MONTHS.map((m, i) => [pad(i + 1), m]);
function mdField(label, name, md) {
  const [m, d] = md.split('-');
  return `<div class="field"><label for="f-${name}M">${label}</label><div class="row gap">${sel(name + 'M', monthOpts, m)}<input id="f-${name}D" name="${name}D" type="number" min="1" max="31" inputmode="numeric" value="${+d}" aria-label="${label} day"></div></div>`;
}
const readForm = () => { const f = $('#mf'); return f ? Object.fromEntries(new FormData(f)) : {}; };
const topModal = () => S.modals[S.modals.length - 1];

/* ---------- Setup / settings ---------- */
function settingsModal(first) {
  const s = S.settings || { plotName: 'Main plot', w: 20, l: 20, lastFrost: '03-15', firstFrost: '11-15' };
  const d = topModal().draft || {};
  const v = k => d[k] ?? s[k];
  const zones = S.zones.map(z => `<div class="kv"><span>${esc(z.name)}<small>${ZONE_TYPES[z.type]} · ${z.w} × ${z.h} ft</small></span><button class="btn sm" type="button" data-act="editZone" data-id="${z.id}">Edit</button></div>`).join('') || '<p class="muted">No zones yet.</p>';
  const body = `<form id="mf" onsubmit="return false">
    ${field('Plot name', txt('plotName', v('plotName')), 'f-plotName')}
    <div class="row gap">${field('Width (ft)', num('w', v('w'), 'min="4" max="200"'), 'f-w')}${field('Length (ft)', num('l', v('l'), 'min="4" max="200"'), 'f-l')}</div>
    <p class="muted small">Length runs north to south. North is at the top of the map.</p>
    ${mdField('Average last spring frost', 'last', d.lastM ? `${d.lastM}-${pad(d.lastD)}` : s.lastFrost)}
    ${mdField('Average first fall frost', 'first', d.firstM ? `${d.firstM}-${pad(d.firstD)}` : s.firstFrost)}
    <p class="muted small">Sources disagree for southeastern NC: about Mar 1 and Nov 22 near Wilmington (LawnBySeason), but Apr 15 and early November for inland Pender County (NC Extension). Use what your own garden shows, or ask your county Extension office.</p>
    ${first ? '<label class="check"><input type="checkbox" name="seedZones" checked> Start with 5 zones (trellis strip, two quick zones, two long zones)</label>' : ''}
  </form>`;
  if (first) return sheet('Set up your garden', body, { noBack: true, foot: '<button class="btn primary wide" data-act="saveSettings">Start planning</button>' });
  const tools = `
    <section class="card"><h2>Zones</h2>${zones}<button class="btn wide" data-act="newZone">Add a zone</button></section>
    ${frostSettings()}
    <section class="card"><h2>Your data</h2><p class="muted small">Everything is stored on this phone. Save a backup now and then, and before clearing your browser data.</p>
      <div class="row gap wrap"><button class="btn" data-act="export">${window.GP_EMBEDDED ? 'Copy backup' : 'Download backup'}</button>${window.GP_EMBEDDED ? '' : '<button class="btn" data-act="copyBackup">Copy as text</button>'}<label class="btn filebtn">Import file<input type="file" accept="application/json,.json" data-act-change="import" hidden></label></div>
      <div class="field"><label for="pasteBackup">Restore from backup text</label><textarea id="pasteBackup" rows="2" placeholder="Paste backup text here"></textarea></div><button class="btn" data-act="restorePaste">Restore from text</button>
      <button class="btn danger wide" data-act="reset">Erase all data</button></section>
    <section class="card"><h2>Sources</h2><ul class="src">${SOURCES.map(x => `<li><a href="${x.u}" target="_blank" rel="noopener">${esc(x.t)}</a></li>`).join('')}</ul></section>`;
  return sheet('Settings', body + tools, { foot: '<button class="btn primary wide" data-act="saveSettings">Save</button>' });
}

/* ---------- Zones ---------- */
function zoneEditModal() {
  const m = topModal(), z = m.props.zone || {}, d = m.draft || {}, v = k => d[k] ?? (z[k] ?? ''), soil = z.soil || {};
  const body = `<form id="mf" onsubmit="return false">
    ${field('Name', txt('name', v('name')), 'f-name')}
    ${field('Type', sel('type', Object.entries(ZONE_TYPES), v('type') || 'quick'), 'f-type', 'Trellis: climbers. Quick: fast crops you resow. Long: crops you set once.')}
    <div class="row gap">${field('Left edge (ft)', num('x', v('x'), 'min="0"'), 'f-x')}${field('Top edge (ft)', num('y', v('y'), 'min="0"'), 'f-y')}</div>
    <div class="row gap">${field('Width (ft)', num('w', v('w'), 'min="1"'), 'f-w')}${field('Length (ft)', num('h', v('h'), 'min="1"'), 'f-h')}</div>
    <p class="muted small">Measured from the top-left corner of the plot. Leave a 2 ft gap between zones for paths.</p>
    <h3>Soil notes</h3>
    <div class="row gap">${field('Test date', `<input id="f-soilDate" name="soilDate" type="date" value="${esc(d.soilDate ?? soil.date ?? '')}">`, 'f-soilDate')}${field('pH', num('soilPh', d.soilPh ?? soil.ph, 'min="3" max="10" step="0.1"'), 'f-soilPh')}</div>
    ${field('Organic matter (%)', num('soilOm', d.soilOm ?? soil.om), 'f-soilOm')}
    ${field('Notes and amendments', `<textarea id="f-soilNotes" name="soilNotes" rows="3">${esc(d.soilNotes ?? soil.notes ?? '')}</textarea>`, 'f-soilNotes', 'NC Department of Agriculture soil tests will tell you what to add.')}
  </form>`;
  const foot = `<div class="row gap">${z.id ? '<button class="btn danger" data-act="delZone" data-id="' + z.id + '">Delete</button>' : ''}<button class="btn primary grow" data-act="saveZone">Save zone</button></div>`;
  return sheet(z.id ? 'Edit zone' : 'New zone', body, { foot });
}
function zoneModal() {
  const z = zoneById(topModal().props.id); if (!z) return sheet('Zone', '<p>This zone was removed.</p>');
  const iso = today();
  const act = activeIn(z.id).sort((a, b) => a.start.localeCompare(b.start));
  const past = S.plantings.filter(p => p.zoneId === z.id && !isActive(p)).sort((a, b) => b.start.localeCompare(a.start));
  const pl = act.map(p => {
    const c = cropById(p.cropId); if (!c) return '';
    const hr = harvestRange(p, c), planned = p.start > iso;
    const state = planned ? `Planned for ${fmt(p.start)}` : iso < hr.from ? `Planted ${fmt(p.start)} · harvest from ${fmt(hr.from)}` : `Planted ${fmt(p.start)} · harvest window since ${fmt(hr.from)}`;
    return `<div class="pcard"><div class="row between"><b><i class="dot" style="background:${catColor(c)}"></i>${esc(c.name)}</b><span class="muted small">${p.w}×${p.h} ft · ~${plantCount(p, c)} plants</span></div><p class="muted small">${esc(state)}</p>${p.notes ? `<p class="small">${esc(p.notes)}</p>` : ''}<div class="row gap"><button class="btn sm" data-act="logFor" data-pid="${p.id}">Log work</button><button class="btn sm" data-act="finishPlanting" data-id="${p.id}">Finish</button><button class="btn sm danger" data-act="delPlanting" data-id="${p.id}">Remove</button></div></div>`;
  }).join('') || '<p class="muted">Nothing planted here yet.</p>';
  const sg = suggestions(z, iso);
  const item = i => `<button class="crow" data-act="addPlanting" data-zone="${z.id}" data-crop="${i.c.id}"><i class="dot" style="background:${catColor(i.c)}"></i><span class="cn"><b>${esc(i.c.name)}</b><small>${i.open ? `Open until ${fmt(addDays(iso, i.open.daysLeft))}` : `Opens ${fmt(i.next.date)}`} · ${i.c.dmin === i.c.dmax ? i.c.dmin : i.c.dmin + '-' + i.c.dmax} days${i.shade ? ' · shades neighbors' : ''}</small></span>${i.c.conf === 'e' ? badge('Verify', 'warn') : ''}</button>`;
  const sug = (sg.now.length ? `<h3>Fits now</h3>` + sg.now.slice(0, 8).map(item).join('') : '<p class="muted">Nothing fits this zone in today\'s planting windows.</p>')
    + (sg.soon.length ? `<h3>Opens within 60 days</h3>` + sg.soon.slice(0, 6).map(item).join('') : '');
  const pastHtml = past.length ? `<h3>Past plantings</h3>` + past.slice(0, 8).map(p => { const c = cropById(p.cropId); return `<div class="kv"><span>${esc(c ? c.name : 'Removed crop')}<small>${fmtY(p.start)}${p.end ? ' to ' + fmtY(p.end) : ''}</small></span></div>`; }).join('') : '';
  const soil = z.soil && (z.soil.ph || z.soil.notes) ? `<p class="small muted">Soil: ${z.soil.ph ? 'pH ' + esc(z.soil.ph) : ''}${z.soil.om ? ', ' + esc(z.soil.om) + '% organic matter' : ''}${z.soil.notes ? '. ' + esc(z.soil.notes) : ''}</p>` : '';
  const body = `<div class="grid2"><div class="stat"><small>Size</small><b>${z.w} × ${z.h} ft</b></div><div class="stat"><small>Free</small><b>${freeArea(z).toFixed(0)} of ${(z.w * z.h).toFixed(0)} sq ft</b></div></div>${soil}
    <section class="card"><h2>Planted here</h2>${pl}<button class="btn primary wide" data-act="addPlanting" data-zone="${z.id}">Add a planting</button></section>
    <section class="card nopad"><h2 class="padh">Suggestions · ${esc(ZONE_TYPES[z.type].split(' (')[0])} zone</h2>${sug}</section>
    ${pastHtml ? `<section class="card">${pastHtml}</section>` : ''}
    <div class="row gap"><button class="btn" data-act="logFor" data-zid="${z.id}">Log work here</button><button class="btn" data-act="editZone" data-id="${z.id}">Edit zone</button></div>`;
  return sheet(z.name, body);
}

/* ---------- Add planting ---------- */
function addPlantingModal() {
  const m = topModal(), z = zoneById(m.props.zoneId); if (!z) return sheet('Add planting', '<p>Zone not found.</p>');
  const d = m.draft || (m.draft = { cropId: m.props.cropId || '', start: today(), notes: '' });
  const c = d.cropId ? cropById(d.cropId) : null;
  const iso = today();
  const crops = allCrops();
  const open = crops.filter(x => inWindow(x, d.start || iso) && zoneFits(z, x)), rest = crops.filter(x => !open.includes(x));
  const opt = x => `<option value="${x.id}" ${x.id === d.cropId ? 'selected' : ''}>${esc(x.name)}${x.conf === 'e' ? ' (verify window)' : ''}</option>`;
  let info = '';
  if (c) {
    const rect = { x: +d.x, y: +d.y, w: +d.w, h: +d.h }, start = d.start || iso;
    const msgs = [];
    const w = openWindow(c, start);
    if (w) msgs.push(['ok', `Inside the planting window until ${fmt(addDays(start, w.daysLeft))}.`]);
    else { const nx = nextOpening(c, start); msgs.push(['warn', `Outside the usual planting window${nx ? `. Next opens ${fmt(nx.date)}` : ''}.`]); }
    if (c.conf === 'e') msgs.push(['warn', 'This window is an estimate. Verify with your county Extension office, then edit the crop.']);
    if (!zoneFits(z, c)) msgs.push(['warn', `${c.name} does not match a ${ZONE_TYPES[z.type].split(' (')[0].toLowerCase()} zone.`]);
    const rc = rotationConflict(z.id, c, start);
    if (rc) msgs.push(['warn', `Rotation: ${rc.c.family} (${rc.c.name}) was planted here ${fmtY(rc.p.start)}. Wait ${c.rot} years between the same family.`]);
    const sh = shadeWarning(z, c); if (sh) msgs.push(['warn', sh]);
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > z.w + 1e-6 || rect.y + rect.h > z.h + 1e-6 || !(rect.w > 0) || !(rect.h > 0)) msgs.push(['bad', `The area must fit inside the zone (${z.w} × ${z.h} ft).`]);
    else if (overlapsExisting(z, rect)) msgs.push(['warn', 'This area overlaps another planting in the zone.']);
    const fr = S.settings;
    if (c.frost === 'tender' && start.slice(5) < fr.lastFrost && start.slice(5) > '01-15') msgs.push(['warn', `Tender crop, and your average last frost is ${fmtMD(fr.lastFrost)}.`]);
    if (c.frost === 'tender') { const ripe = addDays(start, c.dmin), ff = `${ripe.slice(0, 4)}-${fr.firstFrost}`; if (ripe > ff && ripe.slice(5) > '07-01') msgs.push(['warn', `May not mature before your average first frost (${fmtMD(fr.firstFrost)}).`]); }
    const hr = harvestRange({ start }, c), n = plantCount({ w: +d.w || 0, h: +d.h || 0 }, c);
    msgs.push(['info', `Harvest ${fmt(hr.from)} to ${fmt(hr.to)} · about ${n} plants at ${c.sp} in spacing · ${c.method}.`]);
    info = msgs.map(([k, t]) => `<p class="note ${k}">${esc(t)}</p>`).join('');
  }
  const body = `<form id="mf" onsubmit="return false">
    ${field('Crop', `<select id="f-cropId" name="cropId" data-live="crop"><option value="">Choose a crop</option>${open.length ? `<optgroup label="Open now and suited to ${esc(z.name)}">${open.map(opt).join('')}</optgroup>` : ''}<optgroup label="All other crops">${rest.map(opt).join('')}</optgroup></select>`, 'f-cropId')}
    ${field('Start date (sow or transplant)', `<input id="f-start" name="start" type="date" value="${esc(d.start)}" data-live="1">`, 'f-start')}
    <div class="row gap">${field('Area width (ft)', num('w', d.w, 'data-live="1" min="0.5"'), 'f-w')}${field('Area length (ft)', num('h', d.h, 'data-live="1" min="0.5"'), 'f-h')}</div>
    <div class="row gap">${field('From left (ft)', num('x', d.x, 'data-live="1" min="0"'), 'f-x')}${field('From top (ft)', num('y', d.y, 'data-live="1" min="0"'), 'f-y')}</div>
    ${field('Notes (variety, source)', txt('notes', d.notes), 'f-notes')}
    ${info}
  </form>`;
  return sheet(`Plant in ${z.name}`, body, { foot: `<button class="btn primary wide" data-act="savePlanting" ${c ? '' : 'disabled'}>Save planting</button>` });
}

/* ---------- Quick log ---------- */
const LOG_ACTIONS = ['watered', 'weeded', 'fed', 'pruned', 'sowed', 'planted', 'harvested', 'pests', 'other'];
function timerMs() { const t = S.settings.timer; if (!t) return 0; return (t.accMs || 0) + (t.running ? Date.now() - t.startedAt : 0); }
function fmtTimer(ms) { const s = Math.floor(ms / 1000); return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; }
function logModal() {
  const m = topModal(), d = m.draft || (m.draft = { target: m.props.pid ? 'p:' + m.props.pid : m.props.zid ? 'z:' + m.props.zid : '', sel: [], minutes: '', lb: '', note: '', date: today(), photo: '' });
  const opts = [];
  for (const z of S.zones) {
    const acts = activeIn(z.id);
    opts.push(`<optgroup label="${esc(z.name)}"><option value="z:${z.id}" ${d.target === 'z:' + z.id ? 'selected' : ''}>Whole zone</option>${acts.map(p => { const c = cropById(p.cropId); return c ? `<option value="p:${p.id}" ${d.target === 'p:' + p.id ? 'selected' : ''}>${esc(c.name)}</option>` : ''; }).join('')}</optgroup>`);
  }
  if (!d.target && S.zones[0]) d.target = 'z:' + S.zones[0].id;
  const t = S.settings.timer || {};
  const chips = LOG_ACTIONS.map(a => `<button type="button" class="chip ${d.sel.includes(a) ? 'on' : ''}" data-act="logAct" data-v="${a}">${ACTION_LABEL[a]}</button>`).join('');
  const body = `<form id="mf" onsubmit="return false">
    ${field('Where', `<select id="f-target" name="target">${opts.join('')}</select>`, 'f-target')}
    <div class="timer"><div class="row between"><span>${t.running ? '<i class="pulse"></i>Timer running' : t.accMs ? 'Timer paused' : 'Timer'}</span></div><div id="timerOut" class="tnum">${fmtTimer(timerMs())}</div>
      <div class="row gap">${t.running ? '<button type="button" class="btn ghost" data-act="timerPause">Pause</button>' : `<button type="button" class="btn ghost" data-act="timerStart">${t.accMs ? 'Resume' : 'Start timer'}</button>`}<button type="button" class="btn light" data-act="timerStop" ${timerMs() < 1000 ? 'disabled' : ''}>Use this time</button></div></div>
    <div class="field"><label>What did you do?</label><div class="chipgrid">${chips}</div></div>
    <div class="row gap">${field('Minutes worked', num('minutes', d.minutes, 'min="0"'), 'f-minutes')}${d.sel.includes('harvested') ? field('Harvest (lb)', num('lb', d.lb, 'min="0"'), 'f-lb') : field('Date', `<input id="f-date" name="date" type="date" value="${esc(d.date)}">`, 'f-date')}</div>
    ${d.sel.includes('harvested') ? field('Date', `<input id="f-date" name="date" type="date" value="${esc(d.date)}">`, 'f-date') : ''}
    ${field('Note', `<textarea id="f-note" name="note" rows="2">${esc(d.note)}</textarea>`, 'f-note')}
    <div class="row gap"><label class="btn filebtn">${ic('camera', 18)} ${d.photo ? 'Change photo' : 'Add photo'}<input type="file" accept="image/*" capture="environment" data-act-change="photo" hidden></label>${d.photo ? `<img class="thumb" src="${d.photo}" alt="Photo to attach"><button type="button" class="btn sm" data-act="rmPhoto">Remove</button>` : ''}</div>
  </form>`;
  return sheet('Log work', body, { foot: '<button class="btn primary wide" data-act="saveLog">Save log</button>' });
}

/* ---------- Crops ---------- */
function cropModal() {
  const c = cropById(topModal().props.id); if (!c) return sheet('Crop', '<p>Crop not found.</p>');
  const iso = today(), open = openWindow(c, iso), next = nextOpening(c, iso);
  const wins = windowsOf(c).map(w => `${fmtMD(w.s)} to ${fmtMD(w.e)}`).join(' · ');
  const facts = [['Days to harvest', c.dmin === c.dmax ? c.dmin : `${c.dmin}-${c.dmax}`], ['Spacing', c.sp + ' in'], ['Start from', c.method], ['Frost', { hardy: 'Hardy', light: 'Light frost ok', tender: 'Tender' }[c.frost]], ['Height', { short: 'Short', med: 'Medium', tall: 'Tall (place north)' }[c.ht]], ['Rotation gap', c.rot ? c.rot + ' years' : 'None'], ['Resow every', c.succ ? c.succ + ' weeks' : 'Once'], ['Family', c.family]]
    .map(([k, v]) => `<div class="stat"><small>${k}</small><b>${esc(v)}</b></div>`).join('');
  const zoneRows = S.zones.map(z => {
    if (!zoneFits(z, c)) return '';
    const rc = rotationConflict(z.id, c, iso), fr = freeArea(z) > 1;
    return `<div class="kv"><span>${esc(z.name)}<small>${rc ? 'Rotation: ' + esc(rc.c.family) + ' here in ' + rc.p.start.slice(0, 4) : fr ? Math.round(freeArea(z)) + ' sq ft free' : 'Full'}</small></span><button class="btn sm" data-act="addPlanting" data-zone="${z.id}" data-crop="${c.id}">Plant</button></div>`;
  }).join('') || '<p class="muted">No zone type fits this crop.</p>';
  const body = `<div class="row gap wrap">${open ? badge(`Plant now, until ${fmt(addDays(iso, open.daysLeft))}`, 'good') : next ? badge(`Opens ${fmt(next.date)}`) : ''}${c.conf === 'e' ? badge('Window estimated: verify', 'warn') : ''}${c.edited ? badge('Edited by you') : ''}${c.custom ? badge('Your crop') : ''}</div>
    <p><b>Planting window:</b> ${wins || 'not set'}</p>${c.note ? `<p class="muted">${esc(c.note)}</p>` : ''}
    <div class="grid2">${facts}</div>
    <section class="card"><h2>Zones that suit it</h2>${zoneRows}</section>`;
  const foot = `<div class="row gap"><button class="btn grow" data-act="editCrop" data-id="${c.id}">Edit crop</button></div>`;
  return sheet(c.name, body, { foot });
}
function cropEditModal() {
  const m = topModal(), c = m.props.crop || { season: 'cool', cat: 'leafy', method: 'seed', frost: 'light', ht: 'short', succ: 0, rot: 2, dmin: 50, dmax: 60, sp: 6, windows: '' };
  const d = m.draft || {}, v = k => d[k] ?? c[k] ?? '';
  const O = (a) => a.map(x => [x, x[0].toUpperCase() + x.slice(1)]);
  const body = `<form id="mf" onsubmit="return false">
    ${field('Name', txt('name', v('name')), 'f-name')}
    ${field('Family (used for rotation)', `<input id="f-family" name="family" list="fams" value="${esc(v('family'))}"><datalist id="fams">${[...new Set(allCrops().map(x => x.family))].map(f => `<option value="${esc(f)}">`).join('')}</datalist>`, 'f-family')}
    <div class="row gap">${field('Color group', sel('cat', Object.entries(CAT).map(([k, x]) => [k, x.label]), v('cat')), 'f-cat')}${field('Season', sel('season', [['cool', 'Cool'], ['warm', 'Warm']], v('season')), 'f-season')}</div>
    <div class="row gap">${field('Start from', sel('method', O(['seed', 'transplant', 'clove', 'tuber']), v('method')), 'f-method')}${field('Frost', sel('frost', [['hardy', 'Hardy'], ['light', 'Light frost ok'], ['tender', 'Tender']], v('frost')), 'f-frost')}</div>
    <div class="row gap">${field('Days to harvest, min', num('dmin', v('dmin'), 'min="1"'), 'f-dmin')}${field('max', num('dmax', v('dmax'), 'min="1"'), 'f-dmax')}</div>
    <div class="row gap">${field('Spacing (in)', num('sp', v('sp'), 'min="0.5"'), 'f-sp')}${field('Height', sel('ht', [['short', 'Short'], ['med', 'Medium'], ['tall', 'Tall']], v('ht')), 'f-ht')}</div>
    <div class="row gap">${field('Resow every (weeks, 0 = once)', num('succ', v('succ'), 'min="0"'), 'f-succ')}${field('Rotation gap (years)', num('rot', v('rot'), 'min="0"'), 'f-rot')}</div>
    ${field('Planting windows', txt('windows', v('windows'), 'placeholder="02-15:04-05,08-01:09-30"'), 'f-windows', 'Month-day pairs, start:end, separated by commas. Example: 02-15:04-05 means Feb 15 to Apr 5.')}
    <label class="check"><input type="checkbox" name="trellis" ${(d.trellis ?? c.trellis) ? 'checked' : ''}> Climbs a trellis</label>
    ${field('Notes', txt('note', v('note')), 'f-note')}
  </form>`;
  const foot = `<div class="row gap">${c.edited ? `<button class="btn" data-act="resetCrop" data-id="${c.id}">Reset to default</button>` : ''}${c.custom ? `<button class="btn danger" data-act="delCrop" data-id="${c.id}">Delete</button>` : ''}<button class="btn primary grow" data-act="saveCrop">Save crop</button></div>`;
  return sheet(c.id ? 'Edit crop' : 'New crop', body, { foot });
}

function frostSettings() {
  const loc = S.settings.loc;
  return `<section class="card"><h2>Frost alerts</h2>${loc ? `<p><b>${esc(loc.label)}</b><br><span class="muted small">Forecast from ${esc(S.forecast ? S.forecast.via : 'the National Weather Service')}${S.forecast ? ', updated ' + hhmm(S.forecast.fetchedAt) : ''}.</span></p>` : '<p class="muted small">Add your location and the app checks the forecast for frost on the crops you have planted.</p>'}
    <div class="field"><label for="zip">ZIP code, or latitude and longitude</label><input id="zip" type="text" inputmode="text" autocomplete="postal-code" placeholder="28401 or 34.23, -77.94"></div>
    <div class="row gap wrap"><button class="btn primary" data-act="findLoc">Find</button><button class="btn" data-act="useLoc">Use my location</button>${loc ? '<button class="btn" data-act="clearLoc">Remove</button>' : ''}</div>
    <p class="muted small">Alerts show when you open the app. Notifications while the app is closed need a small online service that this version does not include.</p>
    <button class="btn wide" data-act="demoOn">Preview a sample frost alert</button></section>`;
}
function frostModal() {
  const o = frostOutlook();
  let body;
  if (!o) body = `<p class="muted">${S.frostBusy ? 'Loading the forecast…' : esc(S.frostError || 'No forecast yet. Set your location in Settings.')}</p>`;
  else {
    const al = o.alerts.map(a => `<div class="note bad"><b>${esc(a.event)}</b><p class="small">${esc(a.headline)}</p>${a.instruction ? `<p class="small">${esc(a.instruction)}</p>` : ''}</div>`).join('');
    const nights = o.nights.map(n => {
      const [lab, kind] = LEVEL[n.level];
      const list = n.risks.length ? `<p><b>At risk</b></p><ul class="src">${n.risks.map(r => `<li>${esc(r.c.name)} in ${esc(r.z.name)}<small class="muted"> · ${FROST_CLASS[r.c.frost] || 'Hardy'}, protect at ${r.thr}°F or lower</small></li>`).join('')}</ul>` : '<p class="muted">Nothing you have planted is at risk.</p>';
      return `<section class="card"><div class="row between gap"><h2>${esc(n.name)} · ${fmt(n.date)}</h2>${badge(`${n.low}°F · ${lab}`, kind)}</div>${n.short ? `<p class="muted small">${esc(n.short)}</p>` : ''}${list}</section>`;
    }).join('');
    const tips = o.nights.some(n => n.risks.length) ? `<section class="card"><h2>What to do</h2><ul class="src">${FROST_TIPS.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>` : '';
    body = `${o.sample ? '<p class="note warn"><b>Sample forecast.</b> These numbers are made up to show how alerts look.</p>' : ''}${al}${nights}${tips}
      <p class="muted small">Rules of thumb: tender crops are at risk at forecast lows of 36°F or lower, crops that take a light frost at 28°F, hardy crops at 20°F. Frost can form even when the forecast low is a few degrees above freezing, and low spots in your garden run colder than the forecast. You can change how hardy a crop is under Plants.</p>
      <p class="muted small">${esc(o.via)} · updated ${hhmm(o.fetchedAt)}${o.stale ? '. This forecast is out of date: refresh when you have signal.' : ''}${S.frostError ? ' ' + esc(S.frostError) : ''}</p>`;
  }
  const foot = `<div class="row gap">${S.demo ? '<button class="btn primary grow" data-act="demoOff">Stop sample</button>' : '<button class="btn primary grow" data-act="refreshFrost">Refresh forecast</button>'}</div>`;
  return sheet('Frost watch', body, { foot });
}
function modalHtml(m) {
  switch (m.type) {
    case 'setup': return settingsModal(true);
    case 'settings': return settingsModal(false);
    case 'zone': return zoneModal();
    case 'zoneEdit': return zoneEditModal();
    case 'addPlanting': return addPlantingModal();
    case 'log': return logModal();
    case 'crop': return cropModal();
    case 'cropEdit': return cropEditModal();
    case 'frost': return frostModal();
  }
  return '';
}
