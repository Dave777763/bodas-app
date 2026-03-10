"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Calendar, MapPin, ChevronRight, PartyPopper, Link as LinkIcon } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, collectionGroup, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useUITheme } from "@/context/UIThemeContext";
import { Sun, Moon, Terminal } from "lucide-react";

const ADMIN_EMAIL = "marroquindavid635@gmail.com";

interface VentoEvent {
    id: string;
    name: string;
    date: string;
    location: string;
    mapUrl?: string;
    createdAt?: unknown;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const { theme, setTheme } = useUITheme();
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [events, setEvents] = useState<VentoEvent[]>([]);
    const [globalStats, setGlobalStats] = useState({ confirmados: 0, pendientes: 0 });
    const [formData, setFormData] = useState({
        name: "",
        date: "",
        location: "",
        mapUrl: ""
    });

    // Escuchar invitados de TODOS los eventos del usuario (collectionGroup)
    useEffect(() => {
        if (!user) return;

        const isAdmin = user.email === ADMIN_EMAIL;

        let guestsQuery = query(collectionGroup(db, "guests"));

        // Si no es admin, filtramos por el dueño del evento
        if (!isAdmin) {
            guestsQuery = query(collectionGroup(db, "guests"), where("eventOwnerId", "==", user.uid));
        }

        const unsubscribe = onSnapshot(guestsQuery, (snapshot) => {
            let totalConfirmados = 0;
            let totalPendientes = 0;

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const passes = data.passes || 0;
                if (data.status === "Confirmado") {
                    totalConfirmados += passes;
                } else if (data.status === "Pendiente") {
                    totalPendientes += passes;
                }
            });

            setGlobalStats({
                confirmados: totalConfirmados,
                pendientes: totalPendientes
            });
        }, (err) => {
            console.warn("Stats query error (likely missing index):", err);
        });

        return () => unsubscribe();
    }, [user]);

    // Escuchar eventos en tiempo real
    useEffect(() => {
        if (!user) return;

        const isAdmin = user.email === ADMIN_EMAIL;
        let q;

        if (isAdmin) {
            // Admin ve todo
            q = query(collection(db, "events"), orderBy("createdAt", "desc"));
        } else {
            // Usuario común solo ve lo suyo
            q = query(
                collection(db, "events"),
                where("userId", "==", user.uid),
                orderBy("createdAt", "desc")
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as VentoEvent[];

            setEvents(eventsList);
            setFetching(false);
        }, (error) => {
            console.error("Error fetching events:", error);
            setFetching(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        console.log("Iniciando guardado de evento...", formData);

        try {
            console.log("Intentando addDoc en colección 'events'...");
            const docRef = await addDoc(collection(db, "events"), {
                ...formData,
                userId: user?.uid,
                ownerEmail: user?.email,
                createdAt: serverTimestamp(),
            });
            console.log("Evento guardado con ID:", docRef.id);

            // Limpiar formulario y cerrar modal
            setFormData({ name: "", date: "", location: "", mapUrl: "" });
            setIsModalOpen(false);

            // Opcional: Podríamos disparar un refresh de los datos aquí
            // Por ahora, solo cerramos el modal
            console.log("¡Evento guardado con éxito en Firebase!");
        } catch (error: unknown) {
            console.error("ERROR DETALLADO de Firebase:", error);
            alert(`Error al guardar: ${error instanceof Error ? error.message : "Revisa la consola"}`);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="p-8 min-h-screen bg-vento-bg text-vento-text">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-black font-serif tracking-tight">Vento <span className="text-vento-primary">Dashboard</span></h1>

                <div className="flex items-center gap-2 bg-vento-card p-1 rounded-2xl border border-vento-border shadow-sm">
                    <button
                        onClick={() => setTheme("light")}
                        className={`p-2 rounded-xl transition ${theme === "light" ? "bg-vento-primary text-white shadow-md" : "text-vento-text-muted hover:bg-vento-bg"}`}
                    >
                        <Sun size={18} />
                    </button>
                    <button
                        onClick={() => setTheme("dark")}
                        className={`p-2 rounded-xl transition ${theme === "dark" ? "bg-vento-primary text-white shadow-md" : "text-vento-text-muted hover:bg-vento-bg"}`}
                    >
                        <Moon size={18} />
                    </button>
                    <button
                        onClick={() => setTheme("matrix")}
                        className={`p-2 rounded-xl transition ${theme === "matrix" ? "bg-vento-primary text-white shadow-md" : "text-vento-text-muted hover:bg-vento-bg"}`}
                    >
                        <Terminal size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {/* Stats Cards */}
                <div className="bg-vento-card p-7 rounded-3xl shadow-sm border border-vento-border group hover:border-vento-primary transition-all duration-300">
                    <h3 className="text-vento-text-muted text-xs font-bold uppercase tracking-widest mb-2">Confirmados</h3>
                    <p className="text-5xl font-black text-vento-primary tabular-nums">{globalStats.confirmados}</p>
                </div>

                <div className="bg-vento-card p-7 rounded-3xl shadow-sm border border-vento-border group hover:border-vento-primary transition-all duration-300">
                    <h3 className="text-vento-text-muted text-xs font-bold uppercase tracking-widest mb-2">Pendientes</h3>
                    <p className="text-5xl font-black text-amber-500 tabular-nums">{globalStats.pendientes}</p>
                </div>

                <div className="bg-vento-card p-7 rounded-3xl shadow-sm border border-vento-border group hover:border-vento-primary transition-all duration-300">
                    <h3 className="text-vento-text-muted text-xs font-bold uppercase tracking-widest mb-2">Total Eventos</h3>
                    <p className="text-5xl font-black text-blue-500 tabular-nums">{events.length}</p>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold font-serif">Mis Sesiones Vento</h2>
                    {events.length > 0 && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-2.5 bg-vento-primary text-white rounded-2xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-vento-primary/20 font-bold"
                        >
                            <Plus size={20} /> Nuevo Evento
                        </button>
                    )}
                </div>

                {fetching ? (
                    <div className="flex justify-center p-20">
                        <Loader2 className="animate-spin text-vento-primary" size={40} />
                    </div>
                ) : events.length === 0 ? (
                    <div className="bg-vento-card p-16 rounded-3xl border border-dashed border-vento-border text-center">
                        <p className="text-vento-text-muted mb-6 text-xl">Bienvenido a Vento. Comienza creando tu primer gran momento.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-8 py-3 bg-vento-primary text-white rounded-2xl hover:opacity-90 transition font-bold shadow-xl shadow-vento-primary/20"
                        >
                            Crear mi primer evento
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {events.map((event) => (
                            <div
                                key={event.id}
                                onClick={() => router.push(`/dashboard/${event.id}`)}
                                className="bg-vento-card p-6 rounded-3xl border border-vento-border shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-vento-bg rounded-2xl text-vento-primary group-hover:bg-vento-primary group-hover:text-white transition-colors duration-300">
                                        <PartyPopper size={24} />
                                    </div>
                                    <ChevronRight className="text-vento-text-muted group-hover:text-vento-primary transition-colors" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{event.name}</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-vento-text-muted">
                                        <Calendar size={14} className="text-vento-primary" />
                                        <span>{event.date}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-vento-text-muted">
                                        <MapPin size={14} className="text-vento-primary" />
                                        <span>{event.location}</span>
                                    </div>
                                    {event.mapUrl && (
                                        <div className="flex items-center gap-2 text-sm text-emerald-600">
                                            <LinkIcon size={14} />
                                            <span>Link de mapa incluido</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Creación de Evento */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <div className="bg-vento-card rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-vento-border flex justify-between items-center bg-vento-bg/50">
                            <h3 className="text-2xl font-black italic tracking-tighter">VENTO <span className="text-vento-primary text-sm not-italic font-bold ml-2">NUEVO EVENTO</span></h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-vento-text-muted hover:text-vento-primary p-2 rounded-full hover:bg-vento-bg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEvent} className="p-8 space-y-5">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-vento-text-muted mb-2 ml-1">¿Qué celebramos?</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Ej. Gala Anual o Fiesta de David"
                                    className="w-full px-5 py-3.5 rounded-2xl border border-vento-border bg-vento-bg text-vento-text placeholder-vento-text-muted/50 focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary outline-none transition-all font-medium"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-vento-text-muted mb-2 ml-1">¿Cuándo?</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3.5 rounded-2xl border border-vento-border bg-vento-bg text-vento-text focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary outline-none transition-all font-medium"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-vento-text-muted mb-2 ml-1">¿Dónde?</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="Nombre del lugar"
                                    className="w-full px-5 py-3.5 rounded-2xl border border-vento-border bg-vento-bg text-vento-text placeholder-vento-text-muted/50 focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary outline-none transition-all font-medium"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-vento-text-muted mb-2 ml-1">Enlace de Maps (Opcional)</label>
                                <input
                                    type="url"
                                    name="mapUrl"
                                    value={formData.mapUrl}
                                    onChange={handleChange}
                                    placeholder="https://maps.app.goo.gl/..."
                                    className="w-full px-5 py-3.5 rounded-2xl border border-vento-border bg-vento-bg text-vento-text placeholder-vento-text-muted/50 focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary outline-none transition-all font-medium"
                                    disabled={loading}
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 text-vento-text-muted hover:bg-vento-bg rounded-2xl transition-colors font-bold"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3 bg-vento-primary text-white rounded-2xl hover:opacity-90 transition-all font-bold shadow-xl shadow-vento-primary/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Guardando
                                        </>
                                    ) : (
                                        "Crear Evento"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
