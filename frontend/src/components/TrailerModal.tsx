import { useEffect, useRef, useState } from "react";

type Props = {
  videoKey: string | null;
  onClose: () => void;
};

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function TrailerModal({ videoKey, onClose }: Props) {
  const playerRef = useRef<any>(null);

  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!videoKey) return;

    document.body.style.overflow = "hidden";

    setVisible(true);
    setReady(false);

    function createPlayer() {
      playerRef.current = new window.YT.Player("yt-player", {
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

    // API already loaded
    if (window.YT && window.YT.Player) {
      createPlayer();
    }

    // Need API
    else {
      const script = document.createElement("script");

      script.src = "https://www.youtube.com/iframe_api";

      document.body.appendChild(script);

      window.onYouTubeIframeAPIReady = createPlayer;
    }

    function handleKey(e: KeyboardEvent) {
      if (e.code === "Escape") close();

      if (e.code === "Space") {
        e.preventDefault();

        if (!playerRef.current) return;

        const state = playerRef.current.getPlayerState();

        if (state === 1) playerRef.current.pauseVideo();
        else playerRef.current.playVideo();
      }
    }

    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = "auto";

      window.removeEventListener("keydown", handleKey);

      if (playerRef.current) {
        playerRef.current.destroy();

        playerRef.current = null;
      }
    };
  }, [videoKey]);

  function close() {
    setVisible(false);

    setTimeout(onClose, 150);
  }

  if (!videoKey) return null;

  return (
    <div
      className={`
fixed inset-0 z-50
flex items-center justify-center
bg-black/95
transition-opacity duration-150
${visible ? "opacity-100" : "opacity-0"}
`}
      onClick={close}
    >
      <div
        className="
relative
w-[90vw]
max-w-[1800px]
px-6
"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="
absolute
-top-12
right-4
text-white
text-4xl
cursor-pointer
hover:text-gray-300
"
        >
          ×
        </button>

        <div
          className="
aspect-video
rounded-xl
overflow-hidden
shadow-2xl
bg-black
"
        >
          {/* Spinner */}

          {!ready && (
            <div
              className="
absolute
inset-0
flex
items-center
justify-center
"
            >
              <div
                className="
w-14 h-14
border-4
border-white/30
border-t-white
rounded-full
animate-spin
"
              />
            </div>
          )}

          <div
            id="yt-player"
            className="
w-full
h-full
"
          />
        </div>
      </div>
    </div>
  );
}

export default TrailerModal;
