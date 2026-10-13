# 01 · Foundations

This document develops the two notations carefully and states the correspondence theorem
that the rest of the repository exploits.

---

## 1. The Cω stream type notation

Erik Meijer's **Cω** (also spelled *C-Omega*, and historically *Xen* / *X#*) extended the C#
type system with **stream types** — first-class sequences with *cardinality markers*. Rather
than a single array type, Cω distinguished how many elements a stream may carry:

| Marker | Reads as | Interval | Can be empty? | Has upper bound? |
|--------|----------|----------|---------------|------------------|
| `T!`   | exactly one   | `[1,1]` | no  | yes (1) |
| `T?`   | zero or one   | `[0,1]` | yes | yes (1) |
| `T+`   | one or more   | `[1,∞)` | no  | no |
| `T*`   | zero or more  | `[0,∞)` | yes | no |

These markers form a lattice under *cardinality subtyping*. Widening is always safe:

```
        T!
       /  \
     T?    T+
       \  /
        T*
```

- `T!` is the most precise (a required single value).
- `T*` is the most permissive (any Observable).
- An operator may **widen** (lose precision) safely but may not silently **narrow**.

**Reading an operator as a function on stream types.** Every RxJS operator is a function

```
op : (parameters) → (input stream type) → (output stream type)
```

The output marker encodes the *cardinality contract* the operator guarantees.

---

## 2. The Rx grammar and the shared input alphabet

The reactive-streams contract fixes the only legal shapes of an Observable's emissions:

```
observable ::= next* (error | complete)?
```

Concretely, after any number of `next` notifications, a stream may terminate with **at most
one** `error` or `complete`, and never emits anything afterward. We encode the three
notification kinds as the shared input alphabet of every operator-machine:

```
Σ = { n(v) : v ∈ T }  ∪  { c, e }
```

- `n(v)` — a `next` carrying value `v ∈ T`.
- `c`    — `complete` (graceful termination).
- `e`    — `error` (exceptional termination).

The output alphabet `Λ` has the same shape over the operator's *output* value type.

---

## 3. The Mealy machine and the `Λ*` adaptation

A **Mealy machine** is the 6-tuple

```
M = (S, S₀, Σ, Λ, T, G)
```

| Component | Type | Meaning |
|-----------|------|---------|
| `S`  | set | state space |
| `S₀` | `∈ S` | initial state |
| `Σ`  | set | input alphabet |
| `Λ`  | set | output alphabet |
| `T`  | `S × Σ → S` | transition function |
| `G`  | `S × Σ → Λ*` | output function |

### Why `Λ*` and not `Λ`?

In the **classical** Mealy formulation the output function has type `G : S × Σ → Λ` — exactly
one output symbol per input symbol. That is too rigid for stream operators, which routinely
emit a *different number* of outputs than they consume:

| Behavior | needs output length | example |
|----------|--------------------|---------|
| drop an input | `0` | `filter` rejecting a value |
| transform 1:1 | `1` | `map` |
| emit value **and** synthesize completion | `2` | `take` at the boundary |
| flatten | `0..∞` | `mergeMap` draining an inner |

We therefore use the **generalized** output function

```
G : S × Σ → Λ*
```

mapping each `(state, input)` pair to a **finite sequence** of output symbols
(`⟨ ⟩` denotes the empty sequence, i.e. "emit nothing").

> This is still a deterministic, single-input-at-a-time machine — we have only relaxed the
> *output arity*, not introduced nondeterminism.

---

## 4. The correspondence theorem (informal)

Let `op` be an operator with Mealy machine `M = (S, S₀, Σ, Λ, T, G)`, and let `|G(s,σ)|`
denote the length of the output sequence. Define, over all reachable `(s, n(v))` pairs
(i.e. over `next` inputs), the per-input output-length set

```
L(op) = { |G(s, n(v))| : (s, n(v)) reachable }
```

together with the *terminal* contribution on `c`.

Then the Cω output cardinality of `op` is determined as follows:

| Condition on output lengths | Cω result |
|-----------------------------|-----------|
| `L(op) = {1}` and `c` emits only `⟨c⟩` | cardinality **preserved** (`T!→U!`, `T*→U*`) |
| `L(op) ⊆ {0,1}` | cardinality can only **shrink** (`T!→T?`, `T+→T*`) |
| `sup L(op) ≥ 2` or inner-driven | cardinality can **grow** (flattening) |
| `L(op) = {0}` and `c` emits `⟨n(a),c⟩` | **collapse** to `A!` |

Informally: **the Cω marker is the static abstraction of the output function's length
behavior.** The static type is a *projection* of the dynamic machine. This is the thread that
unifies the whole repository.

---

## 5. Notational conventions used throughout

- `⟨ x, y, … ⟩` — an ordered output sequence (element of `Λ*`).
- `⟨ ⟩` or `ε`  — the empty output (emit nothing).
- `[guard]`     — a transition guard (Mermaid edges: `input [guard] / output`).
- `acc`         — an accumulator function `A → T → A`.
- Clock events (introduced in [`03-time-based-operators.md`](03-time-based-operators.md)):
  `τ` is a tick from a virtual scheduler, added to `Σ`.
