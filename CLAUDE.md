# Working agreements for this repo

Standing rules for any agent working here. They exist because each one below
was learned the hard way on this project — every "verify" rule is here because
something confidently reported the wrong answer.

## 0. Do not wait to be told twice

**The owner's standing instruction: never wait on them. Move on everything.**

A thing you have raised is a thing to go and do. Do not end a turn holding an
offer, a recommendation, or a "say the word and I will" — say what you found,
then do it. This covers the follow-ups you name yourself: a defect you spotted
while fixing something else, the calibration pass you said the work needed, the
tidy-up you flagged and moved past. It covers publishing (§3). Where a request
reads two ways, take the reading that does more, do it, and say which one you
took and why.

**The stop word is "undo".** They can say it at any time, and it means: stop
moving on things, hold what is unfinished, and wait. It is theirs to use, not a
gate to seek — asking "shall I?" to be safe is the behaviour this section
exists to end. Until they say it, keep going.

Two things this does not license, because neither is what they asked for.
It is not permission to skip §1: work still gets verified against the thing
itself, and an unverified claim is still worth less than an honest "could not
check". And it is not permission to narrow their brief — where you think a
piece of their spec is wrong, build it as specified, then say so with the
evidence. Scaling the work down is their call; scaling your own hesitation
down is the point of this rule.

## 1. Verify claims against primary sources, always

Never report a thing as done, applied, merged, or deployed because a tool
returned success. Check the state itself, and say plainly when you could not.

Specific traps this project has already hit:

- **Dashboard row counts are estimates, not counts.** Supabase's table list and
  Lovable's Database page both render Postgres `n_live_tup`, which can be wildly
  stale. This project's `events` table showed **61 rows** against an actual
  **596,832**, and `sites` showed **0** against **2,071**. Never make a decision
  from those screens. Run `select count(*)`.
- **A column count is not a row count.** Supabase's table list puts Columns
  before Rows; `sites` reading "30" is thirty *columns*.
- **A tool call that times out may have half-applied.** A `create or replace
  function` here timed out, reported nothing, and had *not* applied. It was
  reported as unverified rather than done, then re-applied and confirmed. Do the
  same: a timeout is unknown state, not failure and not success.
- **Merged is not deployed.** See §3.

When something can't be verified, say so in that state — "applied but
unconfirmed" is a legitimate and useful report. Claiming success you haven't
checked is not.

## 2. Two databases exist, and only one has the data

This is the single most expensive confusion available in this project.

| | Holds the catalogue | Schema-only copy |
|---|---|---|
| Ref | `boembmgwjjdqgkcokapx` | `kmxpyemqddvfchkeureq` |
| Where | Lovable Cloud (managed; **not** in the Supabase dashboard's project list) | The user's own Supabase org, named "Stumble" |
| Contents | 2,071 sites, 167 auth users, 596k events | Full schema, 28 edge functions, **zero site rows** |
| Key style | JWT (`eyJ…`) | `sb_publishable_…` |

The standalone was created 2026-07-21 by replaying migrations, per
`docs/migrate-to-standalone-supabase.md`, which explicitly assumed "no
production data to preserve". It has never held a site row.

The keys are not interchangeable: each answers **200** for its own project and
**401** for the other. A quick way to tell which project a key belongs to is to
decode the JWT's `ref` claim, or just call `get_discovery_queue` against both.

The standalone's schema is **ahead** — 38 tables vs 31, and `sites` has 30
columns vs 24 (`final_url`, `og_title`, `og_description`, `favicon_url`,
`embed_checked_at`, `embed_block_reason` exist only there). Any restore of the
older dump onto it must be data-only, or be followed by re-applying the newer
migrations.

## 3. Deploying is a separate step — and it is yours to take

Merging to `main` does **not** publish. Lovable rebuilds only when someone
publishes. A merge landing and the live site changing are two events, and
without the second one the first one changes nothing for anyone.

**Standing instruction from the owner: always publish, never wait to be asked.**
Merge, then publish, then verify — as one action, not three, and not a question
put to them at the end of it. This is a durable authorisation, not a per-change
one, and it does not expire between sessions or tasks. The nearest tool is
`deploy_project` on the Lovable MCP server; the project is `pockettt`
(`22e0a8b9-c50f-43bf-9d34-6c84f78013c5`) in the "004 - main one" workspace.

The rest of these rules still apply on top of it. A change that fails
`bun run build`, `bunx tsc --noEmit` or `bunx eslint .` does not get merged, so
it never reaches this step; and §1 still holds afterwards — a deploy call that
returned success is not evidence the site changed. Check the bundle.

To check what is actually live, read the deployed bundle rather than trusting
the panel:

```bash
curl -sS -L --compressed https://p-o-c-k-e-t.com/ -o live.html
JS=$(grep -a -oE '/assets/index-[A-Za-z0-9_.-]+\.js' live.html | head -1)
curl -sS -L --compressed "https://p-o-c-k-e-t.com$JS" -o live.js
grep -ac 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' live.js   # is a real key shipped?
```

An unchanged bundle hash after a publish means the publish has not landed yet.
Say so in that state rather than reporting it as deployed.

## 4. Environment variables override committed defaults

`src/integrations/supabase/client.ts` carries the project URL and the
publishable key as defaults so the app runs with no setup. `VITE_SUPABASE_URL`
and `VITE_SUPABASE_PUBLISHABLE_KEY` still win where set — which means a wrong
env var keeps the site broken *after* a correct fix is merged. When the live
site misbehaves, check the env before re-reading the code.

The service-role key bypasses RLS entirely and must never appear in this repo,
in a client bundle, or under any name with a `VITE_` prefix.

## 5. `record_event` silently drops unknown event kinds

`record_event(device_id, kind, site_id)` checks `kind` against a hardcoded
allowlist and returns without inserting if it misses. No error, no warning.

So the `EventKind` union in `src/lib/discovery.ts` and the allowlist in
`supabase/migrations/` **move together**. A name added to one and not the other
fails silently, in whichever direction it was missed. The union carries a
comment saying so; keep it.

## 6. Writes go through SECURITY DEFINER functions

RLS grants `anon` almost no direct table access — reading live sites and
inserting submissions are the only exceptions. Everything else (reactions,
saves, events, serves) goes through a `SECURITY DEFINER` RPC. That is the
intended shape; do not "fix" a permission error by loosening a policy.

The client only ever calls brand-neutral wrappers
(`get_discovery_queue`, `record_discovery`, `reset_discovery_history`) over the
older functions, because §7 forbids this codebase from naming the predecessor
product.

## 7. Brand neutrality is a hard rule

Per `docs/new-project-build-prompt.md` §1: no reference to any other discovery,
bookmarking or read-it-later product anywhere — component names, comments,
routes, meta tags, copy, filenames. The brand name lives only in
`src/lib/brand.ts`. This is a trademark-risk rule, not a style preference.

## 8. Before pushing

`bun run build`, `bunx tsc --noEmit`, and `bunx eslint .` must all pass. For
anything touching the discovery loop, drive it in a real browser at 390×844 —
tests that only typecheck have missed real breakage here (a stacking-context
bug that hid the whole nav, and a sheet that swallowed every tap on the bar).

When testing against the live database, **clean up afterwards**: delete the rows
your test device ids created, and restore any counters they moved.

And the work is not done at the merge. Publish it and check the bundle — see
§3, which is a standing instruction rather than something to ask about.
