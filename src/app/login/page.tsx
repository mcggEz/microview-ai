"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TestTube, ArrowLeft, Eye, EyeOff, Mail, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (!email || !password) {
        throw new Error("Please enter your email and password");
      }
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Login failed");
      }
      const redirect =
        new URLSearchParams(window.location.search).get("redirect") ||
        "/report";
      router.push(redirect);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Placeholder for Google OAuth integration
    setError("Google login integration coming soon!");
  };

  const continueAsDemo = () => {
    router.push("/report");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-4 py-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-dot-pattern"></div>
      </div>
      
      {/* Main content */}
      <div className="relative w-full max-w-md">
        {/* Header Card */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl p-8 mb-6">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
          
          {/* Logo and title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="relative">
                <Image
                  src="/microview-logo.svg"
                  alt="MicroView AI Logo"
                  width={56}
                  height={56}
                  className="w-14 h-14"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900">MicroView AI</h1>
                <p className="text-xs text-gray-500 font-mono">v2.1.0</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm uppercase font-mono text-gray-600 tracking-wider">
                MedTech Access Portal
              </p>
              <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                Welcome Back
              </h2>
              <p className="text-sm text-gray-600">
                Sign in to access the urinalysis workspace
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50/80 backdrop-blur-sm p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div className="text-sm font-medium text-red-800">
                  Sign in error
                </div>
              </div>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-white/50 backdrop-blur-sm transition-all"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-white/50 backdrop-blur-sm transition-all"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Sign in
                </div>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            <span className="px-4 text-xs text-gray-500 uppercase tracking-wider font-mono">
              Or continue with
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          </div>

          {/* Google Login */}
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            size="lg"
            className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-all duration-200 hover:shadow-md"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
        </div>

        {/* Demo Access Card */}
        <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 p-6 shadow-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <TestTube className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900">Demo Access</h3>
            </div>
            <p className="text-sm text-green-700 mb-4">
              Explore the platform without credentials
            </p>
            <Button
              onClick={continueAsDemo}
              variant="outline"
              size="lg"
              className="w-full border-green-300 text-green-700 hover:bg-green-100 rounded-xl font-medium transition-all duration-200"
            >
              <TestTube className="w-4 h-4 mr-2" />
              Launch Demo
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            Secure access • HIPAA compliant • Enterprise ready
          </p>
        </div>
      </div>
    </div>
  );
}