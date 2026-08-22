import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardPaste, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/brand";
import { OPEN_SITE_KEY } from "@/lib/open-site";
import { getDeviceId } from "@/lib/device-id";
import { initTheme } from "@/lib/theme";
import { initNavStyle, useNavStyle } from "@/lib/nav-style";
import { initSitePrefs, toggleSaved } from "@/lib/site-prefs";
import {
  clearSaved,
  fetchMySubmissions,
  fetchSavedSites,
  recordEvent,
  type DiscoverySite,
  type MySubmission,
} from "@/lib/discovery";
import { APP_CONTENT_MAX_WIDTH, navContentReserve } from "@/components/nav/navMetrics";
import { BottomNav } from "@/components/nav/BottomNav";
import { BOARD_MUTED } from "@/components/BoardRow";
import { BoardCard, type CardFace } from "@/components/BoardCard";
import { clampText } from "@/lib/utils";
import { probeEmbeddable } from "@/lib/embeddability";
import {
  addManualEntry,
  manualEntries,
  removeManualEntry,
  tidyUrl,
  type ManualEntry,
} from "@/lib/manual-history";

// How many rows to pull per request. Large enough that most collections load
// in one go, small enough that the 1,441-row case doesn't block first paint.
const PAGE_SIZE = 50;

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: `History — ${APP_NAME}` },
      // A personal collection has nothing to offer a search engine.
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: HistoryPage,
});

type Tab = "saved" | "submitted";

function HistoryPage() {
  const navStyle = useNavStyle();
  const navigate = useNavigate();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("saved");

  const [sites, setSites] = useState<DiscoverySite[]>([]);
  const [manual, setManual] = useState<ManualEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [submissions, setSubmissions] = useState<MySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    initTheme();
    initNavStyle();
    const id = getDeviceId();
    setDeviceId(id);
    setManual(manualEntries());
    if (id) void initSitePrefs(id);
  }, []);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setFailed(false);
    try {
      const [first, mine] = await Promise.all([
        fetchSavedSites(id, 0, PAGE_SIZE),
        fetchMySubmissions(id),
      ]);
      setSites(first);
      setSubmissions(mine);
      setReachedEnd(first.length < PAGE_SIZE);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    void load(deviceId);
  }, [deviceId, load]);

  const loadMore = async () => {
    if (!deviceId || loadingMore || reachedEnd) return;
    setLoadingMore(true);
    try {
      const next = await fetchSavedSites(deviceId, sites.length, PAGE_SIZE);
      setSites((current) => [...current, ...next]);
      if (next.length < PAGE_SIZE) setReachedEnd(true);
    } catch {
      toast("Couldn't load more just now.");
    } finally {
      setLoadingMore(false);
    }
  };

  // A typed address is read before it is kept, so the card can carry the
  // page's real name instead of its hostname. The probe already exists for
  // the submission pipeline and answers with the title, the address after any
  // redirects, and the domain -- everything a card needs.
  const addManual = async () => {
    const url = tidyUrl(draft);
    if (!url || adding) return;
    setAdding(true);
    try {
      const probe = await probeEmbeddable({ data: { url } }).catch(() => null);
      const resolved = probe?.ok ? probe : null;
      const target = resolved?.url ?? url;
      let domain = resolved?.domain ?? "";
      if (!domain) {
        try {
          domain = new URL(target).hostname.replace(/^www\./, "");
        } catch {
          toast("That doesn't look like a web address.");
          return;
        }
      }
      setManual(() => {
        addManualEntry({ url: target, domain, title: resolved?.title || domain });
        return manualEntries();
      });
      setDraft("");
      // No event for this one. A manual entry never leaves the device, and
      // record_event drops any kind not on its own allowlist -- adding a name
      // here without the matching migration would post nothing, silently.
    } finally {
      setAdding(false);
    }
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setDraft(text.trim());
    } catch {
      toast("Clipboard access was refused — paste with your keyboard instead.");
    }
  };

  const dropManual = (entry: ManualEntry) => {
    removeManualEntry(entry.id);
    setManual(manualEntries());
  };

  const remove = async (site: DiscoverySite) => {
    // Optimistic: the row leaves on the tap, and comes back if the write fails.
    setSites((current) => current.filter((s) => s.id !== site.id));
    const stillSaved = await toggleSaved(site);
    if (stillSaved) {
      setSites((current) => [site, ...current]);
      toast("Couldn't remove that one.");
    }
  };

  const removeAll = async () => {
    if (!deviceId || sites.length === 0) return;
    const previous = sites;
    setSites([]);
    setReachedEnd(true);
    try {
      await clearSaved(deviceId);
      recordEvent(deviceId, "bookmarks_clear");
      await initSitePrefs(deviceId);
      toast("Collection emptied");
    } catch {
      setSites(previous);
      toast("Couldn't empty the collection.");
    }
  };

  // Opening a saved site means showing it in the discovery screen, not just
  // linking away -- the collection is part of the app, not a bookmark list.
  const show = (site: DiscoverySite) => {
    try {
      sessionStorage.setItem(OPEN_SITE_KEY, site.id);
    } catch {
      /* private mode: fall through to a normal discovery load */
    }
    void navigate({ to: "/" });
  };

  const exportCsv = () => {
    if (!deviceId || sites.length === 0) return;
    const csv = [
      "title,url,domain",
      ...sites.map((s) => [s.title, s.url, s.domain].map(csvCell).join(",")),
    ].join("\n");
    // A data: URL keeps this a pure client action -- no round trip, and
    // nothing about the collection leaves the device to produce the file.
    const link = document.createElement("a");
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `${APP_NAME.toLowerCase()}-history.csv`;
    link.click();
    recordEvent(deviceId, "bookmarks_export");
  };

  const rows = useMemo(
    () => (tab === "saved" ? sites.length + manual.length : submissions.length),
    [tab, sites, manual, submissions],
  );

  return (
    <>
      <main
        style={{
          position: "fixed",
          inset: 0,
          paddingBottom: navContentReserve(navStyle),
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          // Black, like Explore. The collection is the same kind of surface
          // -- a board of sites -- so it should not arrive as a different app.
          background: "#000000",
          color: "#ffffff",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <header style={{ ...COLUMN, flex: "0 0 auto", padding: "14px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link
              to="/"
              aria-label="Back to discovery"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                marginLeft: -10,
                borderRadius: 999,
                color: "#ffffff",
              }}
            >
              <ArrowLeft size={22} aria-hidden="true" />
            </Link>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>
              History
            </h1>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 14,
                fontVariantNumeric: "tabular-nums",
                color: BOARD_MUTED,
              }}
            >
              {loading ? "" : `${rows} ${rows === 1 ? "item" : "items"}`}
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Collection"
            style={{ display: "flex", gap: 8, marginTop: 12 }}
          >
            <TabButton current={tab} value="saved" label="Sites" onSelect={setTab} />
            <TabButton current={tab} value="submitted" label="Submitted" onSelect={setTab} />
          </div>

          {/* Above the list, not behind a sheet: keeping a link you already
              have in your hand is the one thing you come to this screen to do
              that is not reading it. */}
          {tab === "saved" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void addManual();
              }}
              style={{ display: "flex", gap: 8, margin: "14px 0 2px" }}
            >
              <span style={{ position: "relative", flex: "1 1 auto", minWidth: 0 }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Paste a link to keep"
                  inputMode="url"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="Address to keep"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    minHeight: 44,
                    padding: "0 44px 0 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "transparent",
                    color: "#ffffff",
                    fontFamily: "Inter, system-ui, sans-serif",
                    // 16px or iOS zooms the whole page on focus.
                    fontSize: 16,
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => void paste()}
                  aria-label="Paste from the clipboard"
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    border: 0,
                    background: "transparent",
                    color: BOARD_MUTED,
                    cursor: "pointer",
                  }}
                >
                  <ClipboardPaste size={18} aria-hidden="true" />
                </button>
              </span>
              <button
                type="submit"
                disabled={adding || draft.trim().length === 0}
                style={{
                  ...SECONDARY,
                  flex: "0 0 auto",
                  // White pill, quiet label -- the same rule as every other
                  // primary action. Dimming the whole button turns a white
                  // pill into a solid mid-grey one, which reads as enabled.
                  background: "#ffffff",
                  borderColor: "#ffffff",
                  color: adding || draft.trim().length === 0 ? "rgba(0,0,0,0.32)" : "#000000",
                }}
              >
                {adding ? "Reading…" : "Keep"}
              </button>
            </form>
          ) : null}
        </header>

        <div
          style={{
            ...COLUMN,
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: "12px 16px 24px",
          }}
        >
          {loading ? (
            <Message text="Loading your collection…" />
          ) : failed ? (
            <Message
              text="Couldn't reach your collection."
              action={{ label: "Try again", run: () => deviceId && void load(deviceId) }}
            />
          ) : tab === "saved" ? (
            sites.length + manual.length === 0 ? (
              <Message text="Nothing here yet. Open the menu on a site you want to keep and choose “Save this site” — or paste an address above." />
            ) : (
              <>
                {manual.map((entry) => (
                  <ManualCard key={entry.id} entry={entry} onRemove={dropManual} />
                ))}
                {sites.map((site, index) => (
                  <SavedCard
                    key={site.id}
                    site={site}
                    lead={manual.length === 0 && index === 0}
                    onShow={show}
                    onRemove={remove}
                  />
                ))}
                {!reachedEnd ? (
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    style={SECONDARY}
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                ) : null}
                <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                  <button type="button" onClick={exportCsv} style={SECONDARY}>
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeAll()}
                    style={{ ...SECONDARY, color: "var(--app-destructive, #FF453A)" }}
                  >
                    Empty collection
                  </button>
                </div>
              </>
            )
          ) : submissions.length === 0 ? (
            <Message text="You haven't submitted a site yet." />
          ) : (
            submissions.map((s) => <SubmissionRow key={s.id} submission={s} />)
          )}
        </div>
      </main>

      {/* The bar is permanent chrome: no route may hide it. Discovering from
          here means going back to the loop, so the brand tap navigates home
          and lets that screen serve the next site. */}
      <BottomNav onDiscover={() => void navigate({ to: "/" })} />
    </>
  );
}

function TabButton({
  current,
  value,
  label,
  onSelect,
}: {
  current: Tab;
  value: Tab;
  label: string;
  onSelect: (t: Tab) => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(value)}
      style={{
        minHeight: 44,
        padding: "0 16px",
        borderRadius: 999,
        border: `1px solid ${active ? "#ffffff" : "rgba(255,255,255,0.18)"}`,
        background: active ? "#ffffff" : "transparent",
        color: active ? "#000000" : "#ffffff",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

/**
 * A saved site, shown the way Explore shows one.
 *
 * Same card, same picture, same proportions -- History is a board of sites and
 * arriving at it should not feel like arriving at a different app. What it
 * does not have is a rank: these are not in a contest with each other, they
 * are things you kept, so the corner badge stays off and the eyebrow carries
 * the address instead.
 *
 * Every card here gets a picture, which Explore's top three do not have to pay
 * for: a capture is a headless browser session, so all but the first wait
 * until they are within a screen of being looked at.
 */
function SavedCard({
  site,
  lead,
  onShow,
  onRemove,
}: {
  site: DiscoverySite;
  lead: boolean;
  onShow: (s: DiscoverySite) => void;
  onRemove: (s: DiscoverySite) => Promise<void>;
}) {
  const face: CardFace = {
    id: site.id,
    url: site.url,
    domain: site.domain,
    // Title on the bold line here rather than the domain: on Explore you are
    // scanning for something new and the address is the identity, but a
    // collection is things you already chose, and you remember what you called
    // them. The address moves up into the eyebrow.
    title: site.title,
    description: site.blurb ? clampText(site.blurb, 140) : null,
    image: null,
    adult: site.adult,
  };
  return (
    <div style={{ marginBottom: 28 }}>
      <BoardCard
        face={face}
        lead={lead}
        lazy={!lead}
        // Where Explore puts a rank. These are not ranked against each other,
        // and the one thing worth saying about a row here is how it got here.
        tag="Bookmarked"
        meta={
          <>
            {site.adult ? <>18+ · </> : null}
            {site.domain}
          </>
        }
        onOpen={() => onShow(site)}
        actions={
          <>
            <a
              href={site.url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Open ${site.title} in a new tab`}
              style={CARD_ACTION}
            >
              <ExternalLink size={18} aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => void onRemove(site)}
              aria-label={`Remove ${site.title} from your history`}
              style={CARD_ACTION}
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </>
        }
      />
    </div>
  );
}

/**
 * A link you typed in.
 *
 * Identical to a saved site apart from where it opens. A catalogue site has
 * been read, classified and checked for whether it can be framed, so the app
 * can show it in its own viewer. A pasted address has been through none of
 * that, so it opens in its own tab rather than being dressed up as something
 * the app vouched for.
 */
function ManualCard({
  entry,
  onRemove,
}: {
  entry: ManualEntry;
  onRemove: (e: ManualEntry) => void;
}) {
  const face: CardFace = {
    id: entry.id,
    url: entry.url,
    domain: entry.domain,
    title: entry.title,
    description: null,
    image: null,
    adult: false,
  };
  return (
    <div style={{ marginBottom: 28 }}>
      <BoardCard
        face={face}
        lazy
        tag="Kept"
        meta={<>{entry.domain} · yours only</>}
        onOpen={() => window.open(entry.url, "_blank", "noopener,noreferrer")}
        actions={
          <>
            <span style={{ flex: "1 1 auto", fontSize: 12.5, color: BOARD_MUTED }}>
              Kept on this device. Opens in a new tab.
            </span>
            <button
              type="button"
              onClick={() => onRemove(entry)}
              aria-label={`Remove ${entry.title} from your history`}
              style={CARD_ACTION}
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </>
        }
      />
    </div>
  );
}

function SubmissionRow({ submission }: { submission: MySubmission }) {
  return (
    <div style={ROW}>
      <a
        href={submission.url}
        target="_blank"
        rel="noreferrer noopener"
        style={{ ...ROW_MAIN, textDecoration: "none" }}
      >
        <span style={{ display: "block", fontSize: 16, fontWeight: 600, ...CLAMP }}>
          {submission.title || submission.url}
        </span>
        <span
          style={{
            display: "block",
            fontSize: 13,
            color: BOARD_MUTED,
            ...CLAMP,
          }}
        >
          {/* Review state is the only thing a submitter can act on, so it is
              the one piece of status shown. */}
          {submission.verdict ? submission.verdict : "In review"}
        </span>
      </a>
    </div>
  );
}

function Message({ text, action }: { text: string; action?: { label: string; run: () => void } }) {
  return (
    <div style={{ padding: "28px 4px", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: BOARD_MUTED }}>{text}</p>
      {action ? (
        <button type="button" onClick={action.run} style={{ ...SECONDARY, marginTop: 14 }}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

// A field containing a comma, quote or newline breaks the row unless it is
// quoted and its quotes doubled.
function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// The page shares the bar's centred column so the two line up on desktop.
const COLUMN: React.CSSProperties = {
  width: "100%",
  maxWidth: APP_CONTENT_MAX_WIDTH,
  marginInline: "auto",
  boxSizing: "border-box",
};

const CLAMP: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  gap: 4,
};

const ROW_MAIN: React.CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  minHeight: 60,
  padding: "10px 4px",
  background: "transparent",
  border: 0,
  color: "#ffffff",
  fontFamily: "Inter, system-ui, sans-serif",
  textAlign: "left",
  cursor: "pointer",
};

const CARD_ACTION: React.CSSProperties = {
  display: "inline-flex",
  flex: "0 0 auto",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  height: 44,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "transparent",
  color: BOARD_MUTED,
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

const ROW_ACTION: React.CSSProperties = {
  display: "inline-flex",
  flex: "0 0 auto",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  minHeight: 60,
  background: "transparent",
  border: 0,
  color: BOARD_MUTED,
  cursor: "pointer",
};

const SECONDARY: React.CSSProperties = {
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "transparent",
  color: "#ffffff",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};
