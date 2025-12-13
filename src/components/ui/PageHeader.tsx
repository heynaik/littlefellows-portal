import React from "react";

interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode; // For actions/buttons on the right
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
                {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
            </div>
            {children && <div className="flex items-center gap-3">{children}</div>}
        </div>
    );
}
