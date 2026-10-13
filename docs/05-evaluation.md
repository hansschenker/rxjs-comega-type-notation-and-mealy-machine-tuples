# 05 · Evaluation of the Combined Framework

An honest assessment of pairing **Cω stream-type notation** (static behavior description) with
the **Mealy-machine 6-tuple** (dynamic execution tracing and visualization) — including where
the combination is strong and where it strains.

---

## 1. Why the combination works well

### 1.1 It partitions the semantic space cleanly

Static vs. dynamic is the oldest useful split in programming-language semantics
(*denotational* vs. *operational*). Cω types are essentially a **denotational abstraction** —
"what stream shape comes out" — while the Mealy machine is a **small-step operational
semantics** — "how it is produced, step by step." The scheme instantiates a well-established and
respected division rather than an ad-hoc notation, which is why it feels natural.

### 1.2 The correspondence theorem is the real payoff

The strongest part of the framework is the claim that the Cω marker is the *static projection of
the output function's length behavior*:

| Output-length behavior | Cω consequence |
|------------------------|----------------|
| `|G| ≡ 1`              | cardinality preserved |
| `|G| ∈ {0,1}`          | cardinality can only shrink |
| `sup |G| ≥ 2` or inner-driven | cardinality can grow |
| `|G| = 0` on `next`, nonzero on `c` | collapse to `T!` |

This is what makes the two-notation scheme more than the sum of its parts: the two views are
**provably related**, not merely placed side by side. It is an abstraction/refinement
relationship in the Galois-connection spirit. Many "two lenses" treatments never build the
bridge; this one does, and it is the thing to foreground in any formal writeup.

### 1.3 Cardinality is unusually well-suited to Rx

The `! / ? / + / *` lattice maps almost perfectly onto the questions people actually get wrong
about operators: *Can this complete immediately? Can it be empty? Can one input produce many
outputs?* Signatures like `reduce : T* → A!` and `filter : T! → T?` communicate real
operational truths in a single glyph. The notation does honest work, not decoration.

---

## 2. Where it strains (honest caveats)

### 2.1 The Mealy machine is the weaker half of the fit

A **true** Mealy machine has a *finite* state set and reads *one* input stream. The core
operators (`map`, `filter`, `take`, `scan`) fit beautifully. But:

- `scan` / `reduce` already set `S = A`, an **infinite** state space. Acceptable as "extended
  Mealy," but no longer finite-state.
- The concurrency operators need `S ⊇ 𝒫(InnerId)` plus an input alphabet with **interleaved
  inner events**. At that point the model has left Mealy's single-input-tape world and is really
  a **labeled transition system** or a process-calculus agent. The repo acknowledges this; it
  means the "6-tuple" is doing *presentational* rather than *theoretical* work for the hard
  operators.
- Interleaving of inner events is **nondeterministic** in real schedulers. A Mealy machine is
  deterministic. The traces fix one interleaving — honest, but it hides that the machine is not
  a function of the source alone.

### 2.2 Completion is non-local

`mergeMap` completes only when `SrcDone ∧ I = ∅` — a *predicate over global state* encoded as a
guard. It works, but it signals that the Mealy frame is being stretched: the clean "one input →
transition + output" degrades into "transition + output conditioned on a global invariant."

### 2.3 Time as an input symbol is a clever hack with a cost

Reifying ticks as `τ ∈ Σ` is exactly how `TestScheduler` thinks, so it is faithful to RxJS. But
it conflates two kinds of input (data vs. clock) and makes the alphabet unbounded and
timing-dependent. A **timed automaton** (real-valued clocks with guards) is the
textbook-correct tool and handles `debounceTime` resets more naturally. The `τ`-counting is more
accessible, though — a reasonable trade for a teaching artifact.

---

## 3. Overall assessment

- **As a pedagogical / documentation framework:** excellent. It makes invisible operator
  contracts visible, the two notations reinforce each other, and the marble traces ground the
  abstraction in something checkable by hand.
- **As a formal foundation:** solid for the first-order fragment; suggestive-but-informal for
  the higher-order and timed fragments. The Mealy machine is the right tool for roughly the
  first-order ~60% of RxJS and a leaky abstraction for the rest, where process calculi
  (CSP / π-calculus), labeled transition systems, or timed automata are the "correct" models.

**Honest framing:** *Cω carries the static story rigorously; the Mealy 6-tuple carries the
dynamic story rigorously for simple operators and illustratively for complex ones.* That is
still a very valuable combination — provided the Mealy half is not oversold as a complete formal
model for `mergeMap` and friends.

---

## 4. Upgrade path to close the gap

If full formal rigor is desired across all operators:

1. **Keep Cω unchanged** — the cardinality lattice scales fine.
2. **Promote the dynamic model** from "Mealy machine" to "**labeled transition system /
   Mealy-style agent**," explicitly noting nondeterministic interleaving for concurrency
   operators.
3. **Use timed automata** for the time-based operators (`debounceTime`, `bufferTime`,
   `windowTime`), with clocks as real-valued variables and guards, instead of counting `τ`
   ticks.

Naming these boundaries *strengthens* the work: a document is more trustworthy when it states
its own limits.

---

See [`06-state-transition-tables.md`](06-state-transition-tables.md) for the tabular form of the
6-tuple, the four-lane timeline derivation, and the row-to-test-case mapping that operationalizes
this evaluation.
