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
    imageUrl?: string;
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
    const [searchTerm, setSearchTerm] = useState("");

    // Escuchar invitados de TODOS los eventos del usuario (collectionGroup)
    useEffect(() => {
        if (!user || !user.email) return;

        const userEmail = user.email.toLowerCase().trim();
        const isAdmin = userEmail === "marroquindavid635@gmail.com";

        let guestsQuery = query(collectionGroup(db, "guests"));

        // Si no es admin, filtramos por el dueño del evento
        if (!isAdmin) {
            guestsQuery = query(collectionGroup(db, "guests"), where("eventOwnerId", "==", user.uid));
        }

        const unsubscribe = onSnapshot(guestsQuery, (snapshot) => {
            console.log(`Update Global Stats: ${snapshot.size} invitados encontrados`);
            let totalConfirmados = 0;
            let totalPendientes = 0;

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const passes = data.passes || 0;
                const confirmed = data.confirmedPasses !== undefined ? data.confirmedPasses : passes;
                
                if (data.status === "Confirmado") {
                    totalConfirmados += confirmed;
                } else if (data.status === "Pendiente") {
                    totalPendientes += passes;
                }
            });

            console.log("Stats calculadas:", { totalConfirmados, totalPendientes });
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
        if (!user || !user.email) return;

        const userEmail = user.email.toLowerCase().trim();
        const isAdmin = userEmail === "marroquindavid635@gmail.com";
        let q;

        if (isAdmin) {
            // Admin ve todo
            q = query(collection(db, "events"));
        } else {
            // Usuario común solo ve lo suyo
            q = query(
                collection(db, "events"),
                where("userId", "==", user.uid)
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log(`Fetch eventos exitoso. Documentos encontrados: ${snapshot.size}`);
            const eventsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as VentoEvent[];

            setEvents(eventsList);
            setFetching(false);
        }, (error) => {
            console.error("Error fetching events:", error);
            alert(`Error al cargar eventos: ${error.message}\nVerifica tus permisos en Firebase.`);
            setFetching(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const normalizedEmail = (user?.email || "").toLowerCase().trim();
        console.log("Iniciando guardado de evento...", { ...formData, ownerEmail: normalizedEmail });

        try {
            const docRef = await addDoc(collection(db, "events"), {
                ...formData,
                userId: user?.uid,
                ownerEmail: normalizedEmail,
                createdAt: serverTimestamp(),
            });
            console.log("Evento guardado con ID:", docRef.id);

            setFormData({ name: "", date: "", location: "", mapUrl: "" });
            setIsModalOpen(false);
            console.log("¡Evento guardado con éxito!");
        } catch (error: any) {
            console.error("Error original de Firebase:", error);
            
            let message = "Error al guardar. ";
            if (error.code === 'permission-denied') {
                message += "No tienes permisos para escribir en la base de datos. Verifica que tu cuenta sea la correcta.";
            } else {
                message += error.message || "Revisa la consola.";
            }
            
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="p-8 min-h-screen bg-vento-bg text-vento-text transition-colors duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-4xl font-black font-serif tracking-tight">Panel <span className="text-vento-primary">Vento 2.0</span></h1>
                        {user?.email?.toLowerCase().trim() === "marroquindavid635@gmail.com" && (
                            <span className="px-2 py-1 bg-rose-500 text-white text-[10px] font-black rounded-lg shadow-lg animate-pulse">ADMIN</span>
                        )}
                    </div>
                    <p className="text-vento-text-muted text-sm font-medium">Gestiona todos tus grandes momentos desde un solo lugar. {user?.email}</p>
                </div>

                <div className="flex items-center gap-2 bg-vento-card p-1.5 rounded-2xl border border-vento-border shadow-lg">
                    <button
                        onClick={() => setTheme("light")}
                        className={`p-2.5 rounded-xl transition-all duration-300 ${theme === "light" ? "bg-vento-primary text-white shadow-xl shadow-vento-primary/30" : "text-vento-text-muted hover:bg-vento-bg"}`}
                        title="Tema Claro"
                    >
                        <Sun size={20} />
                    </button>
                    <button
                        onClick={() => setTheme("dark")}
                        className={`p-2.5 rounded-xl transition-all duration-300 ${theme === "dark" ? "bg-vento-primary text-white shadow-xl shadow-vento-primary/30" : "text-vento-text-muted hover:bg-vento-bg"}`}
                        title="Tema Oscuro"
                    >
                        <Moon size={20} />
                    </button>
                    <button
                        onClick={() => setTheme("matrix")}
                        className={`p-2.5 rounded-xl transition-all duration-300 ${theme === "matrix" ? "bg-vento-primary text-white shadow-xl shadow-vento-primary/30" : "text-vento-text-muted hover:bg-vento-bg"}`}
                        title="Tema Matrix"
                    >
                        <Terminal size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Stats Cards */}
                <div className="bg-vento-card p-8 rounded-[2rem] shadow-sm border border-vento-border group hover:border-vento-primary/50 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 delay-75 fill-mode-both">
                    <h3 className="text-vento-text-muted text-[10px] font-black uppercase tracking-[0.2em] mb-3">Invitados Confirmados</h3>
                    <p className="text-5xl font-black text-vento-primary tabular-nums tracking-tighter">{globalStats.confirmados}</p>
                </div>

                <div className="bg-vento-card p-8 rounded-[2rem] shadow-sm border border-vento-border group hover:border-vento-primary/50 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 delay-150 fill-mode-both">
                    <h3 className="text-vento-text-muted text-[10px] font-black uppercase tracking-[0.2em] mb-3">Respuestas Pendientes</h3>
                    <p className="text-5xl font-black text-amber-500 tabular-nums tracking-tighter">{globalStats.pendientes}</p>
                </div>

                <div className="bg-vento-card p-8 rounded-[2rem] shadow-sm border border-vento-border group hover:border-vento-primary/50 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 delay-300 fill-mode-both">
                    <h3 className="text-vento-text-muted text-[10px] font-black uppercase tracking-[0.2em] mb-3">Sesiones Activas</h3>
                    <p className="text-5xl font-black text-blue-500 tabular-nums tracking-tighter">{events.length}</p>
                </div>
            </div>

            <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-black font-serif italic">Mis Sesiones Vento</h2>
                        <span className="px-3 py-1 bg-vento-primary/10 text-vento-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-vento-primary/20">{events.length}</span>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-72 group">
                            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-vento-text-muted rotate-45 transition-colors group-focus-within:text-vento-primary" size={20} />
                            <input
                                type="text"
                                placeholder="Filtrar eventos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-6 py-3 bg-vento-card border border-vento-border rounded-2xl focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary outline-none transition-all font-medium text-sm shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-8 py-3 bg-vento-primary text-white rounded-2xl hover:opacity-90 transition-all flex items-center gap-3 shadow-xl shadow-vento-primary/20 font-black text-sm uppercase tracking-widest"
                        >
                            <Plus size={20} /> Nuevo
                        </button>
                    </div>
                </div>

                {fetching ? (
                    <div className="flex justify-center p-20">
                        <Loader2 className="animate-spin text-vento-primary" size={40} />
                    </div>
                ) : events.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                    <div className="bg-vento-card p-20 rounded-[2.5rem] border border-dashed border-vento-border text-center shadow-xl">
                        {searchTerm ? (
                            <>
                                <p className="text-vento-text-muted mb-6 text-lg font-medium italic">No se encontraron eventos que coincidan con tu búsqueda.</p>
                                <button onClick={() => setSearchTerm("")} className="text-vento-primary font-black uppercase text-xs tracking-widest hover:underline">Limpiar Filtros</button>
                            </>
                        ) : (
                            <>
                                <PartyPopper size={48} className="mx-auto mb-6 text-vento-primary opacity-20" />
                                <p className="text-vento-text-muted mb-8 text-lg font-medium italic">Aún no has creado ningún evento.</p>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-10 py-4 bg-vento-primary text-white rounded-[1.5rem] hover:opacity-90 transition-all flex items-center gap-3 shadow-2xl shadow-vento-primary/30 font-black text-sm uppercase tracking-widest mx-auto"
                                >
                                    <Plus size={20} /> Crear mi primer evento
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        {events
                            .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map((event, index) => (
                                <div
                                    key={event.id}
                                    onClick={() => router.push(`/dashboard/${event.id}`)}
                                    className="bg-vento-card p-8 rounded-[2.5rem] border border-vento-border shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-vento-primary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-vento-bg rounded-[1.25rem] text-vento-primary group-hover:bg-vento-primary group-hover:text-white transition-all duration-500 shadow-sm">
                                            <PartyPopper size={28} />
                                        </div>
                                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-vento-bg text-vento-text-muted group-hover:bg-vento-primary/10 group-hover:text-vento-primary transition-all">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-black font-serif italic mb-4 group-hover:text-vento-primary transition-colors">{event.name}</h3>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-sm font-bold text-vento-text-muted">
                                            <div className="p-2 bg-vento-bg rounded-lg border border-vento-border">
                                                <Calendar size={14} className="text-vento-primary" />
                                            </div>
                                            <span>{event.date}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-bold text-vento-text-muted">
                                            <div className="p-2 bg-vento-bg rounded-lg border border-vento-border">
                                                <MapPin size={14} className="text-vento-primary" />
                                            </div>
                                            <span className="line-clamp-1">{event.location}</span>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-vento-border flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-vento-text-muted">Ver Detalles</span>
                                        {event.mapUrl && (
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded uppercase tracking-[0.2em] border border-emerald-500/20">
                                                <LinkIcon size={10} /> Maps
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
