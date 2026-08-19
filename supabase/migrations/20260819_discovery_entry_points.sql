-- Brand-neutral entry points for the discovery client.
--
-- The existing feed functions carry the predecessor product's name. This app
-- may not reference that name anywhere in its own source, so these thin
-- wrappers give the client a vocabulary it is allowed to speak. They add no
-- behavior of their own: the ranking, exclusion and personalization rules stay
-- in one place, in the functions being wrapped.

create or replace function public.get_discovery_queue(
  p_device_id text,
  p_limit integer default 25,
  p_exclude_ids uuid[] default '{}'::uuid[]
)
returns setof public.sites
language sql
security definer
set search_path to 'public'
as $$
  select *
  from public.get_stumble_queue(
    p_device_id,
    true,
    coalesce(p_limit, 25),
    coalesce(p_exclude_ids, '{}'::uuid[]),
    '{}'::jsonb,
    '{}'::text[],
    false
  );
$$;

comment on function public.get_discovery_queue(text, integer, uuid[]) is
  'One serve of discovery candidates for a device, already filtered for disliked, blocked and seen sites.';

-- Marks a site as served to this device so the queue stops offering it.
create or replace function public.record_discovery(p_device_id text, p_site_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.record_stumble(p_device_id, p_site_id);
end;
$$;

-- With a small catalogue a device runs out of unseen sites quickly. Clearing
-- its history is what lets the loop continue rather than dead-ending on an
-- empty queue; it touches only the calling device's rows.
create or replace function public.reset_discovery_history(p_device_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_device_id is null or length(p_device_id) = 0 then
    return;
  end if;
  delete from public.seen_sites where device_id = p_device_id;
end;
$$;

grant execute on function public.get_discovery_queue(text, integer, uuid[]) to anon, authenticated;
grant execute on function public.record_discovery(text, uuid) to anon, authenticated;
grant execute on function public.reset_discovery_history(text) to anon, authenticated;
