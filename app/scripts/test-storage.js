#!/usr/bin/env node
/**
 * 保存レイヤ(src/storage/index.ts)のテスト。RN を起動せずに動く。
 *   npm run test:storage
 *
 * test-graduation.js と同じやり方: TypeScript で変換して一時フォルダに置き、`@/` を差し替えて読み込む。
 * テストランナーは入れていない(依存を増やさない)。
 *
 * - AsyncStorage はメモリ上の偽物。読み書きのたびに 0〜3ms 待つので、同時に呼ぶと処理が交互に進む
 *   (待ち時間は固定の種から作るので、毎回同じ順番になる)
 * - 時計は Date を差し替えて止める。`now` を書き換えると todayKey も toTimeKey も追従する
 * - 自傷の判定(gitignore 済みの blocklist を読む)は差し替える。印の文字列を含むと true
 * 夏時間の確認は TZ を変えて2回走らせる: `TZ=America/New_York npm run test:storage`
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const APP = path.resolve(__dirname, '..');
const ts = require(path.join(APP, 'node_modules/typescript'));
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'katsu-storage-'));

// --- 決まった順番の乱数 ---------------------------------------------------------
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let delayRandom = mulberry32(1);
Math.random = mulberry32(2); // createId が使う。ID も毎回同じになる

// --- 時計 -------------------------------------------------------------------
const RealDate = Date;
let now = new RealDate(2026, 10, 1, 12, 0, 0).getTime(); // ローカルの 2026-11-01 12:00(夏時間が終わる日)
global.Date = class extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(now);
    else super(...args);
  }
  static now() {
    return now;
  }
};
/** ローカル時刻で時計を合わせる */
const setClock = (y, m, d, hh = 12, mm = 0) => {
  now = new RealDate(y, m - 1, d, hh, mm, 0).getTime();
};
global.__DEV__ = false;

// --- 偽の AsyncStorage -----------------------------------------------------------
const store = new Map();
const wait = () => new Promise((resolve) => setTimeout(resolve, Math.floor(delayRandom() * 4)));
global.__katsuAsyncStorage = {
  async getItem(key) {
    await wait();
    return store.has(key) ? store.get(key) : null;
  },
  async setItem(key, value) {
    await wait();
    store.set(key, value);
  },
};

// --- 変換 -------------------------------------------------------------------
const aliases = {
  "'@react-native-async-storage/async-storage'": "'./async-storage.js'",
  "'@/constants/graduation'": "'./constants-graduation.js'",
  "'@/constants/messages'": "'./constants-messages.js'",
  "'@/constants/routines'": "'./constants-routines.js'",
  "'@/lib/date'": "'./date.js'",
  "'@/lib/self-harm-guard'": "'./self-harm-guard.js'",
  "'@/lib/text'": "'./text.js'",
  "'@/storage'": "'./storage.js'",
};
for (const [src, out] of [
  ['src/storage/index.ts', 'storage.js'],
  ['src/lib/date.ts', 'date.js'],
  ['src/lib/text.ts', 'text.js'],
  ['src/lib/graduation.ts', 'graduation.js'],
  ['src/constants/graduation.ts', 'constants-graduation.js'],
  ['src/constants/messages.ts', 'constants-messages.js'],
  ['src/constants/routines.ts', 'constants-routines.js'],
]) {
  let code = fs.readFileSync(path.join(APP, src), 'utf8');
  for (const [from, to] of Object.entries(aliases)) code = code.split(from).join(to);
  const js = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  fs.writeFileSync(path.join(OUT, out), js);
}
fs.writeFileSync(
  path.join(OUT, 'async-storage.js'),
  'exports.__esModule = true;\nexports.default = global.__katsuAsyncStorage;\n',
);
const BLOCK_MARK = '__BLOCKED__';
fs.writeFileSync(
  path.join(OUT, 'self-harm-guard.js'),
  `exports.containsSelfHarmText = (text) => text.includes(${JSON.stringify(BLOCK_MARK)});\n`,
);

const storage = require(path.join(OUT, 'storage.js'));
const { computeProgress } = require(path.join(OUT, 'graduation.js'));
const { todayKey } = require(path.join(OUT, 'date.js'));
const { MAX_ROUTINES } = require(path.join(OUT, 'constants-routines.js'));
const { MESSAGE_MAX_LENGTH } = require(path.join(OUT, 'constants-messages.js'));

const TODAY = '2026-11-01';
const YESTERDAY = '2026-10-31';
const raw = (key) => JSON.parse(store.get(key) ?? 'null');
const records = () => raw('katsu.records') ?? {};
const appState = () => raw('katsu.appState') ?? {};
const todayRecord = () => records()[TODAY];
/** 正午(12:00)を挟んで、過ぎた時刻と、まだの時刻 */
const PAST = '07:00';
const FUTURE = '18:00';
const addN = async (n, time = FUTURE) => {
  const added = [];
  for (let i = 0; i < n; i += 1) added.push(await storage.addRoutine({ time, title: `R${i}` }));
  return added;
};

const cases = [
  // --- 追加 -----------------------------------------------------------------
  ['最初の追加で Day 1 = 今日、節目は空の配列', async () => {
    await storage.addRoutine({ time: FUTURE, title: 'Wake up' });
    assert.strictEqual(appState().startedOn, TODAY);
    assert.deepStrictEqual(appState().celebratedMilestones, []);
    assert.strictEqual(appState().routineChangedOn, undefined);
  }],
  ['2件目・3件目の追加で、変えた日に今日が1回だけ入る', async () => {
    await addN(3);
    assert.deepStrictEqual(appState().routineChangedOn, [TODAY]);
    assert.strictEqual(appState().startedOn, TODAY);
  }],
  [`${MAX_ROUTINES + 1}件目は RoutineLimitError`, async () => {
    await addN(MAX_ROUTINES);
    await assert.rejects(storage.addRoutine({ time: FUTURE, title: 'extra' }), storage.RoutineLimitError);
    assert.strictEqual((await storage.getRoutines()).length, MAX_ROUTINES);
  }],
  ['時刻が過ぎた項目は今日の分母から外す。まだの項目は外さない', async () => {
    const past = await storage.addRoutine({ time: PAST, title: 'past' });
    const future = await storage.addRoutine({ time: FUTURE, title: 'future' });
    const r = todayRecord();
    assert.deepStrictEqual(r.excludedIds, [past.id]);
    assert.ok(!r.excludedIds.includes(future.id));
    assert.strictEqual(r.totalCount, 1);
  }],
  ['今日足しても、過去日の分母は変わらない', async () => {
    store.set('katsu.records', JSON.stringify({
      [YESTERDAY]: { date: YESTERDAY, completedIds: ['old'], totalCount: 1, excludedIds: [] },
    }));
    await addN(2);
    assert.deepStrictEqual(records()[YESTERDAY], {
      date: YESTERDAY, completedIds: ['old'], totalCount: 1, excludedIds: [],
    });
    assert.strictEqual(todayRecord().totalCount, 2);
  }],

  // --- 同時に呼んでも消えない ---------------------------------------------------
  ['2つ同時にチェックしても、両方残る', async () => {
    const [a, b] = await addN(2);
    await Promise.all([storage.toggleCompletion(a.id), storage.toggleCompletion(b.id)]);
    assert.deepStrictEqual([...todayRecord().completedIds].sort(), [a.id, b.id].sort());
    assert.strictEqual(todayRecord().totalCount, 2);
  }],
  ['通知の「やった」が2回同時に来ても、チェックは付いたまま', async () => {
    const [a] = await addN(1);
    await Promise.all([storage.markCompletedToday(a.id), storage.markCompletedToday(a.id)]);
    assert.deepStrictEqual(todayRecord().completedIds, [a.id]);
  }],
  ['開いた日の記録と節目の記録を同時に書いても、両方残る', async () => {
    await addN(1);
    await Promise.all([storage.markOpenedToday(), storage.markMilestonesCelebrated([1])]);
    assert.strictEqual(appState().lastOpenedOn, TODAY);
    assert.deepStrictEqual(appState().celebratedMilestones, [1]);
  }],
  ['チェックと削除が同時でも、残ったルーティンのチェックは消えない', async () => {
    const [a, b] = await addN(2);
    await Promise.all([storage.toggleCompletion(a.id), storage.deleteRoutine(b.id)]);
    assert.deepStrictEqual(todayRecord().completedIds, [a.id]);
    assert.strictEqual(todayRecord().totalCount, 1);
  }],
  ['途中で失敗した書き込みがあっても、次の書き込みは進む', async () => {
    await addN(MAX_ROUTINES);
    const results = await Promise.allSettled([
      storage.addRoutine({ time: FUTURE, title: 'extra' }),
      storage.markOpenedToday(),
    ]);
    assert.strictEqual(results[0].status, 'rejected');
    assert.strictEqual(results[1].value, true);
  }],

  // --- 削除 -----------------------------------------------------------------
  ['削除すると、今日のチェックと分母から外した印の両方から消える', async () => {
    const past = await storage.addRoutine({ time: PAST, title: 'past' });
    const [keep] = await addN(1);
    await storage.toggleCompletion(past.id);
    assert.strictEqual(todayRecord().totalCount, 2); // 外していても、チェックが付けば数える
    await storage.deleteRoutine(past.id);
    const r = todayRecord();
    assert.deepStrictEqual(r.completedIds, []);
    assert.deepStrictEqual(r.excludedIds, []);
    assert.strictEqual(r.totalCount, 1);
    assert.deepStrictEqual((await storage.getRoutines()).map((x) => x.id), [keep.id]);
  }],
  ['全部消した日は、やり切った日にならない(分母0・外した印なし)', async () => {
    const past = await storage.addRoutine({ time: PAST, title: 'past' });
    const [future] = await addN(1);
    await storage.toggleCompletion(future.id);
    await storage.deleteRoutine(past.id);
    await storage.deleteRoutine(future.id);
    assert.deepStrictEqual(todayRecord(), {
      date: TODAY, completedIds: [], totalCount: 0, excludedIds: [],
    });
    // 翌日から見ると、昨日は休み
    const s = appState();
    const p = computeProgress(records(), s.startedOn, s.routineChangedOn ?? [], '2026-11-02');
    assert.strictEqual(p.yesterday, 'rest');
  }],
  ['削除したルーティン専用の言葉は消さず、全ルーティン共通に戻す', async () => {
    const [a, b] = await addN(2);
    const m1 = await storage.addMessage('Do it.');
    const m2 = await storage.addMessage('Now.');
    await storage.setMessageRoutine(m1.id, a.id);
    await storage.setMessageRoutine(m2.id, b.id);
    await storage.deleteRoutine(a.id);
    const messages = await storage.getMessages();
    assert.strictEqual(messages.length, 2);
    assert.strictEqual(messages.find((m) => m.id === m1.id).routineId, undefined);
    assert.strictEqual(messages.find((m) => m.id === m1.id).text, 'Do it.');
    assert.strictEqual(messages.find((m) => m.id === m2.id).routineId, b.id);
  }],
  ['無いIDを消しても、変えた日は増えない', async () => {
    await addN(1);
    await storage.deleteRoutine('missing');
    assert.strictEqual(appState().routineChangedOn, undefined);
  }],

  // --- 編集 -----------------------------------------------------------------
  ['時刻だけ変えても、変えた日は増えない', async () => {
    const [a] = await addN(1);
    await storage.updateRoutine(a.id, { time: '9:5' });
    assert.strictEqual(appState().routineChangedOn, undefined);
    assert.strictEqual((await storage.getRoutines())[0].time, '09:05');
  }],
  ['名前を変えたら、変えた日に今日が入る', async () => {
    const [a] = await addN(1);
    await storage.updateRoutine(a.id, { title: '  Read  ' });
    assert.deepStrictEqual(appState().routineChangedOn, [TODAY]);
    assert.strictEqual((await storage.getRoutines())[0].title, 'Read');
  }],
  ['前後の空白だけ違う同じ名前なら、変えた日は増えない', async () => {
    const [a] = await addN(1);
    await storage.updateRoutine(a.id, { title: `  ${a.title} `, time: PAST });
    assert.strictEqual(appState().routineChangedOn, undefined);
  }],
  ['名前を空にはできない', async () => {
    const [a] = await addN(1);
    await assert.rejects(storage.updateRoutine(a.id, { title: '   ' }), /Empty title/);
    assert.strictEqual((await storage.getRoutines())[0].title, a.title);
  }],

  // --- オンボーディング・開いた日 -------------------------------------------------
  ['Day 1 を選んだ日にする(明日も選べる)', async () => {
    await storage.setStartedOnForOnboarding('2026-11-02');
    assert.strictEqual(appState().startedOn, '2026-11-02');
    // 後からルーティンを足しても Day 1 は動かない(変えた日として残る)
    await addN(1);
    assert.strictEqual(appState().startedOn, '2026-11-02');
    assert.deepStrictEqual(appState().routineChangedOn, [TODAY]);
  }],
  ['オンボーディング完了日は今日', async () => {
    await storage.markOnboarded();
    assert.strictEqual(appState().onboardedAt, TODAY);
  }],
  ['その日最初に開いたときだけ true。日が変わればまた true', async () => {
    assert.strictEqual(await storage.markOpenedToday(), true);
    assert.strictEqual(await storage.markOpenedToday(), false);
    setClock(2026, 11, 2, 0, 1);
    assert.strictEqual(await storage.markOpenedToday(), true);
    assert.strictEqual(appState().lastOpenedOn, '2026-11-02');
  }],

  // --- 言葉 -----------------------------------------------------------------
  ['空の言葉は保存しない', async () => {
    await assert.rejects(storage.addMessage('   '), /Empty message/);
    assert.deepStrictEqual(await storage.getMessages(), []);
  }],
  [`${MESSAGE_MAX_LENGTH}文字までは保存でき、超えたら保存しない(絵文字は1文字)`, async () => {
    const emoji = '\u{1F525}'; // String.length は2
    const ok = emoji.repeat(MESSAGE_MAX_LENGTH);
    assert.strictEqual(ok.length, MESSAGE_MAX_LENGTH * 2);
    const saved = await storage.addMessage(ok);
    assert.strictEqual(saved.text, ok);
    await assert.rejects(storage.addMessage(ok + 'a'), /Message too long/);
    assert.strictEqual((await storage.getMessages()).length, 1);
  }],
  ['自傷の判定に当たる言葉は SelfHarmTextError で弾き、エラーに本文を入れない', async () => {
    const text = `you ${BLOCK_MARK}`;
    await assert.rejects(storage.addMessage(text), (error) => {
      assert.ok(error instanceof storage.SelfHarmTextError);
      assert.ok(!error.message.includes(text));
      return true;
    });
    const [m] = [await storage.addMessage('Go.')];
    await assert.rejects(storage.updateMessage(m.id, text), storage.SelfHarmTextError);
    assert.deepStrictEqual((await storage.getMessages()).map((x) => x.text), ['Go.']);
  }],
  ['保存するのは前後の空白を落とした本文', async () => {
    const m = await storage.addMessage('  Move.  ');
    assert.strictEqual(m.text, 'Move.');
    assert.strictEqual((await storage.getMessages())[0].text, 'Move.');
  }],
  ['言葉を消せる', async () => {
    const m = await storage.addMessage('Move.');
    await storage.deleteMessage(m.id);
    assert.deepStrictEqual(await storage.getMessages(), []);
  }],

  // --- 開発用 ---------------------------------------------------------------
  ['本番では保存内容の差し替えを拒否する', async () => {
    await assert.rejects(
      storage.replaceAllForDevelopment({ routines: [], records: {}, messages: [], appState: {} }, 'x'),
      /development only/,
    );
  }],
];

(async () => {
  let failed = 0;
  for (const [index, [name, fn]] of cases.entries()) {
    store.clear();
    setClock(2026, 11, 1, 12, 0);
    delayRandom = mulberry32(100 + index);
    try {
      assert.strictEqual(todayKey(), TODAY);
      await fn();
      console.log(`ok    ${name}`);
    } catch (error) {
      failed += 1;
      console.log(`FAIL  ${name}\n      ${error.message}`);
    }
  }
  fs.rmSync(OUT, { recursive: true, force: true });
  console.log(`\nTZ=${process.env.TZ ?? '(local)'}  ${cases.length - failed}/${cases.length} passed`);
  process.exit(failed ? 1 : 0);
})();
