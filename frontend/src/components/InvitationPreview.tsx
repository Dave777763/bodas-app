"use client";

import React from "react";
import { X, Heart, CheckCircle2 } from "lucide-react";
import { HTMLLayout, TicketLayout } from "./InvitationLayout";
import { VentoEvent } from "@/lib/types";
import { getTheme } from "@/lib/themes";

interface InvitationPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    event: VentoEvent;
}

export default function InvitationPreview({ isOpen, onClose, event }: InvitationPreviewProps) {
    if (!isOpen) return null;

    const theme = getTheme(event.theme || 'romantic-rose');
    
    // Dummy guest for preview
    const previewGuest = {
        id: "preview-id",
        name: "Invitado de Prueba",
        passes: 2,
        status: "Pendiente" as const,
        hasCompanion: false,
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl overflow-y-auto flex flex-col items-center custom-scrollbar">
            {/* Nav Header */}
            <div className="sticky top-0 w-full z-[160] px-6 py-4 flex justify-between items-center bg-black/20 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-vento-primary/20 rounded-xl text-vento-primary">
                        <Heart size={20} fill="currentColor" />
                    </div>
                    <div>
                        <h3 className="text-white font-black italic tracking-tighter uppercase text-sm">Vista Previa <span className="text-vento-primary">Invitación</span></h3>
                        <p className="text-[8px] font-bold text-white/40 uppercase tracking-[0.2em]">Así es como tus invitados verán la página</p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all border border-white/10 flex items-center gap-2 group"
                >
                    <span className="text-[10px] font-black uppercase tracking-widest mr-1 group-hover:text-vento-primary transition-colors">Cerrar Vista</span>
                    <X size={20} />
                </button>
            </div>

            {/* Layout Container */}
            <div className="w-full flex-1 flex flex-col items-center bg-white min-h-screen">
                {event.type === 'Ticket' ? (
                    <TicketLayout 
                        event={event} 
                        guest={previewGuest} 
                        theme={theme} 
                        rsvpDone={false} 
                        onOpenRSVP={() => alert("RSVP is disabled in preview mode")} 
                        isPreview={true}
                    />
                ) : (
                    <HTMLLayout 
                        event={event} 
                        guest={previewGuest} 
                        theme={theme} 
                        rsvpDone={false} 
                        onOpenRSVP={() => alert("RSVP is disabled in preview mode")} 
                        isPreview={true}
                    />
                )}

                {/* Shared Preview RSVP Section */}
                <section className="py-28 px-4 w-full flex flex-col items-center text-center bg-stone-50 border-t border-stone-100">
                    <div className="animate-pulseIn">
                        <h2 
                            className="text-4xl md:text-5xl mb-6"
                            style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}
                        >
                            ¿Nos acompañas?
                        </h2>
                        <p className="text-stone-500 mb-10 max-w-sm mx-auto">
                            Tu presencia será el mejor regalo que podamos recibir este día.
                        </p>
                        <button 
                            className="px-12 py-5 rounded-full text-lg font-bold text-white shadow-2xl hover:scale-105 transition-all shadow-primary/40"
                            style={{ backgroundColor: theme.colors.primary }}
                            onClick={() => alert("RSVP is disabled in preview mode")}
                        >
                            Confirmar Asistencia
                        </button>
                    </div>

                    <div className="mt-16 text-[10px] font-black uppercase tracking-[0.3em] text-stone-300 flex items-center gap-3">
                        <div className="w-12 h-px bg-stone-200"></div>
                        Fin de la Invitación
                        <div className="w-12 h-px bg-stone-200"></div>
                    </div>
                </section>

                <footer className="py-20 text-center w-full px-4 border-t border-stone-100 bg-white">
                    <p className="flex items-center justify-center gap-2 text-stone-300 text-sm">
                        Hecho con <Heart size={14} className="text-rose-300" fill="currentColor" /> para {event.name || "Tu Evento"}
                    </p>
                </footer>
            </div>
            
            {/* Floating Action Hint */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[170] bg-vento-primary/90 text-white px-8 py-3 rounded-full flex items-center gap-3 shadow-2xl backdrop-blur-md animate-bounce">
                <CheckCircle2 size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Modo Vista Previa</span>
            </div>
        </div>
    );
}
