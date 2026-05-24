# SPDD Analysis: Questadi v1.0 — Full Product

## Original Business Requirement

> "It takes time to wait." — captured by Antoine, said by his son.
> Questadi is about remembering the people around you through what they say.

---

## Overview

Questadi is a lightweight iOS app that lets you capture quotes from the people in your life — friends, family, colleagues — in the moment they happen, without interrupting the conversation. It is not a social network. It is not a notes app. It is a personal archive of the people you love, expressed through their own words.

The core insight is that memorable things get said constantly — at bars, at dinner tables, on hikes — and they disappear. Questadi makes capturing them as fast as unlocking your phone. The experience is built around a single interaction: see the lock screen widget, tap, type a name, type the quote, save. Done in under 10 seconds.

The quoted person is a secondary user. They can view what was captured about them, accept quotes as public, and eventually receive them as gifts. In v1, their role is passive: they receive an SMS, view their quote, feel delighted.

---

## Business Value

- **Retention driver:** The library of quotes becomes more valuable over time. A user with 50 quotes across 20 people has a personal artifact they will not abandon.
- **Viral loop:** Every SMS sent to a quoted person is a product introduction. No account required to view — the delight moment is the acquisition moment.
- **Emotional stickiness:** The use case is inherently social and affective. Quotes are funny, profound, embarrassing. People share them. The product spreads through word of mouth.
- **Monetization surface (v2+):** The quote library unlocks a gifting mechanic — personalized merchandise (t-shirts, prints) triggered by birthdays or milestones. The v1 focus on privacy and capture quality builds the foundation for this.
- **Success metric for v1:** A user captures at least 3 quotes in their first week and returns to the library at least once without a push notification prompt.

---

## User Roles

Both roles map to the same `Account` entity. The difference is registration state and how they interact with the product.

### Capturer (registered Account)
- Has installed Questadi and authenticated via SMS OTP.
- Has full read/write access to their own quote library.
- Can capture quotes attributed to any Account — registered, unregistered, or unnamed.
- Can delete any quote they have captured.
- Can browse their library organized by person or chronologically.
- Receives no notifications in v1 (notifications are outbound only).

### Quoted Person (unregistered Account)
- Was quoted by a capturer. May or may not have Questadi installed.
- Account is created automatically when a capturer types their name and saves a quote.
- Receives an SMS when a quote is captured about them (if phone number is available).
- Can view their quotes via a tokenized web link — no login required.
- Can accept a quote as public (opt-in, explicit action) via the web view.
- Can request removal of a quote via the web view.
- Becomes a registered Account (capturer) if they install Questadi and authenticate.
- On registration: their existing Account is promoted in place — all prior quotes attributed to them are preserved, no migration needed.

---

## Data Model

### Design Decision — Unified Account Model

There is a single `Account` entity. Everyone in the system — whether they have installed Questadi or not — is an Account. The difference is whether the account is registered.

- A capturer creates an Account for a quoted person the moment they type their name. That account starts as unregistered (no credentials, no app access).
- When the quoted person installs Questadi and authenticates via SMS OTP, their existing Account is promoted to registered. No duplicate, no merge step needed.
- A single person can appear in multiple capturers' libraries. Each capturer holds a reference to the same Account via phone number match, or creates a local-only entry if no phone is available.

```
registered = true   → has authenticated, can log in, has a library
registered = false  → exists as a quoted person only, no app access
```

### Account
```
id              UUID          primary key
display_name    String        as entered by capturer, or set by account owner
full_name       String?       set on registration or resolved from contacts
phone           String?       E.164 format; used for SMS OTP + notifications
contact_id      String?       iOS Contacts identifier if linked (per capturer device)
avatar_initials String        derived from display_name, e.g. "MA"
registered      Boolean       false until SMS OTP auth completed
created_at      Timestamp
last_active     Timestamp?    null until first login
created_by      Account.id?   the capturer who first added this person; null if self-registered
```

### Quote
```
id              UUID          primary key
text            String        the quote text, max 500 chars
captured_by     Account.id    the capturer (must be registered)
attributed_to   Account.id    who said it (registered or unregistered)
captured_at     Timestamp     when it was saved
is_public       Boolean       default false; true only if attributed_to accepted
deleted_at      Timestamp?    soft delete
```

### Notification
```
id              UUID
quote_id        Quote.id
recipient       Account.id
channel         Enum          sms
sent_at         Timestamp
delivery_status Enum          pending | sent | delivered | failed
```

### Key Relationships
- One Account can be `captured_by` on many quotes (as capturer)
- One Account can be `attributed_to` on many quotes (as quoted person)
- The same Account can be both capturer and quoted person across different quotes
- An unregistered Account has no quotes where `captured_by = their id` — they cannot capture until registered

---

## User Flows

### Flow 1 — Lock Screen Capture (primary flow, quote-first)

```
1. User sees lock screen widget (Questadi icon + "capture a quote")
2. User taps widget
3. App opens directly to capture screen — no splash, no navigation
4. Cursor is in the quote field
5. Quote field is pre-formatted: opening " is inserted automatically
6. A "— who said this?" chip appears below the quote field, dormant
7. User types the quote (e.g. "It takes time to wait")
8. After 3 words or first punctuation mark (whichever comes first),
   the who-chip activates — border highlights, signalling it is ready
9. User taps the who-chip (optional — can save without attribution)
10. Quote field dims but remains visible
11. Who-chip becomes an inline search field, cursor moves into it
12. Contacts autocomplete drops below:
    - Sorted by: previously quoted first, then alphabetical
    - Shows: full name + avatar initials + "last quoted N days ago" if applicable
    - Filters live as user types
    - Last option: "+ Add '[typed name]'" for unknown contacts
13. User taps a contact suggestion
14. Who-chip resolves to "— [Full Name]" below the quote
15. Closing " is appended to quote text automatically
16. User taps Save
17. Quote is saved to library
18. SMS notification sent to quoted person (if phone number available)
19. App returns to lock screen immediately
```

### Flow 2 — Unknown Contact Capture

```
1-11. Same as Flow 1
12. User types a name not in contacts (e.g. "Café stranger")
13. Autocomplete shows: "+ Add 'Café stranger'" as last option
14. User taps the add option
15. Who-chip resolves to "— Café stranger"
16. Name saved as display_name only, no phone linked
17. Continue from step 15 of Flow 1
18. No SMS sent (no phone number available)
```

### Flow 3 — Save Without Attribution

```
1-8. Same as Flow 1
9. User does not tap the who-chip
10. User taps Save directly
11. Quote saves with attributed_to = null
12. Quote appears in library under "unattributed" group
13. Attribution can be added later from the library view
14. No SMS sent
```

### Flow 4 — Quoted Person Views Their Quote (web)

```
1. Quoted person receives SMS: "[Capturer name] just captured you on Questadi."
   + "See what you said: [link]"
2. Person taps link — opens web view, no account required
3. Web view shows:
   - Quote text in large type
   - "Said by you, captured by [capturer name]"
   - Date captured
   - Option: "Make this public" (toggle, requires confirmation)
   - Option: "Request removal" (sends removal request to capturer)
4. If they tap "Make this public":
   - Confirmation dialog: "This quote will be visible to others. You can undo this."
   - On confirm: quote.is_public = true
5. If they tap "Request removal":
   - Capturer receives in-app notification (v2) or email (v1 fallback)
   - Quote is flagged for review
```

### Flow 5 — Browse Library

```
1. User opens Questadi app
2. Default view: list of people, sorted by most recently quoted
3. Each person row shows: avatar initials, name, quote count, last quote preview
4. User taps a person
5. Person detail view: all quotes from that person, reverse chronological
6. Each quote shows: text, date captured
7. Long press on quote: reveal delete option
8. Delete: soft-delete with undo toast (5 second window)
```

---

## Interaction Design

### Quote Field — Primary Entry Point
- Opens immediately on widget tap — no name field, no navigation
- Opening `"` is pre-inserted; cursor lands inside it
- Multiline, large tap target, keyboard appears immediately
- No character limit shown in v1; enforce 500 char max silently (stop accepting input)
- On save: closing `"` is appended to quote text before storing
- If user manually typed an opening `"`: do not double-insert

### Who-Chip — Attribution Control
- Appears below the quote field on screen open, dormant state (muted border)
- Label: "— who said this?"
- Activation trigger: 3 words typed in quote field, OR first punctuation character (. , ! ?), whichever comes first
- Activated state: border highlights in accent color, chip is now tappable
- Tapping chip: quote field dims, chip becomes inline search input, cursor moves into it
- Autocomplete source: iOS Contacts (with permission) + previously added Questadi Accounts
- Autocomplete sort: previously quoted Accounts first (by recency), then contacts alphabetical
- Autocomplete match: prefix match on first name, last name, and full name
- Maximum 4 results visible without scrolling
- Last option always: "+ Add '[typed name]'" for unknown contacts
- On selection: chip resolves to "— [Full Name]", quote field un-dims, closing `"` appended
- If chip never tapped: quote saves as unattributed (attributed_to = null)

### Save Behavior
- Save button: always visible, activates once quote field has at least 1 character
- Attribution is not required to save
- On save: haptic feedback (success), immediate return to lock screen
- No confirmation screen, no success modal
- Failed save (network error): retain input, show inline error, retry button

### Unattributed Quotes
- Saved with attributed_to = null
- Appear in library under a dedicated "unattributed" group
- Attribution can be added at any time from the library view
- No SMS sent for unattributed quotes

### Edge Cases
- Capture with no phone number linked: quote saves normally, no SMS sent, no error shown to capturer
- Duplicate quote (same person, same text, within 60 seconds): silently deduplicate, show same success state
- App opened directly (not via widget): opens to library view, not capture screen

---

## Privacy Model

### Defaults
- All quotes are private by default (`is_public = false`)
- Only the capturer can see their quotes in the app
- The quoted person can see their own quotes via SMS web link
- No other user can see any quote without explicit opt-in

### Public Quotes
- A quote becomes public only when the quoted person explicitly accepts it
- Acceptance is a deliberate action with a confirmation dialog
- Public quotes are visible in v2+ features (gifting, profile pages)
- In v1, `is_public = true` is stored but has no visible effect in-app

### Data Access Rules
- Capturer: full access to all quotes they created
- Quoted person: read access to quotes attributed to them, via authenticated web link
- No other user has access to any quote
- SMS link is single-use per quote notification (token-based, expires in 30 days)

### Deletion
- Capturer can delete any quote they created (soft delete, 5 second undo window)
- After soft delete, quote is removed from all views immediately
- Hard delete after 30 days
- Quoted person can request removal; capturer is notified but deletion is not automatic in v1

---

## Notifications

### SMS to Quoted Person
- Trigger: quote saved successfully, phone number available on Person record
- Timing: sent within 60 seconds of save
- Sender: Questadi shared number (e.g. via Twilio)
- Tone: warm, light, never transactional

**Message template:**
```
[Capturer first name] just captured something you said.

"[Quote text]"

See your legend: [web link]
```

- Web link: tokenized URL, no account required, expires 30 days
- If no phone number: no SMS sent, no error shown to capturer
- Rate limit: max 3 SMS per quoted person per 24 hours (dedup burst captures)

### In-App Notifications (v1 scope: none)
- No push notifications sent to capturers in v1
- No notification when quoted person views or accepts a quote in v1

---

## Scope In

- iOS app (SwiftUI)
- Lock screen widget (WidgetKit, iOS 16+)
- Contact autocomplete (CNContactStore with permission)
- Two-field capture: person + quote
- Auto-formatting: opening/closing quotes, colon insertion
- Unknown contact quick-add (name only, no phone)
- Quote library: by person, reverse chronological
- Soft delete with undo
- SMS notification to quoted person (Twilio)
- Tokenized web view for quoted person (no account required)
- Public opt-in toggle for quoted person
- Removal request from quoted person
- SMS OTP authentication for capturer
- Private-by-default data model
- Backend API (REST, to be determined stack)
- Data persistence (cloud-synced, not local-only)

---

## Scope Out

The following are explicitly excluded from v1. They must not be generated, scaffolded, or implied by any implementation derived from this spec.

- **Merchandise / gifting** — t-shirts, prints, personalized gifts. Deferred to v2+.
- **Milestone notifications** — "5 people have captured you." Deferred to v2+.
- **Public feed or explore view** — no algorithmic timeline, no discovery surface.
- **Social graph** — no following, no friends list, no mutual connections.
- **Android** — iOS only for v1.
- **Voice capture** — text input only in v1.
- **Quote tagging or categorization** — no labels, moods, or occasions in v1.
- **In-app push notifications** — outbound SMS only in v1.
- **Quote editing** — once saved, a quote is immutable in v1.
- **Multiple capturers per quote** — one quote, one capturer.
- **Export** — no PDF, no share sheet for library in v1.
- **Web app** — native iOS only. The web view is for quoted persons only, read-only.
- **Dynamic Island integration** — considered, deferred. Lock screen widget is v1.
- **Action Button integration** — considered, deferred.

---

## Acceptance Criteria

### AC-01 — Lock Screen Widget
- [ ] Widget appears on iOS lock screen after installation and configuration
- [ ] Tapping widget opens capture screen in under 1 second
- [ ] Capture screen opens directly — no splash screen, no home screen, no navigation bar
- [ ] Cursor is focused in quote field on open (not name field)

### AC-02 — Quote Field Entry
- [ ] Opening `"` is pre-inserted in quote field on screen open
- [ ] On save, closing `"` is appended to stored quote text
- [ ] If user manually typed an opening `"`, system does not double-insert
- [ ] Save button is visible immediately and activates once quote field has at least 1 character
- [ ] Attribution is not required to activate Save

### AC-03 — Who-Chip Behaviour
- [ ] Who-chip appears below quote field on open in dormant state
- [ ] Who-chip activates (border highlights) after 3 words typed or first punctuation character, whichever comes first
- [ ] Tapping who-chip dims the quote field and opens an inline search input
- [ ] Autocomplete draws from iOS Contacts + previously added Questadi Accounts
- [ ] Previously quoted Accounts appear before unquoted contacts
- [ ] Previously quoted Accounts show "last quoted N days ago"
- [ ] Maximum 4 results visible without scrolling
- [ ] Unknown contact option "+ Add '[name]'" always appears as last result
- [ ] On selection, who-chip resolves to "— [Full Name]" and quote field un-dims
- [ ] If who-chip is never tapped, quote saves with attributed_to = null

### AC-04 — Save and Return
- [ ] Tapping Save triggers haptic feedback
- [ ] App returns to lock screen within 500ms of save
- [ ] No confirmation screen or modal is shown
- [ ] Quote appears in library immediately on next app open
- [ ] On network failure: input is retained, error is shown inline, retry is available

### AC-05 — Unknown Contact and Unattributed Quotes
- [ ] Unknown contact can be added with first name only via "+ Add" option in who-chip autocomplete
- [ ] Unknown contact is saved to Questadi Accounts (not pushed to iOS Contacts)
- [ ] Quote saves successfully with unknown contact
- [ ] Quote saves successfully with no attribution (attributed_to = null)
- [ ] Unattributed quotes appear in library under a dedicated "unattributed" group
- [ ] Attribution can be added to an unattributed quote from the library view
- [ ] No SMS is sent when quoted Account has no phone number
- [ ] No SMS is sent for unattributed quotes
- [ ] No error is shown to capturer when no SMS is sent

### AC-06 — Library View
- [ ] Default view shows list of people, sorted by most recently quoted
- [ ] Each person row shows: initials avatar, name, quote count, last quote preview
- [ ] Tapping person shows all their quotes, reverse chronological
- [ ] Long press on quote reveals delete option
- [ ] Delete triggers soft delete with 5-second undo toast
- [ ] Deleted quote disappears immediately from all views

### AC-07 — SMS Notification
- [ ] SMS is sent within 60 seconds of a successful save
- [ ] SMS is only sent when Person has a phone number
- [ ] SMS text matches the approved template exactly
- [ ] SMS contains a tokenized web link
- [ ] No more than 3 SMS sent to same person in 24 hours

### AC-08 — Quoted Person Web View
- [ ] Web link opens without requiring account creation or login
- [ ] Web view shows: quote text, capturer first name, date captured
- [ ] "Make this public" toggle is visible and functional
- [ ] Tapping "Make this public" shows confirmation dialog before committing
- [ ] On confirmation, quote.is_public is set to true
- [ ] "Request removal" option is visible and sends notification to capturer
- [ ] Web link expires after 30 days and shows graceful expiry message

### AC-09 — Privacy
- [ ] All quotes are private by default (is_public = false)
- [ ] A quote attributed to Account A is not visible to Account B in any view
- [ ] Quoted person web view only shows quotes attributed to that person
- [ ] Web link token is single-use per notification (cannot be guessed or enumerated)
- [ ] Deleted quotes are not accessible via web link

### AC-10 — Authentication
- [ ] Capturer authenticates via SMS OTP on first launch
- [ ] Session persists across app launches
- [ ] No password is required at any point
- [ ] Quoted person does not require authentication to view their quote via web link

### AC-11 — Account Promotion (unregistered to registered)
- [ ] When a quoted person installs Questadi and authenticates with the same phone number, their existing unregistered Account is promoted in place — no new Account is created
- [ ] All quotes attributed to that phone number are immediately visible in their library after registration
- [ ] Their display_name and avatar_initials are preserved from what the capturer entered, and can be updated after registration
- [ ] No capturer is notified when a quoted person registers

---

## Open Questions

These are unresolved decisions that will require a choice before implementation begins.

1. **Backend stack** — not specified. Node/Express, Django, or serverless (e.g. Supabase) are all viable. Choose based on team familiarity.
2. **SMS provider** — Twilio assumed. Confirm number provisioning and rate limits for SMS OTP + notification on same account.
3. **Web view hosting** — tokenized web view can be a simple SSR page (Next.js) or a static page with a client-side token fetch. Decide based on SEO needs (none in v1) and hosting simplicity.
4. **Contact permission fallback** — if capturer denies iOS Contacts permission, autocomplete falls back to Questadi-only Accounts. Define the empty state prompt copy.
5. **Quote deduplication window** — currently 60 seconds. Validate this feels right in real use (bar environment, fast conversation).
6. **Multi-capturer identity resolution** — if two capturers both quote "Marc" but one has his phone number and one does not, they reference different Account records. Decide whether to attempt phone-based merge on the server or leave them as distinct entries.

---

*Questadi v1.0 — last updated May 2026*
*Status: Ready for implementation*

---

## Domain Concept Identification

### Existing Concepts (from codebase)

This is a fully greenfield project — no codebase exists yet. There are no existing tables, classes, or type definitions to reference. All concepts below are new.

### New Concepts Required

- **Account**: The unified identity entity for all system participants, differentiated by `registered` boolean. Serves as both the Capturer (registered, can create quotes) and the Quoted Person (may be unregistered, receives SMS). The same Account can hold both roles across different quotes. Central to the entire system — every other entity references Account.

- **Quote**: The core content unit. Belongs exclusively to a Capturer (`captured_by`), optionally attributed to a Quoted Person (`attributed_to`). Immutable after save in v1. Carries privacy state (`is_public`) that only the quoted person can elevate. Supports soft-delete with a hard-delete horizon.

- **Notification**: Tracks SMS dispatch lifecycle per quote-recipient pair. Decouples the "trigger to send" from the "sent confirmation." Enables rate-limit enforcement (max 3/24h per recipient) and delivery auditing. In v1, channel is always `sms`.

- **WebToken**: A cryptographically random, short-lived (30-day) credential that authorizes unauthenticated access to a specific quoted person's quote via the web view. Bound to a Notification record to enforce the "single-use per notification" semantic. Not explicitly modeled in the data schema as presented, but implied by the Privacy Model and AC-09. Must be introduced as a first-class entity.

- **CaptureSession** (iOS-side): The ephemeral UI state of the capture screen — who-chip activation, autocomplete results, quote field content. Lives in app memory only; not persisted to backend. Terminates on save or app dismissal.

- **ContactResolution** (iOS-side): The merge strategy that combines CNContactStore contacts with Questadi Accounts for autocomplete. Purely client-side; no server roundtrip needed for autocomplete rendering. Resolution key is phone number (E.164 normalized).

### Key Business Rules

- **Registration gate**: Only registered Accounts can appear as `captured_by` on a Quote. Unregistered Accounts can only be `attributed_to`.
- **Attribution is optional**: A Quote may have `attributed_to = null`; it is valid and useful (unattributed group in library).
- **Privacy default**: All Quotes are `is_public = false` at creation. Only the `attributed_to` Account can set `is_public = true`, via web view confirmation.
- **Immutability**: Quote text cannot be edited after save in v1. Attribution can be added to an unattributed quote from the library (the only permitted post-save mutation besides delete).
- **Soft delete semantics**: `deleted_at` timestamp marks deletion; hard delete is automatic after 30 days. Deleted quotes must not be accessible via web link.
- **SMS rate limit**: Maximum 3 SMS per recipient Account per 24-hour window. Enforced server-side.
- **Deduplication**: Same `captured_by` + `attributed_to` + `text` within 60 seconds → silently deduplicate (return success without creating a second Quote).
- **Account promotion atomicity**: When a quoted person authenticates with a phone number that matches an existing unregistered Account, that Account is promoted in-place (no new Account created, no merge). Must be atomic to prevent race conditions.
- **Unknown contacts stay in Questadi**: Contacts added via "+ Add" are stored as unregistered Questadi Accounts only — not written back to iOS Contacts.
- **WebToken scope**: A WebToken is scoped to a specific Notification (one SMS delivery). The quoted person can view any quote attributed to them, but a given token is tied to the notification that delivered it, not to all their quotes.

---

## Strategic Approach

### Solution Direction

- The system is a three-tier product: **iOS native app** (SwiftUI + WidgetKit) for capture and library; **backend REST API** (stack TBD, relational DB) for persistence, business rules, SMS dispatch, and token management; **web view** (SSR or static) for the quoted-person read-only experience.
- The data model is relational and straightforward — Account, Quote, Notification, and a WebToken table form the complete backend schema. Referential integrity and soft-delete patterns map cleanly to PostgreSQL.
- The iOS app is the primary UX surface and must optimize for sub-10-second capture from lock screen. The backend is authoritative for all persistence; the app has no local database in v1 (network required for save).
- The web view is a lightweight, stateless consumer of the backend — it resolves a token, fetches quote data, and renders. No session, no auth cookies.

### Key Design Decisions

- **WebToken as first-class entity**: The spec describes tokens implicitly (Privacy Model, AC-09), but they need an explicit DB table — `web_tokens` with columns: `id`, `notification_id`, `token` (random 128-bit hex), `expires_at`, `redeemed_at` (nullable). The "single-use" semantic is resolved by the interpretation: token remains readable for 30 days but is invalidated (or marked redeemed) on first use, whichever comes first. The REASONS Canvas phase must decide between burn-on-read vs. expiry-only — see Risk section.
  → **Recommendation**: Use expiry-only (30 days) with no burn-on-read, because burn-on-read breaks multi-device access (quoted person opens on phone, then tries on laptop). Document this as a deliberate product choice, not an oversight.

- **Account creation via phone upsert**: When a Capturer saves a Quote attributed to a phone number, the backend should upsert on `phone` (E.164) — if an Account with that phone exists, link to it; if not, create one. This prevents the multi-capturer duplication problem (Open Question #6) from the start and costs nothing architecturally. Accounts without a phone number (unknown contacts, cafe strangers) are always created as new, isolated entries.
  → **Recommendation**: Implement phone-based upsert on Account creation from day one. Do not defer.

- **SMS OTP vs. notification — same or separate Twilio number**: Using the same number for auth OTP and quote notifications risks user confusion. OTPs and notifications have very different message shapes and urgency.
  → **Recommendation**: Use a single Twilio number for v1 (cost/simplicity), but differentiate message formatting clearly. Revisit in v2 if user confusion is reported.

- **Backend stack selection**: The requirements leave this open. Given the simple relational model, SMS integration (Twilio SDK), and need for SSR web view, **Node.js + Express (or Fastify) + PostgreSQL** is the least-friction stack. Supabase is appealing for built-in SMS OTP auth but constrains the custom business logic (rate limiting, dedup, token generation) to serverless functions, which adds operational complexity.
  → **Recommendation**: Node.js + PostgreSQL. Keeps business logic in one place, full control over SMS OTP flow, straightforward Twilio integration. Defer Supabase evaluation to v2.

- **Web view hosting**: SSR (Next.js) vs. static + client-side fetch. Since there are no SEO requirements and the page is token-gated anyway, a static page with a client-side API call is simpler and cheaper.
  → **Recommendation**: Static HTML + vanilla JS or minimal React, hosted on a CDN. The backend exposes a `/web/token/:token` endpoint that returns quote data. Keeps the web view decoupled from the API server.

- **Offline save / retry queue on iOS**: The spec says "on network failure: retain input, show inline error, retry button." If the user dismisses the capture screen before retrying, the unsaved quote is lost. A local SQLite queue (not a full local DB) would mitigate this, but it adds complexity.
  → **Recommendation**: v1 scope is inline retry only (no persistent queue). Document the loss-on-dismiss behavior in the spec as a known limitation. Implement persistent queue in v2 if user feedback surfaces this pain point.

### Alternatives Considered

- **Local-first / offline-first with sync**: Would allow capture without network, but requires a sync engine and conflict resolution — far exceeds v1 scope and undermines the "save returns to lock screen in 500ms" SLA (save would be local and async sync would handle the backend).
- **Supabase as backend**: Built-in auth, DB, and edge functions are attractive. Rejected because custom business rules (SMS OTP with Twilio, rate limiting, dedup, token management) map poorly to Supabase's serverless function model and introduce fragmentation.
- **Burn-on-read WebTokens**: Maximum security, but breaks the user experience when the quoted person opens the link on a second device. Rejected in favor of expiry-only with a 30-day window.

---

## Risk & Gap Analysis

### Requirement Ambiguities

- **"Single-use per notification" token semantics (AC-09, Privacy Model)**: The spec states the token is "single-use per notification" in one place and "expires in 30 days" in another. These are contradictory if "single-use" means burn-on-read (after first view, the link no longer works). If burn-on-read, the quoted person cannot return to the page or view it on a second device. The analysis recommends expiry-only, but this is a product decision that must be made explicitly before implementation.

- **"Request removal" notification channel (Flow 4, step 5)**: The spec says the capturer receives "in-app notification (v2) or email (v1 fallback)." Email is not listed in Scope In. If email is the v1 fallback, it must be scoped in and an email provider (SendGrid, SES) must be chosen. If email is deferred, the "request removal" button in the web view creates a user expectation that is never fulfilled in v1.

- **"Attribution can be added later from the library view" (Flow 3)**: The mechanism is not specified. Is this a tap on the quote that opens an edit-attribution overlay? A long-press action? The interaction design for post-save attribution needs a UX spec before implementation.

- **SMS rate-limit window definition**: "Max 3 SMS per quoted person per 24 hours" — is the 24-hour window a rolling window (last 24 hours from now) or a calendar day (midnight to midnight in which timezone)? Rolling window is more fair and easier to implement correctly.

- **Display name vs. full name precedence**: The Account has both `display_name` (entered by capturer) and `full_name` (set on registration). The who-chip resolves to "— [Full Name]" — but which field? If the quoted person hasn't registered, `full_name` is null. If registered, which takes precedence in the library and who-chip? Needs an explicit display name resolution rule.

- **Session expiry on widget tap**: If the capturer's app session has expired and they tap the lock screen widget, what happens? Block and force re-authentication before capture? Or allow capture and defer authentication to save time? The capture UX priority (under 10 seconds) implies the latter, but auth-first is more secure.

### Edge Cases

- **Concurrent Account creation for same phone number**: Two capturers quote "Marc +33612345678" within milliseconds of each other. Without a DB-level unique constraint on `phone` + upsert logic, two unregistered Accounts are created. When Marc registers, which Account gets promoted? Requires a unique constraint on `phone` and an atomic upsert on Account creation.

- **Capturer quotes themselves**: `captured_by == attributed_to`. No rule prohibits this. The SMS would be sent to the capturer themselves ("You just captured something you said"). Probably fine, but should be explicitly acknowledged.

- **Quoted person's phone number changes**: Their unregistered Account holds the old phone. When they register with a new phone, no match is found and a new registered Account is created. Their historical quotes are not linked. This is a known limitation of phone-number-based identity resolution — document it.

- **SMS delivery failure and retry**: The Notification record has `delivery_status` with a `failed` state, but no retry logic is specified. If Twilio returns a delivery failure, is there automatic retry? How many times? After what backoff? Not specified.

- **Quote is soft-deleted while `is_public = true`**: The capturer soft-deletes a quote that the quoted person previously made public. The quote's `deleted_at` is set, but `is_public` remains true. In v1 there's no visible effect, but in v2 (public feeds, gifting), a soft-deleted public quote could surface unexpectedly. Recommend: filter by `deleted_at IS NULL` in all public-facing queries from day one.

- **Closing `"` double-insertion**: The spec guards against double-inserting the opening `"` (if user typed it manually), but does not explicitly guard against double-inserting the closing `"` on save. If the user typed a closing `"` manually, the saved text would end in `""`. Should apply the same guard logic to the closing quote.

- **Widget open when not authenticated (session expired)**: Not addressed. Must define: does the app require re-auth before the capture screen is shown, or does it capture first and require auth at save time?

- **50 0-char quote field with opening `"` pre-inserted**: The 500-char max is enforced at the backend (and silently in the UI). But the opening `"` is pre-inserted — does it count toward the 500 chars? Probably yes, leaving 499 usable characters. Minor but should be consistent.

### Technical Risks

- **WidgetKit interactivity limits (iOS 16 vs. 17+)**: In iOS 16, WidgetKit supports URL-based deep links but not interactive controls within the widget. The "tap to open capture screen" pattern works via a `Link` in the widget view. However, sub-1-second open time (AC-01) requires the app to be already resident in memory or launch quickly. Cold launch from a widget tap typically takes 1–2 seconds on older devices. This AC may not be reliably achievable on all supported hardware and iOS versions — needs testing.

- **Concurrent Account promotion race condition**: If the quoted person taps the registration flow twice rapidly (or two devices attempt OTP simultaneously), two simultaneous promotion attempts could create a duplicate registered Account. Requires a DB-level unique constraint on `phone` and transaction isolation (SELECT FOR UPDATE or equivalent) on the promotion path.

- **SMS OTP + notification on same Twilio number**: Twilio has per-number throughput limits (typically 1 SMS/second for long codes). If the app grows, quote notification SMS could be throttled. Recommend designing the SMS dispatch to use Twilio Messaging Services (pool of numbers) from the start, not a single hardcoded number.

- **Token security — guessability**: AC-09 requires the token cannot be "guessed or enumerated." This mandates cryptographically random token generation (e.g., `crypto.randomBytes(32).toString('hex')` in Node.js, yielding 256 bits of entropy). Using sequential IDs, timestamps, or short UUIDs would violate this requirement.

- **Network dependency at save time**: The iOS app has no local persistence queue in the v1 recommendation. A network failure at save time means the user must retry manually or lose the capture. In a bar/social environment (the core use case), network reliability is lower than average. This is a deliberate trade-off but represents real user experience risk for the primary flow.

- **CNContactStore permission denial**: If the user denies contacts permission, autocomplete falls back to Questadi-only Accounts. For a new user with no captured quotes yet, this means an empty autocomplete with only the "+ Add" option. The empty state UX (what prompt copy appears?) is unspecified (Open Question #4) and could discourage attribution, reducing product value.

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps / Notes |
|-----|-------------|--------------|--------------|
| AC-01 | Lock Screen Widget | Partial | Sub-1-second open time may not be achievable on all hardware; requires cold-launch optimization and testing |
| AC-02 | Quote Field Entry | Yes | Auto-quote formatting logic is well-defined; closing `"` double-insertion guard not explicitly specified |
| AC-03 | Who-Chip Behaviour | Yes | Autocomplete merge (Contacts + Questadi Accounts) needs explicit sort/ranking algorithm; display_name vs. full_name precedence unresolved |
| AC-04 | Save and Return | Partial | Offline queue behavior on app dismissal not specified; 500ms return SLA requires careful measurement |
| AC-05 | Unknown Contact & Unattributed | Yes | Well-defined; "add attribution from library" UX mechanism needs design spec |
| AC-06 | Library View | Yes | "Add attribution from library" interaction not UX-specified |
| AC-07 | SMS Notification | Partial | 24-hour rate limit window (rolling vs. calendar day) undefined; Twilio retry logic not specified |
| AC-08 | Quoted Person Web View | Partial | "Single-use" token semantic ambiguous (burn-on-read vs. expiry-only); "Request removal" email channel not in Scope In |
| AC-09 | Privacy | Partial | "Single-use" token definition must be resolved; token entropy/format must be specified |
| AC-10 | Authentication | Yes | Session persistence strategy (JWT, cookie, keychain) to be defined in backend design |
| AC-11 | Account Promotion | Partial | Race condition on concurrent Account creation for same phone requires DB-level unique constraint |
