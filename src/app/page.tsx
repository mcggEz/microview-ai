"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Microscope, TestTube, Camera, Brain, FileText, Zap, Eye, Sparkles } from "lucide-react";
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
    title: "Image Acquisition",
    description:
      "Capture high-quality microscopy images from the microscope feed for analysis.",
    icon: Camera
  },
  {
    title: "Coarse-Grain Analysis",
    description:
      "YOLO v11 performs initial object detection to identify and locate sediment types with bounding boxes.",
    icon: Eye
  },
  {
    title: "Fine-Grain Analysis",
    description:
      "Gemini 2.5 Pro performs detailed analysis, verifies YOLO detections, and provides clinical context.",
    icon: Sparkles
  },
  {
    title: "Report Generation",
    description:
      "Generate comprehensive reports with structured findings, annotated images, and clinical recommendations.",
    icon: FileText
  },
];

const aiPipeline = [
  {
    title: "YOLO v11 - Coarse Detection",
    description: "First-stage analysis: Fast object detection model performs initial coarse-grain identification of sediment types",
    features: [
      "Rapid bounding box generation for detected objects",
      "Initial classification of sediment types",
      "Confidence scores for each detection",
      "Multi-class detection (RBC, WBC, crystals, casts, etc.)"
    ],
    icon: Eye,
    color: "bg-blue-50 border-blue-200"
  },
  {
    title: "Gemini 2.5 Pro - Fine Analysis",
    description: "Second-stage analysis: Advanced vision-language model performs detailed fine-grain verification and refinement",
    features: [
      "Verifies and refines YOLO coarse detections",
      "Performs comprehensive systematic image scan",
      "Provides detailed morphology descriptions",
      "Generates clinical context and recommendations"
    ],
    icon: Sparkles,
    color: "bg-purple-50 border-purple-200"
  },
  {
    title: "Hybrid Pipeline",
    description: "Two-stage approach: Coarse detection followed by fine analysis ensures both speed and accuracy",
    features: [
      "YOLO provides fast coarse-grain initial detection",
      "Gemini performs fine-grain detailed analysis",
      "Error correction and missed detection recovery",
      "Explainable AI with comprehensive reasoning"
    ],
    icon: Zap,
    color: "bg-green-50 border-green-200"
  },
];

export default function Home() {
  const router = useRouter();

  const handleDemoClick = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900 scroll-smooth">
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
                <button
                  onClick={handleDemoClick}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    height: '2.5rem',
                    paddingLeft: '2rem',
                    paddingRight: '2rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    backgroundColor: 'rgb(17, 24, 39)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(31, 41, 55)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(17, 24, 39)'}
                >
                  <TestTube className="h-4 w-4" />
                  Let's test it out!
                </button>
                <Link href="#mission">
                  <button
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      height: '2.5rem',
                      paddingLeft: '2rem',
                      paddingRight: '2rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      backgroundColor: 'white',
                      color: 'rgb(17, 24, 39)',
                      border: '1px solid rgb(229, 231, 235)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(249, 250, 251)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    Explore the Mission
                  </button>
                </Link>
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
              <div 
                key={item.title} 
                className="group rounded-2xl bg-white p-8 hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 hover:scale-105"
                style={{
                  animationDelay: `${index * 150}ms`,
                  animationFillMode: 'both'
                }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 transition-colors duration-300 group-hover:text-gray-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="h-px flex-1 bg-gray-200 transition-all duration-300 group-hover:bg-gray-300"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 transition-colors duration-300 group-hover:text-gray-700">
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
            <div className="text-center max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                Two-Stage AI Analysis Pipeline
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-700 sm:text-base">
                From image acquisition to clinical reporting, our workflow uses YOLO for coarse-grain detection followed by Gemini for fine-grain analysis, ensuring both speed and accuracy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {workflow.map((step, index) => {
                const IconComponent = step.icon;
                return (
                  <div
                    key={step.title}
                    className="group relative rounded-2xl bg-white p-8 overflow-hidden border border-gray-100 hover:border-gray-300 hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    <div className="absolute top-6 right-6 text-7xl font-bold text-gray-100 font-mono transition-transform duration-300 group-hover:scale-110 group-hover:text-gray-200">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="relative space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100 transition-all duration-300 group-hover:bg-gray-200 group-hover:scale-110 group-hover:rotate-6">
                          <IconComponent className="h-5 w-5 text-gray-700 transition-transform duration-300 group-hover:rotate-12" />
                        </div>
                        <span className="text-xs uppercase font-mono text-gray-500 transition-colors duration-300 group-hover:text-gray-700">
                          Step {index + 1}
                        </span>
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 transition-colors duration-300 group-hover:text-gray-700">
                        {step.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-gray-600">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="ai-pipeline"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 bg-white"
        >
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                Powered by Hybrid AI Technology
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-700 sm:text-base">
                Combining the speed of YOLO v11 object detection with the clinical expertise of Google Gemini 2.5 Pro for accurate, explainable urinalysis analysis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {aiPipeline.map((tech, index) => {
                const IconComponent = tech.icon;
                return (
                  <div
                    key={tech.title}
                    className={`rounded-2xl p-8 border-2 ${tech.color} transition-all duration-300 hover:scale-105 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4`}
                    style={{
                      animationDelay: `${index * 150}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-white shadow-sm transition-all duration-300 hover:scale-110 hover:rotate-6">
                          <IconComponent className="h-6 w-6 text-gray-800 transition-transform duration-300" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 transition-colors duration-300 group-hover:text-gray-700">
                          {tech.title}
                        </h3>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-700">
                        {tech.description}
                      </p>
                      <ul className="space-y-2 mt-4">
                        {tech.features.map((feature, idx) => (
                          <li 
                            key={idx} 
                            className="text-xs text-gray-600 flex items-start gap-2 transition-all duration-300 hover:translate-x-1"
                          >
                            <span className="text-gray-400 mt-1 transition-colors duration-300 group-hover:text-green-500">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-8 border border-gray-200 hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
              <div className="max-w-3xl mx-auto text-center space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  How It Works Together
                </h3>
                <div className="flex items-center justify-center gap-3 text-sm text-gray-700 flex-wrap">
                  <div className="flex items-center gap-2 transition-transform duration-300 hover:scale-110">
                    <Camera className="h-4 w-4 text-gray-600 animate-pulse" />
                    <span className="font-medium">Image Acquisition</span>
                  </div>
                  <span className="text-gray-400 animate-pulse">→</span>
                  <div className="flex items-center gap-2 transition-transform duration-300 hover:scale-110">
                    <Eye className="h-4 w-4 text-blue-600 animate-pulse" />
                    <span className="font-medium">YOLO v11 (Coarse)</span>
                  </div>
                  <span className="text-gray-400 animate-pulse">→</span>
                  <div className="flex items-center gap-2 transition-transform duration-300 hover:scale-110">
                    <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
                    <span className="font-medium">Gemini 2.5 Pro (Fine)</span>
                  </div>
                  <span className="text-gray-400 animate-pulse">→</span>
                  <div className="flex items-center gap-2 transition-transform duration-300 hover:scale-110">
                    <FileText className="h-4 w-4 text-green-600 animate-pulse" />
                    <span className="font-medium">Clinical Report</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 max-w-2xl mx-auto">
                  First, YOLO v11 performs coarse-grain analysis to quickly identify and locate sediment types. Then, Gemini 2.5 Pro performs fine-grain analysis to verify detections, refine classifications, and provide detailed clinical context. This two-stage approach ensures both speed and accuracy.
                </p>
              </div>
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
              <button
                onClick={handleDemoClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  height: '2.5rem',
                  paddingLeft: '2rem',
                  paddingRight: '2rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  backgroundColor: 'rgb(17, 24, 39)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(31, 41, 55)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(17, 24, 39)'}
              >
                <TestTube className="h-4 w-4" />
                Let's test it out!
              </button>
              <Link href="#overview">
                <button
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    height: '2.5rem',
                    paddingLeft: '2rem',
                    paddingRight: '2rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    backgroundColor: 'white',
                    color: 'rgb(17, 24, 39)',
                    border: '1px solid rgb(229, 231, 235)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(249, 250, 251)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  Back to Overview
                </button>
              </Link>
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
