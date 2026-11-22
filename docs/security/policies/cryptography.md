# Cryptography Policy

- TLS 1.2+ for all external traffic
- Passwords hashed by Better Auth (never store plaintext)
- Secrets in environment / secret manager; rotate on personnel change
- Object storage access via short-lived signed URLs
- Prefer managed KMS for future field-level encryption of highly sensitive columns
