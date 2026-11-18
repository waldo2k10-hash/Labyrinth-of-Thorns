import { BattleTier } from '../types/game';

/**
 * Maps the BattleTier to visual intensity levels.
 * This allows the UI to "evolve" as the interaction deepens.
 */
export const getBattleTierStyles = (tier: BattleTier) => {
  switch (tier) {
    case 'confrontation':
      // Cold, analytical, sharp. Mostly Obsidian and Mossy.
      return {
        container: 'bg-obsidian text-parchment border-mossy',
        overlay: 'bg-transparent',
        intensity: 0,
      };
    case 'close':
      // Tense, rising heat. Adding subtle Oxblood hints.
      return {
        container: 'bg-mossy/20 text-parchment border-oxblood/50',
        overlay: 'bg-oxblood/5',
        intensity: 0.3,
      };
    case 'deep':
      // Intense, heavy, claustrophobic. More Oxblood and deeper shadows.
      return {
        container: 'bg-oxblood/10 text-parchment border-oxblood',
        overlay: 'bg-oxblood/20',
        intensity: 0.6,
      };
    case 'kiss':
      // Overwhelming, blurring boundaries. Heavy Oxblood, deep vignette.
      return {
        container: 'bg-oxblood text-parchment shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]',
        overlay: 'bg-oxblood/40 backdrop-blur-[2px]',
        intensity: 1,
      };
    default:
      return {
        container: 'bg-obsidian text-parchment',
        overlay: 'bg-transparent',
        intensity: 0,
      };
  }
};
