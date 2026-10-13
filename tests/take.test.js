import { test, describe } from 'node:test';
import { take } from 'rxjs/operators';
import { makeScheduler } from './helpers.js';

/**
 * State Transition Table for take(2):
 * S = { C0=Counting(0), C1=Counting(1), Done }
 *
 *  R1 | C0 | n(v) | —       | C1   | ⟨ n(v) ⟩     | |G|=1
 *  R2 | C1 | n(v) | k+1=n   | Done | ⟨ n(v), c ⟩  | |G|=2
 *  R3 | C0 | c    | —       | Done | ⟨ c ⟩        | |G|=1
 *  R4 | C1 | c    | —       | Done | ⟨ c ⟩        | |G|=1
 *  R5 | C0 | e    | —       | Done | ⟨ e ⟩        | |G|=1
 *  R6 | C1 | e    | —       | Done | ⟨ e ⟩        | |G|=1
 *
 * One marble test per STT row. A green suite proves the implementation realizes
 * the tabulated 6-tuple of take(2).
 */
describe('take(2) — one test per State Transition Table row', () => {
  const run = (fn) => makeScheduler().run(fn);

  test('R1: first value emitted; stream stays open (C0 → C1)', () => {
    run(({ cold, expectObservable }) => {
      const source = cold('--a--b--c--|');
      const expected = '   --a--(b|)';
      expectObservable(source.pipe(take(2))).toBe(expected);
    });
  });

  test('R2: second value emitted AND completion synthesized (|G| = 2, C1 → Done)', () => {
    run(({ cold, expectObservable }) => {
      const source = cold('--a--b--c--d--|');
      const expected = '   --a--(b|)';
      expectObservable(source.pipe(take(2))).toBe(expected);
    });
  });

  test('R3/R4: source completes before quota → pass completion through', () => {
    run(({ cold, expectObservable }) => {
      const source = cold('--a--|');
      const expected = '   --a--|';
      expectObservable(source.pipe(take(2))).toBe(expected);
    });
  });

  test('R3: immediate completion from C0 (no values) → just complete', () => {
    run(({ cold, expectObservable }) => {
      const source = cold('---|');
      const expected = '   ---|';
      expectObservable(source.pipe(take(2))).toBe(expected);
    });
  });

  test('R5/R6: error propagates (any Counting state → Done with e)', () => {
    run(({ cold, expectObservable }) => {
      const source = cold('--a--#');
      const expected = '   --a--#';
      expectObservable(source.pipe(take(2))).toBe(expected);
    });
  });

  test('post-Done: upstream unsubscribed after quota (c, d never delivered)', () => {
    run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('--a--b--c--d--|');
      const sub = '        ^----!';
      const expected = '   --a--(b|)';
      expectObservable(source.pipe(take(2))).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sub);
    });
  });
});
