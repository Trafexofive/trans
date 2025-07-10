import AuthGuard from "../components/AuthGuard";
import AppNavbar from "../components/AppNavbar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="relative flex min-h-screen flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container mx-auto max-w-7xl py-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
