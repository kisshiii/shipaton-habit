# App Store Connect に貼る文言

*作成: 2026-09-07 / 改訂: 2026-09-22(1.0.1 向け、マーケ担当チャット案)/ 2026-09-23(日本語名を本人確定)/ 2026-10-13(1.0.2 向け: 休みありの卒業条件・研究の言い方) / 確度: **【暫定】**(提出前に本人が読み直すこと)*

⚠ ここは**下書き置き場**であって決定の記録ではない。仕様の判断は `spec.md` に書く。

---

## 2026-10-13 改訂で変えたこと(1.0.2)

| # | 箇所 | 変更 | 理由 |
| --- | --- | --- | --- |
| 1 | 説明文(英日) | 「66日連続」「in a row」「つまり卒業の条件は連続記録です」を外し、**休みは直近7日で2回まで**に書き換えた | 卒業条件が変わった(spec §2 卒業の扱い / plan §1) |
| 2 | 説明文(英日) | 「連続日数のカウンターを出さない」を外し、「数字は66日までの進み具合の1つだけ」にした | Today に `Day 23 / 66` を出すようになった(plan §4) |
| 3 | 説明文・プロモーション(英日) | 研究の言い方を弱めた(`research found` → 「ある研究で、中央値」)。9/23 の差し替え案を、休みありの文脈で書き直して入れた | 1本の研究の中央値であって、分野の結論ではない(下の「研究の言い方を弱める」) |
| 4 | 説明文(英日) | 研究が「1日休んでもほとんど遅れなかった」と報告していることを、休みを認める理由として書いた | 9/22 には「連続」が研究と食い違う点として隠していた事実。休みありにしたことで、研究と仕様が同じ向きになった |
| 5 | 説明文(英日) | 使い方に「毎日のことを選ぶ。週に数回なら毎日の形に」を足した | 曜日指定を入れない代わりの案内(plan §2) |
| 6 | 審査ノート・新機能・スクショ | 1.0.2 向けに更新 | — |

## 2026-09-22 改訂で変えたこと

| # | 箇所 | 変更 | 理由 |
| --- | --- | --- | --- |
| 1 | 英語説明文・新機能・英語プロモーション | 研究の一文と「66 days in a row」を切り離した。英語説明文には「連続はこのアプリの選択」と明記 | spec §8-2: 研究が支えるのは66日という長さだけ。「研究に基づいて連続66日」と読める書き方をしない |
| 2 | 説明文(英日) | 「卒業は連続だ」と自分から認める一文を追加 | 「WHY IT ENDS」で他社の連続記録を批判しているのに、卒業条件が連続66日。先に言わないと矛盾に見える |
| 3 | 英語サブタイトル | `Your own words when you skip` → `Reminders in your own words` | 核(自分の言葉)を保ったまま、検索語 `reminder` を入れる |
| 4 | 英語キーワード | `habit`(名前と重複)、`quit`(禁煙・禁酒系を呼び込む)、`graduate`(検索されない)、`reminder`(サブタイトルへ移動)を外した | 100文字を検索される語に使う |
| 5 | 英語プロモーション | 主語を「研究の中央値」にした | 「A habit takes about 66 days」は全員が66日と読める。66日は中央値 |
| 6 | 日本語プロモーション・説明文 | 「66日続けて」→「66日連続で」 | 連続か通算か曖昧だった |
| 7 | 日本語の名前・サブタイトル | 公開中の名前に合わせ、サブタイトルに「習慣」を入れる案を追加 | 下書きの名前(`KATSU 終わるための習慣`)と公開中の名前(`KATSU ~自分に喝~`)が違っていた。→ **2026-09-23 に公開中の名前で確定(下記)** |
| 8 | 審査ノート | 卒業まで審査中に到達できないことと、関連する画面の出し方を追記 | 1.0.1 の主な変更が審査担当者に見えないため |
| 9 | 新機能 | 日本語版を追加 | — |

---

## 名前・サブタイトル

| 欄 | 値 | 文字数 |
| --- | --- | --- |
| App Name (30) | `KATSU: Habit Tracker & Routine` | 30 |
| Subtitle (30) | `Reminders in your own words` | 27 |

**⚠ 名前を検索語に寄せた 【決定】2026-10-14(1.0.2、plan §7-2。開発者判断):** 旧 `KATSU — Habits that end`。ASC の数字で、ページに来た人の約64%が入れるのに、**見つかる回数が月に約210回しかなかった。**名前は検索で一番重く効く欄なので、`habit tracker` `routine` で見つかるようにする。「Habits that end」の話は説明文の WHY IT ENDS とスクショ(04)に任せる。名前に入れた語(habit / tracker / routine)はキーワードから外した。

**以下は旧名のときの判断(重複回避とトンカツ避けは新しい名前でも満たす):**

**⚠ `KATSU` 単独は App Store で既に使われている**(2026-09-08 に判明)。 App Store の名前は一意である必要があるため、修飾語を付ける。**改名ではない** ── spec §1 が 「サブタイトルで打ち消す」例として挙げていた `KATSU — Habits that end` をそのまま名前側に上げただけ。 これで**名前の重複回避とトンカツ避けが同時に片づく**。

**⚠ ホーム画面のアプリ名は `KATSU` のままでよい。** App Store の表示名と `CFBundleDisplayName` は一致している必要がない。 **したがってビルドし直す必要はない。**

**⚠ 名前が「Habits that end」を担うようになったので、サブタイトルは別の仕事をさせる。** ここで初めて**「言葉を書くのは自分」**という核を出す。名前とサブタイトルで同じことを言わない。

**⚠ サブタイトルは検索の索引にも入る 【決定】2026-09-22:** 旧案 `Your own words when you skip` は核を言えていたが、検索される語が1つも無かった。 `Reminders in your own words` は核を保ったまま `reminder` で検索に引っかかる。

**⚠ もし審査で「既存アプリと紛らわしい」(Guideline 2.3.8)と指摘されたら**、 `KATSU — Habits designed to end`(30) へ寄せる。

## Promotional Text (170)

```
It takes time to build a habit. In one study, the median was 66 days. KATSU keeps you going with words you wrote yourself. You can rest. At 66 days, you graduate.
```

(157文字)**審査なしでいつでも変えられる。**ただし「lets you rest」は 1.0.2 の仕様なので、**1.0.2 の公開と同時に差し替えること。**

## Keywords (100, カンマ区切り・スペースなし)

```
morning,wake,workout,gym,sleep,bedtime,study,phone,screen,detox,resolution,new,year,goal,motivation
```

(99文字。**2026-11-01 に 1.0.3 向けに差し替え**: カスタムプロダクトページに割り当てる語(朝・運動・睡眠・勉強・スマホ・新年)を入れた。外した語の理由は `docs/aso/custom-product-pages.md` §1)

**⚠ アプリ名・サブタイトルと重複する語を入れない**(Apple が別途索引する)。`habit` は名前の `Habits`、`reminder` はサブタイトルで索引される。 `katsu` は入れないこと ── 料理の検索結果に混ざりに行くことになる。

**⚠ `quit` は入れない 【決定】2026-09-22。** 禁煙・禁酒など「やめる」アプリを探す人を呼び込み、ダウンロードにつながらない。`Habits that end` が同じ誤解を招かないよう、説明文の冒頭で打ち消している。

## Description

```
KATSU is a habit app you graduate from.

(Not the cutlet. There are no recipes in here.)

Add up to three things you want to do every day, each at a set time. If the
time passes and one isn't done, you get a notification with words you wrote
yourself on the day you started.

WHY IT ENDS

Most habit apps have no end. You keep using them, and you keep paying.

KATSU has one. Finish everything on your list on 66 days and you
graduate. You get a certificate, and if you're subscribed, KATSU shows you
how to cancel. Once it's a habit, you don't need to keep paying for it.

Why 66? In a 2010 study from University College London, people repeated a
daily action until it felt automatic. The median was 66 days, though it varied
a lot from person to person. The same study found that missing a day now and then didn't set
people back much. So KATSU lets you rest up to two days in any seven without
losing your count. Rest days don't count toward the 66, and a third rest day
in seven days starts the count over.

HOW IT WORKS

• Add daily routines: a time and one thing to do. If it's a few times a week,
  make a daily version: "gym" becomes "move for 10 minutes"
• Write what you want to hear on a day you skip
• If the time passes and it isn't checked, those words arrive
• Check it off any time that day. Late still counts
• Check off from the notification, the app icon or the home screen widget

WHAT IT DOESN'T DO

• No scores, charts or badges
• Nothing is called a failure. A day you don't finish is a rest day
• No account, no sign-up, no cloud

YOUR WORDS STAY ON YOUR PHONE

What you write is never uploaded, analyzed or logged. There's no server to
send it to. If you delete the app, your words are deleted too.

FREE AND PAID

Routines, check-offs, notifications, the widget and graduation are free. So
are your first three sets of words, which take turns day by day. The paid
plan lets you keep more than three and use different words for different
routines.

The paid plan comes at three monthly prices with the same features. Pick what
it's worth to you. Cancel any time in Settings.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

**⚠ 他社の連続記録を批判しない 【決定】2026-11-13:** KATSU の「66日のうちN日」も、休みを超えると数え直しになる連続記録。自分が持っているものを批判すると筋が通らない。違いとして言うのは「終わり(卒業)があること」だけ。

**⚠ 研究に触れるときの決まり(spec §8-2):** 研究が支えるのは**66日という長さだけ**。66日は**1本の研究の中央値**であって、全員が66日で身につくとは書かない。分野全体の結論のようにも書かない(`research found` と言わない)。休みについては、Lally らが「1日休んでも習慣化はほとんど遅れなかった」と報告しているので、**休みを認める理由として言ってよい**。ただし「直近7日で2回まで」という線引きはこのアプリの選択で、研究が決めた数字ではない。

**⚠ 「18〜254日」と著者名を説明文に書かない 【決定】2026-11-03(本人指摘):** 研究は12週間(84日)しか追っておらず、254日は途中までの伸び方から計算した推定。測った日数のように読めるので書かない。「Lally ら, 2010」は論文の書き方で、ストアの読み手には伝わらない。「2010年にロンドン大学が発表した研究」「人によって大きな差がある」と書く。

**⚠ 以下は 1.0.1 の判断(10-13 に失効。卒業条件が連続ではなくなったため)。** 「卒業は連続だ」を自分から言う理由 【決定】2026-09-22: 「WHY IT ENDS」で他社の連続記録を批判している以上、黙っていると読み手が矛盾に気づいたときに不誠実に見える。 違いは**カウンターを見せないこと**と**途切れても数以外に何も失わないこと**で、そこを正直に言う。

**⚠ 説明文の末尾の EULA リンクを消さないこと 【必須】2026-09-12(リジェクトで判明):** Guideline 3.1.2(c) は**アプリ内とストアのメタデータの両方**に規約リンクを求める。 アプリ内(ペイウォール)だけでは足りず、**App Store の説明文にも要る。** Apple 標準 EULA を使う場合は説明文に、独自 EULA なら ASC の EULA 欄に。

## Review Notes(審査ノート)

```
No account or sign-in is required. Everything works on first launch.

Onboarding asks for one routine and one line of text; any values work.
Up to three lines of text are free; the paywall appears at the end of
onboarding and when adding a fourth.
Notifications are local only. To see one without waiting, add a routine a
minute or two ahead and leave the app.

GRADUATION (updated in 1.0.2)
Graduation requires completing every routine on 66 days, with up to two rest
days in any seven, so it cannot be reached during review. The certificate and
graduation screen are shown only to users who reach it. The progress line on
Today (Day N / 66) and the full-screen marks at 7, 33 and 50 days follow the
same count. At the bottom of the Routines screen, subscribers see a "Cancel
subscription" button that opens Apple's subscription settings, and users who
have graduated see "See your certificate". Other users see no button there.

SUBSCRIPTIONS
Three monthly auto-renewing subscriptions unlock the same content. They differ
only in price — the user decides what the app is worth to them. The free tier
is fully functional; the paywall can always be dismissed.

SAFETY GUARDRAIL
Users write harsh messages to themselves by design. Before any text is saved,
the app runs a local check for self-directed self-harm and suicidal
expressions. On a match it declines to save the text, shows a short
non-judgmental message with a link to findahelpline.com, and lets the user
continue using the app. The check runs entirely on device and the result is
never stored, logged, or transmitted.

WIDGET AND QUICK ACTIONS (new in 1.0.3)
The home/lock screen widget shows the day count, today's progress and the
routine names, with buttons to check off today's routines (never the user's
words). Please open the app once before adding the widget; until the app has
run, the widget has nothing to show. Long-pressing
the app icon offers today's unchecked routines as quick actions.

New in 1.0.2: on devices with Apple Intelligence, a second, softer check uses
Apple's on-device Foundation Models to notice words that attack the person
rather than the skipped action. It only suggests a rewrite and never blocks
saving. It runs entirely on device (no Private Cloud Compute, no network),
and neither the text nor the result is stored, logged, or transmitted. On
other devices this check is simply skipped.

PRIVACY
The app has no backend. User-written text never leaves the device. The only
network traffic is the RevenueCat SDK for subscription status.
```

## 日本語ロケール(ASC に「日本語」を追加してから貼る)

**⚠ アプリ内が日本語になったので、ストアページも日本語にすること。** 英語ページのままだと、日本語で動くアプリを英語の説明で売ることになる。

| 欄 | 値 | 文字数 |
| --- | --- | --- |
| App Name (30) | `KATSU 習慣化・ルーティン ~自分に喝~`(公開中の名前) | 22 |
| Subtitle (30) | `自分で書いた言葉が届く習慣アプリ` | 16 |

**⚠ 日本語名にも検索語を入れた 【決定】2026-10-14(1.0.2、plan §7-2・§7-7。開発者判断):** 旧 `KATSU ~自分に喝~`。日本も主戦場にするため、`習慣化` `ルーティン` で見つかるようにした。「~自分に喝~」は残す(9/23 に本人が気に入って残した部分)。名前に入れた語はキーワードから外した。⚠ 表の「(公開中の名前)」は push-copy.js が取り除く目印なので消さない。

**以下は旧名のときの判断:** **⚠ 日本語名は公開中のまま 【決定】2026-09-23(本人判断):** 下書きの旧版は `KATSU 終わるための習慣` だったが、**「終わるための習慣」は一目で意味が分かりにくい**(本人指摘)。 公開中の `KATSU ~自分に喝~` を維持する。名前に「習慣」が無いぶん、**サブタイトルで検索語を補う**。

**⚠ 日本語でも名前に修飾語を付ける。**英語側と揃え、ロケール間で別物に見えないようにする。 日本語では「トンカツ避け」は不要(漢字の「喝」が想起される)だが、 **名前の一意性は言語ごとに要る。**

**⚠ サブタイトルは「自分の言葉」を出す。**名前と同じことを繰り返さない。

**⚠ 「サボった」を使わないこと 【決定】2026-09-08:** 一度 `サボった朝に届く、自分の言葉` にしていたが却下した。 **「サボった」は未完了に判定を下す語**で、UX禁止事項「未完了を『失敗』として表示しない」と正面から矛盾する。 アプリの中で守っている原則を、ストアの1行目で自分から破ることになる。 「朝」も不要 ── ルーティンは夜にも置ける。

### Promotional Text (170)

```
習慣が身につくまでには時間がかかります。ある研究では中央値で66日でした。KATSU は、自分で書いた言葉でその66日を支えます。休んでもかまいません。やり切ったら卒業です。
```

**⚠ 「休んでもかまいません」は 1.0.2 の仕様。1.0.2 の公開と同時に差し替えること。**

### Keywords (100, カンマ区切り・スペースなし)

```
朝活,早起き,朝型,モーニングルーティン,筋トレ,運動,早寝,睡眠,夜更かし,勉強,資格,スマホ依存,デジタルデトックス,スクリーンタイム,目標,抱負,新年,継続,三日坊主,自己管理,やる気,日課
```

**2026-11-01 に 1.0.3 向けに差し替え**(98文字): カスタムプロダクトページに割り当てる語を入れた。`夜更かし` は `三日坊主` と同じく、キーワード欄にだけ置き、見える文面には出さない。外した語の理由は `docs/aso/custom-product-pages.md` §1。⚠ ASC が日本語の上限を文字で数えるか(10/27 は70文字で通った)を、流し込むときに確かめる

**⚠ `KATSU` `喝` を入れないこと。**アプリ名は Apple が別途索引する。 サブタイトルに「習慣」を入れたので、キーワードから `習慣` を外してある(重複)。 旧版の `通知` `卒業` は検索されにくいので外し、`筋トレ` `日課` を足した(2026-09-22)。

**⚠ `三日坊主` はキーワードにだけ置く。** 悩みそのものを表す検索語として強いが、人に貼るラベルでもあるので、ストアの見える文面には出さない(「サボった」を使わない判断と同じ理由)。

### Description

```
KATSU は、習慣が身についたら卒業する習慣アプリです。

毎日やりたいことを、時刻と一緒に3つまで登録します。時刻を過ぎてもやっていないと、
始めた日に自分で書いた言葉が通知で届きます。

■ なぜ卒業があるのか

多くの習慣アプリには、終わりがありません。使い続けるかぎり、支払いも続きます。

KATSU には卒業があります。全部やり切った日が66日になったら卒業です。
卒業証書を受け取れて、サブスクに入っている人には解約の方法を案内します。
習慣になったら、お金を払い続ける必要はありません。

66日は、2010年にロンドン大学が発表した研究の数字です。毎日同じ場面で
行動を繰り返した人たちが、意識しなくてもできると感じるまでに、
中央値で66日かかりました(人によって大きな差があります)。同じ研究では、
ときどき1日休んでもほとんど遅れなかったと報告されています。そこで KATSU では、直近7日で2回まで
休めます。休んでも日数はそのままです。休んだ日は66日に入らず、
7日のうちに3回休むと、日数は数え直しになります。

■ 使い方

・毎日やることを登録する(時刻とやること)。週に数回のことは、
 毎日できる形にします(例:ジム → 毎日10分体を動かす)
・やらなかった日の自分に向けて、言葉を書く
・時刻を過ぎてもチェックが付いていないと、その言葉が届く
・チェックはその日のうちなら何時でもかまいません
・通知、アプリのアイコン、ホーム画面のウィジェットからもチェックできます

■ しないこと

・点数、グラフ、バッジはありません
・できなかった日を「失敗」とは呼びません。休みの日として数えます
・アカウント登録もクラウドもありません

■ 書いた言葉は端末から出ません

書いた言葉は送信も解析も記録もしません。送る先のサーバーがありません。
アプリを削除すると、言葉も消えます。

■ 無料と有料

ルーティン、チェック、通知、ウィジェット、卒業までは無料です。
言葉も3つまで無料で、日替わりで届きます。
有料プランでは、言葉を4つ以上持てて、ルーティンごとに違う言葉を出せます。

有料プランは、中身が同じで値段が3つあります。自分にとっての価値で選んでください。
解約はいつでも設定からできます。

利用規約(EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

### Review Notes(日本語ロケールでも英語で提出してよい)

英語版と同じものを使う。**審査担当者は英語で読む。**

## サブスクリプションのローカリゼーション

**⚠ これが空だと「送信準備完了」にならず、StoreKit が商品を返さない。** ペイウォールに価格が並ばない原因になる(2026-09-08 に実際に詰まった)。

**⚠ 商品ごとの設定とは別に、サブスクリプショングループにも表示名が要る。** 一覧でグループ名をクリックして設定する。**3商品を全部埋めてもここが空だと完了にならない。**

上限は **表示名30文字 / 説明45文字**(実測済み)。

### グループ表示名

| 言語 | 値 |
| --- | --- |
| 英語 | `KATSU` |
| 日本語 | `KATSU` |

### 3商品の表示名

**⚠ 名前に金額を入れないこと。**値上げした瞬間に嘘になる(製品IDと同じ理由)。 **⚠ 上位プランほど機能が多いと読める名前を避けること。**中身は3つとも同じ。

**⚠ 支援の語彙を使わないこと 【決定】2026-09-08:** 一度 `Supporter / Believer / Patron` にしていたが却下した。 あれは**開発者を支援する額**の言い方で、ペイウォールが聞いているのは 「これに、いくらの価値がありますか」── **払う相手ではなく、自分に向けた宣言**である。 3つの違いは**本人の覚悟の度合い**であって、支援の厚さではない。

| 商品 | 英語 | 日本語 | 意味 |
| --- | --- | --- | --- |
| `gradhabit.monthly.tier1` | `A first step` | `まず一歩` | まず一歩め |
| `gradhabit.monthly.tier2` | `I mean it` | `本気で` | そこそこ本気 |
| `gradhabit.monthly.tier3` | `All in` | `オールイン` | 覚悟が決まった |

**⚠ 一番安いものを「まず一歩」と呼ぶこと。**少額を選んだ人を見下す名前にしない。 どれを選んでも中身は同じで、**額は本人の宣言でしかない。**

**⚠ 名前を変えても RevenueCat は触らない。** RevenueCat は製品IDだけで紐づけており、表示名と価格は端末が StoreKit から直接取る。 アプリのコードにも名前は書かれていない。**変更は ASC のローカリゼーションだけで完結する。**

### 説明(3商品とも同じでよい)

中身が本当に同じなので、説明も同じにするのが正しい。差をつけると事実と違う。

| 言語 | 値 | 文字数 |
| --- | --- | --- |
| 英語 | `More than three sets of words, at your price.` | 45(上限ちょうどのはず。ASC で通らなければ `More than three sets of words. You set the price.` は長いので `Over three sets of words, at your price.` に) |
| 日本語 | `言葉を4つ以上持てます。値段は自分で決めます。` | 23 |

**⚠ 2026-11-13 に変更(1.0.3 で言葉が3つまで無料になったため)。ASC の3商品の説明も、1.0.3 の提出のときに差し替える。**旧: `More than one set of words, at your price.` /「言葉を複数持てます。値段はあなたが決めます。」

### サブスクリプションの並び順

**⚠ ASC はレベル1を「最上位」として扱う。**「最も高いレベルのサービスを提供するオプションから始める形で降順に並べます」と ASC 自身が書いている。

3つとも中身が同じなので体験は変わらないが、**並びが価格と逆だとプラン変更時のアップグレード/ダウングレード判定が逆になり、日割りの挙動が変わる。** **価格の高いものをレベル1に**置くこと。

| レベル | 商品 | |
| --- | --- | --- |
| 1 | `gradhabit.monthly.tier3` | `All in` (最高額) |
| 2 | `gradhabit.monthly.tier2` | `I mean it` |
| 3 | `gradhabit.monthly.tier1` | `A first step` (最安) |

### 審査用スクリーンショット

**⚠ 3商品それぞれに1枚ずつ要る。**ペイウォールのスクショで足りる。 ここが空でも「送信準備完了」にならない。**ローカリゼーションと並んで見落としの二大要因。**

### ⚠ 販売地域(Availability)を忘れないこと

**価格の設定とは別物。**価格を175地域ぶん入れても、販売地域が空だと **`MISSING_METADATA` のまま提出できない。** 2026-09-09 に実際にここで詰まった。ローカリゼーションも審査用スクショも価格も揃っているのに状態が変わらず、 API で `subscriptionAvailability` が 404(未作成)と分かって判明した。

ASC の画面ではサブスクの「使用可否」の項目。**3商品それぞれに必要。**

REST API なら:
`POST /v1/subscriptionAvailabilities` に `availableInNewTerritories: true` と 地域一覧(`/v1/territories` の175件)を `availableTerritories` として渡す。

**見落としの三大要因は、ローカリゼーション・審査用スクショ・販売地域。**

**⚠ 販売地域は作る前に決めること。**`subscriptionAvailabilities` は API で **`CREATE` と `GET` しかできない。** 削除も地域の張り替えも 403 で拒否される。**一度作ると API からは二度と触れない。** 変更するには ASC の画面(商品ごとの「使用可否」)から行うしかない。

**⚠ 中国本土(CHN)を入れる場合は ICP 備案が要る。** 個人開発者が単独で取れるものではない。ただし**サブスクの販売地域より、アプリ本体の配信地域が上位の門番**で、 アプリ側で中国が外れていればサブスク側が有効でも売られない。 **アプリ側に中国が入っていると提出時に弾かれる。**

### 反映のさせ方

3商品すべてが「送信準備完了」になったら、数分待ってから **アプリを完全に終了して開き直す。** Offering は起動時に取りに行くため、バックグラウンドから復帰させただけでは変わらない。

**Apple の承認は不要。**「送信準備完了」の時点で Sandbox / TestFlight では購入できる。

## App Privacy(データ収集の申告)

- **Data Not Collected** で申告する。端末外に出るのは RevenueCat の購読状態のみで、 これは App Privacy 上の「収集」に当たらない扱いで問題ないが、 **RevenueCat 側の申告要件を提出前に確認すること 【未確認】**

## スクリーンショット

**1.0.3(2026-11-14 に上げたもの)。**英日で別の5枚。画像は `~/Desktop/katsu-shots-1.0.3/{en,ja}/`。作り方は `docs/HANDOFF.md`「ストア用スクリーンショットを作る」。6.7インチ(1290×2796)、シミュレーターで撮り、ロック画面だけは通知を送って撮った。

| # | ファイル | 画面 | 英語の見出し | 日本語の見出し |
|---|---|---|---|---|
| 01 | `01_notification.png` | ロック画面に通知が届く | `Skip it, and your` / `own words show up.` | 「やらなかったら、」/「自分の言葉が届く。」 |
| 02 | `02_today.png` | Today | `Up to three` / `routines a day.` | 「毎日やることは、」/「3つまで。」 |
| 03 | `03_words.png` | Your KATSU / 自分の言葉 | `You write every word` / `it sends you.` | 「言葉は全部、」/「自分で書く。」 |
| 04 | `04_graduation.png` | 卒業(証書つき) | `66 days, and` / `you graduate.` | 「66日やり切ったら、」/「卒業。」 |
| 05 | `05_paywall.png` | 課金画面 | `You set` / `the price.` | 「値段は、」/「自分で決める。」 |

- **⚠ 1枚目は通知 【決定】2026-11-14(本人判断):** 前は Today が1枚目で、見出しが「66日のうち23日。」だった。初めて見る人には何の23日か分からない。何をするアプリかが一目で分かる通知を先にした
- **⚠ 英語の見本のルーティンは `Study Spanish`**(`Study English` は英語のページで不自然)。日本語は「英語を15分やる」のまま
- **⚠ 日本語の 05 は ASC に登録した日本の名前と円の値段で撮る**(`-katsuDevScreen paywall:jp`。シミュレーターは米国のストアにつながる)
- 見出しも文章の決まり(spec §9-13)に従う。「That is」のような書き方をしない

### カスタムプロダクトページ(朝・新年)

画像は `~/Desktop/katsu-cpp-1.0.3/{morning,newyear}/{en,ja}/02.png,03.png`(まだ ASC に上げていない)。キーワードの割り当ては `docs/aso/custom-product-pages.md`。

| ページ | # | 英語 | 日本語 |
|---|---|---|---|
| 朝 | 02 | `Start with` / `a glass of water.` | 「まずは、」/「水を一杯飲むだけ。」 |
| 朝 | 03 | `Rest days included.` / `Graduate at 66.` | 「休める日つき。」/「66日で卒業。」 |
| 新年 | 02 | `Day 1 / 66.` / `Share it if you like.` | 「元日が1日目。」/「カードにして共有もできる。」 |
| 新年 | 03 | `Start January 1.` / `Graduate at 66.` | 「元日に始めて、」/「身についたら卒業。」 |

### 検索結果とヘッダの画像(クリエイティブアセット) 【決定】2026-11-15(本人OK)

2026-10-05 に ASC で始まった枠。iOS 27 / iPadOS 27 以降で表示される。**1.0.4 と一緒に審査に出す**(画像だけ単独でも出せる。落ちてもその画像が出ないだけ)。画像は `~/Desktop/katsu-search/`、作り方は `tools/compose-search-result.swift` / `tools/compose-header.swift`。

| 枠 | 大きさ | 安全な範囲(上からの座標) | 中身 |
|---|---|---|---|
| 検索結果 | 3:2、3840×2560 | x 836, y 765, 2168×1030 | 見出し「やらなかったら、自分の言葉が届く。」/ `Skip it, and your own words show up.` と通知のカード |
| ヘッダ | 21:9、3840×1646 | x 1097, y 493, 1646×661 | 同じ中身を小さく |

- 値段・割引・URL・受けていない賞・他のストアのロゴを入れない。4+ の内容。文字は安全な範囲に。透明を使わない(Apple の決まり)
- 両方に使える1枚(16:9、5244×2950)もあるが、安全な範囲が狭く見出しが小さくなるので、別々に作った

## 1.0.4 の「このバージョンの新機能」 **【暫定】2026-11-15**

**⚠ 2026-11-22 に ASC へ入れた。**特商法のリンクと、レビューで見つけた不具合の修正。利用者に関係のあるものだけ書く。

### 英語

```
• With notifications off, the Today screen now shows a different set of your words each day, the same as notifications.
• Back on the free plan, your first three sets of words now reach every routine, including ones you had assigned to a single routine.
• Fixed a widget check-off that could go missing after unchecking a routine in the app.
• Fixed Day 1 sometimes landing on the wrong day during setup.
• Tap a locked set of words to see why it isn’t being sent and how to get it back.
• Fixed the icon in the menu that appears when you press and hold the app icon.
• Other small fixes.
```

### 日本語

```
・通知をオフにしているときも、今日の画面に出る言葉が通知と同じく日替わりになりました。
・無料のプランに戻ったとき、ルーティンに割り当てた言葉も、先頭の3つなら全ルーティンに届くようにしました。
・アプリでチェックを外したあと、ウィジェットで付け直したチェックが記録されないことがあったのを直しました。
・最初の設定で選んだ1日目が、ずれることがあったのを直しました。
・届かなくなった言葉を押すと、理由と、また届くようにする方法が出るようにしました。
・アプリのアイコンを長押ししたときのメニューの絵が「?」になっていたのを直しました。
・課金の画面に「特定商取引法に基づく表記」へのリンクを追加しました。
・そのほか細かな修正。
```

## 1.0.3 の「このバージョンの新機能」 **【暫定】2026-11-01**

**⚠ 新機能の欄に「✓」は使えない(ASC が拒否する。2026-11-14)。ボタンの名前は「Done」「やった」と書く。**

**⚠ ウィジェットは、一度アプリを開いてから置いてもらう。**開く前に置くと、`expo-widgets` の仕様で赤い「Error」が出ることがある(2026-10-31 のレビューで発覚)。新機能の欄と審査メモの両方に書く。

### 英語

```
• A new look, and a shorter setup: five screens to your first day.
• Three sets of words are now free, and they take turns day by day.
• Renaming a routine or changing its time no longer starts the count over.
• Choose when Day 1 is. In December, you can pick January 1.
• Notifications have buttons: "Done" checks the routine off, and "Again in 10 min" sends your words again later.
• Long-press the app icon to check off today's routines.
• New home and lock screen widget: see your day count and check off routines from the home screen. Open KATSU once before adding it.
• Clearer wording throughout the app.
```

### 日本語

```
・見た目を新しくし、最初の設定を5画面に短くしました。
・言葉が3つまで無料になり、日替わりで届きます。
・ルーティンの名前や時刻を変えても、日数を数え直さなくなりました。
・1日目をいつにするか選べるようになりました。12月なら1月1日も選べます。
・通知にボタンが付きました。「やった」でチェック、「10分後にもう一度」で同じ言葉をあとでもう一度届けます。
・アプリのアイコンを長押しすると、今日のルーティンにチェックできます。
・ホーム画面とロック画面のウィジェットを追加しました。日数が見られて、ホーム画面からチェックもできます。置く前に、一度アプリを開いてください。
・アプリ全体の文章を、分かりやすく書き直しました。
```

## 1.0.3(年始)向け: App 内イベントとフィーチャーの推薦 **【暫定】2026-10-27**(plan §8)

**⚠ アプリの更新ではなく、ストア側の宣伝。**どちらも ASC で本人が作る(下書きはここが原本)。

### 日程

| いつ | 何を |
|---|---|
| **11月中** | **フィーチャーの推薦を出す。**Apple の決まりで、載せてほしい日の**3週間以上前**が必須。年始の特集は早く埋まるので、早いほど良い |
| 12月10日ごろ | App 内イベントを審査に出す(アプリ本体とは別に審査がある)。承認されたら推薦に添付する |
| 12月15日ごろ | 1.0.3 を審査に出す(「1月1日から始める」が入った版) |
| 12月18日ごろ〜 | App 内イベントの予告を出す(始まる前から App Store に載せられる) |
| 1月1日〜1月31日 | イベント期間 |

### App 内イベント

- **種類(バッジ):** Challenge
- **目的:** 新しいユーザーを呼び込む
- **期間:** 2027年1月1日 0:00 〜 1月31日(各地の時刻)。⚠ 最長31日(公式では未確認。ASC の画面で確かめる)
- **文字数の上限:** 名前30 / 短い説明50 / 長い説明120(公式では未確認。ASC の画面で確かめる)
- **画像:** カード 16:9(1920×1080 以上)と、詳細ページ 9:16。**まだ作っていない**(紺の地に「Day 1 / 66」と「1月1日」。節目の画面と同じ見た目で作る予定)

| 欄 | 英語 | 日本語 |
|---|---|---|
| 名前 | `66 Days, Starting January 1`(27) | `1月1日から、66日`(10) |
| 短い説明 | `Pick one habit. Day 1 is New Year's Day.`(40) | `ひとつ決めて、元日を1日目に。`(15) |
| 長い説明 | `Pick a daily routine and write what you need to hear on the days you'd rather not. Rest days included.`(102) | `毎日のルーティンと、やりたくない日の自分に届ける言葉を決めて、元日から始めます。休める日つき。66日で卒業です。`(56) |

⚠ 「Challenge」と言っても、競争やランキングにはしない。比べる相手はいない(spec §1)。

### フィーチャーの推薦(Featuring Nominations)

- **種類:** アプリの機能強化(App Enhancements)
- **名前:** `KATSU 1.0.3 — Start a habit on January 1`
- **載せてほしい時期:** 2026年12月26日 〜 2027年1月10日
- **地域・言語:** アプリの配信地域すべて / 英語・日本語
- **App 内イベント:** 承認されたら「1月1日から、66日」を添付する
- **補足資料(任意、URL 5つまで):** TestFlight の公開リンク、プレスキット(あれば)

**説明(英語。編集部は英語で読む):**

```
KATSU is a habit app you graduate from. You pick up to three daily
routines and write what you want to hear on the days you don't feel like
it. When a routine's time passes and it isn't done, those words arrive as
a notification. Finish everything on 66 days (up to two rest days in any
seven) and you graduate: KATSU gives you a certificate and, if you're
subscribed, shows you how to cancel.

Version 1.0.3 is built for the new year. Onboarding asks when Day 1
should be, and in December you can choose January 1. Day 1 gets a short
celebration and a card to share. Notifications have a Done button, and a
home and lock screen widget shows the day count and lets you check off
routines. Nothing is ever called a failure.

There is no server: what people write never leaves the device. An
on-device check with Apple's Foundation Models suggests rewriting words
that attack the person, without blocking or sending anything.

Made by one developer in Japan. English and Japanese.
```

**補足(Helpful details):**

```
Accessibility: the Today list reads each routine, its time and whether it
is done to VoiceOver, the progress line is exposed as a progress value,
and the day-count animation follows the Reduce Motion setting. The
long-press "seal" step in onboarding can also be done with a VoiceOver
double tap.
```

⚠ 推薦は Apple が選ぶもので、出しても取り上げられるとは限らない。費用はかからない。

## 1.0.2 の「このバージョンの新機能」 **【暫定】2026-10-13**

**⚠ 説明文・プロモーションテキストも上の版に差し替えること。**新機能の欄では研究に触れない(9/22 と同じ理由)。

### 英語

```
• Rest days: graduation now means doing everything on your list on 66 days, with up to two rest days in any seven. Resting doesn't send you back to day 1.
• See how far you are: Day 23 / 66 on Today, with your rest days for the week.
• A quiet mark at 7, 33 and 50 days.
• If what you write attacks you rather than what you skipped, KATSU suggests aiming it at today instead. It never stops you saving, and the check runs on your iPhone (Apple Intelligence required).
• Adding, removing or renaming a routine starts the count over. KATSU tells you before it does.
```

### 日本語

```
・休めるようになりました。その日のルーティンをすべてやり切った日が66日に届いたら卒業です。休みは直近7日で2回まで、休んでも1日目には戻りません。
・どこまで来たかが見えます。今日の画面に「66日のうち23日」と、この1週間の休みを出します。
・7日・33日・50日に、節目の画面を一度だけ出します。
・書いた言葉が、やらなかったことではなくあなた自身を否定しているとき、「今日のあなた」に向けた言葉への書き直しを提案します。保存は止めません。判定は iPhone の中だけで行います(Apple Intelligence が必要です)。
・ルーティンを足す・消す・名前を変えると、また1日目から数えます。変える前にお知らせします。
```

## 1.0.1 の「このバージョンの新機能」 **【暫定】2026-09-22**(提出済み・承認済み)

**⚠ 1.0.1 を出すときに説明文・プロモーションテキストも上の版に差し替えること。**
**⚠ 「21日」を否定する書き出しは使わない(ユーザー判断 2026-09-22)。**俗説を知らない人には何を否定しているのか分からず、読み手の注意が66日ではなく21日に向く。66日は肯定形で言い、出典は説明文に置く。旧文の「No streaks to protect / 守るべき連続記録もありません」は、連続66日で卒業する仕様と食い違う。 プロモーションテキストは審査なしで変えられるが、説明文は新しいバージョンと一緒に審査に出る。
**⚠ 新機能の欄では研究に触れない(2026-09-22 改訂)。** 短い箇条書きの中で研究と「連続」を並べると、研究が連続を支えているように読める。出典と「連続はこのアプリの選択」という説明は説明文に任せる。

### 英語

```
• Graduation now means doing everything on your list 66 days in a row. Graduates get a certificate to keep and share.
• A new look: your words set like a letter, your day laid out as a timetable.
• A clearer plan screen: all three plans unlock the same things. You set the price.
• Fixed: the graduation screen stayed open after you managed your subscription.
```

### 日本語

```
・卒業の条件が変わりました。その日のルーティンをすべてやり切る日が66日連続したら、卒業です。卒業した人には、手元に残して共有できる卒業証書を渡します。
・見た目を新しくしました。あなたの言葉は手紙のように、一日は時刻表のように並びます。
・プランの画面を分かりやすくしました。3つのプランでできることは同じです。値段はあなたが決めます。
・修正:購読の管理から戻ったとき、卒業の画面が開いたまま残っていた問題を直しました。
```

## 次のバージョン(1.0.2以降)で直すこと **【決定】2026-09-23**(→ 2026-10-13 に上の説明文へ反映済み)

### 研究の言い方を弱める

**問題:** 説明文の `Why 66?` / 「66という数字は…」が **`research found` / 「研究上の中央値」** と書いており、分野全体の結論のように読める。 実際は**1本の研究**の、しかも**曲線に当てはまった参加者の中での中央値**(ユーザー指摘 2026-09-23)。

**確認した事実**(一次情報。出典の書き方自体は正しい):

- Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W., & Wardle, J. (2010). *How are habits formed: Modelling habit formation in the real world.* **European Journal of Social Psychology, 40(6), 998–1009**
- 96人が12週間、毎日同じ場面で1つの行動(食事・飲み物・運動)を繰り返した
- 自動性が頭打ち(95%到達)になるまでは **18〜254日**。66日はその**中央値**
- 測っているのは**自己申告の自動性**であって、「習慣が完成した」という判定ではない

**⚠ 1.0.1 の審査中に説明文を変えると審査から引き上げになる**ため、この版では直さない(ユーザー判断)。

**英語(差し替え案):**

```
Why 66? In one study where people repeated a daily action, the median time
to reach peak automaticity was 66 days — with individuals ranging from 18 to
254 (Lally et al., 2010). The "in a row" is our choice, not the research's —
so that graduating means something. Yes, that makes it a streak. You just
never see a counter, and missing a day costs you nothing but the count.
```

**日本語(差し替え案):**

```
66という数字は、ある研究から取りました。毎日同じ場面で行動を繰り返した人たちが、
意識しなくてもできると感じるまでに、中央値で66日かかっています
(Lally ら, 2010。個人差は18〜254日)。「連続」は研究ではなく、このアプリの選択です。
卒業に意味を持たせるために。つまり、卒業の条件はたしかに連続記録です。
ただ、それを眺める画面はなく、途切れても失うのは数だけです。
```

**⚠ プロモーションテキストは審査なしで差し替えられる。**同じ理由で「研究では」と言い切っている部分があれば、そちらは先に直してよい。

### アプリ内の日本語(コミット済み・ビルド未反映)

`c57317b` で「捨てられるために作られています」を「使わなくなることを目指して作られています」に直したが、**EAS の無料枠切れで 1.0.1 のビルドに入っていない**(ビルド19が提出済み)。枠は 2026-10-01 に戻る。次のビルドで自動的に入る。

---

## 提出前の確認

- [ ] アイコンが Expo デフォルトでないこと
- [ ] Sandbox でテスト購入を1回通してあること
- [ ] 復元(Restore)を実機で押して、結果が画面に出ること
- [ ] サブスク3商品が「送信準備完了」になっていること
- [ ] 有料App契約が有効であること
