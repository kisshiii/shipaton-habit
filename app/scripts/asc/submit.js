#!/usr/bin/env node
/**
 * 1.0.1 を審査に出す。`--check` だけなら状態を見るだけで何もしない。
 * ⚠ サブスクは 1.0 で承認済みなので、提出項目はアプリのバージョン1件でよい。
 */
const crypto = require('crypto');
const fs = require('fs');

const APP_ID = '6800968856';
const VERSION = '1.0.1';
const CHECK_ONLY = process.argv.includes('--check');

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
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

(async () => {
  const versions = await api('GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[versionString]=${VERSION}&filter[platform]=IOS&include=build`);
  const version = versions.data[0];
  const build = versions.included?.find((i) => i.type === 'builds');
  console.log(`version ${VERSION}: ${version.attributes.appStoreState} / build ${build?.attributes?.version ?? '(なし)'}`);

  const locs = await api('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
  for (const loc of locs.data) {
    const sets = await api('GET', `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets?include=appScreenshots`);
    const counts = sets.data.map((s) => `${s.attributes.screenshotDisplayType}:${(s.relationships.appScreenshots.data ?? []).length}`);
    console.log(`  ${loc.attributes.locale}: ${counts.join(' ')} / whatsNew ${loc.attributes.whatsNew ? 'あり' : 'なし'}`);
  }

  const open = await api('GET', `/v1/apps/${APP_ID}/reviewSubmissions?filter[state]=READY_FOR_REVIEW,WAITING_FOR_REVIEW,IN_REVIEW,UNRESOLVED_ISSUES`);
  for (const s of open.data) console.log(`  進行中の提出: ${s.id} ${s.attributes.state}`);

  if (CHECK_ONLY) return;

  let submission = open.data.find((s) => s.attributes.state === 'READY_FOR_REVIEW');
  if (!submission) {
    submission = (
      await api('POST', '/v1/reviewSubmissions', {
        data: {
          type: 'reviewSubmissions',
          attributes: { platform: 'IOS' },
          relationships: { app: { data: { type: 'apps', id: APP_ID } } },
        },
      })
    ).data;
    console.log(`created review submission ${submission.id}`);
  }

  const items = await api('GET', `/v1/reviewSubmissions/${submission.id}/items`);
  if (!items.data.length) {
    await api('POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: submission.id } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } },
        },
      },
    });
    console.log('added the app version to the submission');
  }

  const submitted = await api('PATCH', `/v1/reviewSubmissions/${submission.id}`, {
    data: { type: 'reviewSubmissions', id: submission.id, attributes: { submitted: true } },
  });
  console.log(`submitted: ${submitted.data.attributes.state}`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
