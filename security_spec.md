# Security Specification & Test Payloads

## 1. Data Invariants
- Invariant 1: Reports must always reference a valid integer `id` and `institutionId`.
- Invariant 2: Reports must not exceed maximum boundary sizes for string fields (`notes` <= 2000 chars, `entryPerson` <= 150 chars).
- Invariant 3: Users must contain a valid `id`, `name`, and valid `role` within `['supervisor', 'institution', 'immunization']`.
- Invariant 4: No unauthenticated direct deletion of configuration documents.
- Invariant 5: Document IDs must conform to alphanumeric characters and dashes (`^[a-zA-Z0-9_\\-]+$`) with a maximum length of 128 characters.
- Invariant 6: Default-deny on all unspecified Firestore collection paths.

## 2. The Dirty Dozen Malicious Payloads
1. **Payload 1 (ID Poisoning Attack)**: Injecting a 2KB junk character string as a document ID to exhaust wallet resources.
2. **Payload 2 (Ghost Field Privilege Escalation)**: Writing `{ id: 101, name: "Center", role: "institution", isAdmin: true, superRoot: true }` attempting to grant arbitrary admin claims.
3. **Payload 3 (Type Spoofing on Report ID)**: Injecting `{ id: "not_a_number", institutionId: 101 }` to bypass numeric indexing.
4. **Payload 4 (Buffer Overflow Attack on Notes)**: Sending a 500,000-character payload in the `notes` field of a report.
5. **Payload 5 (Unauthenticated Malicious Write)**: Writing without auth to arbitrary `/admin_secrets/{id}`.
6. **Payload 6 (Invalid Role Injection)**: Setting role to `"hacker"` instead of `['supervisor', 'institution', 'immunization']`.
7. **Payload 7 (Missing Required Key in Report)**: Creating a report document without `institutionId` or `entryPerson`.
8. **Payload 8 (Config Purge Attempt)**: Unauthenticated request attempting to delete `/config/app_config`.
9. **Payload 9 (Cross-Tenant Identity Forgery)**: Altering immutable identifier keys on update.
10. **Payload 10 (Negative or Absurd Beneficiaries Count)**: Providing a negative count or non-numeric object as beneficiaries.
11. **Payload 11 (SQL/Script Injection in Category Name)**: Injecting `<script>alert(1)</script>` exceeding size limitations.
12. **Payload 12 (Direct Arbitrary Collection Write)**: Writing to `/internal_audit/log` which is not whitelisted.

## 3. Test Runner Definition
All 12 payloads must be rejected by Firestore Security Rules returning PERMISSION_DENIED.
