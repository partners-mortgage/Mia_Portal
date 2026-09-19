# Mia platform, integrated local beta

Updated September 18, 2026. Supabase confirmed by Leif in this task.

The two Claude pages are now the visual foundation, not a replacement design. Original Downloads files are unchanged. Supporting scripts separate the first integration seam from Claude's UI so future handovers can preserve branding.

## Run

Use Node 24 or newer. From this directory:

```sh
npm test
npm start
```

Open http://127.0.0.1:8768/mia-staff.html and http://127.0.0.1:8768/mia-portal.html. The server binds loopback only. Do not deploy this server or these demo identities publicly with real data. It is NOT a secure document portal yet.

## Test the connected flow

1. In staff, open CANARY-BETA-001 and Conditions. Load fictional fixture B.
2. Click **Mark fictional items reviewed**. This is a demo shortcut, not production approval authority. Check coverage and approve the version.
3. Click **Share approved checklist with test portal**. This sends only a local borrower projection to the local server, not to GHL or a contact.
4. In borrower portal, continue through the explicitly simulated sign-in. Refresh the released checklist. The ten requests now match staff's release, not the old independent portal fixture.
5. Click **Ask Mia about this** on an item. The local guide answers using that specific released item. General Ask Mia and help buttons open the same dialog.
6. Ask “I uploaded it” or “Call me.” Neither changes a receipt or claims a notification.
7. In staff Communication, simulate gift-letter receipt. The shared version becomes invalid. Borrower questions using the old revision are rejected. Review, approve and share again to see received styling and the reduced collection list.
8. Open staff Income. The new arithmetic workbench takes fictional amounts and computes a monthly base amount through the local service. Hourly pay without documented hours blocks. The original worksheet cards remain reference fixtures, not extracted documents.

State is in memory, shared between browser tabs. Server restart clears all releases; staff reload clears staff edits. No production login, persistence, upload, scanning, AI inference, GHL sending, background follow-up or actual agent sharing is implemented.

## Files

- `public/mia-staff.html`, `public/mia-portal.html`: imported design with focused corrections.
- `public/staff-link.js`, `public/portal-link.js`, `public/mia-link.css`: local integration and contextual Ask Mia.
- `server.mjs`, `domain.mjs`: loopback synthetic API, revision checks and explicitly non-AI local guide.
- `income.mjs`: deterministic base-pay decimal arithmetic, not lender eligibility policy.
- `gateway-contract.mjs`: tested adapter for a proposed authenticated gateway extension; intentionally NOT enabled. The legacy unauthenticated proxy is not silently used.
- `supabase/001_foundation.sql`: unapplied review draft. No database or RLS tests have been run. Do not treat this as a deploy-ready security implementation.
- `ARCHITECTURE_AND_REVIEW.md`: full review, target architecture, gaps and roadmap.
- `RETURN_TO_CLAUDE.md`: next handover.
- `reference/`: unchanged handover documents received from Claude.

## Safety

There are no provider keys or Supabase service keys in these pages. The API rejects non-loopback Host headers and cross-origin writes, but those checks are NOT authentication. Anyone who can access the local process can use the demo. Only synthetic data belongs here. Real uploads and sharing are disabled rather than pretending they succeeded.

The provider gateway URL supplied by Claude is a placeholder. No call has been made to it. No GHL configuration, workflow or message was changed in this integration task.
