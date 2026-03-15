"use client";

import RSVPSection from "./RSVPSection";
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
        status: "Confirmado" as const, // Changed to show how it looks confirmed too
        hasCompanion: true,
        companionName: "Acompañante de Prueba",
        confirmedPasses: 2
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

                {/* Homologated RSVP Section */}
                <RSVPSection 
                    rsvpDone={false} // Switch to true if you want to preview the "Thanks" state
                    guest={previewGuest}
                    theme={theme}
                    onOpenRSVP={() => alert("RSVP is disabled in preview mode")}
                    onResetRSVP={() => alert("Reset is disabled in preview mode")}
                    isPreview={true}
                />

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
