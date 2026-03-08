import { Router } from "express";
import tmdbController from "../controllers/movieController.ts";

const router = Router();

// 1. Global Search
router.get("/search", tmdbController.searchGlobal);

// 2. Movies & TV Shows Discovery (with Pagination)
router.get("/movies", tmdbController.discoverMovies);
router.get("/tv", tmdbController.discoverTV);

// 3. Media Details API
router.get("/movies/:id", tmdbController.getMovieDetails);
router.get("/tv/:id", tmdbController.getTVDetails);

// 4. TV Show Episodes API
router.get("/tv/:id/season/:seasonNumber", tmdbController.getTVSeason);

// 5. Home Page Trending API
router.get("/trending", tmdbController.getTrending);

router.get("/test", (req, res) => {
  res.json({ message: "API is working!" });
});

export default router;
