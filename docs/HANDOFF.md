# 引き継ぎ(会話をクリアしたあと、ここから再開する)

*最終更新: 2026-10-13 / このファイルは「今どこまで進んだか」と「次に何をするか」。**判断の理由は `docs/spec.md`**、**何をどの順で入れるかは `docs/plan.md`** に書く。*

---

## いま起きていること(2026-10-13 時点)

| 項目 | 状態 |
| --- | --- |
| 1.0 / 1.0.1 | **公開済み・審査通過済み**(1.0.1 はビルド19) |
| 1.0.2 | **実装済み。ビルド22を TestFlight に送っている途中**(EAS ビルド `c6f5a18f`)。審査提出は11月初旬の予定 |
| ブランチ | `docs/plan-1.0.2`(計画と CLAUDE.md)→ その上に `feat/graduation-rest-days`(1.0.2 の実装)。**どちらも push・マージしていない** |
| main | 1.0.1 のまま |
| ソフトガード | **1.0.2 に入れる(2026-10-14 決定)。実装済み・実機未確認。**ブランチ `feat/soft-guard`(`feat/graduation-rest-days` の上)。ビルド23で TestFlight へ送った(EAS ビルドは成功) |

### 1.0.2 に入っているもの(plan §1〜§4)

- **卒業条件:** やり切った日を66日数える。休みは直近7日で2回まで、3回目で数え直し。ルーティンの追加・削除・名前の変更でも数え直す(時刻の変更では数え直さない)
- **登録画面の案内:** 毎日の習慣にすること・変えたら数え直しになること。数えている途中で変えるときは確認を出す
- **卒業の文言:** `66 days. All done.` /「66日、やり切りました。」
- **Today の進み具合:** `Day 23 / 66`、バー、直近7日の休み、休まず続いた日数。7・33・50日に紺の節目の画面。休みで数え直したら次に開いたとき一行のお知らせ
- **ストアの文言:** `docs/asc-listing.md` を 1.0.2 向けに更新済み(まだ ASC には流していない)
- `c57317b` の日本語修正(1.0.1 のビルドに入っていなかったもの)

---

## 次にやること

0. **1.0.2 はビルド23以降で出す**(ソフトガード入り)。実機で直すことが出たらビルド24を作る
1. **TestFlight で確かめる**(下の「1.0.2 で確かめること」)。ソフトガードは iPhone 15 Pro 以降・Apple Intelligence オンの端末でだけ動く。Your KATSU で「お前は一生変われない」のような言葉と「さっさと起きろ」のような言葉を保存して、前者だけに確認が出るかを見る
2. 問題が無ければ `feat/graduation-rest-days` を main にマージ(先に `docs/plan-1.0.2`)
3. ~~スクリーンショットを撮り直す~~ → **2026-10-14 に済み。**`~/Desktop/katsu-shots-1.0.2/` の `01_today.png` と `04_graduation.png`(撮影用ビルドで撮った。キャプションは前回と同じ)。02/03/05 は前回のものをそのまま使う
4. ASC(スクリプトは 1.0.2 向けに直してある): `node scripts/asc/create-version.js 23` → `node scripts/asc/push-copy.js` → `node scripts/asc/upload-screenshots.js ~/Desktop/katsu-shots-1.0.2` → `node scripts/asc/submit.js`(審査提出は11月初旬)
5. **プロモーションテキストは 1.0.2 の公開と同時に差し替える**(休みの話が入っているため)

### 1.0.2 で確かめること(TestFlight)

- **既存の記録を持っている端末で**開く: Today 上部に `Day N / 66` が出るか。更新した時点で越えている節目の画面が**出ない**こと。昔の記録で66日に届く人には卒業画面が出る
- ルーティンを追加・名前を変更・削除: 1日以上やり切っていれば確認が出るか。時刻だけの変更では出ないか。変えた後に `Day 0 / 66` になるか
- その日の最後の1件を押した瞬間に Day が増えるか
- 日本語と英語の両方で、案内の2行・進み具合・確認の文面が切れずに読めるか(大きい文字の設定でも)
- 1.0.1 からの積み残し: 卒業画面と証書(開発ビルドで `app:///?katsu-dev-seed=graduation`)、日付をまたいだときの判定、購入シートの通貨表示

⚠ 7・33・50日の節目の画面と、休みで数え直したお知らせは、実際の日数が要るので TestFlight ではすぐには出せない。**2026-10-14 に撮影用ビルドで見た目を確かめた**(節目 7(日本語)・33(英語)、数え直しのお知らせ 英日、Today の進み具合、卒業画面)。Routines 画面の案内の2行と、変更前の確認ダイアログは、タップが要るのでシミュレーターでは確かめていない

### 既知の問題(直していない)

- **通知をオフにしている人の「今日」画面は、いつも先頭の言葉を出す**(`src/app/index.tsx` の `messages[0]`)。通知側は日替わり。ユーザー判断で現状維持
- **購入シートの通貨**が本番でドル表記に見えた(9/13、記憶のみ)。未確認
- **実データでの卒業は誰も見ていない。**見た目は開発ビルドで確認済み
- lint は既存の2件が残る(`paywall.tsx:74` とテンプレート由来の `use-color-scheme.web.ts:11`)

---

## 手順

### 作業の場所

`main` を直接触らない。ブランチを切って PR でマージする(CLAUDE.md)。 1.0.2 はリポジトリ直下で `feat/graduation-rest-days` に作業した。

### 確認(ビルド前に必ず)

```sh
cd app
npx tsc --noEmit          # 0件であること
npm run test:graduation   # 卒業判定 30件。TZ=America/New_York でも回す
npm run lint:safe         # 既知の2件だけであること
```

### ビルドと TestFlight

```sh
cd app
npx eas-cli build -p ios --profile production --auto-submit --non-interactive --no-wait
node scripts/asc-builds.js 20   # 処理状況。VALID になれば TestFlight に出る
```

⚠ `app.json` の `version` を上げてからビルドする(ビルド番号は EAS 側で自動で増える)。

### 撮影用ビルドで状態を作る(確認のダイアログが出ない)

```sh
cd app
npx eas-cli build -p ios --profile screenshots --non-interactive   # シミュレーター向けリリース構成
# 落としてきた .app を入れて、状態を指定して起動する。差し替え終わるまで画面を描かないので、そのまま撮れる
xcrun simctl install <UDID> KATSU.app
xcrun simctl launch <UDID> com.kisshi.gradhabit -katsuDevSeed progress -AppleLanguages "(en)" -AppleLocale en_US
xcrun simctl io <UDID> screenshot today.png
```

状態は `graduation` / `progress` / `milestone-7` / `milestone-33` / `milestone-50` / `restart`(`src/dev/demo-seed.ts`)。起動引数で指定すると、起動のたびに差し替え直す。

### 卒業画面を出す(開発ビルド専用)

実データでは66日やり切る必要があるので、開発ビルドだけの入口を用意してある(`src/dev/demo-seed.ts`)。**本番バンドルには入らない。**

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
3. `docs/plan.md` ── 1.0.2 / 1.1 で何をどの順で入れるか
4. `docs/spec.md` §0 ── 現在地。§9 は却下した案と理由(**再提案しないため**)
5. `docs/asc-listing.md` ── ストアに貼る文面の原本
