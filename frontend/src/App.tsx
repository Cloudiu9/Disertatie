import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import MoviesPage from "./pages/MoviePage";
import MovieDetailsPage from "./pages/MovieDetailsPage";

function App() {
  return (
    <BrowserRouter>
      <Header />

      <main className="pt-16">
        <Routes>
          <Route path="/" element={<MoviesPage />} />
          <Route path="/movies/:id" element={<MovieDetailsPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
