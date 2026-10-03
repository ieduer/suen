const $ = id => document.getElementById(id);
const ns = 'http://www.w3.org/2000/svg';
const sayings = [
  '把心收回眼前，把事落在手上。\n今日的一小步，也有它的分量。',
  '不必將一切想明白，才肯動身。\n先做眼前可以做的一件事。',
  '昨日已有歸處，明日尚在途中。\n你能握住的，是此刻。',
  '花有花期，人有步履。\n無須催促自己，亦莫辜負今日。',
  '念念不忘的遠方，\n也從腳下這一步開始。',
];
let frozen = false, awake = false, quoteIndex = 0, lastSecond = -1;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
function make(tag, attrs, text) { const el = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); if (text) el.textContent = text; return el; }
for (let i = 0; i < 60; i++) {
  $('marks').append(make('line', { x1:250, y1: i % 5 === 0 ? 60 : 65, x2:250, y2: i % 5 === 0 ? 73 : 71, transform:`rotate(${i * 6} 250 250)`, class: i % 5 === 0 ? 'major' : '' }));
}
for (let i = 0; i < 12; i++) {
  const angle = i * Math.PI / 6, x = 250 + Math.sin(angle) * 157, y = 250 - Math.cos(angle) * 157;
  $('labels').append(make('text', { x, y: y + 5, 'text-anchor':'middle' }, '今'));
  $('labels').append(make('text', { x:250, y:30, 'text-anchor':'middle', transform:`rotate(${i * 30} 250 250)`, class:'ring' }, 'NOW'));
}
function hands(d) {
  const seconds = d.getSeconds() + (reduced.matches ? 0 : d.getMilliseconds() / 1000);
  const minutes = d.getMinutes() + seconds / 60, hours = d.getHours() % 12 + minutes / 60;
  $('second-hand').setAttribute('transform', `rotate(${seconds * 6} 250 250)`);
  $('minute-hand').setAttribute('transform', `rotate(${minutes * 6} 250 250)`);
  $('hour-hand').setAttribute('transform', `rotate(${hours * 30} 250 250)`);
}
function message(text) { $('message').textContent = text; }
function setMode(value) {
  awake = value; document.body.classList.toggle('awake', awake);
  $('calm').setAttribute('aria-pressed', String(!awake)); $('awake').setAttribute('aria-pressed', String(awake));
  $('mode-note').textContent = awake ? '莫把今日，交給「改日」。' : '心定，然後行。';
  message(awake ? '你所等待的「有一天」，\n正是悄悄流逝的今天。' : sayings[quoteIndex]);
}
$('calm').addEventListener('click', () => setMode(false));
$('awake').addEventListener('click', () => setMode(true));
$('next').addEventListener('click', () => { quoteIndex = (quoteIndex + 1 + Math.floor(Math.random() * (sayings.length - 1))) % sayings.length; message(sayings[quoteIndex]); });
$('freeze').addEventListener('click', () => {
  frozen = !frozen; document.body.classList.toggle('frozen', frozen);
  $('freeze').textContent = frozen ? '恢復指針' : '暫停指針'; $('freeze').setAttribute('aria-pressed', String(frozen));
  $('clock-state').textContent = frozen ? '指針暫停，時光仍行。' : '十二刻，皆是當下。';
  $('clock').setAttribute('aria-label', frozen ? '指針已暫停的時盤' : '顯示本地時間的當下時盤');
  message(frozen ? '你可以按住指針，\n卻留不住這一刻。' : sayings[quoteIndex]);
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
message(sayings[0]); tick();
