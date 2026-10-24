import { useId } from "react";

/** M7 monogram for the branded MarcFlow-based application. */
export function M7Logo({ className = "h-10 w-10" }: { className?: string }) {
    const id = useId();
    return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
            <defs>
                <linearGradient id={`${id}-g`} x1="4" y1="6" x2="44" y2="42" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#3BE38C" />
                    <stop offset="1" stopColor="#0E9F57" />
                </linearGradient>
            </defs>
            <rect width="48" height="48" rx="14" fill={`url(#${id}-g)`} />
            <text x="24" y="33" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="23" fontWeight="800" fill="white">M7</text>
        </svg>
    );
}
