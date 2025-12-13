// src/app/login/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailSignIn, emailSignUp } from "@/lib/auth";
import { ensureUserDoc } from "@/lib/user";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

import { motion } from "framer-motion";
import {
  AtSymbolIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  PhoneIcon,
  BuildingStorefrontIcon,
  MapPinIcon
} from "@heroicons/react/24/outline";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters"),
  registrationCode: z.string().optional(),
  role: z.enum(["admin", "vendor"]).optional(),

  // New Profile Fields
  name: z.string().optional(), // Required for reg
  phoneNumber: z.string().optional(), // Required for reg
  altPhone: z.string().optional(),
  storeName: z.string().optional(),
  storeAddress: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false); // Toggle state
  const router = useRouter();

  // Extended schema to handle optional registration code
  // Schema is defined outside component

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "vendor",
      email: "",
      password: ""
    }
  });

  const selectedRole = watch("role");

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      if (isRegistering) {
        // --- REGISTRATION LOGIC ---
        const code = values.registrationCode?.trim();
        const role = values.role || "vendor";

        if (!code) throw new Error("Please enter a registration code.");
        if (!values.name) throw new Error("Name is required.");
        if (!values.phoneNumber) throw new Error("Phone number is required.");

        if (role === 'vendor') {
          if (!values.storeName) throw new Error("Store Name is required.");
          if (!values.storeAddress) throw new Error("Store Address is required.");
        }

        // 1. Check Master Secrets (Env Vars)
        const masterSecret = role === "admin"
          ? process.env.NEXT_PUBLIC_ADMIN_SECRET
          : process.env.NEXT_PUBLIC_VENDOR_SECRET;

        let isValidInvite = false;
        let isMasterSecretUsed = false; // Flag to track if master secret was used

        if (code === masterSecret) {
          isValidInvite = true;
          isMasterSecretUsed = true;
        } else {
          // 2. Check Dynamic Invites (Firestore)
          const inviteRef = doc(db, "invites", code);
          const inviteSnap = await getDoc(inviteRef);

          if (inviteSnap.exists()) {
            const data = inviteSnap.data();
            if (data.role === role && !data.isUsed) {
              isValidInvite = true;
            } else if (data.isUsed) {
              throw new Error("This invite code has already been used.");
            } else {
              throw new Error("This code is for a different role.");
            }
          }
        }

        if (!isValidInvite) {
          throw new Error("Invalid Registration Code for " + role);
        }

        const user = await emailSignUp(values.email, values.password);

        // Save Extended Profile
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          role: role,
          name: values.name,
          phoneNumber: values.phoneNumber,
          altPhone: values.altPhone || "",
          storeName: values.storeName || "",
          storeAddress: values.storeAddress || "",
          isDisabled: false, // Default active
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Mark invite as used if it was a dynamic invite
        if (!isMasterSecretUsed) {
          try {
            await updateDoc(doc(db, "invites", code), {
              isUsed: true,
              usedBy: user.uid,
              usedAt: serverTimestamp()
            });
          } catch (updateError) {
            console.error("Failed to mark invite as used:", updateError);
          }
        }

        router.push(role === "admin" ? "/admin/orders" : "/vendor/orders");

      } else {
        // --- LOGIN LOGIC ---
        const user = await emailSignIn(values.email, values.password);

        // Check Access Logic
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists() && userSnap.data().isDisabled) {
          await signOut(auth);
          throw new Error("Your account has been disabled. Please contact support.");
        }

        const role = await ensureUserDoc(user.uid, user.email);
        router.push(role === "admin" ? "/admin/orders" : "/vendor/orders");
      }
    } catch (e: any) {
      console.error("Full Authentication Error:", e);
      // Firebase specific error mapping
      if (e.code === 'auth/invalid-credential') {
        setError("Invalid email or password.");
      } else if (e.code === 'auth/email-already-in-use') {
        setError("Email already in use.");
      } else {
        setError(e.message || "Authentication failed");
      }
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
        <div
          className="mx-auto flex w-full max-w-4xl overflow-hidden rounded-3xl border border-white/40 bg-white/60 shadow-2xl backdrop-blur-md md:flex-row"
        >
          {/* Left: Illustration */}
          <div className="relative h-56 w-full bg-gradient-to-br from-sky-100 via-indigo-100 to-pink-50 md:h-[600px] md:w-1/2">
            <Image
              src="/login-illustration.jpg"
              alt="Little Fellows mascot"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Right: Form */}
          <div className="w-full bg-gradient-to-br from-white/80 to-white/60 p-8 md:w-1/2 md:p-10 flex flex-col justify-center">
            <div className="mb-6 flex items-center gap-3">
              <Image src="/fellowe.png" alt="Little Fellows Logo" width={40} height={40} />
              <div>
                <h1 className="text-3xl font-bold leading-tight text-indigo-600">
                  {isRegistering ? "Create Account" : "Welcome back!"}
                </h1>
                <p className="text-sm text-gray-600">
                  {isRegistering
                    ? "Join as a Vendor or Admin."
                    : "Sign in with your credentials."}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* Email Logic */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
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

              {/* Password Logic */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
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
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* REGISTRATION FIELDS */}
              {isRegistering && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">

                  {/* Role Selection */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-900 mb-2">
                      I am signing up as:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={`cursor-pointer rounded-lg border p-2 text-center text-sm font-medium transition ${selectedRole === 'vendor' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}>
                        <input type="radio" value="vendor" {...register("role")} className="hidden" />
                        Vendor
                      </label>
                      <label className={`cursor-pointer rounded-lg border p-2 text-center text-sm font-medium transition ${selectedRole === 'admin' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}>
                        <input type="radio" value="admin" {...register("role")} className="hidden" />
                        Admin
                      </label>
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-gray-400">
                          <UserIcon className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          {...register("name")}
                          placeholder="John Doe"
                          className="w-full rounded-xl border border-indigo-200 bg-white px-10 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-gray-400">
                          <PhoneIcon className="h-4 w-4" />
                        </span>
                        <input
                          type="tel"
                          {...register("phoneNumber")}
                          placeholder="+91 98765 43210"
                          className="w-full rounded-xl border border-indigo-200 bg-white px-10 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vendor Specific Details */}
                  {selectedRole === 'vendor' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="h-px bg-indigo-200/50 my-2" />

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Store Name</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-gray-400">
                            <BuildingStorefrontIcon className="h-4 w-4" />
                          </span>
                          <input
                            type="text"
                            {...register("storeName")}
                            placeholder="My Awesome Print Store"
                            className="w-full rounded-xl border border-indigo-200 bg-white px-10 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Store Address</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-gray-400">
                            <MapPinIcon className="h-4 w-4" />
                          </span>
                          <input
                            type="text"
                            {...register("storeAddress")}
                            placeholder="123 Market Street, Mumbai"
                            className="w-full rounded-xl border border-indigo-200 bg-white px-10 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Alt. Phone <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-gray-400">
                            <PhoneIcon className="h-4 w-4" />
                          </span>
                          <input
                            type="tel"
                            {...register("altPhone")}
                            placeholder="Landline or backup mobile"
                            className="w-full rounded-xl border border-indigo-200 bg-white px-10 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Secret Code Input */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {selectedRole === 'admin' ? "Admin Secret Code" : "Vendor Secret Code"}
                    </label>
                    <input
                      type="password" // hide secret
                      {...register("registrationCode")}
                      placeholder="Enter the secure registration code"
                      className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50/80 p-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-violet-600 hover:shadow-indigo-500/25 disabled:opacity-50"
              >
                {isSubmitting
                  ? "Please wait…"
                  : isRegistering ? "Create Secure Account" : "Sign In"}
              </button>

              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError(null);
                  }}
                  className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition"
                >
                  {isRegistering
                    ? "Already have an account? Sign in"
                    : "Need an account? Create one"}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
