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
    toggleHint: 'Double tap to mark it done or undone',
    progress: 'done',
    emptyTitle: 'Nothing scheduled',
    emptyBody: 'Add your first routine in the Routines tab. Today fills itself in from there.',
    noWordsTitle: 'Nothing to say yet',
    noWordsBody: 'Notifications stay quiet until you write your own words in Your KATSU.',
    notificationsTitle: 'Let your words reach you',
    notificationsBody:
      'Without notifications you have to remember to open this app. That is the one thing it was built to spare you.',
    notificationsAction: 'Turn on notifications',
  },

  routines: {
    title: 'Routines',
    emptyTitle: 'Nothing yet',
    emptyBody: 'Add something you will do every day at the same time. One is enough to start.',
    fullTitle: 'Start with a few',
    fullBody: 'You can add more after you graduate.',
    addTitle: 'Add a routine',
    editTitle: 'Edit routine',
    time: 'Time',
    titlePlaceholder: 'Drink a glass of water',
    add: 'Add routine',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    graduate: 'I don’t need this anymore',
    missingTitle: 'Add a title',
    missingTitleBody: 'Write what you will do at that time.',
    limitTitle: 'Start with a few',
    limitBody: 'You can add more after you graduate.',
    removeTitle: 'Remove this routine?',
    remove: 'Remove',
  },

  katsu: {
    title: 'Your KATSU',
    intro:
      'This is what you will hear when you skip. Write it as the person who decided to change.',
    writeTitle: 'Write your words',
    editTitle: 'Edit your words',
    guardrail: 'It’s okay to challenge an action. Don’t attack the person.',
    placeholder: 'You said you were going to change.',
    save: 'Save these words',
    saveEdit: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    locked: 'Locked ── still yours',
    forPrefix: 'For:',
    allRoutines: 'All routines',
    anotherTitle: 'Write another one',
    anotherBody: 'One set of words is free. More than one is part of the paid plan.',
    anotherAction: 'See the plans',
    emptyTitle: 'Write something',
    emptyBody: 'What would you say to yourself at that moment?',
    deleteTitle: 'Delete this?',
    deleteBody: 'You wrote it. You can write it again.',
    pickerTitle: 'When should this one show up?',
  },

  paywall: {
    title: 'What is this worth to you?',
    body: 'Every option unlocks the same thing: more than one set of words, and different words for different routines. You pick the price.',
    quit: 'This app is designed for you to quit it. When you do, cancel and the charges stop.',
    unreachable: 'Could not reach the store. Try again later ── nothing else is affected.',
    /** ⚠ RevenueCat に current の Offering が無い。ダッシュボード側の設定漏れ */
    noOffering: 'No plans are set up yet. Nothing else is affected.',
    /** ⚠ Offering はあるが商品が降りてこない。App Store Connect 側の状態 */
    noProducts: 'The plans are not available from the store yet. Nothing else is affected.',
    perMonth: '/ month',
    notNow: 'Not now',
    restore: 'Restore',
    restoreNothing: 'Nothing to restore for this Apple ID.',
    restoreFailed: 'Could not reach the store. Try again later.',
    purchaseFailed: 'That did not go through. Nothing was charged.',
    renewal:
      'Monthly, renewing until you cancel. Manage or cancel it in your Apple ID settings at any time.',
    terms: 'Terms of Use',
    privacy: 'Privacy Policy',
  },

  graduation: {
    title: 'You might not need this anymore.',
    body: 'You have been doing this on your own for a while now. That was the point.',
    note: 'This app was designed for you to quit it. Nobody here is going to tell you whether you are ready ── you are the only one who knows that.',
    end: 'End my subscription',
    notYet: 'Not yet',
    close: 'Close',
    stillWorks: 'Either way, nothing here stops working.',
    freeNote: 'Nothing is holding you here. Delete the app whenever it has done its job.',
  },

  onboarding: {
    appName: 'KATSU',
    tagline: 'A voice from the you who believed.',
    intro:
      'You are about to write down what you want said to you on the days you would rather not show up.',
    introNote: 'This app is designed for you to quit it. If it works, you stop needing it.',
    start: 'Start',
    routineTitle: 'One thing, every day',
    routineBody: 'Something with a time on it, that repeats. Five minutes to an hour.',
    wordsTitle: 'Now write the hard part',
    wordsBody:
      'This is what arrives when the time passes and you have not done it. Not our words. Yours.',
    wordsRequired: 'Write something. This is the whole point.',
    titleRequired: 'Write what you will do at that time.',
    notificationsTitle: 'How it reaches you',
    notificationsBody:
      'When the time passes and the box is still empty, your words arrive as a notification. Check it off and that one goes quiet.',
    notificationsNote:
      'Without this you would have to remember to open the app, which is the one thing this was built to spare you.',
    allow: 'Allow notifications',
    notNow: 'Not now',
    doneTitle: 'That is the whole app',
    doneBody: 'Your words stay on this device.',
    doneNote: 'Nothing you write here is sent anywhere. Nobody reads it but you.',
    begin: 'Begin',
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
