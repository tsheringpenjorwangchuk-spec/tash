# MongoDB integration handoff

The application is intentionally complete without a database for the classroom demo. Browser `localStorage` is the temporary persistence layer. The MongoDB teammate can replace persistence later without changing the user journey, AI endpoints, claim rules, or collection UI.

## Current complete workflow

1. User reports a lost item.
2. Image upload automatically calls `POST /api/ai/analyse-item`.
3. AI extracts searchable attributes and creates private ownership questions.
4. User answers the private questions when saving the lost report.
5. A found item is reported and its image is automatically analysed.
6. `POST /api/ai/match-items` compares lost and found reports.
7. User starts a claim from a potential match and answers the private questions.
8. A successful verification creates a claim with `Pending Admin Review`.
9. Admin approves or rejects the claim.
10. Approval creates a six-character collection code and collection instructions and changes the claim to `Ready for Collection`.
11. At physical handover, admin enters the claimant's code.
12. A correct code changes the claim to `Collected`, the found item to `Collected`, and the lost item to `Resolved`.

## Temporary frontend storage keys

- `users`
- `currentUser`
- `lostItems`
- `foundItems`
- `claims`
- `activeClaim`
- `latestClaimVerification`
- `latestSubmittedClaim`

The temporary adapter lives at `src/services/demoStore.js`.

## Suggested MongoDB collections

### users
```js
{
  _id,
  name,
  email,
  passwordHash,
  role: "user" | "admin",
  createdAt,
  updatedAt
}
```

### lostItems
```js
{
  _id,
  userId,
  title,
  description,
  category,
  location,
  dateLost,
  imageUrl,
  aiAnalysis,
  privateVerification: [{ question, answerHash }],
  status: "Searching" | "Claim Approved" | "Resolved",
  createdAt,
  resolvedAt
}
```

### foundItems
```js
{
  _id,
  reporterId,
  title,
  description,
  category,
  location,
  dateFound,
  imageUrl,
  aiAnalysis,
  status: "Found" | "Reserved for Collection" | "Collected",
  createdAt,
  collectedAt
}
```

### claims
```js
{
  _id,
  claimantId,
  lostItemId,
  foundItemId,
  score,
  reason,
  verificationPassed,
  correctAnswers,
  totalQuestions,
  status: "Pending Admin Review" | "Ready for Collection" | "Rejected" | "Collected",
  adminNote,
  reviewedBy,
  reviewedAt,
  collectionLocation,
  collectionInstructions,
  collectionCodeHash,
  collectedAt,
  createdAt
}
```

## Recommended REST endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/lost-items`
- `POST /api/lost-items`
- `PATCH /api/lost-items/:id`
- `DELETE /api/lost-items/:id`
- `GET /api/found-items`
- `POST /api/found-items`
- `PATCH /api/found-items/:id`
- `GET /api/claims`
- `POST /api/claims`
- `PATCH /api/claims/:id/review`
- `POST /api/claims/:id/collect`

Keep the existing AI endpoints unchanged:

- `POST /api/ai/chat`
- `POST /api/ai/analyse-item`
- `POST /api/ai/match-items`

## Security changes required when MongoDB is connected

- Never store plaintext passwords.
- Never send stored private verification answers back to the browser. Store hashes or validate answers server-side.
- Store collection codes hashed and validate them server-side.
- Add authentication and role-based authorization so only admins can approve/reject/collect.
- Associate reports and claims with the authenticated user instead of trusting browser values.
- Move image storage to a proper object store or cloud image service and save URLs in MongoDB.
- Validate all request bodies on the backend.

## Integration strategy

The UI and workflow are already complete. Replace calls to `demoStore.js` with an async repository backed by these REST endpoints. Keep object field names close to the current demo shapes to minimise frontend changes.
