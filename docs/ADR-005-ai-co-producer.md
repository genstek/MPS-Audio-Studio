# ADR-005 — AI Co-Producer foundation (MPS-AI-01)

Status: accepted for the foundation slice. Implements issue #59.

## Context
The AI Co-Producer is a feature of the existing studio, not a separate app. This milestone adds
only the safe plumbing: a typed EQ-only proposal contract, freshness rules, and single-owner
Preview. It makes **no network calls**, holds **no API keys**, and adds no assistant UI.

## Decisions
1. **Contract `mps-ai-eq-proposal/v1`** (`src/ai/eq-proposal.js`). Scope `master` only. A model
   may only supply EQ band edits (channel `linked|left|right`, index 0–23 or omitted for "first
   free band", `enabled`, `type`, `frequency`, `gain`, `q`) plus `reason` and `limitations` text.
   The app adds the opaque `id`, the base chain revision hash, project/media ids and an analysis
   description. Measured facts (`analysis`) are kept apart from model text (`reason`).
2. **Untrusted input.** Unknown fields, non-finite numbers, bad enums, duplicate/conflicting
   edits and out-of-range values are rejected. Nothing is evaluated; there are no tool commands.
3. **Merge into a fresh copy** of the committed chain; compressor, space, limiter and monitor are
   untouched. `validateChain()`, sample-rate limits and the existing EQ guards (`GUARDS` in
   `src/proposal.js`: ±band limits, no sub-40 Hz boost, total boost) apply. A full EQ yields a
   recoverable `no-free-band` error. Linked EQ edits both channels; independent EQ only the named one.
4. **Single-owner preview** (`src/ai/preview-coordinator.js`, exposed as `chain.previews`). One
   owner at a time (`reference-proposal`, `ai-eq`); another owner cannot take over; candidates are
   validated before they sound; release/reset (close, Reject, project load, unmount) restores the
   committed audio. The legacy `chain.setPreview(null)` also resets ownership. The coordinator
   never touches params, history, dirty state or export.
5. **Freshness and transaction** (`src/ai/proposal-session.js`). A proposal is stale after a manual
   edit, chain replacement, or project/media change; stale proposals cannot preview or apply.
   Apply is an explicit call, revalidates, and commits via `replace()` as one undo step. Preview
   never counts as Apply. A/B means A = committed processed chain, B = validated proposed chain,
   independent of Original/Processed and reference comparison.

## Provider roadmap (adapters in MPS-AI-03; none are called now)
OpenAI, Anthropic Claude, Google Gemini and **xAI Grok**. Every provider adapter returns raw
text/JSON that goes through the same `validateEqPayload()`; providers get no privileged path.

## Data and privacy boundary
- Local audio stays local. No WAV, stems, file bytes or raw filenames are sent by default.
- In later phases only explicitly approved measurement summaries and user-typed text may be sent,
  after the user sees what will be sent.
- No auto-apply, no writes to project files, no external audio transfer.

## Out of scope
Live provider calls, billing, secret management, AI panel/chat UI, EQ A/B visuals, stems,
waveform upload.

## Limitations
The reference ProposalPanel is wired to the coordinator; the new proposal session is not yet used
by any UI. Wiring the session to a project/media id source is left to the UI issue.
