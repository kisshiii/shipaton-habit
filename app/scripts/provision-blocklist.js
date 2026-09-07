#!/usr/bin/env node
/**
 * `src/config/blocklist.ts` は .gitignore 済み(spec §4: 公開すると回避方法を
 * 探す材料になる)。そのため EAS のクラウドビルドは、クリーンな git clone から
 * ビルドする限りこのファイルを持たない。
 *
 * この事実に気づかず、静的 import のまま cloud build に出したところ
 * "Bundle JavaScript" フェーズが `Unable to resolve module @/config/blocklist`
 * で落ちた(2026-08-29)。
 *
 * 対処: ファイルの中身自体は EAS の file 型 secret 環境変数
 * (`TIER1_BLOCKLIST_TS`)としてアップロード済み。ビルド時、EAS はこれを
 * ローカルディスクへ書き出し、その絶対パスを同名の環境変数に入れる。
 * このスクリプトは `eas-build-pre-install` フックとして npm install の
 * 直前に呼ばれ、そのファイルを本来の場所へコピーする。
 *
 * ローカル開発では何もしない(TIER1_BLOCKLIST_TS は設定されておらず、
 * 手元に配置済みの blocklist.ts をそのまま使う)。
 */

const fs = require('fs');
const path = require('path');

const source = process.env.TIER1_BLOCKLIST_TS;
const destination = path.join(__dirname, '..', 'src', 'config', 'blocklist.ts');

if (!source) {
  if (fs.existsSync(destination)) {
    console.log('[provision-blocklist] TIER1_BLOCKLIST_TS is not set; using the file already on disk.');
  } else {
    console.log(
      '[provision-blocklist] TIER1_BLOCKLIST_TS is not set and src/config/blocklist.ts is missing. ' +
        'See src/config/README.md.',
    );
  }
  process.exit(0);
}

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source, destination);
console.log('[provision-blocklist] Wrote src/config/blocklist.ts from TIER1_BLOCKLIST_TS.');
