import axios from "axios";
import https from "https";
import type { Request, Response } from "express";

// Create a stable agent
const httpsAgent = new https.Agent({
  family: 4, // Force IPv4
  rejectUnauthorized: false, // Skip SSL issues if they are causing the reset (DEBUG)
});

// Configure axios defaults
axios.defaults.httpsAgent = httpsAgent;
axios.defaults.timeout = 15000;

const TMDB_BASE = "https://api.themoviedb.org/3";

/**
 * Returns today's date as YYYY-MM-DD string (UTC).
 */
const getTodayDateString = (): string => {
  return new Date().toISOString().split("T")[0];
};

/**
 * Check whether a media item should be visible.
 * Hidden if: release date is in the future OR before 1970-01-01.
 * Items with no date at all are kept (can't determine, so show them).
 */
const ALLOWED_UNRELEASED_IDS = [980431];

const isReleasedAndModern = (item: any): boolean => {
  if (ALLOWED_UNRELEASED_IDS.includes(item.id)) return true;

  // Block specific known problem shows (e.g., The Daily Show, Watch What Happens Live)
  const BLOCKED_IDS = [2224, 22980];
  if (BLOCKED_IDS.includes(item.id)) return false;

  // Filter out Talk (10767) and News (10763) genres
  if (item.genre_ids && Array.isArray(item.genre_ids)) {
    if (item.genre_ids.includes(10767) || item.genre_ids.includes(10763))
      return false;
  }
  if (item.genres && Array.isArray(item.genres)) {
    if (item.genres.some((g: any) => g.id === 10767 || g.id === 10763))
      return false;
  }

  const dateStr: string | undefined = item.release_date || item.first_air_date;
  if (!dateStr) return true; // no date → keep it
  const year = Number(dateStr.substring(0, 4));
  if (isNaN(year) || year < 1970) return false; // pre-1970 → hide
  if (dateStr > getTodayDateString()) return false; // future → hide
  return true;
};

const getAuthHeaders = (): Record<string, string> => {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN || process.env.TMDB_KEY;
  if (!token) return {};
  if (process.env.TMDB_API_READ_ACCESS_TOKEN) {
    return {
      Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
    };
  }
  return {};
};

const getImageUrl = (
  path: string | null | undefined,
  size: string = "w500",
): string => {
  if (!path)
    return "https://via.placeholder.com/500x750?text=No+Image+Available";
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

const formatMediaItem = (item: any, defaultType: string = "movie") => {
  const isTv = item.media_type === "tv" || defaultType === "tv";
  return {
    id: item.id || Math.random().toString(),
    title: item.title || item.name || "Unknown Title",
    type: isTv ? "tv" : "movie",
    rating: item.vote_average ? Number(item.vote_average).toFixed(1) : "N/A",
    image: getImageUrl(item.poster_path || item.backdrop_path, "w500"),
  };
};

const fetchWithRetry = async (
  url: string,
  params: any,
  headers: any,
  retries = 10,
): Promise<any> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      // Use the local agent explicitly to ensure family: 4 is applied
      return await axios.get(url, { params, headers, httpsAgent });
    } catch (err: any) {
      lastError = err;
      console.warn(`TMDB Request Fail (${i + 1}/${retries}): ${err.message}`);
      if (err.message.includes("401") || err.message.includes("404")) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // Wait 1s, 2s, 3s...
    }
  }
  throw lastError;
};

const GENRE_MAP: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  "science fiction": 878,
  "sci-fi": 878,
  "tv movie": 10770,
  thriller: 53,
  war: 10752,
  western: 37,
  "action & adventure": 10759,
  kids: 10762,
  news: 10763,
  reality: 10764,
  "sci-fi & fantasy": 10765,
  soap: 10766,
  talk: 10767,
  "war & politics": 10768,
};

// Canonical genre lists exposed to the frontend
const MOVIE_GENRES = [
  { id: 28, name: "Action", slug: "action" },
  { id: 12, name: "Adventure", slug: "adventure" },
  { id: 16, name: "Animation", slug: "animation" },
  { id: 35, name: "Comedy", slug: "comedy" },
  { id: 80, name: "Crime", slug: "crime" },
  { id: 99, name: "Documentary", slug: "documentary" },
  { id: 18, name: "Drama", slug: "drama" },
  { id: 10751, name: "Family", slug: "family" },
  { id: 14, name: "Fantasy", slug: "fantasy" },
  { id: 36, name: "History", slug: "history" },
  { id: 27, name: "Horror", slug: "horror" },
  { id: 10402, name: "Music", slug: "music" },
  { id: 9648, name: "Mystery", slug: "mystery" },
  { id: 10749, name: "Romance", slug: "romance" },
  { id: 878, name: "Science Fiction", slug: "science fiction" },
  { id: 53, name: "Thriller", slug: "thriller" },
  { id: 10752, name: "War", slug: "war" },
  { id: 37, name: "Western", slug: "western" },
  { id: 10770, name: "TV Movie", slug: "tv movie" },
];

const TV_GENRES = [
  { id: 10759, name: "Action & Adventure", slug: "action & adventure" },
  { id: 16, name: "Animation", slug: "animation" },
  { id: 35, name: "Comedy", slug: "comedy" },
  { id: 80, name: "Crime", slug: "crime" },
  { id: 99, name: "Documentary", slug: "documentary" },
  { id: 18, name: "Drama", slug: "drama" },
  { id: 10751, name: "Family", slug: "family" },
  { id: 10762, name: "Kids", slug: "kids" },
  { id: 9648, name: "Mystery", slug: "mystery" },
  { id: 10764, name: "Reality", slug: "reality" },
  { id: 10765, name: "Sci-Fi & Fantasy", slug: "sci-fi & fantasy" },
  { id: 10766, name: "Soap", slug: "soap" },
  { id: 10768, name: "War & Politics", slug: "war & politics" },
  { id: 37, name: "Western", slug: "western" },
];

const fetchPaginatedFromTmdb = async (
  endpoint: string,
  page: number,
  limit: number = 24,
  type: string = "movie",
  extraParams: any = {},
) => {
  // To avoid duplicates caused by filtering shifting the pagination window,
  // map each frontend page to 2 disjoint TMDB pages.
  // Frontend Page 1 -> TMDB Pages 1 & 2
  // Frontend Page 2 -> TMDB Pages 3 & 4
  const tmdbStartPage = page * 2 - 1;
  const tmdbEndPage = page * 2;

  const headers = getAuthHeaders();
  const baseParams: any = { include_adult: false, ...extraParams };
  if (!headers.Authorization && process.env.TMDB_KEY) {
    baseParams.api_key = process.env.TMDB_KEY;
  }

  // Fetch both pages concurrently
  const pagePromises = [tmdbStartPage, tmdbEndPage].map((p) =>
    fetchWithRetry(
      `${TMDB_BASE}/${endpoint}`,
      { ...baseParams, page: p },
      headers,
    ),
  );

  const responses = await Promise.all(pagePromises);

  let allResults: any[] = [];
  let totalResults = 0;

  for (const res of responses) {
    allResults = allResults.concat(res.data.results || []);
    if (res.data.total_results && res.data.total_results > totalResults) {
      totalResults = res.data.total_results;
    }
  }

  const uniqueKeys = new Set();
  const dedupedResults = [];
  for (const item of allResults) {
    if (!uniqueKeys.has(item.id)) {
      uniqueKeys.add(item.id);
      dedupedResults.push(item);
    }
  }

  const filteredResults = dedupedResults
    .filter((item: any) => item.media_type !== "person")
    .filter((item: any) => item.poster_path)
    .filter(isReleasedAndModern);

  const slicedResults = filteredResults.slice(0, limit);

  const logicalTotalPages = Math.ceil(totalResults / 20 / 2) || 1;

  return {
    results: slicedResults.map((item) =>
      formatMediaItem(item, item.media_type || type),
    ),
    total_pages: logicalTotalPages,
  };
};

const searchGlobal = async (req: Request, res: Response): Promise<void> => {
  const query = (req.query.q as string) || (req.query.query as string);
  if (!query) {
    res.status(200).json({ results: [] });
    return;
  }
  try {
    const headers = getAuthHeaders();
    const params: any = { query, include_adult: false, page: 1 };
    if (!headers.Authorization && process.env.TMDB_KEY)
      params.api_key = process.env.TMDB_KEY;
    const { data } = await fetchWithRetry(
      `${TMDB_BASE}/search/multi`,
      params,
      headers,
    );
    const filtered = (data.results || [])
      .filter((item: any) => item.media_type !== "person")
      .filter((item: any) => item.poster_path)
      .filter(isReleasedAndModern);
    const sorted = filtered.sort(
      (a: any, b: any) => (b.popularity || 0) - (a.popularity || 0),
    );
    res.json({
      results: sorted.map((item: any) =>
        formatMediaItem(item, item.media_type),
      ),
    });
  } catch (err: any) {
    console.error("Search Error:", err.message);
    res.status(200).json({ results: [] });
  }
};

const MOVIE_SORT_MAP: Record<string, string> = {
  POPULAR: "popularity.desc",
  RATING: "vote_average.desc",
  NEWEST: "primary_release_date.desc",
  OLDEST: "primary_release_date.asc",
};

const TV_SORT_MAP: Record<string, string> = {
  POPULAR: "popularity.desc",
  RATING: "vote_average.desc",
  NEWEST: "first_air_date.desc",
  OLDEST: "first_air_date.asc",
};

const discoverMovies = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const genre = req.query.genre as string;
  const year = req.query.year as string;
  const sortParam = (req.query.sort as string | undefined)?.toUpperCase();

  const sortBy =
    MOVIE_SORT_MAP[sortParam || "POPULAR"] || MOVIE_SORT_MAP.POPULAR;

  const extraParams: any = {
    "primary_release_date.gte": "1970-01-01",
    "primary_release_date.lte": getTodayDateString(),
    sort_by: sortBy,
  };
  // For rating sort, require a minimum vote count so obscure titles don't dominate.
  if (sortParam === "RATING") extraParams["vote_count.gte"] = 200;
  if (genre && GENRE_MAP[genre.toLowerCase()]) {
    extraParams.with_genres = GENRE_MAP[genre.toLowerCase()];
  }
  if (year) {
    extraParams.primary_release_year = year;
  }

  try {
    const { results, total_pages } = await fetchPaginatedFromTmdb(
      "discover/movie",
      page,
      24,
      "movie",
      extraParams,
    );
    res.json({ page, totalPages: total_pages, results });
  } catch (err: any) {
    console.error("Movies Error:", err.message);
    res.status(200).json({ page, totalPages: 1, results: [] });
  }
};

const discoverTV = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const genre = req.query.genre as string;
  const year = req.query.year as string;
  const sortParam = (req.query.sort as string | undefined)?.toUpperCase();

  const sortBy = TV_SORT_MAP[sortParam || "POPULAR"] || TV_SORT_MAP.POPULAR;

  const extraParams: any = {
    "first_air_date.gte": "1970-01-01",
    "first_air_date.lte": getTodayDateString(),
    sort_by: sortBy,
  };
  if (sortParam === "RATING") extraParams["vote_count.gte"] = 200;
  if (genre && GENRE_MAP[genre.toLowerCase()]) {
    extraParams.with_genres = GENRE_MAP[genre.toLowerCase()];
  }
  if (year) {
    extraParams.first_air_date_year = year;
  }

  try {
    const { results, total_pages } = await fetchPaginatedFromTmdb(
      "discover/tv",
      page,
      24,
      "tv",
      extraParams,
    );
    res.json({ page, totalPages: total_pages, results });
  } catch (err: any) {
    console.error("TV Error:", err.message);
    res.status(200).json({ page, totalPages: 1, results: [] });
  }
};

const getMaturityRating = (
  releaseDates: any,
  contentRatings: any,
  isTv: boolean,
): string => {
  if (isTv && contentRatings && contentRatings.results) {
    const usRating = contentRatings.results.find(
      (r: any) => r.iso_3166_1 === "US",
    );
    return usRating ? usRating.rating : "TV-MA";
  }
  if (!isTv && releaseDates && releaseDates.results) {
    const usRelease = releaseDates.results.find(
      (r: any) => r.iso_3166_1 === "US",
    );
    if (usRelease && usRelease.release_dates.length > 0)
      return usRelease.release_dates[0].certification || "R";
  }
  return "PG-13";
};

const pickTrailer = (videos: any): { key: string; site: string } | null => {
  const list: any[] = videos?.results || [];
  if (!list.length) return null;
  const youtube = list.filter((v) => v.site === "YouTube");
  const trailer =
    youtube.find((v) => v.type === "Trailer" && v.official) ||
    youtube.find((v) => v.type === "Trailer") ||
    youtube.find((v) => v.type === "Teaser") ||
    youtube[0];
  if (!trailer) return null;
  return { key: trailer.key, site: trailer.site };
};

const getMovieDetails = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  console.log("TMDB ID Loaded:", id);
  try {
    const headers = getAuthHeaders();
    const params: any = { append_to_response: "release_dates,credits,videos" };
    if (!headers.Authorization && process.env.TMDB_KEY)
      params.api_key = process.env.TMDB_KEY;
    const { data } = await fetchWithRetry(
      `${TMDB_BASE}/movie/${id}`,
      params,
      headers,
    );

    if (!isReleasedAndModern(data)) {
      res.status(404).json({ error: "This title is not yet available." });
      return;
    }

    const percentage = data.vote_average
      ? Math.round(Number(data.vote_average) * 10)
      : 0;

    const cast =
      data.credits?.cast?.slice(0, 15).map((c: any) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: c.profile_path
          ? getImageUrl(c.profile_path, "w185")
          : null,
      })) || [];

    res.json({
      id: data.id,
      title: data.title || data.original_title || "Unknown Title",
      backdropImage: getImageUrl(
        data.backdrop_path || data.poster_path,
        "original",
      ),
      description: data.overview || "Description unavailable.",
      rating: percentage ? `${percentage}% Match` : "No Rating",
      year: data.release_date
        ? String(data.release_date).substring(0, 4)
        : "Unknown Year",
      releaseDate: data.release_date || null,
      maturityRating: getMaturityRating(data.release_dates, null, false),
      quality: "HD",
      isTv: false,
      cast,
      trailer: pickTrailer(data.videos),
    });
  } catch (err: any) {
    console.error("Detail Error:", err.message);
    res.status(404).json({ error: "Not found." });
  }
};

const getTVDetails = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  console.log("TMDB ID Loaded:", id);
  try {
    const headers = getAuthHeaders();
    const params: any = {
      append_to_response: "content_ratings,credits,videos",
    };
    if (!headers.Authorization && process.env.TMDB_KEY)
      params.api_key = process.env.TMDB_KEY;
    const { data } = await fetchWithRetry(
      `${TMDB_BASE}/tv/${id}`,
      params,
      headers,
    );

    // Block unreleased or pre-1970 shows
    if (!isReleasedAndModern(data)) {
      res.status(404).json({ error: "This title is not yet available." });
      return;
    }

    const percentage = data.vote_average
      ? Math.round(Number(data.vote_average) * 10)
      : 0;

    const cast =
      data.credits?.cast?.slice(0, 15).map((c: any) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: c.profile_path
          ? getImageUrl(c.profile_path, "w185")
          : null,
      })) || [];

    res.json({
      id: data.id,
      title: data.name || data.original_name || "Unknown Title",
      backdropImage: getImageUrl(
        data.backdrop_path || data.poster_path,
        "original",
      ),
      description: data.overview || "Description unavailable.",
      rating: percentage ? `${percentage}% Match` : "No Rating",
      year: data.first_air_date
        ? String(data.first_air_date).substring(0, 4)
        : "Unknown Year",
      releaseDate: data.first_air_date || null,
      maturityRating: getMaturityRating(null, data.content_ratings, true),
      quality: "HD",
      totalSeasons: data.number_of_seasons || 1,
      isTv: true,
      cast,
      trailer: pickTrailer(data.videos),
    });
  } catch (err: any) {
    console.error("TV Detail Error:", err.message);
    res.status(404).json({ error: "Not found." });
  }
};

const getTVSeason = async (req: Request, res: Response): Promise<void> => {
  const { id, seasonNumber } = req.params;
  try {
    const headers = getAuthHeaders();
    const params: any = {};
    if (!headers.Authorization && process.env.TMDB_KEY)
      params.api_key = process.env.TMDB_KEY;
    const { data } = await fetchWithRetry(
      `${TMDB_BASE}/tv/${id}/season/${seasonNumber}`,
      params,
      headers,
    );
    res.json({
      episodes: (data.episodes || []).map((ep: any) => ({
        num: ep.episode_number || 1,
        title: ep.name || `Episode ${ep.episode_number}`,
        duration: ep.runtime ? `${ep.runtime}m` : "45m",
        desc: ep.overview || "Description unavailable.",
        image: getImageUrl(ep.still_path, "w500"),
      })),
    });
  } catch (err: any) {
    res.status(200).json({ episodes: [] });
  }
};

const getTrending = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const rawType = (req.query.type as string) || "all";
  const type = ["all", "movie", "tv"].includes(rawType.toLowerCase())
    ? rawType.toLowerCase()
    : "all";
  const timeWindow =
    (req.query.time_window as string) === "week" ? "week" : "day";

  try {
    const { results, total_pages } = await fetchPaginatedFromTmdb(
      `trending/${type}/${timeWindow}`,
      page,
      24,
      type === "all" ? "movie" : type,
    );
    res.json({
      page,
      totalPages: total_pages,
      results,
    });
  } catch (err: any) {
    console.error("Trending Error:", err.message);
    res.status(200).json({ page, totalPages: 1, results: [] });
  }
};

const getNewReleases = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const rawType = (req.query.type as string) || "all";
  const type = ["all", "movie", "tv"].includes(rawType.toLowerCase())
    ? rawType.toLowerCase()
    : "all";
  const genre = req.query.genre as string;
  const sortParam = (req.query.sort as string | undefined)?.toUpperCase();
  const isNewestSort = sortParam === "NEWEST";

  const today = getTodayDateString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  try {
    if (type === "movie") {
      const extraParams: any = {
        "primary_release_date.gte": ninetyDaysAgo,
        "primary_release_date.lte": today,
        sort_by: isNewestSort ? "primary_release_date.desc" : "popularity.desc",
        "vote_count.gte": isNewestSort ? 5 : 15,
      };
      if (genre && GENRE_MAP[genre.toLowerCase()]) {
        extraParams.with_genres = GENRE_MAP[genre.toLowerCase()];
      }
      const { results, total_pages } = await fetchPaginatedFromTmdb(
        "discover/movie",
        page,
        24,
        "movie",
        extraParams,
      );
      res.json({ page, totalPages: total_pages, results });
      return;
    }

    if (type === "tv") {
      const extraParams: any = {
        "first_air_date.gte": ninetyDaysAgo,
        "first_air_date.lte": today,
        sort_by: isNewestSort ? "first_air_date.desc" : "popularity.desc",
        "vote_count.gte": isNewestSort ? 5 : 15,
      };
      if (genre && GENRE_MAP[genre.toLowerCase()]) {
        extraParams.with_genres = GENRE_MAP[genre.toLowerCase()];
      }
      const { results, total_pages } = await fetchPaginatedFromTmdb(
        "discover/tv",
        page,
        24,
        "tv",
        extraParams,
      );
      res.json({ page, totalPages: total_pages, results });
      return;
    }

    // type === "all"
    const movieParams: any = {
      "primary_release_date.gte": ninetyDaysAgo,
      "primary_release_date.lte": today,
      sort_by: isNewestSort ? "primary_release_date.desc" : "popularity.desc",
      "vote_count.gte": isNewestSort ? 5 : 15,
    };
    const tvParams: any = {
      "first_air_date.gte": ninetyDaysAgo,
      "first_air_date.lte": today,
      sort_by: isNewestSort ? "first_air_date.desc" : "popularity.desc",
      "vote_count.gte": isNewestSort ? 5 : 15,
    };
    if (genre && GENRE_MAP[genre.toLowerCase()]) {
      movieParams.with_genres = GENRE_MAP[genre.toLowerCase()];
      tvParams.with_genres = GENRE_MAP[genre.toLowerCase()];
    }

    const [moviesData, tvData] = await Promise.all([
      fetchPaginatedFromTmdb("discover/movie", page, 16, "movie", movieParams),
      fetchPaginatedFromTmdb("discover/tv", page, 16, "tv", tvParams),
    ]);

    const combined: any[] = [];
    const maxLen = Math.max(moviesData.results.length, tvData.results.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < moviesData.results.length) combined.push(moviesData.results[i]);
      if (i < tvData.results.length) combined.push(tvData.results[i]);
    }

    const total_pages = Math.max(moviesData.total_pages, tvData.total_pages);
    res.json({ page, totalPages: total_pages, results: combined.slice(0, 24) });
  } catch (err: any) {
    console.error("New Releases Error:", err.message);
    res.status(200).json({ page, totalPages: 1, results: [] });
  }
};

/**
 * GET /api/genres?type=movie|tv
 * Returns the genre list for movies or TV shows.
 * When no type is given, returns both.
 */
const getGenres = (req: Request, res: Response): void => {
  const type = ((req.query.type as string) || "").toLowerCase();
  if (type === "movie") {
    res.json({ type: "movie", genres: MOVIE_GENRES });
  } else if (type === "tv") {
    res.json({ type: "tv", genres: TV_GENRES });
  } else {
    res.json({ movie: MOVIE_GENRES, tv: TV_GENRES });
  }
};

/**
 * GET /api/person/:id
 * Returns a person's profile + their movie/tv credits (combined).
 */
const getPerson = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const headers = getAuthHeaders();
    const params: any = { append_to_response: "combined_credits" };
    if (!headers.Authorization && process.env.TMDB_KEY)
      params.api_key = process.env.TMDB_KEY;
    const { data } = await fetchWithRetry(
      `${TMDB_BASE}/person/${id}`,
      params,
      headers,
    );

    const rawCredits: any[] = data.combined_credits?.cast || [];
    const credits = rawCredits
      .filter((c) => c.media_type === "movie" || c.media_type === "tv")
      .filter((c) => c.poster_path)
      .filter(isReleasedAndModern)
      // Newest releases first; titles without a date sink to the bottom.
      .sort((a, b) => {
        const da = a.release_date || a.first_air_date || "";
        const db = b.release_date || b.first_air_date || "";
        return db.localeCompare(da);
      })
      .map((c) => {
        const isTv = c.media_type === "tv";
        const dateStr = c.release_date || c.first_air_date || "";
        return {
          id: c.id,
          title: c.title || c.name || "Unknown Title",
          type: isTv ? "tv" : "movie",
          rating: c.vote_average ? Number(c.vote_average).toFixed(1) : "N/A",
          image: getImageUrl(c.poster_path || c.backdrop_path, "w500"),
          year: dateStr ? dateStr.substring(0, 4) : "",
          character: c.character || "",
        };
      });

    // De-dup by media id+type — actors often appear in multiple credits for the same title.
    const seen = new Set<string>();
    const dedupedCredits: any[] = [];
    for (const c of credits) {
      const key = `${c.type}-${c.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      dedupedCredits.push(c);
    }

    res.json({
      id: data.id,
      name: data.name,
      profilePath: data.profile_path
        ? getImageUrl(data.profile_path, "w300")
        : null,
      biography: data.biography || "",
      knownForDepartment: data.known_for_department || "",
      birthday: data.birthday || null,
      placeOfBirth: data.place_of_birth || null,
      credits: dedupedCredits,
    });
  } catch (err: any) {
    console.error("Person Error:", err.message);
    res.status(404).json({ error: "Person not found." });
  }
};

export default {
  searchGlobal,
  discoverMovies,
  discoverTV,
  getMovieDetails,
  getTVDetails,
  getTVSeason,
  getTrending,
  getNewReleases,
  getGenres,
  getPerson,
};
