# Mini Music Player PRD

## Overview
Extend the existing single-track background music system into a small, user-controlled music player with multiple tracks. One track plays at a time; user can preview and switch.

---

## Current State
- `audio.js` manages one `<Audio>` element (`music`) with `loop=true`
- Source: `/static/assets/music/catch_a_paw_music.mp3` (fallback `.m4a`)
- Volume controlled via `MUSIC_VOLUME` (0.30) and `PAUSED_MUSIC_VOLUME` (0.15)
- Persisted preference: `school-sick-yadika-music` in localStorage

---

## Requirements

### Functional
1. **Track list** — Array of track objects: `{ id, title, artist?, src, duration? }`
2. **Single playback** — Only one track plays at a time
3. **Track switching** — User selects a track → current fades out, new fades in
4. **Play/Pause** — Toggle button; persists state
5. **Volume** — Slider (0–1); independent from SFX volume
6. **Persist selection** — Remember last played track + position in localStorage
7. **Auto-advance (optional)** — When track ends, play next in list (configurable)

### Non-functional
- No new dependencies — vanilla JS + existing AudioManager
- Mobile-friendly touch targets (≥44×44px)
- Keyboard accessible (Tab, Space/Enter)
- Graceful degradation if audio fails

---

## UI/UX

### Placement
- Settings panel (existing gear icon) → new "Music" section
- Or floating mini-player bar (bottom) — decide later

### Controls (minimal)
- Track selector (dropdown or horizontal pills)
- Play/Pause button
- Volume slider
- Current track title display
- Optional: progress bar (seek)

---

## Data Model

```js
const MUSIC_TRACKS = [
  { id: 'main-theme',  title: 'School Sick In Yadika Soreang Theme', artist: 'Original', src: '/static/assets/music/school-sick-yadika-theme.m4a', fallbackSrc: '/static/assets/music/school-sick-yadika-theme.m4a' },
  { id: 'track-2',     title: 'Your Custom Song',   artist: 'You',      src: '/static/assets/music/custom-song.mp3' },
  // add more later
];
```

---

## Integration Points

### AudioManager additions
- `musicTracks` array (exposed for UI)
- `currentTrackIndex` state
- `playTrack(index)` — crossfade switch
- `togglePlay()` — play/pause
- `setMusicVolume(v)` — 0–1
- `getMusicState()` — `{ playing, currentTrack, volume, currentTime }`

### localStorage keys
- `school-sick-yadika-music-track` — last track id
- `school-sick-yadika-music-position` — resume position (seconds)
- `school-sick-yadika-music-volume` — volume (0–1)
- `school-sick-yadika-music-playing` — boolean

---

## Implementation Steps

1. **Define track list** in `audio.js` (or separate config module)
2. **Extend AudioManager** with new methods above
3. **Crossfade logic** — `fadeOut(current, 300ms) → swap src → fadeIn(new, 300ms)`
4. **Persist/restore** on load
5. **Build UI** in settings panel (reuse pixel-button, pixel-icon-button)
6. **Wire events** — track change, play/pause, volume, ended → auto-next (optional)

---

## Out of Scope (v1)
- Playlist reordering
- Shuffle/repeat modes
- Metadata parsing (ID3 tags)
- Equalizer/visualization
- Background audio when tab inactive (requires Media Session API)

---

## Acceptance Criteria
- [ ] User opens settings → sees track list with current highlighted
- [ ] Clicking another track switches smoothly (crossfade)
- [ ] Play/Pause works, persists across reloads
- [ ] Volume slider works, independent from SFX
- [ ] Last track + position restored on revisit
- [ ] No console errors; works on mobile Chrome/Safari