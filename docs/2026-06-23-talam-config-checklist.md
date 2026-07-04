# Talam — Configuration Checklist

**Date:** 2026-07-03 (revised)
**Domain:** `mytalam.com` (production only — not needed for development)
**Status:** Pre-launch setup reference

> Work top-to-bottom. Each section has **Configure → Test → Validate** steps, and every step is its own checkbox.
> Check every box before moving to the next section — later sections assume earlier `.env.local` values already exist.
> §A–§J get you a fully working **local dev environment** with no custom domain.
> §K (domain + production cutover) is deferred until you're ready to launch — see the note at the top of that section.

---

## Local dev model (read this first)

- [ ] Understand: root app runs at `http://localhost:3000`. No domain needed for local dev.
- [ ] Understand: per-tenant subdomains (`silk.mytalam.com` in prod) are **not reliably testable on localhost** — `*.localhost` subdomain routing depends on OS/browser support and is flaky.
- [ ] Plan to use a **Vercel preview deployment** to test subdomain routing instead of fighting `/etc/hosts` (per [phase-1-foundation plan](superpowers/plans/2026-06-23-talam-phase-1-foundation.md) — Vercel gives every deployment a `*.vercel.app` URL, and you can add a preview-only wildcard alias). Details in §J.
- [ ] Note: every third-party service below has a **sandbox/test mode** that works without `mytalam.com` existing — use it. Each section calls out the dev-mode shortcut.

---

## §A. Project Bootstrap

**Configure**
- [ ] Run `npm install` from the repo root
- [ ] Copy `.env` → `.env.local`
- [ ] Confirm `.env.local` is git-ignored: run `git check-ignore .env.local` and verify it prints the path (if it prints nothing, **stop** and fix `.gitignore` before adding secrets)
- [ ] Leave `.env.local` values blank for now — you'll fill them in as you complete §B–§I; come back to this section's Prisma steps once §B is done
- [ ] After `DATABASE_URL` is set (§B2), run `npx prisma generate`
- [ ] After `DATABASE_URL_SERVICE_ROLE` is set (§B2), run `npx prisma migrate dev --name init` (creates schema in your Supabase Postgres instance)

**Test**
- [ ] Run `npm run dev` and leave it running
- [ ] Open `http://localhost:3000` in a browser

**Validate**
- [ ] `npm run dev` prints `✓ Ready` and serves `http://localhost:3000`
- [ ] `npm run build` completes with no errors
- [ ] `npm test` runs (even if 0 tests yet)

---

## §B. Supabase — Project, Database & Auth

### §B1. Project Creation
**Configure**
- [ ] Go to [supabase.com](https://supabase.com) and sign in / create an account
- [ ] Click **New Project**
- [ ] Choose an organization (create one if this is your first project)
- [ ] Set project name (e.g. `talam-dev`)
- [ ] Set a database password — save it in a password manager immediately, you'll need it again in §B2
- [ ] Choose region: any region is fine for dev; use `ap-south-1` (Mumbai) to match prod and avoid latency surprises later
- [ ] Click **Create new project** and wait for provisioning (~2 minutes)
- [ ] Go to **Project Settings → API**
- [ ] Copy `Project URL` → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Copy `anon` `public` key → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Copy `service_role` `secret` key → paste into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

**Validate**
- [ ] All three values are present (non-empty) in `.env.local`
- [ ] Project dashboard shows status **Active**

### §B2. Restricted DB Role for Prisma
**Configure**
- [ ] In Supabase dashboard, go to **SQL Editor → New query**
- [ ] Paste and run, replacing `<strong-password>` with a newly generated password (not the project's database password):
```sql
CREATE ROLE talam_app_user WITH LOGIN PASSWORD '<strong-password>';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public TO talam_app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO talam_app_user;
```
- [ ] Confirm the query runs with no errors (`Success. No rows returned`)
- [ ] Go to **Project Settings → Database → Connection string**
- [ ] Copy the **URI** connection string twice (you'll edit each copy differently)
- [ ] Build `DATABASE_URL`: take the first copy, swap the username/password to `talam_app_user` / the password you just set → paste into `.env.local` as `DATABASE_URL` (used by the app at runtime)
- [ ] Build `DATABASE_URL_SERVICE_ROLE`: take the second copy, keep the superuser `postgres` username and the project's database password from §B1 → paste into `.env.local` as `DATABASE_URL_SERVICE_ROLE` (used only for `prisma migrate`)

**Test**
- [ ] Run `psql "$DATABASE_URL" -c "DROP TABLE tenants;"` (or the Windows/PowerShell equivalent using the same connection string)

**Validate**
- [ ] The `DROP TABLE` above returns **permission denied** (confirms the restricted role can't do DDL)
- [ ] `npx prisma migrate dev` succeeds using `DATABASE_URL_SERVICE_ROLE`
- [ ] Supabase → **Table Editor** shows the new tables after migration

### §B3. Auth Providers (dev mode)
**Configure**
- [ ] Go to **Authentication → Providers**
- [ ] **Email:** toggle on, enable password login — fastest way to create a test user without SMS/OAuth setup
- [ ] **Phone (OTP):** toggle on; choose any SMS provider from the dropdown (Twilio, Messagebird, Textlocal, Vonage, Twilio Verify) — the actual SMS routing is customized via Auth Hooks in §C, so the dropdown choice is secondary
- [ ] **Google:** leave disabled for now; you'll enable it once OAuth credentials exist (§H) — use email login until then

**Test**
- [ ] Use the app's sign-up form (or Supabase's own test tooling) to create a user with email + password

**Validate**
- [ ] Can sign up with email/password via Supabase Auth
- [ ] **Authentication → Users** shows the new user row with a confirmed/valid status

---

## §C. MSG91 — SMS OTP Delivery

> Skip this section entirely until you're testing the phone-login flow — email login (§B3) is enough for most dev work.

**Configure**
- [ ] Create account at [msg91.com](https://msg91.com)
- [ ] Verify your MSG91 account email/phone (required before API keys work)
- [ ] Go to **Settings → API Keys → Generate**
- [ ] Copy the generated key → paste into `.env.local` as `MSG91_AUTH_KEY`
- [ ] Go to **OTP → Templates → Create Template**
- [ ] Draft a DLT-registered OTP template (TRAI requirement): 6-digit OTP, ≤160 chars
- [ ] Submit the template for DLT approval and wait for approval (can take hours) before continuing
- [ ] Copy the approved template ID → paste into `.env.local` as `MSG91_TEMPLATE_ID`
- [ ] Generate a 32-byte random hex secret:
  ```
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Paste the generated value into `.env.local` as `SUPABASE_HOOK_SECRET`
- [ ] In Supabase, go to **Authentication → Hooks → Send SMS Hook → Add Hook**
- [ ] Set hook type to **HTTPS**
- [ ] Set URL to your deployed Edge Function: `https://<project-ref>.supabase.co/functions/v1/msg91-sms-hook`
- [ ] Set the hook secret to the `SUPABASE_HOOK_SECRET` value
- [ ] Write the Edge Function: verify the HMAC signature using `SUPABASE_HOOK_SECRET`, then call MSG91's OTP send API using `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID`
- [ ] Deploy the Edge Function with the Supabase CLI (`supabase functions deploy msg91-sms-hook`)

**Test**
- [ ] Go to Supabase **Authentication → Users → "Send OTP to test number"**
- [ ] Send a second OTP request to confirm rate limiting doesn't block normal use
- [ ] Send a request with a deliberately wrong hook secret (e.g. via `curl`) to confirm rejection

**Validate**
- [ ] OTP SMS arrives within 10 seconds
- [ ] Supabase **Authentication → Logs** shows the hook fired with HTTP 200
- [ ] An invalid hook secret returns 401
- [ ] 6th OTP request within 10 minutes returns 429 (depends on §F rate limiting)

---

## §D. Cloudinary — Image Storage

**Configure**
- [ ] Create account at [cloudinary.com](https://cloudinary.com)
- [ ] Go to the **Dashboard** (home page after login)
- [ ] Copy **Cloud name** → paste into `.env.local` as `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- [ ] Copy **API Key** → paste into `.env.local` as `CLOUDINARY_API_KEY`
- [ ] Copy **API Secret** (click "reveal") → paste into `.env.local` as `CLOUDINARY_API_SECRET`
- [ ] Go to **Settings (gear icon) → Upload → Upload presets → Add upload preset**
- [ ] Set preset name to `talam_products`
- [ ] Set **Signing Mode** to **Unsigned**
- [ ] Set **Folder** to `talam/` (application code enforces `talam/{tenantId}/` per upload on top of this)
- [ ] Enable **Auto Format** (`f_auto`) under delivery/quality settings
- [ ] Enable **Auto Quality** (`q_auto`) under delivery/quality settings
- [ ] Save the preset

**Test**
- [ ] Go to **Media Library** and upload a test image manually
- [ ] Copy the delivered image URL and append `f_auto,q_auto` transformation params
- [ ] Open that URL directly in a browser

**Validate**
- [ ] Uploaded image URL is under `/talam/`
- [ ] `f_auto,q_auto` URL loads successfully in browser
- [ ] A ~1 MB image uploads in under 3 seconds

---

## §E. Resend — Transactional Email (dev mode)

> In dev, skip domain verification — Resend lets you send from `onboarding@resend.dev` to your own verified address with zero DNS setup. Custom domain (`mail.mytalam.com`) is a §K production step.

**Configure**
- [ ] Create account at [resend.com](https://resend.com)
- [ ] Go to **API Keys → Create API Key**
- [ ] Set permission to **Full Access**
- [ ] Copy the generated key immediately (shown once) → paste into `.env.local` as `RESEND_API_KEY`
- [ ] In application code, set the sender to `from: "Talam <onboarding@resend.dev>"` for dev — no domain verification required
- [ ] Confirm the recipient address used for dev testing is verified under your Resend account (Resend restricts `onboarding@resend.dev` sends to the account owner's address in unverified/free accounts)

**Test**
- [ ] Go to Resend **Dashboard → Emails → Send Test Email** to your own address
- [ ] Trigger the app's order confirmation flow against a test order

**Validate**
- [ ] Test email lands in inbox using `onboarding@resend.dev`
- [ ] Order confirmation flow sends successfully in dev
- [ ] Resend **Logs** shows the send with status "Delivered"

---

## §F. Upstash Redis — Rate Limiting

**Configure**
- [ ] Create account at [upstash.com](https://upstash.com)
- [ ] Go to **Redis → Create Database**
- [ ] Choose type **Regional** (any region for dev — match `ap-south-1` for prod parity)
- [ ] Name the database (e.g. `talam-dev`) and create it
- [ ] Open the database console
- [ ] Copy **UPSTASH_REDIS_REST_URL** (labeled "REST URL") → paste into `.env.local`
- [ ] Copy **UPSTASH_REDIS_REST_TOKEN** (labeled "REST Token") → paste into `.env.local`

**Test**
- [ ] In Upstash console → **CLI / Data Browser**, run `SET test hello`
- [ ] Run `GET test` and confirm it returns `hello`
- [ ] Trigger 6 OTP requests for the same phone number within 10 minutes via the app (requires §C configured)

**Validate**
- [ ] REST GET/SET works from Upstash console
- [ ] OTP rate limit enforced: 5 OTPs per phone per 10 min → 6th returns 429

---

## §G. Razorpay — Talam Subscription Billing (test mode)

> This is **Talam's own** Razorpay account for billing tenants. Test mode requires no KYC — skip KYC entirely until §K production cutover.

**Configure**
- [ ] Create account at [razorpay.com](https://razorpay.com)
- [ ] Confirm the dashboard shows **Test Mode** toggle enabled (default for a new account, no KYC needed)
- [ ] Go to **Settings → API Keys → Generate Test Key**
- [ ] Copy **Key Id** → paste into `.env.local` as `TALAM_RAZORPAY_KEY_ID`
- [ ] Copy **Key Secret** (shown once) → paste into `.env.local` as `TALAM_RAZORPAY_KEY_SECRET`
- [ ] Go to **Subscriptions** in the left nav and enable the product if prompted
- [ ] Go to **Subscriptions → Plans → Create Plan**
- [ ] Create plan "Starter" at ₹499/mo → copy Plan ID → paste into `.env.local` as `RAZORPAY_STARTER_PLAN_ID`
- [ ] Create plan "Pro" at ₹1,499/mo → copy Plan ID → paste into `.env.local` as `RAZORPAY_PRO_PLAN_ID`
- [ ] Go to **Settings → Webhooks → Add New Webhook** and point it at your app's webhook endpoint (use a tunnel like `ngrok` for local dev, or the Vercel preview URL from §J)
- [ ] Select the subscription-related webhook events you need (e.g. `subscription.charged`, `subscription.cancelled`)

**Test**
- [ ] Complete a test subscription checkout using card `4111 1111 1111 1111`, any future expiry, any CVV
- [ ] Check that the webhook delivery succeeds

**Validate**
- [ ] Test subscription payment succeeds
- [ ] Webhook fires and appears in Razorpay → **Logs** with a 2xx response
- [ ] Starter and Pro Plan IDs noted in `.env.local`

---

## §H. Google Cloud Console — OAuth (dev mode)

**Configure**
- [ ] Go to [console.cloud.google.com](https://console.cloud.google.com) and create/select a project
- [ ] Go to **APIs & Services → OAuth consent screen** and configure it (External, add app name + support email) if not already done
- [ ] Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
- [ ] Set application type to **Web Application**
- [ ] Under **Authorized redirect URIs**, add: `https://<supabase-project-ref>.supabase.co/auth/v1/callback` (same URI works for dev and prod — it's Supabase's callback, not yours)
- [ ] Click **Create** and copy the **Client ID** and **Client Secret**
- [ ] In Supabase, go to **Authentication → Providers → Google**
- [ ] Paste Client ID and Client Secret
- [ ] Toggle the Google provider **Enable**

**Test**
- [ ] From `http://localhost:3000`, click "Sign in with Google"
- [ ] Complete the consent screen
- [ ] Confirm redirect back to localhost with an active session
- [ ] Refresh the page to confirm the session persists

**Validate**
- [ ] Sign-in works from `localhost:3000`
- [ ] User row appears in Supabase **Authentication → Users**
- [ ] Session persists across page refresh (HttpOnly cookie via `@supabase/ssr`)

---

## §I. PostHog — Product Analytics

**Configure**
- [ ] Create account at [posthog.com](https://posthog.com)
- [ ] Create a new project named "Talam Dev" (keep it separate from "Talam Production" — don't mix dev events into prod analytics)
- [ ] Go to **Project Settings → Project API Key**
- [ ] Copy the key → paste into `.env.local` as `NEXT_PUBLIC_POSTHOG_KEY`
- [ ] Confirm the PostHog client is initialized in the app (check `posthog-js` init code points at the correct API host)

**Test**
- [ ] Load `localhost:3000` to trigger a pageview
- [ ] Go to PostHog → **Activity → Live Events**

**Validate**
- [ ] Events appear in Live Events within 30 seconds
- [ ] No PII in event properties (no phone numbers, no raw email)
- [ ] `tenant_id` attached to every order event

---

## §J. Vercel — Preview Deploys (no domain needed)

> Subdomain routing (§ middleware) is hard to test on localhost — use a Vercel preview deployment instead, per the phase-1 plan.

**Configure**
- [ ] Go to [vercel.com](https://vercel.com) and create/sign in to an account
- [ ] Click **Add New → Project** and link the GitHub repo
- [ ] Confirm Vercel auto-detects the **Next.js** framework preset
- [ ] Go to **Project Settings → Environment Variables**
- [ ] Add every variable currently in `.env.local`, scoped to **Development** and **Preview** environments
- [ ] Push a feature branch to GitHub
- [ ] Wait for Vercel to auto-generate a preview URL (e.g. `talam-web-app-git-branch.vercel.app`)
- [ ] If testing subdomain rewrite logic, set `ROOT_DOMAIN` for the Preview environment to match the preview deployment's base domain, or configure a Vercel preview wildcard alias

**Test**
- [ ] Visit the root preview URL → confirm marketing page loads
- [ ] Visit `https://test.talam-web-app-git-branch.vercel.app` (or your configured wildcard alias) → confirm subdomain/tenant routing resolves

**Validate**
- [ ] Preview deployment builds and shows **Ready** in Vercel dashboard
- [ ] Root preview URL loads marketing page over HTTPS
- [ ] Subdomain preview URL correctly routes to tenant-specific content

---

## End-to-End Dev Smoke Test

Run once §A–§J are wired up.

**Auth**
- [ ] Email/password sign-up + login works
- [ ] Google Sign-In works (§H)
- [ ] Phone OTP works if §C is configured

**Core flows**
- [ ] Upload a product image → Cloudinary URL under `/talam/{tenantId}/`
- [ ] Place a test order (Razorpay test mode) → order record created
- [ ] Order confirmation email received via Resend (`onboarding@resend.dev`)
- [ ] PostHog Live Events shows the order event with `tenant_id`

**Rate limiting**
- [ ] 6th OTP within 10 minutes → 429 (Upstash)

---

## §K. Production Domain Cutover (deferred — do this last, right before launch)

> Nothing in §A–§J depends on this section. Come back here once the app is feature-complete and you're ready to go live on `mytalam.com`.

### §K1. Domain Registration
**Configure**
- [ ] Go to [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)
- [ ] Search `mytalam.com`
- [ ] Confirm availability and pricing (at-cost, no markup)
- [ ] Register the domain (note: `talam.co.in` is taken by an unrelated MSME consultancy — avoid it)
- [ ] Complete payment and registrant contact details

**Validate**
- [ ] `mytalam.com` shows under Cloudflare → **Registrar → Domains**

### §K2. Cloudflare — Nameserver Handoff to Vercel
> ⚠️ Cloudflare is registrar only. Nameservers must point to Vercel for wildcard SSL (DNS-01 challenge). No Cloudflare proxy/WAF — Vercel terminates SSL.

**Configure**
- [ ] Go to Cloudflare → `mytalam.com` → **DNS → Nameservers**
- [ ] Set nameservers to `ns1.vercel-dns.com` and `ns2.vercel-dns.com`
- [ ] Confirm no existing DNS records are set to orange-cloud (proxied) — all must be grey-cloud
- [ ] Save changes

**Test**
- [ ] Run `nslookup mytalam.com` after allowing up to 48h propagation
- [ ] Run `nslookup silk.mytalam.com` after propagation

**Validate**
- [ ] `dig NS mytalam.com` returns the two Vercel nameservers
- [ ] Propagation confirmed via [dnschecker.org](https://dnschecker.org)
- [ ] No Cloudflare proxy active

### §K3. Vercel — Attach Production Domains
**Configure**
- [ ] Go to the Vercel project → **Settings → Domains**
- [ ] Add `mytalam.com`
- [ ] Add `*.mytalam.com`
- [ ] Wait for SSL to auto-provision via Let's Encrypt (requires §K2 nameservers to already point at Vercel)
- [ ] Confirm the `main` branch is set as the **Production Branch**
- [ ] Promote the latest `main` deployment to production if not already live

**Test**
- [ ] Visit `https://mytalam.com`
- [ ] Visit `https://test.mytalam.com`

**Validate**
- [ ] `mytalam.com` shows green padlock, no certificate warning
- [ ] `*.mytalam.com` wildcard certificate issued (Vercel → Domains)
- [ ] Deployment status **Ready**

### §K4. Resend — Verify Production Sending Domain
**Configure**
- [ ] Go to Resend → **Domains → Add Domain**
- [ ] Enter `mail.mytalam.com`
- [ ] Copy the SPF (TXT) record Resend provides → add to Vercel DNS
- [ ] Copy the DKIM (CNAME ×2–3) records Resend provides → add to Vercel DNS
- [ ] Wait for DNS propagation
- [ ] Confirm the green verification tick appears in Resend → **Domains**
- [ ] Update application code: switch `from:` to `orders@mail.mytalam.com`
- [ ] Update `RESEND_API_KEY` in Vercel Production environment variables if using a different key for prod

**Test**
- [ ] Send a real test email through the app in production mode
- [ ] Run the email through [mail-tester.com](https://www.mail-tester.com)

**Validate**
- [ ] Domain verified (green tick)
- [ ] Test email lands in inbox, not spam
- [ ] mail-tester.com score ≥ 9/10

### §K5. Razorpay — Go Live
**Configure**
- [ ] Go to Razorpay dashboard → complete **KYC** (business PAN + current account details)
- [ ] Wait for KYC approval
- [ ] Switch dashboard out of test mode into **Live Mode**
- [ ] Go to **Settings → API Keys → Generate Live Key**
- [ ] Copy live Key Id and Key Secret
- [ ] Update Vercel **Production** environment variables: `TALAM_RAZORPAY_KEY_ID`, `TALAM_RAZORPAY_KEY_SECRET`
- [ ] Recreate/confirm Starter and Pro subscription plans exist in live mode (plan IDs differ from test mode) → update `RAZORPAY_STARTER_PLAN_ID`, `RAZORPAY_PRO_PLAN_ID` in Vercel Production
- [ ] Re-point the production webhook URL and secret in Razorpay live settings

**Test**
- [ ] Complete a real ₹1 test transaction through the production app end-to-end

**Validate**
- [ ] Live mode active
- [ ] A real ₹1 test transaction succeeds end-to-end
- [ ] Webhook fires correctly in live mode

### §K6. Environment Variables — Production Checklist

**Configure**
- [ ] Open Vercel → Project Settings → Environment Variables, scoped to **Production**
- [ ] Add/confirm every variable below is present with a live (not test/dev) value

| Variable | Where to get it | Safe to expose? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | ✅ Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | ✅ Public |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary → Dashboard | ✅ Public |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog → Project Settings | ✅ Public |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `mytalam.com` in production | ✅ Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | 🔴 Server only |
| `DATABASE_URL` | Supabase → Settings → Database (`talam_app_user`) | 🔴 Server only |
| `DATABASE_URL_SERVICE_ROLE` | Supabase → Settings → Database (`postgres`) | 🔴 Server only |
| `MSG91_AUTH_KEY` | MSG91 → Settings → API Keys | 🔴 Server only |
| `MSG91_TEMPLATE_ID` | MSG91 → OTP Template | 🔴 Server only |
| `SUPABASE_HOOK_SECRET` | Self-generated 32-byte hex | 🔴 Server only |
| `RESEND_API_KEY` | Resend → API Keys | 🔴 Server only |
| `CLOUDINARY_API_KEY` | Cloudinary → Dashboard | 🔴 Server only |
| `CLOUDINARY_API_SECRET` | Cloudinary → Dashboard | 🔴 Server only |
| `UPSTASH_REDIS_REST_URL` | Upstash → Database console | 🔴 Server only |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash → Database console | 🔴 Server only |
| `TALAM_RAZORPAY_KEY_ID` | Razorpay → Settings → API Keys (live) | 🔴 Server only |
| `TALAM_RAZORPAY_KEY_SECRET` | Razorpay → Settings → API Keys (live) | 🔴 Server only |
| `RAZORPAY_STARTER_PLAN_ID` | Razorpay → Plans | 🔴 Server only |
| `RAZORPAY_PRO_PLAN_ID` | Razorpay → Plans | 🔴 Server only |

- [ ] Double-check every 🔴 "Server only" variable is **not** prefixed `NEXT_PUBLIC_`
- [ ] Trigger a fresh production redeploy after adding/updating env vars (Vercel doesn't retroactively apply them to old builds)

**Validate**
- [ ] Zero `NEXT_PUBLIC_` variables contain secrets
- [ ] `.env.local` is listed in `.gitignore`
- [ ] `git grep NEXT_PUBLIC_SUPABASE_SERVICE` returns no results

### §K7. Production Smoke Test
- [ ] Visit `https://mytalam.com` — marketing page loads
- [ ] Visit `https://silk.mytalam.com` — tenant storefront loads (wildcard works)
- [ ] Visit `https://silk.mytalam.com/admin` — tenant admin panel loads
- [ ] Phone OTP works against production
- [ ] Google login works against production
- [ ] Image upload works against production
- [ ] Order placement works against production
- [ ] Confirmation email is received against production
- [ ] PostHog event fires against production
- [ ] Trial store goes read-only after `trial_ends_at` (simulate by back-dating in DB)
- [ ] Talam Razorpay subscription checkout opens correctly from the upgrade banner
