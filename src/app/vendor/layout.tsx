// src/app/vendor/layout.tsx
import RoleGate from "@/components/RoleGate";
import VendorShell from "@/components/vendor/VendorShell";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow="vendor">
      <VendorShell>{children}</VendorShell>
    </RoleGate>
  );
}
