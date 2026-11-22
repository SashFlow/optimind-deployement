# Security Policy

## Reporting a vulnerability

Email **security@sashflow.com** (or `growth@sashflow.com` until the security alias is provisioned) with:

- Description of the issue and impact
- Steps to reproduce / proof of concept
- Affected environment (URL, commit, or release)

Do **not** open public GitHub issues for vulnerabilities that expose customer or end-user data.

We aim to acknowledge within **2 business days** and provide a remediation timeline within **7 business days** for Critical/High findings.

## Supported versions

Security fixes are applied to the current production branch (`main` / deployment tag).

## Security controls (product)

- Invitation-only signup; Better Auth sessions (30-minute idle window)
- MFA available; **required for platform administrators** (`ENFORCE_ADMIN_MFA`)
- Org-scoped APIs with membership checks; owner/admin for audit logs
- Rate limiting on API/auth/public session routes
- Security headers (HSTS in production, CSP report-only, nosniff, referrer, frame)
- Worker API key compared with constant-time equality
- LiveKit and payments webhooks signature-verified
- Workflow webhooks support HMAC (`WORKFLOW_WEBHOOK_HMAC_SECRET`)
- Image proxy requires session or signed token
- Knowledge URL ingest blocks private/metadata SSRF targets
- Upload MIME/extension allowlists for participant and knowledge files
- Audit logging for configuration changes and auth events (when active org is set)

## VAPT

See [docs/security/vapt-checklist.md](docs/security/vapt-checklist.md) before engaging an external firm.

## Compliance program

See [docs/security/](docs/security/) for ISMS policies, RoPA, control matrix, and certification gates (SOC 2, ISO 27001, DPDP, GDPR).
