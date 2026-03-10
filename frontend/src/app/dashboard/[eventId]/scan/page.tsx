"use client";

import { useState, useEffect, use } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ScanPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const router = useRouter();
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [guestName, setGuestName] = useState("");

    const handleScan = async (text: string) => {
        if (!text || status === "loading" || status === "success") return;

        try {
            // Parse QR Data
            // Expected format: JSON string { eventId, guestId } or just guestId
            let guestId = text;
            try {
                const data = JSON.parse(text);
                if (data.eventId && data.eventId !== eventId) {
                    setStatus("error");
                    setMessage("Este pase es de otro evento.");
                    return;
                }
                guestId = data.guestId || text;
            } catch (e) {
                // Not JSON, assume it's just the ID
                console.log("QR is not JSON, using raw text as ID", e);
            }

            setStatus("loading");
            setMessage("Verificando...");

            const guestRef = doc(db, "events", eventId, "guests", guestId);
            const guestSnap = await getDoc(guestRef);

            if (!guestSnap.exists()) {
                setStatus("error");
                setMessage("Invitado no encontrado.");
                return;
            }

            const guestData = guestSnap.data();
            setGuestName(guestData.name);

            if (guestData.attended) {
                setStatus("error");
                setMessage(`¡${guestData.name} ya hizo check-in antes!`);
                return;
            }

            // Mark as attended
            await updateDoc(guestRef, {
                attended: true,
                attendedAt: new Date()
            });

            setStatus("success");
            setMessage(`¡Bienvenido/a ${guestData.name}!`);

            // Reset after 3 seconds to scan next
            setTimeout(() => {
                setStatus("idle");
                setScanResult(null);
                setMessage("");
                setGuestName("");
            }, 3000);

        } catch (error) {
            console.error("Scan error:", error);
            setStatus("error");
            setMessage("Error al procesar el código.");
        }
    };

    return (
        <div className="min-h-screen bg-vento-bg text-vento-text flex flex-col transition-colors duration-500">
            {/* Header */}
            <div className="p-6 flex items-center justify-between bg-vento-card border-b border-vento-border shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 bg-vento-bg rounded-xl hover:bg-vento-primary hover:text-white transition-all shadow-sm group"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-black font-serif italic tracking-tight text-xl">VENTO <span className="text-vento-primary not-italic text-sm ml-1">SCANNER</span></h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-vento-text-muted">Control de Acceso</p>
                    </div>
                </div>
            </div>

            {/* Scanner Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="w-full max-w-sm aspect-square bg-vento-card rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-vento-border group">
                    {/* Scanner Frame Decoration */}
                    <div className="absolute inset-0 border-[16px] border-vento-bg/50 pointer-events-none z-10" />

                    {status === "idle" || status === "loading" ? (
                        <Scanner
                            onScan={(result) => result[0] && handleScan(result[0].rawValue)}
                            components={{
                                onOff: false,
                                torch: true,
                                zoom: false,
                                finder: true,
                            }}
                            styles={{
                                container: { width: "100%", height: "100%" }
                            }}
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-vento-card z-20 p-8 text-center animate-in fade-in zoom-in duration-500">
                            {status === "success" ? (
                                <>
                                    <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/40 animate-bounce">
                                        <CheckCircle2 size={48} className="text-white" />
                                    </div>
                                    <h2 className="text-3xl font-black text-emerald-500 mb-2 italic tracking-tighter">¡BIENVENIDO!</h2>
                                    <p className="text-vento-text font-bold text-xl mb-1">{guestName}</p>
                                    <p className="text-vento-text-muted text-xs font-black uppercase tracking-widest mt-8">Escaneando siguiente...</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-24 h-24 bg-vento-primary rounded-full flex items-center justify-center mb-6 shadow-xl shadow-vento-primary/40 animate-pulse">
                                        <XCircle size={48} className="text-white" />
                                    </div>
                                    <h2 className="text-3xl font-black text-vento-primary mb-2 italic tracking-tighter">¡ALERTA!</h2>
                                    <p className="text-vento-text font-bold text-lg">{message}</p>
                                    <button
                                        onClick={() => setStatus("idle")}
                                        className="mt-10 px-8 py-3 bg-vento-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition shadow-lg shadow-vento-primary/20"
                                    >
                                        Intentar de nuevo
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Loading Overlay */}
                    {status === "loading" && (
                        <div className="absolute inset-0 bg-vento-bg/60 flex flex-col items-center justify-center z-30 backdrop-blur-md">
                            <Loader2 className="animate-spin text-vento-primary mb-4" size={48} />
                            <p className="font-black text-xs uppercase tracking-[0.2em] text-vento-primary">{message}</p>
                        </div>
                    )}
                </div>

                <div className="text-center mt-10 space-y-2">
                    <p className="text-vento-text font-bold text-sm">
                        Coloca el código QR dentro del recuadro
                    </p>
                    <p className="text-vento-text-muted text-[10px] font-black uppercase tracking-widest">
                        El check-in se registrará automáticamente
                    </p>
                </div>
            </div>
        </div>
    );
}
