"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Calendar,
    MapPin,
    Users,
    Info,
    Settings,
    Plus,
    Search,
    Loader2,
    CheckCircle2,
    Clock,
    XCircle,
    Copy,
    Share2,
    QrCode,
    Palette,
    Heart,
    ExternalLink,
    FileImage,
    Image as ImageIcon
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useUITheme } from "@/context/UIThemeContext";
import {
    doc,
    getDoc,
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    updateDoc,
    arrayUnion
} from "firebase/firestore";
import ThemeSelector from "@/components/ThemeSelector";

const ADMIN_EMAIL = "marroquindavid635@gmail.com";
import { getTheme } from "@/lib/themes";
import InvitationGenerator from "@/components/InvitationGenerator";
import PhotoGallery from "@/components/PhotoGallery";


interface ScheduleItem {
    id: string;
    time: string;
    activity: string;
}

interface VentoEvent {
    id: string; // Se mantiene como requerido para el resto del código
    name: string;
    date: string;
    location: string;
    userId?: string;
    ownerEmail?: string;
    schedule?: ScheduleItem[];
    theme?: string;
}

interface Guest {
    id: string;
    name: string;
    group: string;
    passes: number;
    status: "Confirmado" | "Pendiente" | "Declinado";
    attended?: boolean;
    attendedAt?: unknown;
    eventOwnerId?: string;
}

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const { user } = useAuth();
    const { theme } = useUITheme();
    const router = useRouter();
    const [event, setEvent] = useState<VentoEvent | null>(null);
    const [activeTab, setActiveTab] = useState<"general" | "invitados" | "config" | "disenar" | "galeria">("invitados");
    const [loading, setLoading] = useState(true);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);

    // Formulario de invitado
    const [guestForm, setGuestForm] = useState({
        name: "",
        group: "",
        passes: 1,
        status: "Pendiente" as "Confirmado" | "Pendiente" | "Declinado"
    });

    // Schedule Form
    const [scheduleForm, setScheduleForm] = useState({
        time: "",
        activity: ""
    });
    const [addingSchedule, setAddingSchedule] = useState(false);

    useEffect(() => {
        if (!eventId) return;

        // Escuchar el evento en tiempo real
        const eventRef = doc(db, "events", eventId);
        const unsubscribeEvent = onSnapshot(eventRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                // Seguridad: Verificar si el usuario tiene permiso (Dueño o Admin)
                const isAdmin = user?.email === ADMIN_EMAIL;
                if (!isAdmin && data.userId && data.userId !== user?.uid) {
                    console.warn("Acceso no autorizado a este evento");
                    router.push("/dashboard");
                    return;
                }

                setEvent({ ...data, id: docSnap.id } as VentoEvent);
            } else {
                console.error("Evento no encontrado");
                router.push("/dashboard");
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching event:", error);
            setLoading(false);
        });

        // Escuchar invitados en tiempo real
        const guestsQuery = query(
            collection(db, "events", eventId, "guests"),
            orderBy("name", "asc")
        );

        const unsubscribeGuests = onSnapshot(guestsQuery, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Guest[];
            setGuests(list);
        });

        return () => {
            unsubscribeEvent();
            unsubscribeGuests();
        };
    }, [eventId, router, user]);

    const handleAddGuest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "events", eventId, "guests"), {
                ...guestForm,
                eventOwnerId: user?.uid, // Importante para stats globales
                createdAt: serverTimestamp()
            });
            setGuestForm({ name: "", group: "", passes: 1, status: "Pendiente" });
            setIsAddGuestModalOpen(false);
        } catch (error) {
            console.error("Error adding guest:", error);
            alert("Error al agregar invitado");
        }
    };

    const handleAddScheduleItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingSchedule(true);
        try {
            const newItem: ScheduleItem = {
                id: Date.now().toString(),
                time: scheduleForm.time,
                activity: scheduleForm.activity
            };

            const eventRef = doc(db, "events", eventId);
            await updateDoc(eventRef, {
                schedule: arrayUnion(newItem)
            });

            // Ya no necesitamos setEvent manual aquí, 
            // onSnapshot se encarga de actualizarlo solo.
            setScheduleForm({ time: "", activity: "" });
        } catch (error) {
            console.error("Error adding schedule item:", error);
            alert("Error al guardar actividad");
        } finally {
            setAddingSchedule(false);
        }
    };

    const handleDeleteScheduleItem = async (itemId: string) => {
        if (!confirm("¿Eliminar esta actividad?")) return;

        // Note: arrayRemove requires the EXACT object to remove. 
        // Since we might not have the exact object reference easily if modified elsewhere, 
        // a safer way usually implies reading the doc, filtering, and writing back.
        // For simplicity with this structure, let's try reading-modifying-writing entire array 
        // or just filtering local if we want to be quick, but let's do it right.

        const newSchedule = event?.schedule?.filter(i => i.id !== itemId) || [];

        try {
            const eventRef = doc(db, "events", eventId);
            await updateDoc(eventRef, {
                schedule: newSchedule
            });
            // onSnapshot actualizará el estado automáticamente
        } catch (e) {
            console.error("Error deleting item", e);
        }
    };

    const getBaseUrl = () => {
        // Si tienes una URL de producción configurada, úsala. 
        // Si no, usa el origen actual.
        const url = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
        return url.trim();
    };

    const copyInvitationLink = (guestId: string) => {
        const link = `${getBaseUrl()}/invitacion/${eventId}/${guestId}`;
        navigator.clipboard.writeText(link);
        alert("¡Enlace de invitación copiado!");
    };

    const shareInvitation = (guest: Guest) => {
        const link = `${getBaseUrl()}/invitacion/${eventId}/${guest.id}`;
        const message = `*¡Hola ${guest.name}!* 👋\n\nTe invitamos cordialmente a nuestro evento:\n*${event?.name.toUpperCase()}* 🥂\n\nPresiona el siguiente enlace para ver detalles y confirmar:\n\n${link}\n\n¡Esperamos verte ahí! ✨`;

        // 1. WhatsApp Web forzado (usa web.whatsapp.com en lugar de api o wa.me)
        const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank', 'noreferrer');

        // 2. Copia al portapapeles como respaldo silencioso
        const textArea = document.createElement("textarea");
        textArea.value = message;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (e) { }
        document.body.removeChild(textArea);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-vento-bg">
                <Loader2 className="animate-spin text-vento-primary" size={40} />
            </div>
        );
    }

    if (!event) return null;

    return (
        <div className="min-h-screen bg-vento-bg text-vento-text pb-20">
            {/* Header */}
            <header className="bg-vento-card border-b border-vento-border sticky top-0 z-30 shadow-sm transition-colors duration-300">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="p-3 bg-vento-bg hover:bg-vento-primary hover:text-white rounded-2xl transition-all duration-300"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-vento-primary mb-1">VENTO SESSION</p>
                            <h1 className="text-2xl font-black font-serif italic line-clamp-1">{event.name}</h1>
                        </div>
                    </div>
                    <div>
                        <button
                            onClick={() => router.push(`/dashboard/${eventId}/scan`)}
                            className="flex items-center gap-2 px-6 py-3 bg-vento-primary text-white rounded-2xl hover:opacity-90 transition-all font-bold shadow-xl shadow-vento-primary/20 text-sm"
                        >
                            <QrCode size={18} />
                            <span className="hidden md:inline">Escanear Entradas</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10">
                {/* Tabs */}
                <div className="flex gap-2 bg-vento-card p-2 rounded-3xl border border-vento-border mb-10 max-w-fit shadow-lg flex-wrap">
                    <button
                        onClick={() => setActiveTab("invitados")}
                        className={`px-8 py-3 rounded-2xl flex items-center gap-3 font-bold transition-all duration-300 ${activeTab === "invitados" ? "bg-vento-primary text-white shadow-lg shadow-vento-primary/20" : "text-vento-text-muted hover:bg-vento-bg"}`}
                    >
                        <Users size={18} /> Invitados
                    </button>
                    <button
                        onClick={() => setActiveTab("disenar")}
                        className={`px-8 py-3 rounded-2xl flex items-center gap-3 font-bold transition-all duration-300 ${activeTab === "disenar" ? "bg-vento-primary text-white shadow-lg shadow-vento-primary/20" : "text-vento-text-muted hover:bg-vento-bg"}`}
                    >
                        <FileImage size={18} /> Diseño
                    </button>
                    <button
                        onClick={() => setActiveTab("galeria")}
                        className={`px-8 py-3 rounded-2xl flex items-center gap-3 font-bold transition-all duration-300 ${activeTab === "galeria" ? "bg-vento-primary text-white shadow-lg shadow-vento-primary/20" : "text-vento-text-muted hover:bg-vento-bg"}`}
                    >
                        <ImageIcon size={18} /> Galería
                    </button>
                    <button
                        onClick={() => setActiveTab("config")}
                        className={`px-8 py-3 rounded-2xl flex items-center gap-3 font-bold transition-all duration-300 ${activeTab === "config" ? "bg-vento-primary text-white shadow-lg shadow-vento-primary/20" : "text-vento-text-muted hover:bg-vento-bg"}`}
                    >
                        <Settings size={18} /> Config
                    </button>
                </div>
                className={`px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition ${activeTab === "galeria" ? "bg-amber-50 text-amber-600 shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                <ImageIcon size={18} /> Galería de Fotos
            </button>
            <button
                onClick={() => setActiveTab("general")}
                className={`px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition ${activeTab === "general" ? "bg-rose-50 text-rose-600 shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
            >
                <Info size={18} /> Información
            </button>
            <button
                onClick={() => setActiveTab("config")}
                className={`px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition ${activeTab === "config" ? "bg-rose-50 text-rose-600 shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
            >
                <Settings size={18} /> Ajustes
            </button>
        </div>

                {
        activeTab === "invitados" && (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o familia..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition"
                        />
                    </div>
                    <button
                        onClick={() => setIsAddGuestModalOpen(true)}
                        className="w-full md:w-auto px-6 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition flex items-center justify-center gap-2 shadow-lg shadow-rose-100 font-medium"
                    >
                        <Plus size={20} /> Agregar Invitado
                    </button>
                </div>

                {/* Guest Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total</p>
                        <p className="text-2xl font-bold text-gray-800">{guests.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-xs text-rose-600 uppercase font-bold tracking-wider mb-1">Confirmados</p>
                        <p className="text-2xl font-bold text-gray-800">
                            {guests.reduce((acc, g) => acc + (g.status === "Confirmado" ? g.passes : 0), 0)}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-xs text-amber-600 uppercase font-bold tracking-wider mb-1">Pendientes</p>
                        <p className="text-2xl font-bold text-gray-800">
                            {guests.reduce((acc, g) => acc + (g.status === "Pendiente" ? g.passes : 0), 0)}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Pases Totales</p>
                        <p className="text-2xl font-bold text-gray-800">
                            {guests.reduce((acc, g) => acc + g.passes, 0)}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm ring-2 ring-emerald-500/10">
                        <p className="text-xs text-emerald-600 uppercase font-bold tracking-wider mb-1">Asistieron</p>
                        <p className="text-2xl font-bold text-gray-800">
                            {guests.filter(g => g.attended).length}
                        </p>
                    </div>
                </div>

                {/* Guests List */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Invitado / Familia</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Pases</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Estado</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {guests.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                                            No hay invitados registrados aún.
                                        </td>
                                    </tr>
                                ) : (
                                    guests.map((guest) => (
                                        <tr key={guest.id} className="hover:bg-gray-50/50 transition group">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-800">{guest.name}</p>
                                                <p className="text-xs text-gray-500">{guest.group}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm font-medium">
                                                    {guest.passes}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {guest.status === "Confirmado" && (
                                                    <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-bold">
                                                        <CheckCircle2 size={16} /> Confirmado
                                                    </span>
                                                )}
                                                {guest.status === "Pendiente" && (
                                                    <span className="flex items-center gap-1.5 text-sm text-amber-500 font-bold">
                                                        <Clock size={16} /> Pendiente
                                                    </span>
                                                )}
                                                {guest.status === "Declinado" && (
                                                    <span className="flex items-center gap-1.5 text-sm text-rose-500 font-bold">
                                                        <XCircle size={16} /> Declinado
                                                    </span>
                                                )}
                                                {guest.attended && (
                                                    <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                                                        Dentro del evento
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => shareInvitation(guest)}
                                                        className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition flex items-center gap-2 text-sm font-bold border border-emerald-100"
                                                        title="Enviar por WhatsApp"
                                                    >
                                                        <Share2 size={16} />
                                                        <span className="hidden md:inline">Compartir</span>
                                                    </button>
                                                    <button
                                                        onClick={() => copyInvitationLink(guest.id)}
                                                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center gap-1 text-sm font-bold"
                                                        title="Copiar invitación"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    }

    {
        activeTab === "disenar" && (
            <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-6 bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FileImage size={24} className="text-purple-600" />
                            Generador de Invitaciones
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Crea invitaciones personalizadas para bodas, quinceaños, cumpleaños y más. Incluye el QR de cada invitado.
                        </p>
                    </div>
                    <div className="p-6">
                        {guests.length > 0 ? (
                            <InvitationGenerator
                                eventId={eventId}
                                eventName={event.name}
                                eventDate={event.date}
                                eventLocation={event.location}
                                guests={guests}
                            />
                        ) : (
                            <div className="text-center py-12">
                                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500 font-medium">Primero agrega invitados para generar invitaciones.</p>
                                <button
                                    onClick={() => { setActiveTab("invitados"); setIsAddGuestModalOpen(true); }}
                                    className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition font-bold shadow-lg shadow-rose-100"
                                >
                                    Agregar Invitados
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    {
        activeTab === "galeria" && (
            <div className="space-y-6">
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                        <ImageIcon size={28} className="text-amber-500" />
                        Momentos del Evento
                    </h3>
                    <PhotoGallery eventId={eventId} />
                </div>
            </div>
        )
    }

    {
        activeTab === "general" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 border-b pb-4">Detalles del Evento</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Fecha del Evento</p>
                                <p className="text-lg font-bold text-gray-800">{event.date}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Ubicación</p>
                                <p className="text-lg font-bold text-gray-800">{event.location}</p>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4">
                        <button className="w-full py-3 border border-rose-200 text-rose-600 rounded-xl font-medium hover:bg-rose-50 transition">
                            Actualizar Información
                        </button>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 border-b pb-4 flex items-center gap-2">
                        <Clock className="text-rose-600" size={24} /> Cronograma del Evento
                    </h3>

                    {/* Schedule List */}
                    <div className="space-y-4">
                        {event.schedule && event.schedule.length > 0 ? (
                            event.schedule.sort((a, b) => a.time.localeCompare(b.time)).map((item) => (
                                <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg group transition">
                                    <div className="bg-rose-100 text-rose-700 font-bold px-3 py-1 rounded-md text-sm min-w-[4rem] text-center">
                                        {item.time}
                                    </div>
                                    <div className="flex-1 font-medium text-gray-700">
                                        {item.activity}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteScheduleItem(item.id)}
                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                                    >
                                        <XCircle size={18} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 italic text-sm text-center py-4">
                                No hay actividades registradas.
                            </p>
                        )}
                    </div>

                    {/* Add Schedule Form */}
                    <form onSubmit={handleAddScheduleItem} className="pt-4 border-t border-gray-100">
                        <p className="text-sm font-bold text-gray-700 mb-3">Agregar Actividad</p>
                        <div className="flex gap-2">
                            <input
                                type="time"
                                required
                                value={scheduleForm.time}
                                onChange={e => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 outline-none w-32"
                            />
                            <input
                                type="text"
                                required
                                placeholder="Ej. Ceremonia, Baile..."
                                value={scheduleForm.activity}
                                onChange={e => setScheduleForm({ ...scheduleForm, activity: e.target.value })}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 outline-none flex-1"
                            />
                            <button
                                type="submit"
                                disabled={addingSchedule}
                                className="bg-gray-900 text-white p-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                            >
                                {addingSchedule ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }


    {
        activeTab === "config" && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Selector de Temas */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                            <div className="p-6 bg-gradient-to-r from-rose-50 to-purple-50 border-b border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Palette size={24} className="text-rose-600" />
                                    Temas de Invitación
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">Elige el estilo visual que verán tus invitados</p>
                            </div>
                            <div className="p-6">
                                <ThemeSelector eventId={eventId} currentTheme={event.theme || 'romantic-rose'} />
                            </div>
                        </div>
                    </div>

                    {/* Vista Previa */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm sticky top-24">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                <h3 className="font-bold text-gray-700">Vista Previa</h3>
                                <div className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider">
                                    En Vivo
                                </div>
                            </div>
                            <div className="p-6 flex justify-center bg-gray-100">
                                {/* Mock Invitation Card */}
                                <div
                                    className="w-full max-w-[280px] rounded-2xl shadow-xl overflow-hidden bg-white border border-gray-200 transform scale-90 origin-top"
                                    style={{
                                        fontFamily: getTheme(event.theme || 'romantic-rose').fonts.body,
                                        backgroundColor: getTheme(event.theme || 'romantic-rose').colors.background
                                    }}
                                >
                                    <div className="p-6 text-center space-y-4">
                                        <div
                                            className="inline-block p-2 rounded-full"
                                            style={{
                                                backgroundColor: getTheme(event.theme || 'romantic-rose').colors.primaryLight,
                                                color: getTheme(event.theme || 'romantic-rose').colors.primary
                                            }}
                                        >
                                            <Heart size={20} fill="currentColor" />
                                        </div>
                                        <h4
                                            className="text-xl font-bold"
                                            style={{
                                                fontFamily: getTheme(event.theme || 'romantic-rose').fonts.heading,
                                                color: getTheme(event.theme || 'romantic-rose').colors.text
                                            }}
                                        >
                                            {event.name}
                                        </h4>
                                        <p
                                            className="italic text-lg"
                                            style={{
                                                fontFamily: getTheme(event.theme || 'romantic-rose').fonts.accent,
                                                color: getTheme(event.theme || 'romantic-rose').colors.accent
                                            }}
                                        >
                                            ¡Nos casamos!
                                        </p>
                                        <div
                                            className="py-2 px-4 rounded-xl text-xs font-bold"
                                            style={{
                                                backgroundColor: getTheme(event.theme || 'romantic-rose').colors.primary,
                                                color: 'white'
                                            }}
                                        >
                                            Confirmar Asistencia
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 text-center">
                                <button
                                    onClick={() => window.open(`/invitacion/${eventId}/preview`, '_blank')}
                                    className="text-sm text-rose-600 font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
                                >
                                    Ver pantalla completa <ExternalLink size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Configuración Avanzada */}
                <div className="bg-white rounded-2xl border border-rose-100 overflow-hidden shadow-sm">
                    <div className="p-6 bg-rose-50 border-b border-rose-100">
                        <h3 className="text-xl font-bold text-rose-900">Configuración Avanzada</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-800">Eliminar Evento</p>
                                <p className="text-sm text-gray-500">Esta acción no se puede deshacer y borrará todos los invitados.</p>
                            </div>
                            <button className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg font-bold border border-rose-100 hover:bg-rose-100 transition">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
            </main >

        {/* Modal Agregar Invitado */ }
    {
        isAddGuestModalOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="text-xl font-bold text-gray-800">Nuevo Invitado</h3>
                        <button onClick={() => setIsAddGuestModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                            <XCircle size={24} />
                        </button>
                    </div>
                    <form onSubmit={handleAddGuest} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
                            <input
                                required
                                type="text"
                                value={guestForm.name}
                                onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none transition"
                                placeholder="Ej. Juan Pérez"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Grupo / Familia</label>
                            <input
                                type="text"
                                value={guestForm.group}
                                onChange={(e) => setGuestForm({ ...guestForm, group: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none transition"
                                placeholder="Ej. Familia Pérez o Amigos Novio"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Pases</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={guestForm.passes}
                                    onChange={(e) => setGuestForm({ ...guestForm, passes: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Estatus</label>
                                <select
                                    value={guestForm.status}
                                    onChange={(e) => setGuestForm({ ...guestForm, status: e.target.value as "Confirmado" | "Pendiente" | "Declinado" })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none transition bg-white"
                                >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="Confirmado">Confirmado</option>
                                    <option value="Declinado">Declinado</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAddGuestModalOpen(false)}
                                className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition shadow-lg shadow-rose-100"
                            >
                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }
        </div >
    );
}
