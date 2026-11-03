# LAS-69 — Manual QA (Gennady) — all NOT_RUN

Record macOS, Chrome version, and where files were saved. Run the Safari part separately.

| ID | Steps | Expected | Result |
| --- | --- | --- | --- |
| QA-69-01 | Import a WAV, add a stem, set EQ/Dynamics/Space/Limiter, move an editor, choose Original. Press ⌘S. | A save panel asks where (first time). Header: "Saved to <name>.mps-project.json". | NOT_RUN |
| QA-69-02 | Change something; header shows "Unsaved changes"; press ⌘S again. | No panel; the same file is updated. | NOT_RUN |
| QA-69-03 | Project ▾ → Save project as… → new name. Change something, ⌘S. | The copy changes; the first file stays as it was. | NOT_RUN |
| QA-69-04 | Quit Chrome. Start again, open the studio, ⌘O, choose the first file. | Settings, Original/Processed and editor layout come back; nothing plays; "Missing audio" lists the WAV and the stem. | NOT_RUN |
| QA-69-05 | Relink with a different WAV, then with the right one; relink the stem. | Wrong file refused; right files accepted; the stem has its gain/pan/mute again. | NOT_RUN |
| QA-69-06 | Open a project, close the Missing audio dialog without relinking, save. | Header keeps "audio files missing — Relink…"; the saved file still lists the missing audio. | NOT_RUN |
| QA-69-07 | With unsaved changes: + New, Project ▾ → Open, and closing the tab. | Save / Discard / Cancel (and the browser's leave-page question for the tab). | NOT_RUN |
| QA-69-08 | Open a non-project JSON and a broken file. | Refused with a reason; current session unchanged. | NOT_RUN |
| QA-69-09 | In each editor: Save <module> preset, change values, Load <module> preset…; Undo. | Only that module changes; Undo restores it. Loading another module's preset is refused. | NOT_RUN |
| QA-69-10 | Safari: Save and Open. | Save downloads a file (status says download); Open uses the file picker. | NOT_RUN |
| QA-69-11 | Apple wrapper (LAS-58): Save and Open through the native panels. | To be defined with LAS-58. | NOT_RUN |
