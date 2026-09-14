alter table public.roadmap_nodes
  add column kind text not null default 'skill';

alter table public.roadmap_nodes
  add constraint roadmap_nodes_kind_allowed
    check (kind in ('skill', 'label'));

alter table public.roadmap_nodes
  add constraint roadmap_nodes_labels_are_roots
    check (kind <> 'label' or parent_id is null);
