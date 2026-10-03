import test from 'node:test';
import assert from 'node:assert/strict';
import { encode, svgFor, canvasFor, splitBatch } from '../qr-assets/qr.mjs';
import { parseSingBox, makeShadowrocketSub, makeClashInstall, b64dec, buildClashMetaYaml } from '../qr-assets/subscription.mjs';

test('universal schemes and UTF-8 produce valid-sized symbols with a four-module quiet zone', () => {
  for (const text of ['https://example.com/中文?a=1&b=2#片段', 'mailto:hello@example.com', 'tel:+8610', 'sms:+8610?body=你好', 'geo:39.9,116.4', 'magnet:?xt=urn:btih:abc', 'app://open/a', '文字\n第二行']) {
    const qr = encode(text);
    assert(qr.size >= 21 && qr.size <= 177 && (qr.size - 21) % 4 === 0);
    assert(svgFor(qr).includes(`viewBox="0 0 ${qr.size + 8} ${qr.size + 8}"`));
    assert(!svgFor(qr).includes(text));
    const draws = [], ctx = { fillRect: (...args) => draws.push(args) }, canvas = { getContext: () => ctx };
    canvasFor(qr, { createElement: () => canvas });
    const scale = canvas.width / (qr.size + 8);
    for (const [x, y, w, h] of draws.slice(1)) { assert(x >= 4 * scale && y >= 4 * scale); assert(x + w <= canvas.width - 4 * scale && y + h <= canvas.height - 4 * scale); }
  }
});
test('capacity errors never truncate and batch splitting preserves nonempty content', () => {
  assert.throws(() => encode(''), /輸入/);
  assert.throws(() => encode('漢'.repeat(1000)), /容量/);
  assert.throws(() => splitBatch(Array(41).fill('x').join('\n')), /40/);
  assert.deepEqual(splitBatch('  A \r\n\nB\rC'), ['  A ', 'B', 'C']);
  for (const level of ['L', 'M', 'Q', 'H']) assert(encode('hello', level).size > 0);
});
test('subscription import helpers preserve URL query and fragment bytes', () => {
  const url = 'https://example.com/sub?a=1&b=%2F#name';
  assert.equal(b64dec(makeShadowrocketSub(url).slice(6)), url);
  assert.equal(decodeURIComponent(makeClashInstall(url).split('url=')[1]), url);
  assert(buildClashMetaYaml(url).includes(`url: ${JSON.stringify(url)}`));
});
test('existing four sing-box conversion families remain available', () => {
  for (const type of ['vmess', 'vless', 'hysteria2', 'tuic']) {
    const data = { outbounds: [{ type, tag: 'test', server: 'example.com', server_port: 443, uuid: 'test-uuid', password: 'test-password', tls: { enabled: true, reality: { public_key: 'test-public-key' } }, transport: { type: 'ws' } }] };
    const output = parseSingBox(data); assert.equal(output.uris.length, 1);
    assert(output.uris[0].startsWith(type === 'hysteria2' ? 'hysteria2://' : `${type}://`));
  }
});
