
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
    columns: number;
    rows?: number;
}

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
    return (
        <tr className="animate-pulse">
            <td colSpan={columns} className="p-0">
                <div className="space-y-4 p-4">
                    {Array.from({ length: rows }).map((_, i) => (
                        <div key={i} className="flex gap-4">
                            {Array.from({ length: columns }).map((_, j) => (
                                <Skeleton
                                    key={j}
                                    className="h-12 w-full rounded-xl bg-slate-100/80"
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </td>
        </tr>
    );
}
