# LAS-13 — User accounts — registration, login and account recovery

Jira: https://genstek69.atlassian.net/browse/LAS-13

## Goal

Let users register, sign in, recover access and manage sessions using a supported authentication solution.

## Source

Product planning with Gennady, 20 October 2026 (Asia/Jerusalem). Repository: https://github.com/genstek/MPS-Audio-Studio

## Planned delivery

Proposed sprints 01–02. Future capacity and dates remain to be refined. Existing LAS-10 learning work stays in the current iteration.

## Success criteria

* Registration, verified sign-in, recovery and logout have positive and negative test coverage.
* Authentication is validated by the backend; the browser does not decide permissions.
* Secrets and user credentials are excluded from source code, logs and test reports.

## Definition of done

Implementation reviewed through a linked GitHub PR; acceptance criteria checked; relevant automated tests and manual evidence recorded; limitations documented. Creating this epic does not imply implementation or testing is complete.

## Child work orders

- [LAS-19 — Choose authentication architecture and define account/session flows](../tasks/LAS-19.md)
- [LAS-21 — Add registration, verified login and logout to the studio](../tasks/LAS-21.md)
- [LAS-22 — Add password recovery, session expiry and authentication abuse controls](../tasks/LAS-22.md)

Roll up actual child evidence. Do not implement this epic a second time or mark it Done until its acceptance and Gennady's required reviews are met. Related existing closed records remain in INVENTORY.md and sources/jira-issues.json.
