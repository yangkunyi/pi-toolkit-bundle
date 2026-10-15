---
name: karpathy-lean
description: Behavioral guidelines to keep LLM-written code small and honest. Use when writing, editing, reviewing, or refactoring code, and before adding tests, mocks, error handling, validation, or fallbacks. Favors minimal surgical changes and avoids speculative features, defensive code for impossible states, silent fallbacks, unnecessary tests, and over-mocking.
license: MIT
---

# Karpathy Guidelines (lean edition)

Derived from [karpathy-guidelines](https://github.com/multica-ai/andrej-karpathy-skills) (MIT), which is based on [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment. They are defaults: an explicit user request (for tests, validation, a fallback) overrides them.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Defensive code and fallbacks:
- Trust types, internal callers, and documented API contracts. No null checks, try/catch, or re-validation for states they already rule out.
- Validate only at trust boundaries (user input, network, files, environment). Inside the boundary, assume the data is valid.
- No silent fallbacks: don't catch an error to return a default, an empty value, or a "best effort" result, and don't add a second code path "just in case". It turns a loud bug into silent wrong output. Let it fail where it happens, unless the user asked for the fallback.
- This applies to code you write. Leave existing defensive code alone unless asked (see 3).

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified, using the cheapest check that proves it.**

Transform tasks into verifiable goals:
- "Add validation" → "Validate at the boundary, then run it with one bad input"
- "Fix the bug" → "Reproduce it by running the code, fix it, run it again"
- "Refactor X" → "Run the existing tests that cover X before and after"

A check can be running the code, the type checker, or an existing test. A new test is not the default check (see 5).

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Tests and Mocks

**Fewer tests, fewer mocks. Every test must earn its place.**

Before writing a test, name the specific failure it would catch and what you would do differently if it failed. No answer, no test.

Write a test only when the user asks, or when the logic is non-trivial and easy to get wrong (parsing, money, security, subtle state). Then write one small test, not a suite. Skip trivial code (getters, pass-through, config, glue), anything the type system or framework already guarantees, and error paths you chose not to defend.

When you do write one:
- Assert observable behavior, not internals. No snapshot tests. No test that restates the implementation.
- Mock only at the system boundary: network, disk, clock, randomness, external services.
- Never mock your own modules or pure functions. Use the real code, a temp dir, or a small in-memory fake.
- If a test needs more than one or two mocks, drop it, or test one level up with the real pieces.
- A test that only asserts "X was called" checks wiring, not behavior. Don't write it.

Existing tests:
- Don't edit or delete a test just to make it pass. If a test must change, say why.
- Run only the tests that cover your change.
