"use client";

import { useState } from "react";
import { storage, db } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { Upload, X, Loader2, CheckCircle2, Image as ImageIcon } from "lucide-react";

interface EventImageUploadProps {
    eventId: string;
    field: string;
    label: string;
    currentImageUrl?: string;
    aspectRatio?: "video" | "square" | "portrait";
}

export default function EventImageUpload({ eventId, field, label, currentImageUrl, aspectRatio = "video" }: EventImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("Selecciona un archivo de imagen válido.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("La imagen es demasiado grande. Máximo 5MB.");
            return;
        }

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            const fileName = `${field}_${Date.now()}.jpg`;
            const storageRef = ref(storage, `events/${eventId}/config/${fileName}`);
            
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setProgress(Math.round(p));
                },
                (err) => {
                    console.error("Error upload:", err);
                    setError("Error al subir la imagen.");
                    setUploading(false);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    
                    const eventRef = doc(db, "events", eventId);
                    await updateDoc(eventRef, {
                        [field]: downloadURL
                    });

                    setPreviewUrl(downloadURL);
                    setUploading(false);
                }
            );
        } catch (err) {
            console.error("Error processing upload:", err);
            setError("Error inesperado al procesar la imagen.");
            setUploading(false);
        }
    };

    const ratioClass = {
        video: "aspect-video",
        square: "aspect-square",
        portrait: "aspect-[3/4]"
    }[aspectRatio];

    return (
        <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-vento-text-muted ml-1">{label}</label>
            <div className="relative group">
                <div 
                    className={`w-full ${ratioClass} rounded-[1.5rem] border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-vento-bg/30 ${
                        previewUrl ? 'border-vento-primary/30' : 'border-vento-border hover:border-vento-primary/50'
                    }`}
                >
                    {previewUrl ? (
                        <>
                            <img 
                                src={previewUrl} 
                                alt={label} 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <label className="cursor-pointer bg-white text-vento-primary px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-transform">
                                    Cambiar
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                                </label>
                            </div>
                        </>
                    ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                            <div className="p-4 rounded-full bg-vento-card shadow-sm mb-3">
                                <Upload className="text-vento-primary" size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-vento-text-muted">Subir imagen</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                        </label>
                    )}

                    {uploading && (
                        <div className="absolute inset-0 bg-vento-card/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                            <Loader2 className="animate-spin text-vento-primary mb-3" size={24} />
                            <div className="text-vento-primary font-black text-[10px]">{progress}%</div>
                        </div>
                    )}
                </div>
            </div>

            {error && <p className="text-red-500 text-[10px] font-bold italic">{error}</p>}
        </div>
    );
}
