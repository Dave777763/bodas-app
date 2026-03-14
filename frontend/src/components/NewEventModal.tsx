"use client";

import { useState, useRef } from "react";
import { X, Plus, Trash2, Upload, Music, MapPin, Calendar, Clock, Layout, Ticket, ChevronRight, ChevronLeft, Loader2, Check, Image as ImageIcon } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { VentoEventType, CountdownType, DressCode, ItineraryMoment } from "@/lib/types";

interface NewEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string;
    ownerEmail?: string;
}

export default function NewEventModal({ isOpen, onClose, userId, ownerEmail }: NewEventModalProps) {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [type, setType] = useState<VentoEventType>('HTML');
    const [name, setName] = useState("");
    const [date, setDate] = useState("");
    const [location, setLocation] = useState("");
    const [mapUrl, setMapUrl] = useState("");
    const [venuePageUrl, setVenuePageUrl] = useState("");
    const [musicUrl, setMusicUrl] = useState("");
    const [countdownType, setCountdownType] = useState<CountdownType>('Digital');
    const [dressCode, setDressCode] = useState<DressCode>('Formal');
    const [itinerary, setItinerary] = useState<ItineraryMoment[]>([{ time: "", title: "" }]);
    const [rsvpEnabled, setRsvpEnabled] = useState(true);
    const [requireCompanionName, setRequireCompanionName] = useState(false);
    const [qrCodeEnabled, setQrCodeEnabled] = useState(true);
    
    // Image State (Files)
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [countdownFile, setCountdownFile] = useState<File | null>(null);
    const [venueFile, setVenueFile] = useState<File | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);

    // Image Previews
    const [previews, setPreviews] = useState<{ [key: string]: string }>({});

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (key === 'cover') setCoverFile(file);
        if (key === 'countdown') setCountdownFile(file);
        if (key === 'venue') setVenueFile(file);
        if (key === 'photo') setPhotoFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviews(prev => ({ ...prev, [key]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const addItineraryMoment = () => {
        setItinerary([...itinerary, { time: "", title: "" }]);
    };

    const removeItineraryMoment = (index: number) => {
        setItinerary(itinerary.filter((_, i) => i !== index));
    };

    const updateItineraryMoment = (index: number, field: keyof ItineraryMoment, value: string) => {
        const newItinerary = [...itinerary];
        newItinerary[index][field] = value;
        setItinerary(newItinerary);
    };

    const uploadImage = async (file: File, path: string) => {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            let coverImageUrl = "";
            let countdownImageUrl = "";
            let venueImageUrl = "";
            let photoUrl = "";

            // Generic path base: events/temp_id/
            // Note: Since we don't have the doc ID yet, we'll use a timestamp or uuid
            const tempId = Date.now().toString();

            if (coverFile) coverImageUrl = await uploadImage(coverFile, `events/${tempId}/config/cover.jpg`);
            if (countdownFile) countdownImageUrl = await uploadImage(countdownFile, `events/${tempId}/config/countdown.jpg`);
            if (venueFile) venueImageUrl = await uploadImage(venueFile, `events/${tempId}/config/venue.jpg`);
            if (photoFile) photoUrl = await uploadImage(photoFile, `events/${tempId}/config/profile.jpg`);

            const eventData = {
                type,
                name,
                date,
                location,
                mapUrl,
                venuePageUrl,
                musicUrl,
                countdownType,
                dressCode,
                itinerary,
                rsvpEnabled,
                requireCompanionName,
                qrCodeEnabled,
                coverImageUrl,
                countdownImageUrl,
                venueImageUrl,
                photoUrl,
                userId,
                ownerEmail: ownerEmail?.toLowerCase().trim(),
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, "events"), eventData);
            onClose();
        } catch (error) {
            console.error("Error creating event:", error);
            alert("Error al crear el evento. Revisa la consola.");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const steps = [
        { title: "Tipo de Evento", icon: <Layout size={18} /> },
        { title: "Información Básica", icon: <Calendar size={18} /> },
        { title: "Multimedia", icon: <Music size={18} /> },
        { title: "Experiencia", icon: <Clock size={18} /> },
        { title: "Itinerario", icon: <Plus size={18} /> },
        { title: "Configuración", icon: <Check size={18} /> },
    ];

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-xl">
            <div className="bg-vento-card rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-500">
                {/* Header */}
                <div className="p-8 border-b border-vento-border flex justify-between items-center bg-vento-bg/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-vento-primary/10 rounded-2xl text-vento-primary">
                            {steps[step].icon}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black italic tracking-tighter">NUEVO <span className="text-vento-primary">EVENTO</span></h3>
                            <p className="text-[10px] font-bold text-vento-text-muted uppercase tracking-widest">{steps[step].title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-vento-text-muted hover:text-vento-primary p-2 rounded-full hover:bg-vento-bg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-vento-bg flex">
                    {steps.map((_, i) => (
                        <div key={i} className={`h-full flex-1 transition-all duration-500 ${i <= step ? 'bg-vento-primary' : 'bg-transparent'}`} />
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    {step === 0 && (
                        <div className="space-y-8">
                            <h4 className="text-center font-bold text-vento-text-muted uppercase tracking-[0.2em] text-xs">Selecciona el formato de tu invitación</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button
                                    onClick={() => { setType('HTML'); nextStep(); }}
                                    className={`p-8 rounded-[2rem] border-2 transition-all group text-left ${type === 'HTML' ? 'border-vento-primary bg-vento-primary/5' : 'border-vento-border hover:border-vento-primary/30'}`}
                                >
                                    <div className={`p-4 rounded-2xl mb-4 transition-colors ${type === 'HTML' ? 'bg-vento-primary text-white' : 'bg-vento-bg text-vento-primary'}`}>
                                        <Layout size={32} />
                                    </div>
                                    <h5 className="text-xl font-black mb-2">Personalizada</h5>
                                    <p className="text-sm text-vento-text-muted leading-relaxed uppercase font-bold text-[10px] tracking-wider">Diseño web dinámico (HTML). Ideal para bodas elegantes y completas.</p>
                                </button>
                                <button
                                    onClick={() => { setType('Ticket'); nextStep(); }}
                                    className={`p-8 rounded-[2rem] border-2 transition-all group text-left ${type === 'Ticket' ? 'border-vento-primary bg-vento-primary/5' : 'border-vento-border hover:border-vento-primary/30'}`}
                                >
                                    <div className={`p-4 rounded-2xl mb-4 transition-colors ${type === 'Ticket' ? 'bg-vento-primary text-white' : 'bg-vento-bg text-vento-primary'}`}>
                                        <Ticket size={32} />
                                    </div>
                                    <h5 className="text-xl font-black mb-2">Express</h5>
                                    <p className="text-sm text-vento-text-muted leading-relaxed uppercase font-bold text-[10px] tracking-wider">Formato estilo Ticket / Entrada. Rápido, moderno y minimalista.</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-vento-text-muted mb-3 ml-2">¿Cómo se llama el evento?</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej. Boda de Ana & Carlos"
                                    className="w-full px-6 py-4 rounded-2xl border border-vento-border bg-vento-bg text-vento-text outline-none focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary transition-all font-bold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-vento-text-muted mb-3 ml-2">¿Cuándo será?</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-6 py-4 rounded-2xl border border-vento-border bg-vento-bg text-vento-text outline-none focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary transition-all font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-vento-text-muted mb-3 ml-2">¿Dónde es?</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="Nombre del salón"
                                        className="w-full px-6 py-4 rounded-2xl border border-vento-border bg-vento-bg text-vento-text outline-none focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary transition-all font-bold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-vento-text-muted mb-3 ml-2">Enlace de Google Maps / Coordenadas</label>
                                <div className="relative">
                                    <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-vento-primary" size={20} />
                                    <input
                                        type="text"
                                        value={mapUrl}
                                        onChange={(e) => setMapUrl(e.target.value)}
                                        placeholder="Link de ubicación"
                                        className="w-full pl-14 pr-6 py-4 rounded-2xl border border-vento-border bg-vento-bg text-vento-text outline-none focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary transition-all font-bold"
                                    />
                                </div>
                            </div>
                            {type === 'HTML' && (
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-vento-text-muted mb-3 ml-2">Página del Salón (Link)</label>
                                    <input
                                        type="text"
                                        value={venuePageUrl}
                                        onChange={(e) => setVenuePageUrl(e.target.value)}
                                        placeholder="https://elsalon.com/..."
                                        className="w-full px-6 py-4 rounded-2xl border border-vento-border bg-vento-bg text-vento-text outline-none focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary transition-all font-bold"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <ImageUpload
                                    label="Foto Portada (jpg1)"
                                    preview={previews.cover}
                                    onChange={(e) => handleFileChange(e, 'cover')}
                                />
                                <ImageUpload
                                    label="Foto Cronómetro (jpg2)"
                                    preview={previews.countdown}
                                    onChange={(e) => handleFileChange(e, 'countdown')}
                                />
                                {type === 'HTML' && (
                                    <ImageUpload
                                        label="Foto Lugar (jpg3)"
                                        preview={previews.venue}
                                        onChange={(e) => handleFileChange(e, 'venue')}
                                    />
                                )}
                                <ImageUpload
                                    label="Foto Perfil / Evento"
                                    preview={previews.photo}
                                    onChange={(e) => handleFileChange(e, 'photo')}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-vento-text-muted mb-3 ml-2">Canción / Playlist (Spotify o YouTube Music)</label>
                                <div className="relative">
                                    <Music className="absolute left-6 top-1/2 -translate-y-1/2 text-vento-primary" size={20} />
                                    <input
                                        type="text"
                                        value={musicUrl}
                                        onChange={(e) => setMusicUrl(e.target.value)}
                                        placeholder="https://open.spotify.com/..."
                                        className="w-full pl-14 pr-6 py-4 rounded-2xl border border-vento-border bg-vento-bg text-vento-text outline-none focus:ring-4 focus:ring-vento-primary/10 focus:border-vento-primary transition-all font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-vento-text-muted mb-6 ml-2">Tipo de Cronómetro</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {['Digital', 'Analog', 'ProgressBar'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setCountdownType(t as CountdownType)}
                                            className={`p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${countdownType === t ? 'border-vento-primary bg-vento-primary text-white' : 'border-vento-border bg-vento-bg text-vento-text-muted hover:border-vento-primary/30'}`}
                                        >
                                            {t === 'Digital' ? 'Contador Digital' : t === 'Analog' ? 'Reloj Analógico' : 'Barra de Progreso'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-vento-text-muted mb-6 ml-2">Código de Vestimenta</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {['Etiqueta', 'Formal', 'Cóctel', 'Semiformal', 'Casual'].map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => setDressCode(d as DressCode)}
                                            className={`px-4 py-3 rounded-xl border-2 transition-all font-bold text-xs ${dressCode === d ? 'border-vento-primary bg-vento-primary text-white' : 'border-vento-border bg-vento-bg text-vento-text-muted hover:border-vento-primary/30'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-vento-text-muted ml-2">Momentos del Evento</h4>
                                <button
                                    onClick={addItineraryMoment}
                                    className="p-2 bg-vento-primary/10 text-vento-primary rounded-xl hover:bg-vento-primary hover:text-white transition-all"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                {itinerary.map((moment, index) => (
                                    <div key={index} className="flex gap-4 items-start bg-vento-bg/50 p-4 rounded-3xl border border-vento-border group transition-all hover:bg-vento-bg">
                                        <div className="w-32">
                                            <input
                                                type="time"
                                                value={moment.time}
                                                onChange={(e) => updateItineraryMoment(index, 'time', e.target.value)}
                                                className="w-full bg-transparent font-black text-vento-primary outline-none"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={moment.title}
                                                onChange={(e) => updateItineraryMoment(index, 'title', e.target.value)}
                                                placeholder="Ej. Ceremonia Civil"
                                                className="w-full bg-transparent font-bold outline-none placeholder:text-vento-text-muted/30"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeItineraryMoment(index)}
                                            className="text-vento-text-muted hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between p-6 bg-vento-bg/50 rounded-3xl border border-vento-border">
                                <div>
                                    <h5 className="font-black italic mb-1">Confirmación de Asistencia</h5>
                                    <p className="text-[10px] text-vento-text-muted uppercase font-bold tracking-wider">Habilitar botón RSVP para invitados</p>
                                </div>
                                <Toggle checked={rsvpEnabled} onChange={setRsvpEnabled} />
                            </div>

                            <div className={`transition-all duration-500 ${rsvpEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                                <div className="flex items-center justify-between p-6 bg-vento-bg/50 rounded-3xl border border-vento-border">
                                    <div>
                                        <h5 className="font-black italic mb-1">Nombre de Acompañante</h5>
                                        <p className="text-[10px] text-vento-text-muted uppercase font-bold tracking-wider">Preguntar nombre si tiene más de un pase</p>
                                    </div>
                                    <Toggle checked={requireCompanionName} onChange={setRequireCompanionName} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-6 bg-vento-bg/50 rounded-3xl border border-vento-border">
                                <div>
                                    <h5 className="font-black italic mb-1">Código QR de Acceso</h5>
                                    <p className="text-[10px] text-vento-text-muted uppercase font-bold tracking-wider">Generar QR para el Check-in</p>
                                </div>
                                <Toggle checked={qrCodeEnabled} onChange={setQrCodeEnabled} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-vento-border flex justify-between items-center bg-vento-bg/50">
                    <button
                        onClick={prevStep}
                        disabled={step === 0 || loading}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${step === 0 ? 'opacity-0' : 'hover:bg-vento-bg text-vento-text-muted'}`}
                    >
                        <ChevronLeft size={16} /> Anterior
                    </button>
                    {step === steps.length - 1 ? (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-3 px-10 py-4 bg-vento-primary text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-vento-primary/20 hover:scale-105 transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Guardando Evento</span>
                                </>
                            ) : (
                                <>
                                    <span>Finalizar y Crear</span>
                                    <Check size={18} />
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={nextStep}
                            disabled={loading}
                            className={`flex items-center gap-3 px-10 py-4 bg-vento-primary text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-vento-primary/20 hover:scale-105 transition-all ${step === 0 ? 'opacity-100' : 'opacity-100'}`}
                        >
                            <span>Siguiente Paso</span>
                            <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-components
const ImageUpload = ({ label, preview, onChange }: { label: string; preview?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-vento-text-muted ml-2">{label}</label>
            <div
                onClick={() => inputRef.current?.click()}
                className={`aspect-video rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${preview ? 'border-vento-primary' : 'border-vento-border hover:border-vento-primary/30'}`}
            >
                {preview ? (
                    <>
                        <img src={preview} alt="Upload Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Upload className="text-white" size={32} />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-4 bg-vento-bg rounded-2xl text-vento-text-muted group-hover:text-vento-primary transition-colors mb-2">
                            <ImageIcon size={32} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-vento-text-muted">Subir JPG</span>
                    </>
                )}
                <input ref={inputRef} type="file" accept="image/jpeg" onChange={onChange} className="hidden" />
            </div>
        </div>
    );
};

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
        onClick={() => onChange(!checked)}
        className={`w-14 h-8 rounded-full transition-all relative ${checked ? 'bg-vento-primary shadow-lg shadow-vento-primary/30' : 'bg-vento-border'}`}
    >
        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${checked ? 'left-7' : 'left-1'}`} />
    </button>
);
