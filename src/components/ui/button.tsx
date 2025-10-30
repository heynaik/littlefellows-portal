import React from "react";

export function Button({
  children,
  onClick,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      type={type}
      className={`px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition ${className}`}
    >
      {children}
    </button>
  );
}