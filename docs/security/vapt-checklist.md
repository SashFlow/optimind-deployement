# VAPT readiness checklist

Use before engaging an external vulnerability assessment / penetration test firm.

## Scope definition

- [ ] In-scope hosts: production web, API, worker, staging twin
- [ ] In-scope apps: SaaS UI (`/app`), public share/embed, auth, webhooks
- [ ] Out of scope: third-party consoles (LiveKit Cloud, GCP, Deepvue) except customer-controlled config
- [ ] Test window, contacts, emergency stop procedure
- [ ] Non-production credentials / seeded org for authenticated testing

## Pre-test hardening (must be green)

- [x] `/api/token` and `/api/outbound-call` require auth + org membership for org agents
- [x] Security headers (HSTS prod, CSP report-only, nosniff, referrer, frame)
- [x] Rate limiting on API / auth / public hooks
- [x] OpenAPI `/api/docs` gated in production
- [x] Image proxy requires session or signed token
- [x] Workflow webhooks support HMAC when `WORKFLOW_WEBHOOK_HMAC_SECRET` set
- [x] SSRF controls on knowledge URL ingest
- [x] Upload MIME allowlists
- [x] Audit list restricted to org owner/admin
- [x] Worker API key uses timing-safe compare
- [ ] `WORKFLOW_WEBHOOK_HMAC_SECRET` set in production
- [ ] reCAPTCHA keys configured in production
- [ ] Platform admins enrolled in MFA
- [ ] Dependency + container scans reviewed (`.github/workflows/security.yml`)

## Suggested test cases for the firm

1. Unauthenticated session/room creation
2. IDOR across organizations (agents, sessions, recordings, end users)
3. Privilege escalation member → admin APIs
4. Webhook replay / signature bypass
5. SSRF via knowledge URL
6. Stored XSS in transcripts / knowledge text
7. File upload content-type confusion
8. Brute force / credential stuffing on auth
9. Impersonation abuse
10. Signed URL leakage via image-proxy / egress media

## After the report

- [ ] Triage Critical/High within 48h
- [ ] Remediate and request retest
- [ ] Archive report as SOC2 / ISO evidence (CC7 / A.8.8)
