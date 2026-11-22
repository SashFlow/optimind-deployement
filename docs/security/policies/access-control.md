# Access Control Policy

## Requirements

- Unique user accounts; no shared credentials for production
- Invitation-only signup for OptiMind SaaS
- MFA required for platform administrators; strongly recommended for org owners
- Org roles: owner / admin / member with API enforcement for sensitive actions
- Platform admin cross-org access is break-glass; impersonation audited
- Worker and webhook secrets rotated at least annually or on suspicion of compromise
- Quarterly access review of admin users and cloud IAM

## Technical mappings

- Better Auth sessions (`sessionCookieMaxAge` 30 minutes)
- `requireOrgMembership` / `requireOrgAdmin`
- `ENFORCE_ADMIN_MFA` on `adminProcedure`
- Worker `WORKER_API_KEY` (timing-safe compare)
