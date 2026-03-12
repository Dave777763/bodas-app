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

interface ScheduleItem {
    id: string;
    time: string;
    activity: string;
}

interface VentoEvent {
    id: string;
    name: string;
    date: string;
    location: string;
    mapUrl?: string;
    imageUrl?: string;
    schedule?: ScheduleItem[];
    theme?: string;
    musicUrl?: string;
}

interface Guest {
    id: string;
    name: string;
    group: string;
    passes: number;
    confirmedPasses?: number;
    status: "Confirmado" | "Pendiente" | "Declinado";
    attended?: boolean;
    eventOwnerId?: string;
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
                    console.log("INVITACION_DEBUG: Guest loaded", guestData);
                    setGuest(guestData);
                    setSelectedPasses(guestData.passes);
                    if (guestData.status !== "Pendiente") {
                        setRsvpDone(true);
                    } else {
                        setRsvpDone(false);
                    }
                } else {
                    console.log("INVITACION_DEBUG: No Guest found");
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
        console.log("INVITACION_DEBUG: Iniciando RSVP", { status, selectedPasses });
        setSubmitting(true);
        try {
            const guestRef = doc(db, "events", eventId, "guests", guestId);
            await updateDoc(guestRef, {
                status: status,
                confirmedPasses: status === "Confirmado" ? selectedPasses : 0,
                updatedAt: serverTimestamp()
            });
            console.log("INVITACION_DEBUG: Update Firestore Exitoso");
            
                if (status === "Pendiente") {
                    setRsvpDone(false);
                    alert("Respuesta cancelada. Tu estado ahora es 'Pendiente'.");
                } else {
                    setRsvpDone(true);
                    alert("¡Respuesta guardada con éxito!");
                }
        } catch (error: any) {
            console.error("INVITACION_DEBUG: Error updating RSVP:", error);
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
            className="min-h-screen flex flex-col items-center py-10 px-4 relative overflow-hidden"
            style={{
                backgroundColor: theme.colors.background,
                fontFamily: theme.fonts.body
            }}
        >
            {/* Falling Petals Animation */}
            <FallingPetals color={theme.colors.primaryLight} count={25} />

            {/* Content */}
            <div className="relative z-10 w-full flex flex-col items-center">
                {/* Decoración Superior */}
                <div className="w-full max-w-lg mb-8 text-center animate-fadeIn">
                    {event.imageUrl ? (
                        <div className="w-full max-w-lg aspect-video rounded-3xl overflow-hidden mb-6 shadow-2xl animate-scaleIn border-4 border-white">
                            <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div
                            className="inline-block p-3 rounded-full mb-4 animate-float"
                            style={{
                                backgroundColor: theme.colors.primaryLight,
                                color: theme.colors.primary
                            }}
                        >
                            <Heart size={32} fill="currentColor" />
                        </div>
                    )}
                    <h2
                        className="font-medium tracking-[0.2em] uppercase text-sm mb-2"
                        style={{
                            color: theme.colors.primary,
                            fontFamily: theme.fonts.body
                        }}
                    >
                        Estás cordialmente invitado a
                    </h2>
                    <h1
                        className="text-4xl md:text-5xl font-bold leading-tight mb-6"
                        style={{
                            color: theme.colors.text,
                            fontFamily: theme.fonts.heading
                        }}
                    >
                        {event.name}
                    </h1>
                    <p
                        className="text-2xl md:text-3xl italic"
                        style={{
                            color: theme.colors.accent,
                            fontFamily: theme.fonts.accent
                        }}
                    >
                        ¡Te invitamos!
                    </p>
                </div>

                {/* Music Player */}
                {event.musicUrl && <MusicPlayer url={event.musicUrl} />}

                {/* Countdown */}
                <div className="w-full max-w-lg mb-8 animate-scaleIn">
                    <Countdown
                        targetDate={event.date}
                        theme={{
                            primary: theme.colors.primary,
                            primaryLight: theme.colors.primaryLight,
                            text: theme.colors.textLight
                        }}
                    />
                </div>

                {/* Tarjeta de Invitación */}
                <div
                    className="w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden relative animate-slideUp"
                    style={{
                        backgroundColor: 'white',
                        boxShadow: `0 25px 50px -12px ${theme.colors.primary}20`,
                        borderWidth: '1px',
                        borderColor: theme.colors.primaryLight
                    }}
                >
                    {/* Overlay de diseño */}
                    <div
                        className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-50 -z-0"
                        style={{ backgroundColor: theme.colors.primaryLight }}
                    ></div>

                    <div className="p-8 md:p-12 space-y-10 relative z-10">
                        {/* Detalles */}
                        <div className="space-y-8">
                            {/* Fecha y Calendario */}
                            <div className="flex items-start gap-4">
                                <div
                                    className="h-12 w-12 rounded-2xl flex-shrink-0 flex items-center justify-center"
                                    style={{
                                        backgroundColor: theme.colors.primaryLight,
                                        color: theme.colors.primary
                                    }}
                                >
                                    <Calendar size={24} />
                                </div>
                                <div className="flex-1">
                                    <p
                                        className="text-xs font-bold uppercase tracking-widest mb-1"
                                        style={{ color: theme.colors.primary }}
                                    >
                                        Cuándo
                                    </p>
                                    <p
                                        className="text-xl font-bold mb-2"
                                        style={{ color: theme.colors.text }}
                                    >
                                        {event.date}
                                    </p>
                                    <AddToCalendar event={event} />
                                </div>
                            </div>

                            {/* Ubicación y Mapa */}
                            <div className="flex items-start gap-4">
                                <div
                                    className="h-12 w-12 rounded-2xl flex-shrink-0 flex items-center justify-center"
                                    style={{
                                        backgroundColor: theme.colors.primaryLight,
                                        color: theme.colors.primary
                                    }}
                                >
                                    <MapPin size={24} />
                                </div>
                                <div className="flex-1">
                                    <p
                                        className="text-xs font-bold uppercase tracking-widest mb-1"
                                        style={{ color: theme.colors.primary }}
                                    >
                                        Dónde
                                    </p>
                                    <p
                                        className="text-xl font-bold mb-2"
                                        style={{ color: theme.colors.text }}
                                    >
                                        {event.location}
                                    </p>
                                    <a
                                        href={mapLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm font-bold hover:underline transition"
                                        style={{ color: theme.colors.primary }}
                                    >
                                        <span>Ver en Mapa</span>
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>

                            {/* Invitado */}
                            <div className="flex items-start gap-4">
                                <div
                                    className="h-12 w-12 rounded-2xl flex-shrink-0 flex items-center justify-center"
                                    style={{
                                        backgroundColor: theme.colors.primaryLight,
                                        color: theme.colors.primary
                                    }}
                                >
                                    <Users size={24} />
                                </div>
                                <div>
                                    <p
                                        className="text-xs font-bold uppercase tracking-widest"
                                        style={{ color: theme.colors.primary }}
                                    >
                                        Para quién
                                    </p>
                                    <p
                                        className="text-xl font-bold"
                                        style={{ color: theme.colors.text }}
                                    >
                                        {guest.name}
                                    </p>
                                    <p
                                        className="text-sm"
                                        style={{ color: theme.colors.textLight }}
                                    >
                                        Incluye {guest.passes} {guest.passes === 1 ? 'pase' : 'pases'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Timeline / Cronograma */}
                        {event.schedule && event.schedule.length > 0 && (
                            <>
                                <hr className="border-rose-100" />
                                <div className="space-y-6">
                                    <h3 className="text-center text-xl font-bold text-gray-800 font-serif">Itinerario</h3>
                                    <div className="space-y-0 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-rose-200 before:to-transparent">
                                        {event.schedule.sort((a: ScheduleItem, b: ScheduleItem) => a.time.localeCompare(b.time)).map((item: ScheduleItem) => (
                                            <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8 last:mb-0">
                                                {/* Icon/Dot */}
                                                <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-rose-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                                    <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                                                </div>

                                                {/* Content */}
                                                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-4 bg-white border border-rose-50 rounded-xl shadow-sm">
                                                    <div className="flex items-center justify-between space-x-2 mb-1">
                                                        <div className="font-bold text-gray-900">{item.activity}</div>
                                                        <time className="font-mono text-xs text-rose-500">{item.time}</time>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        <hr className="border-rose-100" />

                        {/* RSVP Section */}
                        <div className="space-y-6">
                            {!rsvpDone ? (
                                <>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-xl font-bold text-gray-800">¿Nos acompañas?</h3>
                                        <p className="text-gray-500 text-sm">Por favor confirma tu asistencia</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <label className="text-sm font-bold text-gray-600">Pases a usar:</label>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setSelectedPasses(Math.max(1, selectedPasses - 1))}
                                                    className="w-8 h-8 rounded-full border border-rose-200 text-rose-600 flex items-center justify-center hover:bg-rose-50 transition"
                                                >-</button>
                                                <span className="text-lg font-bold w-4 text-center">{selectedPasses}</span>
                                                <button
                                                    onClick={() => setSelectedPasses(Math.min(guest.passes, selectedPasses + 1))}
                                                    className="w-8 h-8 rounded-full border border-rose-200 text-rose-600 flex items-center justify-center hover:bg-rose-50 transition"
                                                >+</button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleRSVP("Confirmado")}
                                                disabled={submitting}
                                                className="py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition shadow-xl shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                                Confirmar
                                            </button>
                                            <button
                                                onClick={() => handleRSVP("Declinado")}
                                                disabled={submitting}
                                                className="py-4 border-2 border-gray-200 text-gray-500 rounded-2xl font-bold hover:bg-gray-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                No podré ir
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in duration-500">
                                    <div className="inline-block p-4 rounded-full bg-emerald-50 text-emerald-500 mb-2">
                                        {guest.status === "Confirmado" ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-800">
                                        {guest.status === "Confirmado" ? "¡Gracias por confirmar!" : "Sentimos que no puedas ir"}
                                    </h3>
                                    <p className="text-gray-500">
                                        {guest.status === "Confirmado"
                                            ? `Hemos registrado ${selectedPasses} pases para tu lugar. ¡Nos vemos pronto!`
                                            : "Gracias por avisarnos, se te extrañará."}
                                    </p>

                                    {guest.status === "Confirmado" && (
                                        <div className="mt-6 p-4 bg-white rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Tu Pase de Entrada</p>
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <QRCode
                                                    value={JSON.stringify({ eventId, guestId })}
                                                    size={150}
                                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                    viewBox={`0 0 150 150`}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2">Muestra este código en la entrada</p>
                                        </div>
                                    )}

                                    {guest.status === "Confirmado" && (
                                        <>
                                            <hr className="border-rose-100 my-6" />
                                            <CameraCapture
                                                eventId={eventId}
                                                guestId={guestId}
                                                guestName={guest.name}
                                                theme={theme}
                                            />
                                        </>
                                    )}
                                    <button
                                        onClick={() => handleRSVP("Pendiente")}
                                        disabled={submitting}
                                        className="text-rose-500 text-sm font-bold hover:underline disabled:opacity-50"
                                    >
                                        {submitting ? "PROCESANDO..." : "CAMBIAR RESPUESTA"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-gray-400 text-sm flex items-center gap-2">
                    <span>Hecho con</span>
                    <Heart size={14} className="text-rose-300" fill="currentColor" />
                    <span>para {event.name}</span>
                </div>
            </div>
        </div>
    );
}

