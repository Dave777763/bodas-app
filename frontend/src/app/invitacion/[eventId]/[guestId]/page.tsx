"use client";

import { useState, useEffect, use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { HTMLLayout, TicketLayout } from "@/components/InvitationLayout";
import { 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    Heart 
} from "lucide-react";
import QRCode from "react-qr-code";
import MusicPlayer from "@/components/MusicPlayer";
import CameraCapture from "@/components/CameraCapture";
import RSVPSection from "@/components/RSVPSection";
import { getTheme } from "@/lib/themes";
import { VentoEvent } from "@/lib/types";

interface Guest {
    id: string;
    name: string;
    group: string;
    passes: number;
    confirmedPasses?: number;
    status: "Confirmado" | "Pendiente" | "Declinado";
    attended?: boolean;
    eventOwnerId?: string;
    hasCompanion?: boolean;
    companionName?: string;
}

export default function InvitationPage({ params }: { params: Promise<{ eventId: string; guestId: string }> }) {
    const { eventId, guestId } = use(params);
    const [event, setEvent] = useState<VentoEvent | null>(null);
    const [guest, setGuest] = useState<Guest | null>(null);
    const [eventLoading, setEventLoading] = useState(true);
    const [guestLoading, setGuestLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rsvpDone, setRsvpDone] = useState(false);
    const [selectedPasses, setSelectedPasses] = useState(1);
    const [isRSVPModalOpen, setIsRSVPModalOpen] = useState(false);
    const [companionName, setCompanionName] = useState("");
    const [hasCompanion, setHasCompanion] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const loading = eventLoading || guestLoading;

    // Get theme colors
    const theme = event ? getTheme(event.theme || 'romantic-rose') : getTheme('romantic-rose');

    useEffect(() => {
        // Escuchar el evento en tiempo real
        const unsubscribeEvent = onSnapshot(
            doc(db, "events", eventId),
            (eventSnap) => {
                if (eventSnap.exists()) {
                    setEvent({ id: eventSnap.id, ...eventSnap.data() } as VentoEvent);
                } else {
                    console.log("El evento no existe en Firebase.");
                }
                setEventLoading(false);
            },
            (error) => {
                console.error("Error loading event:", error);
                setErrorMsg(`Error al cargar evento: ${error.message}`);
                setEventLoading(false);
            }
        );

        // Escuchar el invitado en tiempo real
        const unsubscribeGuest = onSnapshot(
            doc(db, "events", eventId, "guests", guestId),
            (guestSnap) => {
                if (guestSnap.exists()) {
                    const guestData = { id: guestSnap.id, ...guestSnap.data() } as Guest;
                    setGuest(guestData);
                    setSelectedPasses(guestData.confirmedPasses || guestData.passes);
                    setHasCompanion(guestData.hasCompanion || false);
                    setCompanionName(guestData.companionName || "");
                    
                    if (guestData.status !== "Pendiente") {
                        setRsvpDone(true);
                    } else {
                        setRsvpDone(false);
                    }
                } else {
                    console.log("El invitado no existe en Firebase.");
                }
                setGuestLoading(false);
            },
            (error) => {
                console.error("Error loading guest:", error);
                setErrorMsg(prev => prev ? prev + ` | Error al cargar invitado: ${error.message}` : `Error al cargar invitado: ${error.message}`);
                setGuestLoading(false);
            }
        );

        return () => {
            unsubscribeEvent();
            unsubscribeGuest();
        };
    }, [eventId, guestId]);

    const handleRSVP = async (status: "Confirmado" | "Declinado" | "Pendiente") => {
        setSubmitting(true);
        try {
            const guestRef = doc(db, "events", eventId, "guests", guestId);
            await updateDoc(guestRef, {
                status: status,
                confirmedPasses: status === "Confirmado" ? selectedPasses : 0,
                hasCompanion: status === "Confirmado" ? hasCompanion : false,
                companionName: status === "Confirmado" ? companionName : "",
                updatedAt: serverTimestamp()
            });
            
            if (status === "Pendiente") {
                setRsvpDone(false);
                alert("Respuesta cancelada. Tu estado ahora es 'Pendiente'.");
            } else {
                setRsvpDone(true);
                setIsRSVPModalOpen(false);
                alert("¡Respuesta guardada con éxito!");
            }
        } catch (error: any) {
            console.error("Error updating RSVP:", error);
            alert(`Error al guardar: ${error.message || 'Error desconocido'}. Verifica tu conexión.`);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-rose-50/30">
                <Loader2 className="animate-spin text-rose-500 mb-4" size={40} />
                <p className="font-medium text-rose-600 animate-pulse">Cargando tu invitación...</p>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gray-50">
                <XCircle size={60} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800">Error de conexión</h1>
                <p className="text-gray-500 mt-2">Detalles del error: {errorMsg}</p>
                <p className="text-xs text-gray-400 mt-4 break-all max-w-md">Por favor verifica la configuración de variables de entorno de Firebase en Vercel.</p>
            </div>
        );
    }

    if (!event || !guest) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gray-50">
                <XCircle size={60} className="text-gray-300 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800">Invitación no encontrada</h1>
                <p className="text-gray-500 mt-2">El enlace parece ser inválido o el evento ya no está disponible.</p>
                <div className="mt-8 text-left text-xs text-gray-400 bg-white p-4 rounded shadow-sm border border-gray-100 break-all max-w-sm">
                    <strong>Información de depuración:</strong>
                    <br />Event ID buscado: <code>{eventId}</code>
                    <br />Event Encontrado: <code>{event ? 'Sí' : 'No'}</code>
                    <br />Guest ID buscado: <code>{guestId}</code>
                    <br />Guest Encontrado: <code>{guest ? 'Sí' : 'No'}</code>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex flex-col items-center relative overflow-x-hidden"
            style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                fontFamily: theme.fonts.body
            }}
        >
            {event.type === 'Ticket' ? (
                <TicketLayout event={event} guest={guest} theme={theme} rsvpDone={rsvpDone} onOpenRSVP={() => setIsRSVPModalOpen(true)} />
            ) : (
                <HTMLLayout event={event} guest={guest} theme={theme} rsvpDone={rsvpDone} onOpenRSVP={() => setIsRSVPModalOpen(true)} />
            )}

            {/* Homologated RSVP Section */}
            <RSVPSection 
                rsvpDone={rsvpDone}
                guest={guest}
                theme={theme}
                onOpenRSVP={() => setIsRSVPModalOpen(true)}
                onResetRSVP={() => handleRSVP("Pendiente")}
                submitting={submitting}
                eventId={eventId}
                guestId={guestId}
                selectedPasses={selectedPasses}
                hasCompanion={hasCompanion}
                companionName={companionName}
            />

            {/* Modal RSVP */}
            {isRSVPModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-scaleIn">
                        <div className="p-8 md:p-10">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold" style={{ color: theme.colors.primary }}>Confirmación</h2>
                                <button 
                                    onClick={() => setIsRSVPModalOpen(false)}
                                    className="p-2 hover:bg-stone-50 rounded-full transition"
                                >
                                    <XCircle className="text-stone-300" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Invitado</label>
                                    <p className="text-xl font-medium">{guest.name}</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">¿Nos honrarás con tu presencia?</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => handleRSVP("Confirmado")}
                                            className="py-4 rounded-2xl font-bold transition-all border-2 border-primary text-white"
                                            style={{ backgroundColor: theme.colors.primary }}
                                            disabled={submitting}
                                        >
                                            Sí, asistiré
                                        </button>
                                        <button 
                                            onClick={() => handleRSVP("Declinado")}
                                            className="py-4 rounded-2xl font-bold transition-all border-2 border-stone-200 text-stone-400 hover:bg-stone-50"
                                            disabled={submitting}
                                        >
                                            No podré
                                        </button>
                                    </div>
                                </div>

                                {submitting && (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="animate-spin text-primary" size={32} />
                                    </div>
                                )}

                                <div className="pt-4 border-t border-stone-100 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-stone-600">Pases a utilizar (de {guest.passes})</span>
                                        <div className="flex items-center gap-4 bg-stone-50 p-1 rounded-full border border-stone-200">
                                            <button 
                                                onClick={() => setSelectedPasses(Math.max(1, selectedPasses - 1))}
                                                className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-stone-400 disabled:opacity-30"
                                                disabled={selectedPasses <= 1}
                                            >-</button>
                                            <span className="font-bold w-4 text-center">{selectedPasses}</span>
                                            <button 
                                                onClick={() => setSelectedPasses(Math.min(guest.passes, selectedPasses + 1))}
                                                className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-stone-400 disabled:opacity-30"
                                                disabled={selectedPasses >= guest.passes}
                                            >+</button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-stone-600">¿Traerás acompañante?</span>
                                        <button 
                                            onClick={() => setHasCompanion(!hasCompanion)}
                                            className={`w-12 h-6 rounded-full transition-all relative ${hasCompanion ? 'bg-primary' : 'bg-stone-200'}`}
                                            style={{ backgroundColor: hasCompanion ? theme.colors.primary : undefined }}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hasCompanion ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {hasCompanion && (
                                        <input 
                                            type="text" 
                                            placeholder="Nombre del acompañante"
                                            value={companionName}
                                            onChange={(e) => setCompanionName(e.target.value)}
                                            className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="py-20 text-center w-full px-4 border-t border-stone-100 mt-20">
                <p className="flex items-center justify-center gap-2 text-stone-300 text-sm">
                    Hecho con <Heart size={14} className="text-rose-300" fill="currentColor" /> para {event.name}
                </p>
            </footer>
        </div>
    );
}

