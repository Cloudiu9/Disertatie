import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Header from "./components/Header";
import MoviesPage from "./pages/MoviesPage";
import MyListPage from "./pages/MyListPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { AuthProvider } from "./context/AuthContext";
import ProfilePage from "./pages/ProfilePage";
import TVPage from "./pages/TVPage";
import DetailsPage from "./pages/DetailsPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          containerStyle={{
            top: 80,
          }}
          toastOptions={{
            duration: 3000,
            style: {
              background: "#111",
              color: "#fff",
              border: "1px solid #333",
            },
          }}
        />
        <Header />
        <Routes>
          <Route path="/" element={<MoviesPage />} />
          <Route
            path="/movies/:id"
            element={<DetailsPage mediaType="movie" />}
          />
          <Route path="/tv" element={<TVPage />} />
          <Route path="/tv/:id" element={<DetailsPage mediaType="tv" />} />
          <Route path="/my-list" element={<MyListPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
