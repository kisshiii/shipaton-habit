# 引き継ぎ(会話をクリアしたあと、ここから再開する)

*最終更新: 2026-11-15 / このファイルは「今どこまで進んだか」と「次に何をするか」と「手順」。**判断の理由は `docs/spec.md`**、**何をどの順で入れるかは `docs/plan.md`**(今は §10)。日付ごとの過去の状態は `docs/history/handoff-log.md`。*

---

## 現在地(2026-11-15)

| 項目 | 状態 |
| --- | --- |
| 公開中 | **1.0.3(ビルド37)。**2026-11-14 に提出、審査を通って公開済み |
| main | 1.0.3、特商法のページ、1.0.4 用の特商法のリンク、文書の整理まで入って、GitHub に push 済み(2026-11-15) |
| 目標 | 2週間使い続ける人を30人(plan §10) |
| 次の山 | **発信してダウンロードしてもらう(TikTok)。別のセッションでやる。**台本は `docs/marketing/tiktok.md`(⚠ 古いので先に直す) |
| EAS | 11月は15回のうち3回使用。この Mac でシミュレーター向けにビルドできるので、確認はそちらで(手順の節) |

### 1.0.3 で入ったもの(plan §10)

炭の見た目と太いゴシック / オンボーディング5画面(入口 → やること → 言葉 → 封 → 通知)/「もう要らない」ボタンをやめて「卒業証書を見る」「サブスクを解約する」/ 言葉は3つまで無料で日替わり / 名前・時刻の変更では数え直さない / チェックの手応え(振動。`app/modules/katsu-haptics`)と日数の動き / ウィジェット(チェックもできる)/ 通知の「やった」「10分後にもう一度」/ アイコン長押し / 1日目を先にできる / 英語の Your KATSU に喝の説明

### 次の版(1.0.4)でやること

急がない。**発信の反応を見て直す所が出たら、まとめて出す**(本人判断 2026-11-15)。

1. `app/app.json` の版を 1.0.4 に上げる
2. (済み)課金画面に「特定商取引法に基づく表記」のリンク(日本語のときだけ)は main に入っている。まだどのビルドにも入っていない
3. `bash tools/sim/build.sh` で入れて、課金画面のリンクを確かめる(日本語で出る・英語で出ない)
4. EAS でビルド → TestFlight → 本人が実機で確認
5. ASC に 1.0.4 を作る → **日本語ページの「マーケティング URL」に https://kisshiii.github.io/shipaton-habit/tokushoho/**
6. **サブスクの商品の説明**を「言葉を4つ以上持てます」に(`docs/asc-listing.md`。1.0.3 では入れなかった)
7. **検索結果とヘッダの画像**を一緒に出す(`~/Desktop/katsu-search/`、作り方は `tools/compose-search-result.swift` / `tools/compose-header.swift`。本人OK済み)。ASC のプレビューで見え方を確かめてから
8. 新機能の欄を書く(⚠「✓」は使えない)→ 審査に出す

### 版と関係なくやること

- カスタムページ(朝・新年)の画像を上げる(`~/Desktop/katsu-cpp-1.0.3/`。キーワードの割り当ては `docs/aso/custom-product-pages.md`)
- 推薦の説明を新しい文に差し替える(**期限 12/4**。`docs/asc-listing.md` の推薦の節)
- App 内イベント「1月1日から、66日」を12月10日ごろ審査に出す
- EU のトレーダー(事業者)の設定が済んでいるか確かめる(デジタルサービス法。未確認)

### 既知の問題(直していない)

- **通知をオフにしている人の Today は、いつも先頭の言葉を出す**(`src/app/index.tsx` の `messages[0]`)。通知側は日替わり
- **振動の強さと起動の時間は、実機で数字としては確かめていない**(本人は「完了で良さそう」)。シミュレーターでは起動に約10秒かかった
- **実データでの卒業は誰も見ていない。**見た目は撮影用の状態で確認済み
- lint は既存の2件が残る(`paywall.tsx` の effect と、テンプレート由来の `use-color-scheme.web.ts:11`)

### 手元にある素材(リポジトリの外)

| 場所 | 中身 |
| --- | --- |
| `~/Desktop/katsu-shots-1.0.3/{en,ja}/` | ストアのスクショ 01〜05(ASC に上げたもの。`_一覧.jpg` で全部見られる) |
| `~/Desktop/katsu-cpp-1.0.3/` | カスタムページ(朝・新年)× 英日 × 02・03 |
| `~/Desktop/katsu-search/` | 検索結果(3:2)とヘッダ(21:9)の画像、英日 |
| `~/Desktop/katsu-sumi/` | 炭の見た目を決めたときの見本とアイコン案 |
| `~/katsu-demo/` | Devpost 用のデモ動画の素材と編集スクリプト(9月) |

---

## 手順

### 作業の場所

`main` を直接触らない。機能ごとにブランチを切ってマージする(CLAUDE.md)。リポジトリは公開なので、push の前に秘密の情報(ASC の鍵の ID、`.p8`、`sk_` など)が混ざっていないかを確かめる。

### 確認(ビルド前に必ず)

```sh
cd app
npx tsc --noEmit          # 0件であること
npm run test:graduation   # 卒業判定 42件。TZ=America/New_York でも回す
npm run test:storage      # 保存レイヤ 32件(同時書き込み・分母・言葉の関門・ウィジェットの押した日)。TZ=America/New_York でも回す
npm run lint:safe         # 既知の2件だけであること
```

### ビルドと TestFlight

```sh
cd app
npx eas-cli build -p ios --profile production --auto-submit --non-interactive --no-wait
node scripts/asc-builds.js 20   # 処理状況。VALID になれば TestFlight に出る
```

⚠ `app.json` の `version` を上げてからビルドする(ビルド番号は EAS 側で自動で増える)。

### この Mac でシミュレーター向けにビルドする(EAS の回数を使わない)

2026-11-03 からできるようになった。**確認と撮影はこちらで済ませ、EAS は提出用だけに使う。**

```sh
bash tools/sim/build.sh          # ビルド(初回30分ほど)→ 署名し直し → シミュレーターに入れ直す
bash tools/sim/build.sh --pods   # ネイティブの部品(modules/ など)を足したとき
```

- CocoaPods は Homebrew の Ruby で `~/.katsu-gems` に入れてある(`brew install cocoapods` はこの Mac だとソースからの組み立てになり何時間もかかるので使わない)
- `app/ios` が無いときは先に `cd app && EXPO_NO_CAPABILITY_SYNC=1 npx expo prebuild --platform ios --clean --no-install` してから `--pods` で
- ⚠ Xcode 26.3 だと `expo-modules-jsi` の `abs(milliseconds)` が「曖昧」で止まる。スクリプトがビルドの間だけ `Swift.abs` に書き換えて、終わったら戻す(EAS では起きない)
- 撮影用の仕組み(`-katsuDevSeed` など)が入った版になる。App Store 版とは別物
- App Group を使うため、entitlements 付きで署名し直している。ただしシミュレーターでは App Group の保存先がアプリ自身のものになり、ウィジェットとは共有されない(ウィジェットの押下は `defaults import` で書いて確かめた)
- ⚠ 振動は鳴らない。ロック・タップは私(Claude)からはできないので、本人に頼む

### 撮影用の状態と画面(確認のダイアログが出ない)

```sh
xcrun simctl launch <UDID> com.kisshi.gradhabit -katsuDevSeed progress -AppleLanguages "(en)" -AppleLocale en_US
xcrun simctl io <UDID> screenshot today.png
```

- **状態** `-katsuDevSeed`: `graduation` / `progress` / `milestone-1` / `milestone-7` / `milestone-33` / `milestone-50` / `restart`(`src/dev/demo-seed.ts`)。起動のたびに差し替え直す。言葉はすでに入っていれば残る(言語を変えるときは消す)
- **ルーティンの組** `-katsuDevTheme`: `default` / `morning` / `workout` / `sleep` / `study` / `phone`
- **画面** `-katsuDevScreen`(`src/dev/dev-screen.tsx`): `onboarding:intro|routine|words|seal|notifications` / `katsu` / `routines` / `paywall` / `paywall:jp`(ASC の日本の名前と値段)/ `share-milestone` / `share-words`
- 以前は EAS の `screenshots` プロファイルで作っていた。今は `tools/sim/build.sh` で同じものが作れる

### 卒業画面を出す

`tools/sim/build.sh` で入れた版で、`-katsuDevSeed graduation` を付けて起動する(上の節)。66日分の記録が入り、卒業画面が開く。**本番バンドルには入らない。**以前の、開発ビルドと Metro を使うやり方は `docs/history/handoff-log.md` にある。

### ストア用スクリーンショットを作る

1290x2796(6.7インチ)。炭より一段暗い地に見出し、その下に画面。並びと見出しは `docs/asc-listing.md` の「スクリーンショット」。

```sh
bash tools/sim/shoot-store.sh ~/Desktop/raw      # 元の画面を英日 × 8つ撮る(先に一度、アプリの中で通知を許可しておく)
swift tools/compose-screenshot.swift <入力.png> <出力.png> "1行目" "2行目" [x y w h]   # 長い行は自動で縮む
swift tools/contact-sheet.swift <一覧.jpg> <画像>...                                     # 並べて確かめる
```

- **ロック画面の通知(01)**: シミュレーターの言語を変えて(`xcrun simctl spawn <UDID> defaults write -g AppleLanguages -array ja en` → 再起動)、本人に ⌘L でロックしてもらい、`xcrun simctl push <UDID> com.kisshi.gradhabit push.json`(`{"aps":{"alert":{"title":"…","body":"…"}}}`)で通知を出して撮る。⚠ 時刻を 9:41 に固定したままだとロック画面の日付が作り物になる(`status_bar clear` してからロックし直す)。⚠ 起動し直した直後は壁紙が乱れることがある
- 仕上げたら一度 JPEG を経由して PNG に戻し、透明の情報を消す(ASC が透明を嫌う)
- **検索結果とヘッダの画像**: `swift tools/compose-search-result.swift` / `swift tools/compose-header.swift`(引数はファイルの先頭のコメント)。Apple の安全な範囲に収める
- **アイコンの色を変える**: `swift tools/recolor-image.swift`

### App Store Connect(すべて API。画面操作は不要)

```sh
cd app
node scripts/asc/create-version.js <ビルド番号>   # app.json の版を作ってビルドを紐づける(版は app.json から読む)
node scripts/asc/push-copy.js            # docs/asc-listing.md の文面を流し込む
node scripts/asc/upload-screenshots.js <画像のフォルダ> [--dry-run]   # <フォルダ>/en と /ja の5枚を、言語ごとにまるごと入れ替える
node scripts/asc/submit.js --check       # 状態を見るだけ
node scripts/asc/submit.js               # 審査に出す
```

⚠ これらは `docs/asc-listing.md` を唯一の原本として読む。**ASC の画面で直接文言を変えると、次に流し込んだときに上書きされる。**

⚠ ASC の JWT は**有効期限20分まで**。それより長いと 401 になる。

⚠ 新機能の欄に「✓」の記号は使えない(ASC が拒否する)。

⚠ 鍵の値はリポジトリに書かない。渡し方は Claude のメモ(`asc-api-key`)にある。

---

## 環境変数(値はリポジトリに置かない。名前だけ)

| 名前 | 何に使うか |
| --- | --- |
| `ASC_KEY_ID` / `ASC_ISSUER_ID` / `ASC_KEY_PATH` | App Store Connect API(`scripts/asc/*`、`scripts/asc-builds.js`)。`.p8` はリポジトリの外に置く |
| `EXPO_TOKEN` | クラウドから `eas-cli` を使う場合 |
| `TIER1_BLOCKLIST_TS` | **EAS 側に登録済みの file 型 secret。**ビルド時に `src/config/blocklist.ts` を配置する(`app/scripts/provision-blocklist.js`) |
| `KATSU_BLOCKLIST_TS_BASE64` | クラウドで本物の判定リストを使う場合(任意)。無ければ `setup:cloud` が空のひな形を作る |
| `ASC_KEY_P8_BASE64` | クラウドに ASC の鍵を置く場合(任意)。`setup:cloud` が `~/.asc/AuthKey.p8` に書き出す |

新しい環境(クラウドなど)では最初に1回:

```sh
bash app/scripts/cloud-setup.sh
```

⚠ `src/config/blocklist.ts`(自傷・希死念慮の判定リスト)は**リポジトリに入っていない**。中身をコミットしない。

---

## 読む順番

1. `CLAUDE.md` ── 破ってはいけない制約
2. このファイル ── 今どこまで進んだか
3. `docs/plan.md` ── 何をどの順で入れるか(今は §10)
4. `docs/spec.md` §0 ── 現在地。§9 は却下した案と理由(**再提案しないため**)
5. `docs/asc-listing.md` ── ストアに貼る文面の原本
