# Monitoring & Alerting Runbook

## Current state

- Application logging via Consola / Hono request logger
- Worker job lifecycle logs
- Org audit log UI for configuration changes

## Required production wiring (ops)

1. Ship logs to Cloud Logging / Datadog / equivalent
2. Error tracking (e.g. Sentry) with PII scrubbing
3. Alerts:
   - 5xx rate
   - Auth failure spikes
   - Worker failed jobs
   - Webhook signature failures
   - Disk/CPU on worker hosts
4. Uptime checks on `/api/health`

## PII scrubbing

Never send Aadhaar numbers, OTPs, raw audio, or full transcripts to third-party error trackers.
