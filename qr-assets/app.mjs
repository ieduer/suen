import { encode, svgFor, canvasFor, splitBatch } from './qr.mjs';
import { b64dec, extractUrisFromText, parseSingBox, makeShadowrocketSub, makeSRInstall, makeAggregateSubFromNodes, makeClashInstall, makePlainTextBundleFromNodes, buildClashMetaYaml } from './subscription.mjs';

const $ = id => document.getElementById(id);
let mode = 'single', results = [], selected = 0, reading = false;
const examples = { url: 'https://example.com', email: 'mailto:hello@example.com?subject=你好', tel: 'tel:+861012345678', text: '把連結，帶到眼前。' };
const labels = { single: ['連結或文字', '原樣編碼，不打開連結，不儲存輸入內容。'], batch: ['每行一個連結或文字', '最多 40 行。空白行略過，其餘內容原樣編碼。'], subscription: ['訂閱網址、節點或設定', '可貼上節點列表、Base64 訂閱內容或 sing-box JSON。'] };

function notice(message) { $('notice').textContent = message; }
function resetResults() { results = []; $('result').hidden = true; $('placeholder').hidden = false; $('result-count').textContent = '等待生成'; $('qr-image').replaceChildren(); $('batch-list').replaceChildren(); }
function countBytes() { $('byte-count').textContent = `${new TextEncoder().encode($('input').value).length.toLocaleString()} 位元組`; }
function edited() { resetResults(); countBytes(); notice(''); $('input').removeAttribute('aria-invalid'); }

document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  $('input-label').textContent = labels[mode][0]; $('input-help').textContent = labels[mode][1];
  $('subscription-options').hidden = mode !== 'subscription'; $('examples').hidden = mode !== 'single';
  edited();
}));
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => { $('input').value = examples[button.dataset.example]; edited(); $('input').focus(); }));
$('input').addEventListener('input', edited);
$('ecc').addEventListener('change', edited);
$('format').addEventListener('change', edited);
$('clear').addEventListener('click', () => { $('input').value = ''; edited(); $('input').focus(); });

function subscriptionItems(value) {
  const raw = value.trim();
  const url = /^https?:\/\/\S+$/i.test(raw) ? raw : '';
  const format = $('format').value;
  if (url) {
    if (format === 'shadowrocket') return [makeShadowrocketSub(url)];
    if (format === 'sr-install') return [makeSRInstall(url)];
    if (format === 'clash') return [makeClashInstall(url)];
    return [url];
  }
  if (format === 'clash') throw new Error('Clash 匯入需要一個 HTTP 或 HTTPS 訂閱網址。');
  let nodes;
  if (raw.startsWith('{') || raw.startsWith('[')) {
    let json;
    try { json = JSON.parse(raw); } catch { throw new Error('JSON 格式有誤，請檢查後再試。'); }
    nodes = parseSingBox(json).uris;
  } else {
    nodes = extractUrisFromText(raw);
    if (!nodes.length) {
      try { nodes = extractUrisFromText(b64dec(raw)); } catch { /* Report the same actionable parse error below. */ }
    }
  }
  if (!nodes?.length) throw new Error('沒有找到支援的節點。一般連結或文字請使用「單個內容」。');
  if (nodes.length > 40) throw new Error('一次最多處理 40 個節點，請分批貼上。');
  if (format === 'shadowrocket' || format === 'sr-install') throw new Error('Shadowrocket 訂閱需要訂閱網址；節點可選「原始連結」逐個掃描。');
  if (format === 'aggregate') return [makeAggregateSubFromNodes(nodes)];
  return format === 'bundle' ? [makePlainTextBundleFromNodes(nodes)] : nodes;
}

$('generator').addEventListener('submit', async event => {
  event.preventDefault();
  const value = $('input').value;
  resetResults();
  try {
    const items = mode === 'batch' ? splitBatch(value) : mode === 'subscription' ? subscriptionItems(value) : [value];
    if (!items.length || !value.trim()) throw new Error('請先輸入內容。');
    // Yield between codes so a batch does not block interaction on slower phones.
    const button = document.querySelector('.primary'); button.disabled = true;
    const level = $('ecc').value, inputSnapshot = value, modeSnapshot = mode, formatSnapshot = $('format').value;
    const generated = [];
    try {
      for (const [index, text] of items.entries()) {
        try { generated.push({ text, qr: encode(text, level) }); }
        catch (error) { throw new Error(`第 ${index + 1} 項：${error.message}`); }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } finally { button.disabled = false; }
    if ($('input').value !== inputSnapshot || mode !== modeSnapshot || $('ecc').value !== level || $('format').value !== formatSnapshot) { notice('內容已變更，請重新生成。'); return; }
    results = generated; selected = 0;
    $('placeholder').hidden = true; $('result').hidden = false;
    $('result-count').textContent = `${results.length} 個二維碼`;
    renderList(); showSelected();
    $('input').removeAttribute('aria-invalid');
    notice(`已生成 ${results.length} 個二維碼。${results.length > 1 ? '選擇下方項目即可預覽及下載。' : ''}`);
  } catch (error) { notice(error.message); $('input').setAttribute('aria-invalid', 'true'); }
});

function renderList() {
  $('batch-list').replaceChildren(); $('batch-list').hidden = results.length < 2;
  results.forEach((item, index) => {
    const row = document.createElement('li'), button = document.createElement('button');
    button.type = 'button'; button.setAttribute('aria-current', String(index === selected));
    const number = document.createElement('span'); number.className = 'item-number'; number.textContent = String(index + 1).padStart(2, '0');
    const label = document.createElement('span'); label.className = 'item-text'; label.textContent = item.text;
    button.append(number, label); button.addEventListener('click', () => { selected = index; showSelected(); }); row.append(button); $('batch-list').append(row);
  });
}
function showSelected() {
  const item = results[selected];
  // SVG is produced entirely from integer module coordinates, never from input text.
  $('qr-image').innerHTML = svgFor(item.qr);
  $('qr-image').setAttribute('role', 'img'); $('qr-image').setAttribute('aria-label', `第 ${selected + 1} 個二維碼`);
  $('result-label').textContent = item.text;
  [...$('batch-list').querySelectorAll('button')].forEach((b, i) => b.setAttribute('aria-current', String(i === selected)));
}
function download(blob, extension, index = selected) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = `sub2qr-${String(index + 1).padStart(2, '0')}.${extension}`;
  document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
$('download-svg').addEventListener('click', () => { if (results[selected]) download(new Blob([svgFor(results[selected].qr)], { type: 'image/svg+xml' }), 'svg'); });
$('download-png').addEventListener('click', () => {
  const index = selected, item = results[index]; if (!item) return;
  canvasFor(item.qr).toBlob(blob => { if (blob) download(blob, 'png', index); else notice('PNG 下載失敗，請改用 SVG。'); }, 'image/png');
});
$('download-list').addEventListener('click', () => { if (results.length) download(new Blob([results.map(item => item.text).join('\n')], { type:'text/plain;charset=utf-8' }), 'txt'); });
$('copy-content').addEventListener('click', async () => {
  if (!results[selected]) return;
  try { await navigator.clipboard.writeText(results[selected].text); notice('已複製原始內容。'); }
  catch { notice('瀏覽器未允許複製，請選取預覽下方文字手動複製。'); }
});
$('clash-yaml').addEventListener('click', () => {
  const url = $('input').value.trim();
  if (!/^https?:\/\/\S+$/i.test(url)) { notice('請輸入一個 HTTP 或 HTTPS 訂閱網址。'); return; }
  download(new Blob([buildClashMetaYaml(url)], { type: 'text/yaml;charset=utf-8' }), 'yaml');
});
$('load-subscription').addEventListener('click', async () => {
  if (reading) return;
  const raw = $('input').value.trim();
  if (!/^https?:\/\/\S+$/i.test(raw)) { notice('請先輸入一個 HTTP 或 HTTPS 訂閱網址。'); return; }
  reading = true; $('load-subscription').disabled = true; notice('正在讀取訂閱…');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(raw, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
    if (!response.ok) throw new Error(`網站回應 ${response.status}。`);
    const reader = response.body.getReader(); let size = 0; const chunks = [];
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 1024 * 1024) { await reader.cancel(); throw new Error('訂閱大於 1 MB，請改為貼上所需節點。'); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    if ($('input').value.trim() !== raw || mode !== 'subscription') { notice('輸入已變更，讀取結果未覆蓋你的內容。'); return; }
    $('input').value = new TextDecoder().decode(bytes); $('format').value = 'original'; edited(); notice('已讀取。請檢查內容，再按「生成二維碼」。');
  } catch (error) { notice(`讀取失敗：${error.name === 'AbortError' ? '等待超時。' : error.message} 可直接貼上訂閱內容；網站也可能不允許跨來源讀取。`); }
  finally { clearTimeout(timer); reading = false; $('load-subscription').disabled = false; }
});

// Enable submission only after the module and all event handlers are ready.
const generateButton = document.querySelector('.primary');
generateButton.innerHTML = '生成二維碼 <span aria-hidden="true">↗</span>';
generateButton.disabled = false;
