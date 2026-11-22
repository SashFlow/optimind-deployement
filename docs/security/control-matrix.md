# SOC 2 TSC ↔ ISO 27001 ↔ OptiMind controls

| SOC 2 | ISO 27001 (Annex A) | Control in OptiMind | Evidence |
|-------|---------------------|---------------------|----------|
| CC6.1 Logical access | A.5.15, A.8.2 | Better Auth, invite-only, org membership | Auth config, invite plugin |
| CC6.1 Privileged access | A.8.2 | Platform admin + MFA enforcement | `adminProcedure`, `enableTwoFactor` |
| CC6.2 Authentication | A.8.5 | Password + optional MFA/passkeys; 30m sessions | `packages/auth` |
| CC6.3 Access review | A.5.18 | Manual quarterly review (process) | Access review CSV template |
| CC6.6 Restriction | A.8.3 | RBAC owner/admin for audit/privacy | `requireOrgAdmin` |
| CC6.7 Transmission | A.8.24 | TLS (hosting), signed URLs | Hosting config |
| CC7.1 Detection | A.8.15, A.8.16 | Audit logs, rate limits, CI scans | Audit UI, GitHub Actions |
| CC7.2 Monitoring | A.8.16 | Consola logs; add SIEM (ops) | Runbook monitoring |
| CC7.3 Evaluation | A.5.24 | IR playbook | `runbooks/incident-response.md` |
| CC8.1 Change mgmt | A.8.32 | PRs, Biome, security workflow | Git history, CI |
| CC9.1 Risk / vendors | A.5.19–A.5.21 | Subprocessor list + DPAs | `subprocessors.md` |
| P4 / privacy | A.5.34 | Consent, DSAR, retention, RoPA | Privacy APIs, legal MD |
| A1 Availability | A.8.13, A.5.29 | Backup/DR runbook | `runbooks/backup-dr.md` |

## Gaps still owned by operations

- Central SIEM / on-call alerting wiring
- Documented access reviews (quarterly)
- Signed vendor DPAs
- Tabletop IR exercise notes
- Backup restore test evidence
