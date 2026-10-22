# LAS-51 result — Claude Code attempt (final, revision 3)

## Summary
The final bounded attempt meets the stated acceptance criteria **in this Linux environment** (Chromium 141, Linux fonts). Desktop range: width ≥ 761 and height ≥ 450 CSS px at 100 % zoom. In every tested state (empty, WAV-loaded, long file name, load error), immediately after resizing and before any scrolling:
- no document scrolling;
- every essential element is fully visible and uncovered: Play, Pause, Stop, playback status, Tracks heading, Import/Replace WAV, Master heading, Master level, Export WAV, all four channel headings, knobs and buttons, the whole footer (and the error message when present);
- no Mixer inner scrolling and no panel overlap.

**macOS has not been tested.** The candidate is published on a fix branch for the owner's Mac (see Delivery). LAS-51 remains open until the Mac checks pass.

History: attempt 1 hid the Mixer buttons at 785×520 and lost the footer at 804×471. Revision 2 fixed those but hid the knobs at 471 px and kept the Master level control inside the scroller. Both were rejected and are kept as evidence (`evidence/attempt-1/`, `evidence/revision-2/`). Revision 2 is preserved as a local checkpoint commit `29910b7` on branch `checkpoint/las51-claude-r2` in the cloud worktree; that branch was not pushed.

## Identity
- Tool / model / version: Claude Code 2.1.308, cloud session (claude.ai/code, Anthropic cloud container). The model is reported in the chat handoff, not in repository files.
- Worktree / branch: `/home/user/MPS-Audio-Studio-Claude-LAS51` (cloud container), comparison branch `compare/las51-claude`. Published candidate: `fix/LAS-51-claude-essential-controls`. The owner's original working folder was not touched.
- Starting HEAD: `a154430f86e66f4f18f21ba25ff99fbb4d5ad056`. Only `fix/LAS-51-workspace-clipping` was fetched. The `cursor/…las51…` branch and its PR were never fetched or read.
- OS / Node / npm / browser versions: Ubuntu 24.04.5 LTS (Linux 6.18, x86_64), Node v22.22.0, npm 10.9.4, @playwright/test 1.64.1, Vite 8.3.4, Vitest 5.0.5, ESLint 10.13.0. Browser: preinstalled Chromium 141.0.7390.37. The repo's `channel: 'chrome'` is not installed here and its download is blocked, so E2E ran through an out-of-repo config that only swaps the executable.
- Server owner, working directory and port verification: 5173 was checked free before every run; the override sets `reuseExistingServer: false`; the listener's PID and cwd were recorded (`/home/user/MPS-Audio-Studio-Claude-LAS51`, `evidence/final/server-owner.txt`). Reference renders of older versions used separate read-only copies on ports 5174–5176, which were stopped afterwards.

## Baseline (unchanged from the first report)
- On Linux, unmodified `a154430` failed both broad tests at 1280×720 (sub-pixel `scrollIntoViewIfNeeded`, ratio 0.9665). On the supplied Mac log they failed after `Control+End` (ratio 0).
- Before scrolling, the baseline shows 0 of 4 Mixer buttons at every short sample; at 804×471 the Mixer strip area collapses to 0 px.
- Artifacts: `evidence/baseline/`.

## Diagnosis
- Confirmed application layout causes (baseline and earlier attempts):
  1. The Mixer row could shrink to nothing (baseline). A flex-factor sum below 1 also handed 35 % of the leftover height to the header, Transport and footer as empty space.
  2. The minimum row heights counted decoration (♫ icon, 46 px knobs, captions, the vertical empty-state stack) but gave the essential controls no guaranteed space. Attempt 1's fixed 7rem Mixer floor was too small to show the buttons at 785×520 and too large for 471 px (document 500 px in a 471 px window, footer off-screen).
  3. The Master level control lived inside the scrollable Master details, so on short screens it scrolled out of view (baseline, attempt 1, revision 2).
  4. Long file names wrapped onto extra lines, and the error message was tall, so the load-error and long-name states overflowed at small heights (revision 2: +39 px and +8 px at 804×471).
  5. Found during this attempt: with `overflow: hidden` (needed for the ellipsis), grid rows sized `auto` may shrink text items to 0 px instead of letting them overflow, so a clipped title would go unnoticed. Fixed with `min-content` rows, and the test now checks vertical clipping (`scrollHeight > clientHeight`).
- Confirmed test or environment causes: as before. These are sub-pixel `scrollIntoViewIfNeeded`, programmatic versus keyboard scrolling, `Control+End` without a macOS editing command in Playwright, the earlier test's loopholes, and the stale-server risk from `reuseExistingServer: true`.
- Keyboard (final, Linux): the Mixer never needs internal scrolling at desktop sizes (e.g. 71/71 px at 761×450, 191/191 at 776×888). Tab reaches it with a visible focus ring. Master details: Tab from Import → focus ring → End reaches the end (e.g. 84/84 at 761×450, 28/28 at 1280×720) → Home returns to 0, and focus stays (`evidence/final/measurements-*.md`).
- Unknowns: Chrome-on-macOS behaviour and geometry with macOS fonts.

## Changes
- Changed files:
  - `src/main.jsx` — markup only. The Tracks content is wrapped in `.track-content` and the ♫ glyph in an inner span. The file-name heading gets a `title` with the full name. The Master level label, slider and note move out of the `Master details` scroller into `.master-level`. The strip markup is back to the original. No text, accessible name, role, `aria-hidden` or handler changed.
  - `src/styles.css` — size-container arrangements, row priorities, the Master layout, single-line long text, a compact error message and short-viewport density.
  - `tests/e2e/LAS51-layout.spec.js` — the new acceptance checks, regression samples, sweeps and state tests.
  - `docs/LAS-51-comparison/` — this result and the evidence.
  - Unchanged: `tests/e2e/LAS51-responsive.spec.js` (original reproduction, `ratio: 1`, byte-for-byte), the other tests, `playwright.config.js`, dependencies, `src/audio-engine.js`.
- Important code:

  ```css
  /* each row's minimum = its compact arrangement; Tracks stacks first, the Mixer may grow while
     29rem of the viewport remain for the rest, then the workspace takes what is left */
  main { --space: clamp(6px, 1.6dvh, 20px); --mixer-max: clamp(0px, 100dvh - 29rem, 15rem); …;
         grid-template-rows: auto auto minmax(min-content, 1fr) minmax(min-content, var(--mixer-max)) auto; }

  /* Tracks: size container with a reserved compact height */
  .track-space { container: track / size; contain-intrinsic-block-size: 4rem; … }
  .track-content { display: grid; grid-template-rows: minmax(0, 2.75rem) repeat(4, min-content);
                   grid-template-areas: "icon" "title" "info" "picker" "note"; … }      /* stacked */
  @container track (height < 9.75rem) {                                                  /* compact row */
    .track-content { grid-template-areas: "title picker" "info picker" "note picker"; … }
    .audio-icon { display: none; }
  }

  /* Mixer: full strips by default; caption dropped below 10.5rem; knob beside button below 7.5rem */
  .strips { container: strips / size; contain-intrinsic-block-size: calc(var(--space) + 4rem); … }
  .strip { display: grid; grid-template-areas: "title" "knob" "caption" "button"; … }
  @container strips (height < 10.5rem) { .strip { grid-template-areas: "title" "knob" "button"; } .strip p { display: none; } … }
  @container strips (height < 7.5rem) { .strip { grid-template-columns: 1fr 1fr; grid-template-areas: "title title" "knob button"; } .knob { width: 30px; } … }

  /* Master: only the details scroll; level control and Export are outside the scroller */
  .master-body { contain: size; flex: 1; min-height: calc(2 * var(--space) + 1.25rem); overflow: auto; … }
  .master-level { border-top: 1px solid #39434c; … }
  ```

  ```js
  // tests: desktop, immediately after resizing, before any scrolling
  ['playback status', transport.getByRole('status')], ['Master level', master.getByRole('slider', { name: 'Master level' })],
  [`${name} knob`, strip.locator('.knob')], ['footer', page.locator('footer')], /* + error message if shown */
  await expect(masterBody.getByRole('slider')).toHaveCount(0);               // level control not in the scroller
  expect(squeezed, `${label}: Tracks text and file button fully shown inside their area`).toEqual([]);
  ```
- Simple Russian explanation of the CSS/JavaScript:
  - **Две «раскладки» вместо прокрутки.** У Tracks и у полосок Mixer теперь по две-три готовые раскладки. Браузер сам выбирает подходящую по тому, сколько места реально досталось панели (`container-type: size` и `@container`). Если места много, всё как раньше: в Tracks иконка ♫, заголовок, кнопка Import по центру; в Mixer заголовок, «ручка» 46px, подпись и кнопка столбиком. Если места мало, Tracks становится строкой (текст слева, кнопка справа), а в Mixer «ручка» встаёт рядом с кнопкой. Заголовки, «ручки» и кнопки видны всегда. Это не правила под конкретные размеры окна: решение зависит от реальной высоты панели.
  - **Минимум гарантирован заранее.** `contain-intrinsic-block-size` резервирует под каждую панель высоту её компактной раскладки. Поэтому сетка страницы никогда не сожмёт панель так, чтобы важное не поместилось. Свободное место раздаётся по очереди: сначала Tracks получает место для своей полной раскладки, затем Mixer (формула `100dvh - 29rem`), остаток идёт рабочей зоне.
  - **Master.** Регулятор Master level с подписью вынесен из прокручиваемой области «Master details» и стоит над Export. Прокручиваются только дополнительные сведения, а регулятор и Export видны всегда.
  - **Длинные строки.** Длинное имя файла показывается в одну строку с многоточием, полное имя видно во всплывающей подсказке (`title`) и остаётся текстом заголовка для экранного диктора. Сообщение об ошибке стало компактнее.
  - **`min-content` вместо `auto`.** Строки сетки в Tracks имеют размер `min-content`: текст не может сжаться до нуля. Если места не хватит, текст вылезет наружу, и тест это поймает.
  - **Тесты.** Сразу после изменения размера, без прокрутки, проверяется: страница не прокручивается; все важные элементы (включая статус, «ручки», Master level, весь футер и сообщение об ошибке) полностью видны и ничем не закрыты; панели не перекрываются; Master level не внутри прокрутки; текст в Tracks не обрезан и не вылез. Отдельные тесты проверяют длинное имя и ошибку загрузки, «развёртки» — высоты 450–1080 и ширины 761–1440.
- Test changes and why coverage was preserved:
  - The original reproduction test is unchanged and still requires `ratio: 1`. Nothing was skipped, deleted, loosened or marked as expected to fail.
  - The desktop before-scrolling check covers everything listed above, plus Tracks text and file button kept at full height inside their area.
  - Main matrix: 29 viewports per state in one page without reloading. It includes 776×888, 817×598, 785×520, 989×610, 971×553, 804×471, 784×626, 1920×1080, 1440×900, 1280×720, the range corners 761×450 and 1440×450, intermediate sizes, width-only and height-only changes, breakpoint crossings 761→760→759→762→600→761→760→785 and growth back.
  - State tests: long file name and load error at 14 viewports each. Sweeps: heights 450–1080 every 30 px at widths 761, 1024 and 1440, plus widths 761–1440 every 97 px at 450.
  - Kept: panel overlap, Export below the details, Master details reachable at both ends and keyboard-scrollable, the stacked layout reachable by page scrolling, and playback state across resizing.
  - Detection (`evidence/final/detection/`), at 804×471, 761×450 and 776×888:
    - **Older versions:** baseline, attempt 1 and revision 2 fail 3 of 3; the final version passes 3 of 3.
    - **Mutations caught:** knobs hidden (3/3), Export pulled over the level control (3/3), Tracks text pushed out of its area (3/3), strips not compacting (2/3; at 776×888 no compaction is needed).
    - **Mutation that changes nothing on screen:** shrinking the Tracks reserve to 2rem. It passes because the Master panel sets that row's height at these sizes.

## Final verification
| Check | Command / procedure | Result | Evidence |
|---|---|---|---|
| Original Import WAV reproduction | Full suite + `--repeat-each=2 --workers=4` | PASS, 3 of 3 runs | `final/e2e-console.txt`, `final/e2e-repeat-each-2-workers-4.txt` |
| Empty and WAV-loaded matrices (29 sizes each) | `LAS51-layout.spec.js` | PASS, 3 of 3 runs | same; `final/screenshots/` |
| Long file name and load error (14 sizes each) | state tests | PASS, 3 of 3 runs | same |
| Sweeps (74 sizes, 450–1080 px tall) | sweep tests | PASS, 3 of 3 runs | same |
| Before-scrolling probe, 4 states × 22 sizes | `tools/accept.mjs` | 0 failing desktop sizes in every state | `final/acceptance-probe-all-states.md` |
| 776×888 appearance | Screenshot against the baseline and revision 2 | Same arrangement; small differences listed below | `776x888-baseline-revision2-final.jpg` |
| Native Mac keyboard and Mac fonts | Owner's Mac | **NOT TESTED** | — |
| Playback while resizing | Automated status check (Play, resize, Pause/Play/Stop) | Status-level PASS; listening **NOT TESTED** | `final/e2e-console.txt` |
| npm run check | As configured | lint PASS, unit 4/4 PASS, build PASS, E2E **BLOCKED** (Google Chrome not installed). The same 13 E2E tests through the Chromium override: **13/13 PASS** | `final/npm-run-check-as-configured.txt`, `final/e2e-console.txt` |
| git diff --check | `git diff --check` | PASS | — |

## Delivery
- Git: the candidate is committed on `fix/LAS-51-claude-essential-controls` (based on `a154430`) and pushed for testing. The code and tests are in commit `bb88059f72a21a7f2e96aa0eb7ca6b30ee3b044b`; this result and the evidence are in the commit after it. It is not merged into `main`, and no pull request was opened. The comparison branch `compare/las51-claude` and the checkpoint branch stay in the cloud worktree.
- Evidence paths: `docs/LAS-51-comparison/evidence/` (index in `evidence/README.md`).
- Remaining trade-offs (measured on Linux):
  1. **776×888 differences:**
     - the Master level control sits at the bottom of Master, above Export, behind a divider, with empty space above it;
     - Export fits on one line;
     - strip content is vertically centred;
     - text rows use `line-height: 1.2` instead of the font's "normal";
     - Transport is the same height as the baseline at this size.

     The arrangement is otherwise the same (`776x888-baseline-revision2-final.jpg`).
  2. **Short screens use the compact arrangements** (`final/acceptance-probe-all-states.md`):
     - **Tracks:** a row without the ♫ icon at 804×471, 761×450 and 1440×450 in the empty state (stacked at 520 px and up). With an error message the row appears at more sizes, including 1280×720.
     - **Mixer:** knob beside the button at 989×610, 803×615 and every sample below 600 px. At 784×626 and 990×661 the strips are stacked but without captions.
     - **Captions:** "Coming soon" shows at 1100×700 and taller.
  3. **Master details** scroll at 1280×720, 1100×700 and every shorter sample; they fit at 776×888 and larger. At 761×450 only 53 of 137 px are visible ("OUTPUT STAGE" and part of the L | R symbol). The decorative L | R symbol is cut off at the divider.
  4. **Single-line text:** the file name, the decoded-info line and the fine print never wrap; they are shortened with "…" when too long. The full file name stays in the heading text and its `title`.
  5. **Arrangement choice is not strictly monotonic with the error message showing:** e.g. Tracks stacked at 817×598 but compact at 784×626. This is cosmetic; all essentials remain visible.
  6. **Headroom:** at 761 px wide everything fits down to 414 px tall (empty) and 420 px (error message), giving 36 / 30 px of slack at 450 px for macOS font differences. Below 450 px the page scrolls; zoom other than 100 % was not tested.
  7. The Mixer group keeps `tabIndex={0}` and `overflow: auto`, so it is a Tab stop with nothing to scroll at desktop sizes.
  8. Everything ran on Linux with Chromium 141. `npm run check` as configured cannot run E2E here.
- Mac checks still pending:
  - `npm ci`, `npm run check` and `git diff --check` on the branch with Google Chrome;
  - `MANUAL_VERIFICATION.md` at the regression samples, 761×450 and 1440×450, at 100 % zoom;
  - Tab, End/Home (Fn+→ / Fn+←) on Master details with a real keyboard;
  - trackpad scrolling of Master details;
  - long file name and decode error on the Mac;
  - listening while resizing during playback.
- Completion verdict: **Candidate passes in the available environment; LAS-51 stays open** until the Mac checks above pass.
