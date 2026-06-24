# Talam — Configuration Checklist

**Date:** 2026-06-24
**Domain:** `mytalam.com`
**Status:** Pre-launch setup reference

> Work top-to-bottom. Each section has **Configure → Test → Validate** steps.
> Check every box before moving to the next section.
> §0 (domain) must be complete before §1–§11.

---

## §0. Domain Registration (Prerequisite)

**Configure**
- Search `mytalam.com` availability at [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) (at-cost pricing, no markup)
- Register the domain — note: `talam.co.in` is already taken by an MSME consultancy, avoid it
- Confirm domain appears under Cloudflare → Registrar → Domains

**Validate**
- [ ] `mytalam.com` registered and showing in Cloudflare dashboard

---

## §1. Cloudflare — Nameserver Handoff to Vercel

> ⚠️ Cloudflare is the **registrar only**. Nameservers must point to Vercel for wildcard SSL (DNS-01 challenge). Cloudflare proxy/WAF is not used — Vercel handles SSL termination.

**Configure**
- Cloudflare → `mytalam.com` → DNS → Nameservers → change to:
  - `ns1.vercel-dns.com`
  - `ns2.vercel-dns.com`
- Ensure no orange-cloud (proxy) records exist — all DNS records must be grey-cloud (DNS only)

**Test**
- Wait up to 48 hours for propagation
- Run: `nslookup mytalam.com` — should resolve to Vercel IPs
- Run: `nslookup silk.mytalam.com` — wildcard must also resolve

**Validate**
- [ ] `dig NS mytalam.com` returns `ns1.vercel-dns.com` and `ns2.vercel-dns.com`
- [ ] Propagation confirmed via [dnschecker.org](https://dnschecker.org)
- [ ] No Cloudflare proxy active (all records grey-cloud)

---

## §2. Vercel — Project Setup & Wildcard Domains

**Configure**
- Create a new Vercel project → link to the GitHub repo
- Framework preset: **Next.js**
- Deployment branch: `main`
- Project Settings → Domains → Add:
  - `mytalam.com` (root domain)
  - `*.mytalam.com` (wildcard — required for per-tenant subdomains)
- SSL is auto-provisioned by Vercel via Let's Encrypt (wildcard works only because Vercel controls the nameservers — see §1)
- Add all environment variables from §11 before first deploy

**Test**
- Deploy a minimal index page
- Visit `https://mytalam.com` — loads over HTTPS
- Visit `https://test.mytalam.com` — wildcard resolves and loads over HTTPS

**Validate**
- [ ] `mytalam.com` shows green padlock, no browser warning
- [ ] `*.mytalam.com` wildcard certificate issued (check Vercel → Domains)
- [ ] Vercel dashboard shows deployment status **Ready**

---

## §3. Supabase — Project, Database & Auth

### §3a. Project Creation

- Create a new Supabase project
- **Region:** `ap-south-1` (Mumbai) — lowest latency for Indian users
- From Project Settings → API, note:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### §3b. Restricted Database Role for Prisma

Run in Supabase SQL Editor:

```sql
CREATE ROLE talam_app_user WITH LOGIN PASSWORD '<strong-password>';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public TO talam_app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO talam_app_user;
```

From Project Settings → Database, collect two connection strings:
- `DATABASE_URL` — replace user with `talam_app_user` (Prisma at runtime)
- `DATABASE_URL_SERVICE_ROLE` — superuser `postgres` (migrations only)

**Validate**
- [ ] Connect as `talam_app_user` and run `DROP TABLE tenants;` → must return **permission denied**

### §3c. Auth Providers

- **Phone (OTP):** Enable → SMS provider = **Custom** (MSG91 via Hook — §4)
- **Google:** Enable → paste OAuth Client ID + Secret from Google Cloud Console (§10)
- **Email:** Enable → password login as fallback

### §3d. SMS Hook for MSG91

- Auth → Hooks → Send SMS → Add New Hook
- Type: **HTTPS**
- URL: `https://<supabase-project-ref>.supabase.co/functions/v1/msg91-sms-hook`
- Secret: generate a 32-byte random hex string → save as `SUPABASE_HOOK_SECRET`
- Deploy the Edge Function (see §4 for MSG91 setup first)

**Test**
- Trigger phone OTP from Supabase Auth dashboard → Users → "Send OTP to test number"

**Validate**
- [ ] OTP SMS delivered to test phone number
- [ ] Supabase Auth → Logs shows hook fired with HTTP 200
- [ ] Invalid hook secret returns 401

---

## §4. MSG91 — SMS OTP Delivery

> Verified integration: [Medium guide](https://medium.com/@shreebhagwat94/implementing-custom-sms-authentication-in-supabase-using-sms-hook-and-msg91-366d13acc81c) · [DEV.to guide](https://dev.to/acetrondi/using-supabase-sms-hook-to-send-custom-authentication-messages-in-india-4nj7)

**Configure**
- Create account at [msg91.com](https://msg91.com)
- Settings → API Keys → Generate → save as `MSG91_AUTH_KEY`
- Create OTP template:
  - Must be DLT-registered (TRAI requirement for all transactional SMS in India)
  - 6-digit OTP, ≤ 160 characters
  - Save template ID as `MSG91_TEMPLATE_ID`
- Write and deploy the Supabase Edge Function `msg91-sms-hook` that:
  1. Verifies the `SUPABASE_HOOK_SECRET` HMAC signature on every request
  2. Calls MSG91 OTP API with `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID`

**Test**
- Trigger OTP from the app → confirm SMS arrives on test phone within 10 seconds
- Check MSG91 Dashboard → Logs → Delivery Reports

**Validate**
- [ ] OTP SMS arrives within 10 seconds
- [ ] MSG91 delivery report shows **Delivered**
- [ ] After 5 OTP requests in 10 minutes, 6th is blocked with 429 (Upstash rate limit — §8)

---

## §5. Cloudinary — Image Storage

**Configure**
- Create account at [cloudinary.com](https://cloudinary.com)
- From Dashboard, note:
  - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Settings → Upload → Add upload preset:
  - Name: `talam_products`
  - Signing mode: **Unsigned** (client-side uploads)
  - Folder: `talam/` (per-tenant path enforced in code as `talam/{tenantId}/`)
  - Enable **Auto Format** (`f_auto`) and **Auto Quality** (`q_auto`)

**Test**
- Upload a test image via Cloudinary Media Library
- Request the URL with `f_auto,q_auto` transformation — confirm it loads

**Validate**
- [ ] Uploaded image URL is under the `/talam/` folder
- [ ] URL with `f_auto,q_auto` loads in browser
- [ ] 1 MB image uploads in under 3 seconds

---

## §6. Resend — Transactional Email

**Configure**
- Create account at [resend.com](https://resend.com)
- Domains → Add domain: `mail.mytalam.com`
- Add the DNS records Resend provides into Vercel DNS settings:
  - SPF: TXT record on `mail.mytalam.com`
  - DKIM: CNAME records (Resend provides 2–3)
- Wait for domain verification (green tick in Resend → Domains)
- API Keys → Create → Full Access → save as `RESEND_API_KEY`
- Default "From" address: `orders@mail.mytalam.com`

**Test**
- Resend Dashboard → Send Test Email → your own address
- Check inbox (not spam)

**Validate**
- [ ] Domain `mail.mytalam.com` verified (green tick in Resend)
- [ ] Test email lands in inbox, not spam
- [ ] [mail-tester.com](https://www.mail-tester.com) score ≥ 9/10

---

## §7. Razorpay — Talam Subscription Billing

> This is **Talam's own** Razorpay account for billing tenants (Starter ₹499/mo, Pro ₹1,499/mo). Separate from any tenant's payment gateway.

**Configure**
- Create account at [razorpay.com](https://razorpay.com)
- Complete KYC: business PAN + current account (required for live mode)
- Settings → API Keys → Generate → save:
  - `TALAM_RAZORPAY_KEY_ID`
  - `TALAM_RAZORPAY_KEY_SECRET`
- Enable **Subscriptions** product in Razorpay dashboard
- Create Plans:
  - **Starter:** ₹499/month, interval = monthly
  - **Pro:** ₹1,499/month, interval = monthly
- Note both Plan IDs — needed in application code

**Test**
- Switch to **test mode** (toggle in Razorpay dashboard)
- Complete a test subscription checkout using card `4111 1111 1111 1111`

**Validate**
- [ ] Test subscription payment succeeds in test mode
- [ ] Webhook fires and appears in Razorpay → Logs
- [ ] Starter and Pro Plan IDs noted

---

## §8. Upstash Redis — Rate Limiting

> Verified: `ap-south-1` (Mumbai) region is operational as of May 2026.

**Configure**
- Create account at [upstash.com](https://upstash.com)
- Create a new Redis database:
  - Region: **ap-south-1 (Mumbai)**
  - Type: Regional (not global — lower cost for OTP rate limiting)
- From database console, save:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`

**Test**
- Use Upstash REST console: SET `test` = `hello` → GET `test` → returns `hello`

**Validate**
- [ ] REST GET/SET works from Upstash console
- [ ] OTP rate limit enforced: 5 OTPs per phone per 10 min → 6th request returns 429

---

## §9. PostHog — Product Analytics

**Configure**
- Create account at [posthog.com](https://posthog.com)
- Create project: **Talam Production**
- Project Settings → note `NEXT_PUBLIC_POSTHOG_KEY`
- Create dashboard: "Key Metrics" — DAU, orders placed, GMV, active stores

**Test**
- Instrument a single test pageview
- PostHog → Live Events → confirm event appears within 30 seconds

**Validate**
- [ ] Events appear in Live Events within 30 seconds
- [ ] No PII in event properties (no phone numbers, no raw email addresses)
- [ ] `tenant_id` is attached to every order event

---

## §10. Google Cloud Console — OAuth for Sign-In

**Configure**
- Create project at [console.cloud.google.com](https://console.cloud.google.com)
- APIs & Services → Credentials → Create → **OAuth 2.0 Client ID** (Web Application)
- Authorized Redirect URIs — add:
  - `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
- Save Client ID and Client Secret
- Paste both into Supabase → Auth → Providers → Google → Enable

**Test**
- Click "Sign in with Google" → Google consent screen appears → sign in → redirected back

**Validate**
- [ ] Consent screen shows correct app name and `mytalam.com` domain
- [ ] Successful sign-in creates a user row in Supabase Auth
- [ ] Session persists across page refresh (HttpOnly cookie via `@supabase/ssr`)

---

## §11. Environment Variables — Full Checklist

Set all variables in **Vercel → Project Settings → Environment Variables** for Production, Preview, and Development. Mirror in `.env.local` for local dev (must be in `.gitignore`).

| Variable | Where to get it | Safe to expose? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | ✅ Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | ✅ Public |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary → Dashboard | ✅ Public |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog → Project Settings | ✅ Public |
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
| `TALAM_RAZORPAY_KEY_ID` | Razorpay → Settings → API Keys | 🔴 Server only |
| `TALAM_RAZORPAY_KEY_SECRET` | Razorpay → Settings → API Keys | 🔴 Server only |

**Validate**
- [ ] Zero `NEXT_PUBLIC_` variables contain secrets
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` or `CLOUDINARY_API_SECRET` with `NEXT_PUBLIC_` prefix
- [ ] `.env.local` is listed in `.gitignore`
- [ ] `git grep NEXT_PUBLIC_SUPABASE_SERVICE` returns no results

---

## §12. End-to-End Smoke Test

Run after all services are wired and the app skeleton is deployed.

**Auth**
- [ ] Phone OTP login completes — SMS arrives within 10 seconds, session created
- [ ] Google Sign-In works — user appears in Supabase Auth → Users

**Multi-tenancy**
- [ ] Visit `https://mytalam.com` — marketing page loads
- [ ] Visit `https://silk.mytalam.com` — D'Mystique storefront loads (wildcard works)
- [ ] Visit `https://silk.mytalam.com/admin` — tenant admin panel loads

**Core flows**
- [ ] Upload a product image → Cloudinary URL returned under `/talam/{tenantId}/`
- [ ] Place a test order (Razorpay test mode) → order record created
- [ ] Order confirmation email received via Resend within 60 seconds
- [ ] PostHog Live Events shows the order event with `tenant_id` attached

**Rate limiting**
- [ ] Attempt 6th OTP within 10 minutes → returns 429 (Upstash active)

**Subscription billing**
- [ ] Trial store goes read-only after `trial_ends_at` (simulate by back-dating in DB)
- [ ] Talam Razorpay subscription checkout opens correctly from upgrade banner
