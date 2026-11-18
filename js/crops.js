/* Starter crop library: 45 crops for southeastern NC.
   Spacing and days to harvest: NC State Extension (planting calendar table, Eastern NC planting guide).
   Planting windows: Eastern NC guide + NC State Extension Pender County article, using the more conservative
   dates where they disagree. conf "s" = taken from those sources, "e" = estimated from similar crops: verify.
   Row: id|name|family|category|season|method|daysMin|daysMax|spacingIn|frost|height|successionWeeks|trellis|rotationYears|windows|conf|note */
const CAT = {
  brassica: { label: 'Brassica', color: '#1F5B3C' },
  legume: { label: 'Legume', color: '#8A7A12' },
  leafy: { label: 'Leafy', color: '#8FD19A' },
  root: { label: 'Root', color: '#E08A2E' },
  fruit: { label: 'Fruiting', color: '#C0452F' },
  allium: { label: 'Allium', color: '#7B5EA7' },
  other: { label: 'Other', color: '#6B7F8A' }
};
const CROP_ROWS = [
  'collards|Collards|Brassica|brassica|cool|transplant|60|100|18|hardy|med|0|0|3|02-15:04-05,07-01:09-15|s|',
  'kale|Kale|Brassica|brassica|cool|transplant|40|50|6|hardy|med|0|0|3|02-15:04-05,08-01:09-15|s|',
  'cabbage|Cabbage|Brassica|brassica|cool|transplant|70|80|12|hardy|med|0|0|3|02-15:04-05,09-01:09-30|s|Fall: start seed in mid-August and transplant in September.',
  'broccoli|Broccoli|Brassica|brassica|cool|transplant|70|80|18|hardy|med|0|0|3|02-15:04-05,09-01:09-30|s|Fall: start seed in mid-August and transplant in September.',
  'cauliflower|Cauliflower|Brassica|brassica|cool|transplant|55|65|18|light|med|0|0|3|02-15:04-15,08-01:09-30|s|',
  'brussels|Brussels sprouts|Brassica|brassica|cool|transplant|90|100|18|hardy|med|0|0|3|08-15:09-30|e|Window estimated from similar crops.',
  'kohlrabi|Kohlrabi|Brassica|brassica|cool|transplant|50|60|4|hardy|short|0|0|3|02-15:04-05,08-01:09-15|s|',
  'turnips|Turnips|Brassica|root|cool|seed|55|60|2|hardy|short|3|0|3|02-15:04-05,08-01:09-15|s|',
  'radish|Radishes|Brassica|root|cool|seed|25|30|1|hardy|short|2|0|3|02-15:04-05,08-01:09-15|s|',
  'mustard|Mustard greens|Brassica|leafy|cool|seed|30|40|2|hardy|short|3|0|3|02-15:04-05,08-01:09-15|s|',
  'bokchoy|Bok choy|Brassica|leafy|cool|transplant|45|90|9|hardy|short|0|0|3|02-15:04-05,08-15:09-30|e|Window estimated from similar crops.',
  'arugula|Arugula|Brassica|leafy|cool|seed|20|40|6|hardy|short|2|0|3|02-15:04-05,09-01:10-31|e|Window estimated from similar crops.',
  'spinach|Spinach|Amaranth|leafy|cool|seed|50|60|6|hardy|short|4|0|2|02-15:04-05,08-01:09-30|s|',
  'chard|Swiss chard|Amaranth|leafy|cool|seed|60|70|6|light|short|0|0|2|03-01:04-30,08-01:09-15|s|',
  'beets|Beets|Amaranth|root|cool|seed|55|60|2|light|short|3|0|2|02-15:04-05,08-15:09-15|e|Spring window estimated.',
  'lettuce|Lettuce|Lettuce family|leafy|cool|seed|40|85|8|light|short|3|0|2|02-15:04-05,08-01:09-30|s|Leaf types 40-50 days, heads 70-85.',
  'endive|Endive|Lettuce family|leafy|cool|seed|70|90|8|light|short|0|0|2|08-15:09-30|e|Window estimated from similar crops.',
  'carrots|Carrots|Carrot family|root|cool|seed|85|95|2|hardy|short|3|0|2|02-15:04-05,08-15:09-15|s|',
  'parsnips|Parsnips|Carrot family|root|cool|seed|110|120|3|hardy|short|0|0|2|02-15:04-05,08-01:09-30|s|',
  'celery|Celery|Carrot family|leafy|cool|transplant|80|100|7|light|med|0|0|2|03-01:03-31,07-15:08-15|e|Window estimated.',
  'cilantro|Cilantro|Carrot family|leafy|cool|seed|50|55|3|light|short|3|0|2|02-01:03-31,09-01:09-30|s|Days to leaf harvest.',
  'parsley|Parsley|Carrot family|leafy|cool|transplant|75|85|10|hardy|short|0|0|2|02-15:04-15,08-01:09-30|s|',
  'dill|Dill|Carrot family|leafy|cool|seed|40|55|3|light|med|3|0|2|03-01:03-31,08-01:09-15|s|Days to leaf harvest.',
  'garlic|Garlic|Onion family|allium|cool|clove|180|210|5|hardy|short|0|0|3|09-15:11-15|s|Plant cloves in fall, harvest in early summer.',
  'onions|Onions|Onion family|allium|cool|transplant|60|80|4|hardy|short|0|0|3|02-01:03-15,08-15:10-31|s|Fall plantings overwinter.',
  'leeks|Leeks|Onion family|allium|cool|transplant|120|150|4|hardy|short|0|0|3|02-15:04-05|s|',
  'shallots|Shallots|Onion family|allium|cool|clove|90|120|6|hardy|short|0|0|3|09-15:11-15|e|Window estimated from garlic.',
  'snappeas|Snap peas|Legume|legume|cool|seed|55|72|3|hardy|tall|0|1|2|02-15:03-15,08-01:09-30|s|Vining: needs a trellis.',
  'engpeas|English peas|Legume|legume|cool|seed|65|70|3|hardy|tall|0|1|2|02-15:03-15,08-01:09-30|s|Vining: needs a trellis.',
  'bushbeans|Bush beans|Legume|legume|warm|seed|50|55|2|tender|short|3|0|2|03-25:05-15,08-15:09-15|s|',
  'polebeans|Pole beans|Legume|legume|warm|seed|65|70|6|tender|tall|0|1|2|04-15:06-15,08-01:08-31|e|Window estimated from bush beans.',
  'southernpeas|Southern peas|Legume|legume|warm|seed|55|65|4|tender|short|0|0|2|04-15:06-30,08-01:08-30|s|',
  'limabeans|Lima beans|Legume|legume|warm|seed|65|80|6|tender|med|0|0|2|04-15:06-15|s|',
  'tomatoes|Tomatoes|Nightshade|fruit|warm|transplant|75|85|18|tender|tall|0|0|3|04-15:06-30,08-01:08-15|s|',
  'peppers|Peppers|Nightshade|fruit|warm|transplant|75|80|18|tender|med|0|0|3|04-15:06-15,08-01:08-15|s|',
  'eggplant|Eggplant|Nightshade|fruit|warm|transplant|80|85|24|tender|med|0|0|3|04-15:06-15,08-01:08-15|s|',
  'potatoes|Potatoes|Nightshade|root|cool|tuber|95|120|10|light|med|0|0|3|02-15:03-31|s|',
  'cucumbers|Cucumbers|Cucurbit|fruit|warm|seed|50|65|12|tender|tall|0|1|3|04-15:06-30,07-01:08-15|s|Trellis saves space.',
  'summersquash|Summer squash|Cucurbit|fruit|warm|seed|50|60|24|tender|med|0|0|3|04-15:06-30,07-01:08-15|s|',
  'wintersquash|Winter squash|Cucurbit|fruit|warm|seed|70|95|36|tender|short|0|0|3|04-15:07-15|e|Window trimmed so it ripens before frost.',
  'watermelon|Watermelon|Cucurbit|fruit|warm|seed|90|100|60|tender|short|0|0|3|04-15:06-15|e|Window estimated.',
  'cantaloupe|Cantaloupe|Cucurbit|fruit|warm|seed|85|100|24|tender|short|0|0|3|04-15:05-15,07-01:07-15|s|',
  'okra|Okra|Mallow|fruit|warm|seed|60|70|12|tender|tall|0|0|2|05-01:06-15,08-01:08-31|s|',
  'sweetpotatoes|Sweet potatoes|Morning glory|root|warm|transplant|95|125|10|tender|short|0|0|3|05-01:07-15|s|Plant slips.',
  'corn|Sweet corn|Grass|other|warm|seed|85|90|12|tender|tall|0|0|2|03-25:05-31|s|Plant in blocks, not single rows.'
];
const CONTINUOUS = new Set(['tomatoes', 'peppers', 'eggplant', 'okra', 'cucumbers', 'summersquash', 'collards', 'kale', 'brussels', 'snappeas', 'polebeans', 'southernpeas', 'chard', 'celery', 'parsley']);
const SOURCES = [
  { t: 'NC State Extension: Garden planting calendar (spacing, days to harvest)', u: 'https://www.ces.ncsu.edu/wp-content/uploads/2021/10/NC-Vegetable-Planting-Table_2021-accessible.pdf' },
  { t: 'NC State Extension: Vegetable planting guide for Eastern NC', u: 'https://growforit.ces.ncsu.edu/wp-content/uploads/2018/02/Veggie-guide-east.pdf' },
  { t: 'NC State Extension Pender County: Planning for year-round harvest', u: 'https://pender.ces.ncsu.edu/2021/01/planning-for-year-round-harvest' }
];
function parseCrop(r) {
  const a = r.split('|');
  return { id: a[0], name: a[1], family: a[2], cat: a[3], season: a[4], method: a[5], dmin: +a[6], dmax: +a[7], sp: +a[8], frost: a[9], ht: a[10], succ: +a[11], trellis: a[12] === '1', rot: +a[13], windows: a[14], conf: a[15], note: a[16] || '' };
}
const BUILTIN = {};
CROP_ROWS.forEach(r => { const c = parseCrop(r); BUILTIN[c.id] = c; });
