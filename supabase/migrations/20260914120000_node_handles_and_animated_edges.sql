alter table public.roadmap_nodes
  add column handle_kind text not null default 'regular',
  add column incoming_edge_animated boolean not null default false;

alter table public.roadmap_nodes
  add constraint roadmap_nodes_handle_kind_allowed
    check (handle_kind in ('regular', 'input', 'output'));
