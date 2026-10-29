# LAS-24 manual QA for Gennady

To see the consent question, start the server with the local stand-in: `MPS_TEST_RECIPIENT=1 npm run server`, then `npm run dev -- --port 5174`. Actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-24-QA-01 | Save two files, then delete one with Delete → Confirm delete. (Whole-project deletion is API-only: `DELETE /api/projects/<id>` with your session.) | The file disappears and its download link stops working; the other stays. | Not Run | NOT_RUN |
| LAS-24-QA-02 | Account → Delete account… → wrong password, then the right one. Try to sign in again. | Wrong password: "Nothing was deleted." Right one: "Your account, your library and all saved files were deleted…"; sign-in fails; your local track stays in the studio. | Not Run | NOT_RUN |
| LAS-24-QA-03 | With DevTools Network open: Send… on a saved file → read the question → Cancel. Then Send… → Allow and send → Withdraw. | Cancel: no new request. Allow: one `external-jobs` request and "Sent … to Local test recipient." Withdraw removes it from the allowed list. | Not Run | NOT_RUN |
| LAS-24-QA-04 | Without `MPS_TEST_RECIPIENT`, restart the server and open your library. | No "Send…" button: no external service is offered. | Not Run | NOT_RUN |
