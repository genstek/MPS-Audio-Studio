# LAS-19 manual review for Gennady

Actual results stay **Not Run** until you review.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-19-QA-01 | From a clean folder follow "Development setup" in `README.md`; open the studio without starting the server too. | Studio plays a local WAV with or without the server; with the server running you can register and find the verification mail in the dev outbox. | Not Run | NOT_RUN |
| LAS-19-QA-02 | Read the flow diagram and endpoint matrix. Approve ADR-003 or request changes (e.g. hosted provider instead). | Every caller type (anonymous, unverified, owner, other user, expired) has an explicit rule; your decision is recorded in Jira. | Not Run | NOT_RUN |
