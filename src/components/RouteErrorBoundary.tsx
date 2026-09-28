import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches render errors under the route Suspense, and specifically the one that
 * code-splitting introduced.
 *
 * WHY THIS EXISTS. Until `React.lazy` was added to `App.tsx` the app shipped as
 * a single bundle: if it loaded at all, every route was already in memory and a
 * chunk could not fail. Splitting the clinical app out of the landing bundle
 * traded that for a new failure — a route whose chunk 404s or times out throws
 * during render, and with no boundary above it React unmounts the entire tree.
 * The visible symptom is not an error. It is a blank page, or a nav button that
 * appears to do nothing. Adding lazy routes without this was a defect.
 *
 * THE COMMON CAUSE IS A DEPLOY, NOT A BUG. Chunk filenames carry a content
 * hash. A browser holding a cached `index.html` from the previous deploy asks
 * for hashes that no longer exist, every request 404s, and the app looks broken
 * to exactly the people who visited before — which on a demo day is everyone
 * who was shown it early. One reload fixes it, because the reload fetches the
 * new `index.html`.
 *
 * So a chunk error reloads once, guarded by a `sessionStorage` flag so a genuine
 * persistent failure cannot loop. Anything else, and the second occurrence of a
 * chunk error, renders a real message instead of nothing.
 *
 * This is deliberately NOT a general "something went wrong" wrapper around the
 * app. It sits under the router and above the routes, so an error in a page
 * cannot take out the nav, and it names what actually happened rather than
 * swallowing it.
 */

const RELOAD_FLAG = "kx:chunk-reload";

/**
 * Vite emits `Failed to fetch dynamically imported module` (Chrome/Safari) or
 * `error loading dynamically imported module` (Firefox); older bundlers threw
 * `ChunkLoadError`. Match on shape rather than one browser's wording.
 */
function isChunkLoadError(error: Error): boolean {
  const text = `${error.name} ${error.message}`.toLowerCase();
  return (
    text.includes("chunkloaderror") ||
    text.includes("dynamically imported module") ||
    text.includes("failed to fetch dynamically") ||
    text.includes("importing a module script failed")
  );
}

/** sessionStorage throws in storage-blocked browsers; never let that be the error. */
function readFlag(): boolean {
  try {
    return window.sessionStorage.getItem(RELOAD_FLAG) === "1";
  } catch {
    return false;
  }
}

function writeFlag(): boolean {
  try {
    window.sessionStorage.setItem(RELOAD_FLAG, "1");
    return true;
  } catch {
    // Storage blocked. Reloading anyway risks a loop we cannot detect, so don't:
    // show the message and let the person choose.
    return false;
  }
}

export function clearChunkReloadFlag() {
  try {
    window.sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* nothing to clear */
  }
}

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  isChunkError: boolean;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Left in on purpose. This is the one class of failure where the person
    // reporting it cannot see anything, so the console is the only evidence.
    console.error("[route] render failed", error, info.componentStack);

    if (isChunkLoadError(error) && !readFlag() && writeFlag()) {
      window.location.reload();
    }
  }

  private reset = () => {
    clearChunkReloadFlag();
    window.location.reload();
  };

  render() {
    const { error, isChunkError } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-kx-canvas text-kx-ink flex items-center justify-center px-8">
        <div className="max-w-md w-full text-center">
          <h1 className="font-display text-[26px] tracking-[-0.01em] mb-3">
            {isChunkError ? "This page didn't finish loading" : "Something broke on this page"}
          </h1>
          <p className="text-[15px] text-kx-muted leading-relaxed mb-2">
            {isChunkError
              ? "Part of the app failed to download. This usually means a new version shipped while your browser was holding the old one — a reload picks it up."
              : "The page hit an error while rendering. Nothing was saved or changed."}
          </p>
          <p className="font-mono text-[12px] text-kx-muted/80 mb-8 break-words">{error.message}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.reset}
              className="px-6 py-2.5 rounded-[10px] bg-kx-accent3 text-white hover:opacity-90 transition-opacity text-[14px] font-medium"
            >
              Reload
            </button>
            <a
              href="/"
              className="px-6 py-2.5 rounded-[10px] border border-kx-border text-kx-muted hover:text-kx-ink hover:border-kx-muted transition-colors text-[14px] font-medium"
            >
              Back to start
            </a>
          </div>
        </div>
      </div>
    );
  }
}
