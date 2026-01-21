'use client';

import { useEffect, useRef } from 'react';

declare global {
    interface Window {
        turnstile?: {
            render: (container: HTMLElement, options: {
                sitekey: string;
                callback: (token: string) => void;
            }) => void;
        };
        __turnstileRendered?: boolean;
    }
}

interface TurnstileProps {
    onVerify: (token: string) => void;
}

export default function TurnstileWidget({ onVerify }: TurnstileProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Global flag to prevent duplicate renders across all instances
        if (window.__turnstileRendered) {
            console.log('⏭️ Turnstile already rendered globally, skipping');
            return;
        }

        // Get site key
        const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

        if (!siteKey) {
            console.error('❌ Turnstile Site Key is missing!');
            return;
        }

        console.log('✅ Turnstile Site Key found:', siteKey.substring(0, 10) + '...');

        // Render widget
        const renderWidget = () => {
            if (window.turnstile && containerRef.current && !window.__turnstileRendered) {
                console.log('🎨 Rendering Turnstile widget...');
                try {
                    window.turnstile.render(containerRef.current, {
                        sitekey: siteKey,
                        callback: (token: string) => {
                            console.log('✅ Turnstile verification successful!');
                            onVerify(token);
                        },
                    });
                    window.__turnstileRendered = true; // Mark as rendered globally
                    console.log('✓ Widget rendered successfully');
                } catch (error) {
                    console.error('❌ Render error:', error);
                }
            }
        };

        // Load script
        if (!window.turnstile) {
            console.log('📥 Loading Turnstile script...');
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                console.log('✅ Turnstile script loaded');
                renderWidget();
            };
            document.body.appendChild(script);
        } else {
            console.log('✓ Script already loaded');
            renderWidget();
        }
    }, [onVerify]);

    return (
        <div
            ref={containerRef}
            className="my-4"
            style={{ minWidth: '300px', minHeight: '65px' }}
        />
    );
}
