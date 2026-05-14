import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    children: React.ReactNode;
}

export function Button({
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled,
    children,
    ...props
}: ButtonProps) {
    const baseStyles =
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] min-h-[44px]';

    const variants = {
        primary:
            'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/20 focus-visible:ring-blue-600',
        secondary:
            'bg-gray-100 text-gray-900 hover:bg-gray-200 hover:shadow-md focus-visible:ring-gray-400',
        outline:
            'border-2 border-gray-300 bg-transparent hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm focus-visible:ring-gray-400',
        ghost: 'hover:bg-gray-100 focus-visible:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md hover:shadow-red-500/20 focus-visible:ring-red-600',
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-2.5 text-sm',
        lg: 'px-8 py-3 text-base',
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            disabled={disabled || isLoading}
            aria-busy={isLoading}
            {...props}
        >
            {isLoading ? (
                <>
                    <span className="sr-only">Loading...</span>
                    <svg
                        className="mr-2 h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    {children}
                </>
            ) : (
                children
            )}
        </button>
    );
}
