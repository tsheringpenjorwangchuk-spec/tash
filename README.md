# Lost & Found Management System — Neon Database Integration

This build uses Neon PostgreSQL for user registration and lost-item report persistence. Browser localStorage remains a local workflow cache for the existing matching and claims screens.

## Included features

- User and admin demo login
- Report lost item
- Report found item
- Automatic OpenAI image analysis after photo upload
- AI-generated searchable item attributes
- Three intentionally moderately specific ownership questions for lost reports
- AI lost/found matching with scores and reasoning
- Ownership verification
- Claim submission
- Admin claim approval/rejection
- Collection location and instructions
- Unique collection code generated exactly when admin approves a claim
- My Claims progress tracking
- Admin physical handover verification
- Mark item as Collected / Resolved
- AI chatbot
- Lost/found report management
- Admin users page
- Responsive improved user and admin dashboards
- Neon PostgreSQL schema and API integration

## Run the frontend

From the folder containing `package.json`:

```powershell
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173/`.

## Run the AI backend

Open a second terminal in the same project folder:

```powershell
npm run server
```

The server should show:

```text
AI backend running at http://localhost:3001
OpenAI configured: Yes
OpenAI model: gpt-4.1-mini
```

## Configure OpenAI

Copy `.env.example` to `.env` and add your own key. The server accepts `.env` either in the project root or in `server/.env`.

```text
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
PORT=3001
DATABASE_URL=postgresql://username:password@host:5432/database
DATABASE_SSL=true
```

Never share or commit the real key.

## Configure email notifications

The system emails a lost-item reporter automatically when the AI matching engine
finds a likely match, and emails a claimant when an admin approves, rejects, or completes collection of their claim, and when a verified claim is submitted for review. Emails are sent by the backend
using [Nodemailer](https://nodemailer.com/) over Gmail SMTP.

1. Turn on 2-Step Verification on the Gmail account you want to send from:
   https://myaccount.google.com/security
2. Create an "App password" for that account: Google Account → Security →
   2-Step Verification → App passwords. Choose "Mail" as the app. Google gives
   you a 16-character password.
3. Add these to your `.env` (do not use your normal Gmail login password):

```text
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_APP_PASSWORD=your_16_char_app_password
EMAIL_FROM="Lost & Found Office <your_gmail_address@gmail.com>"
```

4. Run `npm install` (installs `nodemailer`) and restart `npm run server`. The
   startup log will show `Email notifications configured: Yes (Gmail)` once it
   picks up valid credentials.

If these variables are missing, the app keeps working normally — the backend
just logs a warning and skips sending that particular email instead of failing
the request.

**When emails are sent:**
- **Match alert** — when an admin marks a found item "Received" (available for
  matching), every active lost report is compared against it with the existing
  AI matching engine; the reporter is emailed if the score is 60% or higher.
  The same check also runs the moment someone submits a new lost-item report,
  in case a matching found item is already available.
- **Claim status update** — when an admin approves a claim (collection code +
  location), rejects a claim, or marks a claim as collected, the claimant is
  emailed automatically.

A lost-item report now includes an email field (auto-filled from the logged-in
account) so the system knows who to notify.

## Recommended demonstration flow

1. Login as User.
2. Report a lost item and upload a photo.
3. Show automatic AI image analysis.
4. Answer the generated private ownership questions and submit.
5. Report a matching found item with a photo.
6. Open AI Item Matching and run matching.
7. Start Ownership Verification from the best match.
8. Answer the private questions correctly and continue the claim.
9. Open My Claims to show `Pending Admin Review`.
10. Login as Admin Demo.
11. Open Claim & Collection Desk.
12. Enter a collection location/instructions and approve the claim.
13. Login as User and open My Claims → Collection Details.
14. Show the six-character collection code.
15. Return to Admin, enter the same code, and click `Mark as Collected`.
16. Show that the claim is `Collected`, found item is `Collected`, and lost item is `Resolved`.

## Database status

Neon PostgreSQL now persists user registrations and lost-item reports. The remaining workflow data is stored in browser localStorage through `src/services/store.js` and existing page storage calls. The Neon schema and REST endpoint plan are documented at:

`server/database/NEON_INTEGRATION.md`

The final intended architecture is:

```text
React frontend
      ↓
Node REST API
   ↙       ↘
Neon PostgreSQL    OpenAI API
```

Do not treat localStorage as production persistence. It is only the temporary workflow cache for data that has not yet been moved to Neon.

## Demo verification and collection-code flow

- Lost-item AI analysis generates exactly three short, easy ownership questions for classroom demonstration.
- Claim verification passes with at least two of three answers correct.
- Submitting a verified claim creates a **Pending Admin Review** claim only; no collection code exists at this stage.
- A six-character collection code is generated **only when an administrator approves the claim**.
- The user then sees the code and collection instructions in **My Claims / Collection Details**.
- At handover, the administrator re-enters the user's code before marking the item **Collected**.


## Visual redesign

This build uses a new midnight-violet and coral interface rather than the previous green glass theme. Claim, verification and collection screens use clearer solid cards, stronger status contrast, and a more presentation-friendly workflow.

## Important collection-code rule

A collection code must never exist on a Pending claim. The admin approval action creates the six-character code, stores it with the claim, marks the found item as Reserved for Collection, and changes the claim to Ready for Collection. Older demo claims that were already approved without a code are repaired when the admin claim desk is opened.


Ownership verification rule: exactly 3 simple questions are stored (main colour, item type, brand/none), and at least 2 of the 3 must match before the claim can be submitted for admin review.

## Found-item physical drop-off workflow
A found item is not eligible for AI matching immediately after a finder reports it.

1. Finder submits a found-item report and receives a `FND-...` drop-off reference.
2. The report status becomes **Awaiting Drop-off**.
3. Finder takes the physical item to the Lost & Found Office and shows the reference.
4. Admin opens **Found Item Intake** and clicks **Mark Item Received** only after physical handover.
5. Status becomes **Available for Matching**.
6. Only office-received items are sent into AI lost/found matching.
7. After ownership verification and admin claim approval, a collection code is issued to the owner.
8. Admin checks the code during collection and marks the item **Collected**.

When the remaining workflow is integrated with Neon, the same fields should be persisted: `dropoffReference`, `status`, `receivedAt`, `receivedBy`, and the existing claim/collection fields.

## Final UI clarity pass
A final global clarity layer is applied from `src/styles/final-clarity.css` so all user/admin pages use high-contrast dark text on white/light cards, consistent blue/purple actions, readable form controls, and clear status panels. This styling layer is intentionally imported after page styles to prevent legacy dark-theme rules from causing white-on-white text.

## High-contrast UI update
The app now imports `src/styles/hard-clear.css` last from `src/main.jsx`. This is intentional: it overrides older glass/dark page styles with solid, readable surfaces across every route. Navigation uses a solid navy background with white labels; page cards are white; headings and form text are dark navy; input fields have visible white backgrounds and borders.

## Final attractive UI build
This build uses a solid high-contrast visual system: navy navigation, white cards, dark text, bold blue/purple/green/red buttons, emoji cues, clear form controls and status badges. Neon persistence is used for users and lost-item reports; localStorage remains the temporary cache for the remaining workflow screens.

## Final light UI build
This package includes `src/styles/light-final.css`, loaded last to keep every screen light, readable and consistent. The app uses white/pastel cards, dark text, light navigation, and restrained solid action buttons.

## Final visual redesign
The final UI layer is `src/styles/polished-ui.css`. It is imported last and intentionally overrides legacy page styles. The redesign uses white/pastel surfaces, dark navy text, subtle borders and shadows, compact pill navigation, restrained accent colours, and responsive layouts across all user/admin/AI/claim pages.
