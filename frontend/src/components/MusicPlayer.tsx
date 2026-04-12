"use client";

import React from "react";
import { Music, Play, Volume2 } from "lucide-react";

interface MusicPlayerProps {
    url: string;
}

export default function MusicPlayer({ url }: MusicPlayerProps) {
    if (!url) return null;

    // MP3 Direct Logic (Firebase Storage or others)
    if (url.includes(".mp3") || url.includes("firebasestorage") || url.includes("audio")) {
        return (
            <div className="w-full max-w-lg mx-auto my-6 animate-fadeIn px-2">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-2 h-2 rounded-full bg-vento-primary animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-vento-primary/80">Audio Premium Seleccionado</span>
                </div>
                <div className="bg-white/5 backdrop-blur-sm p-4 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-4 transition-all hover:bg-white/10">
                    <div className="w-12 h-12 bg-vento-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-vento-primary/30">
                         <Music size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 ml-1">Música de Fondo</p>
                        <audio 
                            src={url} 
                            controls 
                            className="w-full h-8 opacity-80 hover:opacity-100 transition-opacity"
                        />
                    </div>
                </div>
                <style jsx>{`
                    audio::-webkit-media-controls-enclosure {
                        background-color: transparent;
                    }
                    audio::-webkit-media-controls-panel {
                        background-color: transparent;
                    }
                `}</style>
            </div>
        );
    }

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
            <div className="w-full max-w-lg mx-auto my-6 animate-fadeIn px-2">
                <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#1DB954]/80">Reproduciendo desde Spotify</span>
                </div>
                <iframe
                    src={`${cleanUrl}?utm_source=generator&theme=0`}
                    width="100%"
                    height="80"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="rounded-2xl shadow-xl border border-white/10"
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
            <div className="w-full max-w-lg mx-auto my-6 animate-fadeIn px-2">
                <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="w-2 h-2 rounded-full bg-[#FF0000] animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF0000]/80">Reproduciendo desde YouTube Music</span>
                </div>
                <div className="relative h-[60px] rounded-2xl overflow-hidden shadow-xl border border-white/10 bg-black">
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autohide=1&controls=1&showinfo=0`}
                        className="absolute top-[-300px] left-0 w-full h-[400px]"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        title="Music Player"
                    ></iframe>
                    {/* Dark gradient overlay to hide video content further and focus on controls */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black via-black/40 to-transparent pointer-events-none"></div>
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
