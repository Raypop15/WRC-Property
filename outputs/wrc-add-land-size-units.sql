-- WRC Property: structured land size with square-feet and acres support.

alter table public.properties
  add column if not exists land_size_value numeric,
  add column if not exists land_size_unit text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'properties_land_size_unit_check'
      and conrelid = 'public.properties'::regclass
  ) then
    alter table public.properties
      add constraint properties_land_size_unit_check
      check (land_size_unit is null or land_size_unit in ('sq ft', 'acres'));
  end if;
end $$;

create or replace function public.get_public_properties()
returns table (property jsonb)
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'property_id', p.property_id,
    'category', p.category,
    'property_type', p.property_type,
    'property_name', p.property_name,
    'location', p.location,
    'address', p.address,
    'deal_type', p.deal_type,
    'status', p.status,
    'price', p.price,
    'built_up_size', p.built_up_size,
    'land_size', p.land_size,
    'land_size_value', p.land_size_value,
    'land_size_unit', p.land_size_unit,
    'bedrooms', p.bedrooms,
    'maid_rooms', p.maid_rooms,
    'bathrooms', p.bathrooms,
    'tenure', p.tenure,
    'furnishing', p.furnishing,
    'description', p.description,
    'highlights', p.highlights,
    'date_added', p.date_added,
    'property_photos', coalesce((
      select jsonb_agg(jsonb_build_object('url', pp.url, 'sort_order', pp.sort_order) order by pp.sort_order)
      from public.property_photos pp
      where pp.property_id = p.id
    ), '[]'::jsonb),
    'property_videos', coalesce((
      select jsonb_agg(jsonb_build_object('url', pv.url, 'sort_order', pv.sort_order) order by pv.sort_order)
      from public.property_videos pv
      where pv.property_id = p.id
    ), '[]'::jsonb),
    'property_documents', coalesce((
      select jsonb_agg(jsonb_build_object('url', pd.url, 'file_name', pd.file_name, 'sort_order', pd.sort_order) order by pd.sort_order)
      from public.property_documents pd
      where pd.property_id = p.id
    ), '[]'::jsonb)
  )
  from public.properties p
  where p.status = 'Available'
  order by p.date_added desc, p.created_at desc;
$$;

create or replace function public.get_public_shortlist(p_shortlist_id uuid)
returns table (id uuid, title text, created_at timestamptz, property jsonb)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.title,
    s.created_at,
    jsonb_build_object(
      'property_id', p.property_id,
      'category', p.category,
      'property_type', p.property_type,
      'property_name', p.property_name,
      'location', p.location,
      'address', p.address,
      'deal_type', p.deal_type,
      'status', p.status,
      'price', p.price,
      'built_up_size', p.built_up_size,
      'land_size', p.land_size,
      'land_size_value', p.land_size_value,
      'land_size_unit', p.land_size_unit,
      'bedrooms', p.bedrooms,
      'maid_rooms', p.maid_rooms,
      'bathrooms', p.bathrooms,
      'tenure', p.tenure,
      'furnishing', p.furnishing,
      'description', p.description,
      'highlights', p.highlights,
      'photos', coalesce((
        select jsonb_agg(pp.url order by pp.sort_order)
        from public.property_photos pp
        where pp.property_id = p.id
      ), '[]'::jsonb),
      'videos', coalesce((
        select jsonb_agg(pv.url order by pv.sort_order)
        from public.property_videos pv
        where pv.property_id = p.id
      ), '[]'::jsonb),
      'documents', coalesce((
        select jsonb_agg(jsonb_build_object('url', pd.url, 'name', pd.file_name) order by pd.sort_order)
        from public.property_documents pd
        where pd.property_id = p.id
      ), '[]'::jsonb)
    )
  from public.shortlists s
  join public.shortlist_items si on si.shortlist_id = s.id
  join public.properties p on p.id = si.property_id
  where s.id = p_shortlist_id
    and s.is_active = true
    and p.status = 'Available';
$$;

revoke all on function public.get_public_shortlist(uuid) from public;
grant execute on function public.get_public_shortlist(uuid) to anon, authenticated;
revoke all on function public.get_public_properties() from public;
grant execute on function public.get_public_properties() to anon, authenticated;
