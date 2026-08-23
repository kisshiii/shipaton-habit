# src/config

Tier 1 ハードストップの判定リストを置く場所。

## blocklist.ts はリポジトリに入っていない

`app/.gitignore` の `src/config/blocklist.*` で除外している。
公開すると回避方法を探す材料になるため(spec §4)。

**クローン直後はこのファイルが無く、ビルドが通らない。** 手元に用意すること。

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
