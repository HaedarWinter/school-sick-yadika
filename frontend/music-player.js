// Music Player UI for School Sick In Yadika Soreang
// Integrates with AudioManager to provide track selection, play/pause, and volume control

(function createMusicPlayer() {
  function createMusicPlayerUI() {
    const container = document.createElement('div');
    container.className = 'music-player';
    container.id = 'music-player';

    // Header
    const header = document.createElement('div');
    header.className = 'music-player__header';
    header.innerHTML = '<h3>MUSIC</h3>';

    // Now Playing
    const nowPlaying = document.createElement('div');
    nowPlaying.className = 'music-player__now-playing';
    nowPlaying.id = 'music-player-now-playing';
    nowPlaying.innerHTML = `
      <div class="music-player__cover-wrap">
        <img class="music-player__cover" alt="Album cover" /><span class="music-player__placeholder" aria-hidden="true">NO<br />COVER</span>
      </div>
      <div class="music-player__now-copy">
        <span class="music-player__label">NOW PLAYING</span>
        <strong class="music-player__title">—</strong>
        <div class="music-player__equalizer" aria-hidden="true">
          ${Array.from({ length: 10 }, () => '<span></span>').join('')}
        </div>
      </div>`;

    // Play/Pause Button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'music-player__play-pause pixel-button pixel-button--primary';
    playPauseBtn.id = 'music-player-play-pause';
    playPauseBtn.type = 'button';
    playPauseBtn.setAttribute('aria-label', 'Play/Pause music');
    playPauseBtn.textContent = '▶ PLAY';

    // Track List
    const trackListLabel = document.createElement('label');
    trackListLabel.className = 'music-player__label';
    trackListLabel.textContent = 'Select Track:';

    const trackList = document.createElement('div');
    trackList.className = 'music-player__track-list';
    trackList.id = 'music-player-track-list';

    // Volume Control
    const volumeLabel = document.createElement('label');
    volumeLabel.className = 'music-player__label';
    volumeLabel.htmlFor = 'music-player-volume';
    volumeLabel.textContent = 'Volume:';

    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.id = 'music-player-volume';
    volumeSlider.className = 'music-player__volume-slider';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.value = '30';
    volumeSlider.setAttribute('aria-label', 'Music volume');

    const volumeValue = document.createElement('span');
    volumeValue.className = 'music-player__volume-value';
    volumeValue.id = 'music-player-volume-value';
    volumeValue.textContent = '30%';

    const volumeContainer = document.createElement('div');
    volumeContainer.className = 'music-player__volume-container';
    const volumeBlocks = document.createElement('div');
    volumeBlocks.className = 'music-player__volume-blocks';
    volumeBlocks.setAttribute('role', 'group');
    volumeBlocks.setAttribute('aria-label', 'Music volume');
    for (let index = 1; index <= 10; index += 1) {
      const block = document.createElement('button');
      block.type = 'button';
      block.className = 'music-player__volume-block';
      block.dataset.volume = String(index * 10);
      block.setAttribute('aria-label', `Set volume to ${index * 10}%`);
      volumeBlocks.append(block);
    }
    volumeContainer.append(volumeBlocks, volumeSlider, volumeValue);

    // Assemble — Left column: Now Playing + Play/Pause
    const leftColumn = document.createElement('div');
    leftColumn.className = 'music-player__left';
    leftColumn.append(nowPlaying, playPauseBtn);

    // Right column: Track List + Volume (each with integrated label)
    const rightColumn = document.createElement('div');
    rightColumn.className = 'music-player__right';

    const trackListSection = document.createElement('div');
    trackListSection.className = 'music-player__section';
    trackListSection.append(trackListLabel, trackList);
    rightColumn.append(trackListSection);

    const volumeSection = document.createElement('div');
    volumeSection.className = 'music-player__section';
    volumeSection.append(volumeLabel, volumeContainer);
    rightColumn.append(volumeSection);

    container.append(header, leftColumn, rightColumn);

    return {
      container,
      playPauseBtn,
      trackList,
      volumeSlider,
      volumeValue,
      nowPlaying,
    };
  }

  function initializeMusicPlayer(ui) {
    const tracks = AudioManager.getMusicTracks();
    const state = AudioManager.getMusicState();

    // Populate track list
    const trackList = ui.trackList;
    trackList.innerHTML = '';
    tracks.forEach((track) => {
      const btn = document.createElement('button');
      const isActive = track.id === state.currentTrackId;
      btn.className = `music-player__track-button ${isActive ? 'is-active' : ''}`;
      btn.type = 'button';
      btn.innerHTML = `<span class="music-player__track-marker" aria-hidden="true"></span><span class="music-player__track-copy"><strong>${track.title}</strong><small>${track.artist || ''}</small></span>${isActive ? '<span class="music-player__active-tag">AKTIF</span>' : ''}`;
      btn.setAttribute('data-track-id', track.id);
      btn.addEventListener('click', () => {
        AudioManager.playMusicTrack(track.id);
        updateMusicPlayerUI(ui);
      });
      trackList.append(btn);
    });

    // Set volume slider
    ui.volumeSlider.value = Math.round(state.volume * 100);
    ui.volumeValue.textContent = `${Math.round(state.volume * 100)}%`;

    // Play/Pause button
    updatePlayPauseButton(ui);

    // Event listeners
    ui.playPauseBtn.addEventListener('click', () => {
      AudioManager.toggleMusic();
      updatePlayPauseButton(ui);
    });

    const updateVolumeUI = (value) => {
      const percent = Math.round(value * 100);
      ui.volumeSlider.value = percent;
      ui.volumeValue.textContent = `${percent}%`;
      ui.volumeSlider.setAttribute('aria-valuenow', String(percent));
      ui.container.querySelectorAll('.music-player__volume-block').forEach((block) => {
        block.classList.toggle('is-filled', Number(block.dataset.volume) <= percent);
      });
    };

    ui.volumeSlider.addEventListener('input', (e) => {
      const volume = Number(e.target.value) / 100;
      AudioManager.setMusicVolume(volume);
      updateVolumeUI(volume);
    });

    ui.container.querySelectorAll('.music-player__volume-block').forEach((block) => {
      block.addEventListener('click', () => {
        const volume = Number(block.dataset.volume) / 100;
        AudioManager.setMusicVolume(volume);
        updateVolumeUI(volume);
      });
    });
    updateVolumeUI(state.volume);

    updateNowPlaying(ui);
  }

  function updateMusicPlayerUI(ui) {
    const state = AudioManager.getMusicState();
    const tracks = AudioManager.getMusicTracks();

    // Update track buttons
    ui.trackList.querySelectorAll('.music-player__track-button').forEach((btn) => {
      const trackId = btn.getAttribute('data-track-id');
      const isActive = trackId === state.currentTrackId;
      btn.classList.toggle('is-active', isActive);
      btn.querySelector('.music-player__active-tag')?.remove();
      if (isActive) {
        const activeTag = document.createElement('span');
        activeTag.className = 'music-player__active-tag';
        activeTag.textContent = 'AKTIF';
        btn.append(activeTag);
      }
    });

    updatePlayPauseButton(ui);
    updateNowPlaying(ui);
  }

  function updatePlayPauseButton(ui) {
    const state = AudioManager.getMusicState();
    ui.playPauseBtn.textContent = state.playing ? '⏸ PAUSE' : '▶ PLAY';
    ui.playPauseBtn.setAttribute('aria-label', state.playing ? 'Pause music' : 'Play music');
    ui.container.querySelector('.music-player__equalizer')?.classList.toggle('is-playing', state.playing);
  }

  function updateNowPlaying(ui) {
    const state = AudioManager.getMusicState();
    ui.nowPlaying.querySelector('.music-player__title').textContent = state.currentTrack || '—';
    const track = AudioManager.getMusicTracks().find((item) => item.id === state.currentTrackId);
    const cover = ui.nowPlaying.querySelector('.music-player__cover');
    if (track && cover) {
      cover.onerror = () => {
        cover.onerror = null;
        cover.removeAttribute('src');
        cover.classList.add('is-missing');
      };
      cover.classList.toggle('is-missing', false);
      cover.src = track.cover || `/static/assets/covers/${track.id}.png`;
    }
  }

  window.MusicPlayer = {
    createMusicPlayerUI,
    initializeMusicPlayer,
    updateMusicPlayerUI,
  };
}());
