# 🎬 StreamX Backend

A lightweight, high-performance REST API that powers the **StreamX** streaming platform. Built with **Express 5** and **Node.js**, it acts as an intelligent proxy to [The Movie Database (TMDB)](https://www.themoviedb.org/) API — providing curated movie, TV show, and trending content data to the StreamX frontend.

---

## ✨ Features

| Feature | Description |
| --- | --- |
| **Global Search** | Multi-type search across movies and TV shows with popularity-based ranking |
| **Movie Discovery** | Browse and filter movies by genre, year, and page with custom pagination (24 items/page) |
| **TV Show Discovery** | Browse and filter TV shows by genre, year, and page with custom pagination |
| **Movie Details** | Full movie details including cast, maturity rating, description, and backdrop images |
| **TV Show Details** | Full TV show details with season count, cast, and content ratings |
| **Season & Episodes** | Fetch episodes for any season of a TV show with thumbnails and runtimes |
| **Trending Content** | Daily trending movies and TV shows for the homepage |
| **Health Check** | `/health` endpoint for uptime monitoring |
| **Keep-Alive** | Built-in self-ping mechanism for Render free-tier deployments |
| **Retry Logic** | Automatic retry with exponential backoff for resilient TMDB API calls |
| **Content Filtering** | Automatically hides unreleased (future) and pre-1970 content |

---

## 🛠️ Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** [Express 5](https://expressjs.com/)
- **Language:** TypeScript (controllers & routes) + JavaScript (entry point)
- **HTTP Client:** [Axios](https://axios-http.com/) with retry logic
- **Database:** [MongoDB](https://www.mongodb.com/) via Mongoose *(configured, currently optional)*
- **External API:** [TMDB API v3](https://developer.themoviedb.org/docs)

---

## 📁 Project Structure

```
streamX-backend/
├── src/
│   ├── index.js                  # Entry point — starts server & keep-alive ping
│   ├── app.ts                    # Express app setup, middleware, route mounting
│   ├── configs/
│   │   └── database.ts           # MongoDB connection via Mongoose
│   ├── controllers/
│   │   └── movieController.ts    # All TMDB business logic & data formatting
│   └── routes/
│       └── data.route.ts         # API route definitions
├── .env                          # Environment variables (git-ignored)
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A [TMDB API key](https://developer.themoviedb.org/docs/getting-started) (free to obtain)

### 1. Clone the Repository

```bash
git clone https://github.com/deepanshuhyb/streamX-backend.git
cd streamX-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
TMDB_KEY=your_tmdb_api_key
TMDB_API_READ_ACCESS_TOKEN=your_tmdb_read_access_token
MONGO_URI=your_mongodb_connection_string
```

> [!NOTE]
> The `TMDB_API_READ_ACCESS_TOKEN` (Bearer token) is preferred over `TMDB_KEY` (API key). You can obtain both from your [TMDB account settings](https://www.themoviedb.org/settings/api).

### 4. Start the Server

**Development** (with hot-reload via Nodemon):

```bash
npm run dev
```

**Production:**

```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

---

## 📡 API Endpoints

All endpoints are prefixed with `/api`.

### Health Check

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Server health status |

### Search

| Method | Endpoint | Query Params | Description |
| --- | --- | --- | --- |
| `GET` | `/api/search` | `q` or `query` | Search movies & TV shows globally |

### Movies

| Method | Endpoint | Query Params | Description |
| --- | --- | --- | --- |
| `GET` | `/api/movies` | `page`, `genre`, `year` | Discover movies with filters |
| `GET` | `/api/movies/:id` | — | Get detailed movie info |

### TV Shows

| Method | Endpoint | Query Params | Description |
| --- | --- | --- | --- |
| `GET` | `/api/tv` | `page`, `genre`, `year` | Discover TV shows with filters |
| `GET` | `/api/tv/:id` | — | Get detailed TV show info |
| `GET` | `/api/tv/:id/season/:seasonNumber` | — | Get episodes for a season |

### Trending

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/trending` | Daily trending movies & TV shows |

### Test

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/test` | Simple API status check |

---

## 📦 Example Responses

<details>
<summary><b>GET /api/movies?page=1&genre=action</b></summary>

```json
{
  "page": 1,
  "totalPages": 500,
  "results": [
    {
      "id": 123456,
      "title": "Action Movie Title",
      "type": "movie",
      "rating": "7.5",
      "image": "https://image.tmdb.org/t/p/w500/poster.jpg"
    }
  ]
}
```

</details>

<details>
<summary><b>GET /api/movies/123456</b></summary>

```json
{
  "id": 123456,
  "title": "Movie Title",
  "backdropImage": "https://image.tmdb.org/t/p/original/backdrop.jpg",
  "description": "A compelling movie description...",
  "rating": "75% Match",
  "year": "2025",
  "maturityRating": "PG-13",
  "quality": "HD",
  "isTv": false,
  "cast": [
    {
      "name": "Actor Name",
      "character": "Character Name",
      "profilePath": "https://image.tmdb.org/t/p/w185/profile.jpg"
    }
  ]
}
```

</details>

<details>
<summary><b>GET /api/tv/789/season/1</b></summary>

```json
{
  "episodes": [
    {
      "num": 1,
      "title": "Pilot",
      "duration": "52m",
      "desc": "The first episode description...",
      "image": "https://image.tmdb.org/t/p/w500/still.jpg"
    }
  ]
}
```

</details>

---

## 🎯 Supported Genre Filters

### Movies

`action` · `adventure` · `animation` · `comedy` · `crime` · `documentary` · `drama` · `family` · `fantasy` · `history` · `horror` · `music` · `mystery` · `romance` · `science fiction` · `sci-fi` · `thriller` · `war` · `western`

### TV Shows

All movie genres plus: `action & adventure` · `kids` · `news` · `reality` · `sci-fi & fantasy` · `soap` · `talk` · `war & politics`

---

## 🌐 Deployment

This project is configured for deployment on [Render](https://render.com/). The built-in keep-alive mechanism pings the `/health` endpoint every 14 minutes to prevent the free-tier instance from spinning down.

Set the following environment variables in your Render dashboard:

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | ✅ | Port for the server (Render sets this automatically) |
| `TMDB_KEY` | ✅ | Your TMDB API key |
| `TMDB_API_READ_ACCESS_TOKEN` | ✅ | Your TMDB Read Access Token (Bearer) |
| `MONGO_URI` | ❌ | MongoDB connection string (optional, currently unused) |
| `RENDER_EXTERNAL_URL` | ❌ | Auto-set by Render; used for keep-alive pings |

---

## 📜 Scripts

| Script | Command | Description |
| --- | --- | --- |
| `dev` | `npm run dev` | Start with Nodemon (hot-reload) |
| `start` | `npm start` | Start in production mode |

---

## 📄 License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).

---

<p align="center">
  Built with ❤️ for StreamX
</p>
