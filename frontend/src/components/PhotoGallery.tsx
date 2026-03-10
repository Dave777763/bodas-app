"use client";

import { useState, useEffect } from "react";
import { storage } from "@/lib/firebase";
import { ref, listAll, getDownloadURL, getMetadata, FullMetadata } from "firebase/storage";
import { Loader2, Download, ExternalLink, Image as ImageIcon, User, Calendar } from "lucide-react";

interface PhotoItem {
    url: string;
    name: string;
    guestName?: string;
    uploadedAt?: string;
    fullPath: string;
}

interface PhotoGalleryProps {
    eventId: string;
}

export default function PhotoGallery({ eventId }: PhotoGalleryProps) {
    const [photos, setPhotos] = useState<PhotoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPhotos = async () => {
            setLoading(true);
            setError(null);
            try {
                const photosRef = ref(storage, `events/${eventId}/photos`);
                const res = await listAll(photosRef);

                const photoPromises = res.items.map(async (item) => {
                    const url = await getDownloadURL(item);
                    let metadata: FullMetadata | null = null;
                    try {
                        metadata = await getMetadata(item);
                    } catch (e) {
                        console.warn("Could not fetch metadata for", item.name);
                    }

                    return {
                        url,
                        name: item.name,
                        fullPath: item.fullPath,
                        guestName: metadata?.customMetadata?.guestName || "Invitado",
                        uploadedAt: metadata?.timeCreated || new Date().toISOString()
                    };
                });

                const photoData = await Promise.all(photoPromises);
                // Sort by date newest first
                photoData.sort((a, b) => new Date(b.uploadedAt!).getTime() - new Date(a.uploadedAt!).getTime());
                setPhotos(photoData);
            } catch (err: any) {
                console.error("Error fetching photos:", err);
                if (err.code === "storage/object-not-found") {
                    setPhotos([]);
                } else {
                    setError("No se pudieron cargar las fotos. Verifica los permisos de Storage.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPhotos();
    }, [eventId]);

    const downloadImage = async (url: string, fileName: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Error downloading image:", err);
            // Fallback: open in new tab
            window.open(url, "_blank");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-rose-500 mb-4" size={40} />
                <p className="text-gray-500 font-medium">Cargando galería de momentos...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center">
                <p className="text-red-600 font-medium">{error}</p>
            </div>
        );
    }

    if (photos.length === 0) {
        return (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-bold text-lg">Aún no hay fotos en este evento</p>
                <p className="text-gray-400 text-sm mt-1">Las fotos que suban los invitados aparecerán aquí.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {photos.map((photo) => (
                    <div
                        key={photo.name}
                        className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
                    >
                        {/* Image Container */}
                        <div className="aspect-square relative overflow-hidden bg-gray-100">
                            <img
                                src={photo.url}
                                alt={`Foto de ${photo.guestName}`}
                                className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                                loading="lazy"
                            />
                            {/* Overlay Controls */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                <button
                                    onClick={() => window.open(photo.url, "_blank")}
                                    className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30 hover:bg-white/40 transition"
                                    title="Ver tamaño completo"
                                >
                                    <ExternalLink size={20} />
                                </button>
                                <button
                                    onClick={() => downloadImage(photo.url, photo.name)}
                                    className="p-3 bg-white rounded-full text-rose-600 shadow-lg hover:bg-rose-50 transition"
                                    title="Descargar foto"
                                >
                                    <Download size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Info Footer */}
                        <div className="p-4 space-y-2">
                            <div className="flex items-center gap-2 text-gray-700">
                                <User size={14} className="text-rose-400" />
                                <span className="text-sm font-bold truncate">{photo.guestName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                                <Calendar size={12} />
                                <span className="text-[10px] font-medium">
                                    {new Date(photo.uploadedAt!).toLocaleDateString('es-MX', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-center text-xs text-gray-400 pt-4">
                Tip: Las fotos se optimizan automáticamente al subirse para que el dashboard sea rápido.
            </p>
        </div>
    );
}
