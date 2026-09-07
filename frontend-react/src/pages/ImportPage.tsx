import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastProvider";
import {
  fetchImageBlob,
  figmaAuthorizeUrl,
  figmaDisconnect,
  figmaExtract,
  getProviders,
  pinterestAuthorizeUrl,
  pinterestBoards,
  pinterestDisconnect,
  pinterestPins,
} from "../api/imports";
import { extractColorsFromBlob } from "../lib/imageColors";
import { CreateTabs } from "../components/CreateTabs";
import { readableTextOn } from "../lib/color";
import { ApiError } from "../lib/http";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";
import * as styles from "./ImportPage.css";

const DEFAULT_COUNT = 6;
const MIN_COUNT = 2;
const MAX_COUNT = 8;

export function ImportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();

  const [url, setUrl] = useState("");
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [colors, setColors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [figmaFile, setFigmaFile] = useState("");
  const [board, setBoard] = useState("");
  // The last decoded image, kept so changing the colour count re-quantises without re-fetching.
  const sourceBlob = useRef<Blob | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: providers, refetch: refetchProviders } = useQuery({
    queryKey: ["import-providers"],
    queryFn: getProviders,
    enabled: isAuthenticated,
  });
  const figma = providers?.figma;
  const pinterest = providers?.pinterest;

  const { data: boards } = useQuery({
    queryKey: ["pinterest-boards"],
    queryFn: pinterestBoards,
    enabled: Boolean(pinterest?.connected),
  });
  const { data: pins } = useQuery({
    queryKey: ["pinterest-pins", board],
    queryFn: () => pinterestPins(board),
    enabled: Boolean(pinterest?.connected && board),
  });

  // The OAuth callback bounces back here with ?figma= or ?pinterest= connected|error. Report it,
  // refresh the link state, and strip the param so a reload does not repeat the toast.
  useEffect(() => {
    for (const provider of ["figma", "pinterest"] as const) {
      const result = searchParams.get(provider);
      if (!result) continue;
      const label = provider === "figma" ? "Figma" : "Pinterest";
      if (result === "connected") {
        showToast(`${label} connected`);
        void refetchProviders();
      } else {
        showToast(`${label} connection failed`, "error");
      }
      searchParams.delete(provider);
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, showToast, refetchProviders]);

  // The extractor saves to an account, and the URL path needs the authed proxy — gate the page.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true, state: { from: location } });
    }
  }, [authLoading, isAuthenticated, navigate, location]);

  // Release the preview object URL when it is replaced or the page unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const extract = async (blob: Blob, n: number) => {
    setBusy(true);
    setError("");
    try {
      const extracted = await extractColorsFromBlob(blob, n);
      setColors(extracted);
    } catch (e) {
      setColors([]);
      setError(e instanceof Error ? e.message : "Could not read that image");
    } finally {
      setBusy(false);
    }
  };

  const applyBlob = (blob: Blob) => {
    sourceBlob.current = blob;
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(blob);
    });
    void extract(blob, count);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyBlob(file);
  };

  // Fetch a remote image through the proxy and extract from it — shared by the URL form and a
  // Pinterest pin (a pin is just an image URL).
  const applyImageUrl = async (target: string) => {
    if (!target || busy) return;
    setBusy(true);
    setError("");
    try {
      const blob = await fetchImageBlob(target);
      applyBlob(blob);
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError ? err.message : "Could not fetch that image");
    }
  };

  const onUrl = (e: FormEvent) => {
    e.preventDefault();
    void applyImageUrl(url.trim());
  };

  // Re-quantise the already-loaded image when the count changes; no effect until one is loaded.
  const onCount = (n: number) => {
    setCount(n);
    if (sourceBlob.current) void extract(sourceBlob.current, n);
  };

  const onEdit = () => {
    if (colors.length === 0) return;
    showToast("Colors ready — name your palette");
    navigate("/palettes/new", { state: { draft: { colors } } });
  };

  const onConnectFigma = async () => {
    try {
      const { url: authorizeUrl } = await figmaAuthorizeUrl();
      window.location.href = authorizeUrl;
    } catch {
      showToast("Could not start the Figma connection", "error");
    }
  };

  const onDisconnectFigma = async () => {
    try {
      await figmaDisconnect();
      showToast("Figma disconnected");
      void refetchProviders();
    } catch {
      showToast("Could not disconnect Figma", "error");
    }
  };

  const onConnectPinterest = async () => {
    try {
      const { url: authorizeUrl } = await pinterestAuthorizeUrl();
      window.location.href = authorizeUrl;
    } catch {
      showToast("Could not start the Pinterest connection", "error");
    }
  };

  const onDisconnectPinterest = async () => {
    try {
      await pinterestDisconnect();
      showToast("Pinterest disconnected");
      setBoard("");
      void refetchProviders();
    } catch {
      showToast("Could not disconnect Pinterest", "error");
    }
  };

  const onFigmaExtract = async (e: FormEvent) => {
    e.preventDefault();
    const file = figmaFile.trim();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const draft = await figmaExtract(file);
      sourceBlob.current = null;
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return "";
      });
      setColors(draft.colors);
      if (draft.colors.length === 0) {
        setError("That Figma file has no paint styles to import");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not read that Figma file");
    } finally {
      setBusy(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <section className={`${ui.section} ${ui.pageHero}`}>
        <CreateTabs />
        <p className={ui.eyebrow}>Import</p>
        <h1>Extract a palette from an image</h1>
        <p>
          Upload an image or paste a link. The dominant colors become an editable palette
          you can name, tag and save to your account.
        </p>
      </section>

      <section className={ui.section}>
        <div className={styles.panel}>
          <div className={styles.sources}>
            <div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={onFile}
              />
              <button
                type="button"
                className={buttonClass("primary")}
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                Upload image
              </button>
            </div>

            <div className={styles.divider}>or</div>

            <form className={styles.urlRow} onSubmit={onUrl}>
              <input
                className={`${ui.input} ${styles.urlInput}`}
                type="url"
                inputMode="url"
                placeholder="https://example.com/photo.jpg"
                aria-label="Image URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button
                type="submit"
                className={buttonClass("secondary")}
                disabled={busy || !url.trim()}
              >
                {busy ? "Reading…" : "Extract from URL"}
              </button>
            </form>
          </div>

          {figma?.enabled && (
            <div className={styles.figma} aria-label="Figma import">
              <div className={styles.divider}>or from Figma</div>
              {figma.connected ? (
                <form className={styles.urlRow} onSubmit={onFigmaExtract}>
                  <input
                    className={`${ui.input} ${styles.urlInput}`}
                    type="text"
                    placeholder="Figma file URL or key"
                    aria-label="Figma file"
                    value={figmaFile}
                    onChange={(e) => setFigmaFile(e.target.value)}
                  />
                  <button
                    type="submit"
                    className={buttonClass("secondary")}
                    disabled={busy || !figmaFile.trim()}
                  >
                    {busy ? "Reading…" : "Extract from Figma"}
                  </button>
                  <button
                    type="button"
                    className={buttonClass("ghost")}
                    onClick={() => void onDisconnectFigma()}
                  >
                    Disconnect
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className={buttonClass("secondary")}
                  onClick={() => void onConnectFigma()}
                >
                  Connect Figma
                </button>
              )}
            </div>
          )}

          {pinterest?.enabled && (
            <div className={styles.figma} aria-label="Pinterest import">
              <div className={styles.divider}>or from Pinterest</div>
              {pinterest.connected ? (
                <>
                  <div className={styles.urlRow}>
                    <select
                      className={`${ui.input} ${styles.urlInput}`}
                      aria-label="Pinterest board"
                      value={board}
                      onChange={(e) => setBoard(e.target.value)}
                    >
                      <option value="">Pick a board…</option>
                      {(boards ?? []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={buttonClass("ghost")}
                      onClick={() => void onDisconnectPinterest()}
                    >
                      Disconnect
                    </button>
                  </div>
                  {board && (pins ?? []).length > 0 && (
                    <div className={styles.pins}>
                      {(pins ?? []).map((pin) => (
                        <button
                          key={pin.id}
                          type="button"
                          className={styles.pin}
                          disabled={busy}
                          onClick={() => void applyImageUrl(pin.image_url)}
                          aria-label="Extract colors from this pin"
                        >
                          <img src={pin.image_url} alt="" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  className={buttonClass("secondary")}
                  onClick={() => void onConnectPinterest()}
                >
                  Connect Pinterest
                </button>
              )}
            </div>
          )}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          {previewUrl && (
            <img className={styles.preview} src={previewUrl} alt="Selected source" />
          )}

          <label className={styles.countRow}>
            <span>Colors</span>
            <input
              type="range"
              min={MIN_COUNT}
              max={MAX_COUNT}
              value={count}
              disabled={busy}
              onChange={(e) => onCount(Number(e.target.value))}
            />
            <span className={styles.countValue}>{count}</span>
          </label>

          {colors.length > 0 && (
            <div className={styles.result}>
              <div className={styles.swatches}>
                {colors.map((color, i) => (
                  <div
                    key={`${color}-${i}`}
                    className={styles.swatch}
                    style={
                      { background: color, color: readableTextOn(color) } as CSSProperties
                    }
                  >
                    {color}
                  </div>
                ))}
              </div>
              <div>
                <button type="button" className={buttonClass("primary")} onClick={onEdit}>
                  Edit as palette
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
