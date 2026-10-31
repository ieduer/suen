import { createSnow, paintEnso, paintBranch } from './snow.mjs';

const $ = id => document.getElementById(id);
const ns = 'http://www.w3.org/2000/svg';
const sayings = [
  '把心收回眼前，把事落在手上。\n今日的一小步，也有它的分量。',
  '不必將一切想明白，才肯動身。\n先做眼前可以做的一件事。',
  '昨日已有歸處，明日尚在途中。\n你能握住的，是此刻。',
  '花有花期，人有步履。\n無須催促自己，亦莫辜負今日。',
  '念念不忘的遠方，\n也從腳下這一步開始。',
  '雪落無聲，一片也有重量。\n今日做成的小事，亦然。',
  '別等雪停才出門，\n腳印本是此刻寫下的。',
];
let frozen = false, awake = false, quoteIndex = 0, lastSecond = -1;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 680px)');
function make(tag, attrs, text) { const el = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); if (text) el.textContent = text; return el; }
for (let i = 0; i < 12; i++) {
  const major = i % 3 === 0;
  $('ticks').append(make('line', { x1:250, y1: major ? 90 : 96, x2:250, y2: major ? 114 : 108, transform:`rotate(${i * 30} 250 250)`, class: major ? 'major' : '' }));
}
function hands(d) {
  const seconds = d.getSeconds() + (reduced.matches ? 0 : d.getMilliseconds() / 1000);
  const minutes = d.getMinutes() + seconds / 60, hours = d.getHours() % 12 + minutes / 60;
  $('second-hand').setAttribute('transform', `rotate(${seconds * 6} 250 250)`);
  $('minute-hand').setAttribute('transform', `rotate(${minutes * 6} 250 250)`);
  $('hour-hand').setAttribute('transform', `rotate(${hours * 30} 250 250)`);
}
function message(text) { $('message').textContent = text; }

function paintInks() { paintEnso($('enso')); paintBranch($('branch'), narrow.matches); }
paintInks();
const snow = createSnow({ canvas: $('snow'), inks: [$('enso'), $('branch')], reduced: reduced.matches });
new ResizeObserver(paintInks).observe($('enso'));
// 字形落定後才量第一次版面；字體失敗或過慢時也照常下雪
let first = 0;
const begin = () => { if (!first++) snow.rebuild(); };
document.fonts.load('400 100px HuWenMingChaoTi', '當下').then(() => document.fonts.ready).then(begin, begin);
setTimeout(begin, 3000);

if (matchMedia('(pointer: coarse)').matches) $('hint').textContent = '雪會落在字上。輕點字面，便可拂去。';

function setMode(value) {
  awake = value; document.body.classList.toggle('awake', awake);
  $('calm').setAttribute('aria-pressed', String(!awake)); $('awake').setAttribute('aria-pressed', String(awake));
  $('mode-note').textContent = awake ? '莫把今日，交給「改日」。風雪正緊。' : '心定，然後行。細雪無聲。';
  message(awake ? '你所等待的「有一天」，\n正是悄悄流逝的今天。' : sayings[quoteIndex]);
  snow.setStorm(awake ? 1 : 0);
}
$('calm').addEventListener('click', () => setMode(false));
$('awake').addEventListener('click', () => setMode(true));
$('next').addEventListener('click', () => { quoteIndex = (quoteIndex + 1 + Math.floor(Math.random() * (sayings.length - 1))) % sayings.length; message(sayings[quoteIndex]); });
$('freeze').addEventListener('click', () => {
  frozen = !frozen; document.body.classList.toggle('frozen', frozen);
  $('freeze').textContent = frozen ? '恢復指針' : '暫停指針'; $('freeze').setAttribute('aria-pressed', String(frozen));
  $('clock-state').textContent = frozen ? '指針暫停，雪懸半空。' : '十二刻，皆是當下。';
  $('clock').setAttribute('aria-label', frozen ? '指針已暫停的時盤' : '顯示本地時間的當下時盤');
  message(frozen ? '你可以按住指針，\n卻留不住這一刻。' : sayings[quoteIndex]);
  snow.setFrozen(frozen);
  if (!frozen) hands(new Date());
});
function tick() {
  const now = new Date();
  if (Math.floor(now.getTime() / 1000) !== lastSecond) {
    lastSecond = Math.floor(now.getTime() / 1000);
    $('date').textContent = new Intl.DateTimeFormat('zh-Hant', { year:'numeric', month:'long', day:'numeric', weekday:'short' }).format(now);
    $('time').textContent = `${new Intl.DateTimeFormat('zh-Hant', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(now)} · 本地時間`;
  }
  if (!frozen && !document.hidden) hands(now);
  setTimeout(tick, reduced.matches || frozen || document.hidden ? 1000 : 50);
}
tick();
