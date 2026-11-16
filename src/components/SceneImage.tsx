import React from 'react';

interface SceneImageProps {
    imageUrl?: string;
    loading?: boolean;
}

export const SceneImage: React.FC<SceneImageProps> = ({ imageUrl, loading = false }) => {
    return (
        <div className="relative w-full h-full bg-black overflow-hidden">
            {/* The "Void Haze" - shown while image is loading */}
            {loading && (
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-purple-900/50 to-transparent animate-pulse" />
            )}
            
            <img 
                src={imageUrl || '/assets/default_void.jpg'} 
                className={`w-full h-full object-cover transition-all duration-1000 ease-in-out ${
                    loading ? 'opacity-0 scale-110 blur-xl' : 'opacity-100 scale-100 blur-0'
                }`} 
                alt="Void Manifestation" 
            />
            
            {loading && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-purple-300 text-xs italic animate-bounce">
                    Manifesting the void...
                </div>
            )}
        </div>
    );
};
