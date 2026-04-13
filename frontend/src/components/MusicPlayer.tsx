"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Music, Pause, Play } from "lucide-react";

interface MusicPlayerProps {
    url: string;
}

export default function MusicPlayer({ url }: MusicPlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    // Controls whether the YouTube/Spotify iframe is injected (only after user interaction)
    const [iframeReady, setIframeReady] = useState(false);

    const isMP3 = !!url && (url.includes(".mp3") || url.includes("firebasestorage") || url.includes("audio"));
    const isYouTube = !!url && (url.includes("youtube.com") || url.includes("youtu.be") || url.includes("music.youtube.com"));
    const isSpotify = !!url && url.includes("spotify.com");

    // ── MP3: create Audio element, play on first user gesture ──────────────
    useEffect(() => {
        if (!isMP3 || !url) return;

        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = 0.7;
        audioRef.current = audio;

        const startOnInteraction = () => {
            if (audioRef.current?.paused) {
                audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(() => {});
            }
        };

        // Try immediate autoplay (succeeds if browser allows it)
        audio.play()
            .then(() => setIsPlaying(true))
            .catch(() => {
                // Browser blocked autoplay → start on first user gesture
                document.addEventListener("click", startOnInteraction, { once: true });
                document.addEventListener("touchstart", startOnInteraction, { once: true });
                document.addEventListener("keydown", startOnInteraction, { once: true });
            });

        return () => {
            audio.pause();
            audio.src = "";
            audioRef.current = null;
            document.removeEventListener("click", startOnInteraction);
            document.removeEventListener("touchstart", startOnInteraction);
            document.removeEventListener("keydown", startOnInteraction);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    // ── YouTube / Spotify: inject iframe AFTER first user gesture ──────────
    useEffect(() => {
        if (!isYouTube && !isSpotify) return;

        const activateOnInteraction = () => setIframeReady(true);

        document.addEventListener("click", activateOnInteraction, { once: true });
        document.addEventListener("touchstart", activateOnInteraction, { once: true });
        document.addEventListener("keydown", activateOnInteraction, { once: true });

        return () => {
            document.removeEventListener("click", activateOnInteraction);
            document.removeEventListener("touchstart", activateOnInteraction);
            document.removeEventListener("keydown", activateOnInteraction);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    const toggleMP3 = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play().then(() => setIsPlaying(true)).catch(() => {});
        }
    }, [isPlaying]);

    if (!url) return null;

    // ── YouTube ─────────────────────────────────────────────────────────────
    if (isYouTube) {
        let videoId = "";
        if (url.includes("v="))        videoId = url.split("v=")[1]?.split("&")[0] ?? "";
        else if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1]?.split("?")[0] ?? "";
        else if (url.includes("embed/"))    videoId = url.split("embed/")[1]?.split("?")[0] ?? "";
        if (!videoId) return null;

        return (
            <>
                {/* Injected only after user gesture → autoplay is allowed */}
                {iframeReady && (
                    <iframe
                        key="yt-music"
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1`}
                        allow="autoplay; encrypted-media"
                        title="Background Music"
                        style={{
                            position: "fixed",
                            width: 1,
                            height: 1,
                            opacity: 0,
                            pointerEvents: "none",
                            border: "none",
                            bottom: 0,
                            left: 0,
                        }}
                    />
                )}
                <FloatingMusicButton isPlaying={iframeReady} label={iframeReady ? "Reproduciendo música" : "La música empezará al navegar"} />
            </>
        );
    }

    // ── Spotify ─────────────────────────────────────────────────────────────
    if (isSpotify) {
        let embedUrl = url;
        if (url.includes("/track/"))    embedUrl = url.replace("open.spotify.com/track/",    "open.spotify.com/embed/track/");
        else if (url.includes("/playlist/")) embedUrl = url.replace("open.spotify.com/playlist/", "open.spotify.com/embed/playlist/");
        else if (url.includes("/album/"))    embedUrl = url.replace("open.spotify.com/album/",    "open.spotify.com/embed/album/");
        const cleanUrl = embedUrl.split("?")[0];

        return (
            <>
                {iframeReady && (
                    <iframe
                        key="sp-music"
                        src={`${cleanUrl}?utm_source=generator&theme=0&autoplay=1`}
                        width="1"
                        height="1"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        style={{
                            position: "fixed",
                            opacity: 0,
                            pointerEvents: "none",
                            bottom: 0,
                            left: 0,
                        }}
                        title="Background Music"
                    />
                )}
                <FloatingMusicButton isPlaying={iframeReady} label={iframeReady ? "Reproduciendo música" : "La música empezará al navegar"} />
            </>
        );
    }

    // ── MP3 ─────────────────────────────────────────────────────────────────
    if (isMP3) {
        return (
            <FloatingMusicButton
                isPlaying={isPlaying}
                onToggle={toggleMP3}
                label={isPlaying ? "Pausar música" : "Reproducir música"}
            />
        );
    }

    return null;
}

// ── Floating music button ────────────────────────────────────────────────────
interface FloatingMusicButtonProps {
    isPlaying: boolean;
    onToggle?: () => void;
    label?: string;
}

function FloatingMusicButton({ isPlaying, onToggle, label }: FloatingMusicButtonProps) {
    return (
        <button
            onClick={onToggle}
            title={label}
            aria-label={label}
            style={{
                cursor: onToggle ? "pointer" : "default",
                background: isPlaying
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(0,0,0,0.45)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "50%",
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
                transition: "transform 0.2s ease, background 0.2s ease",
                position: "relative",
                flexShrink: 0,
            }}
            onMouseEnter={e => { if (onToggle) e.currentTarget.style.transform = "scale(1.1)"; }}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
            {/* Animated pulse ring when playing */}
            {isPlaying && (
                <span
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        inset: -5,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.35)",
                        animation: "musicPulse 2.4s ease-in-out infinite",
                        pointerEvents: "none",
                    }}
                />
            )}

            {onToggle ? (
                isPlaying ? <Pause size={17} /> : <Play size={17} />
            ) : (
                <Music size={17} style={{ opacity: isPlaying ? 1 : 0.5 }} />
            )}

            <style>{`
                @keyframes musicPulse {
                    0%   { transform: scale(1);    opacity: 0.7; }
                    60%  { transform: scale(1.35); opacity: 0; }
                    100% { transform: scale(1.35); opacity: 0; }
                }
            `}</style>
        </button>
    );
}
