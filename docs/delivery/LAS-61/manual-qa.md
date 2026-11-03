# LAS-61 / LAS-62 — Manual QA (Gennady) — all NOT_RUN

| ID | Steps | Expected | Result |
| --- | --- | --- | --- |
| QA-61-01 | Import a WAV, Play. Open EQ, then Dynamics, then Limiter. | All three stay open, cascaded below the transport. Playback continues. | NOT_RUN |
| QA-61-02 | Drag each window by its title bar to another place, including while playing. | Windows follow the pointer; playback and settings are unchanged. | NOT_RUN |
| QA-61-03 | Click a window that is behind another. | It comes to the front (blue frame). | NOT_RUN |
| QA-61-04 | Close Dynamics and open it again. | It reopens where it was. EQ and Limiter did not move. | NOT_RUN |
| QA-61-05 | Drag a window far outside the browser window. | It stops at the edge; title and × stay reachable. | NOT_RUN |
| QA-61-06 | Make the browser window much smaller, then larger. | Windows come back inside. | NOT_RUN |
| QA-61-07 | Tab to the ⋮⋮ grip; use the arrow keys, Shift+arrow, Home. | The window moves by 16/64 px; Home puts it back. | NOT_RUN |
| QA-61-08 | Press "Reset window layout" (Mixer heading). | Every window returns to its first place. | NOT_RUN |
| QA-62-01 | With three editors open, change a value in each. | Each change affects only its own module (listen and look at the strip captions). | NOT_RUN |
| QA-62-02 | Press Undo in any editor. | The newest edit is undone (one history for the chain). | NOT_RUN |
| QA-62-03 | Click Edit on a strip whose editor is already open. | The open window comes to the front; no second copy. | NOT_RUN |
| QA-62-04 | With focus inside a window, press Escape. | Only that window closes; focus returns to its Edit button. | NOT_RUN |
| QA-62-05 | Close the Dynamics editor while the compressor is on; listen. | The compressor keeps working. | NOT_RUN |
| QA-61-09 | Repeat QA-61-01..03 on a phone-sized window (or iPhone through the wrapper, LAS-58). | Close and grip remain reachable; transport usable. | NOT_RUN |
