**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Research result — LAS-36

Scope: evaluate stem separation quality, runtime and deployment.
- **Run here:** two classical DSP separators on a generated ground-truth stem set.
- **Not run:** ML separators (Demucs v4, Open-Unmix, Spleeter). Their runtime and model hosts are refused by this environment's proxy (403), and the evidence records each host.
- **Outcome:** classical separation is a **NO-GO** (vocals SI-SDR −10 dB; drums 2–3 dB with 13–16 dB of kick transient loss, even on easy synthetic material). The ML decision is **open**.
- A runnable scorer (`separation_eval.py --score`) makes the next step reproducible on Gennady's Mac.

Branch / PR: research/LAS-36-stem-separation → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: not applicable (report and tool only)
Material: docs/delivery/LAS-36/

| Criterion | Check | Actual result | Evidence |
| --- | --- | --- | --- |
| AC-01 two feasible approaches; unavailable ones documented | A and B run; ML blocked with evidence | PASS (feasible subset) | evidence/separation.json, evidence/model-hosts.md |
| AC-02 listening and objective comparison | objective PASS; listening NOT_RUN | PARTIAL | evidence/separation.json |
| AC-03 runtime/memory/license/deployment/cost | measured and recorded; licenses to verify | PASS | README |
| AC-04 go/no-go, gates, scoped next step | NO-GO classical; ML open; gates; next step | PASS | README |

Commands/environment: Python 3.13, numpy 2.5.4, scipy 1.18.1 in a scratch venv; separation_eval.py exit 0; score round trip identical.
Manual QA: docs/delivery/LAS-36/manual-qa.md — run ML candidates and the listening review on Gennady's Mac; NOT_RUN.
Limitations/blockers: synthetic ground truth only; ML candidates and listening NOT_RUN; licenses recalled, not re-verified.
Disposition: READY_FOR_QA (research report; ML evaluation blocked here)

No claim of manual sign-off, Jira closure or main merge is implied.
