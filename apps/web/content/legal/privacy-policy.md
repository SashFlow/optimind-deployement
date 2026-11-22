---
title: Privacy Policy
---

# Privacy Policy

Last updated: November 21, 2026

This Privacy Policy describes how **Sashflow Technologies Private Limited** (“**Sashflow**”, “**Company**”, “**We**”, “**Us**”, or “**Our**”) collects, uses, stores, shares, and protects personal data when you use **OptiMind** (the “**Service**”).

We process personal data under applicable laws including India’s **Digital Personal Data Protection Act, 2023 (DPDP Act)** and, where we process personal data of individuals in the European Economic Area or United Kingdom, the **GDPR** / UK GDPR.

## 1. Roles

- **Platform users** (organization members): you create an account and operate agents, campaigns, and sessions. For your account data, Sashflow is the **Data Fiduciary** (DPDP) / **Controller** (GDPR).
- **End users / data principals** (call participants, campaign contacts, KYC subjects): your organization typically determines purposes of processing. Sashflow acts as a **Data Processor** / service provider for tenant-directed processing, except where we process data for our own operations (security, billing, product analytics with consent).

## 2. Data we collect

### 2.1 Platform users
- Name, email, username, profile image, locale
- Authentication data (password hashes, optional MFA secrets, session tokens, IP address, user agent)
- Organization membership and role
- Billing identifiers (payment provider customer IDs)
- Product usage events (when analytics consent is given)

### 2.2 End users and session participants
- Name, phone number, email, identity identifiers
- Voice and/or video recordings, LiveKit room metadata
- Transcripts and conversation content
- Uploaded files (e.g. ID images) and proctoring / biometric-related captures
- **Aadhaar eKYC** data processed via our KYC provider when you consent in-session (Aadhaar number for OTP, verification result metadata)
- Campaign contact fields (display name, phone, email, freeform context) and consent flags
- Derived memories / embeddings generated from transcripts (optional AI features)

### 2.3 Automatically collected
- Device and log data (IP, browser, diagnostics) needed to operate and secure the Service
- Cookie / local storage identifiers for essential session function; optional analytics cookies only after consent

## 3. Purposes and legal bases

| Purpose | Examples | Basis (DPDP / GDPR) |
|---------|----------|---------------------|
| Provide the Service | Auth, agents, sessions, telephony | Contract / legitimate use for service delivery; consent where required |
| Recordings & transcripts | Quality, compliance workflows configured by tenant | Tenant instruction; consent notice in session where applicable |
| Aadhaar / KYC | Identity verification | **Consent** of the data principal + purpose limitation |
| Outbound campaigns | Dial / message contacts | **Consent** and/or do-not-contact suppression |
| Security & abuse prevention | Rate limits, audit logs, fraud | Legitimate use / security |
| Analytics (optional) | Product improvement (e.g. PostHog) | **Consent** |
| Billing | Invoices, subscriptions | Contract |
| Legal compliance | Respond to lawful requests | Legal obligation |

## 4. Subprocessors and international transfers

We use carefully selected processors. Primary object storage for recordings/knowledge is configured in **Google Cloud Storage** (`asia-south1` by default). Some processors may process data outside India (e.g. AI, RTC, analytics).

Typical subprocessors (may vary by configuration):

- Google Cloud Storage (recordings, transcripts, knowledge files)
- LiveKit (real-time media)
- Plivo (telephony / SIP)
- Deepvue (Aadhaar eKYC)
- OpenAI / Google Gemini (optional AI features: memory, multimodal post-processing)
- Email providers (transactional mail)
- Payment providers (e.g. DodoPayments / Stripe if enabled)
- Optional analytics (PostHog, etc.) — only after consent

A current subprocessor list is maintained in our Trust / security documentation. Cross-border transfers are protected by contractual safeguards and, for GDPR, appropriate transfer mechanisms.

## 5. Retention

- Account data: retained while the account is active; deleted or anonymized after account deletion subject to legal holds
- Session recordings, transcripts, and related files: retained per organization policy; transcripts receive a default retention expiry (configurable via `TRANSCRIPT_RETENTION_DAYS`, default 365 days) and are purged by retention jobs
- Audit logs: retained for security and compliance evidence
- Consent records for campaigns and KYC are stored with timestamps

## 6. Your rights

### DPDP (India)
Data principals may request access, correction, erasure, and withdrawal of consent, and may raise a grievance with our Grievance Officer. Contact: **privacy@sashflow.com** (Grievance Officer: to be designated; interim contact growth@sashflow.com).

### GDPR (EEA/UK)
Where GDPR applies, you may request access, rectification, erasure, restriction, portability, and objection, and lodge a complaint with a supervisory authority. Contact: **privacy@sashflow.com**.

### How to exercise rights
- Platform users: account settings (including account deletion) and `GET /api/privacy/me/export`
- End-user DSAR: request via your organization (tenant); org admins can export/erase via Privacy APIs
- We aim to respond within timelines required by applicable law (GDPR: typically 30 days)

## 7. Cookies

Essential cookies are required for authentication and security. Analytics cookies load **only after** you accept analytics in the consent banner. Declining analytics does not block core Service use.

## 8. Security

We implement administrative, technical, and organizational measures including access control, encryption in transit (TLS), session controls, audit logging, vulnerability management, and secure development practices. See `SECURITY.md` and our ISMS documentation for details.

## 9. Children

The Service is not directed to children. Do not use OptiMind to process children’s personal data without a lawful basis and appropriate safeguards under applicable law.

## 10. Changes

We may update this Policy. Material changes will be posted with an updated “Last updated” date.

## 11. Contact

- Privacy / DPDP grievance: privacy@sashflow.com
- General: growth@sashflow.com
- Company: Sashflow Technologies Private Limited
