"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TestTube, ArrowLeft, Eye, EyeOff, Mail, Lock, Shield, Microscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

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

  const continueAsDemo = () => {
    router.push("/report");
  };

  return (
    <div className="h-screen w-screen bg-[#f5f5f5] text-gray-900 flex items-center justify-center p-4">
      {/* Auth card */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden border border-gray-200 shadow-xl bg-white">
        {/* Visual panel */}
        <div className="hidden md:block relative">
          <div className="absolute inset-0 bg-black via-indigo-600/50 to-cyan-500/50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.15),rgba(0,0,0,0)_40%),radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.12),rgba(0,0,0,0)_40%)]" />
          <div className="relative h-full w-full p-10" />
        </div>

        {/* Form panel */}
        <div className="bg-white text-gray-900 h-[min(720px,calc(100vh-2rem))] md:h-full w-full">
          <div className="h-full w-full p-6 sm:p-8 md:p-10 overflow-y-auto">
            {/* Single Login Card */}
            <div className="max-w-md mx-auto">
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
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm">
                  <Microscope className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <h1 className="text-xl font-semibold tracking-tight text-black">MicroView AI</h1>
              
                </div>
              </div>
              <h2 className="text-2xl font-semibold">Login</h2>
              <p className="text-sm text-gray-600 mt-1">Enter your credentials to access your account</p>
            </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
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
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-white transition-all"
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
                        className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-white transition-all"
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
                  className="w-full rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
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

                {/* Sign up button */}
                <div className="mt-3">
                  <Button asChild variant="outline" size="lg" className="w-full rounded-2xl">
                    <Link href="/signup">Create an account</Link>
                  </Button>
                </div>
              </form>

              {/* Demo Access Section */}
              <div className="border-t border-gray-100 pt-6 mt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <TestTube className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Demo Access</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Explore the platform without credentials
                  </p>
                  <Button
                    onClick={continueAsDemo}
                    variant="outline"
                    size="lg"
                    className="w-full border-green-300 text-green-700 hover:bg-green-50 rounded-2xl font-medium transition-all duration-200"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Launch Demo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}