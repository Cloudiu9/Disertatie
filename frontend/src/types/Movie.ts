export type Movie = {
  tmdb_id: number;
  title: string;
  year: number | null;
  rating: number;
  votes: number;
  popularity: number;
  genres: string[];
  overview?: string;
  runtime?: number;
  poster_path?: string;
};
