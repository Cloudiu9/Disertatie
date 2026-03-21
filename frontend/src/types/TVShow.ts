export type TVShow = {
  tmdb_id: number;
  media_type?: "movie" | "tv";
  title: string;
  year: number | null;
  rating: number;
  votes: number;
  popularity: number;
  genres: string[];
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  original_language?: string;
  tagline?: string;
  seasons?: number;
  episodes?: number;
  runtime?: number;
};
