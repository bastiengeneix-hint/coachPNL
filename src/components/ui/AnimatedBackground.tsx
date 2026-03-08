'use client';

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Amber orb — top left */}
      <div
        className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.07)_0%,transparent_70%)] animate-float"
      />
      {/* Rose orb — bottom right */}
      <div
        className="absolute -bottom-[30%] -right-[20%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(244,63,94,0.05)_0%,transparent_70%)] animate-float"
        style={{ animationDelay: '-3s' }}
      />
      {/* Orange orb — mid right */}
      <div
        className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.04)_0%,transparent_70%)] animate-float"
        style={{ animationDelay: '-5s' }}
      />
    </div>
  );
}
