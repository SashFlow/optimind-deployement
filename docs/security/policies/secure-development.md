# Secure Development Policy

- Threat-model features that touch PII, media, KYC, or payments
- Input validation (Zod) and parameterized DB access (Prisma only)
- No secrets in source; use env / secret manager
- Dependency updates via Dependabot; address High/Critical CVEs promptly
- Pre-commit format; CI security scans
- Security testing before major releases; annual external VAPT
