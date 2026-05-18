"use client";

import React from "react";

interface SecureYouTubePlayerProps {
    youtubeUrl: string;
}

export default function SecureYouTubePlayer({ youtubeUrl }: SecureYouTubePlayerProps) {
    const videoId = youtubeUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/)?.[1] || youtubeUrl;

    if (!youtubeUrl || !videoId) {
        return (
            <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center text-white">
                Invalid Video URL
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-black">
                <iframe
                    src={`https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1&rel=0`}
                    title="Course Video"
                    className="absolute top-0 left-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
                
                <div 
                    className="absolute top-0 left-0 w-full h-1/5 z-10 pointer-events-auto" 
                    onContextMenu={(e) => e.preventDefault()}
                />

                {/* Bottom-Right Sniper Shield (Blocks "Watch on YouTube" logo) */}
                <div 
                    className="absolute bottom-0 right-0 w-[120px] h-[60px] z-10 pointer-events-auto" 
                    onContextMenu={(e) => e.preventDefault()}
                />
            </div>
        </div>
    );
}
