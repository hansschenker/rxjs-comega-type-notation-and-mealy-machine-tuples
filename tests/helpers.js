import assert from 'node:assert/strict';
import { TestScheduler } from 'rxjs/testing';

/**
 * Create a fresh RxJS TestScheduler whose deep-equality assertion is wired into
 * node:assert. The TestScheduler is the ground truth for operator behavior: it
 * runs the operator against a virtual clock, so one virtual frame === one `τ`
 * tick in the Mealy-machine model used throughout this repository.
 */
export function makeScheduler() {
  return new TestScheduler((actual, expected) => {
    assert.deepEqual(actual, expected);
  });
}
