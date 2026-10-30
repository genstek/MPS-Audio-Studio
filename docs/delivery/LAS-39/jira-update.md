**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Research result — LAS-39

Scope: whether learned parameter prediction or style transfer adds value over the constrained reference matching of LAS-32, and what data, protocol, cost and privacy that would need.
- **Five approaches kept apart:** profile extraction, preference rules, parameter prediction, style transfer, actual training.
- **Data:** inventory (no real training data exists), permissions and consent rules. A leakage-safe protocol grouped by song was written before the experiment, and its checks run automatically before training.
- **Synthetic experiment** (32 songs, known decisions, 8 unseen test songs):
  - the closed-loop LAS-32 proposal matched the reference better than a learned ridge model: 0.11 vs 0.21 dB tonal; difference +0.10 dB, 95 % interval +0.08 to +0.12;
  - ridge's apparent EQ-parameter advantage was only a broadband offset that does not change the output (shape-only: +0.05 dB, interval −0.05 to +0.16);
  - a 1-NN model looked 2–3.5× better under a leaky split than under the grouped split.
- Reproduced exactly; 422 s on CPU, 249 MiB.
- **Decision:**
  - production training: NO-GO;
  - style transfer: NO-GO;
  - a local preference study from consented decisions or Gennady's own projects: possible as a separately scoped follow-up.

Branch / PR: research/LAS-39-model-training-assessment → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: not applicable (experiment under docs/ calls the delivery branch's own src/)
Material: docs/delivery/LAS-39/

| Criterion | Check | Actual result | Evidence |
| --- | --- | --- | --- |
| AC-01 approaches distinguished | five-way table | PASS | README |
| AC-02 provenance, splits, leakage before training | protocol + automated checks | PASS | protocol-tests.txt (9/9) |
| AC-03 baseline comparison | synthetic run; real data NOT_RUN; listening NOT_RUN | PASS (synthetic) | experiment-summary.json |
| AC-04 criteria, cost, privacy, go/no-go | recorded | PASS | README |

Commands/environment: node --test docs/delivery/LAS-39/experiment/protocol.test.js exit 0 (9/9); node docs/delivery/LAS-39/experiment/experiment.js exit 0 (twice, identical); Node 22.22, Linux.
Manual QA: docs/delivery/LAS-39/manual-qa.md; Gennady execution NOT_RUN.
Limitations/blockers: synthetic single-style data; no permitted real dataset; new opt-in needed before decisions could be used; listening not run.
Disposition: READY_FOR_QA (research report)

No claim of manual sign-off, Jira closure or main merge is implied.
