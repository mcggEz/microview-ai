"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Microscope, TestTube } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";

const highlights = [
  {
    title: "Vision-Language Insight",
    description:
      "Explainable AI surfaces critical findings with clear context for medical technologists.",
  },
  {
    title: "Lab-Ready Experience",
    description:
      "Minimal setup through a Raspberry Pi bridge designed for consistent lab workflows.",
  },
  {
    title: "Confident Reporting",
    description:
      "Structured summaries, quality captures, and trend comparisons prepared for review.",
  },
];

const workflow = [
  {
    title: "Capture",
    description:
      "Securely connect the microscope feed and begin a stabilized live session.",
  },
  {
    title: "Interpret",
    description:
      "MicroView AI categorizes sediments, counts cell populations, and flags anomalies.",
  },
  {
    title: "Deliver",
    description:
      "Generate a concise report with annotated frames ready for physician validation.",
  },
];

export default function Home() {
  const router = useRouter();

  const handleDemoClick = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900">
      <Navbar onDemoClick={handleDemoClick} />

      <main>
        <section
          id="overview"
          className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 sm:pt-20 md:pt-24 lg:px-8"
        >
          <div className="grid gap-12 md:grid-cols-[1fr,0.8fr] md:gap-16">
            <div>
              <p className="text-sm uppercase font-mono text-gray-600">
                Urine microscopy, reimagined
              </p>
              <div className="mt-5 space-y-2">
                <h1 className="text-3xl leading-tight text-gray-900 sm:text-4xl md:text-5xl tracking-tighter">
                  Fast. Reliable. Compact.
                </h1>
                <p className="text-lg text-gray-700">
                  Calm. Precise. Ready for everyday workload.
                </p>
              </div>
              <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button onClick={handleDemoClick} size="lg">
                  <TestTube className="h-4 w-4" />
                  Launch Live Demo
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="#mission">Explore the Mission</Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="rounded-2xl bg-white p-6">
                <h2 className="text-sm uppercase font-mono text-gray-600">
                  Thesis
                </h2>
                <h3 className="mt-3 text-lg font-semibold leading-snug text-gray-900">
                  MicroView AI
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  Leveraging Large Vision-Language Models in an Augmentative
                  Raspberry Pi–Based System for Urine Microscopy Analysis
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6">
                <div className="flex items-center gap-4">
                  <Image
                    src="/plm-logo.png"
                    alt="Pamantasan ng Lungsod ng Maynila"
                    width={48}
                    height={48}
                    className="h-12 w-12"
                  />
                  <div>
                    <p className="text-xs uppercase font-mono text-gray-500">
                      Supported by
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      Pamantasan ng Lungsod ng Maynila
                    </p>
                    <p className="text-xs text-gray-600">
                      College of Engineering
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="highlights"
          className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8"
        >
          <div className="grid gap-2 md:grid-cols-3">
            {highlights.map((item, index) => (
              <div key={item.title} className="rounded-2xl bg-white p-8">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="h-px flex-1 bg-gray-200"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="workflow"
          className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8"
        >
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                Designed for calm, repeatable analysis
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-700 sm:text-base">
                Every stage keeps the interface focused on outcomes, offering
                the right amount of context for clinical decisions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {workflow.map((step, index) => (
                <div
                  key={step.title}
                  className="relative rounded-2xl bg-white p-10 overflow-hidden"
                >
                  <div className="absolute top-6 right-6 text-7xl font-bold text-gray-100 font-mono">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="relative space-y-4">
                    <span className="text-xs uppercase font-mono text-gray-500">
                      Step {index + 1}
                    </span>
                    <h3 className="text-2xl font-semibold text-gray-900">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-600">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="mission"
          className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="rounded-2xl bg-white p-10 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
              Crafted to elevate daily diagnostics.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-700 sm:text-base max-w-2xl mx-auto">
              MicroView AI streamlines sample validation, keeps care teams in
              sync, and preserves documentation that meets clinical scrutiny.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Button onClick={handleDemoClick} size="lg">
                <TestTube className="h-4 w-4" />
                Start the Demo
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="bg-white hover:bg-gray-100"
              >
                <Link href="#overview">Back to Overview</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-[#f5f5f5]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-gray-600 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-900 text-white">
              <Microscope className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">MicroView AI</span>
          </div>
          <p>
            &copy; {new Date().getFullYear()} MicroView AI System. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
