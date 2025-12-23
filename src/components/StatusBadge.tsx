import clsx from "clsx";

interface StatusBadgeProps {
    status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const styles: Record<string, string> = {
        // WooCommerce Statuses
        processing: "bg-green-100 text-green-700 border-green-200",
        completed: "bg-slate-100 text-slate-600 border-slate-200",
        pending: "bg-amber-100 text-amber-700 border-amber-200",
        failed: "bg-red-100 text-red-700 border-red-200",
        cancelled: "bg-red-50 text-red-500 border-red-100",
        refunded: "bg-slate-200 text-slate-700 border-slate-300",
        "on-hold": "bg-orange-100 text-orange-700 border-orange-200",

        // Internal/Vendor Stages
        "Assigned to Vendor": "bg-indigo-100 text-indigo-700 border-indigo-200",
        "assigned to vendor": "bg-indigo-100 text-indigo-700 border-indigo-200",
        "Printing": "bg-blue-100 text-blue-700 border-blue-200",
        "Quality Check": "bg-purple-100 text-purple-700 border-purple-200",
        "Packed": "bg-yellow-100 text-yellow-700 border-yellow-200",
        "Shipped to Admin": "bg-orange-100 text-orange-700 border-orange-200",
        "Received by Admin": "bg-teal-100 text-teal-700 border-teal-200",
        "Final Packed for Customer": "bg-pink-100 text-pink-700 border-pink-200",
        "Shipped to Customer": "bg-green-100 text-green-700 border-green-200",
        "Delivered": "bg-emerald-100 text-emerald-700 border-emerald-200",
        "Uploaded": "bg-slate-100 text-slate-600 border-slate-200",
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
