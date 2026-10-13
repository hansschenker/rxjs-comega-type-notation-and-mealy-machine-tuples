# 04 · Worked Marble Traces

Each trace drives a concrete input sequence through a machine, showing after every input the
`(state, input) → state'` transition and the emitted output sequence `G`. We use RxJS marble
notation for the source and result streams, where `-` is a time frame, letters are values,
`|` is `complete`, `#` is `error`, and `(ab)` groups synchronous emissions.

Legend for the step tables:

- **State** — the state *before* consuming the input.
- **Input** — the input symbol `σ ∈ Σ`.
- **`T`** — the resulting next state.
- **`G` output** — the emitted sequence `∈ Λ*` (`ε` = nothing).

---

## 1. `map(x => x * 10)`

Source: `--1--2--3--|`

| # | State | Input | `T` → | `G` output |
|---|-------|-------|-------|-----------|
| 1 | Active | `n(1)` | Active | `⟨ n(10) ⟩` |
| 2 | Active | `n(2)` | Active | `⟨ n(20) ⟩` |
| 3 | Active | `n(3)` | Active | `⟨ n(30) ⟩` |
| 4 | Active | `c`    | Done   | `⟨ c ⟩` |

Result: `--10--20--30--|`  ·  `|G| ≡ 1` → cardinality preserved (`T* → U*`).

---

## 2. `filter(x => x % 2 === 0)`

Source: `--1--2--3--4--|`

| # | State | Input | `T` → | `G` output |
|---|-------|-------|-------|-----------|
| 1 | Active | `n(1)` | Active | `⟨ ⟩`      (1 odd — dropped) |
| 2 | Active | `n(2)` | Active | `⟨ n(2) ⟩` |
| 3 | Active | `n(3)` | Active | `⟨ ⟩`      (3 odd — dropped) |
| 4 | Active | `n(4)` | Active | `⟨ n(4) ⟩` |
| 5 | Active | `c`    | Done   | `⟨ c ⟩` |

Result: `-----2-----4--|`  ·  `|G| ∈ {0,1}` → cardinality can only shrink.

---

## 3. `take(2)`

Source: `--a--b--c--d--|`

| # | State | Input | `T` → | `G` output |
|---|-------|-------|-------|-----------|
| 1 | Counting(0) | `n(a)` | Counting(1) | `⟨ n(a) ⟩` |
| 2 | Counting(1) | `n(b)` | **Done**    | `⟨ n(b), c ⟩`  ← value **and** synthesized complete |
| — | Done | `n(c)` | Done | `⟨ ⟩` (already unsubscribed; source never reaches here) |

Result: `--a--(b|)`  ·  the boundary step has `|G| = 2`. The upstream is unsubscribed after
step 2 — `c` and `d` are never delivered.

---

## 4. `scan((acc, x) => acc + x, 0)`

Source: `--1--2--3--|`

| # | State (acc) | Input | `T` → | `G` output |
|---|-------------|-------|-------|-----------|
| 1 | `0`  | `n(1)` | `1` | `⟨ n(1) ⟩`  (0+1) |
| 2 | `1`  | `n(2)` | `3` | `⟨ n(3) ⟩`  (1+2) |
| 3 | `3`  | `n(3)` | `6` | `⟨ n(6) ⟩`  (3+3) |
| 4 | `6`  | `c`    | Done | `⟨ c ⟩` |

Result: `--1--3--6--|`  ·  running totals, `|G| ≡ 1`.

---

## 5. `reduce((acc, x) => acc + x, 0)`

Source: `--1--2--3--|`

| # | State (acc) | Input | `T` → | `G` output |
|---|-------------|-------|-------|-----------|
| 1 | `0`  | `n(1)` | `1` | `⟨ ⟩`  (silent) |
| 2 | `1`  | `n(2)` | `3` | `⟨ ⟩`  (silent) |
| 3 | `3`  | `n(3)` | `6` | `⟨ ⟩`  (silent) |
| 4 | `6`  | `c`    | Done | `⟨ n(6), c ⟩`  ← the ONLY emission, at completion |

Result: `-----------(6|)`  ·  collapse to `A!` — all output deferred to `c`.

---

## 6. `mergeMap(x => inner(x))` — parallel inners

Source outer: `--a-----b-----|`
Let each inner `f(x)` emit two values then complete: `in(x1), in(x2), ic`.
Suppose inner-a and inner-b overlap in time. Tagged interleaving:

| # | State `(I, flag)` | Input | `T` → | `G` output |
|---|-------------------|-------|-------|-----------|
| 1 | `(∅, Open)`        | `n(a)`        | `({a}, Open)`      | `⟨ ⟩`   (subscribe inner a) |
| 2 | `({a}, Open)`      | `in(a1, a)`   | `({a}, Open)`      | `⟨ n(a1) ⟩` |
| 3 | `({a}, Open)`      | `n(b)`        | `({a,b}, Open)`    | `⟨ ⟩`   (subscribe inner b, a still live) |
| 4 | `({a,b}, Open)`    | `in(a2, a)`   | `({a,b}, Open)`    | `⟨ n(a2) ⟩` |
| 5 | `({a,b}, Open)`    | `in(b1, b)`   | `({a,b}, Open)`    | `⟨ n(b1) ⟩` |
| 6 | `({a,b}, Open)`    | `ic(a)`       | `({b}, Open)`      | `⟨ ⟩`   (a drained, b still live) |
| 7 | `({b}, Open)`      | `c`           | `({b}, SrcDone)`   | `⟨ ⟩`   (source done, b still live → NO complete) |
| 8 | `({b}, SrcDone)`   | `in(b2, b)`   | `({b}, SrcDone)`   | `⟨ n(b2) ⟩` |
| 9 | `({b}, SrcDone)`   | `ic(b)`       | **Done**           | `⟨ c ⟩`  (SrcDone ∧ I=∅ → complete) |

Result interleaving: `n(a1) n(a2) n(b1) n(b2) c`. Note step 7: source `complete` did **not**
complete the output — the machine waited for the last inner (step 9). That is the non-local
completion predicate `SrcDone ∧ I=∅`.

---

## 7. `switchMap(x => inner(x))` — latest-wins

Source outer: `--a---b-------|`, inner `f(x)` = `in(x1), in(x2), ic`.
`b` arrives while inner-a is still mid-flight (after `a1`, before `a2`):

| # | State `(cur, flag)` | Input | `T` → | `G` output |
|---|---------------------|-------|-------|-----------|
| 1 | `(⊥, Open)`      | `n(a)`      | `(a, Open)`      | `⟨ ⟩`   (subscribe a) |
| 2 | `(a, Open)`      | `in(a1, a)` | `(a, Open)`      | `⟨ n(a1) ⟩` |
| 3 | `(a, Open)`      | `n(b)`      | `(b, Open)`      | `⟨ ⟩`   (UNSUB a, subscribe b → current = b) |
| 4 | `(b, Open)`      | `in(a2, a)` | `(b, Open)`      | `⟨ ⟩`   ← STALE: a≠current, dropped |
| 5 | `(b, Open)`      | `in(b1, b)` | `(b, Open)`      | `⟨ n(b1) ⟩` |
| 6 | `(b, Open)`      | `in(b2, b)` | `(b, Open)`      | `⟨ n(b2) ⟩` |
| 7 | `(b, Open)`      | `c`         | `(b, SrcDone)`   | `⟨ ⟩` |
| 8 | `(b, SrcDone)`   | `ic(b)`     | **Done**         | `⟨ c ⟩` |

Result: `n(a1) n(b1) n(b2) c`. The late `a2` (step 4) is **discarded** because the current inner
is now `b`. That dropped output is the formal footprint of switching.

---

## 8. `concatMap(x => inner(x))` — sequential queue

Source outer: `(ab)|` (both values arrive synchronously, then complete),
inner `f(x)` = `in(x1), ic`:

| # | State `(cur, Q, flag)` | Input | `T` → | `G` output |
|---|------------------------|-------|-------|-----------|
| 1 | `(⊥, [], Open)`      | `n(a)`      | `(a, [], Open)`      | `⟨ ⟩`   (subscribe a immediately) |
| 2 | `(a, [], Open)`      | `n(b)`      | `(a, [b], Open)`     | `⟨ ⟩`   (busy → enqueue b) |
| 3 | `(a, [b], Open)`     | `c`         | `(a, [b], SrcDone)`  | `⟨ ⟩` |
| 4 | `(a, [b], SrcDone)`  | `in(a1, a)` | `(a, [b], SrcDone)`  | `⟨ n(a1) ⟩` |
| 5 | `(a, [b], SrcDone)`  | `ic(a)`     | `(b, [], SrcDone)`   | `⟨ ⟩`   (dequeue b, subscribe) |
| 6 | `(b, [], SrcDone)`   | `in(b1, b)` | `(b, [], SrcDone)`   | `⟨ n(b1) ⟩` |
| 7 | `(b, [], SrcDone)`   | `ic(b)`     | **Done**             | `⟨ c ⟩`  (⊥ ∧ Q=[] ∧ SrcDone) |

Result: `n(a1) n(b1) c` — strictly ordered: all of `a`'s inner before any of `b`'s, even though
both source values arrived together. The queue `[b]` preserved the order.

---

## 9. `debounceTime(2)` — emit latest after 2 ticks of silence

Source (frames): `n(a)` @0, `n(b)` @1 (rapid burst), then silence, then `n(c)`, then complete.
Timeline `a b · · c · · |` with `τ` as frame boundaries. `d = 2`.

| # | State `(p, k, flag)` | Input | `T` → | `G` output |
|---|----------------------|-------|-------|-----------|
| 1 | `(⊥, ⊥, Open)`   | `n(a)` | `(a, 2, Open)` | `⟨ ⟩`  (arm timer=2) |
| 2 | `(a, 2, Open)`   | `n(b)` | `(b, 2, Open)` | `⟨ ⟩`  (RESET: p=b, timer=2) |
| 3 | `(b, 2, Open)`   | `τ`    | `(b, 1, Open)` | `⟨ ⟩`  (count down) |
| 4 | `(b, 1, Open)`   | `τ`    | `(⊥, ⊥, Open)` | `⟨ n(b) ⟩`  ← 2 ticks silent → emit latest `b` |
| 5 | `(⊥, ⊥, Open)`   | `n(c)` | `(c, 2, Open)` | `⟨ ⟩`  (arm again) |
| 6 | `(c, 2, Open)`   | `τ`    | `(c, 1, Open)` | `⟨ ⟩` |
| 7 | `(c, 1, Open)`   | `c`    | `Done`         | `⟨ n(c), c ⟩`  ← source completes → flush pending `c`, then complete |

Result: `a` is superseded by `b` (step 2); `b` emitted at step 4; `c` flushed early by
`complete` at step 7. Marble: `-----b----(c|)`. Emission at step 4 happened on a **clock**
symbol, with no concurrent data input.

---

## 10. `bufferTime(3)` — array every 3 ticks

Source: `n(a)` @0, `n(b)` @1, (tick), (tick), `n(c)` @3, then `complete` @4. `d = 3`.

| # | State `(B, k, flag)` | Input | `T` → | `G` output |
|---|----------------------|-------|-------|-----------|
| 1 | `([], 3, Open)`     | `n(a)` | `([a], 3, Open)`     | `⟨ ⟩`  (accumulate) |
| 2 | `([a], 3, Open)`    | `n(b)` | `([a,b], 3, Open)`   | `⟨ ⟩` |
| 3 | `([a,b], 3, Open)`  | `τ`    | `([a,b], 2, Open)`   | `⟨ ⟩` |
| 4 | `([a,b], 2, Open)`  | `τ`    | `([a,b], 1, Open)`   | `⟨ ⟩` |
| 5 | `([a,b], 1, Open)`  | `τ`    | `([], 3, Open)`      | `⟨ n([a,b]) ⟩`  ← window closes → emit buffer |
| 6 | `([], 3, Open)`     | `n(c)` | `([c], 3, Open)`     | `⟨ ⟩` |
| 7 | `([c], 3, Open)`    | `c`    | `Done`               | `⟨ n([c]), c ⟩`  ← flush partial buffer, complete |

Result: `n([a,b])` at the first window boundary, then `n([c])` at completion. Marble:
`-----([a,b])---([c]|)`. The output at step 5 is a value emission driven **purely by the
clock**.

---

## 11. `windowTime(3)` — nested Observables every 3 ticks

Source: `n(a)` @0, `n(b)` @1, (tick), (tick → window boundary), `n(c)` @3, `complete` @4.
`d = 3`. Outer symbols are *window Observables* `w0, w1, …`; `win(w,v)` = inner next on `w`;
`wc(w)` = complete window `w`.

| # | State `(w, k, flag)` | Input | `T` → | `G` output |
|---|----------------------|-------|-------|-----------|
| 0 | (start) | — | `(w0, 3, Open)` | `⟨ n(w0) ⟩`  ← emit first window observable |
| 1 | `(w0, 3, Open)` | `n(a)` | `(w0, 3, Open)` | `⟨ win(w0, a) ⟩`  (route into w0) |
| 2 | `(w0, 3, Open)` | `n(b)` | `(w0, 3, Open)` | `⟨ win(w0, b) ⟩` |
| 3 | `(w0, 3, Open)` | `τ`    | `(w0, 2, Open)` | `⟨ ⟩` |
| 4 | `(w0, 2, Open)` | `τ`    | `(w0, 1, Open)` | `⟨ ⟩` |
| 5 | `(w0, 1, Open)` | `τ`    | `(w1, 3, Open)` | `⟨ wc(w0), n(w1) ⟩`  ← close w0 **and** emit w1 (|G|=2) |
| 6 | `(w1, 3, Open)` | `n(c)` | `(w1, 3, Open)` | `⟨ win(w1, c) ⟩` |
| 7 | `(w1, 3, Open)` | `c`    | `Done`          | `⟨ wc(w1), c ⟩`  (complete w1, then outer) |

Outer result: `w0` then `w1` (two inner Observables), then outer `complete`.
- `w0` yields `a, b` then completes.
- `w1` yields `c` then completes.

Step 5 is the signature of `windowTime`: a **single clock tick emits two outer symbols**
(close the finished window, publish the new one). That `|G| = 2` on `τ` is precisely why the
outer cardinality grows to `(T*)+` — the higher-order companion to `bufferTime`'s `(T[])*`.

---

## Cross-reference

Each trace realizes the machine defined in:

- Core operators (1–5) → [`README.md`](../README.md)
- Concurrency (6–8) → [`02-concurrency-operators.md`](02-concurrency-operators.md)
- Time-based (9–11) → [`03-time-based-operators.md`](03-time-based-operators.md)
