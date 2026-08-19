-- record_event() silently drops any kind outside its allowlist, which is a
-- good guard against junk but means a new interaction is invisible until its
-- name is added here. Five interactions in the discovery client had no name
-- yet; the rest reuse the names that already exist rather than inventing
-- synonyms for concepts the list already covers.

create or replace function public.record_event(p_device_id text, p_kind text, p_site_id uuid default null::uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_kind text;
begin
  v_kind := lower(trim(coalesce(p_kind,'')));
  if v_kind = '' or length(v_kind) > 40 then return; end if;
  -- Allowlist of feature events (in addition to existing internal kinds
  -- written by record_interaction/toggle_save/record_dwell/record_stumble/record_embed_block).
  if v_kind not in (
    'rewind',
    'foryou_toggle_on','foryou_toggle_off',
    'share',
    'submit_open','submit_success',
    'menu_open','preferences_open',
    'donate_open','donate_interstitial_view',
    'bookmarks_open','bookmarks_export','bookmarks_clear',
    'report','flag',
    -- Added for the discovery client: the two nav slots that had no event
    -- name, the two ways a link leaves the app, and running out of catalogue.
    'react_open','sendto_open',
    'copy_link','open_site',
    'catalogue_restart'
  ) then return; end if;
  insert into events(kind, site_id, device_id) values (v_kind, p_site_id, p_device_id);
end;
$function$;
