#!/usr/bin/env node
/**
 * 年始のフィーチャーの推薦(Featuring Nomination)を ASC に**下書き**で作る(同じ名前の下書きがあれば更新する)。
 * 文言は docs/asc-listing.md「フィーチャーの推薦」から読む。**提出(submitted: true)はしない。**
 * App 内イベントは承認されてから ASC の画面で添付する(紐付けられるのは承認済みのイベントだけ)。
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const APP_ID = '6800968856';
const LISTING = path.resolve(__dirname, '..', '..', '..', 'docs', 'asc-listing.md');
// 載せてほしい時期: 2026-12-26 〜 2027-01-10(日本時間の日付で区切る)
const PUBLISH_START = '2026-12-25T15:00:00Z';
const PUBLISH_END = '2027-01-10T14:59:59Z';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const inp = `${b64({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' })}.${b64({
  iss: process.env.ASC_ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1',
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
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${text.slice(0, 1500)}`);
  return text ? JSON.parse(text) : {};
}

// --- 文言 ---
const md = fs.readFileSync(LISTING, 'utf8');
const section = md.slice(md.indexOf('### フィーチャーの推薦'));
const block = (heading) => {
  const rest = section.slice(section.indexOf(heading) + heading.length);
  const m = rest.match(/```\n([\s\S]*?)\n```/);
  if (!m) throw new Error(`not found after ${heading}`);
  // md では80字前後で折り返してある。段落の中の改行は空白に戻す
  return m[1].trim().split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ')).join('\n\n');
};
const name = section.match(/\*\*名前:\*\* `([^`]+)`/)[1];
const description = block('**説明(英語。編集部は英語で読む):**');
const notes = block('**補足(Helpful details):**');
const len = (s) => [...s].length;
if (len(name) > 60 || len(description) > 1000 || len(notes) > 500) {
  throw new Error(`too long: name ${len(name)} / description ${len(description)} / notes ${len(notes)}`);
}

async function availableTerritories() {
  const ids = [];
  let next = `/v2/appAvailabilities/${APP_ID}/territoryAvailabilities?limit=200&include=territory`;
  while (next) {
    const res = await api('GET', next);
    for (const t of res.data) {
      if (t.attributes.available && t.attributes.contentStatuses?.includes('AVAILABLE')) ids.push(t.relationships.territory.data.id);
    }
    next = res.links?.next?.replace('https://api.appstoreconnect.apple.com', '');
  }
  return ids;
}

(async () => {
  const territories = await availableTerritories();
  console.log(`territories: ${territories.length}`);

  const attributes = {
    name,
    type: 'APP_ENHANCEMENTS',
    description,
    notes,
    submitted: false,
    publishStartDate: PUBLISH_START,
    publishEndDate: PUBLISH_END,
    // iPhone のみ(supportsTablet: false)
    deviceFamilies: ['IPHONE'],
    locales: ['en-US', 'ja'],
    hasInAppEvents: false,
    launchInSelectMarketsFirst: false,
    preOrderEnabled: false,
  };
  const relationships = {
    relatedApps: { data: [{ type: 'apps', id: APP_ID }] },
    supportedTerritories: { data: territories.map((id) => ({ type: 'territories', id })) },
  };

  // 提出済みに同じ名前があれば触らない。下書きにあれば更新
  const submitted = (await api('GET', '/v1/nominations?filter[state]=SUBMITTED&limit=200')).data;
  if (submitted.some((n) => n.attributes.name === name)) throw new Error(`"${name}" is already submitted; not editing`);
  const drafts = (await api('GET', '/v1/nominations?filter[state]=DRAFT&limit=200')).data;
  const found = drafts.find((n) => n.attributes.name === name);
  // ⚠ 全部の項目を1回の POST で送ると 500 が返る(2026-10-30。項目は1つずつなら全部通る)。
  //   最小の項目で作ってから、残りを PATCH で足す。PATCH には毎回 submitted を付ける(無いと 400)
  let id = found?.id;
  if (!id) {
    const created = (await api('POST', '/v1/nominations', {
      data: {
        type: 'nominations',
        attributes: { name, type: attributes.type, description, submitted: false, publishStartDate: PUBLISH_START },
        relationships: { relatedApps: relationships.relatedApps },
      },
    })).data;
    id = created.id;
    console.log(`nomination created ${id}`);
  }
  const nomination = (await api('PATCH', `/v1/nominations/${id}`, {
    data: { type: 'nominations', id, attributes, relationships },
  })).data;
  console.log(`nomination updated ${nomination.id}`);
  console.log(`  "${name}" / description ${len(description)} / notes ${len(notes)} / state ${nomination.attributes.state ?? '-'}`);
  console.log('done. not submitted.');
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
