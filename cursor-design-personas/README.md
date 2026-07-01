# Analyzthis_Design

7 AI design personas for Cursor. Run structured UX critiques and multi-phase ideation sessions — right inside your AI chat.

## Install

Works with **Cursor**, **Claude Code**, and **Codex CLI**.

```bash
# Cursor (default)
npx analyzthis_design

# Claude Code
npx analyzthis_design --target claude

# Codex CLI
npx analyzthis_design --target codex

# All three at once
npx analyzthis_design --target all
```

Skills are copied to the correct directory for each tool and available immediately.

| Tool | Install path |
|---|---|
| Cursor | `~/.cursor/skills/` |
| Claude Code | `~/.claude/commands/` |
| Codex CLI | `~/.codex/skills/` |

---

## What gets installed

### 2 Orchestrating Skills

| Skill | What it does |
|---|---|
| `/design-critic` | 4-persona critique → returns a `SHIP / REVISE / BLOCK` verdict with a Composite Score |
| `/ux-ideator` | 6-phase ideation workflow → produces two competing IA concepts, deliberates between them, and delivers an implementation-ready wireframe |

### 7 Individual Persona Skills

You can also invoke each persona directly.

| Skill | Persona | Role |
|---|---|---|
| `/arjun` | UX Agent | Scores designs on the UX Honeycomb (7 dimensions, A–F) |
| `/meera` | Business Agent | Evaluates retention, ARR, GTM lever, adoption risk by segment |
| `/priya` | Feasibility Agent | T-shirt sizes engineering effort using a 2-axis model, flags state machine traps |
| `/zara` | Delight Agent | Picks exactly ONE peak delight moment (or says "speed is the craft") |
| `/noor` | IA Architect | Produces Concept A — minimalist, progressive disclosure, ≤3 nav levels |
| `/anuj` | Power-User Advocate | Produces Concept B — dense, bulk actions, keyboard shortcuts |
| `/raj` | Arbitrator | Resolves stalemates using 5 ranked product principles — never speaks first |

### 1 Context Template

| Skill | Purpose |
|---|---|
| `/design-personas` | Session context template — fill in once before any session so all 7 personas have project-specific grounding |

---

## How to use

### Quick design critique

Open a Cursor chat and type:

```
/design-critic

[Paste your screen description, mockup link, or component spec]
```

Arjun, Meera, Priya, and Zara each evaluate the design independently. You get a Composite Score out of 20 and a clear `SHIP / REVISE / BLOCK` verdict.

---

### Full UX ideation from scratch

```
/design-personas
[Fill in the session context template]

/ux-ideator
[Describe the feature you need to design]
```

The 6-phase workflow runs:

1. **Meera** reframes the request as a business outcome
2. **Noor + Anuj + Arjun** audit the existing IA for gaps
3. **Noor** produces Concept A (minimalist), **Anuj** produces Concept B (dense)
4. They deliberate — **Raj** arbitrates if they deadlock
5. **Arjun** validates the synthesized concept on the UX Honeycomb
6. **Zara** adds one delight moment (or says it's a working surface, skip)
7. **Priya** sizes the engineering effort and flags risks

---

### Single persona

```
/arjun review this form flow — [description]
/priya estimate this feature — [description]
/zara find the delight moment in this onboarding — [description]
```

---

## CLI commands

```bash
# Install for Cursor (default)
npx analyzthis_design

# Install for Claude Code
npx analyzthis_design --target claude

# Install for Codex CLI
npx analyzthis_design --target codex

# Install for all tools at once
npx analyzthis_design --target all

# Force overwrite existing skills
npx analyzthis_design --target all --force

# Remove all installed skills (from a specific tool)
npx analyzthis_design remove --target cursor
npx analyzthis_design remove --target all

# Check what's installed
npx analyzthis_design list
npx analyzthis_design list --target all
```

---

## How it works

This package copies 10 SKILL.md files into your `~/.cursor/skills/` directory. Cursor automatically makes them available as `/skill-name` commands in any chat session. The skills are plain markdown — no backend, no API keys, no runtime dependencies.

Each persona has:
- A defined **lens** (what they evaluate and how)
- A **mandatory output format** (so you get structured, comparable output)
- **Canonical failure patterns** (real anti-patterns they watch for)
- **Failure modes** (where the persona itself can go wrong — so the AI self-corrects)

---

## Requirements

- [Cursor](https://cursor.com) with Agent Mode
- Node.js 16+

---

## License

MIT
