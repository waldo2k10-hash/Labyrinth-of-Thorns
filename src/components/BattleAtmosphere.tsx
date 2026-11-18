import React from 'react';
import { BattleTier } from '../types/game';
import { getBattleTierStyles } from '../utils/battleTheme';

export interface BattleAtmosphereProps {
  tier: BattleTier;
  children: React.ReactNode;
}

export const BattleAtmosphere: React.FC<BattleAtmosphereProps> = ({ tier, children }) => {
  const styles = getBattleTierStyles(tier);

  return (
    <div className={`relative min-h-screen w-full transition-all duration-1000 ease-in-out ${styles.container}`}>
      {/* The "Atmospheric Overlay" - creates that heavy, suffocating feel */}
      <div 
        className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${styles.overlay}`} 
      />
      
      {/* The actual game content */}
      <main className="relative z-10 p-4">
        {children}
      </main>
    </div>
  );
};

export default BattleAtmosphere;
