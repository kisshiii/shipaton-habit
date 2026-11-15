/**
 * 日本語の文言。
 *
 * ⚠ **英語からの直訳にしないこと。**「喝」は罰でも罵倒でもなく、眠っている者への一喝。
 *   丁寧にしすぎると力が抜け、砕けすぎると人格否定に寄る。
 *   **説明はですます、言い切るところは短く**、という配分で書いてある。
 *
 * ⚠ Tier 1 の文面(`selfHarm`)だけは通常のトーンから外す。
 *   ここは責めない・驚かせない・説教しない(spec §2)。
 *
 * ⚠ 「失敗」「サボった」「途切れた」を UI の地の文に書かないこと
 *   (CLAUDE.md UX禁止事項)。ユーザー自身が自分の言葉で書く分には自由。
 */

import type { Copy } from '@/i18n/en';

export const ja: Copy = {
  tabs: {
    today: '今日',
    routines: 'ルーティン',
    katsu: '自分の言葉',
  },

  today: {
    title: '今日',
    doneHint: '完了',
    notDoneHint: 'まだ',
    toggleHint: 'ダブルタップでチェックを付け外しします',
    progress: (done: number, total: number) => `${total}件のうち${done}件`,
    allDone: '今日の分は全部終わりました。',
    dayOf: (day: number, goal: number) => `${goal}日のうち${day}日`,
    startsOn: (date: string) => `${date}が1日目です。それまでのチェックは日数に入りません。`,
    rests: (used: number, max: number, window: number) => `休み(直近${window}日) ${used}/${max}回`,
    unbroken: (days: number) => `休まず${days}日`,
    yesterdayDone: (days: number) => `昨日は全部やり切りました。これで${days}日です。`,
    yesterdayRest: (left: number, window: number) =>
      left > 0 ? `昨日は休みでした。直近${window}日で、あと${left}回休めます。` : '昨日は休みでした。',
    restartNotice: (rests: number, window: number) =>
      `今日から日数を数え直します。休みが直近${window}日で${rests}回までなら、日数はそのまま続きます。`,
    fallbackMeta: '通知がオフなので、ここに表示しています',
    emptyTitle: 'まだルーティンがありません',
    emptyBody: '「ルーティン」タブで追加してください。',
    noWordsTitle: 'まだ言葉がありません',
    noWordsBody: '「自分の言葉」に書くまで、通知は届きません。',
    notificationsTitle: '通知がオフです',
    notificationsBody: 'オンにすると、ルーティンの時刻を過ぎたときに自分の言葉が届きます。',
    notificationsAction: 'オンにする',
    rule: (days: number, rests: number, window: number) =>
      `全部やり切った日を数えて、${days}日で卒業です。休みは直近${window}日で${rests}回まで。`,
  },

  routines: {
    title: 'ルーティン',
    emptyTitle: 'まだありません',
    emptyBody: '毎日同じ時刻にやることを登録します。最初はひとつで十分です。',
    fullTitle: '3件までです',
    fullBody: '少ないほど、毎日やり切りやすくなります。',
    addTitle: 'ルーティンを追加',
    editTitle: 'ルーティンを編集',
    time: '時刻',
    titlePlaceholder: '水をコップ一杯飲む',
    add: '追加する',
    save: '保存',
    cancel: 'やめる',
    deleteAction: 'このルーティンを削除',
    certificate: '卒業証書を見る',
    missingTitle: 'やることを書いてください',
    missingTitleBody: 'その時刻に何をするかを書いてください。',
    limitTitle: '3件までです',
    limitBody: '少ないほど、毎日やり切りやすくなります。',
    removeTitle: 'このルーティンを削除しますか？',
    remove: '削除',
    dailyHint:
      '毎日やることを選んでください。週に数回のことは、毎日できる形にします（例：ジム → 毎日10分体を動かす）。',
    changeNote: 'あとからルーティンを足す・消すと、日数は数え直しになります。名前と時刻は変えても数え直しません。',
    restartTitle: '日数を数え直しますか？',
    restartBody: (days: number, goal: number) =>
      `いま${goal}日のうち${days}日です。ルーティンを足す・消すと、日数は0から数え直しになります。`,
    restartConfirm: '変える',
  },

  katsu: {
    title: '自分の言葉',
    meaning: '',
    intro: 'ルーティンの時刻を過ぎてもやっていないとき、この言葉が通知で届きます。自分に向けて書いてください。',
    writeTitle: '言葉を書く',
    editTitle: '言葉を直す',
    guardrail: '行動を責めるのはかまいません。自分という人間は否定しないでください。',
    placeholder: '変わるって、自分で決めたはずだろう。',
    save: '保存する',
    saveEdit: '保存',
    cancel: 'やめる',
    edit: '編集',
    delete: '削除',
    locked: 'ロック中(消えていません)',
    forPrefix: '対象:',
    allRoutines: 'すべてのルーティン',
    anotherTitle: 'もうひとつ書く',
    anotherBody: '3つまでは無料です。4つ目からは有料プランで使えます。',
    anotherAction: 'プランを見る',
    emptyTitle: 'まだ何も書いていません',
    emptyBody: 'その時刻の自分に、何と言いますか。',
    softGuardTitle: 'この言葉は、自分という人間を責めています',
    softGuardBody:
      '厳しいのはかまいません。今日やらなかったことと、今からやることに向けて書き直してみませんか。',
    softGuardRewrite: '書き直す',
    softGuardKeep: 'このまま保存',
    deleteTitle: 'この言葉を削除しますか？',
    deleteBody: 'また新しく書けます。',
    pickerTitle: 'どのルーティンに出しますか？',
    rotation: '同じルーティンに言葉が複数あるときは、日ごとにどれかひとつが届きます。',
    more: 'その他',
  },

  paywall: {
    title: 'このアプリは、あなたにとって月いくらの価値がありますか？',
    sameTitle: '3つとも、できることは同じです',
    sameItems: ['言葉を4つ以上持てる', 'ルーティンごとに言葉を出し分ける'],
    unreachable: 'App Store に接続できませんでした。あとでもう一度お試しください。ほかの機能はそのまま使えます。',
    noOffering: 'プランがまだ用意されていません。ほかの機能はそのまま使えます。',
    noProducts: 'App Store からプランを読み込めませんでした。ほかの機能はそのまま使えます。',
    perMonth: '／月',
    notNow: '今はしない',
    restore: '購入を復元',
    restoreNothing: 'この Apple アカウントで復元できる購入はありません。',
    restoreFailed: 'App Store に接続できませんでした。あとでもう一度お試しください。',
    purchaseFailed: '購入できませんでした。請求されている場合は「購入を復元」を押してください。',
    purchaseUnconfirmed: 'お支払いは完了していますが、まだ反映されていません。少し待ってから「購入を復元」を押してください。',
    renewal:
      '解約するまで毎月自動で更新されます。解約は「設定」→ 自分の名前 →「サブスクリプション」から、次の更新日の24時間前までに。解約しても書いた言葉は消えません。',
    terms: '利用規約',
    privacy: 'プライバシーポリシー',
    tokushoho: '特定商取引法に基づく表記',
  },

  graduation: {
    /** ⚠ 改行の位置を決めておく。決めないと変なところで折り返す */
    title: '習慣になったなら、\nもう課金は要りません。',
    note: 'サブスクを解約しても、アプリはそのまま無料で使えます。3つ目までの言葉も届き続けます。',
    titleFree: 'ここで終えても、\n続けてもかまいません。',
    noteFree: 'アプリはこのまま使えます。要らなくなったら、いつでも削除してください。',
    end: 'サブスクを解約する',
    notYet: 'まだ続ける',
    close: '閉じる',
    certificate: '卒業証書を受け取る',
  },

  certificate: {
    eyebrow: '卒業証書',
    /** ⚠ 改行の位置を決めておく。決めないと「やり切りまし / た。」と折り返す(証書は人に見せる画像) */
    headline: (days: number) => `${days}日、\nやり切りました。`,
    habitsLabel: '身につけたこと',
    started: '始めた日',
    graduated: '卒業した日',
    footer: 'KATSU',
    note: '画像はこの端末の中で作ります。言葉は載りません。共有しない限り、どこにも送られません。',
  },

  milestone: {
    title: (day: number, goal: number) =>
      day === 1 ? '1日目。' : day * 2 === goal ? '折り返しです。' : `${day}日。`,
    body: (day: number, goal: number) =>
      `${goal}日のうち${day}日、やり切りました。あと${goal - day}日です。`,
    close: '今日に戻る',
  },

  widget: {
    startsOn: (date: string) => `${date}が1日目`,
  },

  notifications: {
    done: 'やった ✓',
    snooze: (minutes: number) => `${minutes}分後にもう一度`,
  },

  quickActions: {
    title: (time: string, title: string) => `${time} ${title}`,
  },

  share: {
    milestoneEyebrow: 'KATSU',
    habitsLabel: '毎日やっていること',
    wordsEyebrow: '自分に書いた言葉',
    milestoneAction: 'カードにして共有',
    wordsAction: 'カードにして共有',
    share: '共有する',
    close: '閉じる',
    note: '画像はこの端末の中で作ります。共有しない限り、どこにも送られません。',
  },

  onboarding: {
    /** ⚠ 改行の位置を決めておく。決めないと「一 / 声。」と折り返す */
    tagline: '忘れている自分を、\nいまに戻す一声。',
    intro: '決めた時刻を過ぎたら、自分で書いた言葉が届きます。',
    introNote: 'KATSU は、習慣が身についたら卒業するアプリです。',
    start: 'はじめる',
    goalBody: '例から選ぶこともできます。',
    goals: [
      { label: '朝型になる', time: '06:30', title: '起きたら、水を一杯飲む' },
      { label: '毎日体を動かす', time: '07:30', title: '朝ごはんの後、10分歩く' },
      { label: '早く寝る', time: '22:30', title: '22時半になったら、スマホを別の部屋に置く' },
      { label: '毎日学ぶ', time: '21:00', title: '夕食の後、10分勉強する' },
    ],
    ifThen: '「〜したら、〜する」の形で書きます。やる気のない日でもできるくらい小さく。',
    startTitle: '1日目',
    startToday: '今日から',
    startTomorrow: '明日から',
    startNewYear: '1月1日から',
    sealEyebrow: 'やりたくない日の自分へ',
    sealHold: '長押しで封をする',
    sealNote: 'これを読むのは、自分だけです。',
    sealHint: 'ダブルタップで封をします',
    back: '戻る',
    titlePlaceholder: '起きたら、水を一杯飲む',
    routineTitle: '毎日ひとつ、同じ時刻に',
    wordsTitle: '自分への言葉を書く',
    wordsBody:
      '時刻を過ぎてもやっていないとき、この言葉が通知で届きます。',
    wordsRequired: '何か書いてください。',
    titleRequired: 'その時刻に何をするかを書いてください。',
    notificationsTitle: '通知について',
    notificationsBody:
      '時刻を過ぎてもチェックが付いていないと、言葉が通知で届きます。チェックを付ければ、その分は届きません。',
    notificationsNote:
      '通知がオフだと、言葉はアプリを開いたときにだけ表示されます。',
    allow: '通知を許可する',
    notNow: '今はしない',
    doneBody: '言葉はこの端末の外に出ません。',
    begin: 'はじめる',
    trial: '試しに通知を送る',
    trialSent: '送りました。届くとこう見えます。',
    next: '次へ',
  },

  /**
   * ⚠ ここだけ通常のトーンから外す。責めない・驚かせない・説教しない。
   *   「検知した」と読める書き方をしないこと。静的判定であり見逃しは大量にある。
   */
  selfHarm: {
    blocked: 'この言葉は、通知として保存できません。',
    suggestion: '朝7時の自分にではなく、誰かに直接伝えたほうがいいのかもしれません。',
    helpline: '相談できる窓口を探す',
    emergency: '緊急のときは、お住まいの地域の緊急番号にかけてください。',
  },
};
