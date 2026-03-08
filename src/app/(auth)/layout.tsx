export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-50">
      <div className="flex items-center justify-center min-h-dvh px-6 py-12">
        {children}
      </div>
    </div>
  );
}
