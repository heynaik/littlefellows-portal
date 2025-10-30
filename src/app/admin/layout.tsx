import RoleGate from "@/components/RoleGate";
import AppShell from "../../components/AppShell";

export default function AdminLayout({children}:{children:React.ReactNode}){
  return (
    <RoleGate allow="admin">
      <AppShell>{children}</AppShell>
    </RoleGate>
  );
}
