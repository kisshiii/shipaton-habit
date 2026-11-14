#!/usr/bin/env node
/**
 * 卒業判定(やり切った日を66日、休みは直近7日で2回まで)のテスト。RN を起動せずに動く。
 *   npm run test:graduation
 *
 * date.ts / graduation.ts / constants を TypeScript で変換して一時フォルダに置き、
 * storage だけ空の実装に差し替えて読み込む。テストランナーは入れていない(依存を増やさない)。
 * 夏時間の確認は TZ を変えて2回走らせる: `TZ=America/New_York npm run test:graduation`
 *
 * ⚠ 日数はすべて定数から組み立てる。定数を変えてもテストの意味が変わらないようにする。
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const APP = path.resolve(__dirname, '..');
const ts = require(path.join(APP, 'node_modules/typescript'));
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'katsu-graduation-'));

const aliases = {
  "'@/constants/graduation'": "'./constants.js'",
  "'@/lib/date'": "'./date.js'",
  "'@/storage'": "'./storage.js'",
};
for (const [src, out] of [
  ['src/lib/date.ts', 'date.js'],
  ['src/lib/graduation.ts', 'graduation.js'],
  ['src/constants/graduation.ts', 'constants.js'],
]) {
  let code = fs.readFileSync(path.join(APP, src), 'utf8');
  for (const [from, to] of Object.entries(aliases)) code = code.split(from).join(to);
  const js = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  fs.writeFileSync(path.join(OUT, out), js);
}
fs.writeFileSync(
  path.join(OUT, 'storage.js'),
  [
    'exports.getAppState = async () => ({});',
    'exports.getDailyRecords = async () => ({});',
    'exports.getRoutines = async () => [];',
    'exports.markMilestonesCelebrated = async () => {};',
    'exports.markRestartNoticeShown = async () => {};',
  ].join('\n'),
);

const { dateKeysBetween } = require(path.join(OUT, 'date.js'));
const { computeProgress, milestonesUpTo, pickMilestone } = require(path.join(OUT, 'graduation.js'));
const {
  GRADUATION_STREAK_DAYS: N,
  REST_WINDOW_DAYS: W,
  MAX_REST_DAYS: R,
  MILESTONE_DAYS: M,
  REVIEW_MILESTONE,
} = require(path.join(OUT, 'constants.js'));

const START = '2026-01-01';
const keys = dateKeysBetween(START, '2027-12-31');
const done = (k) => ({ date: k, completedIds: ['a'], totalCount: 1 });
const notDone = (k) => ({ date: k, completedIds: [], totalCount: 1 });
/** i 日目(0 始まり)の記録を fn で作る。undefined はアプリを開かなかった日 */
const build = (fn) =>
  Object.fromEntries(keys.map((k, i) => [k, fn(i, k)]).filter(([, v]) => v));
/** 指定した日だけ休み、それ以外はやり切った記録 */
const restsAt = (...days) => build((i, k) => (days.includes(i) ? notDone(k) : done(k)));
const progress = (records, todayIndex, changedOn = [], startedOn = START) =>
  computeProgress(records, startedOn, changedOn, keys[todayIndex]);
const graduatedOn = (records, changedOn = [], startedOn = START) =>
  progress(records, 400, changedOn, startedOn).graduatedOn;

const cases = [
  // --- 66日の数え方 ---------------------------------------------------------
  [`やり切った日が${N}日で、${N}日目が卒業日`, () => {
    const r = build((i, k) => (i < N ? done(k) : undefined));
    assert.strictEqual(graduatedOn(r), keys[N - 1]);
  }],
  [`${N - 1}日では卒業しない`, () => {
    const r = build((i, k) => (i < N - 1 ? done(k) : undefined));
    assert.strictEqual(graduatedOn(r), null);
  }],
  ['休みの日は数え直さないが、66日にも入らない', () => {
    assert.strictEqual(graduatedOn(restsAt(30)), keys[N]);
  }],
  [`直近${W}日に${R}回までの休みでは数え直さない`, () => {
    const rests = Array.from({ length: R }, (_, j) => 10 + j);
    assert.strictEqual(graduatedOn(restsAt(...rests)), keys[N - 1 + R]);
  }],
  [`直近${W}日に${R + 1}回目の休みが出たら、その翌日から数え直す`, () => {
    const rests = Array.from({ length: R + 1 }, (_, j) => 10 + j * 2);
    const last = rests[rests.length - 1];
    assert.strictEqual(graduatedOn(restsAt(...rests)), keys[last + N]);
  }],
  [`${W}日より前の休みは数えない(${W}日に1回ずつなら途切れない)`, () => {
    const rests = Array.from({ length: R + 3 }, (_, j) => 10 + j * W);
    // 休みはどの直近 W 日にも1回しか入らないので、数え直しは起きない
    assert.strictEqual(graduatedOn(restsAt(...rests)), keys[N - 1 + rests.length]);
  }],
  ['直近7日の境目: ちょうど W 日前の休みは窓の外', () => {
    // 窓は「その日を含む W 日」。最後の休みから W 日前の休みは同じ窓に入らない
    const tail = Array.from({ length: R }, (_, j) => 20 + j);
    const last = tail[tail.length - 1];
    const today = last + 1; // やり切った日
    const outside = progress(restsAt(last - W, ...tail), today);
    assert.strictEqual(outside.doneDays, today + 1 - (R + 1));
    // 1日近づけると R+1 回が同じ窓に入り、最後の休みで数え直しになる
    const inside = progress(restsAt(last - W + 1, ...tail), today);
    assert.strictEqual(inside.restRestartOn, keys[last]);
    assert.strictEqual(inside.doneDays, 1);
  }],
  ['数え直しより前の休み(3回目そのものも)は、次の窓に数えない', () => {
    const first = Array.from({ length: R + 1 }, (_, j) => 10 + j); // 数え直しになる
    const last = first[first.length - 1];
    const next = Array.from({ length: R }, (_, j) => last + 1 + j); // 直後に R 回休む
    const p = progress(restsAt(...first, ...next), last + R + 1);
    assert.strictEqual(p.restsInWindow, R);
    assert.strictEqual(p.doneDays, 1); // 今日の分だけ
    assert.strictEqual(p.restRestartOn, keys[last]);
    // もう1回休むと数え直し
    const again = progress(restsAt(...first, ...next, last + R + 1), last + R + 2);
    assert.strictEqual(again.restRestartOn, keys[last + R + 1]);
  }],
  ['アプリを開かなかった日(記録なし)は休み', () => {
    const r = build((i, k) => (i >= 10 && i <= 10 + R ? undefined : done(k)));
    assert.strictEqual(graduatedOn(r), keys[10 + R + N]);
  }],
  ['ルーティンが1件も無い日(全部消した日)は休み', () => {
    const r = build((i, k) =>
      i === 20 ? { date: k, completedIds: [], totalCount: 0, excludedIds: [] } : done(k),
    );
    assert.strictEqual(graduatedOn(r), keys[N]);
  }],
  ['全部消したまま開き続けても卒業しない', () => {
    const r = build((i, k) =>
      i < 200 ? { date: k, completedIds: [], totalCount: 0, excludedIds: [] } : undefined,
    );
    assert.strictEqual(progress(r, 199).graduatedOn, null);
  }],
  ['分母0の日(Day 1 の時刻超過)はやり切った日', () => {
    const r = build((i, k) =>
      i === 0 ? { date: k, completedIds: [], totalCount: 0, excludedIds: ['a'] } : done(k),
    );
    assert.strictEqual(graduatedOn(r), keys[N - 1]);
  }],
  ['Day 1 より前の記録は数えない', () => {
    const r = build((i, k) => (i < N ? done(k) : undefined));
    assert.strictEqual(graduatedOn(r, [], keys[5]), null);
  }],

  // --- 今日 -----------------------------------------------------------------
  ['今日まだやっていなくても休みにしない', () => {
    const rests = Array.from({ length: R }, (_, j) => 10 + j);
    const today = 10 + R;
    const r = restsAt(...rests);
    r[keys[today]] = notDone(keys[today]);
    const p = progress(r, today);
    assert.strictEqual(p.restsInWindow, R);
    assert.strictEqual(p.doneDays, 10);
    assert.strictEqual(p.restRestartOn, null);
  }],
  ['今日やり切った時点で1日に数える', () => {
    const r = build((i, k) => (i < N - 1 ? done(k) : i === N - 1 ? notDone(k) : undefined));
    assert.strictEqual(progress(r, N - 1).graduatedOn, null);
    assert.strictEqual(progress(r, N - 1).doneDays, N - 1);
    r[keys[N - 1]] = done(keys[N - 1]);
    assert.strictEqual(progress(r, N - 1).graduatedOn, keys[N - 1]);
    assert.strictEqual(progress(r, N - 1).doneDays, N);
  }],

  // --- ルーティンの変更(追加・削除・名前) ---------------------------------
  ['ルーティンを変えた日が新しい起点(その日やり切れば1日目)', () => {
    const r = build((i, k) => done(k));
    assert.strictEqual(progress(r, 50, [keys[50]]).doneDays, 1);
    assert.strictEqual(progress(r, 50, [keys[50]]).countStartedOn, keys[50]);
    assert.strictEqual(graduatedOn(r, [keys[50]]), keys[50 + N - 1]);
  }],
  ['変えた日より前の休みは、直近の回数に含めない', () => {
    const rests = Array.from({ length: R }, (_, j) => 48 - j);
    const r = restsAt(...rests, 51);
    const p = progress(r, 52, [keys[50]]);
    assert.strictEqual(p.restsInWindow, 1);
    assert.strictEqual(p.doneDays, 2); // 変えた日と今日
  }],
  ['同じ日に何度変えても、起点はその日', () => {
    const r = build((i, k) => done(k));
    assert.strictEqual(progress(r, 50, [keys[50], keys[50]]).doneDays, 1);
  }],
  ['卒業した後に変えても、卒業日は変わらない', () => {
    const r = build((i, k) => done(k));
    assert.strictEqual(graduatedOn(r, [keys[N + 10]]), keys[N - 1]);
  }],
  ['変えた後は、休みで数え直したお知らせを出さない', () => {
    const rests = Array.from({ length: R + 1 }, (_, j) => 10 + j);
    const r = restsAt(...rests);
    assert.strictEqual(progress(r, 30).restRestartOn, keys[10 + R]);
    assert.strictEqual(progress(r, 30, [keys[20]]).restRestartOn, null);
  }],
  ['Day 1 より前・今日より後の変更日は無視する', () => {
    const r = build((i, k) => done(k));
    assert.strictEqual(progress(r, 30, ['2025-12-31', keys[40]]).doneDays, 31);
  }],

  // --- 始める日を先にした(plan §8) ---------------------------------------------
  ['Day 1 が今日より後なら、まだ始まっていない(0日・休み0回)', () => {
    const r = build((i, k) => done(k));
    const p = progress(r, 10, [], keys[20]);
    assert.strictEqual(p.hasStarted, false);
    assert.strictEqual(p.doneDays, 0);
    assert.strictEqual(p.restsInWindow, 0);
    assert.strictEqual(p.graduatedOn, null);
  }],
  ['Day 1 の当日からは始まっている', () => {
    const r = build((i, k) => (i < 20 ? notDone(k) : done(k)));
    assert.strictEqual(progress(r, 20, [], keys[20]).hasStarted, true);
    assert.strictEqual(progress(r, 20, [], keys[20]).doneDays, 1);
  }],
  ['始まる前のルーティンの変更は、数え直しにならない', () => {
    const r = build((i, k) => done(k));
    assert.strictEqual(progress(r, 30, [keys[15]], keys[20]).doneDays, 11);
  }],

  // --- 昨日(その日最初に開いたときの一言。plan §8) ------------------------------
  ['昨日やり切っていれば done、休みなら rest', () => {
    const r = restsAt(10);
    assert.strictEqual(progress(r, 10).yesterday, 'done');
    assert.strictEqual(progress(r, 11).yesterday, 'rest');
  }],
  ['Day 1 の当日と、始まる前は null', () => {
    const r = build((i, k) => done(k));
    assert.strictEqual(progress(r, 0).yesterday, null);
    assert.strictEqual(progress(r, 10, [], keys[20]).yesterday, null);
  }],

  // --- 卒業後 ---------------------------------------------------------------
  ['卒業した後に何度休んでも、卒業日は変わらない', () => {
    const r = build((i, k) => (i < N ? done(k) : notDone(k)));
    assert.strictEqual(progress(r, 300).graduatedOn, keys[N - 1]);
  }],

  // --- 休まず続いている日数 ---------------------------------------------------
  ['休まず続いている日数は、休むと0に戻る(卒業には影響しない)', () => {
    const r = restsAt(10);
    assert.strictEqual(progress(r, 9).unbrokenDays, 10);
    assert.strictEqual(progress(r, 10).unbrokenDays, 10); // 今日はまだ休みではない
    assert.strictEqual(progress(r, 11).unbrokenDays, 1); // 昨日休んで、今日やり切った
    assert.strictEqual(progress(r, 15).unbrokenDays, 5);
    assert.strictEqual(progress(r, 15).doneDays, 15);
  }],
  ['休まず続いている日数は、ルーティンを変えたときも0に戻る', () => {
    const r = build((i, k) => done(k));
    assert.strictEqual(progress(r, 20, [keys[15]]).unbrokenDays, 6);
  }],

  // --- 節目 -----------------------------------------------------------------
  ['節目に届いた日に、その節目を出す', () => {
    const r = build((i, k) => done(k));
    const week = REVIEW_MILESTONE;
    assert.strictEqual(pickMilestone(progress(r, week - 2), [1]), null);
    assert.strictEqual(pickMilestone(progress(r, week - 1), [1]), week);
  }],
  ['一度祝った節目は、数え直して同じ日数に届いても出さない', () => {
    const r = build((i, k) => done(k));
    assert.strictEqual(pickMilestone(progress(r, 7 + 20, [keys[20]]), [1, 7]), null);
  }],
  ['いくつも越えていたら一番大きいものだけ。済みにするのはそれ以下全部', () => {
    const r = build((i, k) => done(k));
    assert.strictEqual(pickMilestone(progress(r, 33 - 1), []), 33);
    assert.deepStrictEqual(milestonesUpTo(33), M.filter((d) => d <= 33));
  }],
  ['1日目は、やり切ったその場でだけ出す(後から開いた2日目以降には出さない)', () => {
    const r = build((i, k) => done(k));
    assert.strictEqual(pickMilestone(progress(r, 0), []), 1);
    assert.strictEqual(pickMilestone(progress(r, 2), []), null);
    // 1日目を祝ったあとは、次の節目まで何も出ない
    assert.strictEqual(pickMilestone(progress(r, 3), [1]), null);
  }],
  ['1日目をやり切ったあと、2日目を開いた時点(今日はまだ)では出さない', () => {
    const r = build((i, k) => (i === 0 ? done(k) : i === 1 ? notDone(k) : undefined));
    assert.strictEqual(progress(r, 1).doneDays, 1);
    assert.strictEqual(pickMilestone(progress(r, 1), []), null);
  }],
  ['休みをはさんで開いた日(今日はまだ)にも1日目を出さない', () => {
    const r = build((i, k) => (i === 0 ? done(k) : i === 2 ? notDone(k) : undefined));
    assert.strictEqual(pickMilestone(progress(r, 2), []), null);
  }],
  ['時刻を過ぎていて分母から外れただけの1日目(何もしていない)は祝わない', () => {
    const r = build((i, k) => (i === 0 ? { date: k, completedIds: [], totalCount: 0, excludedIds: ['a'] } : undefined));
    assert.strictEqual(progress(r, 0).doneDays, 1);
    assert.strictEqual(pickMilestone(progress(r, 0), []), null);
  }],
  ['数え直したあとの1日目は祝わない(1日目は一生に1回)', () => {
    const rests = Array.from({ length: R + 1 }, (_, j) => 10 + j);
    const last = rests[rests.length - 1];
    const r = build((i, k) => (rests.includes(i) ? notDone(k) : i <= last + 1 ? done(k) : undefined));
    assert.strictEqual(progress(r, last + 1).doneDays, 1);
    assert.strictEqual(pickMilestone(progress(r, last + 1), [7]), null);
    assert.strictEqual(pickMilestone(progress(r, last + 1), []), null);
  }],
  ['卒業した人には、休みで数え直したお知らせを出さない', () => {
    const rests = Array.from({ length: R + 1 }, (_, j) => N + 5 + j);
    const r = build((i, k) => (i < N ? done(k) : rests.includes(i) ? notDone(k) : done(k)));
    const p = progress(r, N + 20);
    assert.notStrictEqual(p.graduatedOn, null);
    assert.strictEqual(p.restRestartOn, null);
  }],
  ['評価を頼む節目は7日で、1日目ではない', () => {
    assert.strictEqual(REVIEW_MILESTONE, 7);
    assert.ok(M.includes(1));
  }],
  ['卒業した後は節目を出さない', () => {
    const r = build((i, k) => done(k));
    assert.strictEqual(pickMilestone(progress(r, 300), []), null);
  }],

  // --- 日付 -----------------------------------------------------------------
  ['夏時間の切り替えをまたいでも日付が飛ばない・重複しない', () => {
    assert.deepStrictEqual(dateKeysBetween('2026-03-06', '2026-03-10'), [
      '2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10',
    ]);
    assert.deepStrictEqual(dateKeysBetween('2026-10-31', '2026-11-03'), [
      '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03',
    ]);
    assert.strictEqual(dateKeysBetween('2026-01-01', '2026-12-31').length, 365);
  }],
  ['Day 1 が今日より後なら空', () => {
    assert.deepStrictEqual(dateKeysBetween('2026-05-02', '2026-05-01'), []);
  }],
];

let failed = 0;
for (const [name, fn] of cases) {
  try {
    fn();
    console.log(`ok    ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL  ${name}\n      ${error.message}`);
  }
}
fs.rmSync(OUT, { recursive: true, force: true });
console.log(
  `\nTZ=${process.env.TZ ?? '(local)'}  N=${N} W=${W} R=${R}  ${cases.length - failed}/${cases.length} passed`,
);
process.exit(failed ? 1 : 0);
