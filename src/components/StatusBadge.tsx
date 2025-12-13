import clsx from "clsx";

interface StatusBadgeProps {
    status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const styles: Record<string, string> = {
        processing: "bg-green-100 text-green-700 border-green-200",
        completed: "bg-slate-100 text-slate-600 border-slate-200",
        pending: "bg-amber-100 text-amber-700 border-amber-200",
        failed: "bg-red-100 text-red-700 border-red-200",
        cancelled: "bg-red-50 text-red-500 border-red-100",
        refunded: "bg-slate-200 text-slate-700 border-slate-300",
        "on-hold": "bg-orange-100 text-orange-700 border-orange-200",
        production: "bg-indigo-100 text-indigo-700 border-indigo-200",
        "Assigned to Vendor": "bg-indigo-100 text-indigo-700 border-indigo-200",
        "assigned to vendor": "bg-indigo-100 text-indigo-700 border-indigo-200",
    };

    return (
        <span className={clsx(
            "px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border",
            styles[status] || "bg-slate-100 text-slate-500 border-slate-200"
        )}>
            {status}
        </span>
    );
}
