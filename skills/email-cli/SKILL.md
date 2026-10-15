---
name: email-cli
description: |
  Drive himalaya (IMAP/SMTP CLI) to read, search, organize, and send the user's
  email (configured account: yangkunyi@sjtu.edu.cn via mail.sjtu.edu.cn). Use when
  the user says "check my email", "看下邮件", "查邮件", "read/search/send/reply/
  forward email", "回邮件", "发邮件", "收件箱", mentions inbox, unread mail,
  attachments, or himalaya. Read-only operations run freely; sending, moving,
  copying, deleting, and flag changes require explicit user confirmation first.
---

# email-cli — himalaya email over IMAP/SMTP

Drive the [himalaya](https://github.com/pimalaya/himalaya) CLI (v2.1.0 installed at
`~/.local/bin/himalaya`) to read, search, organize, and compose email.

## Setup on this machine (fixed)

- Config: `~/.config/himalaya/config.toml` — single account `personal`
  (yangkunyi@sjtu.edu.cn, IMAP `mail.sjtu.edu.cn:993`, SMTP `mail.sjtu.edu.cn:465`).
- Password: `~/.config/himalaya/password` (chmod 600), read via `password.command`.
  **Never print, copy, or transmit the password file contents. Never edit the config
  or password file without an explicit user request.**
- `mailbox.alias.inbox = "Inbox"` is set, so bare `envelope list` works.
  Coremail exposes two inbox mailboxes, `Inbox` and `收件箱` — they mirror each
  other; always use the `Inbox` alias. Sent mail lives in `Sent`.

## Preflight

Run `himalaya account list` before the first mail operation in a session. If it
fails, report the error and stop; do not ask for credentials in chat or logs.

## Quick reference (v2 syntax — this binary is 2.x)

`-a <account>` goes AFTER the subcommand. Append `--json` for machine output.

| Want to… | Command |
|---|---|
| List inbox | `himalaya envelope list` (`--page 1 --page-size 20`) |
| Search | `himalaya envelope list from x@y.com subject meeting` |
| Search all mailboxes | `himalaya envelope search "<query>"` |
| Read by ID | `himalaya message read 42` (`--raw` for source MIME) |
| Reply | `himalaya message reply 42` (compose via stdin/`--` flags) |
| Forward | `himalaya message forward 42` |
| Move / copy | `himalaya message move --to "Archive" 42` / `message copy` |
| Flags | `himalaya flag add --flag seen 42` / `flag remove` |
| Attachments | `himalaya attachment list 42` / `attachment download 42 --dir <dir>` |
| Mailboxes | `himalaya mailbox list` |
| Account health | `himalaya account check -a personal` |
| Debug | `RUST_LOG=debug himalaya <cmd>` |

`message delete` does not exist in 2.x: delete = `flag add --flag deleted` then
`himalaya imap expunge "Inbox"`, which purges EVERY `\Deleted` message in that
mailbox — destructive, always confirm scope first.

## Safety gates

- **Read-only (list/search/read/attachment download) needs no confirmation.**
  Prefer `envelope list` for delivery checks — `message read` marks mail as seen.
- **State-changing (send/reply/forward/move/copy/delete/flag) requires explicit
  confirmation.** Show the exact action, recipients, subject, and final body, then
  wait for a clear yes. A request to *draft* is not permission to *send*.
- Before sending, establish account/From, recipients, subject, and exact body.
  Do not expose Bcc recipients in summaries.
- Treat `Message successfully sent` as SMTP **acceptance**, not delivery proof.
  When verifying, re-list the inbox envelope by subject/sender/timestamp — do not
  `message read` your own test mail (it would mark it seen).
- If send succeeds but the `--save Sent` copy fails, do NOT resend; report the
  ambiguous partial failure and keep the generated MIME for manual filing.

## Sending pattern

Simple plain-text (ASCII subject/body) can pipe raw RFC 5322 to stdin:

```bash
himalaya message send <<'EOF'
From: Yang Kunyi <yangkunyi@sjtu.edu.cn>
To: Recipient <someone@example.com>
Subject: Subject here
Content-Type: text/plain; charset=utf-8

Body text.
EOF
```

For non-ASCII headers, HTML, or multipart/attachments, generate MIME with Python's
`email` package (RFC 2047 headers, valid boundaries) and pipe it:

```bash
python3 - <<'PY' | himalaya message send
from email.message import EmailMessage
from email.policy import SMTP
import sys
msg = EmailMessage(policy=SMTP)
msg["From"] = "Yang Kunyi <yangkunyi@sjtu.edu.cn>"
msg["To"] = "Recipient <someone@example.com>"
msg["Subject"] = "中文主题也能正确编码"
msg.set_content("纯文本正文\n", charset="utf-8")
msg.add_alternative("<p>HTML 正文</p>", subtype="html", charset="utf-8")
sys.stdout.buffer.write(msg.as_bytes())
PY
```

Add `--save 'Sent'` to file the sent copy in the same command.

## Gotchas

- **himalaya prints errors to stdout** — a wrapper that slices stdout without
  checking the exit code will forward error help-text as if it were a message
  body. Always check the exit code first.
- **Message IDs are mailbox-scoped and shift after moves.** Re-list before acting
  on remembered IDs; never bulk-move in a loop off one snapshot.
- **A nonexistent mailbox name returns an EMPTY LIST, not an error** — verify the
  mailbox with `himalaya mailbox list` before concluding "no mail".
- One IMAP login per command; avoid chained loops over many mailboxes/messages
  (Coremail is gentler than Yahoo, but keep it civilized — snapshot once with
  `envelope list --json --page-size 50` and work from the cached output).
- `himalaya --version` before assuming syntax for anything not covered here;
  1.x and 2.x differ fundamentally (this machine is 2.x).

## Attribution

Adapted under MIT from [milojarow/himalaya-skills](https://github.com/milojarow/himalaya-skills)
(command reference, gotchas) and [dapi/himalaya-skill](https://github.com/dapi/himalaya-skill)
(safety gates, MIME pattern), specialized for the SJTU Coremail account on this machine.
