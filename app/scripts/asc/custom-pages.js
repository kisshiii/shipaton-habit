#!/usr/bin/env node
/**
 * カスタムプロダクトページ(CPP)を ASC に作る(すでにあれば足りない分だけ足す)。**審査には出さない。**
 * 中身の原本は docs/aso/custom-product-pages.md(§3-A 朝のルーティン / §3-F 新年の目標、§5「先に作る2ページ」)。
 *
 *   node scripts/asc/custom-pages.js            # 2ページを作る・足りない分を足す
 *
 * 流れ: ページ(+版+ローカライズ)を作る → プロモーションテキストを入れる → スクショを App Asset Library に上げて置き、
 *       並べる → キーワードを割り当てる。審査は別に出す(reviewSubmissionItems の appCustomProductPageVersion)。
 * ⚠ キーワードは「最新の承認済みの版」のキーワード欄の語しか割り当てられない(GET /v1/apps/{id}/searchKeywords で確かめる)。
 * ⚠ 置いた画像は変えられない。もう置いてある枠には何もしない(差し替えるなら ASC の画面で消してから)。
 * ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH が要る。
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const APP_ID = '6800968856';
const SHOTS = path.join(os.homedir(), 'Desktop', 'katsu-shots-1.0.3');   // ストアの本体のスクショ(1枚目に使う)
const CPP = path.join(os.homedir(), 'Desktop', 'katsu-cpp-1.0.3');       // ページごとの2・3枚目
const PLACEMENT_TYPE = 'APP_SCREENSHOT';
const PLACEMENT_GROUP = 'IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE';

const PAGES = [
  {
    name: 'newyear-2027',
    locales: {
      'en-US': {
        promo: 'Make January 1 your Day 1. Pick up to three daily routines, write what you want to hear on the days you would rather not, and start with the new year. 66 days.',
        keywords: ['resolution', 'new', 'year', 'goal'],
        images: [path.join(SHOTS, 'en', '01_notification.png'), path.join(CPP, 'newyear', 'en', '02.png'), path.join(CPP, 'newyear', 'en', '03.png')],
      },
      ja: {
        promo: '元日を1日目に。毎日のルーティンを3つまで決めて、やりたくない日の自分に届ける言葉を書き、新しい年と一緒に始めます。66日やり切ったら卒業です。',
        keywords: ['目標', '抱負', '新年'],
        images: [path.join(SHOTS, 'ja', '01_notification.png'), path.join(CPP, 'newyear', 'ja', '02.png'), path.join(CPP, 'newyear', 'ja', '03.png')],
      },
    },
  },
  {
    name: 'morning-routine',
    locales: {
      'en-US': {
        promo: 'A morning routine that starts small. Pick one thing for 06:30 and write what you want to hear if it is still not done. Your own words arrive. Rest days included.',
        keywords: ['morning', 'wake'],
        images: [path.join(SHOTS, 'en', '01_notification.png'), path.join(CPP, 'morning', 'en', '02.png'), path.join(CPP, 'morning', 'en', '03.png')],
      },
      ja: {
        promo: '朝のルーティンは、小さく始める。6時30分にやることをひとつ決めて、時刻を過ぎてもまだのときに届けたい言葉を、自分で書いておく。届くのは、こちらの定型文ではなくあなたの言葉です。休める日つき。',
        keywords: ['朝活', '早起き', '朝型', 'モーニングルーティン'],
        images: [path.join(SHOTS, 'ja', '01_notification.png'), path.join(CPP, 'morning', 'ja', '02.png'), path.join(CPP, 'morning', 'ja', '03.png')],
      },
    },
  },
];

// トークンは20分で切れる。画像の処理待ちが長引いても困らないよう、15分たったら作り直す
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
let jwt = null;
let jwtAt = 0;
function token() {
  const now = Math.floor(Date.now() / 1000);
  if (jwt && now - jwtAt < 15 * 60) return jwt;
  const inp = `${b64({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' })}.${b64({
    iss: process.env.ASC_ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1',
  })}`;
  jwt = `${inp}.${crypto
    .sign('sha256', Buffer.from(inp), { key: fs.readFileSync(process.env.ASC_KEY_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' })
    .toString('base64url')}`;
  jwtAt = now;
  return jwt;
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** ページを探す。無ければ、版とローカライズごと作る */
async function ensurePage(page) {
  const pages = (await api('GET', `/v1/apps/${APP_ID}/appCustomProductPages?limit=200`)).data;
  const found = pages.find((p) => p.attributes.name === page.name);
  if (found) {
    console.log(`page ${page.name}: exists ${found.id}`);
    return found.id;
  }
  const locales = Object.keys(page.locales);
  const res = await api('POST', '/v1/appCustomProductPages', {
    data: {
      type: 'appCustomProductPages',
      attributes: { name: page.name },
      relationships: {
        app: { data: { type: 'apps', id: APP_ID } },
        appCustomProductPageVersions: { data: [{ type: 'appCustomProductPageVersions', id: '${v1}' }] },
      },
    },
    included: [
      {
        type: 'appCustomProductPageVersions',
        id: '${v1}',
        relationships: { appCustomProductPageLocalizations: { data: locales.map((_, i) => ({ type: 'appCustomProductPageLocalizations', id: `\${l${i}}` })) } },
      },
      ...locales.map((locale, i) => ({
        type: 'appCustomProductPageLocalizations',
        id: `\${l${i}}`,
        attributes: { locale, promotionalText: page.locales[locale].promo },
      })),
    ],
  });
  console.log(`page ${page.name}: created ${res.data.id}`);
  return res.data.id;
}

/** 編集できる版(審査前)のローカライズを locale → id で返す。足りないロケールは作る */
async function editableLocalizations(pageId, page) {
  const versions = (await api('GET', `/v1/appCustomProductPages/${pageId}/appCustomProductPageVersions?limit=50`)).data;
  const version = versions.find((v) => ['PREPARE_FOR_SUBMISSION', 'READY_FOR_REVIEW', 'REJECTED'].includes(v.attributes.state));
  if (!version) throw new Error(`${page.name}: no editable version (${versions.map((v) => v.attributes.state).join(', ')})`);
  const locs = (await api('GET', `/v1/appCustomProductPageVersions/${version.id}/appCustomProductPageLocalizations?limit=50`)).data;
  const ids = Object.fromEntries(locs.map((l) => [l.attributes.locale, l]));
  for (const locale of Object.keys(page.locales)) {
    if (!ids[locale]) {
      const res = await api('POST', '/v1/appCustomProductPageLocalizations', {
        data: {
          type: 'appCustomProductPageLocalizations',
          attributes: { locale, promotionalText: page.locales[locale].promo },
          relationships: { appCustomProductPageVersion: { data: { type: 'appCustomProductPageVersions', id: version.id } } },
        },
      });
      ids[locale] = res.data;
      console.log(`  ${locale}: localization created`);
    } else if (ids[locale].attributes.promotionalText !== page.locales[locale].promo) {
      await api('PATCH', `/v1/appCustomProductPageLocalizations/${ids[locale].id}`, {
        data: { type: 'appCustomProductPageLocalizations', id: ids[locale].id, attributes: { promotionalText: page.locales[locale].promo } },
      });
      console.log(`  ${locale}: promotional text updated`);
    }
  }
  return { versionId: version.id, locIds: Object.fromEntries(Object.entries(ids).map(([k, v]) => [k, v.id])) };
}

/** 画像を App Asset Library に上げて、使える状態まで待つ。同じファイル名で上げてあれば使い回す */
async function uploadImage(libraryId, file) {
  const fileName = path.basename(path.dirname(file)) === 'en' || path.basename(path.dirname(file)) === 'ja'
    ? `${path.basename(path.dirname(path.dirname(file)))}-${path.basename(path.dirname(file))}-${path.basename(file)}`
    : path.basename(file);
  const existing = (await api('GET', `/v1/appAssetLibraries/${libraryId}/images?limit=200`)).data;
  let img = existing.find((i) => i.attributes.fileName === fileName && i.attributes.state !== 'FAILED');
  if (!img) {
    const bytes = fs.readFileSync(file);
    img = (await api('POST', '/v1/appAssetLibraryImages', {
      data: {
        type: 'appAssetLibraryImages',
        attributes: { fileName, fileSize: bytes.length, category: 'APP_SCREENSHOTS_AND_PREVIEWS' },
        relationships: { assetLibrary: { data: { type: 'appAssetLibraries', id: libraryId } } },
      },
    })).data;
    for (const op of img.attributes.uploadOperations ?? []) {
      const headers = Object.fromEntries((op.requestHeaders ?? []).map((h) => [h.name, h.value]));
      const r = await fetch(op.url, { method: op.method, headers, body: bytes.subarray(op.offset, op.offset + op.length) });
      if (!r.ok) throw new Error(`upload ${fileName} -> ${r.status} ${(await r.text()).slice(0, 500)}`);
    }
    await api('PATCH', `/v1/appAssetLibraryImages/${img.id}`, { data: { type: 'appAssetLibraryImages', id: img.id, attributes: { uploaded: true } } });
    console.log(`    ${fileName}: uploaded`);
  }
  const deadline = Date.now() + 10 * 60 * 1000;
  for (;;) {
    const cur = (await api('GET', `/v1/appAssetLibraryImages/${img.id}`)).data;
    const { state, stateDetails } = cur.attributes;
    if (['PREPARE_FOR_SUBMISSION', 'READY_FOR_REVIEW', 'APPROVED'].includes(state)) return cur;
    if (state === 'FAILED') throw new Error(`${fileName}: FAILED ${JSON.stringify(stateDetails)}`);
    if (Date.now() > deadline) throw new Error(`${fileName}: still ${state} after 10 min. Run again later.`);
    await sleep(10000);
  }
}

/** スクショを置いて並べる。もう置いてあれば何もしない */
async function placeScreenshots(libraryId, locId, files) {
  // 置いてある画像(どの画像か)を読む。途中で止まっても、足りない分だけ置いて、最後に並べ直す
  const listed = await api('GET', `/v1/appCustomProductPageLocalizations/${locId}/placements?limit=50&include=image`);
  const fileNameOf = Object.fromEntries((listed.included ?? []).map((i) => [i.id, i.attributes.fileName]));
  const placedByName = {};
  for (const p of listed.data.filter((x) => x.attributes.placementType === PLACEMENT_TYPE)) {
    const name = fileNameOf[p.relationships?.image?.data?.id];
    if (name) placedByName[name] = p.id;
  }
  const ids = [];
  for (const file of files) {
    const img = await uploadImage(libraryId, file);
    const name = img.attributes.fileName;
    if (placedByName[name]) {
      ids.push(placedByName[name]);
      continue;
    }
    const res = await api('POST', '/v1/appAssetLibraryPlacements', {
      data: {
        type: 'appAssetLibraryPlacements',
        attributes: { placementType: PLACEMENT_TYPE, placementGroup: PLACEMENT_GROUP },
        relationships: {
          image: { data: { type: 'appAssetLibraryImages', id: img.id } },
          appCustomProductPageLocalization: { data: { type: 'appCustomProductPageLocalizations', id: locId } },
        },
      },
    });
    ids.push(res.data.id);
  }
  // ⚠ orderedPlacements は属性ではなく関係(2026-11-27 に 409 で分かった)
  await api('POST', '/v1/appAssetLibraryPlacementOrderingRequests', {
    data: {
      type: 'appAssetLibraryPlacementOrderingRequests',
      attributes: { placementGroup: PLACEMENT_GROUP },
      relationships: {
        appCustomProductPageLocalization: { data: { type: 'appCustomProductPageLocalizations', id: locId } },
        orderedPlacements: { data: ids.map((id) => ({ type: 'appAssetLibraryPlacements', id })) },
      },
    },
  });
  console.log(`    screenshots: placed and ordered (${ids.length})`);
}

/** キーワードを割り当てる(足りない分だけ) */
async function assignKeywords(locId, locale, words) {
  const available = new Set((await api('GET', `/v1/apps/${APP_ID}/searchKeywords?filter[locale]=${encodeURIComponent(locale)}&filter[platform]=IOS&limit=200`)).data.map((k) => k.id));
  const missing = words.filter((w) => !available.has(w));
  if (missing.length) throw new Error(`${locale}: not in the keyword field of the latest approved version: ${missing.join(', ')}`);
  const assigned = new Set((await api('GET', `/v1/appCustomProductPageLocalizations/${locId}/searchKeywords?limit=200`)).data.map((k) => k.id));
  const todo = words.filter((w) => !assigned.has(w));
  if (!todo.length) {
    console.log(`    keywords: already assigned (${words.join(', ')})`);
    return;
  }
  await api('POST', `/v1/appCustomProductPageLocalizations/${locId}/relationships/searchKeywords`, {
    data: todo.map((id) => ({ type: 'appKeywords', id })),
  });
  console.log(`    keywords: assigned ${todo.join(', ')}`);
}

(async () => {
  for (const page of PAGES) for (const l of Object.values(page.locales)) for (const f of l.images) if (!fs.existsSync(f)) throw new Error(`missing image: ${f}`);
  const libraryId = (await api('GET', `/v1/apps/${APP_ID}/assetLibrary`)).data.id;
  for (const page of PAGES) {
    const pageId = await ensurePage(page);
    const { locIds } = await editableLocalizations(pageId, page);
    for (const [locale, conf] of Object.entries(page.locales)) {
      console.log(`  ${locale}:`);
      await placeScreenshots(libraryId, locIds[locale], conf.images);
      await assignKeywords(locIds[locale], locale, conf.keywords);
    }
  }
  console.log('done. not submitted for review.');
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
