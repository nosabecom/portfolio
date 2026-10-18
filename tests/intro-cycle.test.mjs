import assert from 'node:assert/strict';
import test from 'node:test';
import { nextIntro } from '../src/lib/intro-cycle.ts';

test('shows all 100 unique intros once per round and never repeats at a round boundary', () => {
  const options = Array.from({ length: 100 }, (_, i) => `Intro ${i + 1}`);
  let history = null;
  let last = null;
  for (let round = 0; round < 5; round++) {
    const shown = new Set();
    for (let visit = 0; visit < options.length; visit++) {
      const result = nextIntro(options, history, () => (visit % 7) / 7);
      assert.ok(options.includes(result.intro));
      assert.notEqual(result.intro, last);
      assert.ok(!shown.has(result.intro));
      shown.add(result.intro);
      last = result.intro;
      // A new visit reads its history back from browser storage.
      history = JSON.parse(JSON.stringify(result.history));
    }
    assert.equal(shown.size, 100);
  }
});

test('new, removed, and reordered options preserve progress by text', () => {
  const history = { version: 1, seen: ['Alpha', 'Beta', 'Removed'], last: 'Beta' };
  const result = nextIntro(['New', 'Beta', 'Alpha'], history, () => 0);
  assert.equal(result.intro, 'New');
  assert.deepEqual(result.history.seen, ['Alpha', 'Beta', 'New']);
});

test('empty entries and duplicate text cannot cause a blank or repeated intro', () => {
  const first = nextIntro(['', '  ', 'Alpha\n Beta', 'Alpha Beta', 'Gamma'], null, () => 0);
  assert.equal(first.intro, 'Alpha Beta');
  const second = nextIntro(['', 'Alpha Beta', 'Gamma', 'Gamma'], first.history, () => 0);
  assert.equal(second.intro, 'Gamma');
  const third = nextIntro(['Alpha Beta', 'Gamma'], second.history, () => .999);
  assert.equal(third.intro, 'Alpha Beta');
});

test('recovers from invalid or obsolete saved history', () => {
  for (const history of [null, 'invalid', [], { version: 2 }, { version: 1, seen: 'wrong', last: 9 }, { version: 1, seen: [null, {}, 'Unknown'] }]) {
    const result = nextIntro(['Alpha', 'Beta'], history, () => 0);
    assert.equal(result.intro, 'Alpha');
    assert.deepEqual(result.history.seen, ['Alpha']);
  }
});

test('one intro remains available and an empty file yields no selection', () => {
  let history = null;
  for (let visit = 0; visit < 3; visit++) {
    const result = nextIntro(['Only intro'], history);
    assert.equal(result.intro, 'Only intro');
    history = result.history;
  }
  assert.equal(nextIntro(['', '\n'], history).intro, null);
});
