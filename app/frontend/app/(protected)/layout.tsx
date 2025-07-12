import AuthGuard from "@/components/AuthGuard";
import AppNavbar from "@/components/AppNavbar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen flex-col overflow-hidden">
        <AppNavbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
