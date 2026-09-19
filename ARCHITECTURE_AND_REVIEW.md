# Mia platform: architecture, review and delivery

September 18, 2026 | Local integration increment 2 | Synthetic testing only

## Executive overview

Mia is becoming a loan-team operating workspace with a borrower portal, not merely a chatbot. Keep Claude's two branded entry pages. Use Supabase for identity, relational records and private storage, a protected application API for actions, and the Partners Cloudflare gateway for conversational inference after its security contract is completed. Use separate background jobs for document extraction. GHL remains the communication system and the opportunity-level source for synced loan milestones; the portal owns conditions, evidence, receipts and released checklist versions.

Leif explicitly confirmed Supabase in this task. The reported ARIVE-to-GHL integration is accepted as the intended upstream route, but its fields, latency and opportunity mappings have not been verified against a live integration here.

## What this increment actually built

| Area | Implemented now | Still missing |
|---|---|---|
| Branded pages | Both imported into `mia-platform/public`; original files preserved | Hosted application and real identities |
| Checklist release | Full deep-copied staff snapshot; separate allowlisted borrower projection; version checks | Transactional database release and durable audit |
| Cross-page workflow | Staff release reaches borrower page through the same local API | Supabase integration, multi-user conflict resolution |
| Ask Mia | All three button types work; selected-item context, stale revision rejection, explicit local-guide label | Real gateway endpoint, verified session and loan scope, inference evals |
| Receipt truthfulness | Reports do not become scanning or verified receipts; changes invalidate local shared release | Actual documents, component review, receipt evidence and durable actions |
| Loan separation | Other staff fixture loans cannot show Canary documents/conditions/income; other borrower loan cannot query Canary Ask Mia | Real row-level policies and per-borrower component permissions |
| Income | Tested decimal base-income engine and usable staff arithmetic workbench | Extraction, evidence capture, program rules, signed-off version history |
| Supabase | Initial default-deny schema and borrower projection policy draft | Deployment, SQL/RLS tests, all command APIs and storage policies |
| Gateway | Bounded response adapter tested with mock; no browser provider credentials | Real health check, authentication extension, quotas and deployment |

Local state is not durable. No real documents are accepted. No outbound message was sent. The existing GHL Mia configuration is unchanged by this task.

## Findings in the returned build

1. **Snapshot was not a snapshot.** It stored label, count and approver, while email read mutable current conditions. Fixed locally by storing full conditions and an independent borrower subset, then blocking superseded or wrong-loan previews.
2. **Global staff state could follow the selected loan.** Conditions and document fixtures were global rather than scoped repositories. The local patch blocks unsupported loans instead of reusing Canary records. Production needs database authorization, not this UI guard.
3. **Ask Mia controls had no handlers.** They now open a contextual, accessible dialog and call a local API. Answers are deliberately labeled local guide, not model inference.
4. **Independent borrower fixture did not match staff.** Removed it from the connected mode. The portal starts with no releasable checklist and only renders the shared release.
5. **Fixture provenance was inaccurate.** The returned Source A is rewritten synthetic content, not the original approved fixture. Actual count is 10 borrower conditions, one unresolved hold and 15 internal/third-party conditions. The original test was eight, one and seventeen. Call this Claude fixture B. Do not use it to measure PDF parser accuracy.
6. **Cross-page evidence highlighting needs rebuilding.** A single line-index list is reused across different pages; it cannot reliably identify each page's evidence. Store `{page, startLine, endLine}` or OCR boxes per fragment and validate against immutable source versions. No original lender source should be replaced by a synthetic page.
7. **Borrower report set scanning with no file.** Removed locally. A report can pause collection but cannot create scan or receipt evidence.
8. **Upload/share controls simulated success.** Disabled in connected mode until real upload/consent APIs exist. The prior UI state change was not a real consent record or upload.
9. **Mia number used the test borrower's phone.** Corrected Mia's number to (916) 232-7238 in the connected portal and staff signature. Assigned loan-officer contact details remain fixture values and must be replaced by validated staff records before deployment.
10. **Income cards were hardcoded.** Added a separate actual calculation module and workbench. Do not sum the fixture cards; some demonstrate alternative pay frequencies for the same employer.
11. **Simulated login copy claimed a code had been sent.** Corrected to explicitly state no code was sent and no authentication occurred.
12. **Production claims require verification.** “Append only,” “clean scan,” “last sync,” role selection, membership administration, step-up verification and accessibility completion remain prototype representations unless their backend and tests exist. The original Build Status page is historical milestone-one content; this report is the current implementation status.

## Target architecture

```text
Staff HTML                  Borrower HTML              Agent view (future)
     |                           |                           |
     +--------------- Verified session ---------------------+
                                 |
                  Mia application API / authorization
                  tenant + loan + borrower component scope
                      /          |            \
         Supabase Postgres   Private storage   Ask Mia service
         versions + events   quarantine first    |
                |                 |          Cloudflare gateway
         transactional outbox     |          approved AI provider
                |          scan -> extraction jobs
               GHL         -> validated facts -> staff review
                |
         SMS/email delivery and reconciliation

GHL opportunity milestones -> validated, timestamped loan projection
```

### Systems of record

- One portal loan maps to one GHL opportunity, with location and opportunity ID together unique. A contact can map to multiple loans; never use contact's “active loan summary” as the only identity.
- GHL milestone projection stores source timestamp, received timestamp, revision and sync error. A stale projection is visibly stale, not “current.” Define acceptable age with operations.
- Portal owns source-document versions, extracted candidates, components, receipt evidence, checklist releases, borrower-visible needs, worksheets, explanation drafts and audit events.
- Staff-only original conditions and full releases never become browser-accessible borrower records. Publish a minimal projection for each authorized borrower. Co-borrowers do not automatically gain access to each other's tax or employment documents.
- GHL owns sent-message IDs and delivery outcomes. Portal outbox owns approved version, recipient, channel, consent and idempotency. Provider accepted is not delivered.

## Supabase implementation order

1. Create a separate staging project under company ownership. Confirm region, billing, custom origins and backup owner. No real data until security review.
2. Configure staff identity with the selected Microsoft 365 route and MFA. A verified email domain may create a pending membership, not loan access. Borrowers use an approved invite and verification flow with documented session and step-up requirements.
3. Apply reviewed migrations. Initial draft includes organizations, memberships, loans, grants, conditions, versions, invalidations, borrower projections, documents, component links, audit events and outbox.
4. Implement command transactions for release, report, receipt, correction and revoke. Lock the loan revision, check expected version and capabilities, write the event and new projection/outbox atomically. Do not accept browser-supplied approver identity or approved snapshot as authority.
5. Add RLS allow/deny tests for anonymous, revoked, unassigned staff, borrower A versus borrower B, another organization, superseded versions and guessed object keys. Test service-role paths separately because service-role privileges bypass RLS.
6. Create private quarantine and clean storage buckets. Issue constrained upload authorizations only after loan grant checks. Scan before preview/OCR; bind hash, object, owner, document version and condition component. Downloads require authorization and short-lived access; never public permanent links.
7. Configure retention, legal hold, logs without raw documents/tokens, incident response and restore testing. Audit update/delete revocation protects application roles, not the database owner. Add independent log export/integrity monitoring as required. Supabase is not automatically a mortgage-compliance certification.

The SQL supplied is a foundation draft, not a completed backend. Neither Supabase CLI nor PostgreSQL tooling was available in this workspace to execute it. Open gaps include command functions, complete state constraints, cross-loan condition-document link enforcement, extraction jobs, worksheet/version tables, agent grants, outbox dispatch and storage policies. Deploying the draft alone does not enable a secure portal.

References: [Supabase RLS and service-role behavior](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control). These sources informed the deny-by-default design; they do not certify this application.

## Ask Mia and the returned gateway contract

The supplied address `https://pm-gateway.<account>.workers.dev` is not a real deployable endpoint. No health check can establish deployment from that placeholder. The document describes an unauthenticated `/anthropic` proxy using an origin allowlist. It correctly keeps provider keys out of HTML, but origin checks alone do not authorize a user or a loan, and nonbrowser callers can forge an Origin header.

Production route should be `POST /api/loans/{loanId}/mia/messages` with a verified user session. The server derives the permitted borrower projection, not the browser. It checks grant revocation, current checklist version and freshness, conversation ownership, request size, rate/spend quotas and AI pause. Only that authorized context goes to the gateway. The gateway itself needs verified calling-service or session authorization and bounded allowed models/tokens. Do not expose an unrestricted provider proxy to borrowers.

The adapter in this package requires authentication as a proposed extension, so it does NOT claim compatibility with the old “no auth headers” deployment. Tech must supply the actual Worker code and ratify the extension. It preserves the provider request format while requiring keys to remain in backend secret storage. A documented service-binding path is preferable if both services run in Workers. See [Cloudflare best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).

No approval PDFs, paystubs, tax returns or document images go through conversational Ask Mia. Extraction jobs have their own queue, validation, quota, retry and retention controls. Questions and checklist text are untrusted data; the model cannot execute approvals, tasks, callbacks, sends or document-status changes. Output renders as text, not raw model HTML.

Local guide mode presently supports needs lists, item explanations, receipt distinctions, truthful callback handling and blocked underwriting questions. It is a test harness, not a substitute for a model and not an adversarially robust production filter. Before real AI: evaluate prompt injection, cross-loan leakage, stale context, unsupported claims and unsafe financial conclusions with approved synthetic fixtures.

## Roadmap modules

### 1. Conditions and secure intake

Finish the core release/receipt loop before reminders. Every item has original source evidence, borrower wording, scope, assigned owner, components, review, collection, underwriting and processing state. AI drafts candidates; authorized staff releases. Source revisions invalidate old approvals and cannot inherit receipts silently. Upload receipt is separate from document adequacy and underwriting clearance.

### 2. Income preparation

Pipeline: clean document -> extracted facts with page/evidence/confidence -> validated facts -> deterministic rule-profile calculation -> exception queue -> authorized signoff. Keep salary, hourly base, overtime, commission and bonus distinct. The new engine computes only decimal base-pay equivalents; it does not assess stability, history, continuance, variable income or program eligibility. Unknown hours/frequency blocks. Add employment periods, YTD reconciliation, overlapping employers and double-count detection before expanding beyond simple fixtures. Every override needs reason, original value and new review version.

### 3. Letter of explanation generator

Start with staff-selected requests tied to a condition: deposits, inquiries, address history or employment gaps. Gather the borrower's own facts. Generate a draft using only those facts and visible unresolved placeholders; do not invent causes, dates, sources of funds or declarations. Show the evidence and revisions to the borrower for confirmation. A draft is not a signed statement. Record explicit approval before exporting or requesting signature; retain the original answers. No auto-signatures, backdating, invented documents or automatic condition clearance. Sensitive details stay in the portal, not SMS.

### 4. Pre-approval scenario calculator

Separate scenario arithmetic from an approval decision. Inputs: staff-reviewed qualifying-income worksheet, verified debts, proposed price/down payment, loan terms, taxes, insurance, HOA and applicable mortgage insurance. Use approved, versioned program profiles and staff-entered/approved rates rather than model guesses. Output payment breakdown, DTI/LTV arithmetic, assumptions and missing inputs. It must not label a borrower approved or issue a pre-approval letter by itself. Loan-officer authorization and company-approved lending policy are required for any actual pre-approval. Fair-lending/compliance review and test profiles precede rollout.

### 5. GHL orchestration and agent milestones

After secure intake: one allowlisted Canary opportunity, validated recipient and sender, approved consent/cadence, paused status and idempotent outbox. Immediately recheck version and receipt changes before dispatch. Unknown delivery outcomes reconcile rather than blindly retry. Agent access gets a separate read model containing only authorized milestones, estimated closing date and team contact; no conditions, messages, amounts or documents. Consent, expiration, revocation and access logs are backend records, not UI toggles.

## Tests and release gates

Automated local tests cover missing/stale/superseded checklists, item projection, receipt claims, callbacks, underwriting refusal, pause, duplicate IDs, four arithmetic cases, missing evidence/hours/frequency, gateway failure/response format, cross-origin writes, wrong loan, optimistic conflicts and inline-script syntax. These are not Supabase RLS, security-penetration, OCR or actual model-quality tests.

Browser acceptance: staff imports fixture B, marks it explicitly reviewed for the demo, checks coverage, approves and shares. Borrower sees 0 of 10 received and gets a selected gift-letter answer from Ask Mia. No internal conditions are in the borrower projection. Production readiness remains blocked on actual hosted projects, real auth, gateway security, database tests, secure upload pipeline and company review.

## Information needed for next hosted increment

- Actual gateway URL and current Worker source/configuration, without secret values.
- Supabase staging project URL/reference and company deployment owner. Use the normal secret-management process for service credentials; do not paste them into chat or HTML.
- Confirm staff Microsoft identity setup and borrower verification policy before enabling real accounts.

No choice between Firebase and Supabase remains open: Supabase was selected. Branding remains Claude's design system. Additional changes can continue through versioned handovers without rebuilding the visual foundation.
