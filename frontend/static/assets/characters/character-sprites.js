/**
 * Character Sprite Path Resolution
 * Centralized, typo-proof, handles akuntan " copy" suffix quirk
 */

const CHARACTER_BASE = '/static/assets/characters';

// Major-specific filename prefixes
const PREFIXES = {
  akuntan: { boy: 'akboy', girl: 'akgirl' },
  perhotelan: { boy: 'perhotelanboy', girl: 'perhotelangirl' },
  pplg: { boy: 'pplgboy', girl: 'pplggirl' },
};

// States that have the " copy" suffix for akuntan_boy
const AKUNTAN_BOY_COPY_STATES = new Set(['idle', 'left', 'right']);

/**
 * Build sprite path for a character major/gender/state
 * @param {'akuntan'|'perhotelan'|'pplg'} major
 * @param {'boy'|'girl'} gender
 * @param {'idle'|'left'|'right'|'hurt'|'dead'|'walk'} state
 * @returns {string} Full asset path
 */
function charPath(major, gender, state) {
  const prefix = PREFIXES[major]?.[gender];
  if (!prefix) {
    throw new Error(`Unknown major/gender: ${major}/${gender}`);
  }

  const needsCopySuffix = major === 'akuntan' && gender === 'boy' && AKUNTAN_BOY_COPY_STATES.has(state);
  const suffix = needsCopySuffix ? ' copy.svg' : '.svg';

  return `${CHARACTER_BASE}/${major}/${prefix}_${state}${suffix}`;
}

/**
 * Generate full CHARACTER_SPRITES object for all valid major/gender combos
 * Only includes combos that have assets on disk (validated at build time)
 */
function generateCharacterSprites(enabledMajors = ['akuntan', 'perhotelan']) {
  const sprites = {};

  for (const major of enabledMajors) {
    for (const gender of ['boy', 'girl']) {
      // Skip pplg entirely until folder created
      if (major === 'pplg') continue;

      const key = `${major}_${gender}`;
      sprites[key] = {
        idle: charPath(major, gender, 'idle'),
        left: charPath(major, gender, 'left'),
        right: charPath(major, gender, 'right'),
        hurt: charPath(major, gender, 'hurt'),
        dead: charPath(major, gender, 'dead'),
        // walk: charPath(major, gender, 'walk'), // enable when walk sprites exist
      };
    }
  }

  return sprites;
}

// Export ready-to-use object
export const CHARACTER_SPRITES = generateCharacterSprites();

// Display names (separate from sprite keys)
export const CHARACTER_NAMES = {
  akuntan_girl: 'Hana',
  akuntan_boy: 'Haru',
  perhotelan_girl: 'Hirara',  // uses boy sprites for now
  perhotelan_boy: 'Han',
  // pplg_boy: 'Hikaru',
  // pplg_girl: 'Havi',
};

// Helper: get display name from sprite key
export function getCharacterName(spriteKey) {
  return CHARACTER_NAMES[spriteKey] || spriteKey;
}

// Helper: list available character keys for UI
export function getAvailableCharacters() {
  return Object.keys(CHARACTER_SPRITES);
}

// Helper: validate all paths exist (run at build/dev)
export async function validateSpritePaths() {
  const missing = [];
  for (const [key, states] of Object.entries(CHARACTER_SPRITES)) {
    for (const [state, path] of Object.entries(states)) {
      try {
        const res = await fetch(path, { method: 'HEAD' });
        if (!res.ok) missing.push(`${key}.${state} → ${path}`);
      } catch {
        missing.push(`${key}.${state} → ${path}`);
      }
    }
  }
  if (missing.length) {
    console.warn('[CHARACTER_SPRITES] Missing assets:', missing);
  }
  return missing;
}

// Auto-validate in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  validateSpritePaths();
}