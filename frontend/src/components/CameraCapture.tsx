"use client";

import { useState, useRef, useEffect } from "react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Camera, RefreshCw, CheckCircle2, Loader2, UploadCloud, X, CameraIcon } from "lucide-react";

interface CameraCaptureProps {
    eventId: string;
    guestId: string;
    guestName: string;
    theme: {
        colors: {
            primary: string;
            primaryLight: string;
            accent: string;
            text: string;
        };
    };
}

export default function CameraCapture({ eventId, guestId, guestName, theme }: CameraCaptureProps) {
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Abrir cámara
    const startCamera = async () => {
        setIsCameraOpen(true);
        setIsSuccess(false);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }, // Cámara trasera por defecto
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error al acceder a la cámara:", err);
            setError("No se pudo acceder a la cámara. Por favor verifica los permisos.");
            setIsCameraOpen(false);
        }
    };

    // Cerrar cámara
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    // Capturar foto
    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            // Ajustar canvas al tamaño del video (manteniendo aspecto)
            // Optimizamos: Máximo 1280px para ahorrar espacio
            const maxWidth = 1200;
            let width = video.videoWidth;
            let height = video.videoHeight;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            if (context) {
                context.drawImage(video, 0, 0, width, height);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.8); // 80% calidad para optimizar
                setPreviewUrl(dataUrl);
                stopCamera();
            }
        }
    };

    // Subir foto a Firebase
    const uploadPhoto = async () => {
        if (!previewUrl) return;

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            // Convertir Data URL a Blob
            const response = await fetch(previewUrl);
            const blob = await response.blob();

            // Nombre único para la foto
            const fileName = `${Date.now()}_${guestId}.jpg`;
            const storageRef = ref(storage, `events/${eventId}/photos/${fileName}`);

            const uploadTask = uploadBytesResumable(storageRef, blob, {
                contentType: "image/jpeg",
                customMetadata: {
                    guestName: guestName,
                    guestId: guestId,
                    uploadedAt: new Date().toISOString()
                }
            });

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setProgress(Math.round(p));
                },
                (err) => {
                    console.error("Error en la subida:", err);
                    setError("Hubo un error al subir la foto.");
                    setUploading(false);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log("Archivo disponible en:", downloadURL);
                    setUploading(false);
                    setIsSuccess(true);
                    setPreviewUrl(null);
                }
            );
        } catch (err) {
            console.error("Error al procesar la subida:", err);
            setError("Error al procesar la imagen.");
            setUploading(false);
        }
    };

    return (
        <div className="w-full mt-6 space-y-4 animate-fadeIn">
            <h3 className="text-xl font-bold text-center mb-2" style={{ color: theme.colors.text }}>
                📸 Cámara del Evento
            </h3>

            {!isCameraOpen && !previewUrl && !isSuccess && (
                <button
                    onClick={startCamera}
                    className="w-full py-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition group"
                    style={{
                        backgroundColor: theme.colors.primaryLight + '20',
                        borderColor: theme.colors.primaryLight
                    }}
                >
                    <div className="p-4 rounded-full bg-white shadow-sm group-hover:scale-110 transition duration-300">
                        <Camera size={28} style={{ color: theme.colors.primary }} />
                    </div>
                    <span className="font-bold text-sm" style={{ color: theme.colors.primary }}>Tomar una foto y compartir</span>
                    <span className="text-[10px] text-gray-400">¡Comparte tus mejores momentos con todos!</span>
                </button>
            )}

            {isCameraOpen && (
                <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl aspect-[4/3]">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6">
                        <button
                            onClick={stopCamera}
                            className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30"
                        >
                            <X size={24} />
                        </button>
                        <button
                            onClick={takePhoto}
                            className="w-16 h-16 rounded-full bg-white border-4 border-white/50 flex items-center justify-center active:scale-90 transition shadow-lg"
                        >
                            <div className="w-12 h-12 rounded-full border-2 border-black/5 flex items-center justify-center">
                                <CameraIcon size={28} className="text-black" />
                            </div>
                        </button>
                        <button
                            onClick={() => {
                                // Toggle camera toggle logic if needed, simplify for now
                            }}
                            className="p-3 rounded-full bg-transparent text-white/50 opacity-0 pointer-events-none"
                        >
                            <RefreshCw size={24} />
                        </button>
                    </div>
                </div>
            )}

            {previewUrl && (
                <div className="space-y-4">
                    <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-[4/3]">
                        <img
                            src={previewUrl}
                            alt="Vista previa"
                            className="w-full h-full object-cover"
                        />
                        {uploading && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                                <Loader2 className="animate-spin mb-4" size={48} />
                                <div className="text-xl font-bold mb-2">{progress}%</div>
                                <p className="text-sm opacity-80">Subiendo tu momento...</p>
                            </div>
                        )}
                    </div>

                    {!uploading && (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="py-3 border-2 border-gray-100 text-gray-400 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                            >
                                <X size={18} />
                                Descartar
                            </button>
                            <button
                                onClick={uploadPhoto}
                                className="py-3 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                                style={{ backgroundColor: theme.colors.primary }}
                            >
                                <UploadCloud size={18} />
                                Compartir
                            </button>
                        </div>
                    )}
                </div>
            )}

            {isSuccess && (
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center space-y-3 animate-in fade-in zoom-in duration-300">
                    <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-500">
                        <CheckCircle2 size={32} />
                    </div>
                    <h4 className="font-bold text-emerald-800">¡Foto compartida!</h4>
                    <p className="text-emerald-600 text-sm">Tu foto ha sido enviada con éxito. ¡Gracias por compartir!</p>
                    <button
                        onClick={() => setIsSuccess(false)}
                        className="text-emerald-500 text-xs font-bold underline"
                    >
                        Subir otra foto
                    </button>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-red-600 text-sm font-medium">
                    {error}
                </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}

