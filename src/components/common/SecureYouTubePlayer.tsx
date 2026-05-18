"use client";

import React, { useState, useEffect, useRef } from "react";
import YouTube, { YouTubeProps } from "react-youtube";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface SecureYouTubePlayerProps {
    youtubeUrl: string;
}

export default function SecureYouTubePlayer({ youtubeUrl }: SecureYouTubePlayerProps) {
    const playerRef = useRef<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Extract video ID from url
    const extractVideoId = (url: string) => {
        if (!url) return null;
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
            modestbranding: 1,
            rel: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
    };

    const onReady: YouTubeProps["onReady"] = (event) => {
        playerRef.current = event.target;
        setIsMuted(event.target.isMuted());
    };

    const onStateChange: YouTubeProps["onStateChange"] = (event) => {
        // PlayerState.PLAYING = 1, PlayerState.PAUSED = 2
        if (event.data === 1) {
            setIsPlaying(true);
        } else if (event.data === 2) {
            setIsPlaying(false);
        }
    };

    const handlePlay = () => {
        if (playerRef.current) {
            playerRef.current.playVideo();
            setIsPlaying(true);
        }
    };

    const handlePause = () => {
        if (playerRef.current) {
            playerRef.current.pauseVideo();
            setIsPlaying(false);
        }
    };

    const toggleMute = () => {
        if (playerRef.current) {
            if (isMuted) {
                playerRef.current.unMute();
                setIsMuted(false);
            } else {
                playerRef.current.mute();
                setIsMuted(true);
            }
        }
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
                    onReady={onReady}
                    onStateChange={onStateChange}
                    className="absolute inset-0 w-full h-full"
                    iframeClassName="w-full h-full border-0"
                />

                {/* Top Glass Shield (Blocks Title / Share) */}
                <div className="absolute top-0 left-0 right-0 h-[20%] z-10 bg-transparent cursor-default" />

                {/* Bottom Glass Shield (Blocks YouTube Logo / URL) */}
                <div className="absolute bottom-0 left-0 right-0 h-[20%] z-10 bg-transparent cursor-default" />
                
                {/* Notice: The middle 60% is left without a shield so click-to-play still works if needed */}
            </div>

            {/* Custom Accessible Controls */}
            <div className="flex flex-wrap items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                <button
                    onClick={isPlaying ? handlePause : handlePlay}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 active:bg-blue-800"
                    aria-label={isPlaying ? "Pause Course Video" : "Play Course Video"}
                    tabIndex={0}
                >
                    {isPlaying ? (
                        <>
                            <Pause className="w-5 h-5" aria-hidden="true" />
                            <span>Pause</span>
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5" aria-hidden="true" />
                            <span>Play</span>
                        </>
                    )}
                </button>

                <button
                    onClick={toggleMute}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-full hover:bg-gray-300 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-400 active:bg-gray-400"
                    aria-label={isMuted ? "Unmute Video" : "Mute Video"}
                    tabIndex={0}
                >
                    {isMuted ? (
                        <>
                            <VolumeX className="w-5 h-5" aria-hidden="true" />
                            <span>Unmute</span>
                        </>
                    ) : (
                        <>
                            <Volume2 className="w-5 h-5" aria-hidden="true" />
                            <span>Mute</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
