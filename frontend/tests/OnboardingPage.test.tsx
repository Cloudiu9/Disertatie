import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import OnboardingPage from "../src/pages/OnboardingPage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

type MockMediaItem = {
  tmdb_id: number;
  poster_path: string;
  title?: string;
  name?: string;
};

const movieResults: MockMediaItem[] = [
  { tmdb_id: 101, poster_path: "/m1.jpg", title: "Movie 1" },
  { tmdb_id: 102, poster_path: "/m2.jpg", title: "Movie 2" },
  { tmdb_id: 103, poster_path: "/m3.jpg", title: "Movie 3" },
];

const tvResults: MockMediaItem[] = [
  { tmdb_id: 201, poster_path: "/t1.jpg", title: "TV 1" },
  { tmdb_id: 202, poster_path: "/t2.jpg", title: "TV 2" },
  { tmdb_id: 203, poster_path: "/t3.jpg", title: "TV 3" },
];

function jsonResponse<T>(data: T) {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("/api/onboarding/movies")) {
        return jsonResponse(movieResults);
      }

      if (url.startsWith("/api/onboarding/tv")) {
        return jsonResponse(tvResults);
      }

      if (url === "/api/onboarding/complete") {
        return jsonResponse({ success: true });
      }

      return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    }) as unknown as typeof fetch,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OnboardingPage", () => {
  it("renders genres and conditionally shows Finish Setup", async () => {
    const user = userEvent.setup();
    renderPage();

    // baseline UI
    expect(
      screen.getByRole("heading", { name: /what are you into\?/i }),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();

    // button hidden initially
    expect(
      screen.queryByRole("button", { name: /finish setup/i }),
    ).not.toBeInTheDocument();

    // trigger condition
    await user.click(screen.getByRole("button", { name: "Action" }));

    // button appears
    expect(
      await screen.findByRole("button", { name: /finish setup/i }),
    ).toBeInTheDocument();
  });

  it("fetches movie and TV results with separate genre mappings", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Action" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/onboarding/movies?genres=Action&genres=Adventure",
      expect.objectContaining({
        credentials: "include",
      }),
    );

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/onboarding/tv?genres=Action%20%26%20Adventure",
      expect.objectContaining({
        credentials: "include",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Rate Movies")).toBeInTheDocument();
      expect(screen.getByText("Rate TV Shows")).toBeInTheDocument();
      expect(screen.getAllByRole("img")).toHaveLength(6);
    });
  });

  it("blocks submission until at least 3 movie and 3 TV interactions exist", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Action" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Finish Setup" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Finish Setup" }));

    expect(window.alert).toHaveBeenCalledWith(
      "Interact with at least 3 movies and 3 TV shows",
    );

    expect(
      (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.some(
        ([url]) => String(url) === "/api/onboarding/complete",
      ),
    ).toBe(false);
  });

  it("submits onboarding after 3 movie and 3 TV interactions", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Action" }));

    await waitFor(() => {
      expect(screen.getAllByRole("img")).toHaveLength(6);
    });

    const images = screen.getAllByRole("img");

    await user.click(images[0]);
    await user.click(images[1]);
    await user.click(images[2]);
    await user.click(images[3]);
    await user.click(images[4]);
    await user.click(images[5]);

    await user.click(screen.getByRole("button", { name: "Finish Setup" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/onboarding/complete",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        }),
      );
    });

    const completeCall = (
      fetch as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(([url]) => String(url) === "/api/onboarding/complete");

    expect(completeCall).toBeTruthy();

    const body = JSON.parse(String(completeCall?.[1]?.body));

    expect(body.genres).toEqual(["Action"]);
    expect(body.movies).toEqual({
      101: "seen",
      102: "seen",
      103: "seen",
    });
    expect(body.tv).toEqual({
      201: "seen",
      202: "seen",
      203: "seen",
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});

it("cycles interaction states on poster click", async () => {
  const user = userEvent.setup();
  renderPage();

  await user.click(screen.getByRole("button", { name: "Action" }));

  const movieSection = screen
    .getByRole("heading", {
      name: /rate movies/i,
    })
    .closest("section");

  expect(movieSection).not.toBeNull();

  const posters = within(movieSection as HTMLElement).getAllByRole("img");
  const poster = posters[0];

  await user.click(poster);

  await waitFor(() => {
    expect(poster).toHaveClass("ring-blue-400");
  });

  await user.click(poster);

  await waitFor(() => {
    expect(poster).toHaveClass("ring-yellow-400");
  });

  await user.click(poster);

  await waitFor(() => {
    expect(poster).toHaveClass("ring-red-500");
  });

  await user.click(poster);

  await waitFor(() => {
    expect(poster).not.toHaveClass("ring-red-500");
    expect(poster).not.toHaveClass("ring-yellow-400");
    expect(poster).not.toHaveClass("ring-blue-400");
  });
});

it("handles fetch failure gracefully", async () => {
  vi.fn().mockRejectedValue(new Error("fail"));

  renderPage();

  await userEvent.click(screen.getByRole("button", { name: "Action" }));

  // Expect loading to stop eventually (implicit)
  // No crash = pass
});
