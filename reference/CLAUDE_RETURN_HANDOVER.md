# MIA workspace build handover, return document

Prepared for Leif Boyd, Partners Mortgage
September 18, 2026 | Returns against specification version 1

---

## Purpose of this document

Specification version 1 was handed to Claude, which built the milestone one synthetic screens. This document returns what was decided, what was built, and the conventions the build now follows, so that continued work on the Mia workflow matches the existing format rather than diverging from it.

Where this document and specification version 1 disagree, this document is the current state. Several recommendations in version 1 were reviewed with the user and deliberately changed. Those changes are listed and reasoned below rather than silently applied.

---

## Decisions closed since specification version 1

### 1. Frontend approach: single file HTML, not React

Version 1 recommended TypeScript and React. The user chose single file HTML, consistent with the existing Partners Mortgage internal tool suite (Social Studio, Realtor Radar, Flyer Studio, Partners Academy, roughly twenty deployed tools).

Reasoning accepted: the foundation that matters here is the data model, the state machine and the API boundary, not the framework. A build step adds provisioning friction before the cloud decisions close, and breaks the property that a file can be emailed and opened. Migration to React later is a mechanical port of screens that already have clean data boundaries.

### 2. GitHub Pages hosting is acceptable for the static files

Version 1 stated the borrower portal must not deploy on GitHub Pages. The user rejected this and was substantially correct. If the HTML carries no secrets and every record and document sits behind authentication and row level authorization, the origin serving static assets is not where the risk lives.

Two caveats remain valid and were accepted:

- GitHub Pages cannot set HTTP headers. No CSP, no `Cache-Control: no-store`, no frame controls. For the screen that renders a borrower tax document this matters. Recommendation: serve the borrower portal from a host that allows header configuration, and keep Pages for internal staff tools. This is a hosting split, not an architecture change.
- Browser direct database access means authorization rules become the entire security layer. They must be written against the loan assignment model and tested with real tooling, not eyeballed.

### 3. Backend: Supabase recommended over Firebase, not yet ratified

Version 1 assumed Firebase. Recommendation changed to Supabase for this application specifically. The user has not yet confirmed.

Reasoning:

- The core relationships are many to many. A document satisfies several conditions, a condition needs several documents, a receipt event links condition, component and document version. This is a join table in Postgres and hand maintained denormalized arrays in Firestore.
- Versioned checklist snapshots with optimistic concurrency want real multi row transactions.
- The audit requirement is decisive. Version 1 itself notes Firestore does not make logs immutable against administrators. In Postgres, an append only events table with UPDATE and DELETE revoked from every application role is a control a security reviewer can read and verify. Firestore rules cannot express it.

Retained regardless of choice: the existing Cloudflare Worker gateway remains the AI provider gateway so no provider key ever reaches the browser.

### 4. GHL is the loan status source, corrected

Version 1 treated GHL as unsuitable for current loan state. The user corrected this: ARIVE already syncs into GHL, and GHL is where client communication originates. This removes the ARIVE integration dependency for the milestone view.

Confirmed data model:

- GHL **opportunity** equals one loan. The portal loan record stores the opportunity ID as its external mapping.
- GHL **contact** equals the person. One contact, many opportunities.
- Status reads per opportunity, so a later transaction never overwrites an earlier one.
- Checklist snapshots push back keyed to the opportunity, not the contact. This resolves the concern in version 1 that a single active summary field on a contact cannot represent two loans.

Direction of flow: status in from GHL, approved checklist snapshots out to GHL. Conditions and documents remain owned by the portal, which is authoritative for them.

### 5. Product shape: one portal scoped per borrower, not one per client

Clarified with the user. There is one deployed borrower portal. Every borrower gets an account and an authenticated session that returns only the loans they are granted. Uniqueness comes from data and loan officer identity, not from separate builds. At roughly 79 loan officers with active pipelines, a per client deployment model would be unmaintainable.

### 6. File layout: two entry files

- `mia-staff.html` carries work queue, loan workspace and administration. Administration is a capability on a membership record, not a separate audience.
- `mia-portal.html` is separate and stays separate permanently. Different identity path, different step up rules, deployable to its own origin. The structural benefit is that borrower code contains no staff queries at all. Not hidden, not permission gated. Absent.

### 7. Brand: Mia leads the internal workspace

Initially built Partners forward. The user changed it to Mia forward after review. Both files now lead with the Mia identity, with Partners Mortgage present as the parent.

### 8. Expanded scope: borrower portal is a full loan view

The user identified a larger opportunity than version 1 described. The portal is not only a conditions checklist. It is the borrower's view of their loan: where everything stands, what the next steps are, and communication from their loan officer.

Added: real estate agent access, built as a narrow separate read model. Agent sees milestone, estimated closing date and a contact button. Agent never sees documents, conditions, income, credit, amounts or messages. Borrower grants it explicitly, sees exactly what will be shared before granting, and can revoke. Access expires at closing. Every agent view is logged.

This should be implemented as its own projection rather than a permission flag on the borrower view, so that a future field added to the borrower page cannot leak onto the agent page.

---

## What is built

Two self contained HTML files, no build step, no dependencies beyond web fonts. Both pass a Playwright regression run with no console errors.

### `mia-staff.html`

| Area | State |
| --- | --- |
| Work queue, filters, failure states | Working. Failures shown as themselves, never summarized as complete. |
| Loan workspace, six tabs | Working. Overview, Conditions, Documents, Income, Communication, Activity. |
| Conditions review, two pane | Working. Source pane with page navigation, zoom and evidence highlight. Selecting a condition navigates to its source page and highlights its lines. |
| Source A fixture | Working. 26 conditions, 8 borrower actionable, 1 on hold, 17 internal or third party. Condition 15 spans both pages and is preserved. |
| Four dimension state model | Working. Review, collection, underwriting and document processing are independent. No combined done flag exists anywhere in the code. |
| Version approval gate | Working. Blocks on unreviewed conditions, missing coverage confirmation, or missing release capability. |
| Gift letter cycle | Working. Report, verify and correction each change only their own dimension. Clearance stays not assessed throughout. Correction reopens only the missing component. |
| Income worksheets | Working. All four arithmetic fixtures compute exactly. Undocumented hours blocks rather than assuming 40. Overtime and bonus extracted and visibly excluded. |
| Email and SMS preview | Working. Built from the approved snapshot, Mia signature per brand guidelines. |
| Administration | Working as UI. Membership, invitations, provider configuration, outbound kill switch and AI pause as independent controls. |
| Build status page | Working. Lists what is working, simulated and not implemented, mapped to acceptance tests. |
| Identity selector | Simulated. A demo label carrying no authority. |
| Backend, upload, scan, OCR, dispatch, persistence | Not implemented. State is in memory and resets on reload. |

Demo identity default: Jonathan Karabinus, Production Partner.

### `mia-portal.html`

| Area | State |
| --- | --- |
| Sign in | Simulated two step. Copy states the link is single use and expiring, and that no SSN or account number is used as a password. |
| Multiple loans per borrower | Working. Two opportunities under one login, each reading its own status. Demonstrates the repeat client case. |
| Milestone track | Working with placeholder stage names, pending real ARIVE stage language. |
| Checklist | Working. All six required borrower labels in use. Upload moves an item to processing then awaiting review, never to received. |
| Received styling | Working. Strikethrough plus a visible text label, because strikethrough alone is not accessible. |
| Correction display | Working. Shows only the missing component, not a request to resend everything. |
| Document folders | Working. Empty categories shown rather than hidden. |
| Loan officer identity block | Working. Loan officer named above Mia, with Mia's texting number and AI disclosure. |
| Agent sharing | Consent screen built and working. Shows exactly what will and will not be shared. Backend not implemented. |
| Real upload, send, persistence | Not implemented. |

Contains no staff queries, no lender notes, no internal conditions and no income calculations.

---

## Conventions the build follows

Anything added to the Mia workflow should match these, since they are now load bearing rather than cosmetic.

### State model

Never introduce a single done flag. The four dimensions stay independent:

| Dimension | Values |
| --- | --- |
| Review | draft, needs review, reviewed, released, superseded |
| Collection | needed, waiting, borrower reported, uploaded, correction needed, staff received |
| Underwriting | not assessed, submitted for review, cleared, waived |
| Document processing | quarantined, scanning, blocked, extracting, ready for review, failed |

Rules enforced in code and to be preserved: a reported upload is not verified receipt, verified receipt is not underwriting clearance, and any receipt change or condition edit supersedes the approved version and says so in the activity log.

### Labeling of unbuilt capability

Simulated and unimplemented features are shown disabled with a stated reason rather than hidden. Every screen carries a synthetic marker. A dedicated build status page exists so nothing can be mistaken for a live capability. Continue this. It is the main defense against a demo being read as a shipped system.

### Visual system

- Mia palette: teal `#00818D`, deep pine `#173F3D`, pale gold `#F6CD80`, white. Pine leads the chrome, teal carries actions, gold appears sparingly as an accent only.
- Partners palette available for parent brand context: warm gray `#8A7E78`, cream `#FBF7F1`, ink `#1F2A2D`.
- Typography: Barlow for interface, title case headings, no all capital paragraphs. Lora italic reserved for "You matter." Arial in email and SMS templates per the Mia guidelines.
- Logos are base64 embedded, never recreated as SVG paths. Reverse white lockup on pine, color lockup on white, accent free icon for compact use and favicon.
- Operational density for staff screens, warmer and simpler for borrower screens. Two distinct tiers, deliberately.
- No em dashes in any copy.
- Footer on every page: "You matter." plus entity, address, NMLS #236669, DRE #01845041, licensing line and Equal Housing Lender.

### Copy rules

Borrower facing wording follows the Mia voice guidance: acknowledge before explaining, specific document names, one next step at a time, no promised outcomes or timing the team has not confirmed, and always an easy route to the loan officer. Original lender wording is preserved and never replaced by the borrower rewrite.

---

## Open items that block production features

Unchanged from version 1 unless noted:

1. Backend platform ratification, Supabase or Firebase.
2. Cloud project ownership, billing, region and custom domains.
3. Staff identity route and MFA. Borrower identity and step up policy.
4. Whether this becomes an approved document system of record or an intake layer handing off to ARIVE.
5. Retention, legal hold and deletion policy. Currently unwritten and shown as such in the administration screen.
6. Approved AI vendor, endpoint, region and retention arrangement.
7. GHL credentials and scopes, approved senders, consent records and reminder cadence.
8. ARIVE milestone stage names as they appear on the GHL opportunity. Needed to replace placeholder milestone labels.
9. Whether agent access is invited by the borrower or by the loan officer. Determines who owns the consent record.
10. Lender and investor income rule profiles, and which staff may approve calculations.

---

## Suggested next work

In order, matching the format already built:

1. Agent view as its own file or route, reading the narrow projection only.
2. Backend schema written against the data model in specification version 1, with the append only audit table and the authorization policies as first class deliverables rather than an afterthought.
3. Real document upload path with quarantine, scan and a clean version, replacing the fixture inventory.
4. Provider adapter for `extractConditions` and `extractIncomeFacts`, with parsing, policy and calculation kept outside provider specific code.
5. Outbox and GHL integration, one allowlisted synthetic contact first, with the kill switch already present in administration wired to it.

The two HTML files are behavioral and visual reference for all of the above. Build additions to match them rather than introducing a second design language.
