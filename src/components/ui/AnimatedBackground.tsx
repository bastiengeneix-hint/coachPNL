'use client';

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Teal wash -- top left */}
      <div
        className="absolute -top-[35%] -left-[15%] w-[65%] h-[65%] rounded-full bg-[radial-gradient(circle,rgba(74,158,143,0.04)_0%,transparent_70%)] animate-float"
      />
      {/* Cream wash -- bottom right */}
      <div
        className="absolute -bottom-[25%] -right-[15%] w-[55%] h-[55%] rounded-full bg-[radial-gradient(circle,rgba(242,240,236,0.5)_0%,transparent_70%)] animate-float"
        style={{ animationDelay: '-3s' }}
      />
      {/* Teal hint -- mid center */}
      <div
        className="absolute top-[25%] right-[5%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(circle,rgba(74,158,143,0.03)_0%,transparent_70%)] animate-float"
        style={{ animationDelay: '-5s' }}
      />
    </div>
  );
}
