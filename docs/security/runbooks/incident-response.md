# Incident Response Runbook

## Severity

| Sev | Definition | Response |
|-----|------------|----------|
| SEV1 | Confirmed breach / active exploit / data exposure of Restricted data | Immediate; all-hands |
| SEV2 | Suspected compromise / Critical vuln in production | Same day |
| SEV3 | High vuln / abuse without confirmed data loss | 72 hours |
| SEV4 | Low/Medium findings | Planned sprint |

## Process

1. **Detect** — monitoring, user report, VAPT, vendor notice
2. **Contain** — revoke keys, disable routes, isolate hosts, rotate secrets
3. **Eradicate** — patch, remove persistence
4. **Recover** — restore from clean backup if needed; verify integrity
5. **Notify** — legal decides DPDP/GDPR customer/regulator notices
6. **Lessons learned** — within 10 business days; update controls

## Contacts

- Engineering on-call: _[fill]_
- Legal / privacy: privacy@sashflow.com
- Management: _[fill]_

## Evidence to preserve

Logs, audit rows, affected user/org IDs, timeline, forensic disk/images if applicable.
