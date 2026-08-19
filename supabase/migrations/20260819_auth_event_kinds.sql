-- Auth events. The predecessor already fired these names from its sign-in
-- sheet; record_event's allowlist never learned them, so every one was
-- silently dropped. Adding them here is what makes the sign-in funnel
-- measurable at all.
--
-- Same standing rule as the other event migration: this list and the
-- EventKind union in src/lib/discovery.ts move together. A name added to one
-- and not the other fails silently in whichever direction it was missed.

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
  if v_kind not in (
    'rewind',
    'foryou_toggle_on','foryou_toggle_off',
    'share',
    'submit_open','submit_success',
    'menu_open','preferences_open',
    'donate_open','donate_interstitial_view',
    'bookmarks_open','bookmarks_export','bookmarks_clear',
    'report','flag',
    'react_open','sendto_open',
    'copy_link','open_site',
    'catalogue_restart',
    'auth_open','auth_instant_created','auth_instant_claimed',
    'auth_instant_signin','auth_wrong_password','auth_magic_sent',
    'auth_signed_out','auth_error'
  ) then return; end if;
  insert into events(kind, site_id, device_id) values (v_kind, p_site_id, p_device_id);
end;
$function$;
