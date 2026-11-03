# LAS-36 — Evaluate AI stem separation quality, runtime and deployment options

Jira: [LAS-36](https://genstek69.atlassian.net/browse/LAS-36) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-36.md` · Mode: RESEARCH · Prerequisite: LAS-35 (READY_FOR_QA)

Branch `research/LAS-36-stem-separation` (report and evaluation tool only; no application change)

Developer status: **READY_FOR_QA** (research report for the feasible subset) · ML candidates: **NOT_RUN — blocked by this environment's network policy** · Listening comparison: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Question
Can the studio offer AI separation of a stereo mix into vocals / drums / bass / other with useful quality? If so, how would it run (locally, in the browser, or on a server), and at what privacy and cost?

## What could be run here, and what could not
| Candidate | Kind | Status here | Why |
| --- | --- | --- | --- |
| Demucs v4 / HTDemucs (Meta) | ML, PyTorch | **NOT_RUN** | PyTorch CPU index (`download.pytorch.org`) and model host (`dl.fbaipublicfiles.com`) refused by the proxy (403) |
| Open-Unmix (sigsep) | ML, PyTorch | **NOT_RUN** | weights on Zenodo / GitHub releases: refused (403) |
| Spleeter (Deezer) | ML, TensorFlow | **NOT_RUN** | models on GitHub releases: refused (403) |
| A: HPSS, hard masks + band split | classical DSP | **RUN** | numpy/scipy from PyPI (reachable) |
| B: HPSS, soft (Wiener-style) masks + mid/side vocal mask | classical DSP | **RUN** | as above |

Evidence for the blockers: `evidence/model-hosts.md`, the reachability of each host and the failed install, recorded on 2026-10-30. PyPI itself is reachable. However, its Linux PyTorch build pulls in several GB of CUDA libraries, and a separator without weights is useless, so no ML candidate can be evaluated in this container.

## Method (feasible subset)
- **Ground truth:**
  - a generated stem set, `mps-stemset-1`: 12 s, 44.1 kHz, stereo, built from the same kinds of sources as the LAS-29 programme fixture (formant voice, kick/snare/hat, decaying bass, panned chords);
  - the mixture is the exact sum of the stems;
  - no recorded or copyrighted audio is used.
- **Candidates:**
  - **A:** harmonic/percussive separation by median filtering (Fitzgerald 2010) with hard masks; drums = percussive; bass = harmonic below 120 Hz; vocals = harmonic mid channel 500 Hz–3 kHz; other = the remainder.
  - **B:** the same with soft masks, and a vocal estimate from the bins where the mid channel dominates.
- **Measures** (`tools/separation_eval.py`):
  - **SI-SDR** per stem (scale-invariant signal-to-distortion ratio, dB; higher is better; 0 dB means as much error as signal);
  - **bleed:** the energy of each other true source projected into the estimate, relative to the estimate;
  - **transient damage:** kick peak level in the 5 ms after each onset, estimate vs truth;
  - **phase/mono:** L/R correlation of estimate vs truth, and mono fold-down loss;
  - **recombination residual:** the sum of estimates vs the mixture;
  - runtime and peak memory.

## Results (`evidence/separation.json`)
| Stem | A: SI-SDR | B: SI-SDR | Notes |
| --- | --- | --- | --- |
| Vocals | **−9.8 dB** | **−10.6 dB** | Fails: the "other" chords dominate the estimate (bleed −12.5 dB) |
| Drums | 2.4 dB | 3.4 dB | Kick transients lose **16.3 dB** (A) / **13.0 dB** (B) of peak level. The kick's pitched sweep is treated as harmonic and lands in "bass" (bass estimate: drums bleed −6.7 dB) |
| Bass | 4.0 dB | 4.2 dB | Contaminated by the kick |
| Other | 7.0 dB | 6.6 dB | Best, because it is the remainder |

| | A | B |
| --- | --- | --- |
| Recombination residual | −242.7 dB (exact by construction: "other" is the remainder) | same |
| Runtime, 12 s of stereo | 2.4 s (4.9× real time) | 2.5 s (4.8×) |
| Peak memory (whole run) | 484 MiB | — |
| Phase/mono | L/R correlation of estimates within 0.004 of truth; no mono loss | same |

Host: this container (4 × Xeon 2.8 GHz, Python 3.13, numpy 2.5, scipy 1.18). These figures describe synthetic material, which is far easier than a real mix. They show the classical methods' ceiling, not their typical quality.

The scorer was checked by writing the truth stems and A's estimates to WAV and scoring them through `--score`: the SI-SDR values are identical (`evidence/score-roundtrip.json`).

## Licenses, deployment, privacy and cost (assumptions to verify)
- **Licenses** (recalled from upstream documentation; **not re-verified here**, because the sites are unreachable):
  - Demucs code is MIT;
  - Open-Unmix code is MIT, but its larger pretrained model has a non-commercial weight license;
  - Spleeter is MIT, including its models.
  - Each model's **weight** license must be checked before any product use. Training-data terms (for example the non-commercial MUSDB18) also matter.
- **Deployment options:**

  | Option | Privacy | Notes |
  | --- | --- | --- |
  | Local on the user's computer (Python or native helper) | audio stays on the device | fits the studio's "local by default" rule; needs installation and model download on the user's machine |
  | In the browser (ONNX Runtime Web: WebAssembly or WebGPU) | audio stays on the device | model download of tens to hundreds of MB; WebGPU availability varies; **feasibility not measured** |
  | Server (GPU) | audio leaves the device | needs explicit per-file consent (LAS-24 consent model), retention rules and the ADR-003/privacy approval |

- **Cost model** (no measured figures; a formula to fill in once runtime is measured):
  - server cost per song ≈ GPU price per hour × song minutes × processing-time ratio ÷ 60, plus storage and egress;
  - local and in-browser options cost the user time, not the operator money.

## Recommendation
| Decision | Verdict |
| --- | --- |
| Ship classical separation (A/B) as "stem separation" | **NO-GO.** Vocals fail outright and drums lose transients, even on easy synthetic material. Labelling it separation would mislead users |
| Adopt an ML separator | **Not decided: evaluation blocked here.** Run the scoped next step below on a machine with model access |
| Describe any separation as lossless source recovery | **Never.** Separated stems are estimates with bleed and artefacts; the UI must say so |

**Quality gates for a future GO** (all measured with `tools/separation_eval.py --score` plus a listening review):
1. On at least 10 authorized multitracks, per-stem SI-SDR is reported for each candidate, with the numbers recorded rather than assumed. The gate thresholds are set by Gennady from those results and a listening review: bleed, transient damage and warbling rated per stem.
2. A recombination residual (sum of estimates vs mixture) of −30 dB or better, or a documented remainder rule.
3. Mono compatibility: no stem loses more than 1 dB in mono beyond its truth.
4. Runtime under the chosen deployment's limit, measured on Gennady's Mac; peak memory recorded.

**Scoped next step (separate ticket, not this one):**
- On Gennady's Mac, or any machine where the model hosts are reachable, install one or two ML candidates in a virtual environment and separate the authorized multitracks' mixtures.
- Score them with `python tools/separation_eval.py --score <truth> <estimates>`, and run the listening review.
- Then decide GO or NO-GO, with the deployment option and licenses checked.
- The studio integration (LAS-34/35 stems as input) would be scoped only after a GO.

## How to run
```sh
python3 -m venv .venv && .venv/bin/pip install -r docs/delivery/LAS-36/tools/requirements.txt
.venv/bin/python docs/delivery/LAS-36/tools/separation_eval.py                 # synthetic evaluation (JSON)
.venv/bin/python docs/delivery/LAS-36/tools/separation_eval.py --export out    # truth, mixture and A's estimates as WAV
.venv/bin/python docs/delivery/LAS-36/tools/separation_eval.py --score truth/ estimates/   # score any separator
```

## Limitations
- Synthetic ground truth only: real mixes have reverb, overlapping spectra and effects that these figures do not show.
- No ML candidate could be run here, and no listening comparison was made.
- The license statements above are from memory of upstream documentation and must be verified.
