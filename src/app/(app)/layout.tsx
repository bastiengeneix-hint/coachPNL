export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      {children}
    </div>
  );
}
