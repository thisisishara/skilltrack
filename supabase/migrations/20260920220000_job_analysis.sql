-- Optional AI rating of a saved job posting.

alter table public.job_descriptions
  add column analysis jsonb;
