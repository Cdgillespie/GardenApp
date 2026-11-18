/* Frost alerts: forecast lookup (National Weather Service first, Open-Meteo as a backup), a saved copy for
   offline use, and which of YOUR plantings a cold night puts at risk.
   Rules of thumb: tender crops are at risk when the forecast low is 36 F or lower (frost can form on clear, calm
   nights even when the forecast says 36), crops that take a light frost at 28 F, hardy crops at 20 F. */
const FROST_AT = { tender: 36, light: 28, hardy: 20 };
const FROST_CLASS = { tender: 'Tender', light: 'Takes a light frost', hardy: 'Hardy' };
const FROST_TIPS = [
  'Cover plants before sunset with row cover, old sheets or buckets. Lift the cover off the leaves with stakes if you can.',
  'Water the soil in the afternoon. Moist soil holds more heat overnight than dry soil.',
  'Take covers off the next morning once it warms above freezing.',
  'Pick ripe tender crops such as tomatoes, peppers and squash before a hard freeze.'
];
const NWS = 'https://api.weather.gov';
const toF = (t, u) => (u === 'C' ? Math.round(t * 9 / 5 + 32) : t);
const locKey = l => l ? `${l.lat.toFixed(3)},${l.lon.toFixed(3)}` : '';
const weekday = iso => parseISO(iso).toLocaleDateString(undefined, { weekday: 'long' });

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function geocodeZip(zip) {
  const j = await getJSON(`https://api.zippopotam.us/us/${zip}`);
  const p = j.places && j.places[0]; if (!p) throw new Error('not found');
  return { lat: +p.latitude, lon: +p.longitude, label: `${p['place name']}, ${p['state abbreviation']}`, zip };
}
async function fetchNWS(loc) {
  const pt = `${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}`;
  const point = await getJSON(`${NWS}/points/${pt}`);
  const url = point.properties && point.properties.forecast; if (!url) throw new Error('no forecast for this point');
  const [fc, al] = await Promise.all([getJSON(url), getJSON(`${NWS}/alerts/active?point=${pt}`).catch(() => null)]);
  const periods = (fc.properties && fc.properties.periods) || [];
  const nights = periods.filter(p => p.isDaytime === false && p.startTime && typeof p.temperature === 'number').map(p => ({
    date: p.startTime.slice(0, 10), start: p.startTime, end: p.endTime, name: p.name || weekday(p.startTime.slice(0, 10)) + ' night',
    low: toF(p.temperature, p.temperatureUnit), short: p.shortForecast || ''
  }));
  if (!nights.length) throw new Error('no overnight lows in the forecast');
  const alerts = ((al && al.features) || []).map(f => f.properties || {}).filter(a => /frost|freeze/i.test(a.event || '')).map(a => ({
    event: a.event, headline: a.headline || '', ends: a.ends || a.expires || '', instruction: a.instruction || ''
  }));
  return { src: 'National Weather Service', nights, alerts };
}
async function fetchOpenMeteo(loc) {
  const j = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat.toFixed(4)}&longitude=${loc.lon.toFixed(4)}&daily=temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`);
  const d = j.daily; if (!d || !d.time || !d.temperature_2m_min) throw new Error('unexpected reply');
  /* The low listed for a date happens before dawn, so it belongs to the night that starts the evening before. */
  const nights = d.time.map((day, i) => {
    const date = addDays(day, -1);
    return { date, start: `${date}T18:00:00`, end: `${day}T08:00:00`, name: date === today() ? 'Tonight' : weekday(date) + ' night', low: Math.round(d.temperature_2m_min[i]), short: '' };
  }).filter(n => n.low === n.low);
  if (!nights.length) throw new Error('no lows in the forecast');
  return { src: 'Open-Meteo', nights, alerts: [] };
}

/* Fetch and keep a copy. Quiet when offline: the last copy keeps working. */
async function refreshForecast(force) {
  const s = S.settings; if (!s || !s.loc || S.demo) return false;
  const now = Date.now(), f = S.forecast;
  if (!force && f && f.locKey === locKey(s.loc) && now - f.fetchedAt < 45 * 60e3) return false;
  if (!force && now - (S.lastFrostTry || 0) < 10 * 60e3) return false;
  S.lastFrostTry = now;
  if (navigator.onLine === false) { S.frostError = 'You are offline, so the forecast may be out of date.'; return false; }
  S.frostBusy = true; S.frostError = '';
  let data = null; const errs = [];
  try { data = await fetchNWS(s.loc); }
  catch (e) { errs.push('National Weather Service: ' + e.message); try { data = await fetchOpenMeteo(s.loc); } catch (e2) { errs.push('Open-Meteo: ' + e2.message); } }
  S.frostBusy = false;
  if (!data) { S.frostError = 'Could not load the forecast (' + errs.join('; ') + ').'; return false; }
  await put('meta', { id: 'forecast', locKey: locKey(s.loc), fetchedAt: now, via: data.src, nights: data.nights, alerts: data.alerts });
  return true;
}

function demoForecast() {
  const t = today(), lows = [31, 35, 42, 29, 45], names = ['Tonight', ...[1, 2, 3, 4].map(i => weekday(addDays(t, i)) + ' night')];
  return {
    sample: true, fetchedAt: Date.now(), via: 'Sample data',
    nights: lows.map((low, i) => ({ date: addDays(t, i), start: `${addDays(t, i)}T18:00:00`, end: `${addDays(t, i + 1)}T08:00:00`, name: names[i], low, short: i === 0 ? 'Clear and calm' : '' })),
    alerts: [{ event: 'Freeze Warning', headline: 'Sample: a Freeze Warning looks like this.', ends: `${addDays(t, 1)}T09:00:00`, instruction: 'Take steps now to protect tender plants from the cold temperatures.' }]
  };
}
function forecastData() {
  if (S.demo) return demoForecast();
  const s = S.settings, f = S.forecast;
  return s && s.loc && f && f.locKey === locKey(s.loc) ? f : null;
}
/* For each upcoming night: how cold, and which active plantings that puts at risk. */
function frostOutlook() {
  const f = forecastData(); if (!f) return null;
  const nowMs = Date.now();
  const items = S.plantings.filter(isActive).map(p => ({ p, c: cropById(p.cropId), z: zoneById(p.zoneId) })).filter(x => x.c && x.z);
  const nights = f.nights.filter(n => new Date(n.end).getTime() > nowMs).slice(0, 5).map(n => {
    const risks = items.filter(({ p }) => p.start <= n.date).map(x => ({ ...x, thr: FROST_AT[x.c.frost] ?? 20 })).filter(x => n.low <= x.thr);
    const level = n.low <= 28 ? 'hard' : n.low <= 32 ? 'freeze' : n.low <= 36 ? 'frost' : 'ok';
    return { ...n, level, risks };
  });
  const alerts = (f.alerts || []).filter(a => !a.ends || new Date(a.ends).getTime() > nowMs);
  return { nights, alerts, fetchedAt: f.fetchedAt, via: f.via || f.src || '', sample: !!f.sample, stale: nowMs - f.fetchedAt > 6 * 3600e3 };
}
