# Change Management Policy

## Production changes

1. Changes via version control (pull/merge request)
2. Automated checks: lint, security workflow (audit/SAST/Trivy)
3. Peer review for material changes
4. Deploy through approved pipeline; emergency changes documented within 24h
5. Rollback plan for high-risk deploys

## Configuration changes

Secrets and infrastructure changes require dual control where feasible and are logged in the change ticket / PR description.
