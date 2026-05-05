import { Router } from "express";
import tmdbController from "../controllers/movieController.ts";
import animeController from "../controllers/animeController.ts";

const router = Router();

router.get("/search", tmdbController.searchGlobal);

router.get("/movies", tmdbController.discoverMovies);
router.get("/tv", tmdbController.discoverTV);

router.get("/movies/:id", tmdbController.getMovieDetails);
router.get("/tv/:id", tmdbController.getTVDetails);

router.get("/tv/:id/season/:seasonNumber", tmdbController.getTVSeason);

router.get("/genres", tmdbController.getGenres);

router.get("/trending", tmdbController.getTrending);

router.get("/person/:id", tmdbController.getPerson);

// --- Anime (AniList) ---
router.get("/anime", animeController.discoverAnime);
router.get("/anime/search", animeController.searchAnime);
router.get("/anime/trending", animeController.getAnimeTrending);
router.get("/anime/genres", animeController.getAnimeGenres);
router.get("/anime/:id", animeController.getAnimeDetails);
router.get("/anime/:id/episodes", animeController.getAnimeEpisodes);

router.get("/test", (req, res) => {
  res.json({ message: "API is working!" });
});

export default router;
