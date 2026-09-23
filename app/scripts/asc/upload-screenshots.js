#!/usr/bin/env node
/**
 * 1.0.1 のスクリーンショットを差し替える。
 * 01/03/04/05 を新しい画像に置き換え、02(ロック画面の通知)は今のものを残す。英日とも同じ5枚・同じ順。
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const APP_ID = '6800968856';
const VERSION = '1.0.1';
// スクリーンショットの置き場所。引数で渡す: node upload-screenshots.js <dir>
const DIR = process.argv[2] ?? path.resolve(__dirname, '..', '..', '..', 'screenshots');
const NEW = ['01_today.png', '03_words.png', '04_graduation.png', '05_paywall.png'];
const ORDER = ['01_today.png', '02_notification.png', '03_words.png', '04_graduation.png', '05_paywall.png'];

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
  const locs = await api('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);

  for (const loc of locs.data) {
    const locale = loc.attributes.locale;
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
    for (const shot of existing.data) {
      if (NEW.includes(shot.attributes.fileName)) {
        await api('DELETE', `/v1/appScreenshots/${shot.id}`);
        console.log(`  ${locale}: deleted ${shot.attributes.fileName}`);
      }
    }

    for (const name of NEW) {
      const file = path.join(DIR, name);
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
