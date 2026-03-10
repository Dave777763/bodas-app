"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Calendar, MapPin, ChevronRight, PartyPopper, Link as LinkIcon } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, collectionGroup, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

const ADMIN_EMAIL = "marroquindavid635@gmail.com";

interface WeddingEvent {
    id: string;
    name: string;
    date: string;
    location: string;
    mapUrl?: string;
    createdAt?: unknown;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [events, setEvents] = useState<WeddingEvent[]>([]);
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
            })) as WeddingEvent[];

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
            alert("¡Evento guardado con éxito en Firebase!");
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
        <div className="p-8 min-h-screen bg-gray-50/50">
            <h1 className="text-3xl font-bold mb-6 font-serif text-gray-800">Panel del Anfitrión</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {/* Stats Cards */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Confirmados</h3>
                    <p className="text-4xl font-bold text-rose-600 mt-2">{globalStats.confirmados}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Pendientes</h3>
                    <p className="text-4xl font-bold text-amber-500 mt-2">{globalStats.pendientes}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Eventos</h3>
                    <p className="text-4xl font-bold text-blue-600 mt-2">{events.length}</p>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold font-serif text-gray-800">Mis Eventos</h2>
                    {events.length > 0 && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition flex items-center gap-2 shadow-md"
                        >
                            <Plus size={20} /> Crear Nuevo
                        </button>
                    )}
                </div>

                {fetching ? (
                    <div className="flex justify-center p-20">
                        <Loader2 className="animate-spin text-rose-500" size={40} />
                    </div>
                ) : events.length === 0 ? (
                    <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center">
                        <p className="text-gray-500 mb-4 text-lg">No tienes eventos creados aún.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-white text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition font-medium"
                        >
                            Comenzar ahora
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {events.map((event) => (
                            <div
                                key={event.id}
                                onClick={() => router.push(`/dashboard/${event.id}`)}
                                className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                                        <PartyPopper size={24} />
                                    </div>
                                    <ChevronRight className="text-gray-300 group-hover:text-rose-500 transition" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{event.name}</h3>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Calendar size={14} />
                                        <span>{event.date}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <MapPin size={14} />
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">Nuevo Evento</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-1">Nombre del Evento</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Ej. Boda de Ana y Carlos"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-1">Ubicación (Nombre del Lugar)</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="Ej. Salón Las Flores"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-1">Link de Google Maps (Opcional)</label>
                                <input
                                    type="url"
                                    name="mapUrl"
                                    value={formData.mapUrl}
                                    onChange={handleChange}
                                    placeholder="Ej. https://maps.app.goo.gl/..."
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                                    disabled={loading}
                                />
                                <p className="text-xs text-gray-500 mt-1">Si lo dejas vacío, buscaremos por el nombre del lugar.</p>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition font-medium shadow-lg shadow-rose-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        "Guardar Evento"
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
