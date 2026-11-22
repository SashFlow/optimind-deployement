# Backup & Disaster Recovery Runbook

## Targets (initial)

| Component | RPO | RTO |
|-----------|-----|-----|
| PostgreSQL | ≤ 24h | ≤ 8h |
| GCS buckets | ≤ 24h (versioning/lifecycle) | ≤ 8h |
| Redis (jobs) | Best-effort | Rebuild queue |

## Backups

- Enable automated Postgres backups on the managed host (daily + PITR if available)
- Enable GCS object versioning on recordings/transcripts buckets
- Store backup credentials separately from production app credentials
- Test restore **quarterly**; record date, operator, result

## Restore drill checklist

1. Provision restore environment
2. Restore latest Postgres snapshot
3. Verify critical tables (user, organization, agent_session, transcript)
4. Restore sample GCS objects
5. Smoke-test login + session list
6. File evidence in compliance folder

## Failover notes

Document primary region (`asia-south1` preferred for India data residency) and failover decision criteria with management.
