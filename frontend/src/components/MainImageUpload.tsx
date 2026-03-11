"use client";

import { useState } from "react";
import { storage, db } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { Upload, X, Loader2, CheckCircle2, Image as ImageIcon } from "lucide-react";

interface MainImageUploadProps {
    eventId: string;
    currentImageUrl?: string;
}

export default function MainImageUpload({ eventId, currentImageUrl }: MainImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith("image/")) {
            setError("Por favor selecciona un archivo de imagen válido.");
            return;
        }

        // Validar tamaño (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("La imagen es demasiado grande. Máximo 5MB.");
            return;
        }

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            const fileName = `main_image_${Date.now()}.jpg`;
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
                    
                    // Actualizar Firestore
                    const eventRef = doc(db, "events", eventId);
                    await updateDoc(eventRef, {
                        imageUrl: downloadURL
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

    return (
        <div className="space-y-4">
            <div className="relative group">
                <div 
                    className={`w-full aspect-video rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-vento-bg/30 ${
                        previewUrl ? 'border-vento-primary/30' : 'border-vento-border hover:border-vento-primary/50'
                    }`}
                >
                    {previewUrl ? (
                        <>
                            <img 
                                src={previewUrl} 
                                alt="Imagen de invitación" 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <label className="cursor-pointer bg-white text-vento-primary px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-transform">
                                    Cambiar Imagen
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                                </label>
                            </div>
                        </>
                    ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                            <div className="p-4 rounded-full bg-vento-card shadow-sm mb-3">
                                <Upload className="text-vento-primary" size={24} />
                            </div>
                            <span className="text-xs font-bold text-vento-text-muted">Subir imagen principal</span>
                            <span className="text-[10px] text-vento-text-muted/60 mt-1">Recomendado: 1200 x 675px</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                        </label>
                    )}

                    {uploading && (
                        <div className="absolute inset-0 bg-vento-card/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                            <Loader2 className="animate-spin text-vento-primary mb-3" size={32} />
                            <div className="text-vento-primary font-black text-xs">{progress}%</div>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 italic">
                    {error}
                </div>
            )}
            
            {!uploading && previewUrl && (
                <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold italic animate-in fade-in slide-in-from-left-2">
                    <CheckCircle2 size={14} /> Imagen guardada correctamente
                </div>
            )}
        </div>
    );
}
