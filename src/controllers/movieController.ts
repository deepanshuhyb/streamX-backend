import axios from "axios";
import https from "https";
import type { Request, Response } from "express";

// Create a stable agent
const httpsAgent = new https.Agent({
  family: 4,               // Force IPv4
  rejectUnauthorized: false // Skip SSL issues if they are causing the reset (DEBUG)
});

// Configure axios defaults
axios.defaults.httpsAgent = httpsAgent;
axios.defaults.timeout = 15000;

const TMDB_BASE = "https://api.themoviedb.org/3";

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

const getImageUrl = (path: string | null | undefined, size: string = "w500"): string => {
  if (!path) return "https://via.placeholder.com/500x750?text=No+Image+Available";
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

/**
 * Robust fetch with retries 
 */
const fetchWithRetry = async (url: string, params: any, headers: any, retries = 5): Promise<any> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      // Use the local agent explicitly to ensure family: 4 is applied
      return await axios.get(url, { params, headers, httpsAgent });
    } catch (err: any) {
      lastError = err;
      console.warn(`TMDB Request Fail (${i + 1}/${retries}): ${err.message}`);
      if (err.message.includes("401") || err.message.includes("404")) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Wait 1s, 2s, 3s...
    }
  }
  throw lastError;
};

const fetchPaginatedFromTmdb = async (endpoint: string, page: number, limit: number = 24, type: string = "movie") => {
  const startIndex = (page - 1) * limit;
  const tmdbStartPage = Math.floor(startIndex / 20) + 1;
  const tmdbEndPage = Math.floor((startIndex + limit - 1) / 20) + 1;

  const headers = getAuthHeaders();
  const baseParams: any = { include_adult: false };
  if (!headers.Authorization && process.env.TMDB_KEY) {
    baseParams.api_key = process.env.TMDB_KEY;
  }

  let allResults: any[] = [];
  let totalResults = 0;

  for (let p = tmdbStartPage; p <= tmdbEndPage; p++) {
    const res = await fetchWithRetry(`${TMDB_BASE}/${endpoint}`, { ...baseParams, page: p }, headers);
    allResults = allResults.concat(res.data.results || []);
    totalResults = res.data.total_results || 0;
  }

  const offsetInCombined = startIndex - (tmdbStartPage - 1) * 20;
  const slicedResults = allResults.slice(offsetInCombined, offsetInCombined + limit);

  return {
    results: slicedResults.map(item => formatMediaItem(item, type)),
    total_pages: Math.ceil(totalResults / limit) || 1
  };
};

// endpoints...
const searchGlobal = async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q as string || req.query.query as string;
  if (!query) { res.status(200).json({ results: [] }); return; }
  try {
    const headers = getAuthHeaders();
    const params: any = { query, include_adult: false, page: 1 };
    if (!headers.Authorization && process.env.TMDB_KEY) params.api_key = process.env.TMDB_KEY;
    const { data } = await fetchWithRetry(`${TMDB_BASE}/search/multi`, params, headers);
    const filtered = (data.results || []).filter((item: any) => item.media_type !== "person").filter((item: any) => item.poster_path || item.backdrop_path);
    const sorted = filtered.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
    res.json({ results: sorted.map((item: any) => formatMediaItem(item, item.media_type)) });
  } catch (err: any) { console.error("Search Error:", err.message); res.status(200).json({ results: [] }); }
};

const discoverMovies = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  try {
    const { results, total_pages } = await fetchPaginatedFromTmdb("discover/movie", page, 24, "movie");
    res.json({ page, totalPages: total_pages, results });
  } catch (err: any) { console.error("Movies Error:", err.message); res.status(200).json({ page, totalPages: 1, results: [] }); }
};

const discoverTV = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  try {
    const { results, total_pages } = await fetchPaginatedFromTmdb("discover/tv", page, 24, "tv");
    res.json({ page, totalPages: total_pages, results });
  } catch (err: any) { console.error("TV Error:", err.message); res.status(200).json({ page, totalPages: 1, results: [] }); }
};

const getMaturityRating = (releaseDates: any, contentRatings: any, isTv: boolean): string => {
  if (isTv && contentRatings && contentRatings.results) {
    const usRating = contentRatings.results.find((r: any) => r.iso_3166_1 === "US");
    return usRating ? usRating.rating : "TV-MA";
  }
  if (!isTv && releaseDates && releaseDates.results) {
    const usRelease = releaseDates.results.find((r: any) => r.iso_3166_1 === "US");
    if (usRelease && usRelease.release_dates.length > 0) return usRelease.release_dates[0].certification || "R";
  }
  return "PG-13";
};

const getMovieDetails = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const headers = getAuthHeaders();
    const params: any = { append_to_response: "release_dates" };
    if (!headers.Authorization && process.env.TMDB_KEY) params.api_key = process.env.TMDB_KEY;
    const { data } = await fetchWithRetry(`${TMDB_BASE}/movie/${id}`, params, headers);
    const percentage = data.vote_average ? Math.round(Number(data.vote_average) * 10) : 0;
    res.json({
      id: data.id,
      title: data.title || data.original_title || "Unknown Title",
      backdropImage: getImageUrl(data.backdrop_path || data.poster_path, "original"),
      description: data.overview || "Description unavailable.",
      rating: percentage ? `${percentage}% Match` : "No Rating",
      year: data.release_date ? String(data.release_date).substring(0, 4) : "Unknown Year",
      maturityRating: getMaturityRating(data.release_dates, null, false),
      quality: "HD",
      isTv: false
    });
  } catch (err: any) { console.error("Detail Error:", err.message); res.status(404).json({ error: "Not found." }); }
};

const getTVDetails = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const headers = getAuthHeaders();
    const params: any = { append_to_response: "content_ratings" };
    if (!headers.Authorization && process.env.TMDB_KEY) params.api_key = process.env.TMDB_KEY;
    const { data } = await fetchWithRetry(`${TMDB_BASE}/tv/${id}`, params, headers);
    const percentage = data.vote_average ? Math.round(Number(data.vote_average) * 10) : 0;
    res.json({
      id: data.id,
      title: data.name || data.original_name || "Unknown Title",
      backdropImage: getImageUrl(data.backdrop_path || data.poster_path, "original"),
      description: data.overview || "Description unavailable.",
      rating: percentage ? `${percentage}% Match` : "No Rating",
      year: data.first_air_date ? String(data.first_air_date).substring(0, 4) : "Unknown Year",
      maturityRating: getMaturityRating(null, data.content_ratings, true),
      quality: "HD",
      totalSeasons: data.number_of_seasons || 1,
      isTv: true
    });
  } catch (err: any) { console.error("TV Detail Error:", err.message); res.status(404).json({ error: "Not found." }); }
};

const getTVSeason = async (req: Request, res: Response): Promise<void> => {
  const { id, seasonNumber } = req.params;
  try {
    const headers = getAuthHeaders();
    const params: any = {};
    if (!headers.Authorization && process.env.TMDB_KEY) params.api_key = process.env.TMDB_KEY;
    const { data } = await fetchWithRetry(`${TMDB_BASE}/tv/${id}/season/${seasonNumber}`, params, headers);
    res.json({
      episodes: (data.episodes || []).map((ep: any) => ({
        num: ep.episode_number || 1,
        title: ep.name || `Episode ${ep.episode_number}`,
        duration: ep.runtime ? `${ep.runtime}m` : "45m",
        desc: ep.overview || "Description unavailable.",
        image: getImageUrl(ep.still_path, "w500")
      }))
    });
  } catch (err: any) { res.status(200).json({ episodes: [] }); }
};

const getTrending = async (req: Request, res: Response): Promise<void> => {
  try {
    const headers = getAuthHeaders();
    const params: any = {};
    if (!headers.Authorization && process.env.TMDB_KEY) params.api_key = process.env.TMDB_KEY;
    const { data } = await fetchWithRetry(`${TMDB_BASE}/trending/all/day`, params, headers);
    res.json({ results: (data.results || []).filter((item: any) => item.media_type !== "person").map((item: any) => formatMediaItem(item, item.media_type)) });
  } catch (err: any) { res.status(200).json({ results: [] }); }
};

export default { searchGlobal, discoverMovies, discoverTV, getMovieDetails, getTVDetails, getTVSeason, getTrending };
