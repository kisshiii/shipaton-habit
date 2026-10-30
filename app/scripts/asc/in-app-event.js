#!/usr/bin/env node
/**
 * 年始の App 内イベント「1月1日から、66日」を ASC に下書きで作る(すでにあれば更新する)。
 * 文言は docs/asc-listing.md「1.0.3(年始)向け」の表から読む。画像は App Asset Library(API 4.5.1 の新方式)で上げて配置する。
 * **審査には出さない。**出すのは ASC の画面か、別のスクリプトで本人がやる。
 *
 * 使い方: node in-app-event.js [画像のディレクトリ](省略時 ~/Desktop/katsu-event)
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const APP_ID = '6800968856';
const REFERENCE_NAME = 'newyear-2027-66days';
const LISTING = path.resolve(__dirname, '..', '..', '..', 'docs', 'asc-listing.md');
const IMG_DIR = process.argv[2] ?? path.join(os.homedir(), 'Desktop', 'katsu-event');

// 日時(UTC)。開始は日本の1月1日 0:00。公開は開始の14日前まで、期間は31日までという Apple の決まりに収める
const PUBLISH_START = '2026-12-18T15:00:00Z';
const EVENT_START = '2026-12-31T15:00:00Z';
const EVENT_END = '2027-01-31T14:59:00Z';

// トークンは20分で切れる。画像の処理待ちが長引いても困らないよう、15分たったら作り直す
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
let JWT;
let jwtAt = 0;
function token() {
  const now = Math.floor(Date.now() / 1000);
  if (JWT && now - jwtAt < 900) return JWT;
  const inp = `${b64({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' })}.${b64({
    iss: process.env.ASC_ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1',
  })}`;
  JWT = `${inp}.${crypto
    .sign('sha256', Buffer.from(inp), { key: fs.readFileSync(process.env.ASC_KEY_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' })
    .toString('base64url')}`;
  jwtAt = now;
  return JWT;
}
async function api(method, p, body) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${p}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${text.slice(0, 1500)}`);
  return text ? JSON.parse(text) : {};
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// --- 文言(asc-listing.md の表から) ---
const md = fs.readFileSync(LISTING, 'utf8');
const section = md.slice(md.indexOf('### App 内イベント'), md.indexOf('### フィーチャーの推薦'));
const row = (label) => {
  const m = section.match(new RegExp(`^\\| ${label} \\| \`([^\`]+)\`[^|]*\\| \`([^\`]+)\``, 'm'));
  if (!m) throw new Error(`row not found: ${label}`);
  return { 'en-US': m[1], ja: m[2] };
};
const names = row('名前');
const shorts = row('短い説明');
const longs = row('長い説明');
const copy = Object.fromEntries(
  ['en-US', 'ja'].map((l) => [l, { name: names[l], shortDescription: shorts[l], longDescription: longs[l] }]),
);
const len = (s) => [...s].length;
for (const [locale, c] of Object.entries(copy)) {
  if (len(c.name) > 30 || len(c.shortDescription) > 50 || len(c.longDescription) > 120) {
    throw new Error(`${locale}: too long (${len(c.name)}/${len(c.shortDescription)}/${len(c.longDescription)})`);
  }
}

// ロケールごとの画像。枠(placementType)ごとに1枚
const IMAGES = {
  'en-US': { EVENT_CARD_ASSET: 'event-card-en.png', EVENT_DETAILS_PAGE_ASSET: 'event-detail-en.png' },
  ja: { EVENT_CARD_ASSET: 'event-card-ja.png', EVENT_DETAILS_PAGE_ASSET: 'event-detail-ja.png' },
};

// 配信中の国を全部。イベントの territorySchedules には「全部」の指定が無いので、国の ID を並べる
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

// 画像を1枚ライブラリに上げ、配置できる状態(PREPARE_FOR_SUBMISSION)まで待つ。同じ名前で上げ済みならそれを使う
async function uploadImage(libraryId, existing, placementType, refData) {
  const file = path.join(IMG_DIR, IMAGES[placementType.locale][placementType.type]);
  const fileName = path.basename(file);
  const bytes = fs.readFileSync(file);
  let img = existing.find((i) => i.attributes.fileName === fileName && i.attributes.state !== 'FAILED');
  if (img) {
    console.log(`    ${fileName}: reuse ${img.id} (${img.attributes.state})`);
  } else {
    const res = await api('POST', '/v1/appAssetLibraryImages', {
      data: {
        type: 'appAssetLibraryImages',
        attributes: { fileName, fileSize: bytes.length, category: 'CREATIVE_ASSETS' },
        relationships: { assetLibrary: { data: { type: 'appAssetLibraries', id: libraryId } } },
      },
    });
    img = res.data;
    for (const op of img.attributes.uploadOperations ?? []) {
      const headers = Object.fromEntries((op.requestHeaders ?? []).map((h) => [h.name, h.value]));
      // アップロード先の URL 自体が期限付きの認証なので、JWT は付けない
      const r = await fetch(op.url, { method: op.method, headers, body: bytes.subarray(op.offset, op.offset + op.length) });
      if (!r.ok) throw new Error(`upload ${fileName} -> ${r.status} ${(await r.text()).slice(0, 500)}`);
    }
    await api('PATCH', `/v1/appAssetLibraryImages/${img.id}`, {
      data: { type: 'appAssetLibraryImages', id: img.id, attributes: { uploaded: true } },
    });
    console.log(`    ${fileName}: uploaded ${img.id} (${bytes.length} bytes)`);
  }
  // 処理待ち。最大10分。遅いだけなら消さずに知らせて終わる(次に実行したとき続きから使う)
  const deadline = Date.now() + 10 * 60 * 1000;
  for (;;) {
    const cur = (await api('GET', `/v1/appAssetLibraryImages/${img.id}`)).data;
    const { state, stateDetails, specId } = cur.attributes;
    if (state === 'PREPARE_FOR_SUBMISSION' || state === 'APPROVED' || state === 'READY_FOR_REVIEW') {
      const allowed = refData.placementTypes
        .find((p) => p.placementTypeId === placementType.type)
        ?.specMappings.flatMap((m) => m.specs) ?? [];
      if (specId && !allowed.includes(specId)) throw new Error(`${fileName}: specId ${specId} does not fit ${placementType.type}`);
      console.log(`    ${fileName}: ${state} spec ${specId ?? '-'}`);
      return cur;
    }
    if (state === 'FAILED') throw new Error(`${fileName}: FAILED ${JSON.stringify(stateDetails)}`);
    if (Date.now() > deadline) {
      console.log(`    ${fileName}: still ${state} after 10 min, not placed. Run again later.`);
      return null;
    }
    await sleep(10000);
  }
}

(async () => {
  const territories = await availableTerritories();
  console.log(`territories: ${territories.length}`);

  const attributes = {
    referenceName: REFERENCE_NAME,
    badge: 'CHALLENGE',
    purpose: 'ATTRACT_NEW_USERS',
    priority: 'NORMAL',
    purchaseRequirement: 'NO_COST_ASSOCIATED',
    // 該当する言語が無い国では英語を出す(アプリの主言語は ja だが、目標は英語圏と日本)
    primaryLocale: 'en-US',
    territorySchedules: [{ territories, publishStart: PUBLISH_START, eventStart: EVENT_START, eventEnd: EVENT_END }],
  };

  // 同じ参照名があれば更新、無ければ作る
  const events = await api('GET', `/v1/apps/${APP_ID}/appEvents?limit=200`);
  let event = events.data.find((e) => e.attributes.referenceName === REFERENCE_NAME);
  if (event) {
    if (event.attributes.eventState !== 'DRAFT' && event.attributes.eventState !== 'REJECTED') {
      throw new Error(`event ${event.id} is ${event.attributes.eventState}; not editing`);
    }
    event = (await api('PATCH', `/v1/appEvents/${event.id}`, { data: { type: 'appEvents', id: event.id, attributes } })).data;
    console.log(`event updated ${event.id} (${event.attributes.eventState})`);
  } else {
    event = (await api('POST', '/v1/appEvents', {
      data: { type: 'appEvents', attributes, relationships: { app: { data: { type: 'apps', id: APP_ID } } } },
    })).data;
    console.log(`event created ${event.id} (${event.attributes.eventState})`);
  }

  // ローカライズ
  const locs = (await api('GET', `/v1/appEvents/${event.id}/localizations`)).data;
  const locIds = {};
  for (const [locale, c] of Object.entries(copy)) {
    const found = locs.find((l) => l.attributes.locale === locale);
    if (found) {
      await api('PATCH', `/v1/appEventLocalizations/${found.id}`, {
        data: { type: 'appEventLocalizations', id: found.id, attributes: c },
      });
      locIds[locale] = found.id;
    } else {
      const res = await api('POST', '/v1/appEventLocalizations', {
        data: {
          type: 'appEventLocalizations',
          attributes: { locale, ...c },
          relationships: { appEvent: { data: { type: 'appEvents', id: event.id } } },
        },
      });
      locIds[locale] = res.data.id;
    }
    console.log(`  ${locale} ${locIds[locale]}: "${c.name}" ${len(c.name)} / ${len(c.shortDescription)} / ${len(c.longDescription)}`);
  }

  // 画像(Asset Library)。配置は作ったら変えられないので、枠に配置済みなら何もしない
  const libraryId = (await api('GET', `/v1/apps/${APP_ID}/assetLibrary`)).data.id;
  const refData = (await api('GET', '/v1/appAssetLibraryRefData')).data[0].attributes;
  const existing = (await api('GET', `/v1/appAssetLibraries/${libraryId}/images?limit=200`)).data;
  for (const [locale, locId] of Object.entries(locIds)) {
    const placed = (await api('GET', `/v1/appEventLocalizations/${locId}/placements`)).data;
    for (const type of Object.keys(IMAGES[locale])) {
      if (placed.some((p) => p.attributes.placementType === type)) {
        console.log(`  ${locale} ${type}: already placed`);
        continue;
      }
      const group = refData.placementTypes.find((p) => p.placementTypeId === type).specMappings[0].placementGroupId;
      const img = await uploadImage(libraryId, existing, { locale, type }, refData);
      if (!img) continue;
      const res = await api('POST', '/v1/appAssetLibraryPlacements', {
        data: {
          type: 'appAssetLibraryPlacements',
          attributes: { placementType: type, placementGroup: group },
          relationships: {
            image: { data: { type: 'appAssetLibraryImages', id: img.id } },
            appEventLocalization: { data: { type: 'appEventLocalizations', id: locId } },
          },
        },
      });
      console.log(`  ${locale} ${type}: placed ${res.data.id} (${res.data.attributes.state})`);
    }
  }
  console.log(`done. event ${event.id} is not submitted for review.`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
