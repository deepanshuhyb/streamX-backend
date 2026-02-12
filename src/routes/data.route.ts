import { Router } from "express";
import tmdbController from "../controllers/movieController.ts";

const router = Router();

// Combined search across movies & tv: GET /api/search/all?query=...
router.get("/search/all", tmdbController.searchAll);
router.get("/test", (req, res) => {
  res.json({ message: "API is working!" });
});

// Search movies route: GET /api/search/movies?query=...
router.get("/search/movies", tmdbController.searchMovies);

// Search tv (webseries) route: GET /api/search/tv?query=...
router.get("/search/tv", tmdbController.searchTV);

// Movie details route: GET /api/movies/:id
router.get("/movies/:id", tmdbController.getMovieDetails);

// TV details route: GET /api/tv/:id
router.get("/tv/:id", tmdbController.getTVDetails);

export default router;
