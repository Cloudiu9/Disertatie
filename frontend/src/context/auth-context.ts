import { createContext } from "react";

export type User = {
  _id: string;
  email: string;
  onboarding_complete?: boolean;
  preferred_genres?: string[];
  created_at?: string;
  last_login?: string | null;
};

export type MyListItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
};

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  myList: MyListItem[];
  refreshMyList: () => Promise<void>;
  addLocal: (item: MyListItem) => void;
  removeLocal: (item: MyListItem) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);
