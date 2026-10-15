# ADR format

ADRs live in `docs/adr/` as `0001-slug.md`, `0002-slug.md`, …. Create the directory lazily.

If `docs/adr/` already has files, **match that house shape**. If it is empty, this is enough:

```md
# {Short title}

{1-3 sentences: context, what we decided, why.}
```

An ADR can be a paragraph. The value is that a decision was made and why. When the project records decisions in beads, the ADR names the beads option id it belongs to, and the chosen option's `--design` names the ADR file.

Optional, only when they add something: Status (`proposed | accepted | deprecated | superseded by
ADR-NNNN`), Considered Options, Consequences.

Number: highest existing NNNN plus one.

## When to write one

All three must be true:

1. **Hard to reverse** — changing your mind later costs
2. **Surprising without context** — a future reader will wonder why
3. **A real trade-off** — genuine alternatives, picked for a reason

Skip it if any of the three is missing.

What qualifies: architectural shape; how contexts integrate; lock-in technology; boundary and
scope (the explicit no-s too); deliberate deviation from the obvious path; constraints the code
cannot show; rejected alternatives that will otherwise come back.
