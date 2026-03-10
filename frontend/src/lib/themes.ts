// Sistema de Temas para Invitaciones
export interface Theme {
    id: string;
    name: string;
    description: string;
    colors: {
        primary: string;
        primaryLight: string;
        primaryDark: string;
        accent: string;
        background: string;
        text: string;
        textLight: string;
    };
    fonts: {
        heading: string;
        body: string;
        accent: string;
    };
    style: 'romantic' | 'elegant' | 'modern' | 'rustic' | 'tropical' | 'minimalist';
}

export const themes: Theme[] = [
    {
        id: 'romantic-rose',
        name: 'Romance Rosa',
        description: 'Delicado y romántico con tonos rosados',
        colors: {
            primary: '#be123c',
            primaryLight: '#ffe4e6',
            primaryDark: '#881337',
            accent: '#f43f5e',
            background: '#fffcfc',
            text: '#1f2937',
            textLight: '#6b7280',
        },
        fonts: {
            heading: 'Playfair Display',
            body: 'Inter',
            accent: 'Great Vibes',
        },
        style: 'romantic',
    },
    {
        id: 'elegant-navy',
        name: 'Elegancia Azul',
        description: 'Sofisticado con azul marino y dorado',
        colors: {
            primary: '#1e3a8a',
            primaryLight: '#dbeafe',
            primaryDark: '#1e293b',
            accent: '#f59e0b',
            background: '#f8fafc',
            text: '#0f172a',
            textLight: '#64748b',
        },
        fonts: {
            heading: 'Cormorant Garamond',
            body: 'Montserrat',
            accent: 'Italiana',
        },
        style: 'elegant',
    },
    {
        id: 'modern-emerald',
        name: 'Moderno Esmeralda',
        description: 'Fresco y contemporáneo con verde esmeralda',
        colors: {
            primary: '#047857',
            primaryLight: '#d1fae5',
            primaryDark: '#065f46',
            accent: '#14b8a6',
            background: '#fafafa',
            text: '#111827',
            textLight: '#6b7280',
        },
        fonts: {
            heading: 'Poppins',
            body: 'Inter',
            accent: 'Dancing Script',
        },
        style: 'modern',
    },
    {
        id: 'rustic-terracotta',
        name: 'Rústico Terracota',
        description: 'Cálido y acogedor con tonos tierra',
        colors: {
            primary: '#c2410c',
            primaryLight: '#fed7aa',
            primaryDark: '#7c2d12',
            accent: '#ea580c',
            background: '#fffbf5',
            text: '#292524',
            textLight: '#78716c',
        },
        fonts: {
            heading: 'Libre Baskerville',
            body: 'Lato',
            accent: 'Pacifico',
        },
        style: 'rustic',
    },
    {
        id: 'tropical-coral',
        name: 'Tropical Coral',
        description: 'Vibrante y alegre con colores tropicales',
        colors: {
            primary: '#db2777',
            primaryLight: '#fce7f3',
            primaryDark: '#9f1239',
            accent: '#f97316',
            background: '#fffef9',
            text: '#18181b',
            textLight: '#71717a',
        },
        fonts: {
            heading: 'Lobster',
            body: 'Nunito',
            accent: 'Satisfy',
        },
        style: 'tropical',
    },
    {
        id: 'minimalist-slate',
        name: 'Minimalista Pizarra',
        description: 'Limpio y moderno con tonos neutros',
        colors: {
            primary: '#475569',
            primaryLight: '#f1f5f9',
            primaryDark: '#1e293b',
            accent: '#0ea5e9',
            background: '#ffffff',
            text: '#0f172a',
            textLight: '#64748b',
        },
        fonts: {
            heading: 'Raleway',
            body: 'Inter',
            accent: 'Allura',
        },
        style: 'minimalist',
    },
    {
        id: 'corporate-midnight',
        name: 'Corporativo Midnight',
        description: 'Profesional y elegante para eventos de negocios',
        colors: {
            primary: '#0f172a',
            primaryLight: '#e2e8f0',
            primaryDark: '#020617',
            accent: '#3b82f6',
            background: '#ffffff',
            text: '#1e293b',
            textLight: '#64748b',
        },
        fonts: {
            heading: 'Inter',
            body: 'Inter',
            accent: 'Inter',
        },
        style: 'minimalist',
    },
    {
        id: 'neon-party',
        name: 'Neon Party',
        description: 'Vibrante y eléctrico para celebraciones nocturnas',
        colors: {
            primary: '#a855f7',
            primaryLight: '#f3e8ff',
            primaryDark: '#6b21a8',
            accent: '#22c55e',
            background: '#0f172a',
            text: '#f8fafc',
            textLight: '#94a3b8',
        },
        fonts: {
            heading: 'Outfit',
            body: 'Inter',
            accent: 'Outfit',
        },
        style: 'modern',
    },
    {
        id: 'kids-celebration',
        name: 'Kids Celebration',
        description: 'Divertido y colorido para cumpleaños infantiles',
        colors: {
            primary: '#0ea5e9',
            primaryLight: '#e0f2fe',
            primaryDark: '#0369a1',
            accent: '#f43f5e',
            background: '#fffef9',
            text: '#0f172a',
            textLight: '#475569',
        },
        fonts: {
            heading: 'Nunito',
            body: 'Inter',
            accent: 'Pacifico',
        },
        style: 'modern',
    },
];

export const getTheme = (themeId: string): Theme => {
    return themes.find(t => t.id === themeId) || themes[0];
};
