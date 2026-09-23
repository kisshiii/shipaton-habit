# 引き継ぎ(会話をクリアしたあと、ここから再開する)

*最終更新: 2026-09-23 / このファイルは「今どこまで進んだか」と「次に何をするか」。**判断の理由は `docs/spec.md`** に書く。*

---

## いま起きていること(2026-09-23 時点)

| 項目 | 状態 |
| --- | --- |
| 1.0 | **公開中**(2026-09-13〜、ビルド13) |
| 1.0.1 | **審査待ち(`WAITING_FOR_REVIEW`)。**ビルド19で 9/23 に提出 |
| main | 1.0.1 の変更をすべてマージ済み |
| EAS の無料ビルド枠 | **使い切っている。回復は 2026-10-01。**それまで新しいビルドは作れない |
| Devpost 締切 | **2026-09-30。動かせない** |

### 1.0.1 に入っているもの

卒業の条件を「その日を全部やり切った日が**連続66日**」に変更 / 卒業証書 / デザイン刷新(明朝の「声」・時刻表・節目の紺) / ペイウォールの作り直し / 購読管理から戻ってもモーダルが閉じない不具合の修正 / 固定ボタンがタブバーに重なる不具合の修正 / 開発ビルド専用の卒業状態

詳しくは `docs/spec.md` §0 と §2。

### ⚠ ビルド19に入っていないもの

**アプリ内の日本語**「このアプリは、あなたに捨てられるために作られています」→「使わなくなることを目指して作られています」。 コミット済み(`c57317b`)だが、EAS の枠切れでビルドできていない。**10/01 以降の次のビルドで自動的に入る。**

---

## 次にやること(9/30 まで)

1. **審査結果を待つ** ── 通れば公開。前回は1〜2日だった
2. **デモ動画を撮る** ── 下の「卒業画面を出す」を使う。シミュレーターの録画: `xcrun simctl io <UDID> recordVideo demo.mov`
3. **Devpost に提出する** ── HAMM の審査軸と材料の対応は `docs/spec.md` §8。発信素材は §8-2

### 決まっていないこと

- **説明文の研究の言い方**(`research found` が言い過ぎ)。差し替え案は `docs/asc-listing.md` の「次のバージョンで直すこと」。**1.0.1 の審査中に説明文を変えると審査から引き上げになる**ので、次のバージョンで直す
- **プロモーションテキスト**はマーケ担当チャットの確認待ち(`docs/spec.md` §8-3)。**審査なしでいつでも差し替えられる**

### 既知の問題(直していない)

- **通知をオフにしている人の「今日」画面は、いつも先頭の言葉を出す**(`src/app/index.tsx` の `messages[0]`)。通知側は日替わり。ユーザー判断で現状維持
- **購入シートの通貨**が本番でドル表記に見えた(9/13、記憶のみ)。未確認
- **実データでの卒業は誰も見ていない。**連続66日が要るため。見た目は開発ビルドで確認済み
- lint は既存の2件が残る(`paywall.tsx:74` とテンプレート由来の `use-color-scheme.web.ts:11`)

---

## 手順

### 作業の場所

`main` を直接触らない。ブランチを切って PR でマージする(CLAUDE.md)。 このセッションは `.claude/worktrees/graduation-close`(ブランチ `feat/design-brushup`)で作業していた。

### 確認(ビルド前に必ず)

```sh
cd app
npx tsc --noEmit          # 0件であること
npm run test:graduation   # 卒業判定 12件
npm run lint:safe         # 既知の2件だけであること
```

### ビルドと TestFlight

```sh
cd app
npx eas-cli build -p ios --profile production --auto-submit --non-interactive --no-wait
node scripts/asc-builds.js 20   # 処理状況。VALID になれば TestFlight に出る
```

⚠ **10/01 まで無料枠が無い。**

### 卒業画面を出す(開発ビルド専用)

実データでは連続66日が要るので、開発ビルドだけの入口を用意してある(`src/dev/demo-seed.ts`)。**本番バンドルには入らない。**

```sh
# シミュレーター用の開発ビルド(EAS の枠を使う)
npx eas-cli build -p ios --profile development-simulator --non-interactive --no-wait
# 落としてきた .app を入れる
xcrun simctl install <UDID> KATSU.app
# Metro を起動(app/ で)
CI=1 npx expo start --dev-client --port 8081
# 英語・ダークモード・9:41 の見た目にする
xcrun simctl ui <UDID> appearance dark
xcrun simctl status_bar <UDID> override --time "9:41" --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularMode active --cellularBars 4
xcrun simctl launch <UDID> com.kisshi.gradhabit -AppleLanguages "(en)" -AppleLocale en_US
xcrun simctl openurl <UDID> "exp+app://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
# 66日分の記録を入れて再読み込み(卒業画面が開く)
xcrun simctl openurl <UDID> "app:///?katsu-dev-seed=graduation"
```

⚠ **iOS 26 のシミュレーターは URL を開くたびに「"KATSU" で開きますか?」を出す。**コマンドからは押せないので、人が「開く」を押す。 ⚠ 開発ビルドには歯車(開発メニュー)が浮いている。**スクリーンショットでは邪魔になるので、指でドラッグして空いている場所へ動かす。**

使っていたシミュレーター: iPhone 17 Pro `75873CD6-AA35-4F14-B897-ACBC06DC8140`(`xcrun simctl list devices` で確認)

### ストア用スクリーンショットを組む

1290x2796(6.7インチ)。暗い背景の上にキャプション、その下に画面。

```sh
swift tools/compose-screenshot.swift <入力.png> <出力.png> "1行目" "2行目" [x y w h]
```

末尾の4つは、開発メニューの歯車など**消したい部分の矩形**(入力画像の座標)。周囲の色で塗る。 いまのキャプションと並びは `docs/asc-listing.md` の「スクリーンショット」。

### App Store Connect(すべて API。画面操作は不要)

```sh
cd app
node scripts/asc/create-version.js       # バージョンを作ってビルドを紐づける
node scripts/asc/push-copy.js            # docs/asc-listing.md の文面を流し込む
node scripts/asc/upload-screenshots.js <画像のフォルダ>
node scripts/asc/submit.js --check       # 状態を見るだけ
node scripts/asc/submit.js               # 審査に出す
```

⚠ これらは `docs/asc-listing.md` を唯一の原本として読む。**ASC の画面で直接文言を変えると、次に流し込んだときに上書きされる。**

⚠ ASC の JWT は**有効期限20分まで**。それより長いと 401 になる。

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
3. `docs/spec.md` §0 ── 現在地。§9 は却下した案と理由(**再提案しないため**)
4. `docs/asc-listing.md` ── ストアに貼る文面の原本
