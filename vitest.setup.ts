import '@testing-library/jest-dom'

// lib/resend.ts constructs its client at import time, so any test that transitively
// imports it (even without calling send) throws without a key present.
process.env.RESEND_API_KEY ??= 're_test_dummy_key'
