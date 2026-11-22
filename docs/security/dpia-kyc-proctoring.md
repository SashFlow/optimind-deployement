# DPIA — Proctoring, Aadhaar eKYC, and AI memory

**Status:** Draft for legal review  
**Systems:** OptiMind sessions, Deepvue, Gemini/OpenAI, GCS

## Processing description

During certain agent sessions, OptiMind may capture face/ID/body frames, request Aadhaar OTP verification via Deepvue, record audio/video, and optionally derive end-user “memory” from transcripts using LLM providers.

## Necessity and proportionality

- KYC/proctoring should be enabled only when the tenant’s use case requires identity assurance.
- Aadhaar flows require **explicit in-session consent** (`consent: true`) before OTP request/verify.
- AI memory should be minimised; tenants should be able to disable sending transcripts to external LLMs (org opt-out roadmap).

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Unlawful Aadhaar processing | High | Consent binding; purpose string; no hardcoded consent |
| Biometric image leakage | High | Signed URLs, bucket ACLs, retention purge |
| Cross-border AI transfer | Medium | Disclose in privacy policy; DPAs; minimise payload |
| Over-retention | Medium | `retentionExpiresAt` + purge API |
| Insider access | Medium | Org RBAC, admin MFA, audit of DSAR/export |

## Residual risk

Acceptable for B2B insurance/healthcare workflows **only if** tenant notices, consent UX, DPAs, and retention are operated as documented.

## Decision

Proceed with controls listed in the compliance roadmap; re-review after VAPT and legal sign-off of privacy notice.
