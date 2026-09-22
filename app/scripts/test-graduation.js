#!/usr/bin/env node
/**
 * 卒業判定(連続66日)のテスト。RN を起動せずに動く。
 *   npm run test:graduation
 *
 * date.ts / graduation.ts / constants を TypeScript で変換して一時フォルダに置き、
 * storage だけ空の実装に差し替えて読み込む。テストランナーは入れていない(依存を増やさない)。
 * 夏時間の確認は TZ を変えて2回走らせる: `TZ=America/New_York npm run test:graduation`
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
  'exports.getAppState = async () => ({}); exports.getDailyRecords = async () => ({}); exports.getRoutines = async () => [];',
);

const { dateKeysBetween } = require(path.join(OUT, 'date.js'));
const { findGraduationDate } = require(path.join(OUT, 'graduation.js'));
const { GRADUATION_STREAK_DAYS: N } = require(path.join(OUT, 'constants.js'));

const START = '2026-01-01';
const keys = dateKeysBetween(START, '2026-12-31');
const done = (k) => ({ date: k, completedIds: ['a'], totalCount: 1 });
const notDone = (k) => ({ date: k, completedIds: [], totalCount: 1 });
const build = (fn) =>
  Object.fromEntries(keys.map((k, i) => [k, fn(i, k)]).filter(([, v]) => v));

const cases = [
  [`${N}日連続で、${N}日目が卒業日`, () => {
    const r = build((i, k) => (i < N ? done(k) : undefined));
    assert.strictEqual(findGraduationDate(r, START, keys[200]), keys[N - 1]);
  }],
  [`${N - 1}日では卒業しない`, () => {
    const r = build((i, k) => (i < N - 1 ? done(k) : undefined));
    assert.strictEqual(findGraduationDate(r, START, keys[200]), null);
  }],
  ['途中で1日やり切らなかったら数え直す', () => {
    const r = build((i, k) => (i === 30 ? notDone(k) : done(k)));
    assert.strictEqual(findGraduationDate(r, START, keys[200]), keys[30 + N]);
  }],
  ['アプリを開かなかった日(記録なし)も途切れる', () => {
    const r = build((i, k) => (i === 10 ? undefined : done(k)));
    assert.strictEqual(findGraduationDate(r, START, keys[200]), keys[10 + N]);
  }],
  ['今日まだやっていなくても途切れた扱いにしない', () => {
    const today = keys[N - 1];
    const r = build((i, k) => (i < N - 1 ? done(k) : i === N - 1 ? notDone(k) : undefined));
    assert.strictEqual(findGraduationDate(r, START, today), null);
    r[today] = done(today);
    assert.strictEqual(findGraduationDate(r, START, today), today);
  }],
  ['卒業した後に途切れても卒業日は変わらない', () => {
    const r = build((i, k) => (i < N ? done(k) : notDone(k)));
    assert.strictEqual(findGraduationDate(r, START, keys[300]), keys[N - 1]);
  }],
  ['分母0の日(Day 1 の時刻超過)は達成扱い', () => {
    const r = build((i, k) =>
      i === 0
        ? { date: k, completedIds: [], totalCount: 0, excludedIds: ['a'] }
        : i < N
          ? done(k)
          : undefined,
    );
    assert.strictEqual(findGraduationDate(r, START, keys[200]), keys[N - 1]);
  }],
  ['ルーティンが1件も無い日(全部消した日)は途切れる', () => {
    const r = build((i, k) =>
      i === 20 ? { date: k, completedIds: [], totalCount: 0, excludedIds: [] } : done(k),
    );
    assert.strictEqual(findGraduationDate(r, START, keys[200]), keys[20 + N]);
  }],
  ['全部消したまま開き続けても卒業しない', () => {
    const r = build((i, k) =>
      i < 200 ? { date: k, completedIds: [], totalCount: 0, excludedIds: [] } : undefined,
    );
    assert.strictEqual(findGraduationDate(r, START, keys[199]), null);
  }],
  ['Day 1 より前の記録は数えない', () => {
    const r = build((i, k) => (i < N ? done(k) : undefined));
    assert.strictEqual(findGraduationDate(r, keys[5], keys[200]), null);
  }],
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
console.log(`\nTZ=${process.env.TZ ?? '(local)'}  N=${N}  ${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
