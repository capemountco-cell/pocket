import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/brand";
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
import { BoardRow, BOARD_MUTED } from "@/components/BoardRow";

// How many rows to pull per request. Large enough that most collections load
// in one go, small enough that the 1,441-row case doesn't block first paint.
const PAGE_SIZE = 50;

// Where the discovery screen looks for a site to open on mount. Set here so
// tapping a saved row lands on that exact site rather than a random one.
export const OPEN_SITE_KEY = "app_open_site_v1";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: `Saved — ${APP_NAME}` },
      // A personal collection has nothing to offer a search engine.
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SavedPage,
});

type Tab = "saved" | "submitted";

function SavedPage() {
  const navStyle = useNavStyle();
  const navigate = useNavigate();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("saved");

  const [sites, setSites] = useState<DiscoverySite[]>([]);
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
    link.download = `${APP_NAME.toLowerCase()}-saved.csv`;
    link.click();
    recordEvent(deviceId, "bookmarks_export");
  };

  const rows = useMemo(
    () => (tab === "saved" ? sites.length : submissions.length),
    [tab, sites, submissions],
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
              Saved
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
            sites.length === 0 ? (
              <Message text="Nothing saved yet. Tap the send icon on a site you want to keep, then choose “Save this site”." />
            ) : (
              <>
                {sites.map((site) => (
                  <SavedRow key={site.id} site={site} onShow={show} onRemove={remove} />
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

function SavedRow({
  site,
  onShow,
  onRemove,
}: {
  site: DiscoverySite;
  onShow: (s: DiscoverySite) => void;
  onRemove: (s: DiscoverySite) => Promise<void>;
}) {
  // Title on the bold line here rather than the domain: on Explore you are
  // scanning for something new and the address is the identity, but a
  // collection is things you already chose, and you remember what you called
  // them. The domain moves to the second line.
  return (
    <BoardRow
      domain={site.domain}
      title={site.title}
      description={site.domain}
      onOpen={() => onShow(site)}
      actions={
        <>
          <a
            href={site.url}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Open ${site.title} in a new tab`}
            style={ROW_ACTION}
          >
            <ExternalLink size={18} aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={() => void onRemove(site)}
            aria-label={`Remove ${site.title} from saved`}
            style={ROW_ACTION}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </>
      }
    />
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
