---
name: cairn-record
description: Record decisions in the project's beads store and recall them. Use when you weigh two or more approaches, choose one, drop one, change an earlier decision, or need the person to decide, or settle a fact you looked up or tested; and before proposing or starting an approach, to check whether it was already tried and abandoned. Only for projects with a .beads directory.
---

# Cairn record

Decisions live in beads as ordinary issues, so the dashboard can draw them. The record is one tree. A question is an epic. Each option is a child of the question. A chosen option holds the work that follows from it.

Where your host gives dedicated tools for an action (its conventions say so), you MUST use those tools; do NOT run issue tracking commands directly in bash.

1. **Question**: an epic. A question represents an architectural or design fork. A sub-question has parent set to the item it grows from: the question it splits, the option it evaluates, the chosen option it follows from, or the task it came out of. Do not manually close questions; their state is computed automatically (open -> decided -> landed). (CLI: `bd create "<question>" -t epic -d "<what is being decided and the constraints>"`).
2. **Candidate option**: an open spike under its question. (CLI: `bd create "<option>" -t spike --parent <question> -d "<what this path is>"`). The description says what it is, never why it lost.
3. **Choose an option**: mark it chosen and store the reason as its design (rationale). Tasks are optional; tasks can be created later under the choice. (CLI: `bd label add <id> chosen` then `bd update <id> --design "<why this, and why not the others>"`).
4. **Work under the choice**: a task whose parent is the chosen option. Create concrete tasks under the chosen option whenever ready to break down work. Do not open a separate epic for open work. (CLI: `bd create "<task>" -t task --parent <option-id>`).
5. **Complete work or land a decision**: close a task when finished and verified. When all tasks under a chosen option are done, close the chosen option to mark the decision landed. (CLI: `bd close <id> --reason "<summary>"`).
6. **Drop an option**: close it with one line why and label it abandoned. Its open sub-questions and tasks go with it. (CLI: `bd close <id> --reason "<one line why>"` then `bd label add <id> abandoned`).
7. **Overturn a chosen option**: supersede the old option with the new one. Then move its open children under a live option or question, or abandon them. (CLI: `bd supersede <old-id> --with <new-id>`).
8. **Record a finding** (a conclusion): a fact you established (looked up, tested, read in the code, or stated by the user). Record it as a closed task labelled conclusion. Put it under the question, option or task it verifies. Only record what is established: a guess stays a candidate or a question. (CLI: `bd create "<the finding, one sentence>" -t task --parent <id> -l conclusion -d "<evidence>"` then `bd close <id>`).
9. **Flag a question for the person**: label it human, and say in your reply that you wait on them. (CLI: `bd label add <id> human` and comment).
10. **Query and inspect issues**: check ready work, inspect issue details, and search issues. (CLI: `bd ready`, `bd show <id>`, `bd list`).

Read the recorded state before you propose an approach:

- Listing the questions shows each one with its state: open (no option chosen yet), decided (an option is chosen, or sub-questions are still open), or landed (the chosen option is closed and its work is done).
- Reading one question's record shows the question, the sub-questions, each chosen option with its reason, progress and conclusions, the options considered and dropped with their reasons, and the findings that hang on the question.
- Searching finds issues by text in the title, description, design, notes and close reason.
- The session start already lists the recorded state: what needs the person, each open question with its state, and findings with no question. A later review of the session records what it decided but did not write down.

If something matching was abandoned, do not propose it again unless what ruled it out has changed. Say what the record says, and why you are reopening it (`bd reopen <id>`, then `bd label remove <id> abandoned`). If an option is chosen, follow it; if you think it is wrong, say so and supersede it.

Old stores may hold a `decision` type issue. It reads as a chosen option. Do not create new ones: label a spike `chosen` instead.
