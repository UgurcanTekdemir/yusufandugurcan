"use client";

import { useState, FormEvent, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "join" || action === "signup") {
      setIsSignUp(true);
    }
  }, [searchParams]);

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth) {
      setError("Firebase kimlik doğrulama başlatılamadı. Lütfen environment değişkenlerini kontrol edin.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const idToken = await userCredential.user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const redirectTo = searchParams.get("redirect") || "/fixtures";
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred during login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth) {
      setError("Firebase kimlik doğrulama başlatılamadı. Lütfen environment değişkenlerini kontrol edin.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const idToken = await userCredential.user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      router.push("/fixtures");
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred during signup");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-dark-bg p-4">
      {/* Logo and Site Name */}
      <Link href="/fixtures" className="mb-8 flex flex-col items-center cursor-pointer group">
        <div className="mb-4 flex items-center gap-3 transition-transform group-hover:scale-105">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-r from-bet365-green to-bet365-green-light text-black">
            <span className="text-3xl font-black italic">B</span>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-bold tracking-tight text-white">
              BET<span className="text-bet365-green">PRIME</span>
            </span>
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              Yeni Nesil Bahis
            </span>
          </div>
        </div>
      </Link>

      <div
        className="login-container relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ minHeight: "600px" }}
        data-active={isSignUp ? "signup" : "signin"}
      >
        {/* Sign In Form */}
        <div className="sign-in-container absolute left-0 top-0 z-10 h-full w-1/2 transition-all duration-700 ease-in-out">
          <form
            onSubmit={handleSignIn}
            className="flex h-full flex-col items-center justify-center bg-white px-12 text-center"
          >
            <h1 className="mb-4 text-3xl font-bold text-gray-900">Sign In</h1>
            {error && !isSignUp && (
              <div className="mb-4 w-full rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
            <div className="mb-6 w-full">
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-bet365-green focus:outline-none focus:ring-2 focus:ring-bet365-green"
              />
            </div>
            <div className="mb-6 w-full">
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-bet365-green focus:outline-none focus:ring-2 focus:ring-bet365-green"
              />
            </div>
            <a
              href="#"
              className="mb-6 text-sm text-gray-600 hover:text-bet365-green"
            >
              Forgot your password?
            </a>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full border border-bet365-green bg-bet365-green px-12 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-bet365-green-hover disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Sign Up Form */}
        <div className="sign-up-container absolute left-0 top-0 z-0 h-full w-1/2 opacity-0 transition-all duration-700 ease-in-out">
          <form
            onSubmit={handleSignUp}
            className="flex h-full flex-col items-center justify-center bg-white px-12 text-center"
          >
            <h1 className="mb-4 text-3xl font-bold text-gray-900">
              Create Account
            </h1>
            {error && isSignUp && (
              <div className="mb-4 w-full rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
            <div className="mb-4 w-full">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-bet365-green focus:outline-none focus:ring-2 focus:ring-bet365-green"
              />
            </div>
            <div className="mb-4 w-full">
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-bet365-green focus:outline-none focus:ring-2 focus:ring-bet365-green"
              />
            </div>
            <div className="mb-6 w-full">
              <input
                type="password"
                placeholder="Password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-bet365-green focus:outline-none focus:ring-2 focus:ring-bet365-green"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full border border-bet365-green bg-bet365-green px-12 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-bet365-green-hover disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </form>
        </div>

        {/* Overlay */}
        <div className="overlay-container absolute left-1/2 top-0 z-20 h-full w-1/2 overflow-hidden transition-transform duration-700 ease-in-out">
          <div
            className="overlay relative -left-full h-full w-[200%] bg-gradient-to-r from-bet365-green to-bet365-green-light text-white transition-transform duration-700 ease-in-out"
            style={{
              transform: isSignUp ? "translateX(50%)" : "translateX(0)",
            }}
          >
            {/* Left Overlay Panel */}
            <div
              className="overlay-left absolute top-0 flex h-full w-1/2 flex-col items-center justify-center px-12 text-center transition-transform duration-700 ease-in-out"
              style={{
                transform: isSignUp ? "translateX(0)" : "translateX(-20%)",
              }}
            >
              <h1 className="mb-4 text-4xl font-bold">Welcome Back!</h1>
              <p className="mb-8 text-lg">
                To keep connected with us please login with your personal info
              </p>
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="rounded-full border-2 border-white bg-transparent px-12 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-bet365-green active:scale-95"
              >
                Sign In
              </button>
            </div>

            {/* Right Overlay Panel */}
            <div
              className="overlay-right absolute right-0 top-0 flex h-full w-1/2 flex-col items-center justify-center px-12 text-center transition-transform duration-700 ease-in-out"
              style={{
                transform: isSignUp ? "translateX(20%)" : "translateX(0)",
              }}
            >
              <h1 className="mb-4 text-4xl font-bold">Hello, Friend!</h1>
              <p className="mb-8 text-lg">
                Enter your personal details and start journey with us
              </p>
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="rounded-full border-2 border-white bg-transparent px-12 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-bet365-green active:scale-95"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
