# src/config

Tier 1 ハードストップの判定リストを置く場所。

## blocklist.ts はリポジトリに入っていない

`app/.gitignore` の `src/config/blocklist.*` で除外している。
公開すると回避方法を探す材料になるため(spec §4)。

**ローカル開発でクローンした直後はこのファイルが無く、ビルドが通らない。** 手元に用意すること。

**EAS のクラウドビルドではファイルを自動配置する。** 中身は EAS の
file 型 secret 環境変数 `TIER1_BLOCKLIST_TS`(`production` 環境)としてアップロード済み。
`package.json` の `eas-build-pre-install` フックが `npm install` の直前に
`scripts/provision-blocklist.js` を実行し、このファイルへコピーする。
これに気づかず静的 import のまま最初のクラウドビルドに出したところ
"Bundle JavaScript" フェーズが `Unable to resolve module @/config/blocklist`
で落ちた(2026-08-29)。

**中身を差し替えたら、EAS 側の値も更新すること:**

```
eas env:set production --name TIER1_BLOCKLIST_TS --type file \
  --value src/config/blocklist.ts --visibility secret --scope project
```

(app/ ディレクトリから実行する)

`src/lib/self-harm-guard.ts` が期待する形:

```ts
/** これ単体で自傷・希死念慮とみなす表現。正規化後の文字列に部分一致で照合する */
export const DIRECT_PHRASES: readonly string[] = [];

/** 単体の自傷語。SELF_TARGETS と4語以内で近接したときだけ弾く */
export const HARM_TERMS: readonly string[] = [];

/** 一人称の対象語。1語で現れるものだけ(複数語は DIRECT_PHRASES へ) */
export const SELF_TARGETS: readonly string[] = ['myself', 'me'];
```

語は正規化後の形(小文字・アポストロフィなし)で書く。
判定の考え方は `src/lib/self-harm-guard.ts` の冒頭コメントを読むこと。
