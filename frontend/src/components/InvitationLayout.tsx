"use client";

import React from "react";
import {
    Calendar,
    MapPin,
    Heart,
    ExternalLink,
    CheckCircle2,
    XCircle
} from "lucide-react";
import QRCode from "react-qr-code";
import FallingPetals from "@/components/FallingPetals";
import Countdown from "@/components/Countdown";
import MusicPlayer from "@/components/MusicPlayer";
import CameraCapture from "@/components/CameraCapture";
import { VentoEvent, ItineraryMoment } from "@/lib/types";
import { Theme } from "@/lib/themes";

interface LayoutProps {
    event: VentoEvent;
    guest: {
        id: string;
        name: string;
        passes: number;
        status: string;
        hasCompanion?: boolean;
        companionName?: string;
    };
    theme: Theme;
    rsvpDone: boolean;
    onOpenRSVP: () => void;
    isPreview?: boolean;
}

export function HTMLLayout({ event, guest, theme, rsvpDone, onOpenRSVP, isPreview }: LayoutProps) {
    const mapLink = event.mapUrl || (event.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}` : "#");

    return (
        <>
            <FallingPetals color={theme.colors.primaryLight} count={25} />
            
            <header className="relative w-full min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden bg-stone-900">
                <div 
                    className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-1000 transform hover:scale-105"
                    style={{ 
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${event.coverImageUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'})`,
                    }}
                />
                
                <div className="relative z-10 animate-fadeInUp">
                    <p className="text-xl md:text-2xl text-white/90 uppercase tracking-[0.4em] font-light mb-6">
                        Nuestra Boda
                    </p>
                    <h1 
                        className="text-7xl md:text-9xl mb-8 text-white drop-shadow-2xl"
                        style={{ fontFamily: theme.fonts.heading }}
                    >
                        {event.name || "Invitación Especial"}
                    </h1>
                    <div className="w-24 h-px bg-white/50 mx-auto my-8"></div>
                    <p className="text-2xl md:text-4xl text-white font-serif italic">
                        {event.date || "Próximamente"}
                    </p>
                </div>

                {event.musicUrl && !isPreview && (
                    <div className="absolute top-10 right-10 z-20">
                        <MusicPlayer url={event.musicUrl} />
                    </div>
                )}
                
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 animate-bounce text-white/50">
                    <div className="w-px h-12 bg-gradient-to-b from-white to-transparent mx-auto"></div>
                </div>
            </header>

            <section className="py-20 px-4 w-full max-w-4xl text-center mx-auto">
                <div className="mb-20">
                    <Countdown
                        targetDate={event.date}
                        type={event.countdownType}
                        theme={{
                            primary: theme.colors.primary,
                            primaryLight: theme.colors.primaryLight,
                            text: theme.colors.text
                        }}
                    />
                </div>
                
                <div className="w-full aspect-[16/9] md:aspect-[21/9] rounded-[3rem] overflow-hidden shadow-[0_48px_96px_-24px_rgba(0,0,0,0.15)] border-8 border-white">
                    <img 
                        src={event.countdownImageUrl || 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'} 
                        alt="Countdown" 
                        className="w-full h-full object-cover"
                    />
                </div>
            </section>

            {event.photoUrl && (
                <section className="py-24 px-4 w-full flex flex-col items-center animate-fadeIn">
                    <div className="relative">
                        <div className="absolute inset-0 bg-vento-primary/10 blur-[100px] rounded-full" />
                        <div className="relative w-56 h-56 md:w-80 md:h-80 rounded-full border-[12px] border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden z-10">
                            <img src={event.photoUrl} alt="Evento" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <div className="mt-12 text-center max-w-lg">
                        <p className="text-vento-text-muted italic font-serif text-lg">"En el amor no hay distancias, porque siempre estaremos juntos."</p>
                    </div>
                </section>
            )}

            <section className="py-20 px-4 w-full bg-stone-50/50">
                <div className="max-w-4xl mx-auto flex flex-col items-center">
                    <h2 className="text-4xl md:text-5xl mb-12" style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}>El Lugar</h2>
                    
                    <div className="bg-white rounded-[2rem] overflow-hidden shadow-xl border border-stone-100 w-full max-w-2xl">
                        <div className="h-64 overflow-hidden">
                            <img 
                                src={event.venueImageUrl || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"} 
                                alt="Lugar" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="p-10 text-center">
                            <h3 className="text-2xl font-bold mb-4">{event.location || "Ubicación del Evento"}</h3>
                            <p className="text-stone-500 mb-8 max-w-md mx-auto">Te esperamos para celebrar este día inolvidable.</p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <a href={mapLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-bold transition-all shadow-lg" style={{ backgroundColor: theme.colors.primary }}><MapPin size={18} /> Maps</a>
                                {event.venuePageUrl && (
                                    <a href={event.venuePageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 font-bold transition-all" style={{ borderColor: theme.colors.primary, color: theme.colors.primary }}><ExternalLink size={18} /> Salón</a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {event.itinerary && event.itinerary.length > 0 && (
                <section className="py-20 px-4 w-full max-w-5xl">
                    <h2 className="text-4xl md:text-5xl mb-16 text-center" style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}>Itinerario</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {event.itinerary.map((item, i) => (
                            <div key={i} className="bg-white p-8 rounded-[1.5rem] shadow-lg border border-stone-100 flex flex-col items-center text-center">
                                <span className="text-sm font-black text-vento-primary mb-2">{item.time}</span>
                                <h3 className="text-xl font-bold">{item.title}</h3>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="py-20 px-4 w-full bg-stone-900 text-white text-center">
                <div className="max-w-xl mx-auto border border-white/10 p-12 rounded-[2.5rem] backdrop-blur-sm">
                    <h2 className="text-4xl md:text-5xl mb-6 text-white" style={{ fontFamily: theme.fonts.heading }}>Código de Vestimenta</h2>
                    <p className="text-xl md:text-2xl font-light tracking-[0.2em] mb-4 opacity-70">{event.dressCode}</p>
                    <div className="text-4xl">{event.dressCode === 'Formal' || event.dressCode === 'Etiqueta' ? '👗 | 👔' : '✨'}</div>
                </div>
            </section>
        </>
    );
}

export function TicketLayout({ event, guest, theme, rsvpDone, onOpenRSVP, isPreview }: LayoutProps) {
    const mapLink = event.mapUrl || (event.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}` : "#");

    return (
        <div className="py-10 px-4 w-full max-w-lg">
            <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl relative border border-stone-100 flex flex-col">
                {/* Ticket Top */}
                <div className="relative h-48 bg-vento-primary flex items-center justify-center">
                    <img src={event.coverImageUrl || "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80"} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="" />
                    
                    {event.photoUrl && (
                        <div className="relative z-10 w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden">
                            <img src={event.photoUrl} alt="Evento" className="w-full h-full object-cover" />
                        </div>
                    )}
                    
                    {!event.photoUrl && (
                        <div className="relative z-10 text-white text-center p-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-2">Admit One</span>
                            <h1 className="text-3xl font-black italic tracking-tighter uppercase" style={{ fontFamily: theme.fonts.heading }}>{event.name || "NOMBRE DEL EVENTO"}</h1>
                        </div>
                    )}
                </div>

                {/* Dotted Divider */}
                <div className="relative h-8 flex items-center justify-between px-[-1px]">
                    <div className="w-8 h-8 rounded-full bg-stone-100 -ml-4 border border-stone-100" />
                    <div className="flex-1 border-t-2 border-dashed border-stone-200" />
                    <div className="w-8 h-8 rounded-full bg-stone-100 -mr-4 border border-stone-100" />
                </div>

                {/* Ticket Body */}
                <div className="p-10 space-y-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-stone-400 block mb-1">Date</span>
                            <p className="font-bold">{event.date || "Fecha"}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-[8px] font-black uppercase tracking-widest text-stone-400 block mb-1">Time</span>
                            <p className="font-bold">{event.itinerary?.[0]?.time || '--:--'}</p>
                        </div>
                    </div>

                    <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-stone-400 block mb-1">Location</span>
                        <p className="font-bold">{event.location || "Ubicación"}</p>
                        <a href={mapLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-vento-primary font-black uppercase tracking-widest flex items-center gap-1 mt-2"><MapPin size={10} /> Ver en Maps</a>
                    </div>

                    <div className="pt-8 border-t border-stone-100">
                        <Countdown targetDate={event.date} type={event.countdownType} theme={{ primary: theme.colors.primary, primaryLight: theme.colors.primaryLight, text: theme.colors.text }} />
                    </div>

                    {event.dressCode && (
                        <div className="p-4 bg-stone-50 rounded-2xl text-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-stone-400 block mb-1">Dress Code</span>
                            <p className="font-bold text-sm uppercase">{event.dressCode}</p>
                        </div>
                    )}
                </div>

                {/* Ticket QR/Footer */}
                <div className="p-10 bg-stone-50 border-t-2 border-dashed border-stone-200 flex flex-col items-center">
                    {rsvpDone ? (
                        <div className="bg-white p-4 rounded-xl shadow-md mb-4">
                            <QRCode value={JSON.stringify({ eventId: event.id, guestId: guest.id })} size={120} />
                        </div>
                    ) : (
                        <button onClick={onOpenRSVP} className="w-full py-4 bg-vento-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-vento-primary/30">Confirm Assistance</button>
                    )}
                    <span className="text-[8px] font-black uppercase tracking-[0.5em] text-stone-300 mt-4">Vento Express Ticket</span>
                </div>
            </div>
        </div>
    );
}
