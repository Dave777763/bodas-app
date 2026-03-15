"use client";

import React from "react";
import { CheckCircle2, XCircle, Heart } from "lucide-react";
import QRCode from "react-qr-code";
import CameraCapture from "./CameraCapture";
import { Theme } from "@/lib/themes";

interface RSVPSectionProps {
    rsvpDone: boolean;
    guest: {
        status: string;
        name: string;
        passes: number;
        confirmedPasses?: number;
        hasCompanion?: boolean;
        companionName?: string;
    };
    theme: Theme;
    onOpenRSVP: () => void;
    onResetRSVP?: () => void;
    submitting?: boolean;
    eventId?: string;
    guestId?: string;
    isPreview?: boolean;
    // Optional overrides for granular control
    selectedPasses?: number;
    hasCompanion?: boolean;
    companionName?: string;
}

export default function RSVPSection({
    rsvpDone,
    guest,
    theme,
    onOpenRSVP,
    onResetRSVP,
    submitting,
    eventId,
    guestId,
    isPreview = false,
    selectedPasses: propSelectedPasses,
    hasCompanion: propHasCompanion,
    companionName: propCompanionName
}: RSVPSectionProps) {
    const finalSelectedPasses = propSelectedPasses ?? guest.confirmedPasses ?? guest.passes;
    const finalHasCompanion = propHasCompanion ?? guest.hasCompanion;
    const finalCompanionName = propCompanionName ?? guest.companionName;

    return (
        <section className="py-28 px-4 w-full flex flex-col items-center text-center">
            {!rsvpDone ? (
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
                        onClick={onOpenRSVP}
                        className="px-12 py-5 rounded-full text-lg font-bold text-white shadow-2xl hover:scale-105 transition-all shadow-primary/40 active:scale-95"
                        style={{ backgroundColor: theme.colors.primary }}
                    >
                        Confirmar Asistencia
                    </button>
                </div>
            ) : (
                <div className="w-full max-w-lg space-y-12 animate-fadeIn">
                    <div className="p-10 bg-white rounded-[2rem] shadow-2xl border border-stone-50">
                        <div className="inline-block p-4 rounded-full bg-emerald-50 text-emerald-500 mb-6">
                            {guest.status === "Confirmado" ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
                        </div>
                        <h3 className="text-3xl font-bold mb-4" style={{ color: theme.colors.text }}>
                            {guest.status === "Confirmado" ? "¡Gracias por confirmar!" : "Sentimos que no puedas ir"}
                        </h3>
                        <p className="text-stone-500 mb-8">
                            {guest.status === "Confirmado"
                                ? `Hemos registrado ${finalSelectedPasses} pases para tu lugar. ${finalHasCompanion ? `¡Qué gusto que vengas con ${finalCompanionName}!` : ''} ¡Nos vemos pronto!`
                                : "Gracias por avisarnos, se te extrañará."}
                        </p>

                        {guest.status === "Confirmado" && !isPreview && eventId && guestId && (
                            <div className="mt-8 p-6 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center">
                                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Tu Pase de Entrada</p>
                                <div className="p-4 bg-white rounded-xl shadow-md">
                                    <QRCode
                                        value={JSON.stringify({ eventId, guestId })}
                                        size={160}
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        viewBox={`0 0 160 160`}
                                    />
                                </div>
                                <p className="text-xs text-stone-400 mt-4 italic">Muestra este código en la entrada</p>
                            </div>
                        )}

                        {guest.status === "Confirmado" && isPreview && (
                            <div className="mt-8 p-6 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center">
                                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Tu Pase de Entrada (Preview)</p>
                                <div className="p-4 bg-white rounded-xl shadow-md opacity-50">
                                    <div className="w-[160px] h-[160px] bg-stone-200 flex items-center justify-center">
                                        <p className="text-[10px] text-stone-400">QR CODE</p>
                                    </div>
                                </div>
                                <p className="text-xs text-stone-400 mt-4 italic">Muestra este código en la entrada</p>
                            </div>
                        )}

                        <div className="mt-10">
                            <button
                                onClick={onResetRSVP}
                                disabled={submitting}
                                className="text-stone-400 text-sm font-medium transition underline underline-offset-4 disabled:opacity-50"
                                style={{ color: "var(--hover-color)" } as React.CSSProperties} // Simplified for now
                            >
                                {submitting ? "PROCESANDO..." : "Cambiar mi respuesta"}
                            </button>
                        </div>
                    </div>

                    {guest.status === "Confirmado" && !isPreview && eventId && guestId && (
                        <div className="w-full">
                            <CameraCapture
                                eventId={eventId}
                                guestId={guestId}
                                guestName={guest.name}
                                theme={theme}
                            />
                        </div>
                    )}
                </div>
            )}

            <div className="mt-20 text-[10px] font-black uppercase tracking-[0.3em] text-stone-300 flex items-center gap-3">
                <div className="w-12 h-px bg-stone-200"></div>
                Fin de la Invitación
                <div className="w-12 h-px bg-stone-200"></div>
            </div>
        </section>
    );
}
