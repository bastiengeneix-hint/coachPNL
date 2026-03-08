import AnimatedBackground from '@/components/ui/AnimatedBackground';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnimatedBackground />
      {children}
    </>
  );
}
