#!/usr/bin/env node
/**
 * App Store のスクリーンショット(6.7インチ)を、言語ごとに5枚まるごと差し替える。
 *
 *   node upload-screenshots.js <dir> [--version 1.0.3] [--dry-run]
 *
 * <dir> の下に言語ごとのフォルダを置く: en-US は `<dir>/en`、ja は `<dir>/ja`。
 * 1.0.3 の画像は ~/Desktop/katsu-shots-1.0.3/(2026-11-04 に撮り直し。日本語は初めて別の5枚)。
 * ⚠ 1.0.2 までは英日で同じ5枚を上げていた。今は言語ごとに別の画像を上げる。
 * ⚠ --dry-run では何も消さず・上げず、やることだけを出す。
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const APP_ID = '6800968856';
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const VERSION = flag('--version') ?? '1.0.3';
const DRY = argv.includes('--dry-run');
const DIR = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--version');
if (!DIR) {
  console.error('usage: node upload-screenshots.js <dir> [--version 1.0.3] [--dry-run]');
  process.exit(1);
}
/** ASC の言語 → 画像のフォルダ */
const FOLDER = { 'en-US': 'en', ja: 'ja' };
// 1枚目は通知(このアプリが何をするかが一目で分かる)。2026-11-14 に Today と入れ替えた
const ORDER = ['01_notification.png', '02_today.png', '03_words.png', '04_graduation.png', '05_paywall.png'];

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const inp = `${b64({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' })}.${b64({
  iss: process.env.ASC_ISSUER_ID, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1',
})}`;
const JWT = `${inp}.${crypto
  .sign('sha256', Buffer.from(inp), { key: fs.readFileSync(process.env.ASC_KEY_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' })
  .toString('base64url')}`;
async function api(method, p, body) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${p}`, {
    method,
    headers: { Authorization: `Bearer ${JWT}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

(async () => {
  const versions = await api('GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[versionString]=${VERSION}&filter[platform]=IOS`);
  const version = versions.data[0];
  if (!version) throw new Error(`version ${VERSION} is not in App Store Connect yet. Create it first (create-version.js)`);
  const locs = await api('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);

  for (const loc of locs.data) {
    const locale = loc.attributes.locale;
    const folder = FOLDER[locale];
    if (!folder) {
      console.log(`  ${locale}: no folder mapped, skipped`);
      continue;
    }
    const files = ORDER.map((name) => path.join(DIR, folder, name));
    const missing = files.filter((f) => !fs.existsSync(f));
    if (missing.length) throw new Error(`${locale}: missing ${missing.join(', ')}`);
    if (DRY) {
      console.log(`  ${locale}: would replace all screenshots with ${files.join(', ')}`);
      continue;
    }
    const sets = await api('GET', `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`);
    let set = sets.data.find((s) => s.attributes.screenshotDisplayType === 'APP_IPHONE_67');
    if (!set) {
      set = (
        await api('POST', '/v1/appScreenshotSets', {
          data: {
            type: 'appScreenshotSets',
            attributes: { screenshotDisplayType: 'APP_IPHONE_67' },
            relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: loc.id } } },
          },
        })
      ).data;
    }

    const existing = await api('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots?limit=20`);
    // 言語ごとに5枚まるごと入れ替える(古い文章の画像を残さない)
    for (const shot of existing.data) {
      await api('DELETE', `/v1/appScreenshots/${shot.id}`);
      console.log(`  ${locale}: deleted ${shot.attributes.fileName}`);
    }

    for (const name of ORDER) {
      const file = path.join(DIR, folder, name);
      const bytes = fs.readFileSync(file);
      const created = await api('POST', '/v1/appScreenshots', {
        data: {
          type: 'appScreenshots',
          attributes: { fileSize: bytes.length, fileName: name },
          relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } },
        },
      });
      for (const op of created.data.attributes.uploadOperations) {
        const headers = Object.fromEntries((op.requestHeaders ?? []).map((h) => [h.name, h.value]));
        const r = await fetch(op.url, { method: op.method, headers, body: bytes.subarray(op.offset, op.offset + op.length) });
        if (!r.ok) throw new Error(`upload ${name} -> ${r.status}`);
      }
      await api('PATCH', `/v1/appScreenshots/${created.data.id}`, {
        data: {
          type: 'appScreenshots',
          id: created.data.id,
          attributes: { uploaded: true, sourceFileChecksum: crypto.createHash('md5').update(bytes).digest('hex') },
        },
      });
      console.log(`  ${locale}: uploaded ${name} (${(bytes.length / 1024).toFixed(0)} KB)`);
    }

    // 並び順を 01..05 に直す
    const after = await api('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots?limit=20`);
    const byName = Object.fromEntries(after.data.map((s) => [s.attributes.fileName, s.id]));
    const ids = ORDER.filter((n) => byName[n]).map((n) => ({ type: 'appScreenshots', id: byName[n] }));
    await api('PATCH', `/v1/appScreenshotSets/${set.id}/relationships/appScreenshots`, { data: ids });
    console.log(`  ${locale}: ordered ${ORDER.filter((n) => byName[n]).join(', ')}`);
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
