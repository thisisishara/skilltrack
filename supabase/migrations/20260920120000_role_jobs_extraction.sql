-- Role-scoped jobs with LinkedIn extraction fields.
-- job_descriptions was unused; adding NOT NULL role_id is safe on an empty table.

alter table public.job_descriptions
  add column role_id uuid not null references public.roles (id) on delete cascade,
  add column external_id text,
  add column company_url text,
  add column location text,
  add column locations text[] not null default '{}',
  add column seniority_level text,
  add column employment_type text,
  add column job_functions text[] not null default '{}',
  add column industries text[] not null default '{}',
  add column workplace_type text not null default 'unknown',
  add column applicant_count integer,
  add column salary_text text,
  add column compensation jsonb not null default '{}'::jsonb,
  add column posted_relative text,
  add column posted_at_precision text not null default 'unknown',
  add column extraction_method text not null default 'manual',
  add column extracted_at timestamptz,
  add column field_confidence jsonb not null default '{}'::jsonb,
  add column description_html text,
  add column sections jsonb not null default '{}'::jsonb,
  add column extras jsonb not null default '{}'::jsonb;

alter table public.job_descriptions
  add constraint job_descriptions_workplace_type_check
    check (workplace_type in ('on_site', 'hybrid', 'remote', 'unknown')),
  add constraint job_descriptions_posted_at_precision_check
    check (posted_at_precision in ('exact', 'estimated', 'unknown')),
  add constraint job_descriptions_extraction_method_check
    check (extraction_method in ('rules', 'ai', 'mixed', 'manual')),
  add constraint job_descriptions_applicant_count_check
    check (applicant_count is null or applicant_count >= 0);

create index job_descriptions_role_id_captured_at_idx
  on public.job_descriptions (role_id, captured_at desc);

create unique index job_descriptions_role_external_id_uidx
  on public.job_descriptions (role_id, external_id)
  where external_id is not null;

alter table public.job_requirements
  add column source_section text not null default 'other';

alter table public.job_requirements
  add constraint job_requirements_source_section_check
    check (
      source_section in (
        'minimum_qualifications',
        'preferred_qualifications',
        'responsibilities',
        'skills',
        'other'
      )
    );
