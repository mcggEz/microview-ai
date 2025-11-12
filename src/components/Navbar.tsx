"use client";

import { useState } from "react";
import { Microscope } from "lucide-react";

import { Button } from "@/components/ui/button";

type NavbarProps = {
  onDemoClick: () => void;
};

const navigation = [
  { label: "Overview", href: "#overview" },
  { label: "Highlights", href: "#highlights" },
  { label: "Workflow", href: "#workflow" },
  { label: "Mission", href: "#mission" },
];

export function Navbar({ onDemoClick }: NavbarProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-5 z-40 flex justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between rounded-full bg-zinc-950/95 p-2 text-white shadow-[0_18px_60px_-28px_rgba(24,24,27,0.9)] backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <Microscope className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium tracking-tight">
              MicroView AI
            </span>
          </div>
          <nav className="hidden items-center gap-5 text-sm text-zinc-300 md:flex">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button
              onClick={onDemoClick}
              size="sm"
              className="hidden h-7 px-2.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-100 md:inline-flex text-[11px] font-semibold tracking-tight shadow-sm"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              Live Demo
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white md:hidden"
              aria-expanded={mobileNavOpen}
              aria-label="Toggle navigation"
              onClick={() => setMobileNavOpen((value) => !value)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 5.25h16.5m-16.5 6h16.5m-16.5 6h16.5"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
      {mobileNavOpen && (
        <div className="md:hidden">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 pb-4 pt-3 text-sm font-medium text-gray-700">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className="rounded-xl bg-white px-4 py-3"
              >
                {item.label}
              </a>
            ))}
            <Button
              onClick={() => {
                setMobileNavOpen(false);
                onDemoClick();
              }}
              className="h-11 w-full bg-zinc-900 text-white hover:bg-zinc-800"
            >
              Live Demo
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
