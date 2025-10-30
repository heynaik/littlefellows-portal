"use client";
import { Bell } from "lucide-react";
export default function Topbar(){
  return (
    <div className="sticky top-0 z-40 h-14 bg-white/80 shadow-md backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-end px-5">
        <button className="btn secondary !py-2">
          <Bell size={16} />
          Notifications
        </button>
      </div>
    </div>
  );
}
