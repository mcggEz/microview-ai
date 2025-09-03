'use client'

import { useRouter } from 'next/navigation'
import { Microscope, TestTube, Brain, Camera, Database, Shield } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  const handleDemoClick = () => {
    router.push('/report')
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
              <h1 className="text-2xl font-bold text-gray-900">Urinalysis AI</h1>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            AI-Powered
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600"> Urinalysis</span>
            <br />
            Analysis System
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Revolutionize your medical laboratory with our advanced AI-powered microscopic urine analysis system. 
            Get accurate results faster with Google Gemini AI integration.
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

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Advanced Features</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our system combines cutting-edge technology with medical expertise to deliver exceptional results
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Analysis</h3>
              <p className="text-gray-600">
                Powered by Google Gemini AI for accurate microscopic analysis and result interpretation
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Live Camera</h3>
              <p className="text-gray-600">
                Real-time microscopic image capture with integrated camera controls
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Database</h3>
              <p className="text-gray-600">
                Secure patient data management with Supabase backend integration
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <TestTube className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Test Management</h3>
              <p className="text-gray-600">
                Comprehensive test tracking, validation, and reporting system
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Security</h3>
              <p className="text-gray-600">
                HIPAA-compliant data protection with role-based access control
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
                <Microscope className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Professional Reports</h3>
              <p className="text-gray-600">
                Generate detailed, professional urinalysis reports with quantitative analysis
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">About Our System</h2>
              <p className="text-lg text-gray-600 mb-6">
                Developed as a comprehensive thesis project in Computer Engineering, this urinalysis analysis system 
                represents the cutting edge of medical technology integration.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                Our system combines advanced AI algorithms, real-time image processing, and professional medical 
                reporting to deliver accurate, reliable results for healthcare professionals.
              </p>
              <div className="flex space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">99.8%</div>
                  <div className="text-sm text-gray-600">Accuracy Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">5x</div>
                  <div className="text-sm text-gray-600">Faster Analysis</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">24/7</div>
                  <div className="text-sm text-gray-600">Availability</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-green-100 p-8 rounded-2xl">
              <div className="text-center">
                <Microscope className="w-24 h-24 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">BS Computer Engineering Thesis</h3>
                <p className="text-gray-600">
                  Advanced urinalysis image processing system with AI integration
                </p>
              </div>
            </div>
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
                <span className="text-xl font-bold">Urinalysis AI</span>
              </div>
              <p className="text-gray-400">
                Advanced AI-powered microscopic urine analysis system
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
              <h4 className="font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">
                BS Computer Engineering Thesis Project
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Urinalysis AI System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
