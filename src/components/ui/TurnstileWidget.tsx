'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

declare global {
    interface Window {
        turnstile?: {
            render: (container: HTMLElement, options: any) => string;
            reset: (widgetId: string) => void;
        };
    }
}

export interface TurnstileRef {
    reset: () => void;
}

interface TurnstileProps {
    onVerify: (token: string) => void;
}

const TurnstileWidget = forwardRef<TurnstileRef, TurnstileProps>(({ onVerify }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string>();

    useImperativeHandle(ref, () => ({
        reset: () => {
            if (window.turnstile && widgetIdRef.current) {
                window.turnstile.reset(widgetIdRef.current);
                onVerify('');
            }
        }
    }));

    useEffect(() => {
        const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

        if (!siteKey) {
            console.error('❌ Turnstile Site Key is missing!');
            return;
        }

        const renderWidget = () => {
            // Only render if container is empty
            if (window.turnstile && containerRef.current && containerRef.current.childElementCount === 0) {
                try {
                    widgetIdRef.current = window.turnstile.render(containerRef.current, {
                        sitekey: siteKey,
                        callback: (token: string) => {
                            onVerify(token);
                        },
                        'expired-callback': () => {
                            onVerify('');
                        },
                        'error-callback': () => {
                            onVerify('');
                        }
                    });
                } catch (error) {
                    console.error('❌ Turnstile render error:', error);
                }
            }
        };

        if (!window.turnstile) {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                renderWidget();
            };
            document.head.appendChild(script);
        } else {
            renderWidget();
        }
    }, [onVerify]);

    return (
        <div
            ref={containerRef}
            className="my-4 min-h-[65px] min-w-[300px]"
        />
    );
});

TurnstileWidget.displayName = 'TurnstileWidget';

export default TurnstileWidget;
