// Centralized audio service for School Sick In Yadika Soreang.
// One music element is kept for the entire page lifetime; short SFX use a
// small bounded pool so rapid catches remain responsive without leaking audio.
(function createAudioManager() {
  const MUSIC_VOLUME = 0.30;
  const PAUSED_MUSIC_VOLUME = 0.15;
  const SFX_VOLUME = 0.70;
  const basePath = '/static/assets/music/';
  const sources = {
    click: `${basePath}click.mp3`,
    hover: `${basePath}hover.mp3`,
    hurt: `${basePath}hurt.mp3`,
    dead: `${basePath}dead.mp3`,
    points: `${basePath}points.mp3`,
    heart: `${basePath}heart.mp3`,
    hana: `${basePath}hana.mp3`,
    hikaru: `${basePath}hikaru.mp3`,
    havi: `${basePath}havi.mp3`,
    haru: `${basePath}haru.mp3`,
    hirara: `${basePath}hirara.mp3`,
    han: `${basePath}han.mp3`,
    countdown: `${basePath}321-go.mp3`,
    speedUp: `${basePath}level-speed-up.mp3`,
  };

  const CHARACTER_AUDIO_MAP = {
    akuntan_girl: 'hana',
    akuntan_boy: 'haru',
    perhotelan_girl: 'hirara',
    perhotelan_boy: 'han',
    pplg_girl: 'havi',
    pplg_boy: 'hikaru',
  };

  // Music tracks configuration
  const MUSIC_TRACKS = [
    {
      id: 'main-theme',
      title: 'School Sick In Yadika Soreang Theme',
      artist: 'Original',
      src: '/static/assets/music/school-sick-yadika-theme.m4a',
      fallbackSrc: '/static/assets/music/school-sick-yadika-theme.m4a',
      cover: '/static/assets/covers/main-theme.png',
    },
    {
      id: 'custom-song',
      title: 'Wish We Could Stay',
      artist: 'Haedar',
      src: '/static/assets/music/Wish We Could Stay.mp3',
      cover: '/static/assets/covers/wish.jpg',
    },
  ];

  const storedMusicTrackId = localStorage.getItem('school-sick-yadika-music-track');
  const storedMusicVolume = Number(localStorage.getItem('school-sick-yadika-music-volume'));
  let currentMusicTrackId = MUSIC_TRACKS.some((track) => track.id === storedMusicTrackId)
    ? storedMusicTrackId
    : MUSIC_TRACKS[0].id;
  let currentMusicVolume = Number.isFinite(storedMusicVolume)
    ? Math.min(1, Math.max(0, storedMusicVolume))
    : MUSIC_VOLUME;

  const music = new Audio();
  music.loop = true;
  music.preload = 'auto';
  music.volume = currentMusicVolume;

  const legacySoundPreference = localStorage.getItem('school-sick-yadika-sound');
  const storedSfxPreference = localStorage.getItem('school-sick-yadika-sfx');
  const storedMusicPreference = localStorage.getItem('school-sick-yadika-music');
  let sfxEnabled = (storedSfxPreference ?? legacySoundPreference) !== 'off';
  let musicEnabled = (storedMusicPreference ?? legacySoundPreference) !== 'off';
  let unlocked = false;
  let musicPlayPromise = null;
  let sfxContext = null;
  const sfxBuffers = new Map();
  const sfxLoads = new Map();
  const sfxGainFactors = new Map();

  // Normalize every SFX to the same perceived loudness. Different MP3
  // masters peak at different levels; without this some sounds play soft,
  // others clip hot. Measure RMS after decode and scale to a shared target.
  const TARGET_RMS = 0.2;
  const MIN_GAIN = 0.25;
  const MAX_GAIN = 4;

  // Debounce character hover sounds to prevent collision when sweeping mouse
  // across multiple cards. Only one character hover sound per 120ms window.
  let lastCharacterHoverTime = 0;
  let activeCharacterSource = null;
  let activeCharacterGain = null;
  let characterPlaybackToken = 0;
  const CHARACTER_HOVER_DEBOUNCE_MS = 120;

  function stopCharacterSound() {
    characterPlaybackToken += 1;
    if (!activeCharacterSource || !activeCharacterGain) return;
    const now = sfxContext?.currentTime ?? 0;
    activeCharacterGain.gain.cancelScheduledValues(now);
    activeCharacterGain.gain.setValueAtTime(activeCharacterGain.gain.value, now);
    activeCharacterGain.gain.linearRampToValueAtTime(0, now + 0.04);
    activeCharacterSource.stop(now + 0.05);
    activeCharacterSource = null;
    activeCharacterGain = null;
  }

  function computeRms(buffer) {
    let sumSquares = 0;
    let samples = 0;
    for (let c = 0; c < buffer.numberOfChannels; c += 1) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i += 1) {
        sumSquares += data[i] * data[i];
      }
      samples += data.length;
    }
    return samples ? Math.sqrt(sumSquares / samples) : 0;
  }

  function ensureSfxContext() {
    if (sfxContext) return sfxContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    sfxContext = new AudioContextClass();
    return sfxContext;
  }

  function loadSfxBuffer(name) {
    if (sfxBuffers.has(name)) return Promise.resolve(sfxBuffers.get(name));
    if (sfxLoads.has(name)) return sfxLoads.get(name);

    const context = ensureSfxContext();
    if (!context) return Promise.resolve(null);

    const load = fetch(sources[name])
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load ${name} sound`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        sfxBuffers.set(name, buffer);
        const rms = computeRms(buffer);
        const factor = rms > 0 ? Math.min(MAX_GAIN, Math.max(MIN_GAIN, TARGET_RMS / rms)) : 1;
        sfxGainFactors.set(name, factor);
        return buffer;
      })
      .catch(() => null);
    sfxLoads.set(name, load);
    return load;
  }

  function resumeSfxContext() {
    const context = ensureSfxContext();
    if (!context || context.state !== 'suspended') return Promise.resolve();
    return context.resume().catch(() => { });
  }

  function unlock() {
    unlocked = true;
    if (sfxEnabled) resumeSfxContext();
    if (musicEnabled) startMusic();
  }

  function startMusic() {
    if (!musicEnabled || !music.paused || musicPlayPromise) return;
    music.volume = currentMusicVolume;
    musicPlayPromise = music.play()
      .catch(() => { unlocked = false; })
      .finally(() => { musicPlayPromise = null; });
  }

  function pauseMusic() {
    music.volume = PAUSED_MUSIC_VOLUME;
    localStorage.setItem('school-sick-yadika-music-playing', 'false');
  }

  function resumeMusic() {
    if (!musicEnabled) return;
    music.volume = currentMusicVolume;
    if (unlocked) startMusic();
  }

  function playSfx(name) {
    if (!sfxEnabled || !sources[name]) return;
    const context = ensureSfxContext();
    if (!context) return;

    const playBuffer = (buffer, sfxName) => {
      if (!sfxEnabled || !buffer || context.state !== 'running') return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      const factor = sfxGainFactors.get(sfxName) ?? 1;
      gain.gain.value = SFX_VOLUME * factor;
      source.connect(gain).connect(context.destination);
      source.start();
    };

    Promise.all([resumeSfxContext(), loadSfxBuffer(name)]).then(([, buffer]) => playBuffer(buffer, name));
  }

  function playCharacterSfx(character) {
    const name = CHARACTER_AUDIO_MAP[character];
    if (!sfxEnabled || !name || !sources[name]) return;
    const context = ensureSfxContext();
    if (!context) return;

    stopCharacterSound();
    const playbackToken = characterPlaybackToken;
    Promise.all([resumeSfxContext(), loadSfxBuffer(name)]).then(([, buffer]) => {
      if (!sfxEnabled || !buffer || context.state !== 'running' || playbackToken !== characterPlaybackToken) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = SFX_VOLUME * (sfxGainFactors.get(name) ?? 1);
      source.connect(gain).connect(context.destination);
      source.onended = () => {
        if (activeCharacterSource === source) {
          activeCharacterSource = null;
          activeCharacterGain = null;
        }
      };
      activeCharacterSource = source;
      activeCharacterGain = gain;
      source.start();
    });
  }

  function setEnabled(enabled) {
    setSfxEnabled(enabled);
    setMusicEnabled(enabled);
  }

  function setMusicEnabled(enabled) {
    musicEnabled = Boolean(enabled);
    localStorage.setItem('school-sick-yadika-music', musicEnabled ? 'on' : 'off');
    if (musicEnabled && unlocked) startMusic();
    if (!musicEnabled) music.pause();
  }

  function setSfxEnabled(enabled) {
    sfxEnabled = Boolean(enabled);
    localStorage.setItem('school-sick-yadika-sfx', sfxEnabled ? 'on' : 'off');
    if (sfxEnabled && unlocked) resumeSfxContext();
  }

  // Music player functions
  function loadMusicTrack(trackId) {
    const track = MUSIC_TRACKS.find(t => t.id === trackId);
    if (!track) return false;

    currentMusicTrackId = trackId;
    music.src = track.src;
    music.addEventListener('error', () => {
      if (track.fallbackSrc && music.src !== new URL(track.fallbackSrc, window.location.href).href) {
        music.src = track.fallbackSrc;
      }
    }, { once: true });
    music.loop = true;
    music.preload = 'auto';
    music.volume = currentMusicVolume;

    localStorage.setItem('school-sick-yadika-music-track', trackId);
    return true;
  }

  function playMusicTrack(trackId) {
    const wasPlaying = !music.paused;
    if (!loadMusicTrack(trackId)) return;
    music.currentTime = 0;
    if (wasPlaying || unlocked) startMusic();
  }

  function toggleMusic() {
    if (music.paused) {
      localStorage.setItem('school-sick-yadika-music-playing', 'true');
      startMusic();
    } else {
      pauseMusic();
    }
  }

  function setMusicVolume(volume) {
    currentMusicVolume = Math.max(0, Math.min(1, volume));
    music.volume = currentMusicVolume;
    localStorage.setItem('school-sick-yadika-music-volume', currentMusicVolume);
  }

  function getMusicState() {
    return {
      playing: !music.paused,
      currentTrack: MUSIC_TRACKS.find(t => t.id === currentMusicTrackId)?.title || 'Unknown',
      currentTrackId: currentMusicTrackId,
      volume: currentMusicVolume,
      currentTime: music.currentTime,
      duration: music.duration,
    };
  }

  function getMusicTracks() {
    return MUSIC_TRACKS.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      cover: t.cover,
    }));
  }

  // Restore music player state from localStorage
  (function restoreMusicState() {
    const savedTrack = localStorage.getItem('school-sick-yadika-music-track');
    const savedVolume = localStorage.getItem('school-sick-yadika-music-volume');

    if (savedTrack && MUSIC_TRACKS.find(t => t.id === savedTrack)) {
      currentMusicTrackId = savedTrack;
    }
    if (savedVolume !== null) {
      currentMusicVolume = parseFloat(savedVolume);
      music.volume = currentMusicVolume;
    }

    // Load the saved track
    loadMusicTrack(currentMusicTrackId);
  })();

  // Delegated bindings cover static and dynamically-created buttons exactly
  // once, including modal controls created after initial page load.
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('button');
    if (!button) return;
    unlock();
    if (button.classList.contains('character-card')) {
      // Character selection plays its own sound - don't trigger generic click
      const character = button.dataset.character;
      if (character) playCharacterSfx(character);
      return;
    }
    playSfx('click');
  }, true);

  document.addEventListener('mouseover', (event) => {
    const button = event.target.closest?.('button');
    if (!button || button.contains(event.relatedTarget)) return;
    if (button.classList.contains('character-card')) {
      const now = Date.now();
      if (now - lastCharacterHoverTime < CHARACTER_HOVER_DEBOUNCE_MS) return;
      lastCharacterHoverTime = now;
      const character = button.dataset.character;
      if (character) playCharacterSfx(character);
      return;
    }
    playSfx('hover');
  }, true);

  document.addEventListener('mouseout', (event) => {
    const button = event.target.closest?.('button');
    if (!button || button.contains(event.relatedTarget)) return;
    if (button.classList.contains('character-card')) {
      stopCharacterSound();
    }
  }, true);

  // A first pointer/keyboard gesture also unlocks music when it is not a
  // button (for example, a touch gesture on the landing screen).
  document.addEventListener('pointerdown', unlock, { once: false, passive: true });
  document.addEventListener('keydown', unlock, { once: false });

  window.AudioManager = {
    unlock,
    startMusic,
    pauseMusic,
    resumeMusic,
    playClick: () => playSfx('click'),
    playHover: () => playSfx('hover'),
    playHurt: () => playSfx('hurt'),
    playDead: () => {
      playSfx('dead');
      const previousVolume = music.volume;
      music.volume = Math.min(previousVolume, 0.12);
      window.setTimeout(() => {
        if (!music.paused && musicEnabled) music.volume = stateIsPaused() ? PAUSED_MUSIC_VOLUME : MUSIC_VOLUME;
      }, 700);
    },
    playPoints: () => playSfx('points'),
    playHeart: () => playSfx('heart'),
    playCharacter: (character) => {
      const name = CHARACTER_AUDIO_MAP[character];
      if (!sfxEnabled || !name || !sources[name]) return;
      stopCharacterSound();
      const context = ensureSfxContext();
      if (!context) return;
      Promise.all([resumeSfxContext(), loadSfxBuffer(name)]).then(([, buffer]) => {
        if (!sfxEnabled || !buffer || context.state !== 'running') return;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        gain.gain.value = SFX_VOLUME * (sfxGainFactors.get(name) ?? 1);
        source.connect(gain).connect(context.destination);
        source.onended = () => {
          if (activeCharacterSource === source) {
            activeCharacterSource = null;
            activeCharacterGain = null;
          }
        };
        activeCharacterSource = source;
        activeCharacterGain = gain;
        source.start();
      });
    },
    playCountdown: () => playSfx('countdown'),
    playSpeedUp: () => playSfx('speedUp'),
    setEnabled,
    setMusicEnabled,
    setSfxEnabled,
    isMusicEnabled: () => musicEnabled,
    // Music player methods
    loadMusicTrack,
    playMusicTrack,
    toggleMusic,
    setMusicVolume,
    getMusicState,
    getMusicTracks,
  };

  function stateIsPaused() {
    return window.gameState?.paused === true;
  }
}());
