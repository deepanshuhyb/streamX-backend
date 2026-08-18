import { Router } from "express";
import tmdbController from "../controllers/movieController.ts";
import animeController from "../controllers/animeController.ts";
import { cacheMiddleware } from "../middlewares/cache.ts";

const router = Router();
const cache = cacheMiddleware(600); // 10-minute cache TTL

router.get("/search", cache, tmdbController.searchGlobal);

router.get("/movies", cache, tmdbController.discoverMovies);
router.get("/tv", cache, tmdbController.discoverTV);

router.get("/movies/:id", cache, tmdbController.getMovieDetails);
router.get("/tv/:id", cache, tmdbController.getTVDetails);

router.get("/tv/:id/season/:seasonNumber", cache, tmdbController.getTVSeason);

router.get("/genres", cache, tmdbController.getGenres);

router.get("/trending", cache, tmdbController.getTrending);
router.get("/new-releases", cache, tmdbController.getNewReleases);

router.get("/person/:id", cache, tmdbController.getPerson);

// --- Anime (AniList) ---
router.get("/anime", cache, animeController.discoverAnime);
router.get("/anime/search", cache, animeController.searchAnime);
router.get("/anime/trending", cache, animeController.getAnimeTrending);
router.get("/anime/genres", cache, animeController.getAnimeGenres);
router.get("/anime/:id", cache, animeController.getAnimeDetails);
router.get("/anime/:id/episodes", cache, animeController.getAnimeEpisodes);

router.get("/test", (req, res) => {
  res.json({ message: "API is working!" });
});

export default router;
