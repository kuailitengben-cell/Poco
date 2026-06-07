# Security Specification for Jimicchi

## Data Invariants
1. A scene must have a valid `authorId` matching the authenticated user.
2. A scene's `upvotes` can only be incremented by 1 when a unique upvote record is created.
3. Users cannot modify or delete other users' scenes or comments.
4. `createdAt` must be set to `request.time`.

## The "Dirty Dozen" Payloads (Deny Cases)
1. Unauthenticated Create: Create scene without auth.
2. Identity Spoofing: Create scene with `authorId` != `request.auth.uid`.
3. Upvote Inflation: Update scene `upvotes` by +10 directly.
4. Upvote Theft: Delete someone else's upvote record.
5. Content Poisoning: Create scene with 1MB text content.
6. Timestamp Manipulation: Create scene with `createdAt` in the future.
7. Admin Claim Injection: Try to update a document as "admin" by adding a custom field.
8. Comment Hijacking: Delete someone else's comment.
9. ID Poisoning: Create scene with a very long, special-character ID.
10. Anonymous Write: Write as an anonymous user (if restricted).
11. State Shortcut: (N/A for first version, but terminal states should be locked).
12. PII Leak: Read private user list.

## Test Runner (Draft)
I will implement `firestore.rules` and verify it.
