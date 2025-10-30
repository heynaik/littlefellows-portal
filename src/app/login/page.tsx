// src/app/login/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailSignIn } from "../../lib/auth";
import { ensureUserDoc } from "../../lib/user";
import { useRouter } from "next/navigation";

import { motion } from "framer-motion";
import {
  AtSymbolIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const user = await emailSignIn(values.email, values.password);
      // ensure user doc + get role (defaults to vendor if first time)
      const role = await ensureUserDoc(user.uid, user.email);
      router.push(role === "admin" ? "/admin/orders" : "/vendor/orders");
    } catch {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#E9ECFF] via-white to-[#F7F9FF]">
      {/* animated blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-200/70 blur-3xl"
          style={{ animation: "blob 14s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-violet-200/60 blur-3xl"
          style={{ animation: "blob 16s ease-in-out infinite" }}
        />
        <div
          className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-200/50 blur-3xl"
          style={{ animation: "blob 18s ease-in-out infinite" }}
        />
      </div>

      {/* star pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px] opacity-30" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mx-auto flex w-full max-w-4xl overflow-hidden rounded-3xl border border-white/40 bg-white/60 shadow-2xl backdrop-blur-md md:flex-row"
        >
          {/* Left: Illustration */}
          <div className="relative h-56 w-full bg-gradient-to-br from-sky-100 via-indigo-100 to-pink-50 md:h-[480px] md:w-1/2">
            <Image
              src="/login-illustration.jpg"
              alt="Little Fellows mascot"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Right: Form */}
          <div className="w-full bg-gradient-to-br from-white/80 to-white/60 p-8 md:w-1/2 md:p-10">
            <div className="mb-6 flex items-center gap-3">
              <Image src="/fellowe.png" alt="Little Fellows Logo" width={40} height={40} />
              <div>
                <h1 className="text-3xl font-bold leading-tight text-indigo-600">
                  Welcome back!
                </h1>
                <p className="text-sm text-gray-600">
                  Sign in with your admin or vendor credentials.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-gray-400">
                    <AtSymbolIcon className="h-5 w-5" />
                  </span>
                  <input
                    type="email"
                    {...register("email")}
                    placeholder="you@littlefellows.com"
                    className="w-full rounded-xl border border-gray-300/80 bg-white/80 px-10 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <Link href="#" className="text-xs text-indigo-600 hover:underline">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-gray-400">
                    <LockClosedIcon className="h-5 w-5" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-gray-300/80 bg-white/80 px-10 py-2.5 pr-12 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2.5 top-2.5 rounded-md p-1 text-gray-500 hover:bg-gray-100/60"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50/80 p-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 font-medium text-white shadow-md transition hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50"
              >
                {isSubmitting ? "Signing in…" : "Sign in"}
              </button>

              <p className="pt-1 text-center text-xs text-gray-500">
                By continuing you agree to our{" "}
                <Link href="#" className="underline">Terms</Link> and{" "}
                <Link href="#" className="underline">Privacy Policy</Link>.
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
