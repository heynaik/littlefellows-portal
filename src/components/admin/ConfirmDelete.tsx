'use client';

export default function ConfirmDelete({
  title, subtitle, onCancel, onConfirm,
}:{ title:string; subtitle?:string; onCancel:()=>void; onConfirm:()=>void|Promise<void> }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="section-title mb-1">{title}</div>
        {subtitle && <p className="subtle">{subtitle}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}