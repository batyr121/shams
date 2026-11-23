# The Grand Ball

Next.js App Router, React, TypeScript, Tailwind 4, Supabase PostgreSQL/Auth/Storage, GSAP + ScrollTrigger, Framer Motion, Lucide and QRCode.

## Run locally

Use Node.js 22 or newer.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Until Supabase is configured, registration and voting clearly indicate that live services are unavailable. No submissions, couples, results, or administrator sessions are simulated. The initial event program is an editable suggested schedule; confirm the start time (initially 18:00 Aqtau), venue (initially School Grand Hall), and program with the organizer before inviting guests.

## Connect the real backend

1. Create a Supabase project. Run `supabase/migrations/202611230001_grand_ball.sql` in the SQL Editor, or link the project and run `supabase db push`. Use a fresh project: migration creates tables, storage buckets, policies and functions.
2. Put the project URL and public anon key in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never put a service-role key in this app. Restart the development server after changing environment values.
3. Create an organizer account in Supabase Authentication. Disable public signups if not needed. In the SQL Editor, grant the role using the account's UUID:

```sql
insert into public.admin_profiles(user_id,role)
values ('REPLACE-WITH-AUTH-USER-UUID','admin');
```

4. Sign in at `/admin`. Review event settings; start/deadline inputs use Aqtau UTC+5. The event timestamp is stored as `timestamptz`; clients count down to the same instant regardless of visitor timezone.
5. Submit a test application at `/register-couple`. Check the uploaded private image, consent and contact details before approving. Approval copies the private image into the public competition bucket. For manually added couples, save, edit, upload a photo, then approve. Numbers are assigned automatically once and display order can be edited.
6. Generate guest tickets in Voting Management. **Save the CSV immediately**: plaintext codes are returned once, then only SHA-256 hashes remain in PostgreSQL. Keep the downloaded list private. Distribute exactly one ticket per authorized guest. Redeemed and revoked tickets cannot vote.
7. Open voting. Use two browser windows to try voting concurrently with one test code; exactly one transaction must succeed. Try invalid/revoked codes and closed voting. No public endpoint returns ticket hashes, private contacts, votes, or unpublished totals.
8. Open `/screen/qr` on the projector. The QR encodes the actual page origin plus `/vote`. A public QR does not replace the guest's personal code. PNG/SVG downloads and print are in QR Generator.
9. Close voting before publishing results or announcing winners. Open `/screen/winner` before clicking the announcement button. Screens poll every 5 seconds; after receiving the authorized reveal they animate 3–2–1. Tied leaders share the title unless an administrator records an announced tie-break and selects a tied leader before revealing. Reveal is final and prevents reopening voting.

## Deploy

```sh
npm run typecheck
npm run build
```

The `out` directory contains the static export. Deploy it to any HTTPS static host with clean URL support, or Vercel using the included Next.js configuration. Set both public Supabase environment variables **before building**; static exports bake them into client assets. Rebuild after changing them. The server-side backend is Supabase: privileged RPC functions run in PostgreSQL and enforce authorization independently of the browser. A Node API server and service-role key are not required.

Sites hosting metadata is in `.openai/hosting.json`. Publish `out` using the Sites workflow. Sites publications start owner-private; guest access requires changing the Site's audience or using another public host. Test the deployed `/vote`, `/admin`, and `/screen/qr` paths before distributing tickets. Use the actual HTTPS deployment for the final QR, never localhost.

## Security and operational notes

- PostgreSQL RLS protects private data. Public approved-couple view exposes a fixed safe column list. Authenticated administrator checks run within every privileged function. Default PUBLIC function execution grants are revoked.
- Voting locks the settings row, ticket row and eligible couple, writes the vote and marks redemption within one transaction. A unique `votes.ticket_id` constraint is the final duplicate barrier. Codes have 80 bits of secure randomness; hashes are not exposed even to the dashboard.
- Guest identity is checked operationally when staff hand out tickets. Votes store no guest names; administrators can see ticket redemption and aggregate results. They cannot access raw votes through the public API.
- Applications are limited to one per contact per ten minutes. For a fully public high-traffic event, add an upstream bot challenge and rate limiting. Public registration is not an authentication system.
- Storage limits MIME types and file sizes; private images need organizer review before being made public. Consider image re-encoding and malware scanning in an Edge Function for untrusted public campaigns. Obtain participant/guardian permission and establish retention rules with the school.
- Deleted couples/gallery entries leave storage objects for administrator retention review; delete unused objects in Supabase Storage when appropriate. Incomplete uploads expire after fifteen minutes; remove abandoned `uploading` rows and private objects periodically.
- Enable Supabase backups, review Auth password/MFA policies, keep administrator accounts limited, and archive the audit log after the event.
- No Supabase credentials were supplied during initial implementation. Migration execution and end-to-end database verification require the project owner’s setup above.

## Assets

Ballroom photograph: Unsplash image `photo-1519167758481-83f550bb49b3`, downloaded into `public/images/ballroom.jpg`. This is atmosphere imagery, not a claim about the actual school venue. Google Fonts serves Cormorant Garamond, Playfair Display and Manrope. A serif system fallback is included.
