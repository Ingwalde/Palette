import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastProvider";
import { fetchImageBlob } from "../api/imports";
import { extractColorsFromBlob } from "../lib/imageColors";
import { readableTextOn } from "../lib/color";
import { ApiError } from "../lib/http";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";
import * as styles from "./ImportPage.css";

const DEFAULT_COUNT = 6;
const MIN_COUNT = 3;
const MAX_COUNT = 8;

export function ImportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [url, setUrl] = useState("");
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [colors, setColors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  // The last decoded image, kept so changing the colour count re-quantises without re-fetching.
  const sourceBlob = useRef<Blob | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

  const onUrl = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const blob = await fetchImageBlob(trimmed);
      applyBlob(blob);
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError ? err.message : "Could not fetch that image");
    }
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

  if (!isAuthenticated) return null;

  return (
    <>
      <section className={`${ui.section} ${ui.pageHero}`}>
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
