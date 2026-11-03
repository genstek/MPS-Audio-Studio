# Repository and Jira baseline audit

Date: 29 October 2026. Repository default main was inspected at **364d863de109d1e474bff0635bc0b451224e8860**, the accepted PR #8 merge. No open GitHub PRs were returned. All source reads used this immutable commit. This audit is code/document inspection; no application command or audio listening was executed in this preparation session.

## Observed in the current source

- React/Vite/JavaScript shell with named Transport, Tracks, Master and Mixer sections and the accepted responsive CSS.
- WAV extension, 100 MiB size and RIFF/WAVE-header checks; actual Web Audio decode and decoded metadata. A replacement is committed only after successful decode.
- A single engine owns context, source, saved pause offset, stop reset and natural-end/disposal cleanup. Play resumes; Pause is currently disabled once paused and does not toggle resume.
- No Unload action. No implemented waveform/seek/time display. Master level, EQ/Dynamics/Space and Export are disabled placeholders. Source connects directly to `context.destination`; there is no validated modern-app DSP, metering, processed export, reference/preset/stem/auth/storage implementation.
- Playwright config uses installed Chrome, baseURL `http://127.0.0.1:5173`, strict port and `reuseExistingServer: true`. Despite the config comment, reuse means a stale server is possible; establish server/checkout ownership before trusting a run.
- README describes manual port 5174, tests 5173. Recent owner's main retest used 5173. Use 5173 as the default QA URL only with verified ownership; document intentional alternate review ports.
- Current tree has no `.github/workflows` files. CI mentioned in older documents is not proof of an available or executed pipeline.

## Existing evidence, with limits

LAS-50 and LAS-51 are Done. Their comments and attached closure report record selected Claude revision 3, PR #8, user-approved original-defect closure and main 364d863de109d1e474bff0635bc0b451224e8860. Final historical Mac validation: lint/unit/build passed, initial E2E 12 pass/1 fail; isolated and single-worker reruns passed (13/13 for full sequential E2E). Initial Home/scrollTop long-name failure remains unexplained; do not call it fixed or blame workers without new evidence.

Desktop contract from closure: width ≥761 and height ≥450 CSS px, 100% zoom, essentials available before scrolling and no document scrolling; supplementary Master details may scroll. Width ≤760 uses stacked page scrolling. Preserve exact 817×598→785×520 and 1280×720 cases, continuous sweeps and overlap/hit-test checks. A finite matrix does not establish all viewports or audio fidelity.

## Reconciliation decisions

1. LAS-7/8/9/10 already have implementation in main: verify and finish specific gaps; do not scaffold duplicates or automatically close them from inspection.
2. LAS-11 and LAS-12 remain genuine missing enhancements.
3. LAS-40's sprint-03 table repeats LAS-28 and omits LAS-27. The actual issue sprint fields and native sprint goal put **LAS-26, LAS-27, LAS-44** in sprint 03; **LAS-28, LAS-29, LAS-45** in sprint 04. This package follows those actual fields.
4. LAS-48's LAS-44 Blocks link conflicts with the explicit urgent-layout waiver in its description. Verify the accepted urgent patch now; preserve final design gates for redesign. No source issue link is silently removed.
5. LAS-49's original statement that native Test Plan/Case/Execution types are unavailable is historical. These types now exist. Preserve its 24 cases and reconcile, rather than cloning all records.
6. LAS-55's actual current type is Test Execution and status Done; LAS-57 is TC-002. Memory labeling LAS-55 as an import bug is superseded.
7. Current source/ADR-002 overrides historical JUCE/Tauri stack assumptions. New auth/storage requirements justify a separately documented backend decision; no native migration is implied.

Original descriptions, custom test fields, links, comment bodies and attachment metadata are preserved in `sources/jira-issues.json`; private attachments are not copied into a new public location.
