export type VentoEventType = 'HTML' | 'Ticket';

export type CountdownType = 'Digital' | 'Analog' | 'ProgressBar';

export type DressCode = 'Etiqueta' | 'Formal' | 'Cóctel' | 'Semiformal' | 'Casual';

export interface ItineraryMoment {
    time: string;
    title: string;
}

export interface VentoEvent {
    id: string;
    type: VentoEventType;
    name: string;
    date: string;
    location: string;
    mapUrl?: string; // Google Maps/Coordinates
    venuePageUrl?: string; // Link pagina de salon
    musicUrl?: string; // Spotify/YT Music
    countdownType: CountdownType;
    coverImageUrl?: string; // jpg1
    countdownImageUrl?: string; // jpg2
    venueImageUrl?: string; // jpg3
    itinerary: ItineraryMoment[];
    dressCode: DressCode;
    theme?: string;
    rsvpEnabled: boolean;
    requireCompanionName?: boolean; // Solo aplica en mas de un pase
    qrCodeEnabled: boolean;
    photoUrl?: string; // "Foto" field in requirements
    userId: string;
    ownerEmail: string;
    createdAt?: any;
}
