#!/usr/bin/env node
/** docs/asc-listing.md の 1.0.1 版を ASC に流し込む(説明文・プロモ・キーワード・新機能・サブタイトル・審査ノート)。提出はしない。 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const APP_ID = '6800968856';
const VERSION = '1.0.1';
const LISTING = path.resolve(__dirname, '..', '..', '..', 'docs', 'asc-listing.md');

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
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

const md = fs.readFileSync(LISTING, 'utf8');
const after = (heading, re) => {
  const rest = md.slice(md.indexOf(heading) + heading.length);
  const m = rest.match(re);
  if (!m) throw new Error(`not found after ${heading}`);
  return m[1].trim();
};
const CODE = /```\n([\s\S]*?)\n```/;
const names = [...md.matchAll(/\| App Name \(30\) \| `([^`]+)`/g)].map((m) => m[1]);
const subtitles = [...md.matchAll(/\| Subtitle \(30\) \| `([^`]+)`/g)].map((m) => m[1]);
const whatsNew = [...md.slice(md.indexOf('## 1.0.1 の「このバージョンの新機能」')).matchAll(/```\n([\s\S]*?)\n```/g)].map((m) => m[1].trim());

const copy = {
  'en-US': {
    name: names[0],
    subtitle: subtitles[0],
    promotionalText: after('## Promotional Text (170)', CODE),
    keywords: after('## Keywords (100, カンマ区切り・スペースなし)', CODE),
    description: after('## Description', CODE),
    whatsNew: whatsNew[0],
  },
  ja: {
    name: names[1].replace(/(公開中の名前)/, '').trim(),
    subtitle: subtitles[1],
    promotionalText: after('### Promotional Text (170)', CODE),
    keywords: after('### Keywords (100, カンマ区切り・スペースなし)', CODE),
    description: after('### Description', CODE),
    whatsNew: whatsNew[1],
  },
};
const reviewNotes = after('## Review Notes(審査ノート)', CODE);

for (const [locale, c] of Object.entries(copy)) {
  if (c.name.length > 30 || c.subtitle.length > 30) throw new Error(`${locale}: name/subtitle too long`);
  if (c.promotionalText.length > 170 || c.keywords.length > 100) throw new Error(`${locale}: promo/keywords too long`);
  if (!c.description.includes('66')) throw new Error(`${locale}: description does not mention 66`);
}

(async () => {
  const versions = await api('GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[versionString]=${VERSION}&filter[platform]=IOS`);
  const version = versions.data[0];
  if (!version) throw new Error('version 1.0.1 not found');
  console.log(`version ${VERSION} (${version.attributes.appStoreState})`);

  // 説明文・プロモ・キーワード・新機能
  const locs = await api('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
  for (const loc of locs.data) {
    const c = copy[loc.attributes.locale];
    if (!c) continue;
    await api('PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
      data: {
        type: 'appStoreVersionLocalizations',
        id: loc.id,
        attributes: {
          description: c.description,
          keywords: c.keywords,
          promotionalText: c.promotionalText,
          whatsNew: c.whatsNew,
        },
      },
    });
    console.log(`  ${loc.attributes.locale}: description ${c.description.length} / keywords ${c.keywords.length} / promo ${c.promotionalText.length} / whatsNew ${c.whatsNew.length}`);
  }

  // 名前・サブタイトル(app info 側。編集可能な appInfo を選ぶ)
  const infos = await api('GET', `/v1/apps/${APP_ID}/appInfos`);
  const editable = infos.data.find((i) => i.attributes.appStoreState !== 'READY_FOR_SALE') ?? infos.data[0];
  const infoLocs = await api('GET', `/v1/appInfos/${editable.id}/appInfoLocalizations`);
  for (const loc of infoLocs.data) {
    const c = copy[loc.attributes.locale];
    if (!c) continue;
    await api('PATCH', `/v1/appInfoLocalizations/${loc.id}`, {
      data: { type: 'appInfoLocalizations', id: loc.id, attributes: { name: c.name, subtitle: c.subtitle } },
    });
    console.log(`  ${loc.attributes.locale}: name "${c.name}" / subtitle "${c.subtitle}"`);
  }

  // 審査ノート
  const detail = await api('GET', `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`);
  if (detail.data?.id) {
    await api('PATCH', `/v1/appStoreReviewDetails/${detail.data.id}`, {
      data: { type: 'appStoreReviewDetails', id: detail.data.id, attributes: { notes: reviewNotes } },
    });
  } else {
    await api('POST', '/v1/appStoreReviewDetails', {
      data: {
        type: 'appStoreReviewDetails',
        attributes: { notes: reviewNotes },
        relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } },
      },
    });
  }
  console.log(`  review notes: ${reviewNotes.length} chars`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
