# Record of Processing Activities (RoPA)

Living inventory for DPDP / GDPR accountability. Update when adding processors or data categories.

| Data category | Data subjects | Purpose | Systems | Processors | Retention | Legal basis |
|---------------|---------------|---------|---------|------------|-----------|-------------|
| Account identity | Platform users | Auth, tenancy | Postgres, Better Auth | Hosting DB | Account lifetime | Contract |
| Session media | End users | Voice/video AI sessions | LiveKit, GCS recordings | LiveKit, GCP | Org policy / lifecycle | Tenant instruction; consent notice |
| Transcripts | End users | Quality, workflows, memory | Postgres, GCS | GCP, OpenAI (optional) | `TRANSCRIPT_RETENTION_DAYS` | Tenant instruction |
| KYC / Aadhaar | End users | Identity verification | Deepvue, session metadata | Deepvue | Minimize; session metadata | Consent |
| Campaign contacts | End users | Outbound outreach | Postgres, Plivo | Plivo | Campaign + legal | Consent + DNC |
| Proctoring images | End users | Exam/ID checks | GCS, Gemini (optional) | GCP, Google | Session / retention job | Consent / tenant |
| Billing | Platform users / orgs | Payments | Payment provider | DodoPayments/etc. | Legal retention | Contract |
| Analytics | Platform users / visitors | Product analytics | PostHog (optional) | PostHog | Vendor policy | Consent |
| Audit logs | Platform users | Security accountability | Postgres | — | Compliance window | Legitimate use / security |
| Support email | Anyone | Support | Mail provider | Resend/etc. | Support policy | Consent / contract |

## Data flows (summary)

1. Browser / phone → OptiMind API → Postgres
2. Session → LiveKit → egress → GCS → worker merge → Postgres metadata
3. Optional: frames/transcripts → Gemini / OpenAI → derived fields on EndUser
4. Optional: Aadhaar OTP → Deepvue → verification metadata on session
