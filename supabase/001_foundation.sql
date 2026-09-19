-- REVIEW DRAFT. Not applied or database-tested. Run only in a new synthetic staging project.
-- Browser roles get no mutation privileges. Transactional command API still required.
begin;
create schema mia_private;
revoke all on schema mia_private from public, anon, authenticated;
create table public.mia_orgs(id uuid primary key default gen_random_uuid(), name text not null);
create table public.mia_memberships(
 org_id uuid references public.mia_orgs, user_id uuid references auth.users,
 active boolean not null default false, capabilities text[] not null default '{}',
 primary key(org_id,user_id));
create table public.mia_loans(
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.mia_orgs,
 ghl_location_id text not null,ghl_opportunity_id text not null,revision bigint not null default 0,
 milestone text,ghl_synced_at timestamptz, unique(org_id,id),unique(ghl_location_id,ghl_opportunity_id));
create table public.mia_loan_grants(
 org_id uuid not null,loan_id uuid not null,user_id uuid not null references auth.users,
 audience text not null check(audience in ('staff','borrower')),active boolean not null default true,
 expires_at timestamptz,primary key(loan_id,user_id),
 foreign key(org_id,loan_id) references public.mia_loans(org_id,id));
create table mia_private.conditions(
 id uuid primary key default gen_random_uuid(),loan_id uuid not null references public.mia_loans,
 source_version uuid not null,source_text text not null,evidence jsonb not null,
 friendly_text text, audience text not null check(audience in ('borrower','internal','third_party','unresolved')),
 review text not null default 'needs_review',collection text not null default 'needed',
 underwriting text not null default 'not_assessed',processing text not null default 'awaiting_upload');
create table mia_private.checklist_versions(
 id uuid primary key default gen_random_uuid(),loan_id uuid not null references public.mia_loans,
 revision bigint not null,full_snapshot jsonb not null,approved_by uuid not null references auth.users,
 approved_at timestamptz not null default now(),unique(loan_id,revision));
create table mia_private.version_invalidations(
 version_id uuid primary key references mia_private.checklist_versions,reason text not null,at timestamptz not null default now());
-- Explicit borrower-specific projection. Never expose full_snapshot to borrowers.
create table public.mia_borrower_checklists(
 loan_id uuid not null references public.mia_loans,user_id uuid not null references auth.users,
 version_id uuid not null references mia_private.checklist_versions,
 items jsonb not null,valid_until timestamptz not null,primary key(loan_id,user_id));
create table mia_private.document_versions(
 id uuid primary key default gen_random_uuid(),loan_id uuid not null references public.mia_loans,
 object_key text not null unique,sha256 text,scan_state text not null default 'quarantined',
 processing_state text not null default 'quarantined',uploader uuid references auth.users,created_at timestamptz not null default now());
create table mia_private.condition_document_links(
 condition_id uuid references mia_private.conditions,document_version_id uuid references mia_private.document_versions,
 component_key text not null,primary key(condition_id,document_version_id,component_key));
create table mia_private.audit_events(
 id bigint generated always as identity primary key,loan_id uuid references public.mia_loans,
 actor uuid references auth.users,action text not null,details jsonb not null default '{}',at timestamptz not null default now());
create table mia_private.outbox(
 id uuid primary key default gen_random_uuid(),loan_id uuid not null references public.mia_loans,
 version_id uuid not null references mia_private.checklist_versions,
 idempotency_key text not null unique,channel text not null check(channel in ('sms','email')),
 state text not null default 'draft',provider_message_id text,approved_recipient_hash text not null);
create function mia_private.deny_mutation() returns trigger language plpgsql as $$
begin raise exception 'Immutable record; append a correction event or a new version'; end; $$;
create trigger immutable_versions before update or delete on mia_private.checklist_versions for each row execute function mia_private.deny_mutation();
create trigger immutable_audit before update or delete on mia_private.audit_events for each row execute function mia_private.deny_mutation();
create function mia_private.has_loan_access(p_loan uuid,p_audience text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.mia_loan_grants g
 where g.loan_id=p_loan and g.user_id=(select auth.uid()) and g.audience=p_audience
 and g.active and (g.expires_at is null or g.expires_at>now())
 and (p_audience='borrower' or exists(select 1 from public.mia_memberships m where m.org_id=g.org_id and m.user_id=g.user_id and m.active)));
$$;
revoke all on function mia_private.has_loan_access(uuid,text) from public;
grant usage on schema mia_private to authenticated;
grant execute on function mia_private.has_loan_access(uuid,text) to authenticated;
alter table public.mia_orgs enable row level security;
alter table public.mia_memberships enable row level security;
alter table public.mia_loans enable row level security;
alter table public.mia_loan_grants enable row level security;
alter table public.mia_borrower_checklists enable row level security;
revoke all on public.mia_orgs,public.mia_memberships,public.mia_loans,public.mia_loan_grants,public.mia_borrower_checklists from anon,authenticated;
grant select on public.mia_borrower_checklists to authenticated;
-- Invalidation check uses a definer function, not direct access to private rows.
create function mia_private.version_current(p_version uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from mia_private.version_invalidations where version_id=p_version);
$$;
revoke all on function mia_private.version_current(uuid) from public;
grant execute on function mia_private.version_current(uuid) to authenticated;
create policy own_released_checklist on public.mia_borrower_checklists for select to authenticated using (
 user_id=(select auth.uid()) and valid_until>now() and mia_private.has_loan_access(loan_id,'borrower') and mia_private.version_current(version_id));
revoke all on all tables in schema mia_private from public,anon,authenticated;
revoke all on all sequences in schema mia_private from public,anon,authenticated;
-- No public storage bucket or object policies are created. Storage remains a separate gate.
-- Before production: grants, RLS tests, constrained API role, transactional release RPC,
-- cross-loan link constraints, MFA/session revocation, retention and recovery exercises.
commit;
