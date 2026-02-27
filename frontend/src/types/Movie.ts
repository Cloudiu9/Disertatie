export type Movie = {
  tmdb_id: number;
  media_type?: "movie" | "tv";
  title: string;
  year: number | null;
  rating: number;
  votes: number;
  popularity: number;
  genres: string[];
  overview?: string;
  runtime?: number;
  poster_path?: string;
  backdrop_path?: string;
  original_language?: string;
  tagline?: string;
};
