'use client'

import { useRouter } from 'next/navigation'
import { Microscope, TestTube } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = (require('react') as typeof import('react')).useState(false)
  const ReactRef = require('react') as typeof import('react')
  const particles = ReactRef.useMemo(() => {
    const rng = (min: number, max: number) => Math.random() * (max - min) + min
    const items: Array<Record<string, any>> = []

    const pushParticle = (style: Record<string, any>) => {
      items.push({
        ...style,
        left: `${rng(0, 100)}%`,
        top: `${rng(0, 100)}%`,
        animationDelay: `${rng(-30, 0)}s`,
        animationDuration: `${rng(18, 30)}s`,
      })
    }

    // RBCs: soft red biconcave discs (radial gradient ring)
    for (let i = 0; i < 22; i++) {
      const size = rng(10, 16)
      pushParticle({
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '9999px',
        opacity: 0.25,
        background: `radial-gradient(circle at 50% 55%, rgba(244, 67, 54, 0.55) 0%, rgba(244, 67, 54, 0.35) 40%, rgba(244, 67, 54, 0.15) 60%, rgba(0,0,0,0) 65%)`,
        boxShadow: 'inset 0 0 2px rgba(0,0,0,0.25)'
      })
    }

    // WBCs: larger pale cell with purple nucleus (radial gradients)
    for (let i = 0; i < 10; i++) {
      const size = rng(16, 22)
      pushParticle({
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '9999px',
        opacity: 0.28,
        background: `radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.55) 0 35%, rgba(255,255,255,0.2) 36% 100%)`,
        boxShadow: 'inset 0 0 3px rgba(0,0,0,0.25)'
      })
    }

    // Crystals: slender rectangles/diamonds
    for (let i = 0; i < 8; i++) {
      const w = rng(10, 18)
      const h = rng(2, 4)
      pushParticle({
        width: `${w}px`,
        height: `${h}px`,
        borderRadius: '2px',
        opacity: 0.2,
        backgroundColor: 'rgba(255,255,255,0.6)',
        transform: `rotate(${rng(15, 75)}deg)`
      })
    }

    // Bacteria: tiny bright dots
    for (let i = 0; i < 40; i++) {
      const s = rng(2, 4)
      pushParticle({
        width: `${s}px`,
        height: `${s}px`,
        borderRadius: '9999px',
        opacity: 0.35,
        backgroundColor: 'rgba(255,255,255,0.9)'
      })
    }

    // Yeast: small ovals
    for (let i = 0; i < 10; i++) {
      pushParticle({
        width: `${rng(6, 10)}px`,
        height: `${rng(8, 12)}px`,
        borderRadius: '50% / 60%',
        opacity: 0.3,
        backgroundColor: 'rgba(255,255,255,0.7)'
      })
    }

    return items
  }, [])

  const handleDemoClick = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header / Navigation */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                <Microscope className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">MicroView AI</h1>
            </div>
            <nav className="hidden md:flex items-center space-x-6 text-gray-700 font-medium text-sm">
              <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
              <a href="#mission" className="hover:text-gray-900 transition-colors">Our Mission</a>
            </nav>
            <button
              onClick={handleDemoClick}
              className="hidden md:block px-4 py-1.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors duration-200 shadow-md text-sm"
            >
              <TestTube className="w-4 h-4 inline mr-2" />
              Live Demo
            </button>
            {/* Mobile menu button */}
            <button
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
              aria-label="Open menu"
              onClick={() => setMobileNavOpen(v => !v)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
          </div>
        </div>
        {/* Mobile dropdown */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
              <a href="#features" onClick={() => setMobileNavOpen(false)} className="block py-2 text-gray-700 hover:text-gray-900">Features</a>
              <a href="#how-it-works" onClick={() => setMobileNavOpen(false)} className="block py-2 text-gray-700 hover:text-gray-900">How It Works</a>
              <a href="#mission" onClick={() => setMobileNavOpen(false)} className="block py-2 text-gray-700 hover:text-gray-900">Our Mission</a>
              <button onClick={() => { setMobileNavOpen(false); handleDemoClick() }} className="w-full mt-2 px-4 py-2 bg-gray-900 text-white rounded-lg">Live Demo</button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden min-h-screen flex items-center">
        {/* Animated decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-10 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl animate-[float_18s_linear_infinite]" />
          <div className="absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-green-600/20 blur-3xl animate-[float_22s_linear_infinite_reverse]" />
          {/* Floating particle field */}
          <div className="absolute inset-0">
            {particles.map((s, i) => (
              <span
                key={i}
                className="absolute will-change-transform animate-[drift_var(--dur)_linear_infinite]"
                style={{
                  left: s.left as any,
                  top: s.top as any,
                  width: s.width as any,
                  height: s.height as any,
                  opacity: (s as any).opacity as any,
                  backgroundColor: (s as any).backgroundColor as any,
                  background: (s as any).background as any,
                  borderRadius: (s as any).borderRadius as any,
                  transform: (s as any).transform as any,
                  // @ts-ignore - custom property for per-particle duration
                  ['--dur' as any]: s.animationDuration,
                  animationDelay: (s as any).animationDelay as any,
                }}
              />
            ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto text-center">
          <div className="px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-1 gap-10 items-center">
            <div className="text-left md:pr-6 transition-all duration-700 ease-out motion-safe:translate-y-0 motion-safe:opacity-100 translate-y-2 opacity-95">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
                MicroView AI
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Leveraging Large Vision-Language Models</span>
                <br />
                <span className="text-xl sm:text-2xl md:text-3xl">in an Augmentative Raspberry Pi–Based System for Urine Microscopy Analysis</span>
              </h1>
              <div className="flex flex-wrap gap-3 mt-2">
                <button
                  onClick={handleDemoClick}
                  className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-300 shadow hover:shadow-lg hover:-translate-y-0.5"
                >
                  <TestTube className="w-5 h-5 inline mr-2" />
                  Live Demo
                </button>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <h3 className="text-sm uppercase tracking-widest text-gray-500 font-semibold mb-4">Supported By</h3>
          <div className="flex justify-center items-center gap-x-12 gap-y-8 flex-wrap text-gray-700">
            {/* PLM Seal */}
            <div className="flex items-center gap-3">
              <img
                src="https://upload.wikimedia.org/wikipedia/en/2/2b/Pamantasan_ng_Lungsod_ng_Maynila_seal.png"
                alt="Pamantasan ng Lungsod ng Maynila Seal"
                className="h-10 w-10 object-contain drop-shadow-sm"
                loading="lazy"
              />
              <span className="font-semibold">Pamantasan ng Lungsod ng Maynila</span>
            </div>
            {/* College of Engineering */}
            <div className="flex items-center gap-3">
              {/* Simple gear glyph as logo if college mark is unavailable */}
              <svg className="h-10 w-10 text-gray-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 00.12-.65l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.2 7.2 0 00-1.63-.94l-.36-2.55A.5.5 0 0014.3 1h-4.6a.5.5 0 00-.49.42l-.36 2.55c-.58.23-1.12.53-1.63.94l-2.39-.96a.5.5 0 00-.6.22L2.73 7.01a.5.5 0 00.12.65l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 00-.12.65l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.5.41 1.05.73 1.63.94l.36 2.55c.04.24.25.42.49.42h4.6c.24 0 .45-.18.49-.42l.36-2.55c.58-.23 1.12-.53 1.63-.94l2.39.96c.24.1.51.01.64-.22l1.92-3.32a.5.5 0 00-.12-.65l-2.03-1.58zM12 15.5A3.5 3.5 0 1112 8a3.5 3.5 0 010 7.5z" />
              </svg>
              <span className="font-semibold">College of Engineering</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-12">Analysis in 3 Simple Steps</h2>
          <div className="grid md:grid-cols-3 gap-10 text-left">
            <div className="transition-transform duration-300 hover:-translate-y-1 bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Connect & Capture</h3>
              <p className="text-base md:text-lg text-gray-700">Link your microscope and start a live feed in seconds.</p>
            </div>
            <div className="transition-transform duration-300 hover:-translate-y-1 bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">AI Analyzes</h3>
              <p className="text-base md:text-lg text-gray-700">The model identifies, counts, and classifies sediments accurately.</p>
            </div>
            <div className="transition-transform duration-300 hover:-translate-y-1 bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Generate Report</h3>
              <p className="text-base md:text-lg text-gray-700">Get a professional, comprehensive report ready for review.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About / Research Details */}
      <section id="about" className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-20">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 text-center mb-12">A Smarter Workflow for Your Lab</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white p-8 rounded-xl shadow transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-1">AI-Powered Accuracy</h3>
                <p className="text-base md:text-lg text-gray-700">Reduce manual errors with modern multimodal analysis.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-1">Live Camera Feed</h3>
                <p className="text-base md:text-lg text-gray-700">Monitor samples with a real-time, high-quality stream.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-1">Seamless Test Management</h3>
                <p className="text-base md:text-lg text-gray-700">Organize patient data and access historical results.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-1">Professional Reports</h3>
                <p className="text-base md:text-lg text-gray-700">Generate clear, concise reports instantly.</p>
              </div>
            </div>
          </div>
          {/* Thesis context moved from hero */}
          <div className="mt-2 mb-12 bg-white p-6 md:p-8 rounded-2xl shadow">
            <p className="text-base md:text-lg text-gray-700 max-w-5xl mx-auto">
              An undergraduate thesis project for Bachelor of Science in Computer Engineering at
              <span className="font-semibold text-blue-700"> Pamantasan ng Lungsod ng Maynila (PLM)</span>. This cost-effective, Raspberry Pi–based augmentative microscopy urinalysis system enhanced with Vision-Language Models aims to democratize access to reliable urinalysis diagnostic automation for resource-constrained laboratories.
            </p>
          </div>
          {/* Research Innovation Section */}
          <div className="mt-6 mb-12 bg-white p-6 md:p-8 rounded-2xl shadow">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Research Innovation</h3>
            <div className="max-w-5xl mx-auto space-y-4">
              <p className="text-base md:text-lg text-gray-700">
                These Vision-Language Models (VLMs) have demonstrated remarkable potential in analyzing complex visual data while providing human-interpretable explanations. In the context of medical diagnostics, this presents an unprecedented opportunity to explore whether these advanced AI systems can revolutionize automated urinalysis analysis.
              </p>
              <p className="text-base md:text-lg text-gray-700">
                MicroView AI is a cost-effective, Raspberry Pi–based urine microscopy system enhanced with Vision-Language Models (VLMs) that investigates the application of state-of-the-art AI to urine sediment microscopy, exploring their potential to provide accurate, explainable, and cost-effective analysis that could democratize access to reliable diagnostic automation for resource-constrained laboratories.
              </p>
              <p className="text-base md:text-lg text-gray-700">
                Unlike expensive commercial analyzers, this approach emphasizes both affordability and transparency, addressing the critical gap in diagnostic access by providing a practical, trustworthy tool that bridges the gap between manual and fully automated analysis.
              </p>
            </div>
          </div>
          {/* Research Impact Section */}
          <div className="mt-6 mb-20 bg-white p-8 rounded-2xl shadow">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Research Impact</h3>
            <p className="text-lg text-gray-700 mb-6 text-center max-w-4xl mx-auto">
              This research contributes to the advancement of accessible medical diagnostics and demonstrates the potential of Visual-Language Models in healthcare technologies. The findings provide a foundation for democratizing reliable urinalysis and addressing the persistent access-accuracy gap in diagnostic services, especially in third world countries where access to such advanced diagnostic machines is limited due to high costs and infrastructure requirements.
            </p>
            <p className="text-lg text-gray-700 text-center max-w-4xl mx-auto">
              By combining low-cost hardware with transparent AI, this work positions itself as a viable step toward ensuring diagnostic equity across diverse clinical settings.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="mission" className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Transform Your Lab Today.</h2>
          <p className="text-lg text-gray-200/95 mb-8">See how MicroView AI can empower your team.</p>
          <button
            onClick={handleDemoClick}
            className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-transform duration-300 transform hover:scale-105 shadow"
          >
            <TestTube className="w-5 h-5 inline mr-2" />
            Live Demo
          </button>
        </div>
      </section>

      {/* Keyframes for custom animations */}
      <style jsx>{`
        @keyframes float { 0% { transform: translateY(10px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(10px); } }
        @keyframes fadeUp { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes drift { 0% { transform: translate3d(0, 10vh, 0) scale(1); } 50% { transform: translate3d(5vw, -10vh, 0) scale(1.1); } 100% { transform: translate3d(0, -20vh, 0) scale(1); } }
      `}</style>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                  <Microscope className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">MicroView AI</span>
              </div>
              <p className="text-gray-400">
                Leveraging Large Vision-Language Models in an Augmentative Raspberry Pi–Based System for Urine Microscopy Analysis
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-gray-400">
                <li>AI Analysis</li>
                <li>Live Camera</li>
                <li>Test Management</li>
                <li>Professional Reports</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Technology</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Google Gemini AI</li>
                <li>Next.js</li>
                <li>Supabase</li>
                <li>Tailwind CSS</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Academic Institution</h4>
              <p className="text-gray-400">
                Pamantasan ng Lungsod ng Maynila (PLM)
                <br />
                Bachelor of Science in Computer Engineering
                <br />
                Undergraduate Thesis Project
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 MicroView AI System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
