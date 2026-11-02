# School Sick In Yadika Soreang

Pixel-art arcade game where players catch pet characters while avoiding obstacles. Features character selection, music player, high scores, and planned story mode.

**Live:** https://school-sick-yadika.vercel.app  
**Developer:** Haedar (https://haedarr.my.id/)  
**Location:** SMK Yadika Soreang

---

## Quick Start

### Frontend (Vercel-hosted)

```bash
cd frontend
# No build needed — static HTML + JS

# Local dev with live server:
# (Use any static server: python -m http.server, etc.)
python -m http.server 8000
# Visit http://localhost:8000/index.html
```

### Backend (FastAPI)

```bash
cd backend

# Setup
python -m venv venv
source venv/bin/activate
pip install -e .

# Run
uvicorn app.main:app --reload

# API docs: http://localhost:8000/docs
```

---

## Architecture

```
school-sick-yadika/
├── frontend/                    # Vanilla JS + CSS, no build tools
│   ├── index.html              # Entry point (production)
│   ├── index.dev.html          # Dev mirror of index.html
│   ├── game.js                 # Core game loop, character/item logic
│   ├── game-data.js            # Character sprites, item configs
│   ├── audio.js                # Music/SFX manager, localStorage persistence
│   ├── music-player.js         # Settings modal music player UI
│   ├── game-ui.js              # UI components (buttons, modals)
│   ├── game.css                # Game canvas styling
│   ├── styles/
│   │   ├── base.css            # Design tokens (--pink, --cream, --brown, etc.)
│   │   ├── components.css      # Reusable UI element styles
│   │   ├── gameplay.css        # Game canvas + character/item rendering
│   │   ├── music-player.css    # Music player pixel-art layout
│   │   ├── overlays.css        # Modal/dialog styles
│   │   ├── selection.css       # Character select screen
│   │   ├── responsive.css      # Mobile breakpoints
│   │   └── compatibility.css   # Cross-browser fixes
│   ├── static/
│   │   ├── assets/
│   │   │   ├── characters/     # SVG per-character, per-state (idle, left, right, hurt, dead)
│   │   │   ├── items/          # SVG item icons (star, heart, bomb, etc.)
│   │   │   ├── ui/             # SVG buttons, icons
│   │   │   ├── music/          # Audio tracks (.m4a, .mp3)
│   │   │   ├── covers/         # Album cover images for music player
│   │   │   └── environment/    # Background SVGs
│   │   └── fonts/              # TTF (Inter, Press Start 2P)
│   └── site.webmanifest        # PWA manifest (app name, icons, theme)
│
├── backend/                     # FastAPI + SQLAlchemy + AsyncPG
│   ├── app/
│   │   ├── main.py             # FastAPI setup, CORS, middleware
│   │   ├── config.py           # Settings from environment
│   │   ├── database.py         # Async DB connection pool
│   │   ├── models.py           # SQLAlchemy ORM + Pydantic schemas
│   │   └── routers/
│   │       └── api.py          # /api/session, /api/leaderboard endpoints
│   ├── tests/
│   │   └── test_api.py         # Integration tests
│   ├── .env.example            # Environment template
│   └── pyproject.toml          # Dependencies, project metadata
│
├── docs/                        # Documentation
│   └── (future: architecture diagrams, deployment guides)
│
├── PRD.md                       # Product Requirements: music player specs
├── RECONSTRUCTION.md           # Full technical spec (frontend, backend, API)
├── CHARACTER_SPRITE_PLAN.md    # Sprite asset inventory per character/state
└── README.md                    # (this file)
```

---

## Core Game Loop

**File:** `frontend/game.js`

1. **Init** → Load character, set spawn items, start timer
2. **Update** (60 FPS) → Move character, spawn/despawn items, check collisions
3. **Render** → Draw canvas with character + items + score
4. **Collision** → Item caught → score++; bomb hit → lives--
5. **End** → Lives = 0 → game over; display score, save highscore

### Key State Variables

```js
gameState = {
  isRunning: boolean,
  score: number,
  lives: number,
  timeElapsed: number,
  currentCharacter: 'cat' | 'dog' | 'akuntan_girl' | ... ,
  items: Array<{x, y, type, vx, vy}>,
  // ...
}
```

---

## Audio System

**Files:** `frontend/audio.js`, `frontend/music-player.js`

### Music Tracks

```js
const MUSIC_TRACKS = [
  {
    id: 'main-theme',
    title: 'School Sick In Yadika Soreang Theme',
    artist: 'School Sick',
    src: '/static/assets/music/school-sick-yadika-theme.m4a',
    cover: '/static/assets/covers/main-theme.png',
  },
  {
    id: 'custom-song',
    title: 'Wish We Could Stay',
    artist: 'Custom Artist',
    src: '/static/assets/music/Wish We Could Stay.mp3',
    cover: '/static/assets/covers/wish.jpg',
  },
  // ...
]
```

### SFX (Per-Character)

- **Character selection:** `hana.mp3`, `haru.mp3`, `hirara.mp3`, `han.mp3`, `havi.mp3`, `hikaru.mp3`
- **Game events:** `click.mp3` (item catch), `hover.mp3` (UI hover), `points.mp3` (score up)
- **Gameplay:** `aspi.mp3`, `lily.mp3` (misc)

### localStorage Keys

```js
school-sick-yadika-music      // 'on' | 'off'
school-sick-yadika-sfx        // 'on' | 'off'
school-sick-yadika-highscores // JSON array of scores
```

---

## Backend API

**Base:** `http://localhost:8000` (dev) | deployed backend URL (prod)

### Endpoints

#### `POST /api/session`
Create a new game session.

```json
// Request
{ "character": "cat" }

// Response 200
{
  "session_id": "uuid",
  "character": "cat",
  "created_at": "2026-11-03T10:00:00Z"
}
```

#### `POST /api/leaderboard`
Submit a score.

```json
// Request
{
  "session_id": "uuid",
  "score": 1250,
  "duration_seconds": 45,
  "character": "cat"
}

// Response 201
{ "rank": 5, "highscore": true }
```

#### `GET /api/leaderboard`
Fetch top scores.

```json
// Response 200
{
  "scores": [
    { "rank": 1, "score": 5000, "character": "cat", "date": "2026-11-01" },
    ...
  ]
}
```

#### `GET /health`
Health check.

```json
// Response 200
{ "ok": true }
```

---

## Character Sprite System

**File:** `frontend/game-data.js` (character registry) | `frontend/static/assets/characters/` (SVG files)

Each character has 5 states:
- `idle` — resting position
- `left` — moving left
- `right` — moving right
- `hurt` — collision with bomb
- `dead` — lives = 0

**Characters:**

| Key | Name | School | SVGs |
|-----|------|--------|------|
| `akuntan_girl` | Hana | Accounting | `akgirl_idle.svg`, `akgirl_left.svg`, etc. |
| `akuntan_boy` | Haru | Accounting | `akboy_idle.svg`, `akboy_left.svg`, etc. |
| `perhotelan_girl` | Hirara | Hotel | `perhotelangirl_*.svg` |
| `perhotelan_boy` | Han | Hotel | `perhotelanboy_*.svg` |
| `pplg_girl` | Havi | IT | `pplggirl_*.svg` |
| `pplg_boy` | Hikaru | IT | `pplgboy_*.svg` |

---

## Items & Scoring

**File:** `frontend/game-data.js`

| Item | Points | Type | Notes |
|------|--------|------|-------|
| ⭐ Star | +10 | catch | Common |
| ❤️ Heart | +25 | catch | Rare, health bonus |
| 💣 Bomb | -1 life | avoid | Instant collision |
| 🗑️ Trash | +5 | catch | Common |
| 🐟 Fish | +15 | catch | Pet food |
| 🧶 Yarn | +12 | catch | Cat toy |
| 🦴 Bone | +12 | catch | Dog toy |

Each item has:
- Spawn frequency (weight)
- Duration (ttl)
- Base velocity

---

## Styling & Design Tokens

**File:** `frontend/styles/base.css`

```css
:root {
  --pink: #E83F73;
  --cream: #F5EDD3;
  --cream-light: #F9F4E8;
  --brown: #5A3A32;
  --sky: #89CFF0;
  --yellow: #FFD700;
}
```

All pixel-art UI uses these tokens. No gradients, no blur, no border-radius (pixelated aesthetic).

---

## Settings & Music Player

**File:** `frontend/music-player.js`

**UI Structure:**
- Header: "MUSIC" label
- Left column: Now Playing (cover art, title, animated equalizer) + Play/Pause button
- Right column: Track list + Volume control (10 clickable pixel blocks + slider)

**Features:**
- One track plays at a time
- Track switching fades out → fade in
- Volume persisted to localStorage
- Equalizer animates when playing
- Broken images fallback to "NO COVER" placeholder

---

## How to Play Modal

**File:** `frontend/game-ui.js` (`createHowToPlayModal()`)

Sections:
1. Controls (keyboard/touch)
2. Goal (catch items, avoid bombs)
3. Items grid (AKUNTAN ITEMS, PERHOTELAN ITEMS, PPLG ITEMS)
4. Survival Guide (tips & tricks)

---

## Deployment

### Frontend (Vercel)

```bash
cd frontend
# Vercel auto-deploys on git push
# No build step needed

# Environment: production
# URL: https://school-sick-yadika.vercel.app
```

### Backend (e.g., Railway, Fly.io, Heroku)

```bash
cd backend

# Set env vars:
DATABASE_URL=postgresql+asyncpg://...
CORS_ORIGINS=["https://school-sick-yadika.vercel.app", ...]

# Deploy:
# (Platform-specific; typically: git push heroku main)
```

---

## Development Workflow

### Adding a New Character

1. **Create SVGs:** `frontend/static/assets/characters/{char}/{char}_{state}.svg`
   - States: `idle`, `left`, `right`, `hurt`, `dead`
2. **Register in `game-data.js`:**
   ```js
   const CHARACTER_SPRITES = {
     new_char: {
       name: 'Character Name',
       school: 'School Name',
       idle: '/static/assets/characters/new_char/new_char_idle.svg',
       left: '/static/assets/characters/new_char/new_char_left.svg',
       // ...
     }
   }
   ```
3. **Add SFX:** `frontend/static/assets/music/{new_char}.mp3`
4. **Update `audio.js` CHARACTER_SOUNDS array**
5. **Test:** Character select screen should show new character

### Adding a New Item

1. **Create SVG:** `frontend/static/assets/items/{item_name}.svg`
2. **Register in `game-data.js`:**
   ```js
   const ITEM_CONFIGS = {
     new_item: {
       icon: '/static/assets/items/new_item.svg',
       points: 20,
       weight: 0.15,
       ttl: 8000,
       // ...
     }
   }
   ```
3. **Update `How to Play` modal if needed**

### Adding Music Tracks

1. **Add audio file:** `frontend/static/assets/music/{track_id}.m4a` or `.mp3`
2. **Add cover:** `frontend/static/assets/covers/{track_id}.png` or `.jpg` (optional)
3. **Register in `audio.js` MUSIC_TRACKS:**
   ```js
   {
     id: 'track_id',
     title: 'Track Title',
     artist: 'Artist Name',
     src: '/static/assets/music/track_id.m4a',
     cover: '/static/assets/covers/track_id.png',
   }
   ```

---

## Testing

### Frontend
- Manual browser testing (Chrome, Safari, Firefox, mobile)
- Check console for errors
- Test all characters, items, modals

### Backend

```bash
cd backend
pytest tests/
```

---

## Known Limitations & Future Work

- **Story Mode:** Planned; not yet implemented
- **Database:** SQLite (dev) → PostgreSQL recommended (prod)
- **Mobile:** Touch controls work; no app store distribution yet
- **Multiplayer:** Single-player only
- **Offline:** Requires internet for backend leaderboard; gameplay works offline

---

## License & Copyright

© Haedar, 2026. All rights reserved.

Developed for SMK Yadika Soreang.

---

## Support & Questions

**Repository:** https://github.com/HaedarWinter/school-sick-yadika  
**Issues:** GitHub Issues tab