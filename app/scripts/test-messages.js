#!/usr/bin/env node
/**
 * どの日に、どのルーティンへ、どの言葉を出すか(src/lib/message-pick.ts)のテスト。RN を起動せずに動く。
 *   npm run test:messages
 *
 * test-graduation.js と同じやり方: TypeScript で変換して一時フォルダに置き、`@/` を差し替えて読み込む。
 * 1.0.4 で直した不具合の再発防止: 通知を切っている人の Today が先頭の言葉に固定されていた。
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const APP = path.resolve(__dirname, '..');
const ts = require(path.join(APP, 'node_modules/typescript'));
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'katsu-messages-'));

const aliases = { "'@/constants/messages'": "'./messages-constants.js'" };
for (const [src, out] of [
  ['src/lib/message-pick.ts', 'message-pick.js'],
  ['src/constants/messages.ts', 'messages-constants.js'],
]) {
  let code = fs.readFileSync(path.join(APP, src), 'utf8');
  for (const [from, to] of Object.entries(aliases)) code = code.split(from).join(to);
  const js = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  fs.writeFileSync(path.join(OUT, out), js);
}

const { messageFor, todayWordFor } = require(path.join(OUT, 'message-pick.js'));
const { FREE_MESSAGE_LIMIT } = require(path.join(OUT, 'messages-constants.js'));

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const word = (id, routineId) => ({ id, text: `word-${id}`, ...(routineId ? { routineId } : {}) });
const routine = (id, time) => ({ id, time, title: id, createdAt: '2026-11-01T00:00:00.000Z' });
const at = (hh, mm) => new Date(2026, 10, 16, hh, mm, 0);

const run = routine('run', '06:30');
const study = routine('study', '20:00');
const journal = routine('journal', '22:00');
const routines = [journal, run, study]; // 時刻順に並んでいないことがある
const three = [word('a'), word('b'), word('c')];

// --- 日替わり ------------------------------------------------------------------

test('無料・言葉3つ: 30日のうちに3つとも届く(先頭に固定されない)', () => {
  const seen = new Set();
  for (let day = 1; day <= 30; day += 1) {
    const key = `2026-12-${String(day).padStart(2, '0')}`;
    seen.add(todayWordFor(three, routines, [], false, key, at(21, 0)).id);
  }
  assert.deepStrictEqual([...seen].sort(), ['a', 'b', 'c']);
});

test('Today の言葉は、同じルーティン・同じ日の通知の言葉と同じ', () => {
  for (let day = 1; day <= 30; day += 1) {
    const key = `2026-12-${String(day).padStart(2, '0')}`;
    // 21:00 の時点で時刻を過ぎて未チェックの一番早いもの = run(06:30)
    const shown = todayWordFor(three, routines, [], false, key, at(21, 0));
    assert.strictEqual(shown, messageFor(three, run, false, key));
  }
});

test('同じ日なら何度開いても同じ言葉(乱数を使わない)', () => {
  const first = todayWordFor(three, routines, [], false, '2026-12-05', at(21, 0));
  for (let i = 0; i < 5; i += 1) {
    assert.strictEqual(todayWordFor(three, routines, [], false, '2026-12-05', at(21, 0)), first);
  }
});

// --- どのルーティンの言葉か -----------------------------------------------------

test('時刻を過ぎて未チェックの、一番早いルーティンを選ぶ', () => {
  const paid = [word('r', 'run'), word('s', 'study'), word('j', 'journal')];
  // run は済み → 時刻を過ぎて未チェックは study(20:00)
  assert.strictEqual(todayWordFor(paid, routines, ['run'], true, '2026-12-05', at(21, 0)).id, 's');
});

test('時刻を過ぎたものが無ければ、まだのうち一番早いもの', () => {
  const paid = [word('r', 'run'), word('s', 'study'), word('j', 'journal')];
  assert.strictEqual(todayWordFor(paid, routines, [], true, '2026-12-05', at(5, 0)).id, 'r');
});

test('全部済んでいれば、一番早いもの(言葉は出し続ける)', () => {
  const paid = [word('r', 'run'), word('s', 'study'), word('j', 'journal')];
  assert.strictEqual(
    todayWordFor(paid, routines, ['run', 'study', 'journal'], true, '2026-12-05', at(23, 0)).id,
    'r',
  );
});

// --- ロック・空 ----------------------------------------------------------------

test(`無料: ${FREE_MESSAGE_LIMIT + 1} つ目以降(ロック中)は出さない`, () => {
  const five = [word('a'), word('b'), word('c'), word('d'), word('e')];
  for (let day = 1; day <= 60; day += 1) {
    const key = `2027-01-${String((day % 28) + 1).padStart(2, '0')}`;
    const id = todayWordFor(five, routines, [], false, `${key}-${day}`, at(21, 0)).id;
    assert.ok(['a', 'b', 'c'].includes(id), `ロック中の ${id} が出た`);
  }
});

test('言葉が無ければ何も出さない(定型文で埋めない)', () => {
  assert.strictEqual(todayWordFor([], routines, [], false, '2026-12-05', at(21, 0)), undefined);
});

test('ルーティンが無ければ何も出さない', () => {
  assert.strictEqual(todayWordFor(three, [], [], false, '2026-12-05', at(21, 0)), undefined);
});

test('有料: そのルーティン専用の言葉があればそれを使う', () => {
  const mixed = [word('common'), word('forStudy', 'study')];
  assert.strictEqual(todayWordFor(mixed, routines, ['run'], true, '2026-12-05', at(21, 0)).id, 'forStudy');
});

fs.rmSync(OUT, { recursive: true, force: true });
console.log(`✓ message-pick: ${passed} 件`);
