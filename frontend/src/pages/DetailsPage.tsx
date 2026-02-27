import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import MovieRow from "../components/MovieRow";
import MovieMeta from "../components/MovieMeta";
import TrailerModal from "../components/TrailerModal";

import { fetchTrailer } from "../api/trailer";
import { addToMyList, removeFromMyList } from "../api/myList";

import { useAuth } from "../context/AuthContext";

import type { Movie } from "../types/Movie";
import type { TVShow } from "../types/TVShow";

import { toast } from "react-hot-toast";

const IMAGE_BASE = "https://image.tmdb.org/t/p";

type Props = {
  mediaType: "movie" | "tv";
};

type Item = Movie | TVShow;

function DetailsPage({ mediaType }: Props) {
  const { id } = useParams();

  const [item, setItem] = useState<Item | null>(null);

  const [loading, setLoading] = useState(true);

  const [recommendations, setRecommendations] = useState<Item[]>([]);

  const [inMyList, setInMyList] = useState(false);

  const { user } = useAuth();

  const [trailerKey, setTrailerKey] = useState<string | null>(null);

  const [trailerOpen, setTrailerOpen] = useState(false);

  const [loadingTrailer, setLoadingTrailer] = useState(false);

  const [prefetchedTrailer, setPrefetchedTrailer] = useState<string | null>(
    null,
  );

  const baseApi = mediaType === "tv" ? "/api/tv" : "/api/movies";

  const recApi = `/api/recommendations/${mediaType}`;

  // Load item

  useEffect(() => {
    if (!id) return;

    setLoading(true);

    fetch(`${baseApi}/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setItem(d);
        setLoading(false);
      });
  }, [id, mediaType]);

  // Recommendations

  useEffect(() => {
    if (!id) return;

    setRecommendations([]);

    fetch(`${recApi}/${id}`)
      .then((r) => r.json())
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, [id, mediaType]);

  // My list

  useEffect(() => {
    if (!item) return;

    fetch("/api/my-list", { credentials: "include" })
      .then((r) => r.json())
      .then((list: Movie[]) => {
        setInMyList(list.some((m) => m.tmdb_id === item.tmdb_id));
      })
      .catch(() => setInMyList(false));
  }, [item]);

  // Trailer prefetch

  useEffect(() => {
    if (!item) return;

    setPrefetchedTrailer(null);

    fetchTrailer(item.tmdb_id, mediaType)
      .then((d) => {
        if (d.key) setPrefetchedTrailer(d.key);
      })
      .catch(() => {});
  }, [item, mediaType]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading...
      </div>
    );

  if (!item)
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Not found
      </div>
    );

  const posterUrl = item.poster_path
    ? `${IMAGE_BASE}/w500${item.poster_path}`
    : "/placeholder-poster.png";

  const backdropUrl = item.backdrop_path
    ? `${IMAGE_BASE}/original${item.backdrop_path}`
    : undefined;

  async function playTrailer() {
    if (!item) return;

    setLoadingTrailer(true);

    try {
      let key = prefetchedTrailer;

      if (!key) {
        const d = await fetchTrailer(item.tmdb_id, mediaType);

        key = d.key;
      }

      if (!key) {
        toast.error("Trailer not available");

        return;
      }

      setTrailerKey(key);

      setTrailerOpen(true);
    } catch {
      toast.error("Trailer error");
    } finally {
      setLoadingTrailer(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div
        className="relative h-[80vh] w-full bg-cover bg-center"
        style={{
          backgroundImage: backdropUrl ? `url(${backdropUrl})` : undefined,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />

        <div className="relative z-10 mx-auto flex h-full max-w-screen-2xl items-end px-6 pb-12">
          <div className="flex gap-8">
            <img src={posterUrl} className="w-[220px] rounded-lg shadow-xl" />

            <div className="max-w-2xl">
              <h1 className="text-4xl font-extrabold mb-3">{item.title}</h1>

              <div className="text-gray-300 mb-3">
                <MovieMeta year={item.year} rating={item.rating} />
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {item.genres.map((g) => (
                  <span
                    key={g}
                    className="bg-white/10 px-2 py-1 rounded text-sm"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {item.overview && (
                <p className="text-gray-200 max-w-xl">{item.overview}</p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={playTrailer}
                  className="bg-white text-black px-6 py-2 rounded font-semibold"
                >
                  {loadingTrailer ? "Loading" : "Play"}
                </button>

                <button
                  onClick={async () => {
                    if (!user) {
                      toast.error("Login required");

                      return;
                    }

                    try {
                      if (inMyList) {
                        await removeFromMyList(item.tmdb_id);

                        setInMyList(false);

                        toast.success("Removed");
                      } else {
                        await addToMyList(item.tmdb_id);

                        setInMyList(true);

                        toast.success("Added");
                      }
                    } catch {
                      toast.error("Action failed");
                    }
                  }}
                  className="bg-white/20 px-5 py-2 rounded font-semibold"
                >
                  {inMyList ? "✓ In My List" : "+ My List"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {recommendations.length > 0 && (
        <MovieRow
          title="Recommended"
          movies={recommendations.filter((r) => r.tmdb_id !== item.tmdb_id)}
          disableFetch
          mediaType={mediaType}
          variant="recommendation"
        />
      )}

      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <Link to="/" className="text-gray-400 hover:text-white">
          ← Back
        </Link>
      </div>

      {trailerOpen && (
        <TrailerModal
          videoKey={trailerKey}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </div>
  );
}

export default DetailsPage;
