import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MovieCard from "../src/components/MovieCard";
import type { Movie } from "../src/types/Movie";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseMovie: Movie = {
  tmdb_id: 42,
  title: "Test Movie",
  poster_path: "/test-poster.jpg",
  year: null,
  rating: 0,
  votes: 0,
  popularity: 0,
  genres: [],
};

const movieWithoutPoster: Movie = {
  tmdb_id: 99,
  title: "No Poster Movie",
  poster_path: undefined,
  year: null,
  rating: 0,
  votes: 0,
  popularity: 0,
  genres: [],
};

function renderCard(
  props: Partial<React.ComponentProps<typeof MovieCard>> = {},
) {
  return render(
    <MemoryRouter>
      <MovieCard movie={baseMovie} mediaType="movie" {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("rendering", () => {
  it("renders the poster image with the correct src", () => {
    renderCard();
    const img = screen.getByRole("img", { name: /test movie/i });
    expect(img).toHaveAttribute(
      "src",
      "https://image.tmdb.org/t/p/w500/test-poster.jpg",
    );
  });

  it("falls back to placeholder when poster_path is null", () => {
    renderCard({ movie: movieWithoutPoster });
    const img = screen.getByRole("img", { name: /no poster movie/i });
    expect(img).toHaveAttribute("src", "/placeholder-poster.png");
  });

  it("uses the movie title as the image alt text", () => {
    renderCard();
    expect(screen.getByAltText("Test Movie")).toBeInTheDocument();
  });

  it("does not render a remove button when onRemove is not provided", () => {
    renderCard();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a remove button when onRemove is provided", () => {
    renderCard({ onRemove: vi.fn() });
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("navigation", () => {
  it("navigates to the movie detail page on click", async () => {
    const user = userEvent.setup();
    renderCard({ mediaType: "movie" });
    await user.click(screen.getByAltText("Test Movie").closest("div")!);
    expect(mockNavigate).toHaveBeenCalledWith("/movies/42");
  });

  it("navigates to the TV detail page when mediaType is tv", async () => {
    const user = userEvent.setup();
    renderCard({ mediaType: "tv" });
    await user.click(screen.getByAltText("Test Movie").closest("div")!);
    expect(mockNavigate).toHaveBeenCalledWith("/tv/42");
  });

  it("does not navigate when didDrag ref is true", async () => {
    const user = userEvent.setup();
    const didDrag = { current: true };
    renderCard({ didDrag });
    await user.click(screen.getByAltText("Test Movie").closest("div")!);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("navigates normally when didDrag ref is false", async () => {
    const user = userEvent.setup();
    const didDrag = { current: false };
    renderCard({ didDrag, mediaType: "movie" });
    await user.click(screen.getByAltText("Test Movie").closest("div")!);
    expect(mockNavigate).toHaveBeenCalledWith("/movies/42");
  });
});

// ─── Remove button ────────────────────────────────────────────────────────────

describe("remove button", () => {
  it("calls onRemove with the correct tmdb_id and mediaType", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn().mockResolvedValue(undefined);
    renderCard({ onRemove, mediaType: "movie" });
    await user.click(screen.getByRole("button"));
    expect(onRemove).toHaveBeenCalledWith(42, "movie");
  });

  it("calls onRemove with mediaType tv when applicable", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn().mockResolvedValue(undefined);
    renderCard({ onRemove, mediaType: "tv" });
    await user.click(screen.getByRole("button"));
    expect(onRemove).toHaveBeenCalledWith(42, "tv");
  });

  it("does not trigger navigation when the remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn().mockResolvedValue(undefined);
    renderCard({ onRemove, mediaType: "movie" });
    await user.click(screen.getByRole("button"));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ─── Variants ─────────────────────────────────────────────────────────────────

describe("variant size classes", () => {
  const variants = ["default", "compact", "recommendation", "list"] as const;

  variants.forEach((variant) => {
    it(`renders without crashing for variant="${variant}"`, () => {
      renderCard({ variant });
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });
});

it("falls back if image fails to load", () => {
  renderCard();

  const img = screen.getByRole("img");

  img.dispatchEvent(new Event("error"));

  expect(img).toHaveAttribute("src", "/placeholder-poster.png");
});

it("has accessible role and alt text", () => {
  renderCard();

  const img = screen.getByRole("img", { name: /test movie/i });
  expect(img).toBeInTheDocument();
});
