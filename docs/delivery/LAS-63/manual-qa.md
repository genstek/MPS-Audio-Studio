# LAS-63 — Manual QA (Gennady) — all NOT_RUN

| ID | Steps | Expected | Result |
| --- | --- | --- | --- |
| QA-63-01 | Open the studio (no track). Look at the four cards. | Each shows its graph and an LED: EQ and Limiter on (green), Dynamics and Space bypassed (dark); no "edited" tags. | NOT_RUN |
| QA-63-02 | Without playing: Edit dynamics → Compressor on → drag Threshold and Ratio. | The card and editor curves move smoothly to each new shape and stay; LED on; "edited" appears. | NOT_RUN |
| QA-63-03 | Same for Limiter ceiling/input gain, EQ bands and Space presets while stopped and while paused. | Each card updates without pressing Play. | NOT_RUN |
| QA-63-04 | Switch a processor off. | The shape stays visible in grey; LED dark. | NOT_RUN |
| QA-63-05 | Play. | Gain-reduction meters and the EQ spectrum move with the music; configured shapes do not wobble. Pause: meters fall to zero. | NOT_RUN |
| QA-63-06 | Undo/Redo, load a settings file, apply a preset. | Cards and open editors follow. | NOT_RUN |
| QA-63-07 | macOS System Settings → Accessibility → Display → Reduce motion; repeat QA-63-02. | Shapes change at once, without the transition. | NOT_RUN |
