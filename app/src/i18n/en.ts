/**
 * 英語の文言。**こちらが原本。**
 *
 * ⚠ ここに文言を足したら `ja.ts` にも必ず足すこと。型で強制されるので、
 *   片方だけ書くとコンパイルが通らない。
 *
 * ⚠ 「未完了を失敗として扱わない」(CLAUDE.md UX禁止事項)。
 *   `failed` `missed` `streak broken` のような語を入れないこと。
 */

export const en = {
  tabs: {
    today: 'Today',
    routines: 'Routines',
    katsu: 'Your KATSU',
  },

  today: {
    title: 'Today',
    /** ⚠ VoiceOver 用。画面には出ない */
    doneHint: 'Done',
    notDoneHint: 'Not done yet',
    toggleHint: 'Double-tap to check or uncheck',
    /** ⚠ 件数は文の中に置く。数字だけを大きく出して煽らない */
    progress: (done: number, total: number) => `${done} of ${total} done`,
    allDone: 'All done for today.',
    /**
     * 卒業までの進み具合(plan §4)。数字はやり切った日の数。
     * ⚠ 休みを「missed」「lost」と言わない。残りが0でも警告にしない
     */
    dayOf: (day: number, goal: number) => `Day ${day} / ${goal}`,
    /** 始める日を先にした人(plan §8)。その日まで日数を出さない */
    startsOn: (date: string) => `Day 1 is ${date}. Checks before then don’t count.`,
    rests: (used: number, max: number, window: number) =>
      `Rest days (last ${window} days): ${used} of ${max}`,
    unbroken: (days: number) => (days === 1 ? '1 day without a rest' : `${days} days without a rest`),
    /**
     * その日最初に開いたときの一言(plan §8)。⚠ 休みを責めない。残りが0でも警告にしない
     */
    yesterdayDone: (days: number) =>
      `Yesterday: all done. That’s ${days} ${days === 1 ? 'day' : 'days'}.`,
    /** ⚠ 残りが0でも警告にしない。事実だけを言う */
    yesterdayRest: (left: number, window: number) =>
      left > 0
        ? `Yesterday was a rest day. You have ${left} left in the last ${window} days.`
        : 'Yesterday was a rest day.',
    /**
     * 休みで数え直した後、次に開いたとき1回だけ出す(plan §4)。
     * ⚠ 「failed」「reset」「lost」と言わない。静かに、事実と次のことだけ
     */
    restartNotice: (rests: number, window: number) =>
      `The count starts over today. Up to ${rests} rest days in any ${window} keep it going.`,
    fallbackMeta: 'Notifications are off, so your words are shown here.',
    emptyTitle: 'No routines yet',
    emptyBody: 'Add one in the Routines tab.',
    noWordsTitle: 'No words yet',
    noWordsBody: 'No notifications are sent until you write something in Your KATSU.',
    notificationsTitle: 'Notifications are off',
    notificationsBody: 'Turn them on to get your words when a routine’s time passes.',
    notificationsAction: 'Turn on',
  },

  routines: {
    title: 'Routines',
    emptyTitle: 'Nothing yet',
    emptyBody: 'Add something you’ll do at the same time every day. One is enough to start.',
    fullTitle: 'That’s three',
    fullBody: 'Three is the limit. The fewer you have, the easier it is to finish every day.',
    addTitle: 'Add a routine',
    editTitle: 'Edit routine',
    time: 'Time',
    titlePlaceholder: 'Drink a glass of water',
    add: 'Add routine',
    save: 'Save',
    cancel: 'Cancel',
    deleteAction: 'Delete this routine',
    graduate: 'I don’t need this anymore',
    missingTitle: 'Add what you’ll do',
    missingTitleBody: 'Write what you’ll do at that time.',
    limitTitle: 'That’s three',
    limitBody: 'Three is the limit. The fewer you have, the easier it is to finish every day.',
    removeTitle: 'Delete this routine?',
    remove: 'Delete',
    /** ⚠ 曜日指定は入れない。週に数回のことは毎日の形に言い換えてもらう(plan §2) */
    dailyHint:
      'Pick things you’ll do every day. For something you do a few times a week, make a daily version: “gym” becomes “move for 10 minutes.”',
    changeNote: 'Adding, deleting or renaming a routine later starts the count over.',
    /**
     * ルーティンを変えると数え直しになるときの確認(plan §1・§4)。
     * ⚠ 「リセット」「失う」と言わない。何が起きるかを事実だけ伝え、決めるのは本人
     */
    restartTitle: 'Start the count over?',
    restartBody: (days: number, goal: number) =>
      `You’re on day ${days} of ${goal}. Changing your routines starts the count over.`,
    restartConfirm: 'Change it',
  },

  katsu: {
    title: 'Your KATSU',
    intro:
      'When a routine’s time passes and it isn’t done, these words arrive as a notification. Write them to yourself.',
    writeTitle: 'Write your words',
    editTitle: 'Edit your words',
    guardrail: 'Be as hard on what you did as you like. Leave who you are out of it.',
    placeholder: 'You said you’d change.',
    save: 'Save',
    saveEdit: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    locked: 'Locked. Not deleted.',
    forPrefix: 'For:',
    allRoutines: 'All routines',
    anotherTitle: 'Add another',
    anotherBody: 'One is free. Two or more come with the paid plan.',
    anotherAction: 'See plans',
    emptyTitle: 'Nothing written yet',
    emptyBody: 'What do you want to hear at that moment?',
    /**
     * Tier 2 ソフトガード(spec §2)。人格・存在を否定する言葉のとき、保存の前に一度だけ聞く。
     * ⚠ 止めない・説教しない。言い換えの例文をこちらで書かない(届くのは本人の言葉だけ)
     */
    softGuardTitle: 'This one goes after you as a person',
    softGuardBody:
      'Being harsh is fine. Try aiming it at what you skipped today and what to do now.',
    softGuardRewrite: 'Rewrite',
    softGuardKeep: 'Keep it',
    deleteTitle: 'Delete these words?',
    deleteBody: 'You can always write new ones.',
    pickerTitle: 'Which routine is this for?',
    /** ⚠ 日替わりで選ばれることを伝える。黙っていると届かない言葉があるように見える */
    rotation: 'If a routine has more than one set of words, a different one comes each day.',
    /** ⚠ VoiceOver 用。「···」ボタンの名前 */
    more: 'More',
  },

  paywall: {
    /** ⚠ 答えるのはユーザー。主語を「あなた」、単位を「月」にして値札の質問に見せない */
    title: 'What’s this app worth to you each month?',
    /** ⚠ 価格の上に一度だけ言う。これが無いと3つの価格が松竹梅に見える */
    sameTitle: 'All three plans include the same features',
    sameItems: ['More than one set of words', 'Different words for different routines'],
    unreachable: 'Couldn’t reach the App Store. Try again later. The rest of the app works as usual.',
    /** ⚠ RevenueCat に current の Offering が無い。ダッシュボード側の設定漏れ */
    noOffering: 'Plans aren’t available yet. The rest of the app works as usual.',
    /** ⚠ Offering はあるが商品が降りてこない。App Store Connect 側の状態 */
    noProducts: 'Couldn’t load the plans from the App Store. The rest of the app works as usual.',
    perMonth: '/ month',
    notNow: 'Not now',
    restore: 'Restore',
    restoreNothing: 'There’s nothing to restore for this Apple Account.',
    restoreFailed: 'Couldn’t reach the App Store. Try again later.',
    /**
     * ⚠ 課金されたかどうかを断定しないこと。例外の中身までは分からない。
     *   復元という手を示すほうが誠実で、実際に役に立つ。
     */
    purchaseFailed: 'The purchase didn’t go through. If you were charged, tap Restore.',
    /** ⚠ 支払いは済んでいる。謝るのはこちら側で、ユーザーの操作は間違っていない */
    purchaseUnconfirmed:
      'Your payment went through, but it hasn’t been applied yet. Tap Restore in a moment.',
    /**
     * ⚠ 3.1.2 の必須表示。解約の場所と期限を具体的に書く。
     *   「言葉は消えない」は spec §2(課金が切れても書いた言葉を消さない)の事実どおり。
     */
    renewal:
      'Renews monthly until you cancel. Cancel at least 24 hours before renewal in Settings → your name → Subscriptions. Your words stay if you cancel.',
    terms: 'Terms of Use',
    privacy: 'Privacy Policy',
  },

  graduation: {
    /**
     * 卒業した人への問い(2026-11-03 に書き直し)。何を勧めているかを1文で分かるようにする。
     * ⚠ 購読している人と、していない人で分ける。無課金の人に「課金は要らない」と言っても意味がない
     */
    title: 'If it’s a habit now, you don’t need to pay anymore.',
    note: 'Cancel your subscription and the app keeps working for free. Your first set of words keeps arriving.',
    titleFree: 'You can stop here or keep going.',
    noteFree: 'The app keeps working as it is. Delete it whenever you like.',
    end: 'Cancel subscription',
    notYet: 'Keep going',
    close: 'Close',
    stillWorks: 'Either way, the app keeps working.',
    freeNote: 'Delete the app whenever you like.',
    certificate: 'Get your certificate',
    /**
     * ⚠ 卒業前にやめようとした人向け。**卒業とは呼ばない**が、責めない・引き止めない。
     *   やめるかどうかは本人が決める
     */
    leaveTitle: 'You can stop anytime.',
    /** ⚠ 「in a row」と言わない。休みがあるので連続ではない(plan §3) */
    leaveBody: (days: number, rests: number, window: number) =>
      `You graduate after finishing everything on ${days} days (up to ${rests} rest days in any ${window}). Stopping before then isn’t graduating, but it’s your call. Your words won’t be deleted.`,
  },

  /**
   * ⚠ 祝福するが、可愛くしない。感嘆符・絵文字・「Congratulations!」を入れない。
   * ⚠ 採点に見える語(score / rank / streak)を入れない。
   */
  certificate: {
    eyebrow: 'Certificate of graduation',
    /** ⚠ 卒業した人にしか出ない。事実だけを言う */
    headline: (days: number) => `${days} days. All done.`,
    habitsLabel: 'Habits',
    started: 'Started',
    graduated: 'Graduated',
    footer: 'KATSU',
    note: 'The image is made on this device. Your words aren’t on it, and it isn’t sent anywhere unless you share it.',
  },

  /**
   * 節目のお祝い(plan §4)。卒業画面と同じ紺の全面表示を、それぞれ一生に1回だけ。
   * ⚠ 祝福するが、可愛くしない。感嘆符・絵文字・「Congratulations!」を入れない
   */
  milestone: {
    title: (day: number, goal: number) =>
      day === 1 ? 'Day 1.' : day * 2 === goal ? 'Halfway.' : `${day} days.`,
    body: (day: number, goal: number) =>
      `${day} of ${goal} days done. ${goal - day} to go.`,
    close: 'Back to today',
  },

  /** ホーム画面・ロック画面のウィジェット(plan §7-6)。⚠ 言葉は載せない */
  widget: {
    startsOn: (date: string) => `Day 1 is ${date}`,
  },

  /** 通知を長押ししたときのボタン(1.0.3、plan §8 追加) */
  notifications: {
    done: 'Done ✓',
    snooze: (minutes: number) => `Again in ${minutes} min`,
  },

  /**
   * アイコンを長押ししたときの項目(1.0.3、plan §8 追加)。今日まだのルーティンだけ。
   * ⚠ ルーティン名だけを出す。書いた言葉(KatsuMessage)は入れない。全部済んだら何も出さない
   */
  quickActions: {
    title: (time: string, title: string) => `${time} ${title}`,
  },

  /**
   * 共有カード(plan §7-4)。⚠ 祝福するが、可愛くしない。感嘆符・絵文字を入れない
   */
  share: {
    milestoneEyebrow: 'KATSU',
    habitsLabel: 'Every day',
    wordsEyebrow: 'What I wrote to myself',
    /** 節目の画面のボタン */
    milestoneAction: 'Share a card',
    /** Your KATSU の「···」の項目 */
    wordsAction: 'Share as a card',
    share: 'Share',
    close: 'Close',
    note: 'The image is made on this device and isn’t sent anywhere unless you share it.',
  },

  onboarding: {
    tagline: 'Push yourself, in your own words.',
    intro:
      'You’ll write a few words to yourself for the days you don’t feel like it. They arrive when you skip.',
    introNote: 'KATSU is an app you graduate from once the habit sticks.',
    start: 'Start',
    /**
     * 何を変えたいか(plan §8)。選んだものの例を次の段に入れておく。
     * ⚠ これはルーティンの例。言葉の例はアプリが用意しない(spec §1)
     */
    goalTitle: 'What do you want to change?',
    goalBody: 'Pick one. You can change the details next.',
    goals: [
      { label: 'Become a morning person', time: '06:30', title: 'After I wake up, drink a glass of water' },
      { label: 'Move every day', time: '07:30', title: 'After breakfast, walk for 10 minutes' },
      { label: 'Go to bed earlier', time: '22:30', title: 'At 22:30, put my phone in another room' },
      { label: 'Learn every day', time: '21:00', title: 'After dinner, study for 10 minutes' },
      { label: 'Something else', time: '07:00', title: '' },
    ],
    /** 実行意図(「〜したら、〜する」)と、小さく始めること(plan §8) */
    ifThen: 'Write it as “After I…, I’ll…”. Keep it small enough to do on a bad day.',
    startTitle: 'When is Day 1?',
    startBody: 'Picking tomorrow gives you tonight to get ready.',
    startToday: 'Today',
    startTomorrow: 'Tomorrow',
    /** 12月の間だけ出す */
    startNewYear: 'January 1',
    ruleTitle: 'How the 66 days work',
    /** 3行に分けて見せる。1つの段落にすると読まれない */
    ruleLines: (days: number, rests: number, window: number) => [
      `Each day you finish everything counts. At ${days}, you graduate.`,
      `You can rest up to ${rests} days in any ${window}. Rest more than that and the count starts over.`,
    ],
    /** 封をする(plan §8)。⚠ 約束の相手はアプリではなく未来の自分 */
    sealEyebrow: 'To me, on a day I don’t feel like it',
    sealHold: 'Hold to seal',
    sealNote: 'Only you will ever read this.',
    /** VoiceOver では長押しの代わりにダブルタップで封ができる */
    sealHint: 'Double-tap to seal',
    back: 'Back',
    /** 「〜したら、〜する」の形の例(言葉ではなく、ルーティンの例) */
    titlePlaceholder: 'After I wake up, drink a glass of water',
    routineTitle: 'One thing, same time every day',
    wordsTitle: 'Write your words',
    wordsBody:
      'When the time passes and it isn’t done, this arrives as a notification.',
    wordsRequired: 'Write something to continue.',
    titleRequired: 'Write what you’ll do at that time.',
    notificationsTitle: 'Notifications',
    notificationsBody:
      'If a routine’s time passes and it isn’t checked, your words arrive as a notification. Check it off and that one stays quiet.',
    notificationsNote:
      'With notifications off, your words only show when you open the app.',
    allow: 'Allow notifications',
    notNow: 'Not now',
    doneTitle: 'You’re all set',
    doneBody: 'Your words stay on this device.',
    doneNote: 'They aren’t sent anywhere, and no one else can read them.',
    begin: 'Begin',
    /** 試しに今、自分の言葉を通知で届ける(plan §7-5) */
    trial: 'Send a test notification',
    trialSent: 'Sent. This is how it will look.',
    next: 'Next',
  },

  /**
   * ⚠ Tier 1 で保存を止めたときの文面。
   *   責めない・驚かせない・説教しない。「危機を検知した」と読める書き方をしない。
   */
  selfHarm: {
    blocked: 'This one can’t be saved as a notification.',
    suggestion: 'It might be worth saying to someone directly, rather than to yourself at 7am.',
    helpline: 'Find a helpline',
    emergency: 'In an emergency, call your local emergency number.',
  },
};

/**
 * 文言の型。**英語版が原本**で、他の言語はこの形に従う。
 * キーを足し忘れるとコンパイルが通らない。
 */
export type Copy = typeof en;
