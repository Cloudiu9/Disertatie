import { BrowserRouter, Routes, Route } from "react-router-dom";
import MoviesPage from "./pages/MoviePage";
import MovieDetailsPage from "./pages/MovieDetailsPage";
import Header from "./components/Header";
import HeroBanner from "./components/HeroBanner";

function App() {
  return (
    <BrowserRouter>
      <Header />

      {/* Offset for fixed header */}
      <main className="pt-16 bg-black min-h-screen">
        <HeroBanner />

        <Routes>
          <Route path="/" element={<MoviesPage />} />
          <Route path="/movies/:id" element={<MovieDetailsPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
