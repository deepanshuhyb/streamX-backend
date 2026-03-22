import { Router } from "express";
import tmdbController from "../controllers/movieController.ts";

const router = Router();

router.get("/search", tmdbController.searchGlobal);

router.get("/movies", tmdbController.discoverMovies);
router.get("/tv", tmdbController.discoverTV);

router.get("/movies/:id", tmdbController.getMovieDetails);
router.get("/tv/:id", tmdbController.getTVDetails);

router.get("/tv/:id/season/:seasonNumber", tmdbController.getTVSeason);

router.get("/trending", tmdbController.getTrending);

router.get("/test", (req, res) => {
  res.json({ message: "API is working!" });
});

export default router;
