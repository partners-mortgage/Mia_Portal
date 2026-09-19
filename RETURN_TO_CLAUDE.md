# Return handover to Claude

September 18, 2026, integrated local beta increment 2

Continue from this package, not the original independent two-file fixtures. Preserve Mia branding and the separate staff/borrower entry pages. Supporting scripts now connect them through a local API; keep that boundary when adjusting the UI. Original embedded logos are retained.

Leif confirmed Supabase. The supplied gateway contract still contains a placeholder URL and no authentication. No live inference or cloud deployment has occurred. See `ARCHITECTURE_AND_REVIEW.md` for the target protected API and the auth extension that tech must ratify. Never place provider keys or Supabase service-role secrets in HTML, repositories or browser storage.

## Implemented changes to preserve

- Complete approval snapshots and superseded/wrong-loan preview blocking.
- Local server revision checks and minimal borrower projection.
- Contextual Ask Mia dialog on every Ask Mia/help button, labeled local guide until actual inference is connected.
- Real decimal income arithmetic workbench separate from static worksheet cards.
- Real upload and agent sharing disabled pending backend, not simulated success.
- Correct Mia texting number (916) 232-7238, and truthful simulated login language.
- Canary state no longer displayed on unrelated staff loans.

The imported approval is renamed fixture B in the loader and integration banner. It is NOT the original PDF-derived Source A. It has 10 borrower conditions plus one hold, not eight plus one. Preserve both fixtures under separate names in future parser tests.

## Next UI work

1. Keep the “Local guide, not live AI” label until the server returns verified live-ai mode. Do not switch it based on a frontend toggle.
2. Design explanation-letter fact collection, borrower confirmation and staff review screens without inventing facts or simulating signatures.
3. Design pre-approval scenario input/output with explicit missing inputs and LO-only approval, not a borrower self-approval result.
4. Replace remaining milestone-one status copy with actual capability status from a backend endpoint. Old clean-scan, last-sync and staff roles are fixtures.
5. Improve source evidence to use page-specific fragments; current single line-index array is not sufficient for cross-page evidence.

Do not wire the old public unauthenticated `/anthropic` proxy directly into a borrower page. Conversation requests must pass session and per-loan authorization before the backend supplies context. Raw mortgage documents require the separate extraction job service.

## Validation and limits

Run `npm test` and `npm start`, then follow README's staff-to-borrower cycle. SQL is an unapplied draft and requires real PostgreSQL/Supabase tests. Local tests passing is not proof of production authorization, compliance or real AI quality. Keep all demo data synthetic. Do not publish the loopback server as a production service.
