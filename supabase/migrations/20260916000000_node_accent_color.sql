alter table public.roadmap_nodes
  add column accent_color text;

alter table public.roadmap_nodes
  add constraint roadmap_nodes_accent_color_hex
    check (
      accent_color is null
      or accent_color ~ '^#[0-9a-f]{6}$'
    );
