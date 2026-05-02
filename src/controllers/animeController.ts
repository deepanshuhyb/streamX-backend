import axios from "axios";
import https from "https";
import type { Request, Response } from "express";

const httpsAgent = new https.Agent({
  family: 4,
  rejectUnauthorized: false,
});

const ANILIST_BASE = "https://graphql.anilist.co";
const PER_PAGE = 24;
const NO_IMAGE = "https://via.placeholder.com/500x750?text=No+Image+Available";

const ANIME_GENRES: { id: number; name: string; slug: string }[] = [
  { id: 1, name: "Action", slug: "action" },
  { id: 2, name: "Adventure", slug: "adventure" },
  { id: 3, name: "Comedy", slug: "comedy" },
  { id: 4, name: "Drama", slug: "drama" },
  { id: 5, name: "Ecchi", slug: "ecchi" },
  { id: 6, name: "Fantasy", slug: "fantasy" },
  { id: 7, name: "Horror", slug: "horror" },
  { id: 8, name: "Mahou Shoujo", slug: "mahou-shoujo" },
  { id: 9, name: "Mecha", slug: "mecha" },
  { id: 10, name: "Music", slug: "music" },
  { id: 11, name: "Mystery", slug: "mystery" },
  { id: 12, name: "Psychological", slug: "psychological" },
  { id: 13, name: "Romance", slug: "romance" },
  { id: 14, name: "Sci-Fi", slug: "sci-fi" },
  { id: 15, name: "Slice of Life", slug: "slice-of-life" },
  { id: 16, name: "Sports", slug: "sports" },
  { id: 17, name: "Supernatural", slug: "supernatural" },
  { id: 18, name: "Thriller", slug: "thriller" },
];

const SLUG_TO_ANILIST: Record<string, string> = {
  "action": "Action",
  "adventure": "Adventure",
  "comedy": "Comedy",
  "drama": "Drama",
  "ecchi": "Ecchi",
  "fantasy": "Fantasy",
  "horror": "Horror",
  "mahou-shoujo": "Mahou Shoujo",
  "mecha": "Mecha",
  "music": "Music",
  "mystery": "Mystery",
  "psychological": "Psychological",
  "romance": "Romance",
  "sci-fi": "Sci-Fi",
  "slice-of-life": "Slice of Life",
  "sports": "Sports",
  "supernatural": "Supernatural",
  "thriller": "Thriller",
};

const stripHtml = (str: string | null | undefined): string => {
  if (!str) return "";
  return str.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
};

const pickTitle = (title: any): string => {
  if (!title) return "Unknown Title";
  return title.english || title.romaji || title.native || "Unknown Title";
};

const formatScore = (score: number | null | undefined): string => {
  if (typeof score !== "number" || isNaN(score)) return "N/A";
  return (score / 10).toFixed(1);
};

const formatAnimeCard = (item: any) => ({
  id: item.id,
  title: pickTitle(item.title),
  type: "anime" as const,
  rating: formatScore(item.averageScore),
  image:
    item.coverImage?.extraLarge ||
    item.coverImage?.large ||
    item.coverImage?.medium ||
    NO_IMAGE,
});

const fetchAniList = async (query: string, variables: Record<string, any>, retries = 5): Promise<any> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.post(
        ANILIST_BASE,
        { query, variables },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          httpsAgent,
          timeout: 15000,
        }
      );
      return res.data;
    } catch (err: any) {
      lastError = err;
      const status = err?.response?.status;
      console.warn(`AniList Request Fail (${i + 1}/${retries}): ${err.message}`);
      if (status === 404) throw err;
      // AniList rate limits at ~90 req/min; back off if 429
      const waitMs = status === 429 ? 2000 * (i + 1) : 1000 * (i + 1);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastError;
};

const DISCOVER_QUERY = `
  query ($page: Int, $perPage: Int, $genre: String, $seasonYear: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(type: ANIME, isAdult: false, genre: $genre, seasonYear: $seasonYear, sort: $sort) {
        id
        title { romaji english native }
        averageScore
        coverImage { extraLarge large medium }
      }
    }
  }
`;

const DETAILS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      idMal
      title { romaji english native }
      description(asHtml: false)
      episodes
      duration
      status
      season
      seasonYear
      averageScore
      genres
      format
      bannerImage
      coverImage { extraLarge large color }
      startDate { year }
      nextAiringEpisode { episode airingAt }
      studios(isMain: true) { nodes { name } }
      characters(perPage: 12, sort: [ROLE, RELEVANCE]) {
        edges {
          role
          node { id name { full } image { large medium } }
          voiceActors(language: JAPANESE) { id name { full } image { large medium } }
        }
      }
    }
  }
`;

const SEARCH_QUERY = `
  query ($search: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(type: ANIME, isAdult: false, search: $search, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
        id
        title { romaji english native }
        averageScore
        coverImage { extraLarge large medium }
      }
    }
  }
`;

const TRENDING_QUERY = `
  query ($perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(type: ANIME, isAdult: false, sort: [TRENDING_DESC]) {
        id
        title { romaji english native }
        averageScore
        coverImage { extraLarge large medium }
      }
    }
  }
`;

const discoverAnime = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const genreSlug = (req.query.genre as string | undefined)?.toLowerCase();
  const year = req.query.year ? Number(req.query.year) : undefined;
  const sortParam = (req.query.sort as string | undefined)?.toUpperCase();

  const sortMap: Record<string, string[]> = {
    POPULAR: ["POPULARITY_DESC"],
    TRENDING: ["TRENDING_DESC"],
    RATING: ["SCORE_DESC"],
    NEWEST: ["START_DATE_DESC"],
  };
  const sort = sortMap[sortParam || "POPULAR"] || sortMap.POPULAR;

  const variables: Record<string, any> = {
    page,
    perPage: PER_PAGE,
    sort,
  };
  if (genreSlug && SLUG_TO_ANILIST[genreSlug]) {
    variables.genre = SLUG_TO_ANILIST[genreSlug];
  }
  if (year && !isNaN(year)) {
    variables.seasonYear = year;
  }

  try {
    const data = await fetchAniList(DISCOVER_QUERY, variables);
    const pageData = data?.data?.Page;
    const results = (pageData?.media || []).map(formatAnimeCard);
    res.json({
      page,
      totalPages: pageData?.pageInfo?.lastPage || 1,
      results,
    });
  } catch (err: any) {
    console.error("Anime Discover Error:", err.message);
    res.status(200).json({ page, totalPages: 1, results: [] });
  }
};

const getAnimeDetails = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    res.status(404).json({ error: "Invalid anime id." });
    return;
  }
  try {
    const data = await fetchAniList(DETAILS_QUERY, { id });
    const m = data?.data?.Media;
    if (!m) {
      res.status(404).json({ error: "Anime not found." });
      return;
    }
    const cast = (m.characters?.edges || [])
      .slice(0, 12)
      .map((edge: any) => {
        const va = edge.voiceActors?.[0];
        const node = edge.node;
        const image =
          va?.image?.large ||
          va?.image?.medium ||
          node?.image?.large ||
          node?.image?.medium ||
          null;
        return {
          name: va?.name?.full || node?.name?.full || "Unknown",
          character: node?.name?.full || edge.role || "",
          profilePath: image,
        };
      });

    const studios = (m.studios?.nodes || []).map((s: any) => s.name).filter(Boolean);

    res.json({
      id: m.id,
      title: pickTitle(m.title),
      backdropImage:
        m.bannerImage ||
        m.coverImage?.extraLarge ||
        m.coverImage?.large ||
        NO_IMAGE,
      coverImage:
        m.coverImage?.extraLarge ||
        m.coverImage?.large ||
        NO_IMAGE,
      description: stripHtml(m.description) || "Description unavailable.",
      rating: m.averageScore
        ? `${Math.round(m.averageScore)}% Match`
        : "No Rating",
      year: m.seasonYear || m.startDate?.year || "Unknown Year",
      maturityRating:
        m.format === "MOVIE" ? "Anime Movie" : m.format || "TV Anime",
      quality: "HD",
      totalEpisodes: resolveTotalEpisodes(m) || 1,
      duration: m.duration ? `${m.duration}m` : null,
      status: m.status || "UNKNOWN",
      genres: m.genres || [],
      studios,
      isAnime: true,
      cast,
    });
  } catch (err: any) {
    console.error("Anime Detail Error:", err.message);
    res.status(404).json({ error: "Not found." });
  }
};

const resolveTotalEpisodes = (m: any): number => {
  if (typeof m?.episodes === "number" && m.episodes > 0) return m.episodes;
  // Ongoing shows: AniList exposes the next airing episode number — aired count is one less.
  const nextEp = m?.nextAiringEpisode?.episode;
  if (typeof nextEp === "number" && nextEp > 1) return nextEp - 1;
  return 0;
};

const getAnimeEpisodes = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    res.status(200).json({ episodes: [] });
    return;
  }
  try {
    const data = await fetchAniList(DETAILS_QUERY, { id });
    const m = data?.data?.Media;
    const total = resolveTotalEpisodes(m);
    if (!total) {
      res.status(200).json({ episodes: [] });
      return;
    }
    const duration = m.duration ? `${m.duration}m` : "24m";
    const cover =
      m.coverImage?.extraLarge ||
      m.coverImage?.large ||
      m.bannerImage ||
      NO_IMAGE;
    const episodes = Array.from({ length: total }, (_, i) => ({
      num: i + 1,
      title: `Episode ${i + 1}`,
      duration,
      desc: "",
      image: cover,
    }));
    res.json({ episodes });
  } catch (err: any) {
    console.error("Anime Episodes Error:", err.message);
    res.status(200).json({ episodes: [] });
  }
};

const searchAnime = async (req: Request, res: Response): Promise<void> => {
  const query = (req.query.q as string) || (req.query.query as string);
  if (!query) {
    res.status(200).json({ results: [] });
    return;
  }
  try {
    const data = await fetchAniList(SEARCH_QUERY, {
      search: query,
      perPage: 24,
    });
    const results = (data?.data?.Page?.media || []).map(formatAnimeCard);
    res.json({ results });
  } catch (err: any) {
    console.error("Anime Search Error:", err.message);
    res.status(200).json({ results: [] });
  }
};

const getAnimeTrending = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await fetchAniList(TRENDING_QUERY, { perPage: 24 });
    const results = (data?.data?.Page?.media || []).map(formatAnimeCard);
    res.json({ results });
  } catch (err: any) {
    console.error("Anime Trending Error:", err.message);
    res.status(200).json({ results: [] });
  }
};

const getAnimeGenres = (_req: Request, res: Response): void => {
  res.json({ type: "anime", genres: ANIME_GENRES });
};

export default {
  discoverAnime,
  getAnimeDetails,
  getAnimeEpisodes,
  searchAnime,
  getAnimeTrending,
  getAnimeGenres,
};
