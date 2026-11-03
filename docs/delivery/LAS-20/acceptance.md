# LAS-20 acceptance trace

Tested commit `11a30581b26b5abcebda3ac597a87c859830b3eb`. Developer results; manual review NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-20-AC-01 | Inventory of every storage location, recipient and boundary | inventory and trust-boundary sections | PASS (document) | `docs/PRIVACY_AND_THREAT_MODEL.md` |
| LAS-20-AC-02 | Threat model: takeover, cross-user, shared links, malicious audio, logs, backups | threat table with controls and test owners | PASS (document); controls tested in LAS-21–25 | same |
| LAS-20-AC-03 | Minimum data, retention, project/account deletion, backup expiry without promising immediate erasure | principles + retention table | PASS (document) | same |
| LAS-20-AC-04 | External transmission needs informed opt-in; local-only mode verifiably uploads nothing | consent section; `local-only.spec.js` passes; negative control fails | PASS | `evidence/` |
