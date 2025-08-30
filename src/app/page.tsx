'use client'

import Link from 'next/link'
import { ArrowRight, Shield, Zap, BarChart3, Users, TestTube, CheckCircle, GraduationCap, BookOpen, Microscope, Brain, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Home() {
  const [isNavOpen, setIsNavOpen] = useState(false)

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className={`bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 transition-all duration-300 ${
        isNavOpen ? 'h-auto' : 'h-16'
      } overflow-hidden`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Microscope className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">MicroView AI</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#overview" className="text-gray-600 hover:text-blue-600 transition-colors">Overview</a>
              <a href="#technology" className="text-gray-600 hover:text-blue-600 transition-colors">Technology</a>
              <a href="#about" className="text-gray-600 hover:text-blue-600 transition-colors">About</a>
              <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                View Demo
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={toggleNav}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {isNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
        </div>

          {/* Mobile Navigation */}
          <div className={`md:hidden transition-all duration-300 ${
            isNavOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
          } overflow-hidden`}>
            <div className="py-4 space-y-4 border-t border-gray-200">
              <a 
                href="#overview" 
                className="block text-gray-600 hover:text-blue-600 transition-colors"
                onClick={() => setIsNavOpen(false)}
              >
                Overview
        </a>
        <a
                href="#technology" 
                className="block text-gray-600 hover:text-blue-600 transition-colors"
                onClick={() => setIsNavOpen(false)}
              >
                Technology
        </a>
        <a
                href="#about" 
                className="block text-gray-600 hover:text-blue-600 transition-colors"
                onClick={() => setIsNavOpen(false)}
              >
                About
              </a>
              <Link 
                href="/dashboard" 
                className="block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center"
                onClick={() => setIsNavOpen(false)}
              >
                View Demo
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-6">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
              <GraduationCap className="h-4 w-4 mr-2" />
              BS Computer Engineering Thesis Project
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            MicroView AI:
            <span className="text-blue-600"> Leveraging Large Vision-Language Models</span>
            <br />
            in an Augmentative Raspberry Pi-Based System
            <br />
            <span className="text-2xl md:text-3xl text-gray-700 mt-4 block">
              for Automated Urine Microscopy Analysis
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto">
            An innovative thesis project exploring the integration of advanced AI models with Raspberry Pi technology 
            to revolutionize medical laboratory analysis through automated urine microscopy examination.
          </p>
          <div className="flex justify-center">
            <Link href="/dashboard" className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center">
              Explore the Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section id="overview" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Project Overview
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              This thesis project demonstrates the practical application of cutting-edge AI technology 
              in medical laboratory settings, specifically for urine microscopy analysis.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Analysis</h3>
              <p className="text-gray-600">
                Advanced machine learning algorithms for accurate cell counting, particle detection, 
                and automated identification of microscopic elements in urine samples.
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <TestTube className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Medical Laboratory Focus</h3>
              <p className="text-gray-600">
                Specifically designed for urine microscopy analysis, addressing real-world challenges 
                in medical laboratory workflows and patient care.
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Research & Development</h3>
              <p className="text-gray-600">
                A comprehensive research project exploring the intersection of AI, computer vision, 
                and medical laboratory technology.
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Innovation in Healthcare</h3>
              <p className="text-gray-600">
                Demonstrating how emerging technologies can enhance medical diagnostics 
                and improve laboratory efficiency in healthcare settings.
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Academic Excellence</h3>
              <p className="text-gray-600">
                A comprehensive thesis project showcasing advanced computer engineering concepts 
                applied to real-world medical technology challenges.
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Future of Medical Tech</h3>
              <p className="text-gray-600">
                Exploring the potential of AI and IoT devices in transforming traditional 
                medical laboratory practices and improving patient outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section id="technology" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Technology Stack
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              This project leverages cutting-edge technologies to demonstrate the potential 
              of AI in medical laboratory automation.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Large Vision-Language Models</h3>
              <p className="text-gray-600 text-sm">
                Advanced AI models for image analysis and medical diagnosis
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TestTube className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Raspberry Pi</h3>
              <p className="text-gray-600 text-sm">
                Affordable computing platform for medical device integration
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Microscope className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Computer Vision</h3>
              <p className="text-gray-600 text-sm">
                Image processing and analysis for microscopic examination
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Web Application</h3>
              <p className="text-gray-600 text-sm">
                Modern web interface for laboratory management and analysis
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <GraduationCap className="h-16 w-16 text-white mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Academic Project
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              This thesis project represents the culmination of years of study in Computer Engineering, 
              demonstrating practical application of theoretical knowledge in a real-world medical technology context.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">BS Computer Engineering</div>
              <div className="text-blue-100">Degree Program</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">Pamantasang ng Lungsod ng Maynila</div>
              <div className="text-blue-100">University</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">Thesis Project</div>
              <div className="text-blue-100">Final Year Requirement</div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              About This Project
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              MicroView AI is a comprehensive thesis project that explores the practical application 
              of artificial intelligence in medical laboratory technology.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Project Objectives</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  Develop an AI-powered system for automated urine microscopy analysis
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  Integrate Raspberry Pi technology with advanced computer vision algorithms
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  Demonstrate the potential of AI in improving medical laboratory efficiency
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  Contribute to the advancement of medical technology through innovation
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Research Significance</h3>
              <p className="text-gray-600 mb-4">
                This project addresses the growing need for automation in medical laboratories, 
                where manual microscopy analysis can be time-consuming and prone to human error.
              </p>
              <p className="text-gray-600">
                By combining AI technology with affordable hardware solutions, the research 
                demonstrates how advanced computer engineering concepts can be applied to 
                solve real-world healthcare challenges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Microscope className="h-8 w-8 text-blue-400" />
                <span className="ml-2 text-xl font-bold">MicroView AI</span>
              </div>
              <p className="text-gray-400">
                A BS Computer Engineering thesis project exploring AI-powered medical laboratory automation 
                through innovative technology integration.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Project</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#overview" className="hover:text-white transition-colors">Overview</a></li>
                <li><a href="#technology" className="hover:text-white transition-colors">Technology</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Academic</h4>
              <ul className="space-y-2 text-gray-400">
                <li>BS Computer Engineering</li>
                <li>Pamantasang ng Lungsod ng Maynila</li>
                <li>Thesis Project</li>
                <li>2024-2025 Academic Year</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 MicroView AI - BS Computer Engineering Thesis Project. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
