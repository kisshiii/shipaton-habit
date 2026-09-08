# App Store Connect に貼る文言

*作成: 2026-09-07 / 確度: **【暫定】**(提出前に本人が読み直すこと)*

⚠ ここは**下書き置き場**であって決定の記録ではない。仕様の判断は `spec.md` に書く。

---

## 名前・サブタイトル

| 欄 | 値 | 文字数 |
| --- | --- | --- |
| App Name (30) | `KATSU` | 5 |
| Subtitle (30) | `Habits that end` | 15 |

**⚠ サブタイトルの役目は「トンカツ避け」**(spec §1)。 英語圏で `katsu` は料理名なので、検索結果の1行目で誤認を潰す。 変えるなら「これは食べ物ではない」が一目で分かる案にすること。

## Promotional Text (170)

```
Write what you would say to yourself on the day you decided to change. When you skip, that is what you hear. Stay long enough and this app tells you to leave.
```

## Keywords (100, カンマ区切り・スペースなし)

```
habit,routine,streak,discipline,motivation,accountability,reminder,morning,daily,quit,graduate
```

**⚠ アプリ名と重複する語を入れない**(Apple が別途索引する)。 `katsu` は入れないこと ── 料理の検索結果に混ざりに行くことになる。

## Description

```
KATSU is a habit app built to make itself unnecessary.

(Not the cutlet. This one has no recipes in it.)

Set the routines you want to keep. When the time comes and you have not done
one, your phone tells you so — using words you wrote yourself, on the day you
decided to change. Not a template. Not encouragement written by a stranger.
Your own sentence, handed back to you at the moment you are ignoring it.

WHY IT ENDS

Most habit apps need you to keep needing them. Streaks you are afraid to
break, notifications that pull you back, a small guilt when you leave. Their
success and yours point in opposite directions.

This one is built the other way. Keep your routines on your own for long
enough and KATSU asks whether you still need it, and shows you where the
cancel button is. Leaving is the point.

HOW IT WORKS

• Add a few daily routines — a time and a thing to do
• Write what you would say to yourself for skipping one
• Miss one, and that is what arrives
• Check it off any time that day. There is no late

WHAT IT WILL NOT DO

• No streaks to protect, no scores, no charts
• Nothing is ever called a failure
• No account, no sign-up, no cloud

WHAT YOU WRITE STAYS ON YOUR PHONE

Your words are never uploaded, never analysed, never logged. There is no
server to send them to. If you delete the app, they are gone — which is the
honest trade for never handing them over.

FREE AND PAID

Everything in the core loop is free: routines, checking off, notifications,
graduation. The paid plan adds more than one set of words, and different
words for different routines.

You choose the price. The plans are identical — the question is what this is
worth to you. Cancel any time from Settings, and if you graduate, you should.
```

## Review Notes(審査ノート)

```
No account or sign-in is required. Everything works on first launch.

Onboarding asks for one routine and one line of text; any values work.
Notifications are local only. To see one without waiting, add a routine a
minute or two ahead and leave the app.

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

PRIVACY
The app has no backend. User-written text never leaves the device. The only
network traffic is the RevenueCat SDK for subscription status.
```

## 日本語ロケール(ASC に「日本語」を追加してから貼る)

**⚠ アプリ内が日本語になったので、ストアページも日本語にすること。** 英語ページのままだと、日本語で動くアプリを英語の説明で売ることになる。

| 欄 | 値 | 文字数 |
| --- | --- | --- |
| App Name (30) | `KATSU` | 5 |
| Subtitle (30) | `終わるための習慣アプリ` | 11 |

**⚠ 日本語では「トンカツ避け」は不要。**漢字の「喝」が想起されるため誤認が起きない。 代わりにサブタイトルは**卒業モデルそのもの**を出す ── 日本のストアで他と一番違うのはそこ。

### Promotional Text (170)

```
変わると決めた日の自分の言葉を書く。サボった朝に届くのは、その言葉です。続けば、このアプリは「もう要らないんじゃないか」と自分から聞いてきます。
```

### Keywords (100, カンマ区切り・スペースなし)

```
習慣,習慣化,ルーティン,朝活,早起き,継続,目標,自己管理,リマインダー,通知,毎日,卒業,やる気,三日坊主
```

**⚠ `KATSU` `喝` を入れないこと。**アプリ名は Apple が別途索引する。

### Description

```
KATSU は、あなたに捨てられるために作られた習慣アプリです。

続けたいことを、時刻とともに登録します。時間が過ぎてもやっていないとき、
スマホがそれを伝えます ── ただし、こちらが用意した言葉ではありません。
変わると決めたその日に、あなた自身が書いた一文です。

テンプレートではない。知らない誰かが書いた励ましでもない。
自分の言葉が、それを無視している自分に返ってくる。

■ なぜ「終わる」のか

多くの習慣アプリは、あなたに必要とされ続けなければ成り立ちません。
途切れさせたくない連続記録、呼び戻す通知、離れるときの小さな罪悪感。
アプリの成功とあなたの成功が、正反対を向いています。

KATSU は逆側に賭けています。自分の力で続けられる日が十分に積み上がったら、
「もう要らないのでは」と聞き、解約の場所を案内します。離れることが目的です。

■ 使い方

・毎日の予定を数件だけ登録する(時刻とやること)
・やらなかった自分に、何と言ってほしいかを書く
・時間が過ぎていたら、それが届く
・チェックはその日のうちなら何時でもいい。遅刻という概念はありません

■ しないこと

・守るべき連続記録も、点数も、グラフもありません
・できなかったことを「失敗」と呼びません
・アカウントも、サインアップも、クラウドもありません

■ 書いた言葉は端末から出ません

送信も、解析も、ログも一切ありません。送る先のサーバーが存在しないからです。
アプリを削除すれば消えます ── 誰にも預けない代わりの、正直な取引です。

■ 無料と有料

中心の体験はすべて無料です。登録、チェック、通知、卒業まで。
有料で増えるのは、言葉を複数持てることと、ルーティンごとに出し分けられることだけ。

値段はあなたが決めます。3つのプランは中身が同じで、違うのは金額だけ。
問いは「これにいくらの価値があるか」です。解約はいつでも設定から。
そして卒業したなら、解約すべきです。
```

### Review Notes(日本語ロケールでも英語で提出してよい)

英語版と同じものを使う。**審査担当者は英語で読む。**

## App Privacy(データ収集の申告)

- **Data Not Collected** で申告する。端末外に出るのは RevenueCat の購読状態のみで、 これは App Privacy 上の「収集」に当たらない扱いで問題ないが、 **RevenueCat 側の申告要件を提出前に確認すること 【未確認】**

## スクリーンショット

**⚠ 実機から撮る。6.9インチ(iPhone 16 Pro Max 等)が必須サイズ。**

撮る順に:

1. **Today 画面** ── 何をする日なのかが一目で分かる。ここが主戦場
2. **通知が届いた画面** ── 自分の言葉が出ている状態。**このアプリの主張そのもの**なので、 ここで見せる文言だけは本気で書くこと
3. **Your KATSU** ── 書く場所。`For: All routines` の行まで入れる
4. **卒業モーダル** ── `You might not need this anymore.` 他社が絶対に出さない画面
5. **ペイウォール** ── 価格を自分で選ぶところ

**⚠ 順番に意味がある。**1〜2で「何のアプリか」、4で「なぜ他と違うか」を出す。 逆にすると、ただの習慣アプリのスクショに見える。

## 提出前の確認

- [ ] アイコンが Expo デフォルトでないこと
- [ ] Sandbox でテスト購入を1回通してあること
- [ ] 復元(Restore)を実機で押して、結果が画面に出ること
- [ ] サブスク3商品が「送信準備完了」になっていること
- [ ] 有料App契約が有効であること
