"use client";

import Image from "next/image";
import logoSrc from "@/../public/fellowe.png";

type LogoProps = {
  showText?: boolean;
  size?: number;
};

export default function Logo({ showText = true, size = 40 }: LogoProps) {
  const containerClasses = [
    "flex items-center",
    showText ? "gap-2" : "justify-center",
  ].join(" ");

  return (
    <div className={containerClasses}>
      <Image
        src={logoSrc}
        alt="LittleFellows logo"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
      {showText && <div className="text-sm font-semibold">LittleFellows</div>}
    </div>
  );
}
