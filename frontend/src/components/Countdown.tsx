"use client";

import { useEffect, useState } from 'react';
import { CountdownType } from '@/lib/types';

interface CountdownProps {
    targetDate: string;
    type?: CountdownType;
    theme?: {
        primary: string;
        primaryLight: string;
        text: string;
    };
}

interface TimeRemaining {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
}

const TimeUnit = ({ value, label, theme }: { value: number; label: string; theme?: CountdownProps['theme'] }) => (
    <div
        className="flex flex-col items-center p-4 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105"
        style={{
            backgroundColor: theme?.primaryLight || '#ffe4e6',
            borderWidth: '2px',
            borderColor: theme?.primary || '#be123c',
            borderStyle: 'solid',
        }}
    >
        <div
            className="text-4xl md:text-5xl font-bold tabular-nums leading-none mb-2"
            style={{ color: theme?.primary || '#be123c' }}
        >
            {value.toString().padStart(2, '0')}
        </div>
        <div
            className="text-xs md:text-sm font-medium uppercase tracking-wider"
            style={{ color: theme?.text || '#6b7280' }}
        >
            {label}
        </div>
    </div>
);

const AnalogClock = ({ time, theme }: { time: TimeRemaining; theme?: CountdownProps['theme'] }) => {
    return (
        <div className="flex justify-center flex-wrap gap-8">
            {[
                { val: time.days, label: 'Días', max: 365 },
                { val: time.hours, label: 'Horas', max: 24 },
                { val: time.minutes, label: 'Min', max: 60 },
                { val: time.seconds, label: 'Seg', max: 60 }
            ].map((item, i) => (
                <div key={i} className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle
                            cx="50%"
                            cy="50%"
                            r="45%"
                            fill="transparent"
                            stroke={theme?.primaryLight || '#ffe4e6'}
                            strokeWidth="8"
                        />
                        <circle
                            cx="50%"
                            cy="50%"
                            r="45%"
                            fill="transparent"
                            stroke={theme?.primary || '#be123c'}
                            strokeWidth="8"
                            strokeDasharray="283"
                            strokeDashoffset={283 - (283 * item.val) / item.max}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-linear"
                        />
                    </svg>
                    <div className="text-center z-10">
                        <div className="text-2xl md:text-3xl font-black italic" style={{ color: theme?.primary || '#be123c' }}>
                            {item.val.toString().padStart(2, '0')}
                        </div>
                        <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest" style={{ color: theme?.text || '#6b7280' }}>
                            {item.label}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const ProgressBar = ({ time, theme }: { time: TimeRemaining; theme?: CountdownProps['theme'] }) => {
    const totalSecondsInMonth = 30 * 24 * 60 * 60; // Approximate
    const progress = Math.min(100, Math.max(0, (1 - time.totalSeconds / totalSecondsInMonth) * 100));

    return (
        <div className="w-full space-y-4">
            <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: theme?.primary || '#be123c' }}>Faltan {time.days} días</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: theme?.text || '#6b7280' }}>Casi llegamos</span>
            </div>
            <div className="h-4 w-full bg-vento-bg rounded-full overflow-hidden border border-vento-border">
                <div
                    className="h-full transition-all duration-1000 ease-out rounded-full"
                    style={{
                        width: `${progress}%`,
                        backgroundColor: theme?.primary || '#be123c',
                        boxShadow: `0 0 15px ${theme?.primary}40`
                    }}
                />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
                {['Días', 'Horas', 'Min', 'Seg'].map((label, i) => (
                    <div key={label} className="text-[8px] font-black uppercase tracking-widest opacity-40">
                        {label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function Countdown({ targetDate, type = 'Digital', theme }: CountdownProps) {
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0
    });

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            const difference = target - now;

            if (difference > 0) {
                setTimeRemaining({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((difference % (1000 * 60)) / 1000),
                    totalSeconds: Math.floor(difference / 1000)
                });
            }
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    return (
        <div className="w-full">
            <div className="text-center mb-10">
                <p
                    className="text-[10px] font-black uppercase tracking-[0.3em] italic"
                    style={{ color: theme?.text || '#6b7280' }}
                >
                    La cuenta regresiva ha comenzado
                </p>
            </div>
            
            {type === 'Digital' && (
                <div className="grid grid-cols-4 gap-3 md:gap-4">
                    <TimeUnit value={timeRemaining.days} label="Días" theme={theme} />
                    <TimeUnit value={timeRemaining.hours} label="Horas" theme={theme} />
                    <TimeUnit value={timeRemaining.minutes} label="Min" theme={theme} />
                    <TimeUnit value={timeRemaining.seconds} label="Seg" theme={theme} />
                </div>
            )}

            {type === 'Analog' && <AnalogClock time={timeRemaining} theme={theme} />}
            
            {type === 'ProgressBar' && <ProgressBar time={timeRemaining} theme={theme} />}
        </div>
    );
}
