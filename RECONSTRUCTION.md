# School Sick In Yadika Soreang — Game Documentation

**Live:** `https://school-sick-yadika.vercel.app/`
**Developer:** Haedar (haedarr.my.id)
**School:** SMK Yadika Soreang
**Analysis date:** 2026-10-30
**Evidence:** `ev_e46b85fa1b2e4ebc53826e5e6887953a83a6d67d47ef1db424cbe62574f9595c`

---

## 1. Stack Confirmation

| Layer | Technology | Confidence | Evidence |
|-------|------------|------------|----------|
| Frontend HTML | HTML5 | Observed | `index.html` |
| Frontend CSS | CSS3 | Observed | `game.css` |
| Frontend JS | Vanilla ES6+ | Observed | 4 JS files |
| Game Loop | HTML Canvas | Observed | `game.js` |
| Audio | Web Audio API | Observed | `audio.js` |
| Storage | localStorage | Observed | 3 keys |
| Network | Fetch API | Observed | 3 endpoints |
| Hosting | Vercel | Observed | Headers |
| Backend | Python FastAPI | Source-indicated | `game.js` comment |
| Database | PostgreSQL or Supabase | Inferred | Not in JS |

---

## 2. Project Structure

```
catchapaw/
├── frontend/
│   ├── index.html
│   ├── game.css
│   ├── game-data.js
│   ├── audio.js
│   ├── game-ui.js
│   ├── game.js
│   └── static/
│       ├── assets/
│       │   ├── ui/
│       │   ├── items/
│       │   ├── characters/
│       │   └── music/
│       └── fonts/
├── backend/
│   ├── app.py              # FastAPI application
│   ├── models.py           # Pydantic + SQLAlchemy
│   ├── database.py         # Connection pool
│   ├── routers/
│   │   ├── session.py      # POST /api/session
│   │   └── leaderboard.py  # GET/POST /api/leaderboard
│   └── tests/
└── docs/
    └── ARCHITECTURE.md
```

---

## 3. Frontend Specification

### 3.1 Pages (Screens)

| Screen ID | State | Entry Points |
|-----------|-------|--------------|
| `#select-screen` | Initial | `/` |
| `#player-screen` | Character select | Click Play |
| `#game-screen` | Active game | Click Ready |
| `#over-screen` | Game over | Lives = 0 or time |

### 3.2 Characters

| Key | Name | Title | Assets |
|-----|------|-------|--------|
| `cat` | Lily | The Fish Hunter | `dog_idle.svg`, `dog_dead.svg` |
| `dog` | Aspi | The Treat Hunter | `cat_idle.svg`, `cat_dead.svg` |

Note: Asset names appear swapped vs character keys.

### 3.3 Items Configuration

```js
// game-data.js
const ITEM_ASSET_PATH = '/static/assets/items/';

ITEMS = {
  fish:   { id: 'fish',   label: 'Fish',   category: 'food',   score: 10, characters: ['cat'] },
  bone:   { id: 'bone',   label: 'Bone',   category: 'food',   score: 10, characters: ['dog'] },
  star:   { id: 'star',   label: 'Star',   category: 'bonus',  score: 20, spawnWeight: 0.5, characters: ['cat','dog'] },
  kitty:  { id: 'kitty',  label: 'Kitty',  category: 'food',   score: 15, characters: ['cat'] },
  tasty:  { id: 'tasty',  label: 'Tasty',  category: 'food',   score: 15, characters: ['dog'] },
  yarn:   { id: 'yarn',   label: 'Yarn',   category: 'special', score: 15, characters: ['cat'] },
  ball:   { id: 'ball',   label: 'Ball',   category: 'special', score: 15, characters: ['dog'] },
  heart:  { id: 'heart',  label: 'Heart',  category: 'life',   effect: 'extra_life', characters: ['cat','dog'] },
  bomb:   { id: 'bomb',   label: 'Bomb',   category: 'hazard', effect: 'lose_life', characters: ['cat','dog'] },
  trash:  { id: 'trash',  label: 'Trash',  category: 'hazard', effect: 'lose_life', characters: ['cat','dog'] },
};
```

### 3.4 Game Constants

```js
// Derived from game.js
const GAME_CONFIG = {
  canvasWidth: 960,
  canvasHeight: 720,
  initialLives: 3,
  playerSpeedBase: 1,
  playerSpeedIncrease: 0.15,
  playerSpeedScoreInterval: 50,
  spawnIntervalBase: 1200,
  spawnIntervalMin: 300,
  hazardRatio: 0.3,
  countdownSeconds: 3,
  idlePauseThreshold: 30000,
  itemSize: 64,
  playerSize: 80,
};
```

### 3.5 Controls

| Input | Action |
|-------|--------|
| ArrowLeft / A | Move left |
| ArrowRight / D | Move right |
| P | Pause / Resume |
| Touch left button | Move left |
| Touch right button | Move right |
| Touch drag | Follow finger |
| Visibility hidden | Auto-pause |
| Idle > 30s | Auto-pause |

### 3.6 Audio

```js
// localStorage keys
'catch-a-paw-music'  // 'on' | 'off'
'catch-a-paw-sfx'    // 'on' | 'off'
'catch-a-paw-sound'  // legacy
```

Music: `/static/assets/music/catch_a_paw_music.m4a` (870KB)

---

## 4. Backend API Specification

### 4.1 POST /api/session

**Request:**
```json
{
  "character": "cat"  // or "dog"
}
```

**Response 200:**
```json
{
  "session_id": "uuid-v4"
}
```

**Errors:**
- 400: Invalid character
- 500: Session creation failed

### 4.2 GET /api/leaderboard

**Query:** none

**Response 200:**
```json
{
  "scores": [
    {
      "nickname": "string",
      "character": "LILY" | "ASPI",
      "score": 100,
      "survival_time": 42,
      "created_at": "2026-10-30T04:26:21Z"
    }
  ]
}
```

Or direct array: `[{...}]` (client accepts both)

### 4.3 POST /api/leaderboard

**Request:**
```json
{
  "session_id": "uuid-v4",
  "character": "LILY" | "ASPI",
  "score": 100,
  "survivalTime": 42,
  "nickname": "Player"
}
```

**Validation:**
- `session_id` must be valid and not expired
- `character` must match session character
- `score` >= 0
- `survivalTime` >= 0
- `nickname` 1-20 chars, trimmed

**Response 200:**
```json
{
  "success": true,
  "rank": 1
}
```

**Errors:**
- 400: Invalid payload / session mismatch
- 401: Session expired / invalid
- 409: Score already submitted for session
- 500: Database error

---

## 5. Database Schema

```sql
-- PostgreSQL / Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character VARCHAR(16) NOT NULL CHECK (character IN ('cat', 'dog')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  score_submitted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE leaderboard_scores (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  nickname VARCHAR(20) NOT NULL,
  character VARCHAR(16) NOT NULL CHECK (character IN ('LILY', 'ASPI')),
  score INTEGER NOT NULL CHECK (score >= 0),
  survival_time INTEGER NOT NULL CHECK (survival_time >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leaderboard_score ON leaderboard_scores (score DESC, created_at ASC);
CREATE INDEX idx_leaderboard_session ON leaderboard_scores (session_id);
CREATE UNIQUE INDEX uq_leaderboard_session ON leaderboard_scores (session_id);
```

---

## 6. Rebuild Steps

### Phase 1: Frontend (Static)

- [ ] Copy extracted files to `frontend/`
- [ ] Verify all asset URLs resolve
- [ ] Serve via `npx serve frontend` or `python -m http.server`
- [ ] Test all 4 screens load
- [ ] Test character selection
- [ ] Test game loop runs
- [ ] Test pause/resume
- [ ] Test audio toggle
- [ ] Test high score modal loads (will 404 without backend)

### Phase 2: Backend Skeleton

- [ ] Initialize Python project: `uv init backend` or `poetry new backend`
- [ ] Add dependencies:
  ```toml
  fastapi
  uvicorn
  sqlalchemy
  asyncpg
  pydantic
  pydantic-settings
  python-dotenv
  pytest
  pytest-asyncio
  httpx
  ```
- [ ] Configure `database.py` with async SQLAlchemy
- [ ] Define models in `models.py`
- [ ] Create routers for session and leaderboard
- [ ] Wire in `app.py` with CORS for localhost
- [ ] Run migrations / create tables

### Phase 3: Integration

- [ ] Update frontend `fetch` calls to point to backend (dev: `http://localhost:8000`)
- [ ] Test full flow: start session → play → game over → submit score → view leaderboard
- [ ] Verify session validation prevents fake scores
- [ ] Verify duplicate submission blocked

### Phase 4: Hardening

- [ ] Add rate limiting on `/api/leaderboard` POST
- [ ] Add session expiry (1 hour)
- [ ] Add input sanitization
- [ ] Add structured logging
- [ ] Add health check endpoint
- [ ] Write integration tests

### Phase 5: Deploy

- [ ] Backend: Fly.io, Railway, Render, or Vercel Python
- [ ] Database: Supabase, Neon, or managed PostgreSQL
- [ ] Frontend: Vercel (static)
- [ ] Configure CORS for production domain
- [ ] Set environment variables

---

## 7. Assets Inventory

### Required Assets (from capture)

```
static/
├── assets/
│   ├── ui/
│   │   ├── logo-clear.svg
│   │   ├── play-button.svg
│   │   ├── how-to-play-button.svg
│   │   ├── high-score-button.svg
│   │   ├── catch-treats.svg
│   │   ├── pawse-time.svg
│   │   ├── left-arrow.svg
│   │   ├── right-arrow.svg
│   │   ├── controls.svg
│   │   ├── AD_keys.svg
│   │   ├── arrow_keys.svg
│   │   ├── goal.svg
│   │   ├── sounds.svg
│   │   ├── favicon.svg
│   │   ├── apple-touch-icon.png
│   │   └── paw-survival.svg
│   ├── items/
│   │   ├── fish.svg
│   │   ├── bone.svg
│   │   ├── star.svg
│   │   ├── kitty.svg
│   │   ├── tasty.svg
│   │   ├── yarn.svg
│   │   ├── ball.svg
│   │   ├── heart.svg
│   │   ├── bomb.svg
│   │   ├── trash.svg
│   │   └── goal.svg
│   ├── characters/
│   │   ├── dog_idle.svg
│   │   ├── dog_dead.svg
│   │   ├── cat_idle.svg
│   │   └── cat_dead.svg
│   └── music/
│       └── catch_a_paw_music.m4a
└── fonts/
    └── inter-800.ttf
```

---

## 8. Open Questions

| Question | Impact | Resolution |
|----------|--------|------------|
| Exact FastAPI version? | Low | Any 0.100+ works |
| PostgreSQL vs Supabase? | Medium | Schema compatible; Supabase adds auth/realtime if needed |
| Score validation server-side? | High | Recompute from session events or trust client with anti-cheat |
| Session TTL? | Medium | Default 1 hour; configurable |
| Rate limit policy? | Medium | 10 req/min per IP on submit |
| CORS origins? | Low | `https://school-sick-yadika.vercel.app` + localhost |
| Admin API? | Low | Not in scope |
| Analytics? | Low | Not observed |

---

## 9. Definition of Done

- [ ] Frontend runs locally with zero console errors
- [ ] Backend starts and responds to all 3 endpoints
- [ ] Database migrations apply cleanly
- [ ] Full game playable end-to-end
- [ ] Score persists and appears on leaderboard
- [ ] Duplicate submission blocked
- [ ] Session expires and rejects late submission
- [ ] Unit tests pass for API layer
- [ ] Integration test covers happy path
- [ ] Deployed to staging environment

---

## 10. Evidence References

| Artifact | SHA-256 | Location |
|----------|---------|----------|
| Frontend bundle | `a8afe080deb94bc5df0ed141ac17615a4b825d4a003b55bc609393d479d9dd1d` | `/tmp/school-sick-yadika/` |
| Browser capture | `ev_...` | REA session |
| Static analysis | `ev_e46b85fa1b2e4ebc53826e5e6887953a83a6d67d47ef1db424cbe62574f9595c` | `/tmp/school-sick-yadika_evidence.json` |

---

## 11. Next Actions

1. **Create repo** with this structure
2. **Copy assets** from captured `/tmp/school-sick-yadika/`
3. **Implement backend** per Phase 2
4. **Wire integration** per Phase 3
5. **Deploy** per Phase 5

---

*Generated from REA static analysis + browser replay. Backend internals inferred from frontend contract; exact server source not available.*