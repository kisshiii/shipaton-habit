# 引き継ぎ(会話をクリアしたあと、ここから再開する)

*最終更新: 2026-10-14 / このファイルは「今どこまで進んだか」と「次に何をするか」。**判断の理由は `docs/spec.md`**、**何をどの順で入れるかは `docs/plan.md`** に書く。*

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

## ⚠ 2026-11-01 の状態(ここから再開)

- **1.0.3 のビルド34が成功し、TestFlight へ送った**(ブランチ `feat/1.0.3-widget`)。10/31 に決めた4つは全部入れた: 「10分後にもう一度」を iOS 側で予約(`app/modules/katsu-notification-actions`)/ ウィジェットから直接チェック / 保存まわりのテスト(`npm run test:storage`、27件)/ ウィジェットの赤い Error の注意書きと、説明を「Day N / 66」に
- **ウィジェット用のプロビジョニングプロファイルは本人が作った**(Claude Code の外のターミナルで `eas build` を対話で実行。`!` では対話できず止まる)。次からは `EXPO_NO_CAPABILITY_SYNC=1 npx eas-cli build ... --non-interactive` で通るはず
- 次: 本人が TestFlight で確認 → 問題なければ main にマージ → ASC(新機能の欄は `docs/asc-listing.md` の 1.0.3 の節)→ 提出。推薦も出すか決める(期限 12/4)

## 2026-10-31 夜の状態(記録)

- **作業ブランチ: `feat/1.0.3-widget`**(1.0.3 の全部 + ウィジェット)。今日、4つに分けたコードレビューの結果を直した(`1a63093` `08e5a9c` `c3351ad` `609ad7e`)。判定テスト42件・型チェック・lint は通っている。**まだビルドしていない**
  - 直したもの: 1日目のお祝いの出方 / 同時に保存するとチェックが消える / オンボーディングの二重保存と「戻る」/ オンボーディング後に Today が空のまま(本人が前から気にしていた件)/ 卒業後の数え直しのお知らせ / 「10分後」が済んだ・消したルーティンに届く / 0時をまたぐ「やった」/ 試しの通知が消える / ウィジェットの0時・1日目の表示 / 文言(66日のしくみ、英語の誤り)
- **明日やること(本人が決めた。10/31)**
  1. **「10分後にもう一度」を iOS 側で予約する(A 案)**: Swift の小さな部品(`app/modules/katsu-notification-actions`)で、expo-notifications の delegate に入って、押した瞬間に10分後の通知を予約する。JS 側の予約はやめる(二重になるため)
  2. **ウィジェットから直接チェック**: まず `expo-widgets` 57.0.9 で、アプリが閉じているときに押した分を、あとからアプリが受け取れるか(getTimeline など)を調べる。無理なら報告
  3. **保存まわりの自動テスト**: `app/scripts/test-storage.js` と `npm run test:storage`(偽の AsyncStorage。同時の書き込み・二重保存・削除・上限など)
  4. **ウィジェットの赤い Error の対策(新機能の欄と審査メモに「一度アプリを開いてから」)と、ウィジェットの日本語の説明**
  - 10/31 に3つをエージェントで始めたが途中で止めた。`.claude/worktrees/agent-*` に途中の作業が残っているが、使わずにやり直してよい
- **11/1 9:00 にビルドの回数が戻る**。上の4つが済んでから、まとめてビルドする(EAS は `EXPO_NO_CAPABILITY_SYNC=1`。App Group は作成済み)

## 2026-10-30 の状態(記録)

- **公開中: 1.0.2**(10/28 公開)
- **1.0.3**(`feat/1.0.3-onboarding`、version 1.0.3): 実装はほぼ完了。**ビルド29が TestFlight に送られた**(新しいオンボーディング、昨日の一言、1日目のお祝いと共有カード、通知のボタン「やった ✓」「10分後にもう一度」、ホーム画面のクイックアクション)
  - 次: 本人が TestFlight で確認(特に「10分後にもう一度」がアプリを開かずに動くか)→ main にマージ → 提出(11月中旬〜下旬)
  - 1.0.3 を出すときにキーワード欄を差し替える案: `docs/aso/custom-product-pages.md` §1
- **ASC に下書きを作った(未提出)**: App 内イベント「1月1日から、66日」(`app/scripts/asc/in-app-event.js`)、フィーチャーの推薦(`app/scripts/asc/nomination.js`)。本人が ASC で読んでから、推薦は11月中に提出、イベントは1.0.3と一緒に審査へ
- **マーケティングの資料**: `docs/marketing/tiktok.md`(30本の台本と年始の計画)、`docs/aso/custom-product-pages.md`(6ページ。先に「新年」と「朝」)、`docs/aso/asc-api-capabilities.md`(API でできること。⚠ スクショのアップロードは 2026 年の API で App Asset Library に変わった。`upload-screenshots.js` は古い方法のまま)
- **カスタムプロダクトページのスクショ(10/31)**: `~/Desktop/katsu-cpp/{morning,newyear}/{en,ja}/02.png, 03.png`(キャプション付き、1290×2796、透明度なし)。**01 はまだ**: 朝の 01 はロック画面の通知なので本人が実機で撮る / 新年の 01(「1月1日から」の選択肢)は12月に入ってから撮る
- **ビルド30**(1.0.3。卒業画面の日本語の改行を直した)が TestFlight へ。**EAS の iOS ビルドは10月分(15回)を使い切った。11/1 9:00(日本時間)に戻る**。11月はまとめて直してからビルドする
- **ウィジェット(10/31)**: 本人が Apple の新しいプログラム使用許諾契約に同意し(未同意だと Certificates, IDs & Profiles が開けなかった)、App Group `group.com.kisshi.gradhabit` を作って、`com.kisshi.gradhabit` と `com.kisshi.gradhabit.ExpoWidgetsTarget` の両方に結びつけた(API で APP_GROUPS が両方にあることを確認)。コードは `feat/1.0.3-widget`(`expo-widgets` 57.0.9 固定)。**次: 11/1 以降に `cd app && EXPO_NO_CAPABILITY_SYNC=1 npx eas-cli build -p ios --profile production --auto-submit --non-interactive --no-wait`**
- **10/31 に決まったこと**: ビルドはいったん止める / TestFlight の確認は本人 / ~~ウィジェット(App Group)はまだやらない~~ → 同日にやることにした / TikTok は本人が撮る(撮る内容は別のチャットで検討。叩き台は `docs/marketing/tiktok.md`)/ スクショの 01(朝・新年)は残課題
- **本人の答え待ち**: 通知の c(サブタイトルに日数)と d(長押しの専用画面)/ 推薦の下書きを提出してよいか

## 2026-10-27 の状態(記録)

- **1.0.2 は審査を通過した(2026-10-30 に本人から報告)**。ビルド27。main に入れて GitHub に push 済み(`f3aa2f1`)
  - ASC の鍵: 置き場所はリポジトリに書かない(公開しているため)。本人の Mac にある。Issuer ID は本人に聞く。コマンドごとに3つの環境変数を付けて実行する(セッションをまたいで `export` は残らない)
  - ⚠ スクリーンショットが Apple 側で「処理待ち(`UPLOAD_COMPLETE`)」のまま止まって見えることがある。**消して上げ直さず、待つ**(10/27 は上げ直しを繰り返して遠回りした。30分ほどで全部通った)
  - TestFlight でプラン名が英語になるのは Sandbox の都合。日本の App Store には日本語名(まず一歩 / 本気で / オールイン)が出ていることを確認済み
- **1.0.3**: 下の 10/20 の状態から変わらず。残りは本人の作業(App Group、App 内イベント)と、12/15 ごろの提出
- **年始の宣伝**: App 内イベント「1月1日から、66日」とフィーチャーの推薦の下書きを `docs/asc-listing.md` に書いた。**推薦は11月中に本人が ASC で出す**(3週間以上前が必須)。イベントの画像(16:9 と 9:16)は未作成
- **次に作ると決めたもの(10/27、本人判断。まだ plan.md に書いていない)**: 1日目の共有カード / ホーム画面のクイックアクション / ストアのプレビュー動画 / 年始向けのカスタムプロダクトページ / リッチな通知。**入れないと決めたもの**: 今のユーザーが1月1日から数え直す / 始まるまでのカウントダウンと前夜の一言
- **本人に聞いている途中(ここから再開)**:
  1. 通知をどうリッチにするか: a「やった」ボタン / b「10分後にもう一度」/ c サブタイトルに Day N / 66(アプリが数字を足してよいか)/ d 長押しの専用画面(紺の手紙)/ e 紺のマークを添付。Claude のおすすめは a・b・e
  2. 1.0.3 をいつ出すか: A 今の 1.0.3 を11月に出し、新しいものは 1.0.4(年始版)へ(おすすめ)/ B 全部を 1.0.3 にまとめて12/15 ごろ。⚠「1月1日から」は12月に自動で出るので、1.0.3 を11月に出しても年始に効く

## 2026-10-20 の状態(記録)

- **1.0.2: ビルド27が成功し TestFlight へ送った**(`feat/growth`)。ウィジェットは外した(`feat/widget` に残してある)。ビルドが2回失敗した原因は `expo-store-review` 57.0.2 以降(`SceneGeometry`)→ 57.0.1 に固定済み
  - 次: 本人が TestFlight で確認 → `docs/plan-1.0.2` → `feat/graduation-rest-days` → `feat/soft-guard` → `feat/growth` の順に main へマージ → ASC(`create-version.js 27` ほか)→ 提出
- **1.0.3: 実装済み**(`feat/1.0.3-onboarding`、plan §8): 8段のオンボーディング、始める日を先にできる(12月だけ1月1日)、その日最初の一言、日数が動く表示。撮影用ビルドで全画面の見た目を確認済み(10/20)
  - 撮影用ビルドに `-katsuDevScreen onboarding:<段> / share-milestone / share-words` を足した(タップ無しで画面を開く)
  - 残り: ウィジェット(本人が Apple Developer で App Group を作ってから `feat/widget` を取り込む)、ASC の App 内イベント、12/15 ごろまでに提出

## 2026-10-14 の終わりの状態(記録)

- ブランチ `feat/growth`(`feat/soft-guard` の上)に plan §7 を入れた: レビュー依頼・オンボーディングの「いま届けてみる」・共有カード・ストアの名前とキーワード。**どれも実機・シミュレーターで未確認**
- **2026-10-20: ウィジェットは 1.0.3 に回した**(コードは `feat/widget` に残してある)。下は 1.0.3 で再開するときの手順
- (1.0.3 で)**ウィジェットのビルドは止まる。**ウィジェットの App Group を EAS が Apple に設定できなかった(`Failed to patch capabilities: APP_GROUPS`)。**本人が Apple Developer で設定する:**
  1. App Group `group.com.kisshi.gradhabit` を作る(https://developer.apple.com/account/resources/identifiers/list/applicationGroup)
  2. `com.kisshi.gradhabit` と `com.kisshi.gradhabit.ExpoWidgetsTarget` の両方で App Groups を有効にし、1 を選ぶ
  3. その後 `cd app && EXPO_NO_CAPABILITY_SYNC=1 npx eas-cli build -p ios --profile production --auto-submit --non-interactive --no-wait`
- 代わりにウィジェットだけ外して 1.0.3 に回す案もある(本人の判断待ち)
- ビルドが通ったら、撮影用ビルド(`--profile screenshots`)で新しい画面(共有カード・「いま届けてみる」)を確かめ、TestFlight で実機確認 → main にマージ → ASC へ流し込み → 提出

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
npm run test:graduation   # 卒業判定 42件。TZ=America/New_York でも回す
npm run test:storage      # 保存レイヤ 27件(同時書き込み・分母・言葉の関門)。TZ=America/New_York でも回す
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
