import axios from "axios";

const TMDB_BASE = "https://api.themoviedb.org/3";

const getAuthHeaders = () => {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN || process.env.TMDB_KEY;
  if (!token) return {};
  if (process.env.TMDB_API_READ_ACCESS_TOKEN) {
    return {
      Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
    };
  }
  return {};
};

const searchAll = async (req, res) => {
  const query = req.query.query || req.query.q;
  if (!query) {
    return res.status(400).json({ error: "Missing query parameter" });
  }

  try {
    const headers = getAuthHeaders();

    const params = {
      query,
      include_adult: false,
      page: Number(req.query.page) || 1,
    };

    if (!headers?.Authorization && process.env.TMDB_KEY) {
      params.api_key = process.env.TMDB_KEY;
    }

    const { data } = await axios.get(`${TMDB_BASE}/search/multi`, {
      params,
      headers,
    });

    const filtered = (data.results || [])
      .filter((item) => item.media_type !== "person")
      .filter((item) => item.poster_path || item.backdrop_path);

    const sorted = filtered.sort(
      (a, b) => (b.popularity || 0) - (a.popularity || 0),
    );

    return res.json({
      results: sorted,
      total: sorted.length,
      page: data.page,
      total_pages: data.total_pages,
    });
  } catch (err) {
    return res.status(err.response?.status || 500).json({
      error: err.response?.data || { message: err.message },
    });
  }
};

const searchMovies = async (req, res) => {
  const query = req.query.query || req.query.q;
  if (!query) return res.status(400).json({ error: "Missing query parameter" });

  try {
    const url = `${TMDB_BASE}/search/movie`;
    const headers = getAuthHeaders();
    const params = { query, include_adult: false, page: req.query.page || 1 };
    if (!headers.Authorization && process.env.TMDB_KEY)
      params.api_key = process.env.TMDB_KEY;

    const response = await axios.get(url, { params, headers });
    return res.json(response.data);
  } catch (err) {
    const status =
      err && err.response && err.response.status ? err.response.status : 500;
    const data =
      err && err.response && err.response.data
        ? err.response.data
        : { message: err.message };
    return res.status(status).json({ error: data });
  }
};

const searchTV = async (req, res) => {
  const query = req.query.query || req.query.q;
  if (!query) return res.status(400).json({ error: "Missing query parameter" });

  try {
    const url = `${TMDB_BASE}/search/tv`;
    const headers = getAuthHeaders();
    const params = { query, page: req.query.page || 1 };
    if (!headers.Authorization && process.env.TMDB_KEY)
      params.api_key = process.env.TMDB_KEY;

    const response = await axios.get(url, { params, headers });
    return res.json(response.data);
  } catch (err) {
    const status =
      err && err.response && err.response.status ? err.response.status : 500;
    const data =
      err && err.response && err.response.data
        ? err.response.data
        : { message: err.message };
    return res.status(status).json({ error: data });
  }
};

const getTVDetails = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Missing tv id" });

  try {
    const url = `${TMDB_BASE}/tv/${encodeURIComponent(id)}`;
    const headers = getAuthHeaders();
    const params = {};
    if (!headers.Authorization && process.env.TMDB_KEY)
      params.api_key = process.env.TMDB_KEY;

    const response = await axios.get(url, { params, headers });
    return res.json(response.data);
  } catch (err) {
    const status =
      err && err.response && err.response.status ? err.response.status : 500;
    const data =
      err && err.response && err.response.data
        ? err.response.data
        : { message: err.message };
    return res.status(status).json({ error: data });
  }
};

const getMovieDetails = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Missing movie id" });

  try {
    const url = `${TMDB_BASE}/movie/${encodeURIComponent(id)}`;
    const headers = getAuthHeaders();
    const params = {};
    if (!headers.Authorization && process.env.TMDB_KEY)
      params.api_key = process.env.TMDB_KEY;

    const response = await axios.get(url, { params, headers });
    return res.json(response.data);
  } catch (err) {
    const status =
      err && err.response && err.response.status ? err.response.status : 500;
    const data =
      err && err.response && err.response.data
        ? err.response.data
        : { message: err.message };
    return res.status(status).json({ error: data });
  }
};

export default {
  searchMovies,
  getMovieDetails,
  searchTV,
  getTVDetails,
  searchAll,
};
