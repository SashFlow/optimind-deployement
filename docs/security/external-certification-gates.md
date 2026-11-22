# External certification gates

Engineering and documentation in this repo prepare OptiMind for external assessments. **You** (or counsel) schedule and pay vendors.

## Gate 1 — VAPT (months 2–3)

1. Complete [vapt-checklist.md](./vapt-checklist.md)
2. Engage CERT-In empanelled / reputable VAPT firm
3. Provide staging + scoped production read rules of engagement
4. Remediate Critical/High; obtain clean retest letter
5. Store report as evidence for SOC2 CC7 / ISO A.8.8

## Gate 2 — SOC 2 Type I (months 3–4)

1. Engage CPA firm experienced in SaaS SOC 2
2. Provide: policies under `docs/security/policies/`, control matrix, VAPT report, architecture diagram, access list
3. Demonstrate controls designed and implemented at a point in time
4. Close auditor exceptions

## Gate 3 — SOC 2 Type II (months 4–9)

1. Operate controls for the observation window (typically 3–6 months)
2. Collect evidence: access reviews, change tickets, IR tabletop, backup restores, vendor reviews
3. Schedule Type II audit

## Gate 4 — ISO/IEC 27001 (months 6–12)

1. Finalize Statement of Applicability from control matrix
2. Risk register + treatment plan
3. Internal audit + management review
4. Stage 1 (documentation) then Stage 2 (implementation) with accredited CB

## Gate 5 — DPDP / GDPR ongoing

- Legal review of privacy policy and grievance officer appointment
- Signed DPAs with subprocessors
- Operate DSAR SLAs (`/api/privacy/*`)
- Consent + retention evidence samples for auditors/regulators

## Owner checklist

| Item | Owner | Due |
|------|-------|-----|
| Pick VAPT vendor | Security lead | |
| Pick SOC2 CPA | Compliance lead | |
| Pick ISO CB | Compliance lead | |
| Appoint DPDP grievance officer | Legal | |
| Sign critical DPAs | Legal + Eng | |
