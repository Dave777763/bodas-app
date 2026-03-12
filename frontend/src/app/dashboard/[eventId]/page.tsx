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

import { getTheme } from "@/lib/themes";
import InvitationGenerator from "@/components/InvitationGenerator";
import PhotoGallery from "@/components/PhotoGallery";
import MainImageUpload from "@/components/MainImageUpload";

const ADMIN_EMAIL = "marroquindavid635@gmail.com";


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
    const [searchTerm, setSearchTerm] = useState("");

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
                const userEmail = user?.email?.toLowerCase().trim() || "";
                const isAdmin = userEmail === "marroquindavid635@gmail.com";
                
                // Solo redirigir si el usuario ya cargó y NO es el dueño ni admin
                if (user && !isAdmin && data.userId && data.userId !== user.uid) {
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

    const handleDeleteEvent = async () => {
        if (!confirm("¿ESTAS SEGURO? Esta acción es irreversible y borrará todos los invitados y fotos.")) return;

        try {
            const eventRef = doc(db, "events", eventId);
            await updateDoc(eventRef, { deleted: true });
            alert("Evento eliminado con éxito");
            router.push("/dashboard");
        } catch (e) {
            console.error("Error deleting event", e);
            alert("No se pudo eliminar el evento");
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
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-vento-primary mb-1">VENTO SESSION 2.0</p>
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
                        <FileImage size={18} /> Diseño de Invitación
                    </button>
                    <button
                        onClick={() => setActiveTab("galeria")}
                        className={`px-8 py-3 rounded-2xl flex items-center gap-3 font-bold transition-all duration-300 ${activeTab === "galeria" ? "bg-vento-primary text-white shadow-lg shadow-vento-primary/20" : "text-vento-text-muted hover:bg-vento-bg"}`}
                    >
                        <ImageIcon size={18} /> Galería de Momentos
                    </button>
                    <button
                        onClick={() => setActiveTab("config")}
                        className={`px-8 py-3 rounded-2xl flex items-center gap-3 font-bold transition-all duration-300 ${activeTab === "config" ? "bg-vento-primary text-white shadow-lg shadow-vento-primary/20" : "text-vento-text-muted hover:bg-vento-bg"}`}
                    >
                        <Settings size={18} /> Configuración de Evento
                    </button>
                </div>

                {activeTab === "invitados" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Search and Add */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="relative w-full md:max-w-md group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-vento-text-muted transition-colors group-focus-within:text-vento-primary" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o familia..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-6 py-3.5 bg-vento-card border border-vento-border rounded-2xl focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary outline-none transition-all font-medium"
                                />
                            </div>
                            <button
                                onClick={() => setIsAddGuestModalOpen(true)}
                                className="w-full md:w-auto px-8 py-3.5 bg-vento-primary text-white rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-vento-primary/20 font-bold"
                            >
                                <Plus size={20} /> Agregar Invitado
                            </button>
                        </div>

                        {/* Guest Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <div className="bg-vento-card p-5 rounded-3xl border border-vento-border shadow-sm">
                                <p className="text-[10px] text-vento-text-muted uppercase font-black tracking-widest mb-1">Confirmados</p>
                                <p className="text-3xl font-black text-vento-primary tabular-nums">
                                    {guests.reduce((acc, g) => acc + (g.status === "Confirmado" ? (g.confirmedPasses !== undefined ? g.confirmedPasses : g.passes) : 0), 0)}
                                </p>
                            </div>
                            <div className="bg-vento-card p-5 rounded-3xl border border-vento-border shadow-sm">
                                <p className="text-[10px] text-vento-text-muted uppercase font-black tracking-widest mb-1">Pendientes</p>
                                <p className="text-3xl font-black text-amber-500 tabular-nums">
                                    {guests.reduce((acc, g) => acc + (g.status === "Pendiente" ? g.passes : 0), 0)}
                                </p>
                            </div>
                            <div className="bg-vento-card p-5 rounded-3xl border border-vento-border shadow-sm">
                                <p className="text-[10px] text-vento-text-muted uppercase font-black tracking-widest mb-1">Invitados</p>
                                <p className="text-3xl font-black text-vento-text tabular-nums">
                                    {guests.reduce((acc, g) => acc + g.passes, 0)}
                                </p>
                            </div>
                            <div className="bg-vento-card p-5 rounded-3xl border border-vento-border shadow-sm border-emerald-500/20">
                                <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest mb-1">Checked-in</p>
                                <p className="text-3xl font-black text-emerald-500 tabular-nums">
                                    {guests.filter(g => g.attended).length}
                                </p>
                            </div>
                        </div>

                        {/* Guests Table */}
                        <div className="bg-vento-card rounded-[2.5rem] border border-vento-border overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-vento-bg/50 border-b border-vento-border">
                                        <tr>
                                            <th className="px-8 py-5 text-[10px] font-black text-vento-text-muted uppercase tracking-widest">Invitado / Familia</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-vento-text-muted uppercase tracking-widest">Pases</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-vento-text-muted uppercase tracking-widest">Estado</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-vento-text-muted uppercase tracking-widest text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-vento-border">
                                        {guests.filter(g =>
                                            g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (g.group || "").toLowerCase().includes(searchTerm.toLowerCase())
                                        ).length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-8 py-20 text-center text-vento-text-muted italic font-medium">
                                                    {searchTerm ? "No se encontraron invitados con ese nombre." : "Aún no hay invitados registrados. Comienza agregando uno arriba."}
                                                </td>
                                            </tr>
                                        ) : (
                                            guests
                                                .filter(g =>
                                                    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    (g.group || "").toLowerCase().includes(searchTerm.toLowerCase())
                                                )
                                                .map((guest) => (
                                                    <tr key={guest.id} className="hover:bg-vento-bg/50 transition-colors group">
                                                        <td className="px-8 py-5">
                                                            <p className="font-bold text-vento-text">{guest.name}</p>
                                                            <p className="text-xs text-vento-text-muted font-medium">{guest.group || 'Sin grupo'}</p>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <span className="px-3 py-1 bg-vento-bg border border-vento-border rounded-lg text-sm font-black tabular-nums">
                                                                {guest.passes}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <div className="flex flex-col gap-1">
                                                                {guest.status === "Confirmado" && (
                                                                    <span className="flex items-center gap-2 text-sm text-emerald-500 font-bold">
                                                                        <CheckCircle2 size={16} /> Confirmado
                                                                    </span>
                                                                )}
                                                                {guest.status === "Pendiente" && (
                                                                    <span className="flex items-center gap-2 text-sm text-amber-500 font-bold">
                                                                        <Clock size={16} /> Pendiente
                                                                    </span>
                                                                )}
                                                                {guest.status === "Declinado" && (
                                                                    <span className="flex items-center gap-2 text-sm text-vento-primary font-bold">
                                                                        <XCircle size={16} /> Declinado
                                                                    </span>
                                                                )}
                                                                {guest.attended && (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase border border-emerald-500/20 max-w-fit">
                                                                        Checked-In
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5 text-right">
                                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => shareInvitation(guest)}
                                                                    className="px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase border border-emerald-500/20"
                                                                >
                                                                    <Share2 size={14} /> Compartir
                                                                </button>
                                                                <button
                                                                    onClick={() => copyInvitationLink(guest.id)}
                                                                    className="p-2.5 text-vento-primary hover:bg-vento-primary/10 rounded-xl transition-colors border border-transparent hover:border-vento-primary/20"
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
                )}


                {activeTab === "disenar" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-vento-card rounded-[2.5rem] border border-vento-border overflow-hidden shadow-xl">
                            <div className="p-10 bg-gradient-to-br from-vento-bg/50 to-vento-primary/5 border-b border-vento-border">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-vento-primary mb-2">Vento Invitation Designer</p>
                                <h3 className="text-3xl font-black font-serif italic mb-2">Crea Invitaciones Únicas</h3>
                                <p className="text-vento-text-muted font-medium">
                                    Personaliza la experiencia visual de tus invitados. Cada diseño incluye el acceso QR dinámico de Vento.
                                </p>
                            </div>
                            <div className="p-10">
                                {guests.length > 0 ? (
                                    <InvitationGenerator
                                        eventId={eventId}
                                        eventName={event.name}
                                        eventDate={event.date}
                                        eventLocation={event.location}
                                        guests={guests}
                                    />
                                ) : (
                                    <div className="text-center py-20 bg-vento-bg/30 rounded-3xl border border-dashed border-vento-border">
                                        <Plus className="mx-auto text-vento-text-muted mb-6" size={48} />
                                        <p className="text-vento-text-muted font-bold text-lg mb-6">Primero necesitas agregar invitados para diseñar sus tarjetas.</p>
                                        <button
                                            onClick={() => setActiveTab("invitados")}
                                            className="px-10 py-4 bg-vento-primary text-white rounded-2xl hover:opacity-90 transition-all font-bold shadow-xl shadow-vento-primary/20"
                                        >
                                            Ir a Lista de Invitados
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "galeria" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-vento-card rounded-[2.5rem] p-10 border border-vento-border shadow-xl">
                            <div className="mb-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-vento-primary mb-2">Memories Hub</p>
                                <h3 className="text-3xl font-black font-serif italic">Galería de Momentos</h3>
                            </div>
                            <PhotoGallery eventId={eventId} />
                        </div>
                    </div>
                )}

                {activeTab === "config" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-vento-card rounded-[2.5rem] border border-vento-border overflow-hidden shadow-xl">
                                    <div className="p-8 border-b border-vento-border bg-vento-bg/50">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-vento-primary mb-1">Visual Settings</p>
                                        <h3 className="text-2xl font-black font-serif italic">Temas de la Invitación</h3>
                                    </div>
                                    <div className="p-8">
                                        <ThemeSelector eventId={eventId} currentTheme={event.theme || 'romantic-rose'} />
                                    </div>
                                </div>

                                <div className="bg-vento-card rounded-[2.5rem] border border-vento-border overflow-hidden shadow-xl">
                                    <div className="p-8 border-b border-vento-border bg-vento-bg/50">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-vento-primary mb-1">Invitation Media</p>
                                        <h3 className="text-2xl font-black font-serif italic text-vento-text">Imagen de Portada</h3>
                                    </div>
                                    <div className="p-8">
                                        <MainImageUpload eventId={eventId} currentImageUrl={event.imageUrl} />
                                    </div>
                                </div>

                                <div className="bg-vento-card rounded-[2.5rem] border border-vento-border overflow-hidden shadow-xl">
                                    <div className="p-8 border-b border-vento-border bg-vento-bg/50">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-vento-primary mb-1">Timing & Details</p>
                                        <h3 className="text-2xl font-black font-serif italic flex items-center gap-3">
                                            <Clock className="text-vento-primary" size={24} /> Información & Cronograma
                                        </h3>
                                    </div>
                                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-vento-text-muted">Datos de Referencia</h4>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-vento-bg text-vento-primary rounded-2xl border border-vento-border shadow-sm">
                                                        <Calendar size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-vento-text-muted uppercase tracking-widest">Fecha</p>
                                                        <p className="font-bold text-vento-text">{event.date}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-vento-bg text-vento-primary rounded-2xl border border-vento-border shadow-sm">
                                                        <MapPin size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-vento-text-muted uppercase tracking-widest">Lugar</p>
                                                        <p className="font-bold text-vento-text">{event.location}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-vento-text-muted">Actividades</h4>
                                            <div className="space-y-3">
                                                {event.schedule && event.schedule.length > 0 ? (
                                                    event.schedule.sort((a, b) => a.time.localeCompare(b.time)).map((item) => (
                                                        <div key={item.id} className="flex items-center gap-4 p-3 bg-vento-bg/30 border border-vento-border rounded-2xl group transition-all hover:bg-vento-bg self-start">
                                                            <span className="text-xs font-black text-vento-primary bg-vento-card px-2 py-1 rounded-lg border border-vento-border">
                                                                {item.time}
                                                            </span>
                                                            <span className="flex-1 text-sm font-bold text-vento-text">{item.activity}</span>
                                                            <button onClick={() => handleDeleteScheduleItem(item.id)} className="text-vento-text-muted hover:text-vento-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <XCircle size={16} />
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-vento-text-muted text-xs italic py-4">No hay actividades definidas.</p>
                                                )}
                                                <form onSubmit={handleAddScheduleItem} className="flex gap-2 pt-4">
                                                    <input type="time" required value={scheduleForm.time} onChange={e => setScheduleForm({ ...scheduleForm, time: e.target.value })} className="bg-vento-bg border border-vento-border rounded-xl px-2 py-2 text-xs text-vento-text focus:ring-2 focus:ring-vento-primary/20 w-24" />
                                                    <input type="text" required placeholder="Ceremonia..." value={scheduleForm.activity} onChange={e => setScheduleForm({ ...scheduleForm, activity: e.target.value })} className="bg-vento-bg border border-vento-border rounded-xl px-3 py-2 text-xs text-vento-text focus:ring-2 focus:ring-vento-primary/20 flex-1" />
                                                    <button type="submit" className="p-2 bg-vento-primary text-white rounded-xl hover:opacity-90 transition-all shadow-md"><Plus size={16} /></button>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-vento-card rounded-[2.5rem] border border-vento-border overflow-hidden shadow-xl">
                                    <div className="p-8 border-b border-vento-border bg-vento-bg/50 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-vento-primary mb-1">Atmosphere & Sound</p>
                                            <h3 className="text-2xl font-black font-serif italic flex items-center gap-3">
                                                Música de Fondo
                                            </h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="px-3 py-1 bg-vento-bg rounded-full border border-vento-border flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-[#1DB954]"></div>
                                                <span className="text-[8px] font-black uppercase">Spotify</span>
                                            </div>
                                            <div className="px-3 py-1 bg-vento-bg rounded-full border border-vento-border flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-[#FF0000]"></div>
                                                <span className="text-[8px] font-black uppercase">YouTube Music</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-8">
                                        <p className="text-sm text-vento-text-muted mb-6">Pegue el enlace de la canción o lista de reproducción que desea que se escuche en la invitación.</p>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-vento-text-muted mb-2 ml-1">Enlace de Música</label>
                                                <div className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="https://open.spotify.com/track/..."
                                                        defaultValue={event.musicUrl || ""}
                                                        onBlur={async (e) => {
                                                            const newUrl = e.target.value;
                                                            if (newUrl === event.musicUrl) return;
                                                            try {
                                                                const eventRef = doc(db, "events", eventId);
                                                                await updateDoc(eventRef, { musicUrl: newUrl });
                                                                // onSnapshot will update the local state
                                                            } catch (err) {
                                                                console.error("Error updating music URL:", err);
                                                                alert("Error al guardar la música");
                                                            }
                                                        }}
                                                        className="flex-1 px-5 py-3.5 rounded-2xl border border-vento-border bg-vento-bg text-vento-text focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary outline-none transition-all font-medium text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-vento-text-muted italic">
                                                Sugerencia: Para Spotify, usa la opción de "Compartir &gt; Copiar enlace". Para YouTube Music, copia la URL del navegador.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {/* Preview Card */}
                                <div className="bg-vento-card rounded-[2.5rem] border border-vento-border overflow-hidden shadow-xl sticky top-28">
                                    <div className="p-6 border-b border-vento-border bg-vento-bg/50 flex items-center justify-between">
                                        <h3 className="font-black text-xs uppercase tracking-widest">Live Preview</h3>
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded uppercase tracking-[0.2em] border border-emerald-500/20">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live
                                        </div>
                                    </div>
                                    <div className="p-8 flex justify-center bg-vento-bg/20">
                                        <div
                                            className="w-full max-w-[200px] border-4 border-vento-card rounded-[2rem] shadow-2xl overflow-hidden aspect-[9/16] pointer-events-none scale-100"
                                            style={{
                                                fontFamily: getTheme(event.theme || 'romantic-rose').fonts.body,
                                                backgroundColor: getTheme(event.theme || 'romantic-rose').colors.background
                                            }}
                                        >
                                            <div className="p-4 text-center space-y-4">
                                                {event.imageUrl ? (
                                                    <div className="w-full aspect-video rounded-xl overflow-hidden mb-2 border border-vento-border">
                                                        <img src={event.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="inline-block p-2 rounded-full mb-2" style={{ backgroundColor: getTheme(event.theme || 'romantic-rose').colors.primaryLight }}>
                                                        <Heart size={16} fill={getTheme(event.theme || 'romantic-rose').colors.primary} color={getTheme(event.theme || 'romantic-rose').colors.primary} />
                                                    </div>
                                                )}
                                                <h5 className="text-sm font-black leading-tight" style={{ color: getTheme(event.theme || 'romantic-rose').colors.text }}>{event.name}</h5>
                                                <button className="px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest w-full" style={{ backgroundColor: getTheme(event.theme || 'romantic-rose').colors.primary, color: '#fff' }}>Confirmar</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <button onClick={() => window.open(`/invitacion/${eventId}/preview`, '_blank')} className="w-full py-3 bg-vento-bg text-vento-primary border border-vento-primary/20 rounded-2xl hover:bg-vento-primary hover:text-white transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                                            Pantalla Completa <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Dangerous Zone */}
                                <div className="bg-vento-primary/5 rounded-[2.5rem] border border-vento-primary/10 overflow-hidden">
                                    <div className="p-6 bg-vento-primary/10 border-b border-vento-primary/10">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-vento-primary">Precaución</h4>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-[10px] font-bold text-vento-primary/70 mb-4">Eliminar este evento borrará permanentemente toda la información de invitados y fotos.</p>
                                        <button
                                            onClick={handleDeleteEvent}
                                            className="w-full py-3 bg-vento-primary/10 text-vento-primary rounded-2xl hover:bg-vento-primary hover:text-white transition-all font-black text-[10px] uppercase tracking-widest border border-vento-primary/20"
                                        >
                                            Eliminar Evento
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal Agregar Invitado */}
            {isAddGuestModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <div className="bg-vento-card rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-vento-border">
                        <div className="p-8 border-b border-vento-border flex justify-between items-center bg-vento-bg/50">
                            <h3 className="text-2xl font-black font-serif italic tracking-tighter">NUEVO <span className="text-vento-primary">INVITADO</span></h3>
                            <button onClick={() => setIsAddGuestModalOpen(false)} className="text-vento-text-muted hover:text-vento-primary p-2 transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddGuest} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-vento-text-muted mb-2 ml-1">Invitado o Familia</label>
                                <input required type="text" value={guestForm.name} onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl border border-vento-border bg-vento-bg text-vento-text focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary outline-none transition-all font-medium" placeholder="P. ej. Familia García" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-vento-text-muted mb-2 ml-1">Etiqueta de Grupo</label>
                                <input type="text" value={guestForm.group} onChange={(e) => setGuestForm({ ...guestForm, group: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl border border-vento-border bg-vento-bg text-vento-text focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary outline-none transition-all font-medium" placeholder="P. ej. Amigos Novia" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-vento-text-muted mb-2 ml-1">Pases</label>
                                    <input type="number" min="1" value={guestForm.passes} onChange={(e) => setGuestForm({ ...guestForm, passes: parseInt(e.target.value) })} className="w-full px-5 py-3.5 rounded-2xl border border-vento-border bg-vento-bg text-vento-text focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary outline-none transition-all font-black" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-vento-text-muted mb-2 ml-1">Estatus Actual</label>
                                    <select value={guestForm.status} onChange={(e) => setGuestForm({ ...guestForm, status: e.target.value as "Confirmado" | "Pendiente" | "Declinado" })} className="w-full px-5 py-3.5 rounded-2xl border border-vento-border bg-vento-bg text-vento-text focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary outline-none transition-all font-bold appearance-none">
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Confirmado">Confirmado</option>
                                        <option value="Declinado">Declinado</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsAddGuestModalOpen(false)} className="flex-1 py-4 text-vento-text-muted font-bold hover:bg-vento-bg rounded-2xl transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 py-4 bg-vento-primary text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-vento-primary/20 uppercase tracking-widest text-xs">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
