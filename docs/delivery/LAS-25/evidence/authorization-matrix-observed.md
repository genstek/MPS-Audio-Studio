| Operation | anonymous | expired | revoked | other | owner |
| --- | --- | --- | --- | --- | --- |
| GET /api/account | 401 | 401 | 401 | 200 | 200 |
| GET /api/projects (list) | 401 | 401 | 401 | 200 | 200 |
| POST /api/projects | 401 | 401 | 401 | 201 | 201 |
| GET /api/projects/:id | 401 | 401 | 401 | 404 | 200 |
| PATCH /api/projects/:id | 401 | 401 | 401 | 404 | 200 |
| GET /api/projects/:id/assets | 401 | 401 | 401 | 404 | 200 |
| POST /api/projects/:id/assets (upload) | 401 | 401 | 401 | 404 | 201 |
| GET /api/assets/:id | 401 | 401 | 401 | 404 | 200 |
| POST /api/assets/:id/download-link | 401 | 401 | 401 | 404 | 200 |
| GET /api/download/:id (owner's signed link) | 401 | 401 | 401 | 404 | 200 |
| POST /api/assets/:id/jobs | 401 | 401 | 401 | 404 | 202 |
| GET /api/jobs/:id | 401 | 401 | 401 | 404 | 200 |
| DELETE /api/jobs/:id (cancel) | 401 | 401 | 401 | 404 | 200 |
| POST /api/assets/:id/external-jobs (both have consent) | 401 | 401 | 401 | 404 | 202 |
| GET /api/account/consents | 401 | 401 | 401 | 200 | 200 |
| GET /api/external-recipients | 401 | 401 | 401 | 200 | 200 |
| DELETE /api/assets/:id | 401 | 401 | 401 | 404 | 204 |
| DELETE /api/projects/:id | 401 | 401 | 401 | 404 | 204 |
| DELETE /api/account/consents/:recipient | 401 | 401 | 401 | 204 | 204 |
| DELETE /api/account (each caller can delete only their own) | 401 | 401 | 401 | 204 | 204 |
