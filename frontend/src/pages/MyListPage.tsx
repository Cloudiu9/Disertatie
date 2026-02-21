import { useEffect, useState } from "react";
import type { Movie } from "../types/Movie";
import { fetchMyList } from "../api/myList";
import MovieRow from "../components/MovieRow";
import { removeFromMyList } from "../api/myList";
import { toast } from "react-hot-toast";

function MyListPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyList()
      .then(setMovies)
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (tmdb_id: number) => {
    try {
      await removeFromMyList(tmdb_id);

      setMovies((prev) => prev.filter((m) => m.tmdb_id !== tmdb_id));

      toast.success("Removed from My List");
    } catch {
      toast.error("Remove failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Your List is Empty
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            Start by logging in and add movies to build your personalized
            collection
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="pt-24 pb-12">
        <div className="px-8 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            My List
          </h1>
          <p className="text-gray-400 text-lg">
            {movies.length} {movies.length === 1 ? "movie" : "movies"}
          </p>
        </div>
        <MovieRow
          title=""
          movies={movies}
          disableFetch
          onRemove={handleRemove}
        />
      </div>
    </div>
  );
}

export default MyListPage;
