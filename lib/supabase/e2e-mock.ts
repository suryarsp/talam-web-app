// ponytail: only auth is faked here — Prisma still talks to a real (ephemeral) Postgres
// in CI, so query behavior is never reimplemented. See e2e/seed.ts for the fixture owner.
export const E2E_OWNER_ID = '00000000-0000-0000-0000-0000000000e2'
export const E2E_OWNER_EMAIL = 'owner@e2e.test'
export const E2E_USER_COOKIE = 'e2e-user-id'

// Specs that want to exercise a brand-new signup (no tenant row yet) set this cookie
// to impersonate a different fake user id than the one e2e/seed.ts provisions a tenant for.
export function e2eMockSupabaseClient(userId: string = E2E_OWNER_ID) {
  return {
    auth: {
      async getUser() {
        // user_metadata is always present on a real Supabase user; without it any UI
        // reading user.user_metadata.<x> (e.g. ProfileMenu) crashes under the mock.
        return { data: { user: { id: userId, email: E2E_OWNER_EMAIL, user_metadata: {} } } }
      },
    },
  } as never
}
