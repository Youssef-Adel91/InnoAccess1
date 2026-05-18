"use client";

import React, { useState, useEffect } from "react";
import YouTube, { YouTubeProps } from "react-youtube";

interface SecureYouTubePlayerProps {
    youtubeUrl: string;
}

export default function SecureYouTubePlayer({ youtubeUrl }: SecureYouTubePlayerProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const extractVideoId = (url: string) => {
        if (!url) return null;
        if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url; // Already an ID
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[7].length === 11 ? match[7] : null;
    };

    const videoId = extractVideoId(youtubeUrl);

    if (!isMounted) {
        return <div className="aspect-video w-full bg-gray-200 animate-pulse rounded-lg" />;
    }

    if (!videoId) {
        return <div className="p-4 bg-red-50 text-red-600 rounded">Invalid YouTube URL</div>;
    }

    const opts: YouTubeProps["opts"] = {
        height: "100%",
        width: "100%",
        playerVars: {
            // https://developers.google.com/youtube/player_parameters
            controls: 1, // Native controls for WCAG accessibility
            modestbranding: 1,
            rel: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Player Wrapper */}
            <div 
                className="relative aspect-video w-full overflow-hidden bg-black rounded-lg shadow-lg"
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* YouTube Iframe */}
                <YouTube
                    videoId={videoId}
                    opts={opts}
                    className="absolute inset-0 w-full h-full"
                    iframeClassName="w-full h-full border-0"
                />

                {/* Top Glass Shield (Blocks Title / Share) */}
                <div className="absolute top-0 left-0 right-0 h-1/5 z-10 bg-transparent pointer-events-auto cursor-default" />
                
                {/* Notice: The bottom 80% is left without a shield so click-to-play and native controls work */}
            </div>
        </div>
    );
}
