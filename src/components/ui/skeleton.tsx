import clsx from "clsx";
import { twMerge } from "tailwind-merge";

// Safe utility for combining tailwind classes if you don't have a global 'cn'
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-slate-200", className)}
            {...props}
        />
    );
}
