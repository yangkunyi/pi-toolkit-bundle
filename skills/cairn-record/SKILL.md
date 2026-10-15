---
name: cairn-record
description: Record decisions in the project's beads store and recall them. Use when you weigh two or more approaches, choose one, drop one, change an earlier decision, or need the person to decide, or settle a fact you looked up or tested; and before proposing or starting an approach, to check whether it was already tried and abandoned. Only for projects with a .beads directory.
---

# Cairn record

Decisions live in beads as ordinary issues, so the dashboard can draw them. The record is one tree. A question is an epic. Each option is a child of the question. A chosen option holds the work that follows from it. The commands below are plain `bd`. Where your host gives a dedicated tool for an action (its conventions say so), use that; it does the same steps.

1. **Question**: an epic. `bd create "How should sessions be stored?" -t epic -d "<what is being decided and the constraints>"`
2. **Candidate option**: an open spike under its question. `bd create "Redis" -t spike --parent <question> -d "<what this path is>"`. The description says what it is, never why it lost.
3. **Choose an option**: label it `chosen` and store the reason as its design. `bd label add <id> chosen` then `bd update <id> --design "<why this, and why not the others>"`. A new option chosen at once: `bd create "<option>" -t spike --parent <question> -l chosen --description "<what>"`, then the design. Leave it open while its work runs. Close it when that work is done, or at once when no work follows: `bd close <id>`. A closed chosen option counts as landed. A question can have more than one chosen option, each for a part of it. Supersede only when the new option replaces the old one.
4. **Work under the choice**: a task whose parent is the chosen option. `bd create "Add the session table" -t task --parent <option-id>`. Do not open a separate epic for open work.
5. **Drop an option**: close it with one line why and label it `abandoned`. `bd close <id> --reason "<one line why>"` then `bd label add <id> abandoned`. Its open sub-questions and tasks go with it. A longer argument goes in `bd comment <id> "..."`.
6. **Overturn a chosen option**: `bd supersede <old-id> --with <new-id>`, after you create the new option. Do not edit the old one in place. Then move its open children under a live option or question, or abandon them.
7. **Sub-question**: an epic under the item it grows from: the question it splits, the option it evaluates, the chosen option it follows from, or the task it came out of. `bd create "<sub-question>" -t epic --parent <id>`.
8. **Record a finding** (a conclusion): a fact you established (looked up, tested, read in the code, or stated by the user). Record it as a closed task labelled `conclusion`: `bd create "<the finding, one sentence>" -t task --parent <id> -l conclusion -d "<evidence: what was checked and how>"`, then `bd close <id>`. Put it under the question, option or task it verifies. Only record what is established: a guess stays a candidate or a question. Optionally link what it came from with `--deps discovered-from:<id>`.
9. **Flag a question for the person**: `bd label add <id> human`, and say in your reply that you wait on them.

Read the recorded state before you propose an approach:

- Listing the questions shows each one with its state: open (no option chosen yet), decided (an option is chosen, or sub-questions are still open), or landed (the chosen option is closed and its work is done).
- Reading one question's record shows the question, the sub-questions, each chosen option with its reason, progress and conclusions, the options considered and dropped with their reasons, and the findings that hang on the question.
- Searching finds issues by text in the title, description, design, notes and close reason.
- The session start already lists the recorded state: what needs the person, each open question with its state, and findings with no question. A later review of the session records what it decided but did not write down.

If something matching was abandoned, do not propose it again unless what ruled it out has changed. Say what the record says, and why you are reopening it (`bd reopen <id>`, then `bd label remove <id> abandoned`). If an option is chosen, follow it; if you think it is wrong, say so and supersede it.

Old stores may hold a `decision` type issue. It reads as a chosen option. Do not create new ones: label a spike `chosen` instead.
