# docs/CONTEXT.md format

Product glossary. Not a spec, not a scratch pad, not implementation. Decisions are not glossary entries; they are beads issues (see "Where things go" in SKILL.md).

The path is **`docs/CONTEXT.md`**. If that file already exists, match its shape. If you are creating it, use:

```md
# {Name}

{One or two sentences: what this context is.}

## Language

**Order**:
{One or two sentences: what it IS, not what it does.}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request
```

## Rules

- **Opinionated.** One word per concept; the others go under `_Avoid_`.
- **Tight.** One or two sentences. What it is, not what it does.
- **This project's words only.** Timeouts, error types, and other general programming concepts stay out.
- Group under subheadings when clusters appear; otherwise a flat list.

Create the file lazily: only when the first term is resolved. If `docs/CONTEXT.md` is missing and the repo already has a root `CONTEXT.md`, keep using that file rather than inventing a second glossary.
