#!/usr/bin/env node
/**
 * App Store Connect に届いたビルドの処理状況を読む(読むだけ。何も書き換えない)。
 *   node scripts/asc-builds.js            # 直近5件
 *   node scripts/asc-builds.js 17         # ビルド番号17だけ
 *
 * 必要な環境変数(値はリポジトリに置かない):
 *   ASC_KEY_ID     App Store Connect API キーの ID
 *   ASC_ISSUER_ID  発行者 ID
 *   ASC_KEY_PATH   .p8 ファイルのパス(⚠ .p8 はコミット禁止。リポジトリの外に置く)
 *
 * `VALID` になれば TestFlight から入れられる。EAS の --auto-submit から10分前後かかる。
 */

const crypto = require('crypto');
const fs = require('fs');

const APP_ID = '6800968856';

for (const name of ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_KEY_PATH']) {
  if (!process.env[name]) {
    console.error(`${name} is not set. See CLAUDE.md "環境変数".`);
    process.exit(1);
  }
}

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const unsigned = `${b64({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' })}.${b64({
  iss: process.env.ASC_ISSUER_ID,
  iat: now,
  exp: now + 900,
  aud: 'appstoreconnect-v1',
})}`;
const signature = crypto
  .sign('sha256', Buffer.from(unsigned), {
    key: fs.readFileSync(process.env.ASC_KEY_PATH, 'utf8'),
    dsaEncoding: 'ieee-p1363',
  })
  .toString('base64url');

(async () => {
  const wanted = process.argv[2];
  const response = await fetch(
    `https://api.appstoreconnect.apple.com/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=${
      wanted ? 20 : 5
    }&fields[builds]=version,processingState,uploadedDate`,
    { headers: { Authorization: `Bearer ${unsigned}.${signature}` } },
  );
  if (!response.ok) {
    console.error(`App Store Connect returned ${response.status}`);
    process.exit(1);
  }
  const { data } = await response.json();
  const rows = data.filter((build) => !wanted || build.attributes.version === wanted);
  if (rows.length === 0) console.log(wanted ? `build ${wanted}: not yet` : 'no builds');
  for (const build of rows) {
    const { version, processingState, uploadedDate } = build.attributes;
    console.log(`build ${version}  ${processingState}  ${uploadedDate}`);
  }
})();
