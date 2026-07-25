import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";

export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-20 sm:pb-6">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
