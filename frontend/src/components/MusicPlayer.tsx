"use client";

import React from "react";

interface MusicPlayerProps {
    url: string;
}

export default function MusicPlayer({ url }: MusicPlayerProps) {
    if (!url) return null;

    // Spotify Logic
    if (url.includes("spotify.com")) {
        let embedUrl = url;
        
        // Convert open.spotify.com/track/ID to open.spotify.com/embed/track/ID
        if (url.includes("/track/")) {
            embedUrl = url.replace("open.spotify.com/track/", "open.spotify.com/embed/track/");
        } else if (url.includes("/playlist/")) {
            embedUrl = url.replace("open.spotify.com/playlist/", "open.spotify.com/embed/playlist/");
        } else if (url.includes("/album/")) {
            embedUrl = url.replace("open.spotify.com/album/", "open.spotify.com/embed/album/");
        }

        // Clean up query params to avoid issues but keep embed format
        const cleanUrl = embedUrl.split('?')[0];

        return (
            <div className="w-full max-w-lg mx-auto my-6 animate-fadeIn">
                <iframe
                    src={`${cleanUrl}?utm_source=generator&theme=0`}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="rounded-3xl shadow-lg border border-white/20"
                ></iframe>
            </div>
        );
    }

    // YouTube Music / YouTube Logic
    if (url.includes("youtube.com") || url.includes("youtu.be") || url.includes("music.youtube.com")) {
        let videoId = "";
        
        if (url.includes("v=")) {
            videoId = url.split("v=")[1]?.split("&")[0];
        } else if (url.includes("youtu.be/")) {
            videoId = url.split("youtu.be/")[1]?.split("?")[0];
        } else if (url.includes("embed/")) {
            videoId = url.split("embed/")[1]?.split("?")[0];
        }

        if (!videoId) return null;

        return (
            <div className="w-full max-w-lg mx-auto my-6 animate-fadeIn">
                <div className="relative pt-[56.25%] rounded-3xl overflow-hidden shadow-lg border border-white/20 bg-black">
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Music Player"
                    ></iframe>
                </div>
            </div>
        );
    }

    return (
        <div className="text-center p-4 bg-red-50 text-red-500 rounded-xl text-xs italic">
            Formato de música no compatible. Usa Spotify o YouTube Music.
        </div>
    );
}
