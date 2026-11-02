// Shared game item configuration.
// Gameplay and How to Play both consume this single source of truth.

const ITEM_ASSET_PATH = '/static/assets/items/';

const HUMAN_CHARACTERS = [
  'akuntan_girl',
  'akuntan_boy',
  'perhotelan_girl',
  'perhotelan_boy',
  'pplg_girl',
  'pplg_boy',
];

const HUMAN_ITEMS = ['star', 'heart', 'pawseTime', 'bomb', 'trash'];

const GAME_ITEMS = {
  fish: { id: 'fish', label: 'Fish', asset: `${ITEM_ASSET_PATH}fish.svg`, category: 'food', score: 10, characters: [] },
  bone: { id: 'bone', label: 'Bone', asset: `${ITEM_ASSET_PATH}bone.svg`, category: 'food', score: 10, characters: [] },
  star: { id: 'star', label: 'Star', asset: `${ITEM_ASSET_PATH}star.svg`, category: 'bonus', score: 20, spawnWeight: 0.5, characters: HUMAN_CHARACTERS },
  heart: { id: 'heart', label: 'Heart', asset: `${ITEM_ASSET_PATH}heart.svg`, category: 'life', effect: '+1 life', lifeChange: 1, spawnWeight: 0.25, characters: HUMAN_CHARACTERS },
  pawseTime: { id: 'pawseTime', label: 'Pawse Time', asset: '/static/assets/ui/pawse-time.svg', category: 'power-up', effect: 'Slows falling items by 50% for 5 seconds', spawnWeight: 0.18, characters: HUMAN_CHARACTERS },
  bomb: { id: 'bomb', label: 'Bomb', asset: `${ITEM_ASSET_PATH}bomb.svg`, category: 'hazard', effect: '-1 life', lifeChange: -1, characters: HUMAN_CHARACTERS },
  trash: { id: 'trash', label: 'Trash', asset: `${ITEM_ASSET_PATH}trash.svg`, category: 'hazard', effect: '-1 life', lifeChange: -1, characters: HUMAN_CHARACTERS },
  kitty: { id: 'kitty', label: 'Kitty food can', asset: `${ITEM_ASSET_PATH}kitty.svg`, category: 'food', score: 15, characters: [] },
  tasty: { id: 'tasty', label: 'Tasty food can', asset: `${ITEM_ASSET_PATH}tasty.svg`, category: 'food', score: 15, characters: [] },
  yarn: { id: 'yarn', label: 'Yarn', asset: `${ITEM_ASSET_PATH}yarn.svg`, category: 'special', score: 15, characters: [] },
  ball: { id: 'ball', label: 'Ball', asset: `${ITEM_ASSET_PATH}ball.svg`, category: 'special', score: 15, characters: [] },
};

const CHARACTER_ITEMS = {
  akuntan_girl: HUMAN_ITEMS,
  akuntan_boy: HUMAN_ITEMS,
  perhotelan_girl: HUMAN_ITEMS,
  perhotelan_boy: HUMAN_ITEMS,
  pplg_girl: HUMAN_ITEMS,
  pplg_boy: HUMAN_ITEMS,
};

window.GAME_ITEMS = GAME_ITEMS;
window.CHARACTER_ITEMS = CHARACTER_ITEMS;
