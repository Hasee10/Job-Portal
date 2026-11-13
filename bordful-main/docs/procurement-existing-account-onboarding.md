# Existing-account Procurement onboarding fix

## Cause and behavior
The signup form always creates an employer row. Procurement supports employer, recruiter and seeker organization membership already, but the onboarding pages did not route existing sessions or offer all original sign-in methods with the Procurement callback.

Authenticated users with a verified id and a supported role now reach `/procurement/organizations` directly from Procurement signup and sign-in entry points. A general authenticated signup visit returns to that identity’s existing workspace. Direct employer-signup requests from existing authenticated users are also rejected before account creation.

Signed-out users can choose business signup, business credentials, legacy recruiter credentials or seeker Google/LinkedIn login. The Procurement callback is preserved. Recruiter authorization still uses `accountType=recruiter`; seeker OAuth still provisions/uses its own seeker identity. Nothing merges identities or memberships by email. Business-to-Jobs continues using the existing seeker OAuth path; no password or membership is copied between identity tables.

Duplicate signup returns a machine-readable `email_taken` code and renders inline original-account sign-in choices. It does not retry, overwrite records, prefill an email into sign-in links or discover the account type. The button now says Create business account while the backend employer role remains unchanged.

## Constraint verification
Read-only inspection of the existing local `joblo_local` database on loopback port 5433 found `employers_email_key UNIQUE (email)` and `employers_pkey PRIMARY KEY (id)`. The mapping now requires PostgreSQL 23505 plus either the verified email constraint name or explicit `Key (email)=` error metadata. An id/other unique violation is not called an email conflict. The hosted catalog was not inspected and no hosted records, credentials or schemas were modified.

## Security and verification
- Organization ownership continues to come exclusively from the verified NextAuth session id and role. Posted email, member id/type or organization id cannot assign ownership.
- Unit and local integration tests cover all three session types, credential/OAuth role preservation, authenticated signup redirects, duplicate error classification, anonymous creation denial, posted-identity spoofing, outsider access and same-UUID/different-type isolation.
- Callback checks reject external/protocol-relative URLs, backslashes and encoded control/normalization attacks while preserving legitimate encoded Jobs search queries.
- 71 distinct focused tests passed. The initial eight-file run passed 70 tests; a subsequent targeted two-file run passed 25 tests after adding the encoded-search regression and final context copy. No full suite was run.
- One standalone typecheck passed. One production build passed (webpack, with existing middleware/Edge deprecation warnings).
- Real local browser smoke: new business signup and credentials login, Procurement callback, buyer+supplier organization creation, authenticated signup redirect, authenticated direct-signup rejection, duplicate inline guidance with all callbacks and no retry, anonymous creation rejection and recruiter entry callback. Temporary local test rows were deleted.
- Real Google/LinkedIn OAuth and live recruiter login were not exercised; provider/identity logic is covered by focused tests. No authentication bypass, account migration or schema change.
- The branch starts at main `bba75c6`; PR #103 and its tender-performance branch are untouched. Webpack is used for the isolated worktree check because Turbopack cannot resolve the shared dependency junction outside its workspace root. No bundler configuration change is included.

## Exact implementation and test files

- `app/account/sign-in/page.tsx`
- `app/api/employers/signup/__tests__/route.test.ts`
- `app/api/employers/signup/route.ts`
- `app/api/procurement/organizations/__tests__/organization-entry.test.ts`
- `app/recruiter/sign-in/page.tsx`
- `app/sign-in/page.tsx`
- `app/sign-up/page.tsx`
- `components/auth/ExistingAccountOptions.tsx`
- `components/auth/SeekerSignInButtons.tsx`
- `components/auth/SignUpForm.tsx`
- `components/auth/__tests__/procurement-onboarding.test.ts`
- `lib/auth/__tests__/employers.test.ts`
- `lib/auth/employers.ts`
- `lib/auth/procurement-onboarding.ts`
- `lib/procurement/__tests__/employer-auth-local-integration.test.ts`
- `lib/utils/__tests__/safe-redirect.test.ts`
- `lib/utils/safe-redirect.ts`
