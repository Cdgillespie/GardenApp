/* Screens: Plot, Plan, Plants, History. Each returns HTML; app.js wires the taps. */
const IC = {
  plot: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 12h18M12 3v18"/>',
  plan: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  plants: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19l7-7"/>',
  history: '<path d="M5 20V11M12 20V5M19 20v-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'
};
const ic = (n, s = 22, w = 1.8) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;

const seasonDefault = iso => { const m = +iso.slice(5, 7); return (m >= 10 || m <= 3) ? 'cool' : 'warm'; };
const catColor = c => (CAT[c.cat] || CAT.other).color;
const FAMILY_TINTS = ['#CDEBD1', '#F3D2A8', '#D9CDEB', '#F6C9C0', '#CFE3EE', '#EBE3A8', '#D2DDD0', '#F0D6E4'];
const familyTint = f => { let h = 0; for (const ch of f) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return FAMILY_TINTS[h % FAMILY_TINTS.length]; };

function header(sub, title, right = '') {
  return `<header class="top"><div><p class="sub">${esc(sub)}</p><h1>${esc(title)}</h1></div>${right}</header>`;
}
function badge(text, kind = '') { return `<span class="badge ${kind}">${esc(text)}</span>`; }

/* ---------- Plot ---------- */
function plotSvg() {
  const s = S.settings, W = s.w, L = s.l, fs = Math.max(W, L) / 31, m = fs * 1.3, iso = today();
  const pats = Object.entries(CAT).map(([k, v]) => `<pattern id="h-${k}" width="0.4" height="0.4" patternUnits="userSpaceOnUse"><rect width="0.4" height="0.4" fill="${v.color}" fill-opacity=".22"/><line x1="0" y1="0.2" x2="0.4" y2="0.2" stroke="${v.color}" stroke-width="0.1"/></pattern>`).join('');
  let g = '';
  const chip = (x, y, text, dark) => {
    const w = text.length * fs * 0.56 + fs * 0.9;
    return `<rect x="${x}" y="${y}" width="${w}" height="${fs * 1.35}" rx="${fs * 0.65}" fill="${dark ? '#2F5D3A' : '#fff'}" fill-opacity="${dark ? 1 : 0.88}"/><text x="${x + fs * 0.45}" y="${y + fs * 0.98}" font-size="${fs * 0.85}" font-weight="700" fill="${dark ? '#fff' : '#1B2A22'}">${esc(text)}</text>`;
  };
  for (const z of S.zones) {
    const act = S.plantings.filter(p => p.zoneId === z.id && (isActive(p)));
    let fill = ZONE_FILL[z.type] || ZONE_FILL.other;
    let hist = '';
    if (S.mode === 'rotation') {
      const past = S.plantings.filter(p => p.zoneId === z.id).map(p => ({ p, c: cropById(p.cropId) })).filter(x => x.c).sort((a, b) => b.p.start.localeCompare(a.p.start));
      if (past[0]) fill = familyTint(past[0].c.family);
      const seen = new Set(); let line = 0;
      for (const { p, c } of past) {
        const key = p.start.slice(0, 4) + c.family; if (seen.has(key) || line >= 4) continue; seen.add(key);
        hist += `<text x="${z.x + fs * 0.5}" y="${z.y + fs * (2.9 + line * 1.15)}" font-size="${fs * 0.8}" fill="#1B2A22">${p.start.slice(0, 4)} ${esc(c.family)}</text>`; line++;
      }
      if (!past.length) hist = `<text x="${z.x + fs * 0.5}" y="${z.y + fs * 2.9}" font-size="${fs * 0.8}" fill="#4F5F55">No history yet</text>`;
    }
    g += `<g data-act="zone" data-id="${z.id}" class="zonegrp" tabindex="0" role="button" aria-label="${esc(z.name)}"><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${fill}" stroke="#B9AC8C" stroke-width="0.08"/>`;
    if (S.mode === 'crops') for (const p of act) {
      const c = cropById(p.cropId); if (!c) continue;
      const col = catColor(c), planned = p.start > iso, sp = spFt(c);
      const x0 = z.x + p.x, y0 = z.y + p.y;
      g += `<rect x="${x0}" y="${y0}" width="${p.w}" height="${p.h}" fill="${col}" fill-opacity="${planned ? 0.08 : 0.16}" stroke="${col}" stroke-width="0.07" ${planned ? 'stroke-dasharray="0.3 0.2"' : ''}/>`;
      const cols = Math.floor(p.w / sp), rows = Math.floor(p.h / sp);
      if (sp >= 0.5 && cols * rows <= 500 && !planned) {
        for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) g += `<circle cx="${(x0 + sp * (q + 0.5)).toFixed(2)}" cy="${(y0 + sp * (r + 0.5)).toFixed(2)}" r="${(sp * 0.4).toFixed(2)}" fill="${col}" stroke="#fff" stroke-width="0.05"/>`;
      } else if (!planned) g += `<rect x="${x0}" y="${y0}" width="${p.w}" height="${p.h}" fill="url(#h-${c.cat})"/>`;
      if (p.w >= 3) g += `<text x="${x0 + fs * 0.4}" y="${y0 + p.h - fs * 0.45}" font-size="${fs * 0.8}" font-weight="700" fill="#1B2A22" stroke="#fff" stroke-width="${fs * 0.28}" paint-order="stroke" stroke-linejoin="round">${esc(c.name)}${planned ? ' (planned)' : ''}</text>`;
    }
    g += chip(z.x + fs * 0.35, z.y + fs * 0.35, z.name, false) + hist + '</g>';
  }
  const empty = S.zones.length ? '' : `<text x="${W / 2}" y="${L / 2}" text-anchor="middle" font-size="${fs}" fill="#4F5F55">No zones yet. Tap the gear to add some.</text>`;
  return `<svg id="plot" viewBox="${-m * 0.4} ${-m * 0.4} ${W + m * 0.8} ${L + m * 0.8}" role="img" aria-label="Top-down map of ${esc(s.plotName)}, ${W} by ${L} feet, north at the top" preserveAspectRatio="xMidYMid meet"><defs>${pats}</defs><rect x="0" y="0" width="${W}" height="${L}" fill="#E9E0CC" stroke="#C9BC9E" stroke-width="0.1"/>${g}${empty}</svg>`;
}

function plotView() {
  const s = S.settings, iso = today();
  const season = seasonDefault(iso) === 'cool' ? 'Cool season' : 'Warm season';
  const legend = Object.entries(CAT).slice(0, 6).map(([, v]) => `<span class="lg"><i style="background:${v.color}"></i>${v.label}</span>`).join('');
  let hint = '<p class="muted">Tap a zone to see what is planted there, add a planting, or get suggestions.</p>';
  const emptyZones = S.zones.filter(z => !activeIn(z.id).length);
  const open = emptyZones.find(z => suggestions(z, iso).now.length) || emptyZones[0];
  if (open) {
    const sg = suggestions(open, iso).now[0];
    if (sg) hint = `<div class="row between"><b>${esc(open.name)} · open</b><span class="muted">${open.w} × ${open.h} ft</span></div><p>${esc(sg.c.name)} fits: its window is open until ${fmt(addDays(iso, sg.open.daysLeft))}${sg.c.conf === 'e' ? ' (estimated window, verify)' : ''}.</p><div class="row gap"><button class="btn primary" data-act="addPlanting" data-zone="${open.id}" data-crop="${sg.c.id}">Add ${esc(sg.c.name.toLowerCase())}</button><button class="btn" data-act="zone" data-id="${open.id}">Other options</button></div>`;
    else hint = `<div class="row between"><b>${esc(open.name)} · open</b><span class="muted">${open.w} × ${open.h} ft</span></div><p>Nothing is in its planting window today. Tap the zone to see what opens next.</p><button class="btn" data-act="zone" data-id="${open.id}">See what opens next</button>`;
  }
  return header(`${season} · ${fmtY(iso)}`, s.plotName, `<button class="iconbtn" data-act="settings" aria-label="Settings">${ic('gear')}</button>`)
    + `<div class="chips"><button class="chip ${S.mode === 'crops' ? 'on' : ''}" data-act="mode" data-v="crops">Crops</button><button class="chip ${S.mode === 'rotation' ? 'on' : ''}" data-act="mode" data-v="rotation">Rotation</button></div>`
    + `<div class="legendbar"><div class="legend">${legend}</div><b class="north">↑ North</b></div>`
    + frostBanner() + `<div class="plotwrap">${plotSvg()}</div><section class="card hint">${hint}</section>`;
}

/* ---------- Plan ---------- */
function monthHeader(rs) {
  const d = parseISO(rs); let h = '';
  for (let i = 0; i < 12; i++) { const m = (d.getMonth() + i) % 12; h += `<span class="${i === 0 ? 'now' : ''}">${MONTHS[m][0]}</span>`; }
  return `<div class="mh"><span></span><div class="mcols">${h}</div></div>`;
}
const xp = (rs, iso) => Math.min(1, Math.max(0, diffDays(rs, iso) / 365));
function bar(rs, from, to, color, op = 1, label = '') {
  const a = xp(rs, from), b = xp(rs, to); if (b <= a) return '';
  return `<i class="bar" style="left:${(a * 100).toFixed(2)}%;width:${((b - a) * 100).toFixed(2)}%;background:${color};opacity:${op}">${label}</i>`;
}
function planView() {
  const iso = today(), s = S.settings, season = S.planSeason || seasonDefault(iso);
  const rs = iso.slice(0, 8) + '01', todayX = (xp(rs, iso) * 100).toFixed(2);
  const tasks = genTasks(iso);
  const taskHtml = tasks.length ? tasks.map(t => {
    let btn = '';
    if (t.kind === 'harvest') btn = `<button class="btn sm" data-act="logFor" data-pid="${t.pid}">Log</button>`;
    if (t.kind === 'finish') btn = `<button class="btn sm" data-act="finishPlanting" data-id="${t.pid}">Finish</button>`;
    if (t.kind === 'empty') btn = `<button class="btn sm" data-act="zone" data-id="${t.zid}">Open</button>`;
    if (t.kind === 'frostcover') btn = `<button class="btn sm" data-act="frost">Details</button>`;
    if (t.kind === 'resow') btn = `<button class="btn sm" data-act="addPlanting" data-zone="${t.zid}" data-crop="${t.cid}">Add</button>`;
    return `<div class="task"><button class="tick" data-act="dismiss" data-key="${esc(t.key)}" aria-label="Mark done">${ic('check', 16, 3)}</button><span>${esc(t.text)}</span>${btn}</div>`;
  }).join('') : '<p class="muted">Nothing due. Tasks appear as plantings reach their harvest window, resow dates, or frost.</p>';

  const rows = S.plantings.filter(isActive).map(p => ({ p, c: cropById(p.cropId), z: zoneById(p.zoneId) })).filter(x => x.c && x.z)
    .sort((a, b) => a.p.start.localeCompare(b.p.start)).map(({ p, c, z }) => {
      const hr = harvestRange(p, c), col = catColor(c);
      return `<div class="trow"><span class="tl" title="${esc(c.name)} · ${esc(z.name)}">${esc(c.name)}<small>${esc(z.name)}</small></span><div class="track"><i class="today" style="left:${todayX}%"></i>${bar(rs, p.start, hr.from, col, 0.35)}${bar(rs, hr.from, addDays(hr.to, 21), col, 1)}</div></div>`;
    }).join('') || '<p class="muted pad">No plantings yet. Add one from the Plot tab.</p>';

  const y = +iso.slice(0, 4);
  const crops = allCrops().filter(c => c.season === season);
  const wrows = crops.map(c => {
    const bars = windowsOf(c).map(w => [y - 1, y, y + 1].map(yy => bar(rs, `${yy}-${w.s}`, `${yy}-${w.e}`, catColor(c), c.conf === 'e' ? 0.45 : 0.9)).join('')).join('');
    return `<div class="trow"><button class="tl linkish" data-act="crop" data-id="${c.id}">${esc(c.name)}${c.conf === 'e' ? '<small>estimated</small>' : ''}</button><div class="track"><i class="today" style="left:${todayX}%"></i>${bars}</div></div>`;
  }).join('');

  return header(`Today · ${fmtY(iso)}`, 'Season plan')
    + `<div class="chips"><button class="chip ${season === 'cool' ? 'on' : ''}" data-act="planSeason" data-v="cool">Cool season</button><button class="chip ${season === 'warm' ? 'on' : ''}" data-act="planSeason" data-v="warm">Warm season</button></div>`
    + `<div class="grid2"><div class="stat"><small>Last spring frost (avg)</small><b>${fmtMD(s.lastFrost)}</b></div><div class="stat"><small>First fall frost (avg)</small><b>${fmtMD(s.firstFrost)}</b></div></div>`
    + frostCard() + `<section class="card"><h2>Up next</h2>${taskHtml}</section>`
    + `<section class="card"><h2>Your plantings</h2>${monthHeader(rs)}${rows}<p class="legendline"><i class="k" style="opacity:.35"></i>Growing <i class="k"></i>Harvest window</p></section>`
    + `<section class="card"><h2>When to plant · ${season === 'cool' ? 'cool' : 'warm'} season</h2>${monthHeader(rs)}${wrows}<p class="muted small">Bars show planting windows. Faded bars are estimated: check your county Extension office. Tap a crop for details.</p></section>`;
}

/* ---------- Plants ---------- */
function plantsList() {
  const f = S.plantsFilter, iso = today(), q = f.q.trim().toLowerCase();
  const list = allCrops().filter(c => (f.season === 'all' || c.season === f.season) && (!q || c.name.toLowerCase().includes(q) || c.family.toLowerCase().includes(q)) && (!f.open || inWindow(c, iso)));
  if (!list.length) return '<p class="muted pad">No crops match.</p>';
  return list.map(c => {
    const open = openWindow(c, iso), next = nextOpening(c, iso);
    const b = open ? badge('Plant now', 'good') : next ? badge(`Opens ${fmt(next.date)}`) : '';
    return `<button class="crow" data-act="crop" data-id="${c.id}"><i class="dot" style="background:${catColor(c)}"></i><span class="cn"><b>${esc(c.name)}</b><small>${esc(c.family)} · ${c.season} season${c.custom ? ' · yours' : ''}</small></span>${c.conf === 'e' ? badge('Verify', 'warn') : ''}${b}</button>`;
  }).join('');
}
function plantsView() {
  const f = S.plantsFilter;
  return header(`${allCrops().length} crops`, 'Plants', `<button class="iconbtn" data-act="newCrop" aria-label="Add a crop">${ic('plus')}</button>`)
    + `<div class="searchbox"><label class="sr" for="q">Search crops</label><input id="q" type="search" placeholder="Search crops or families" value="${esc(f.q)}" autocomplete="off"></div>`
    + `<div class="chips"><button class="chip ${f.season === 'all' ? 'on' : ''}" data-act="pfilter" data-k="season" data-v="all">All</button><button class="chip ${f.season === 'cool' ? 'on' : ''}" data-act="pfilter" data-k="season" data-v="cool">Cool</button><button class="chip ${f.season === 'warm' ? 'on' : ''}" data-act="pfilter" data-k="season" data-v="warm">Warm</button><button class="chip ${f.open ? 'on' : ''}" data-act="pfilter" data-k="open">Open now</button></div>`
    + `<section class="card nopad" id="plist">${plantsList()}</section>`
    + `<p class="muted small pad">Spacing and days to harvest come from NC State Extension. Planting windows come from Eastern NC Extension guides. Crops marked Verify have estimated windows. Edit any crop to match your own experience.</p>`;
}

/* ---------- History ---------- */
const ACTION_LABEL = { watered: 'Watered', weeded: 'Weeded', fed: 'Fed', pruned: 'Pruned', sowed: 'Sowed', planted: 'Planted', harvested: 'Harvested', pests: 'Pests', other: 'Other' };
function historyView() {
  const f = S.historyFilter;
  const logs = S.logs.filter(l => f === 'all' || l.zoneId === f).sort((a, b) => b.ts.localeCompare(a.ts));
  const mins = logs.reduce((s, l) => s + (+l.minutes || 0), 0), lb = logs.reduce((s, l) => s + (+l.lb || 0), 0);
  const byCrop = {};
  for (const l of logs) { if (!(+l.lb > 0)) continue; const p = S.plantings.find(p => p.id === l.plantingId); const c = p && cropById(p.cropId); const k = c ? c.name : 'Other'; byCrop[k] = (byCrop[k] || 0) + (+l.lb); }
  const crops = Object.entries(byCrop).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b>${v.toFixed(1)} lb</b></div>`).join('') || '<p class="muted">No harvests logged yet.</p>';
  const perZone = S.zones.map(z => {
    const zl = S.logs.filter(l => l.zoneId === z.id), m = zl.reduce((s, l) => s + (+l.minutes || 0), 0), w = zl.reduce((s, l) => s + (+l.lb || 0), 0);
    if (!zl.length) return ''; const perHr = m > 0 ? (w / (m / 60)).toFixed(2) + ' lb/h' : '—';
    return `<div class="kv"><span>${esc(z.name)}<small>${(m / 60).toFixed(1)} h · ${w.toFixed(1)} lb</small></span><b>${perHr}</b></div>`;
  }).join('');
  const days = {};
  logs.forEach(l => { const d = l.ts.slice(0, 10); (days[d] = days[d] || []).push(l); });
  const list = Object.keys(days).length ? Object.keys(days).sort().reverse().map(d => `<h3>${fmtY(d)}</h3>` + days[d].map(l => {
    const z = zoneById(l.zoneId), p = S.plantings.find(p => p.id === l.plantingId), c = p && cropById(p.cropId);
    const acts = (l.actions || []).map(a => ACTION_LABEL[a] || a).join(', ') || 'Note';
    return `<div class="entry"><div><b>${esc(acts)}</b><small>${esc(z ? z.name : 'Removed zone')}${c ? ' · ' + esc(c.name) : ''}${l.minutes ? ' · ' + l.minutes + ' min' : ''}${l.lb ? ' · ' + l.lb + ' lb' : ''}</small>${l.note ? `<p>${esc(l.note)}</p>` : ''}${l.photo ? `<img class="thumb" src="${l.photo}" alt="Log photo">` : ''}</div><button class="iconbtn sm" data-act="delLog" data-id="${l.id}" aria-label="Delete entry">${ic('close', 16)}</button></div>`;
  }).join('')).join('') : '<p class="muted pad">Nothing logged yet. Tap + to log your first bit of work.</p>';
  return header('Time and harvest', 'History')
    + `<div class="field inline"><label for="hf">Show</label><select id="hf" data-act-change="hfilter"><option value="all">Whole plot</option>${S.zones.map(z => `<option value="${z.id}" ${f === z.id ? 'selected' : ''}>${esc(z.name)}</option>`).join('')}</select></div>`
    + `<div class="grid2"><div class="stat dark"><small>Time worked</small><b>${(mins / 60).toFixed(1)} h</b></div><div class="stat dark"><small>Harvested</small><b>${lb.toFixed(1)} lb</b></div></div>`
    + `<section class="card"><h2>Harvest by crop</h2>${crops}</section>`
    + (perZone ? `<section class="card"><h2>Harvest per hour, by zone</h2>${perZone}</section>` : '')
    + `<section class="card"><h2>Log</h2>${list}</section>`;
}

/* ---------- Frost ---------- */
const LEVEL = { hard: ['Hard freeze', 'bad'], freeze: ['Freezing', 'bad'], frost: ['Frost possible', 'warn'], ok: ['No frost', 'ok'] };
const hhmm = ms => { const d = new Date(ms), t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); return isoOf(d) === today() ? t : `${fmt(isoOf(d))}, ${t}`; };
const riskNames = (risks, max = 3) => { const names = [...new Set(risks.map(r => `${r.c.name} (${r.z.name})`))]; return names.slice(0, max).join(', ') + (names.length > max ? ` and ${names.length - max} more` : ''); };
function frostBanner() {
  const o = frostOutlook(); if (!o) return '';
  const hit = o.nights.slice(0, 3).find(n => n.risks.length), alert = o.alerts[0];
  if (!hit && !alert) return '';
  const sample = o.sample ? '<span class="badge warn">Sample forecast</span> ' : '';
  if (hit) {
    const [lab, kind] = LEVEL[hit.level];
    return `<section class="note ${kind} frostbar" role="status">${sample}<div class="row between gap"><b>${esc(hit.name)}: low ${hit.low}°F · ${lab}</b><button class="btn sm" data-act="frost">Details</button></div><p>Protect: ${esc(riskNames(hit.risks))}.</p>${alert ? `<p class="small">${esc(alert.event)} from the National Weather Service.</p>` : ''}</section>`;
  }
  return `<section class="note warn frostbar" role="status">${sample}<div class="row between gap"><b>${esc(alert.event)}</b><button class="btn sm" data-act="frost">Details</button></div><p class="small">${esc(alert.headline)}</p></section>`;
}
function frostCard() {
  const s = S.settings;
  if (!s.loc && !S.demo) return `<section class="card"><h2>Frost watch</h2><p class="muted">Add your ZIP code and the app checks the forecast for nights that could hurt what you have planted.</p><div class="row gap wrap"><button class="btn primary" data-act="settings">Set location</button><button class="btn" data-act="demoOn">See a sample alert</button></div></section>`;
  const o = frostOutlook();
  if (!o) return `<section class="card"><h2>Frost watch</h2><p class="muted">${S.frostBusy ? 'Loading the forecast…' : esc(S.frostError || 'No forecast yet.')}</p>${S.frostBusy ? '' : '<button class="btn" data-act="refreshFrost">Try again</button>'}</section>`;
  const rows = o.nights.map(n => { const [lab, kind] = LEVEL[n.level]; return `<div class="kv"><span>${esc(n.name)}<small>${fmt(n.date)}${n.short ? ' · ' + esc(n.short) : ''}</small></span><span class="right"><b>${n.low}°F</b> ${badge(lab, kind)}${n.risks.length ? `<small>${n.risks.length} planting${n.risks.length > 1 ? 's' : ''} at risk</small>` : ''}</span></div>`; }).join('');
  const where = s.loc && !S.demo ? s.loc.label : 'Sample forecast';
  return `<section class="card"><div class="row between"><h2>Frost watch · ${esc(where)}</h2></div>${o.alerts.map(a => `<p class="note bad"><b>${esc(a.event)}</b> ${esc(a.headline)}</p>`).join('')}${rows}<p class="muted small">${esc(o.via)} · updated ${hhmm(o.fetchedAt)}${o.stale ? '. This forecast is out of date.' : ''}${S.frostError ? ' ' + esc(S.frostError) : ''}</p><div class="row gap wrap"><button class="btn sm" data-act="frost">Details</button>${S.demo ? '<button class="btn sm primary" data-act="demoOff">Stop sample</button>' : '<button class="btn sm" data-act="refreshFrost">Refresh</button>'}</div></section>`;
}
