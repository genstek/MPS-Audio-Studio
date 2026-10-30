# LAS-39 — Assess training a separate audio model from references and user feedback

Jira: [LAS-39](https://genstek69.atlassian.net/browse/LAS-39) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-39.md` · Mode: RESEARCH · Prerequisites: LAS-33, LAS-29 (READY_FOR_QA)

Branch `research/LAS-39-model-training-assessment` (protocol, experiment and tests under `docs/`; no application change)

Developer status: **READY_FOR_QA** (research report; synthetic experiment run) · Real-data experiment: **NOT_RUN — no permitted dataset** · Listening evaluation: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Question
- Would a learned model add value beyond the studio's constrained reference matching (LAS-32)? This covers both learned parameter prediction and production-style transfer.
- What data, permissions, protocol, cost and privacy rules would that need?

Uploading a few songs to a chat does not train the assistant, and nothing in the studio trains on anything today.

## Five different things, kept apart
| Approach | What it is | Learns from data? | Status in the studio |
| --- | --- | --- | --- |
| **Profile extraction** | Measures a reference: loudness, peaks, octave-band shape, dynamics, stereo | No (measurement) | Done: LAS-26 analysis, LAS-30 profiles |
| **Preference rules** | Explicit user adjustments applied on top of a proposal (two shelves, starting strength), plus remembered decisions as a record | No (rules the user sets) | Done: LAS-33. Decisions are stored only on request; no proposal uses them |
| **Parameter prediction** | A model maps measured features to chain settings for the existing processors | Yes (labelled pairs) | **Evaluated here** on synthetic data with known truth |
| **Style transfer / end-to-end audio model** | A neural network changes the audio directly, or drives a differentiable chain | Yes (large paired audio sets) | Not run: data and compute blockers below. Output from the network itself would bypass the studio's processors, breaking the preview/export parity rule in AGENTS.md |
| **Actual model training** on references or user feedback | Training any of the learned approaches on real songs or decisions | Yes | Not started: needs permitted data and purpose-specific consent |

## Data inventory, permissions and protocol (written before the experiment)
**Inventory today:**
- **No real training data exists** in the repository or the studio.
- References are the user's own local files: analysed in the browser, with profiles stored owner-only (LAS-30).
- Remembered decisions (LAS-33) are settings summaries with an optional rating, stored only when the user ticks "Remember my decision". The Settings text says nothing is trained from them.

**Permissions any real dataset needs:**
| Source | Rights / consent question | Rule |
| --- | --- | --- |
| Gennady's own projects (unmastered mix + his final master) | His own work | Best first dataset: labelled pairs with known intent |
| Commercial reference tracks | Copyrighted | Local analysis features for personal use only. Training a model that is distributed, or pooling across users, needs a rights review. Audio is never stored for training |
| Remembered decisions and ratings | Personal data under the proposed privacy policy (LAS-20) | Today they are collected as "nothing trained". Using them needs a **new, explicit, purpose-specific opt-in**: per user, withdrawable, and propagated to deletion (forgetting a decision removes it from any model or retrains it). No pooling across users without that consent |

**Diversity** for real data: genres, eras and loudness practices, sparse and dense arrangements, mono and stereo, 44.1 and 48 kHz, short and long sections, and several references per style.

**Leakage-safe protocol:**
1. **Group by song**, and for real data by album/project and by user too. Every section, version, stem, remaster or decision of a song stays in one split.
2. Fix the test songs **before** any experiment, and do not look at them until the end.
3. Fit feature scaling on the training items only. Choose hyperparameters on validation only, then refit on training + validation, then score the test set once.
4. Run automated checks **before training** and refuse to train if one fails:
   - no song shared between splits;
   - no identical feature vectors across splits.
5. Use features available at proposal time only: the mix section and the reference section. Never use measurements of the processed result as inputs.
6. Report uncertainty across songs (song-level bootstrap), not across sections. With few songs, intervals matter more than means.
7. **Decisive criterion: listening**, level-matched and blind, with the LAS-29 protocol. Measurements alone do not prove audio quality.

**Leakage risks named:**
- neighbouring sections of the same master;
- the same song mastered differently;
- near-duplicate encodes of one track;
- the same user's decisions in training and test;
- normalisation fitted on all data;
- choosing a model by its test score;
- labels leaking through features.

## Experiment: learned parameter prediction vs LAS-32 (synthetic, known truth)
**Setup** (`experiment/`, all generated, nothing downloaded or uploaded):
- **Songs:** 32 synthetic songs, 8 s each, in the style of the LAS-29 fixture, each with its own seed, key, tempo, balance and brightness.
- **Decisions:** 3 known mastering decisions per song: low shelf, bell and high shelf within ±3 dB, then the studio's limiter with a known input gain of 0–6 dB at −1 dBTP.
- **Rendering and sections:** the studio's `renderChain` renders the "references". Each song has 2 non-overlapping sections, giving 192 items.
- **Split:** by song, 18/6/8: 108 training items, 36 validation, 48 test on 8 unseen songs. The leakage check is clean.
- **Methods compared** on the same test items:
  - **no processing**: the floor;
  - **LAS-32 deterministic**: the real `proposeChain`, with render-and-measure refinement and no training;
  - **ridge regression**: 13 features → octave-band EQ targets + input gain. Its output goes through the same `fitEq` guards and limiter;
  - **1-nearest-neighbour**, to show memorisation and leakage.
- **Measures:**
  - after rendering each method's chain on the test section and comparing with the reference (LAS-31): the tonal-shape mismatch (mean and max over octave bands, dB) and the loudness mismatch (LU);
  - in parameter space: the error of the EQ curve against the true EQ, raw and **shape-only** (offset removed), and the input gain error.

**Results on 8 unseen songs (48 items)** — lower is better. Source: `evidence/experiment-summary.json`.
| Method | Tonal mean dB | Tonal max dB | Loudness LU | EQ curve dB | EQ shape dB | Input gain dB |
| --- | --- | --- | --- | --- | --- | --- |
| no processing | 0.91 | 1.90 | 1.96 | 1.03 | 0.91 | 2.32 |
| **LAS-32 deterministic** | **0.11** | **0.26** | 0.23 | 1.09 | **0.40** | 0.89 |
| ridge (learned) | 0.21 | 0.54 | **0.16** | **0.57** | 0.45 | **0.40** |
| 1-NN (learned) | 0.44 | 1.19 | 0.68 | 0.84 | 0.65 | 0.87 |

**Differences to LAS-32,** song-level bootstrap with 95 % intervals (negative means the learned model is better):
| Comparison | Mean | 95 % interval | Reading |
| --- | --- | --- | --- |
| ridge − LAS-32, tonal mean | +0.10 dB | +0.08 to +0.12 | LAS-32 matches the reference better |
| ridge − LAS-32, loudness | −0.07 LU | −0.17 to +0.01 | no clear difference |
| ridge − LAS-32, EQ curve (raw) | −0.52 dB | −0.73 to −0.35 | ridge guesses the hidden EQ better… |
| ridge − LAS-32, EQ shape (offset removed) | +0.05 dB | −0.05 to +0.16 | …but only its broadband offset: no shape advantage |
| 1-NN − LAS-32, tonal mean | +0.33 dB | +0.27 to +0.40 | worse |

**What it means:**
- **The learned model's parameter advantage is an offset, not a better match.**
  - Raw EQ curve: ridge looks better at recovering the hidden EQ.
  - That gain is mostly the broadband offset. A broadband EQ offset and the limiter input gain are interchangeable for the output, and the analysis measures bands relative to the total.
  - Shape-only, ridge and LAS-32 are statistically equal (+0.05 dB, interval includes 0).
- **LAS-32 matches the reference better.** It renders and measures (closed loop), so it matches the measured reference about twice as closely (0.11 vs 0.21 dB).
- **This favoured the learned model and it still did not win.** The synthetic test songs come from exactly the training generator, so the learned model knew the "style" perfectly. On real music the gap is likely to favour the closed loop further.

**Leakage demonstration:** the same models trained and scored on a split by item, so sibling sections and decisions of a test song are in training.
| Model | Tonal mean dB (grouped → leaky) | Loudness LU | Input gain dB |
| --- | --- | --- | --- |
| 1-NN | 0.44 → **0.23** | 0.68 → **0.24** | 0.87 → **0.25** |
| ridge | 0.21 → 0.18 | 0.16 → 0.16 | 0.40 → 0.44 |

- The memorising model looks two to three and a half times better under leakage than it really is.
- The linear model barely changes, so leakage hides most in exactly the flexible models one would want to try.
- The automated check catches this split: 25 songs are shared between training and test.

**Learning curve (ridge, test songs):**
| Training songs | 3 | 6 | 12 | 18 |
| --- | --- | --- | --- | --- |
| EQ shape error (dB) | 1.04 | 0.64 | 0.46 | 0.45 |

The model is data-hungry at first and flattens at about 12 songs on this easy, single-style task. Real, varied music would need many more songs per style.

**Reproducibility:** two complete runs gave identical values: 1,440 per-item values compared, 0 differences (`evidence/reproducibility.txt`).

**Cost:**
- One run took 422 s on this Linux container's CPU with 249 MiB peak memory:
  - 113 s data generation;
  - 248 s grouped evaluation, mostly 48 LAS-32 render-and-measure proposals;
  - 61 s leaky evaluation;
  - under 0.1 s training.
- The features are 13 numbers per section and the ridge model is 14 × 10 weights. Parameter prediction is cheap; the data is the bottleneck.

## Decision
| Option | Decision | Why |
| --- | --- | --- |
| Production model training now | **NO-GO** | No permitted dataset. On synthetic data with known truth, learned prediction did not beat the closed-loop LAS-32 proposal on the measured match. Listening not run |
| End-to-end style transfer (audio out of a network) | **NO-GO** | Needs thousands of licensed paired masters and GPU training, and it is not explainable. It would replace the studio's processors and their preview/export parity |
| Learned parameter prediction as a **starting point** for LAS-32's refinement, or learned **preference** modelling from consented decisions | **Possible future study, separately scoped** | Value would come from taste (what Gennady chooses), not from matching measurements, which LAS-32 already does well. It needs real consented data |

**Proposed criteria for any future study, for Gennady to approve; these are not decided thresholds:**
- On held-out songs grouped by song/album, the learned variant is not worse in measured match: the interval's upper bound is at most +0.05 dB tonal and +0.1 LU.
- It is preferred in blind, level-matched listening (LAS-29 protocol) in significantly more than half of the trials.
- It costs nothing in preview/export parity: it outputs settings for the existing chain.

**Scoped next step,** if Gennady wants it:
1. Decide whether remembered decisions may be used for a **local, per-user** preference study. That needs a new purpose-specific opt-in, because the current text promises "nothing trained".
2. Assemble a small permitted set: his own projects, each with the unmastered mix and his final master.
3. Re-run this protocol with those songs. Replace `data.js`; the protocol, leakage checks and measures stay. Add the blind listening test.

## How to run
```sh
node --test docs/delivery/LAS-39/experiment/protocol.test.js          # 9 protocol tests, < 1 s
node docs/delivery/LAS-39/experiment/experiment.js results.json       # full experiment, ≈ 7 min, ≈ 250 MiB
```

## Files
- `experiment/data.js`: synthetic songs and known decisions.
- `experiment/features.js`: features, labels, the chain built from predictions, curve errors.
- `experiment/protocol.js`: splits, leakage checks, ridge, 1-NN, bootstrap.
- `experiment/experiment.js`: the experiment.
- `experiment/protocol.test.js`: tests.
- `experiment/compare-runs.py`: item-by-item comparison of two runs.
- `evidence/`: the experiment summary and per-item results, reproducibility, protocol test output.

## Limitations
- The data is synthetic and of one style. The chains are simple (three filters and a limiter, compressor off), so no claim is made about real music.
- No listening evaluation was run, and the measurements do not prove audio quality.
- 8 test songs give wide uncertainty, which is reported with each difference.
- The defect found while writing the experiment was in my own first metric, not in the studio. The raw EQ-curve error penalised LAS-32 for a broadband offset that does not change the output. The shape-only measure was added and reported next to it.
