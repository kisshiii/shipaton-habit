#!/usr/bin/env node
/**
 * push-copy.js が触らない3つを ASC に入れる。提出はしない。
 *   - プライバシーポリシー URL(英日。編集できる appInfo、つまり新しい版を作ったあと)
 *   - 日本語ページのマーケティング URL(特商法のページ。app.json の版)
 *   - サブスク3商品の説明(英日。文面は docs/asc-listing.md「説明(3商品とも同じでよい)」)
 *
 *   node scripts/asc/urls-and-subs.js           # 今の値と、変える先を見るだけ
 *   node scripts/asc/urls-and-subs.js --apply   # 書き換える
 *
 * ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH が要る(push-copy.js と同じ)。
 */
const crypto = require('crypto');
const fs = require('fs');

const APP_ID = '6800968856';
const VERSION = require('../../app.json').expo.version;
const { PRIVACY_URL_VALUE, TOKUSHOHO_URL_VALUE } = readLegal();
const SUB_DESCRIPTION = {
  'en-US': 'More than three sets of words, at your price.',
  ja: '言葉を4つ以上持てます。値段は自分で決めます。',
};
const APPLY = process.argv.includes('--apply');

/* URL はアプリと同じものを使う(src/constants/legal.ts) */
function readLegal() {
  const src = fs.readFileSync(require('path').resolve(__dirname, '..', '..', 'src', 'constants', 'legal.ts'), 'utf8');
  const pick = (name) => {
    const m = src.match(new RegExp(`${name}\\s*=\\s*'([^']+)'`));
    if (!m) throw new Error(`${name} not found in legal.ts`);
    return m[1];
  };
  return { PRIVACY_URL_VALUE: pick('PRIVACY_URL'), TOKUSHOHO_URL_VALUE: pick('TOKUSHOHO_URL') };
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const inp = `${b64({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' })}.${b64({
  iss: process.env.ASC_ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1',
})}`;
const JWT = `${inp}.${crypto
  .sign('sha256', Buffer.from(inp), { key: fs.readFileSync(process.env.ASC_KEY_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' })
  .toString('base64url')}`;
async function api(method, path, body) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${JWT}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 1200)}`);
  return text ? JSON.parse(text) : {};
}
async function patch(type, id, attributes, label, before) {
  const same = Object.entries(attributes).every(([k, v]) => before[k] === v);
  console.log(`  ${label}: ${JSON.stringify(Object.fromEntries(Object.keys(attributes).map((k) => [k, before[k] ?? null])))}`
    + (same ? '  (そのまま)' : `  → ${JSON.stringify(attributes)}`));
  if (!same && APPLY) await api('PATCH', `/v1/${type}/${id}`, { data: { type, id, attributes } });
}

(async () => {
  console.log(APPLY ? '書き換えます' : '見るだけです(--apply で書き換え)');

  // 1. プライバシーポリシー URL(編集できる appInfo)
  const infos = (await api('GET', `/v1/apps/${APP_ID}/appInfos`)).data;
  const editable = infos.find((i) => !['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE'].includes(i.attributes.state || i.attributes.appStoreState));
  if (!editable) console.log('プライバシーポリシー: 編集できる appInfo がない(先に create-version.js で版を作る)');
  else {
    console.log('プライバシーポリシー URL');
    for (const loc of (await api('GET', `/v1/appInfos/${editable.id}/appInfoLocalizations`)).data) {
      await patch('appInfoLocalizations', loc.id, { privacyPolicyUrl: PRIVACY_URL_VALUE }, loc.attributes.locale, loc.attributes);
    }
  }

  // 2. 日本語ページのマーケティング URL
  const versions = (await api('GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[versionString]=${VERSION}&filter[platform]=IOS`)).data;
  if (!versions.length) console.log(`マーケティング URL: ${VERSION} の版がまだない`);
  else {
    console.log(`マーケティング URL(${VERSION}、日本語だけ)`);
    for (const loc of (await api('GET', `/v1/appStoreVersions/${versions[0].id}/appStoreVersionLocalizations`)).data) {
      if (loc.attributes.locale !== 'ja') continue;
      await patch('appStoreVersionLocalizations', loc.id, { marketingUrl: TOKUSHOHO_URL_VALUE }, loc.attributes.locale, loc.attributes);
    }
  }

  // 3. サブスク3商品の説明
  console.log('サブスクの説明');
  for (const group of (await api('GET', `/v1/apps/${APP_ID}/subscriptionGroups`)).data) {
    for (const sub of (await api('GET', `/v1/subscriptionGroups/${group.id}/subscriptions`)).data) {
      for (const loc of (await api('GET', `/v1/subscriptions/${sub.id}/subscriptionLocalizations`)).data) {
        const want = SUB_DESCRIPTION[loc.attributes.locale];
        if (!want) { console.log(`  ${sub.attributes.productId} ${loc.attributes.locale}: 文面が無いので触らない`); continue; }
        if ([...want].length > 45) throw new Error(`${loc.attributes.locale}: 説明が45文字を超える`);
        // ⚠ 公開中(ACTIVE)の説明は API では変えられない(409)。ASC の画面で変える(2026-11-22 に確認)
        if (loc.attributes.state === 'ACTIVE' && loc.attributes.description !== want) {
          console.log(`  ${sub.attributes.productId} ${loc.attributes.locale}: 公開中なので API では変えられない。ASC の画面で「${want}」に変える`);
          continue;
        }
        await patch('subscriptionLocalizations', loc.id, { description: want }, `${sub.attributes.productId} ${loc.attributes.locale}`, loc.attributes);
      }
    }
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
