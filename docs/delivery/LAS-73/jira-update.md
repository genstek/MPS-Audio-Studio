SYNC_PENDING — not posted to Jira (Jira was not contacted from this job).

Draft comment for LAS-73:
Root cause: help popover ownership was keyed by help id, so identical controls in every mounted editor opened together. Ownership is now per instance (one popover studio-wide, anchored to the hovered target). Automated Playwright coverage with 3 editors passes in headless Chromium. Gennady manual retest: Not Run. Status should stay below Done / QA Done until manual acceptance.
