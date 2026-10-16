import { Link } from "@tanstack/react-router";
import { Compass, Home, Library, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { usePlayer } from "@/player/PlayerProvider";
import { PlayerBar } from "./PlayerBar";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/library", label: "Library", icon: Library },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, setTheme } = usePlayer();
  return (
    <div className="min-h-screen bg-hero">
      <header className="sticky top-0 z-20 border-b bg-surface backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <Link to="/" className="font-display text-2xl font-extrabold tracking-tight">
            VY<span className="bg-gradient-primary bg-clip-text text-transparent">BE</span>
          </Link>
          <nav className="hidden gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Switch theme" className="rounded-full border p-2 transition-colors hover:bg-accent">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-48 pt-6 md:px-6 md:pb-32">{children}</main>
      <PlayerBar />
      <nav aria-label="Main mobile" className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-3 border-t bg-surface backdrop-blur-xl md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="flex flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground data-[status=active]:text-primary">
            <n.icon className="size-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
