# LAS-48 manual QA for Gennady

Candidate: `delivery/LAS-40-all-sprints` (SHA in `docs/delivery/INDEX.md`). Chrome on macOS, `npm run dev -- --port 5174`. Record CSS viewport (DevTools), zoom and `devicePixelRatio` for every row. Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-48-QA-01 | Empty, loaded, load-error and long-name states: resize 817×598 → 785×520 without reload or scroll. | Essential controls (Play/Pause/Stop, status, time, Import/Replace WAV, Remove track when loaded, four strips, Master level, Export, footer) visible, clickable, not overlapping. | Not Run | NOT_RUN |
| LAS-48-QA-02 | Drag the window slowly and quickly across 760/761/762 px wide and 450 px high, both directions. | No page scroll on desktop sizes; stacked layout below 761 px scrolls deliberately; nothing clipped. | Not Run | NOT_RUN |
| LAS-48-QA-03 | Play a long WAV you own and resize/maximize/restore repeatedly; then Pause, resize, Play. | Sound continues without restarts or doubling; timer keeps counting; paused time does not move; resume continues from it. | Not Run | NOT_RUN |
| LAS48-TC-010 | Real Chrome zoom 125 % and 200 % (Cmd +), then 100 %. | Layout adapts; labels readable; focus ring visible; no sideways scroll. | Not Run | NOT_RUN |
| LAS48-TC-022 | Move the window between two displays with different scaling, if available. | Layout and state unchanged; otherwise record Blocked (one display). | Not Run | NOT_RUN |
| LAS48-TC-023 | Open `evidence/tc001-traces/TC-001-1280x720-trace.zip` with `npx playwright show-trace`; step through the expect steps. | Transport and Mixer visible in snapshots; any scroll jump is viewer behaviour, recorded separately. | Not Run | NOT_RUN |
