
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The background is now handled by the layout for all public pages.
    <div className="landing-bg flex min-h-screen items-center justify-center p-4">
      {children}
    </div>
  );
}
