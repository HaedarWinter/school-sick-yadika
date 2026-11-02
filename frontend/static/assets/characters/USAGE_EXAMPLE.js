/**
 * Usage Example: How to use character-sprites.js
 * Copy this into your game.js or relevant module
 */

// Import (or copy-paste if not using modules)
import {
  CHARACTER_SPRITES,
  CHARACTER_NAMES,
  getCharacterName,
  getAvailableCharacters
} from './character-sprites.js';

// ─── Example 1: Get sprite paths for a character ───

const characterKey = 'akuntan_girl';
const sprites = CHARACTER_SPRITES[characterKey];

console.log('Idle:', sprites.idle);   // "/static/assets/characters/akuntan/akgirl_idle.svg"
console.log('Dead:', sprites.dead);   // "/static/assets/characters/akuntan/akgirl_dead.svg"

// ─── Example 2: Load sprite in canvas ───

function loadCharacterSprite(canvas, characterKey, state = 'idle') {
  const spritePath = CHARACTER_SPRITES[characterKey]?.[state];
  if (!spritePath) {
    console.warn(`No sprite for ${characterKey}.${state}`);
    return null;
  }

  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    // Game config: playerSize = 80
    const playerSize = 80;
    ctx.drawImage(img, 0, 0, playerSize, playerSize);
  };
  img.src = spritePath;
  return img;
}

// ─── Example 3: Character select screen ───

function populateCharacterSelect(selectElement) {
  const available = getAvailableCharacters();

  available.forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = getCharacterName(key); // "Hana", "Haru", etc.
    selectElement.appendChild(option);
  });
}

// ─── Example 4: Dynamic state switch (hurt → idle) ───

class CharacterState {
  constructor(characterKey) {
    this.characterKey = characterKey;
    this.currentState = 'idle';
    this.img = new Image();
    this.img.src = CHARACTER_SPRITES[characterKey].idle;
  }

  setState(newState) {
    if (this.currentState === newState) return;

    const path = CHARACTER_SPRITES[this.characterKey]?.[newState];
    if (!path) {
      console.warn(`Invalid state ${newState} for ${this.characterKey}`);
      return;
    }

    this.currentState = newState;
    this.img.src = path; // Browser caches, instant swap
  }

  draw(ctx, x, y, size = 80) {
    if (this.img.complete) {
      ctx.drawImage(this.img, x, y, size, size);
    }
  }
}

// Usage in game loop:
// const player = new CharacterState('akuntan_boy');
// player.setState('hurt');  // on damage
// player.setState('idle');  // after recovery
// player.draw(ctx, playerX, playerY);