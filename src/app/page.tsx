'use client'

import { useRouter } from 'next/navigation'
import { Microscope, TestTube } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  const handleDemoClick = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                <Microscope className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">MicroView AI</h1>
            </div>
            <div className="hidden md:flex items-center">
              <button
                onClick={handleDemoClick}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-green-700 transition-all duration-200 shadow-md"
              >
                <TestTube className="w-4 h-4 inline mr-2" />
                Try Demo
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            MicroView AI
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">Leveraging Large Vision-Language Models</span>
            <br />
            <span className="text-2xl md:text-4xl">in an Augmentative Raspberry Pi–Based System for Urine Microscopy Analysis</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto">
            An undergraduate thesis project for Bachelor of Science in Computer Engineering at 
            <span className="font-semibold text-blue-600"> Pamantasan ng Lungsod ng Maynila (PLM)</span>. 
            This cost-effective, Raspberry Pi–based augmentative microscopy urinalysis system enhanced with 
            Vision-Language Models aims to democratize access to reliable urinalysis diagnostic automation 
            for resource-constrained laboratories.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleDemoClick}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <TestTube className="w-5 h-5 inline mr-2" />
              Try Demo
            </button>
            <button className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200">
              Learn More
            </button>
          </div>
        </div>
      </section>

      

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Project Overview</h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              With the recent advancement of foundational models like Gemini, ChatGPT, and other large language models, 
              there has been a paradigm shift in AI capabilities, particularly in multimodal understanding and natural language generation.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Research Innovation</h3>
              <p className="text-lg text-gray-600 mb-6">
                These Vision-Language Models (VLMs) have demonstrated remarkable potential in analyzing complex visual data 
                while providing human-interpretable explanations. In the context of medical diagnostics, this presents an 
                unprecedented opportunity to explore whether these advanced AI systems can revolutionize automated urinalysis analysis.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                MicroView AI is a cost-effective, Raspberry Pi–based urine microscopy system enhanced with Vision-Language Models (VLMs) 
                that investigates the application of state-of-the-art AI to urine sediment microscopy, exploring their potential to 
                provide accurate, explainable, and cost-effective analysis that could democratize access to reliable diagnostic 
                automation for resource-constrained laboratories.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                Unlike expensive commercial analyzers, this approach emphasizes both affordability and transparency, addressing the 
                critical gap in diagnostic access by providing a practical, trustworthy tool that bridges the gap between manual 
                and fully automated analysis.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-100 to-green-100 p-8 rounded-2xl">
              <div className="text-center mb-6">
                <Microscope className="w-24 h-24 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">BS Computer Engineering Thesis</h3>
                <p className="text-gray-600 mb-4">
                  Pamantasan ng Lungsod ng Maynila (PLM)
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">Cost-Effective</div>
                  <div className="text-sm text-gray-600">Raspberry Pi–Based System</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">VLM Enhanced</div>
                  <div className="text-sm text-gray-600">Vision-Language Models</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">Accessible</div>
                  <div className="text-sm text-gray-600">Resource-Constrained Labs</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Research Impact Section */}
          <div className="mt-16 bg-white p-8 rounded-2xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Research Impact</h3>
            <p className="text-lg text-gray-600 mb-6 text-center max-w-4xl mx-auto">
              This research contributes to the advancement of accessible medical diagnostics and demonstrates the potential of 
              Visual-Language Models in healthcare technologies. The findings provide a foundation for democratizing reliable 
              urinalysis and addressing the persistent access-accuracy gap in diagnostic services, especially in third world 
              countries where access to such advanced diagnostic machines is limited due to high costs and infrastructure requirements.
            </p>
            <p className="text-lg text-gray-600 text-center max-w-4xl mx-auto">
              By combining low-cost hardware with transparent AI, this work positions itself as a viable step toward ensuring 
              diagnostic equity across diverse clinical settings.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-green-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Experience the Future?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Try our demo and see how AI can transform your laboratory workflow
          </p>
          <button
            onClick={handleDemoClick}
            className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <TestTube className="w-5 h-5 inline mr-2" />
            Start Demo Now
          </button>
        </div>
      </section>

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
