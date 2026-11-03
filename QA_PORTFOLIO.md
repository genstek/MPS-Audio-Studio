# QA Portfolio | MPS Audio Studio

**Focus:** Manual QA, test design, exploratory testing, defect reporting, regression testing, test automation review, and release-quality evidence.

**Project:** MPS Audio Studio is an independent, in-development audio web application project. It is not presented as a released commercial product.

## What I do as QA

- Define test coverage, acceptance criteria, risk areas and regression checks.
- Perform hands-on UI and exploratory testing using Chrome DevTools and different viewport sizes.
- Create reproducible Jira bug reports with environment, steps, expected and actual behavior, and supporting evidence.
- Maintain links between requirements, test cases, test execution, defects, code fixes and pull requests.
- Use Playwright and Vitest test results to validate changes; distinguish automated results from manual QA execution.
- Work with AI coding tools on implementation tasks, then review behavior and report issues. AI-assisted code is not represented as independently hand-written automation.

## Selected QA evidence

| Type | Example | What it demonstrates |
| --- | --- | --- |
| Bug report | [LAS-51: Tracks clipping and Export overlap](https://genstek69.atlassian.net/browse/LAS-51) | Reproduction at 817 x 598 and 785 x 520, actual vs expected, recording, linked fix |
| Bug report | [LAS-50: Mixer outside viewport](https://genstek69.atlassian.net/browse/LAS-50) | UI regression, reproducible screen-size issue |
| Test plan | [LAS-49: Responsive test plan](https://genstek69.atlassian.net/browse/LAS-49) | 24 designed cases, viewport and boundary matrix, accessibility / browser coverage; the cases are **not claimed to have been executed** |
| Manual execution | [LAS-55: Manual smoke execution](https://genstek69.atlassian.net/browse/LAS-55) | Recorded PASS with environment, build commit and test-evidence links |
| Test plan | [LAS-52: Browser smoke test plan](https://genstek69.atlassian.net/browse/LAS-52) | Traceability from test plan to test cases and execution |
| Automation example | [TC-002: valid WAV import (Playwright)](tests/e2e/import-valid-wav.spec.js) | UI state, input, decoded metadata, play/pause/stop assertions |
| Negative test | [TC-003: invalid/unsupported files](tests/e2e/import-errors.spec.js) | Clear error messages and recovery to valid import |
| Layout regression | [LAS-51 responsive test](tests/e2e/LAS51-layout.spec.js) | Continuous viewport transitions, clipping and overlap detection |
| QA release criteria | [QA acceptance gates](docs/QA_ACCEPTANCE.md) | Functional, failure recovery, DSP, export, project and packaging checks |
| Code and checks | [Pull requests](../../pulls) and [GitHub Actions](../../actions) | Review/merge trace, CI results and limitations |

**Current evidence, not a blanket quality claim:** The [integration review PR #42](../../pull/42) documented a passing Linux run on October 30, 2026 (275 Vitest and 81 Playwright tests). It also clearly recorded **manual QA not run** for the larger delivery. A later Apple CI run on November 3 passed its own defined job; that does not establish a full fresh E2E regression pass.

## How to review this portfolio

1. Start with the [LAS-51 bug](https://genstek69.atlassian.net/browse/LAS-51): reproduce steps, expected/actual results and evidence.
2. Open the [LAS-49 test plan](https://genstek69.atlassian.net/browse/LAS-49): see coverage and boundary conditions.
3. Inspect [TC-002](tests/e2e/import-valid-wav.spec.js), [TC-003](tests/e2e/import-errors.spec.js) and [layout regressions](tests/e2e/LAS51-layout.spec.js).
4. Check [LAS-55 manual execution](https://genstek69.atlassian.net/browse/LAS-55) and project CI results.

**Access note:** Jira may require an Atlassian login and project permissions. If it is not accessible, the examples can be reviewed during an interview screen-share. Repository links work for external reviewers only after repository visibility has been changed to Public.

**Status note:** This is a live development project. Open defects, incomplete features, pending test cases and work still in review are intentional parts of the QA lifecycle and are labelled as such.
