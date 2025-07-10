import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function LandingPage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center text-center p-4">
      <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl text-white">Welcome to Transcendence</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">The Ultimate Pong Experience. Remastered for the modern web.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button asChild size="lg">
          <Link href="/login">Enter the Arena</Link>
        </Button>
      </div>
    </div>
  );
}
