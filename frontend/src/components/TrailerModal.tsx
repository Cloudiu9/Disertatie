import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

type Props = {
  videoKey: string | null;
  onClose: () => void;
};

interface YTPlayerInstance {
  destroy: () => void;
  getPlayerState: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
}

interface YTNamespace {
  Player: new (
    element: HTMLDivElement,
    options: {
      videoId: string;
      playerVars?: {
        autoplay?: number;
        controls?: number;
        rel?: number;
        modestbranding?: number;
      };
      events?: {
        onReady?: () => void;
      };
    },
  ) => YTPlayerInstance;
}

declare global {
  interface Window {
    YT: YTNamespace;
    onYouTubeIframeAPIReady: () => void;
  }
}

function TrailerModal({ videoKey, onClose }: Props) {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  // Eliminate cascading renders by updating state during render execution
  const [prevVideoKey, setPrevVideoKey] = useState<string | null>(null);
  if (videoKey !== prevVideoKey) {
    setPrevVideoKey(videoKey);
    setReady(false);
    setVisible(false);
  }

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 150);
  }, [onClose]);

  // Keep a stable reference of close to prevent tearing down listeners or players
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  // Handle CSS transition entry cleanly using browser frame animation cycles
  useEffect(() => {
    if (videoKey) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [videoKey]);

  // This hook now strictly runs ONLY when videoKey targets alter
  useEffect(() => {
    if (!videoKey) return;

    document.body.style.overflow = "hidden";

    function createPlayer() {
      if (!window.YT || !window.YT.Player || !videoKey || !mountRef.current)
        return;

      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId: videoKey,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            setReady(true);
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
      }
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      document.body.style.overflow = "auto";
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoKey]);

  // Separate keyboard event hook so it can re-bind without touching the media iframe container
  useEffect(() => {
    if (!videoKey) return;

    function handleKey(e: KeyboardEvent) {
      if (e.code === "Escape") closeRef.current();

      if (e.code === "Space") {
        e.preventDefault();
        if (!playerRef.current) return;

        const state = playerRef.current.getPlayerState();
        if (state === 1) playerRef.current.pauseVideo();
        else playerRef.current.playVideo();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [videoKey]);

  if (!videoKey) return null;

  return createPortal(
    <div
      className={`
        fixed inset-0 z-99999
        flex items-center justify-center p-4 md:p-10
        bg-black/95
        transition-opacity duration-150 ease-out
        ${visible ? "opacity-100" : "opacity-0"}
      `}
      onClick={close}
    >
      <div
        className="relative aspect-video w-[90vw] max-w-[160vh] max-h-[80vh] rounded-xl bg-black shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="
            absolute top-4 right-4 z-30
            flex h-10 w-10 cursor-pointer items-center 
            justify-center rounded-full bg-black/40 text-2xl 
            text-white backdrop-blur-sm transition-colors hover:bg-black/70
          "
        >
          &times;
        </button>

        {!ready && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          </div>
        )}

        <div className="absolute inset-0 h-full w-full z-10">
          <div ref={mountRef} className="h-full w-full" />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default TrailerModal;
