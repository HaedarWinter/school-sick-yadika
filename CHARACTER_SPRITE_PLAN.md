# Human Character Sprite Generation Plan

**Project:** School Sick In Yadika Soreang — Human Character Migration  
**Date:** 2026-10-31  
**Target:** Replace cat/dog with Girl/Boy human sprites  
**Style Reference:** Side-view pixel art, chibi proportions (see `Style Reference Side View Game Sprite.png`)

---

## 1. Current Asset Analysis

### Existing Animal Sprites (10 SVG files)
| State | Cat | Dog |
|-------|-----|-----|
| Idle | `cat_idle.svg` | `dog_idle.svg` |
| Dead | `cat_dead.svg` | `dog_dead.svg` |
| Hurt | `cat_hurt.svg` | `dog_hurt.svg` |
| Left | `cat_left.svg` | `dog_left.svg` |
| Right | `cat_right.svg` | `dog_right.svg` |

### Style References
- **Primary:** `Style Reference Side View Game Sprite.png` - side-view pixel art, ~80px height
- **Secondary:** `Cute Chibi Pixel Art 256x256.png` - chibi proportions, 256x256

### Game Constants (from RECONSTRUCTION.md)
- `playerSize: 80` - sprite render size
- `itemSize: 64` - reference for scaling
- Canvas: 960x720

---

## 2. Required Human Character Sprites

### 3 Characters × 6 States = 18 Total Sprites per Character

| Character | Archetype | Visual Notes |
|-----------|-----------|--------------|
| **Girl** | Protagonist | Casual outfit, ponytail/short hair, expressive face |
| **Boy** | Protagonist | Casual outfit, short hair, expressive face |
| **Major 3** | NPC / Variant | Distinct silhouette (elder, child, or stylized variant) |

### Animation States (Priority Order)

| State | Frames | Description | Loop |
|-------|--------|-------------|------|
| **Idle** | 4-6 | Breathing, subtle sway, blink | ✅ Loop |
| **Walk** | 6-8 | **Full walk cycle** - heel strike, weight transfer, arm swing, head bob | ✅ Loop |
| **Left** | 1-2 | Static left-facing pose (mirror of right) | Static |
| **Right** | 1-2 | Static right-facing pose (base orientation) | Static |
| **Hurt** | 3-4 | Flinch, recoil, recovery | Once |
| **Dead** | 4-6 | Fall, collapse, lie still | Once → hold last frame |

---

## 3. Prompt Templates for AI Generation

### Base Style Prompt (prepend to all)
```
Pixel art game sprite, side view, chibi proportions (1:2.5 head:body), 80px canvas height, 
clean outlines, limited palette (16 colors max), transparent background, 
style: cute indie game aesthetic, crisp pixel edges, no anti-aliasing
```

---

### Character-Specific Prompts

#### Girl - Base Description
```
Young girl, ~12-14 years old, casual modern outfit (hoodie/t-shirt + shorts/leggings), 
shoulder-length hair with slight bounce, expressive eyes, light skin tone, 
sneakers visible from side
```

#### Boy - Base Description
```
Young boy, ~12-14 years old, casual modern outfit (graphic tee + cargo shorts/joggers), 
short messy hair, expressive eyes, light-medium skin tone, sneakers visible from side
```

#### Major 3 (Elder Variant) - Base Description
```
Elderly character, ~60-70 years old, comfortable sweater + loose pants, 
gray/white hair (bun or short), gentle expression, slight stoop in posture, 
walking shoes, slower movement feel
```

---

### State-Specific Prompts

#### Idle (4-6 frames)
```
[CHARACTER BASE] standing straight, weight evenly distributed, 
gentle breathing animation - chest rises/falls 1-2px, 
occasional blink (1 frame every 60-120 frames), 
subtle hair/clothing sway, arms relaxed at sides with slight swing
```

#### Walk Cycle (6-8 frames) — **KEY ANIMATION**
```
[CHARACTER BASE] full walk cycle side view, 8 frames:
Frame 1: Right heel contact, left toe push-off, right arm forward, left arm back
Frame 2: Right foot flat, left heel lifting, arms passing
Frame 3: Right mid-stance, left knee forward, arms mid-swing
Frame 4: Right heel lifting, left heel contact, arms passing opposite
Frame 5: Left heel contact, right toe push-off (mirror of frame 1)
Frame 6: Left foot flat, right heel lifting
Frame 7: Left mid-stance, right knee forward
Frame 8: Left heel lifting, right heel contact

Key details:
- Head bobs 1-2px up/down (lowest at frames 2/6, highest at 4/8)
- Shoulders counter-rotate slightly with hips
- Arms swing naturally (opposite to legs)
- Feet never leave ground completely (no floating)
- Knee bend visible on passing leg
- 80px tall character, ~40px stride length
```

#### Left / Right (Static - 1-2 frames)
```
[CHARACTER BASE] standing profile, facing [LEFT/RIGHT], 
weight on back foot, front foot slightly forward, 
head turned slightly toward viewer, 
ready-to-move pose, not rigid attention
```

#### Hurt (3-4 frames)
```
[CHARACTER BASE] recoil from impact:
Frame 1: Impact - head snaps back, shoulders hunch, knees buckle slightly
Frame 2: Maximum recoil - body arched back, arms flail outward, eyes closed/squinted
Frame 3: Recovery start - body straightening, arms coming in, eyes opening
Frame 4: Settle - back to neutral but shaken, slight tremble in limbs
Color flash: brief white/red tint on hit frame
```

#### Dead (4-6 frames)
```
[CHARACTER BASE] collapse sequence:
Frame 1: Knees give way, start falling forward/backward
Frame 2: Hands reach out to break fall, torso rotating
Frame 3: Impact with ground - arms/hands hit first
Frame 4: Body settles, limbs relax
Frame 5: Final rest pose - lying on side, eyes closed, peaceful
Frame 6: Hold (subtle dust settle particle optional)
No blood, no gore - cartoon "knocked out" style
```

---

## 4. Technical Specifications

### Canvas & Grid
| Property | Value |
|----------|-------|
| Canvas per frame | 80x80px (match `playerSize`) |
| Sprite sheet layout | Horizontal strip (frames left→right) |
| Naming convention | `{character}_{state}.png` (e.g., `girl_walk.png`) |
| Frame count in filename | Optional: `girl_walk_8f.png` |

### Color Palette (Shared, 16 colors)
```
#000000  - Outline
#1a1a2e  - Dark shadow
#16213e  - Mid shadow
#0f3460  - Base clothing dark
#e94560  - Accent (girl: pink, boy: blue)
#ffffff  - Highlight/eyes
#f8f8f8  - Skin highlight
#ffeaa7  - Skin base
#fab1a0  - Skin shadow
#b8b8b8  - Clothing mid
#636e72  - Clothing shadow
#2d3436  - Shoe/outline
#fd79a8  - Cheek blush
#a29bfe  - Hair accent
#ffeaa7  - Hair highlight
#dfe6e9  - Background reference (not in sprite)
```

### Export Settings
- Format: PNG (transparency)
- Color mode: Indexed (16 colors)
- No metadata
- Origin: Bottom-center (feet aligned)

---

## 5. Implementation Plan (Step by Step)

### Phase 1: Generation (Week 1)
- [ ] **Step 1.1** Generate Girl base character (idle pose) - validate style match
- [ ] **Step 1.2** Generate Boy base character (idle pose) - validate style match
- [ ] **Step 1.3** Generate Major 3 base character - validate distinct silhouette
- [ ] **Step 1.4** Approve base designs before animation

### Phase 2: Animation - Core States (Week 1-2)
- [ ] **Step 2.1** Generate Girl **Walk** cycle (8 frames) - most complex, test in-game first
- [ ] **Step 2.2** Generate Boy **Walk** cycle (8 frames)
- [ ] **Step 2.3** Generate Major 3 **Walk** cycle (6-8 frames, slower)
- [ ] **Step 2.4** Test walk cycles in engine - verify no sliding, correct speed

### Phase 3: Animation - Remaining States (Week 2)
- [ ] **Step 3.1** Generate **Idle** (4-6 frames) for all 3 characters
- [ ] **Step 3.2** Generate **Hurt** (3-4 frames) for all 3 characters
- [ ] **Step 3.3** Generate **Dead** (4-6 frames) for all 3 characters
- [ ] **Step 3.4** Generate **Left/Right** static poses (mirror if symmetrical)

### Phase 4: Integration (Week 2-3)
- [ ] **Step 4.1** Create sprite sheets (horizontal strips)
- [ ] **Step 4.2** Update `game-data.js` character config:
  ```js
  CHARACTERS = {
    girl: { id: 'girl', name: 'Maya', title: 'The Collector', 
            sprites: { idle: 4, walk: 8, hurt: 3, dead: 5, left: 1, right: 1 } },
    boy: { id: 'boy', name: 'Leo', title: 'The Runner',
           sprites: { idle: 4, walk: 8, hurt: 3, dead: 5, left: 1, right: 1 } },
    elder: { id: 'elder', name: 'Grandpa', title: 'The Wise',
             sprites: { idle: 4, walk: 6, hurt: 3, dead: 5, left: 1, right: 1 } }
  }
  ```
- [ ] **Step 4.3** Update `game.js` animation controller to handle variable frame counts
- [ ] **Step 4.4** Update character select screen (`#player-screen`)
- [ ] **Step 4.5** Test all states in-game, fix timing/alignment

### Phase 5: Polish (Week 3)
- [ ] **Step 5.1** Add particle effects (dust on walk, stars on hurt)
- [ ] **Step 5.2** Verify palette consistency across all sprites
- [ ] **Step 5.3** Optimize file sizes (pngcrush/oxipng)
- [ ] **Step 5.4** Document frame timings in `ANIMATION_TIMING.md`

---

## 6. Walk Cycle Reference (Critical)

### 8-Frame Walk Cycle Breakdown

| Frame | Legs | Arms | Head Y | Torso Rot | Notes |
|-------|------|------|--------|-----------|-------|
| 1 | R heel strike, L toe off | R forward, L back | -1px | +2° | Contact |
| 2 | R flat, L heel up | Passing | -2px | 0° | Down |
| 3 | R mid, L knee forward | R back, L forward | -1px | -2° | Passing |
| 4 | R heel up, L heel strike | Passing | 0px | 0° | Contact |
| 5 | L heel strike, R toe off | L forward, R back | -1px | -2° | Contact (mirror) |
| 6 | L flat, R heel up | Passing | -2px | 0° | Down |
| 7 | L mid, R knee forward | L back, R forward | -1px | +2° | Passing |
| 8 | L heel up, R heel strike | Passing | 0px | 0° | Contact |

**Timing:** 80-100ms per frame (10-12 FPS) → ~720-800ms full cycle

---

## 7. Prompt Examples (Copy-Paste Ready)

### Girl Walk Cycle (Single Prompt for All 8 Frames)
```
Pixel art sprite sheet, 8 frames horizontal, each 80x80px, transparent background.
Young girl, ~13 years old, casual hoodie + leggings, sneakers, shoulder-length hair with bounce.
Side view walk cycle, chibi 1:2.5 proportions, 16-color palette.
Frame 1: Right heel contact, left toe push-off, right arm forward, left arm back, head -1px
Frame 2: Right foot flat, left heel lifting, arms passing, head -2px (lowest)
Frame 3: Right mid-stance, left knee forward, arms mid-swing, head -1px
Frame 4: Right heel lifting, left heel contact, arms passing, head 0px
Frame 5: Mirror of frame 1 (left lead)
Frame 6: Mirror of frame 2, head -2px
Frame 7: Mirror of frame 3
Frame 8: Mirror of frame 4
Clean pixel edges, no anti-aliasing, cute indie game style. Subtle hair/clothing follow-through.
```

### Girl Idle (4 Frames)
```
Pixel art sprite sheet, 4 frames horizontal, each 80x80px.
Young girl idle animation: breathing (chest +1/-1px), blink frame 3, subtle hair sway.
Weight evenly distributed, relaxed stance, arms loose at sides.
16-color palette, chibi proportions, side view, transparent BG.
```

### Girl Hurt (3 Frames)
```
Pixel art sprite sheet, 3 frames horizontal, each 80x80px.
Young girl hurt recoil: 
Frame 1 - Impact: head snaps back, shoulders hunch, knees buckle
Frame 2 - Max recoil: arched back, arms flail, eyes squint, brief white flash
Frame 3 - Recovery: straightening, arms in, eyes open, slight tremble
Cartoon knockback, no gore. 16 colors, chibi, side view.
```

### Girl Dead (5 Frames)
```
Pixel art sprite sheet, 5 frames horizontal, each 80x80px.
Young girl collapse knockout:
Frame 1: Knees buckle, start fall
Frame 2: Arms reach out, torso rotating
Frame 3: Ground impact, hands first
Frame 4: Body settles, limbs relax
Frame 5: Lying on side, eyes closed, peaceful
Cartoon "fainted" style. 16 colors, chibi, side view.
```

---

## 8. Validation Checklist Per Sprite

- [ ] Correct dimensions (80x80 per frame)
- [ ] Transparent background
- [ ] 16-color palette max
- [ ] Bottom-center origin aligned (feet on same baseline)
- [ ] No floating pixels / clean edges
- [ ] Consistent outline thickness (1px)
- [ ] Frame timing noted in filename or metadata
- [ ] Walk cycle: no foot sliding, proper weight transfer
- [ ] Idle: loops seamlessly
- [ ] Hurt/Dead: clear readability at game speed

---

## 9. File Structure Output

```
frontend/static/assets/characters/
├── girl_idle.png        (4 frames × 80px = 320px wide)
├── girl_walk.png        (8 frames × 80px = 640px wide)
├── girl_hurt.png        (3 frames × 80px = 240px wide)
├── girl_dead.png        (5 frames × 80px = 400px wide)
├── girl_left.png        (1 frame = 80px wide)
├── girl_right.png       (1 frame = 80px wide)
├── boy_idle.png
├── boy_walk.png
├── boy_hurt.png
├── boy_dead.png
├── boy_left.png
├── boy_right.png
├── elder_idle.png
├── elder_walk.png
├── elder_hurt.png
├── elder_dead.png
├── elder_left.png
└── elder_right.png
```

---

## 10. Tools & Workflow

| Task | Tool |
|------|------|
| AI Generation | Midjourney / DALL-E 3 / Stable Diffusion (ControlNet) |
| Cleanup/Animation | Aseprite / Pyxel Edit / Piskel |
| Palette Enforcement | Aseprite "Palette Lock" |
| Sprite Sheet Pack | TexturePacker / custom script |
| In-engine Test | Local dev server (`python -m http.server`) |

---

## 11. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Walk cycle slides | Test in-engine at actual `playerSpeedBase: 1`; adjust frame stride |
| Palette drift | Use single `.ase` palette file; import for each character |
| Inconsistent scale | Overlay reference grid (80px) in Aseprite; snap feet to baseline |
| Animation timing off | Define frame durations in code config, not hardcoded |
| Scope creep | Freeze design after Phase 1 approval; no new states |

---

## 12. Quick Start Commands

```bash
# Test sprite in browser (quick visual check)
cd frontend && python -m http.server 8080
# Open http://localhost:8080/static/assets/characters/girl_walk.png

# Optimize all PNGs
cd frontend/static/assets/characters
oxipng -o 4 --strip safe *.png

# Verify frame counts (ImageMagick)
identify -format "%f: %w x %h (%n frames)\n" *_walk.png
```

---

**Next Action:** Approve base character designs (Step 1.1-1.3) → Begin walk cycle generation (Step 2.1)