# Security Specification — Meridian Research Firestore Rules

## 1. Data Invariants
1. A `ResearchBrief` document at `/users/{userId}/briefs/{briefId}` can only be read, created, updated, or deleted by the verified user whose `request.auth.uid == userId` and `data.ownerId == userId`.
2. A `WatchlistSignal` document at `/users/{userId}/watchlist/{signalId}` can only be read, created, updated, or deleted by the verified user whose `request.auth.uid == userId` and `data.ownerId == userId`.
3. Every `ownerId` and `createdAt` field is immutable after creation (`incoming().ownerId == existing().ownerId`, `incoming().createdAt == existing().createdAt`).
4. All `createdAt` and `updatedAt` timestamps must strictly equal `request.time`.
5. No unverified email accounts (`request.auth.token.email_verified == true` required) or anonymous users may write data.
6. Every document ID (`briefId`, `signalId`) must pass `isValidId()` (`^[a-zA-Z0-9_\-]+$`, `<= 128` chars), and every string and list field enforces strict length/element bounds.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated `get` on `/users/u1/briefs/b1`.
2. Authenticated user `u2` attempting `get` or `list` on `/users/u1/briefs`.
3. Unverified email user (`email_verified: false`) attempting `create` on `/users/u1/briefs/b1`.
4. Identity spoofing: `u1` creating a brief with `ownerId: "u2"`.
5. Shadow field injection: `u1` creating a brief with extra key `isAdmin: true`.
6. Resource poisoning: `u1` creating a brief with a 200-char `briefId` or 10KB `topic` string.
7. Oversized list injection: `u1` creating a brief with 50 `drivers` items (`> 12`).
8. Invalid enum injection: `u1` creating a brief with `signalStrength: "Extreme"`.
9. Client timestamp spoofing: `u1` creating a brief with a backdated `createdAt` not equal to `request.time`.
10. Immutable field mutation: `u1` updating `ownerId` or `createdAt` on an existing brief.
11. Value poisoning on update: `u1` updating `confidencePct` to `999` (`> 100`) or string type.
12. Unbound list query: `u2` attempting `list` on `/users/u1/watchlist` where `ownerId != u2`.
