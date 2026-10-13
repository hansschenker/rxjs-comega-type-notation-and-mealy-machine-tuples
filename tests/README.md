# Executable STT-Row Test Cases

These tests operationalize [`docs/06-state-transition-tables.md`](../docs/06-state-transition-tables.md):
**one test per State Transition Table row**, asserted against RxJS's `TestScheduler` (the ground
truth for operator behavior). TestScheduler virtual frames correspond to the `τ` ticks of the
Mealy-machine model.

## Files

| File | Operator | STT in |
|------|----------|--------|
| [`take.test.js`](take.test.js) | `take(2)` | §1.1 of doc 06 |
| [`debounceTime.test.js`](debounceTime.test.js) | `debounceTime(d)` | §1.2 of doc 06 |
| [`helpers.js`](helpers.js) | `TestScheduler` factory | — |

Each test is named after the STT row(s) it exercises (e.g. `R2: second value emits value AND
completes`), so a green run is an auditable mapping from table rows to verified behavior.

## Running

```bash
npm install
npm test        # node --test tests/
```

Uses Node's built-in test runner (`node:test`) + [RxJS 7](https://rxjs.dev) `TestScheduler` —
no bundler or extra test framework required (Node ≥ 18).

## Why this closes the loop

```
6-tuple → State Transition Table → { four-lane timeline, test cases }
```

The table makes the operator's behavior enumerable; enumerable behavior is directly testable.
Row coverage of the table ⇔ behavioral coverage of the operator.
