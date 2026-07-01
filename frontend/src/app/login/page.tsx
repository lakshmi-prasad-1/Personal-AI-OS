"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      router.push("/");
    } catch {
      setError(isRegister ? "Registration failed" : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrainCircuit className="text-blue-500" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-white">AI Brain OS</h1>
          <p className="text-gray-400">Sign in to your second brain</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-3 text-sm font-medium transition-colors"
          >
            {loading ? "..." : isRegister ? "Create Account" : "Sign In"}
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-sm text-gray-400 hover:text-white transition-colors"
          >
            {isRegister ? "Already have an account? Sign in" : "Need an account? Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
