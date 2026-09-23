#!/usr/bin/env node
/**
 * 1.0.1 を用意する: バージョン作成(既にあれば再利用)→ ビルド19を紐づけ →
 * 英日の説明文・新機能・プロモーションテキストを docs/asc-listing.md から入れる。
 * 審査には出さない。
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const APP_ID = '6800968856';
const VERSION = '1.0.1';
const BUILD = '19';
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
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

const listing = fs.readFileSync(LISTING, 'utf8');
const block = (re) => {
  const m = listing.match(re);
  if (!m) throw new Error(`not found: ${re}`);
  return m[1].trim();
};
const copy = {
  'en-US': {
    description: block(/## Description\n\n```\n([\s\S]*?)\n```/),
    promotionalText: block(/## Promotional Text \(170\)\n\n```\n([\s\S]*?)\n```/),
  },
  ja: {
    description: block(/### Description\n\n```\n([\s\S]*?)\n```/),
    promotionalText: block(/### Promotional Text \(170\)\n\n```\n([\s\S]*?)\n```/),
  },
};
const whatsNew = [...listing.split('## 1.0.1 の「このバージョンの新機能」')[1].matchAll(/```\n([\s\S]*?)\n```/g)].map((m) => m[1].trim());
copy['en-US'].whatsNew = whatsNew[0];
copy.ja.whatsNew = whatsNew[1];
if (!copy['en-US'].description.includes('66 days') || !copy.ja.description.includes('66日')) {
  throw new Error('description does not look like the 1.0.1 draft');
}

(async () => {
  const builds = await api('GET', `/v1/builds?filter[app]=${APP_ID}&filter[version]=${BUILD}&fields[builds]=version,processingState,usesNonExemptEncryption`);
  const build = builds.data[0];
  console.log(`build ${BUILD}: ${build.attributes.processingState} encryption=${build.attributes.usesNonExemptEncryption}`);

  const versions = await api('GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[versionString]=${VERSION}&filter[platform]=IOS`);
  let version = versions.data[0];
  if (!version) {
    version = (
      await api('POST', '/v1/appStoreVersions', {
        data: {
          type: 'appStoreVersions',
          attributes: { platform: 'IOS', versionString: VERSION },
          relationships: {
            app: { data: { type: 'apps', id: APP_ID } },
            build: { data: { type: 'builds', id: build.id } },
          },
        },
      })
    ).data;
    console.log(`created version ${VERSION} (${version.attributes.appStoreState})`);
  } else {
    await api('PATCH', `/v1/appStoreVersions/${version.id}/relationships/build`, {
      data: { type: 'builds', id: build.id },
    });
    console.log(`version ${VERSION} exists (${version.attributes.appStoreState}); build ${BUILD} attached`);
  }

  const locs = await api('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
  for (const loc of locs.data) {
    const text = copy[loc.attributes.locale];
    if (!text) {
      console.log(`  skip ${loc.attributes.locale}`);
      continue;
    }
    await api('PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
      data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes: text },
    });
    console.log(`  ${loc.attributes.locale}: description ${text.description.length} / promo ${text.promotionalText.length} / whatsNew ${text.whatsNew.length} chars`);
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
