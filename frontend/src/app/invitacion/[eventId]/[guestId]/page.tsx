"use client";

import { useState, useEffect, use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import {
    Calendar,
    MapPin,
    Users,
    CheckCircle2,
    XCircle,
    Loader2,
    Heart,
    ExternalLink
} from "lucide-react";
import QRCode from "react-qr-code";
import AddToCalendar from "@/components/AddToCalendar";
import FallingPetals from "@/components/FallingPetals";
import Countdown from "@/components/Countdown";
import { getTheme } from "@/lib/themes";
import CameraCapture from "@/components/CameraCapture";
import MusicPlayer from "@/components/MusicPlayer";

import { VentoEvent as BaseVentoEvent, ItineraryMoment, CountdownType } from "@/lib/types";

// Extended event for local use if needed, or just use BaseVentoEvent
type VentoEvent = BaseVentoEvent;

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

    // Google Maps Link Logic
    // If mapUrl exists, use it directly. Otherwise, search by location name.
    const mapLink = event?.mapUrl
        ? event.mapUrl
        : event?.location
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
            : "#";

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

            {/* RSVP Modal and other shared components stay here */}

            {/* 6. RSVP Section */}
            <section className="py-28 px-4 w-full flex flex-col items-center text-center">
                {!rsvpDone ? (
                    <div className="animate-pulseIn">
                        <h2 
                            className="text-4xl md:text-5xl mb-6"
                            style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}
                        >
                            ¿Nos acompañas?
                        </h2>
                        <p className="text-stone-500 mb-10 max-w-sm">
                            Tu presencia será el mejor regalo que podamos recibir este día.
                        </p>
                        <button 
                            onClick={() => setIsRSVPModalOpen(true)}
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
                            <h3 className="text-3xl font-bold mb-4">
                                {guest.status === "Confirmado" ? "¡Gracias por confirmar!" : "Sentimos que no puedas ir"}
                            </h3>
                            <p className="text-stone-500 mb-8">
                                {guest.status === "Confirmado"
                                    ? `Hemos registrado ${selectedPasses} pases para tu lugar. ${hasCompanion ? `¡Qué gusto que vengas con ${companionName}!` : ''} ¡Nos vemos pronto!`
                                    : "Gracias por avisarnos, se te extrañará."}
                            </p>

                            {guest.status === "Confirmado" && (
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

                            <div className="mt-10">
                                <button
                                    onClick={() => handleRSVP("Pendiente")}
                                    disabled={submitting}
                                    className="text-stone-400 text-sm font-medium hover:text-primary transition underline underline-offset-4 disabled:opacity-50"
                                >
                                    {submitting ? "PROCESANDO..." : "Cambiar mi respuesta"}
                                </button>
                            </div>
                        </div>

                        {guest.status === "Confirmado" && (
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
            </section>

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

// Layout Components
function HTMLLayout({ event, guest, theme, rsvpDone, onOpenRSVP }: { event: VentoEvent; guest: Guest; theme: any; rsvpDone: boolean; onOpenRSVP: () => void }) {
    const mapLink = event.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;

    return (
        <>
            <FallingPetals color={theme.colors.primaryLight} count={25} />
            
            <header className="relative w-full h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
                <div 
                    className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-1000 transform hover:scale-105"
                    style={{ 
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${event.coverImageUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'})`,
                    }}
                />
                
                <div className="relative z-10 animate-fadeInUp">
                    <h1 
                        className="text-6xl md:text-8xl mb-4 text-white drop-shadow-lg"
                        style={{ fontFamily: theme.fonts.heading }}
                    >
                        {event.name}
                    </h1>
                    <p className="text-xl md:text-2xl text-white/90 uppercase tracking-widest font-light mb-2">
                        Nuestra Boda
                    </p>
                    <div className="w-16 h-px bg-white/50 mx-auto my-6"></div>
                    <p className="text-2xl md:text-3xl text-white font-medium">
                        {event.date}
                    </p>
                </div>

                {event.musicUrl && (
                    <div className="absolute top-6 right-6 z-20">
                        <MusicPlayer url={event.musicUrl} />
                    </div>
                )}
            </header>

            <section className="py-20 px-4 w-full max-w-4xl text-center">
                <div className="mb-16">
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
                
                <div className="w-full aspect-[16/9] md:aspect-[21/9] rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/10">
                    <img 
                        src={event.countdownImageUrl || 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'} 
                        alt="Countdown" 
                        className="w-full h-full object-cover"
                    />
                </div>
            </section>

            {event.photoUrl && (
                <section className="py-20 px-4 w-full flex flex-col items-center animate-onScroll">
                    <div className="relative">
                        <div className="absolute inset-0 bg-vento-primary/20 blur-3xl rounded-full" />
                        <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full border-8 border-white shadow-2xl overflow-hidden z-10">
                            <img src={event.photoUrl} alt="Evento" className="w-full h-full object-cover" />
                        </div>
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
                                alt="Hacienda" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="p-10 text-center">
                            <h3 className="text-2xl font-bold mb-4">{event.location}</h3>
                            <p className="text-stone-500 mb-8 max-w-md mx-auto">Te esperamos para celebrar este día inolvidable.</p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <a href={mapLink} target="_blank" className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-bold transition-all shadow-lg" style={{ backgroundColor: theme.colors.primary }}><MapPin size={18} /> Maps</a>
                                {event.venuePageUrl && (
                                    <a href={event.venuePageUrl} target="_blank" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 font-bold transition-all" style={{ borderColor: theme.colors.primary, color: theme.colors.primary }}><ExternalLink size={18} /> Salón</a>
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

function TicketLayout({ event, guest, theme, rsvpDone, onOpenRSVP }: { event: VentoEvent; guest: Guest; theme: any; rsvpDone: boolean; onOpenRSVP: () => void }) {
    const mapLink = event.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;

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
                            <h1 className="text-3xl font-black italic tracking-tighter uppercase" style={{ fontFamily: theme.fonts.heading }}>{event.name}</h1>
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
                            <p className="font-bold">{event.date}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-[8px] font-black uppercase tracking-widest text-stone-400 block mb-1">Time</span>
                            <p className="font-bold">{event.itinerary?.[0]?.time || '--:--'}</p>
                        </div>
                    </div>

                    <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-stone-400 block mb-1">Location</span>
                        <p className="font-bold">{event.location}</p>
                        <a href={mapLink} target="_blank" className="text-[10px] text-vento-primary font-black uppercase tracking-widest flex items-center gap-1 mt-2"><MapPin size={10} /> Ver en Maps</a>
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
                    {guest.status === 'Confirmado' ? (
                        <div className="bg-white p-4 rounded-xl shadow-md mb-4">
                            <QRCode value={JSON.stringify({ eventId: event.id, guestId: guest.id })} size={120} />
                        </div>
                    ) : (
                        <button onClick={onOpenRSVP} className="w-full py-4 bg-vento-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-vento-primary/30">Confirm Assistant</button>
                    )}
                    <span className="text-[8px] font-black uppercase tracking-[0.5em] text-stone-300 mt-4">Vento Express Ticket</span>
                </div>
            </div>
        </div>
    );
}

