# Logging & Monitoring Policy

- Application logs must not contain Aadhaar numbers, OTPs, full card data, or raw session recordings
- Audit logs record security-relevant changes and auth events when active org is available
- Alert on: auth anomalies, worker failures, webhook verification failures, elevated 5xx
- Retain security logs per retention policy; protect against unauthorized alteration
