# Jashne Riyasat Wedding Planning & Staff Portal

One verified email = one account, with an optional **Client** and/or **Staff** profile. The client workspace captures a function-wise wedding brief, vision, requested service scope, commercial preferences, vendor responsibilities and authorized contacts, then produces a signed A4 request for planner review. The separate Staff/jobs workspace retains staff applications, vacancies and hiring workflows.

## Stack
Next.js 14 (App Router, JavaScript) · Express (API + serves Next in one process) · MongoDB/Mongoose · Cloudinary. Nothing else.

## Run
```bash
cp .env.example .env        # fill in the values
npm install
npm run seed                # default job positions
ADMIN_USERNAME=admin ADMIN_PASSWORD='a-long-password' npm run seed   # creates the admin (min 10 chars)
npm run dev                 # http://localhost:3000
# production
npm run build && npm start
```
Camera access needs HTTPS (or localhost).

### Environment
`MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `JWT_SECRET` (32+ chars in production).
OTP delivery is isolated in `services/email.js`: `OTP_PROVIDER=console` (dev only, prints the OTP and shows it on the verify screen; **refused in production**), `smtp` (configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`), or `resend` (configure `RESEND_API_KEY` and `SMTP_FROM`). For Vercel, use the Resend HTTP API provider rather than SMTP, which may be blocked for outbound connections. Set `SMTP_FROM` to a sender address verified with your email provider. The server refuses to start if configuration is missing.

### Vercel
Vercel serves the Next.js frontend and the API separately. `api/[...path].js` exposes the existing Express routes as a Vercel Function and initializes MongoDB on demand. Set the required app variables in Vercel Project Settings → Environment Variables, including `OTP_PROVIDER=resend`, `RESEND_API_KEY`, and `SMTP_FROM`, then redeploy. Keep the existing Express/Next custom server for local and non-Vercel deployments.

## Layout
```
app/          pages (landing, login, verify-otp, choose-profile, client/*, staff/*, document/[id], admin/*)
components/   shared UI, camera, signature pad, A4 document, admin list/detail
server/       Express entry + routes (auth, client, staff, shared, admin)
services/     otp, sms, documents (versioning), submission (consent/media rules), media
middleware/   requireAuth / requireClient / requireStaff / requireAdmin
models/       User, Otp, ClientProfile, StaffProfile, ClientRequest, StaffApplication, JobPosition, Document, Admin
config/       legal.js (Terms/Privacy/consent text + version), options.js
lib/          db, cloudinary, env, http (response/error shape), validate, password, rateLimit
scripts/seed.js
```
All business logic lives in Express (`/api/*`); Next only renders UI.

## Wedding client workflow
- Clients sign in with email OTP, save a draft, complete Event details, Vision & services, and Budget & logistics, then review and sign the request.
- Every service in Schedule B must be explicitly marked Included or Not included. Function dates/venues and estimates are captured per event.
- The signed document is a **request for review**, not a confirmed booking or a final services contract. Fee, tax treatment, payment milestones, cancellation, postponement and other legal terms must be completed and approved by the Planner before sending a proposal.
- Admins can review the scope and send commercial terms for client signature. A booking with a wedding scope cannot be marked Confirmed until the client accepts a proposal whose fee, tax treatment, cancellation, postponement and payment percentages (totaling 100%) are complete.
- Legal wording in `config/legal.js` remains placeholder/draft text and needs approval by an Indian advocate before production use.

## Behaviour worth knowing
- **Auth**: OTP is HMAC-hashed, expires in 5 min, 30 s resend cooldown, 5 attempts, 6 sends/hour. JWT is stored in an HTTP-only cookie. Admin uses a separate cookie and secret, scrypt-hashed password, login rate-limited, and password changes revoke old admin sessions.
- **Staff authorization**: staff applications remain applicants by default. Admins approve/reject the application, then separately authorize employee access in the staff application detail view. Approval alone never grants the `employee` role; rejection revokes it. The current backend supports an authorized employee profile view, but has no assigned-client, task, document-review, notification, interview, or joining-letter workflows.
- **Media**: uploaded by the server to Cloudinary as `authenticated` assets under `wedding-onboarding/<userId>/`; only `public_id` + reference stored in MongoDB; displayed through signed, resized URLs. A user can only attach media from their own folder.
- **Documents**: created on submit as immutable versions with a content hash. Re-submitting identical content returns the same version; changed content creates version N+1 and resets review status. Opening a preview never creates anything. Admin-proposed wedding terms are only applied after the client signs them.
- **Print / Download PDF**: both use the browser print engine with an A4 stylesheet (choose "Save as PDF"). No PDF library.
- **Legal text** is placeholder text in `config/legal.js` — replace it and bump `termsVersion`.
- **One request/application per account** (edit & resubmit supported). Rate limiting is in-memory; use a shared store if you run several instances. Set `TRUST_PROXY_HOPS` to the exact number of trusted reverse proxies in production (leave it at `0` for local/direct access). Generate a unique `JWT_SECRET` with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`; do not use the example value or commit real credentials.

## Manual test checklist
Client: landing → email → OTP → Event details → Vision & services (mark every service) → Budget & logistics → review/sign → wedding brief → Print/Download → dashboard. Admin: Clients/Applications → View brief → complete and send commercial proposal → client reviews/signs → mark Confirmed.
Staff: same via "Join as staff". Same account: register staff → log out → same email → "Create Client profile" → switch Client ↔ Staff from the dashboard header.
Admin: `/admin/login` → dashboard → Staff/Clients → View → status update → Documents. Admin APIs return 401 without the admin cookie.


## Mobile app experience
The home screen is now a mobile-first app launcher with separate Client and Staff entry points. Existing application workflows, API routes, authentication, database configuration, and backend implementation are preserved. The project includes a web app manifest, app icon, and service worker for installable PWA behavior.

### Install on Android
1. Deploy the app over HTTPS.
2. Open the deployed URL in Chrome on Android.
3. Use the browser menu and choose **Install app** or **Add to Home screen**.
4. Launch from the new home-screen icon. The app opens in standalone app mode.

Note: this produces an installable PWA, not a signed native APK. A store-ready APK/AAB can be generated separately from the deployed HTTPS URL with a PWA packaging tool. Keep production secrets in the hosting provider's environment settings; the local `.env` file is intentionally not included in this package.
