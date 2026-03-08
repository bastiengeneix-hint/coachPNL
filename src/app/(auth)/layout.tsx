import '../globals.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh relative bg-[var(--color-bg-primary)]">
      {/* Animated background orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.07)_0%,transparent_70%)] animate-float" />
        <div
          className="absolute -bottom-[30%] -right-[20%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(244,63,94,0.05)_0%,transparent_70%)] animate-float"
          style={{ animationDelay: '-3s' }}
        />
      </div>
      <div className="flex items-center justify-center min-h-dvh px-6">
        {children}
      </div>
    </div>
  );
}
