import { test, describe } from 'node:test';
import { debounceTime } from 'rxjs/operators';
import { makeScheduler } from './helpers.js';

/**
 * State Transition Table for debounceTime(d):
 * S = { Idle, Armed(k), Done }; state carries pending value p and countdown k.
 *
 *  R1 | Idle     | n(v) | —      | Armed(d)   | ⟨ ⟩          | 0
 *  R2 | Armed(k) | n(v) | —      | Armed(d)   | ⟨ ⟩ (reset)  | 0
 *  R3 | Armed(k) | τ    | k > 1  | Armed(k−1) | ⟨ ⟩          | 0
 *  R4 | Armed(k) | τ    | k = 1  | Idle       | ⟨ n(p) ⟩     | 1
 *  R5 | Idle     | τ    | —      | Idle       | ⟨ ⟩          | 0
 *  R6 | Armed(k) | c    | —      | Done       | ⟨ n(p), c ⟩  | 2
 *  R7 | Idle     | c    | —      | Done       | ⟨ c ⟩        | 1
 *  R8 | *        | e    | —      | Done       | ⟨ e ⟩        | 1
 *
 * TestScheduler virtual frames are the τ ticks of the Mealy model.
 */
describe('debounceTime — one test per State Transition Table row', () => {
  const run = (fn) => makeScheduler().run(fn);

  test('R1 + R3 + R4: arm, count down, emit latest after quiet period', () => {
    run(({ cold, expectObservable }) => {
      const source = cold('a 29ms |', { a: 'a' });
      const expected = '   20ms a 9ms |';
      expectObservable(source.pipe(debounceTime(20))).toBe(expected);
    });
  });

  test('R2: value while armed RESETS the timer; only the latest survives', () => {
    run(({ cold, expectObservable }) => {
      const source = cold('a 9ms b 29ms |', { a: 'a', b: 'b' });
      const expected = '   30ms b 9ms |';
      expectObservable(source.pipe(debounceTime(20))).toBe(expected);
    });
  });

  test('R6: completion while armed FLUSHES the pending value, then completes', () => {
    run(({ cold, expectObservable }) => {
      const source = cold('a 9ms |', { a: 'a' });
      const expected = '   10ms (a|)';
      expectObservable(source.pipe(debounceTime(20))).toBe(expected);
    });
  });

  test('R7: completion while idle (no pending value) just completes', () => {
    run(({ cold, expectObservable }) => {
      const source = cold('10ms |');
      const expected = '   10ms |';
      expectObservable(source.pipe(debounceTime(20))).toBe(expected);
    });
  });

  test('R8: error propagates immediately (pending value dropped)', () => {
    run(({ cold, expectObservable }) => {
      const source = cold('a 9ms #', { a: 'a' });
      const expected = '   10ms #';
      expectObservable(source.pipe(debounceTime(20))).toBe(expected);
    });
  });

  test('R2 repeated: a burst collapses to a single trailing emission', () => {
    run(({ cold, expectObservable }) => {
      const source = cold('a 4ms b 4ms c 29ms |', { a: 'a', b: 'b', c: 'c' });
      const expected = '   30ms c 9ms |';
      expectObservable(source.pipe(debounceTime(20))).toBe(expected);
    });
  });
});
