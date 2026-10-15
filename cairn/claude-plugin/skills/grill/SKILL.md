---
name: grill
description: Interview the user branch by branch until the product language and the decisions settle, recording each one in the project's beads store and glossary the moment it crystallises. Use when the user asks to be grilled or to stress-test a plan or design.
disable-model-invocation: true
---

# Grill

Interview the user until you share an understanding, and **record each thing as it settles**: decisions in the project's beads store, words in `docs/CONTEXT.md`. Finding facts is your job; the decisions are the user's.

This skill is both the interview and the domain model. Do **not act** on the idea until the user confirms a shared understanding.

Formats: [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md) for the glossary, [ADR-FORMAT.md](./ADR-FORMAT.md) for ADRs.

## Rounds

Map the work as a **design tree**: every decision branches into the decisions that hang off it. Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled, the questions you can ask *now*. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait.

```
❓ **Q1** - **<title>**: <body, including choices>

➡️ <your recommended answer>
```

**Interactive rendering.** When a question has discrete choices, **ask the person interactively** instead of in prose, if the host can: title and body become the question's header and text, each choice an option, and the recommended answer the first option, marked `(Recommended)`. Free-form answers go through an "other" choice. A question with no two real candidate answers stays in prose. Ask at most four questions per interactive call; a larger frontier continues in the next call. Either way it is one round: the whole frontier, then wait.

Each round of answers reshapes the tree. Recompute the frontier. A question that depends on another still open in this round belongs to a later round.

Finding **facts** is your job. Do not ask the user for anything you can look up. When a frontier question needs a fact from the environment, look it up (or dispatch a sub-agent) and **don't block the rest of the round**: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait. The **decisions** are the user's. Put each to them and wait.

## Domain modeling, in the same rounds

This is the active discipline: challenge terms, invent edge cases, and write the glossary and the decisions down **the moment they crystallise**. Do not batch writes for the end of the session. Reading `docs/CONTEXT.md` is not this; this skill *changes* the model.

- **Challenge the glossary.** If the user uses a word that conflicts with `docs/CONTEXT.md`, stop and ask which meaning wins.
- **Sharpen fuzzy language.** Overloaded words get a canonical term; the others go under `_Avoid_`.
- **Concrete scenarios.** When a relationship is on the table, invent an edge case that forces a boundary.
- **Cross-reference the code.** If they state how something works, check. Raise a contradiction rather than writing it into the glossary.
- **Update `docs/CONTEXT.md` inline** when a **term** settles. Create the file if needed, in the format above. Glossary only: no implementation, no spec prose.
- **Offer an ADR sparingly.** When a **hard-to-reverse choice** meets all three tests in [ADR-FORMAT.md](./ADR-FORMAT.md), write `docs/adr/NNNN-<slug>.md` in that turn. One decision per file. Match existing house shape if `docs/adr/` already has files.

## Where things go

One home per kind of information. Write each thing in its home and nowhere else.

| What settles | Where it is written |
|---|---|
| A term of the product language | `docs/CONTEXT.md` (see CONTEXT-FORMAT.md) |
| A question being decided | an epic in beads: `bd create "<question>" -t epic -d "<what is decided and the constraints>"` |
| An option weighed | a child spike: `bd create "<option>" -t spike --parent <question> -d "<what this path is>"` (never why it lost) |
| The user's choice (**choose an option**) | label the spike `chosen` and store the reason as its design: `bd label add <id> chosen` then `bd update <id> --design "<why this, and why not the others>"`. It stays open while its work runs. Work that follows is a task under it: `bd create "<task>" -t task --parent <id>`. Drop the other spikes as below. |
| An option dropped (**drop an option**) | `bd close <id> --reason "<one line why>"` then `bd label add <id> abandoned` (both steps, always); a longer argument goes in `bd comment <id> "..."` |
| A chosen option overturned | create the new option, then `bd supersede <old-id> --with <new-id>`; move the old one's open children under a live option or question, or abandon them |
| A fact you established while grilling (**record a finding**: looked up, tested, read in the code, or stated by the user) | a closed task labelled `conclusion`: `bd create "<the finding, one sentence>" -t task [--parent <epic>] -l conclusion -d "<evidence: what was checked and how>"` then `bd close <id>`. Hang it under the question, option or task it verifies (`--parent <id>`), or leave `--parent` out for a project-level finding. Only record what is established; a guess stays a spike or becomes a question. |
| Something only the user can settle, later (**flag a question for the person**) | `bd label add <id> human`, leave it open, and say so in the reply |
| A hard-to-reverse choice that passes all three ADR tests | the chosen option as above AND a long-form `docs/adr/NNNN-slug.md`; the option's `--design` names the ADR file, and the ADR names the option id. Do not repeat the options list in both places. |

The beads tree is the record of every decision: the question, its options, the chosen one and its work. An ADR is an optional long-form explanation for the few decisions that earn one. The glossary holds words, not decisions.

## Recording as you go

Write each thing the moment it crystallises, not at the end. Before opening a new epic, **read the recorded state**: list the questions, or search with two or three keywords. Extend an existing question instead of duplicating it. A sub-question is an epic under the item it grows from. Never re-ask something already decided or abandoned unless what ruled it out has changed; if it has, say what the record says and why you are reopening it (`bd reopen <id>`, then `bd label remove <id> abandoned`).

If the project has no `.beads` directory, do NOT run `bd init`. Keep decisions in the conversation (and ADRs when warranted), and say once that beads is not set up here.

## Done

The documents that settled during the rounds are already on disk. When the frontier is empty **and the user confirms a shared understanding**, give a short summary listing what was recorded, with ids: questions, chosen options, abandoned options, conclusions, glossary terms, ADRs. Branches left unsettled stay open as questions, labelled `human` when they wait on the user. Implementation work becomes tasks under the chosen option. Anything decided outside the grill can be recorded by a later review of the session.

If only product language settled, stop there.
