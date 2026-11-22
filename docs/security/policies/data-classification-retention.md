# Data Classification & Retention Policy

## Classification

| Class | Examples | Handling |
|-------|----------|----------|
| Restricted | Aadhaar, biometrics, recordings, transcripts, KYC | Least privilege, encryption in transit, short retention, DSAR support |
| Confidential | Account PII, campaign contacts, audit logs | Org-scoped access, audited exports |
| Internal | Config, metrics without PII | Need-to-know |
| Public | Marketing site content | Standard |

## Retention defaults

- Transcripts: `TRANSCRIPT_RETENTION_DAYS` (default 365) then purge
- Recordings/session files: deleted with retention purge / DSAR erase
- Accounts: deleted on user request subject to legal holds
- Audit logs: retain per compliance program (recommend ≥ 1 year)
