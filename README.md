# GardenApp
GARDEN PLANNER - version 1.1
============================
A garden planning app for your phone. It works with no signal, and everything you enter
stays on your phone. No account, no ads, no server.

WHAT IT DOES
- Plot: your 20 x 20 ft plot, cut into zones (trellis, quick, long). Plants are drawn at their real spacing.
- Tap a zone: see what is planted, add a planting, and get suggestions that respect the planting window,
  zone type, rotation and shade.
- Plan: frost dates, "up next" tasks (harvest, resow, open zones), a timeline of your plantings,
  and a planting-window chart for every crop.
- + button: log work with a timer, quick action chips, harvest weight, a note and a photo.
- History: time worked and pounds harvested, by crop and by zone, plus the full log.
- Plants: 45 starter crops for southeastern NC. Edit any crop or add your own.
- Frost watch: enter your ZIP code in Settings. The app reads the National Weather Service forecast and
  warns you about nights cold enough to hurt what you have planted. See FROST ALERTS below.
- Costs are left out of version 1 on purpose. Time and harvest weight are tracked.

PUT IT ON YOUR PHONE (about 10 minutes)
The app must be served over https to install and to work offline. Pick one:

  Easiest: Netlify Drop
  1. Unzip this file on a computer.
  2. Go to app.netlify.com/drop and drag the unzipped "garden-app" folder onto the page.
  3. Create the free account when asked so the site stays up. Netlify gives you a web address.

  Or: GitHub Pages
  1. Make a free GitHub account and a new public repository.
  2. Upload everything from the unzipped folder, keeping the js and icons folders.
  3. In the repository settings, turn on Pages for the main branch.

  Menus on these sites change over time. If a step looks different, their help pages cover it.

INSTALL IT
- iPhone: open the web address in Safari, tap Share, then Add to Home Screen.
- Android: open it in Chrome, tap the menu, then Install app (or Add to Home screen).
Open it once while you have signal. After that it opens with no signal.

IMPORTANT: PROTECT YOUR DATA
- Your data lives in the phone's browser storage. Clearing browser data erases it, and Safari may clear
  storage for sites you have not opened in a while unless the app is on your home screen.
- Settings > Download backup (or Copy backup) saves everything. Do this every few weeks.
- Moving to a new phone: Settings > Import backup.
- Version 2 can add cloud sync so a lost phone does not lose your history.

FROST ALERTS
- Settings > Frost alerts: type a ZIP code (or latitude and longitude, or tap Use my location) and Find.
- The app shows a banner on the Plot screen and a Frost watch card on the Plan screen when a coming night
  is cold enough for something you have planted. Tap Details for each night and what to do.
- Rules of thumb: tender crops at a forecast low of 36 F or lower, crops that take a light frost at 28 F,
  hardy crops at 20 F. Frost can form on clear, calm nights even when the forecast low is above freezing, and low
  spots run colder than the forecast. Change a crop's hardiness under Plants if it does not match your garden.
- The forecast is saved on the phone, so the last one shows with no signal, marked out of date after 6 hours.
- LIMIT: alerts appear when you open the app. A phone notification while the app is closed needs a small online
  service to send it. That is a possible next step.
- Needs signal to refresh. Forecast data: National Weather Service (api.weather.gov). Backup: Open-Meteo.
  ZIP lookup: zippopotam.us. Only your ZIP code or coordinates are sent. I could not test against the live services
  from where I built it, so tell me if the forecast fails to load on your phone.
- Settings > Preview a sample frost alert shows what an alert looks like with made-up numbers.

BEFORE YOU TRUST THE SCHEDULES
- Spacing and days to harvest come from NC State Extension's planting calendar.
- Planting windows come from NC State Extension's Eastern NC guide and the Pender County article.
  Where those disagreed I used the more cautious dates.
- Crops marked "Verify" have windows I estimated from similar crops.
- Frost dates: sources disagree for southeastern NC (about Mar 1 and Nov 22 near Wilmington,
  Apr 15 and early November for inland Pender County). Set your own in Settings.
- Check anything important with your county Extension office. Edit a crop to match what works in your garden.
- Rotation gaps (2-3 years) are general gardening practice, not an Extension figure. You can change them per crop.

FILES
index.html, styles.css, sw.js (offline), manifest.webmanifest, icons/, js/ (crops.js is the crop library).
