"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Check, Image as ImageIcon, User, Tag, Smile, Star, BookOpen, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { toast } from "sonner";

// Types
type Step = 1 | 2;

const steps = [
    { id: 1, name: "Story Details" },
    { id: 2, name: "Content & Narration" },
];

// Validation Schema
const storySchema = z.object({
    // Step 1
    coverImage: z.any().optional(),
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    idealFor: z.string().min(1, "Ideal For is required"),
    ageRange: z.string().min(1, "Age Range is required"),
    character: z.string().min(1, "Character is required"),
    genre: z.string().min(1, "Genre is required"),
    pageCount: z.number(),

    // Step 2
    storyContent: z.string().min(10, "Story content is required"),
    narrationFlow: z.string().optional(),
});

type StoryFormData = z.infer<typeof storySchema>;

export default function CreateStoryPage() {
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    const router = useRouter();

    const {
        register,
        watch,
        handleSubmit,
        trigger,
        formState: { errors },
    } = useForm<StoryFormData>({
        resolver: zodResolver(storySchema),
        mode: "onChange",
        defaultValues: {
            pageCount: 0,
            storyContent: "",
            narrationFlow: ""
        }
    });

    // Watch cover image for preview
    const coverImageFiles = watch("coverImage");
    if (coverImageFiles && coverImageFiles.length > 0 && !coverPreview) {
        const file = coverImageFiles[0];
        const url = URL.createObjectURL(file);
        setCoverPreview(url);
    }

    const nextStep = async () => {
        let fieldsToValidate: (keyof StoryFormData)[] = [];
        if (currentStep === 1) {
            fieldsToValidate = ["title", "description", "idealFor", "ageRange", "character", "genre", "pageCount"];
        }

        const isStepValid = await trigger(fieldsToValidate);
        if (isStepValid) {
            setCurrentStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const prevStep = () => {
        setCurrentStep(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const onSubmit = async (data: StoryFormData) => {
        try {
            setIsSubmitting(true);
            let coverImageKey = null;
            let coverImageUrl = null;

            // 1. Upload Image if present
            if (data.coverImage && data.coverImage.length > 0) {
                const file = data.coverImage[0];
                const filename = file.name;
                const contentType = file.type;

                const res = await fetch(`/api/upload-url?fileName=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`);
                if (!res.ok) throw new Error("Failed to get upload URL");
                const { url, key, isLocal } = await res.json();

                const uploadRes = await fetch(url, {
                    method: "PUT",
                    body: file,
                    headers: { "Content-Type": contentType },
                });

                if (!uploadRes.ok) throw new Error("Failed to upload image");

                coverImageKey = key;

                if (isLocal) {
                    const uploadData = await uploadRes.json();
                    coverImageUrl = uploadData.path;
                } else {
                    coverImageUrl = url.split("?")[0];
                }
            }

            // 2. Process Story Content -> Pages
            // Split by double newlines to create simple pages
            const rawPages = data.storyContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
            const pages = rawPages.map((content, index) => ({
                title: `Page ${index + 1}`,
                content: content.trim(),
                imagePrompt: "" // No prompt generation in this simplified flow yet
            }));

            const payload = {
                title: data.title,
                description: data.description,
                character: data.character,
                genre: data.genre,
                ageRange: data.ageRange,
                idealFor: data.idealFor,
                pageCount: data.pageCount,
                narrationFlow: data.narrationFlow,
                pages, // The processed pages array
                coverImageKey,
                coverImageUrl,
            };

            const response = await fetch("/api/stories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                toast.success("Story created successfully!");
                router.push('/admin/stories');
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to create story');
            }

        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            toast.error(`Error: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-24 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="py-8">
                <Link href="/admin/stories" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 mb-6 transition-colors">
                    <ArrowLeft size={16} />
                    Back to Stories
                </Link>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Create New Story</h1>
                <p className="text-lg text-slate-600 mt-2 max-w-2xl">Follow the steps below to publish a new story book to the library.</p>
            </div>

            {/* Progress Steps */}
            <div className="mb-12">
                <div className="flex items-center justify-between relative max-w-lg mx-auto">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10 rounded-full" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 -z-10 rounded-full transition-all duration-500 ease-in-out"
                        style={{ width: `${((currentStep - 1) / 1) * 100}%` }} />

                    {steps.map((step) => {
                        const isActive = currentStep >= step.id;
                        const isCurrent = currentStep === step.id;
                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-4">
                                <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ring-4 ring-white",
                                    isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-200 text-slate-500"
                                )}>
                                    {isActive && step.id < currentStep ? <Check size={18} /> : step.id}
                                </div>
                                <span className={clsx(
                                    "text-xs font-semibold uppercase tracking-wider transition-colors",
                                    isCurrent ? "text-indigo-600" : "text-slate-400"
                                )}>{step.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                {/* Step 1: Details */}
                {currentStep === 1 && (
                    <div key="step-1" className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Image */}
                            <div className="lg:col-span-1">
                                <label className="block text-sm font-bold text-slate-900 mb-2">Cover Image</label>
                                <div className={clsx(
                                    "relative aspect-[3/4] w-full rounded-2xl border-2 border-dashed transition-all overflow-hidden bg-slate-50 group",
                                    errors.coverImage ? "border-red-300 bg-red-50" : "border-slate-300 hover:border-indigo-400"
                                )}>
                                    {coverPreview ? (
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white font-medium text-sm">Change Image</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
                                            <ImageIcon size={48} className="mb-4 opacity-50" />
                                            <p className="text-sm font-medium">Click to upload cover</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        {...register("coverImage")}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-slate-500 text-center">Recommended: 3:4 Portrait</p>
                            </div>

                            {/* Right Column: Inputs */}
                            <div className="lg:col-span-2 space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2">Story Title</label>
                                    <input
                                        {...register("title")}
                                        className="block w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-lg font-medium shadow-sm transition-all focus:border-indigo-500 focus:ring-indigo-500 placeholder:text-slate-400"
                                        placeholder="e.g. The Magical Treehouse"
                                    />
                                    {errors.title && <p className="mt-1 text-sm text-red-500 font-medium">{errors.title.message}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2">Description</label>
                                    <textarea
                                        {...register("description")}
                                        rows={3}
                                        className="block w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-base shadow-sm transition-all focus:border-indigo-500 focus:ring-indigo-500 placeholder:text-slate-400"
                                        placeholder="A short summary of what this story is about..."
                                    />
                                    {errors.description && <p className="mt-1 text-sm text-red-500 font-medium">{errors.description.message}</p>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative">
                                        <label className="block text-sm font-bold text-slate-900 mb-2">Main Character</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <User size={18} />
                                            </div>
                                            <input
                                                {...register("character")}
                                                className="block w-full rounded-xl border-slate-200 pl-10 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                                                placeholder="e.g. Leo the Lion"
                                            />
                                        </div>
                                        {errors.character && <p className="mt-1 text-sm text-red-500">{errors.character.message}</p>}
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-bold text-slate-900 mb-2">Genre</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <Tag size={18} />
                                            </div>
                                            <input
                                                {...register("genre")}
                                                className="block w-full rounded-xl border-slate-200 pl-10 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                                                placeholder="e.g. Adventure"
                                            />
                                        </div>
                                        {errors.genre && <p className="mt-1 text-sm text-red-500">{errors.genre.message}</p>}
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-bold text-slate-900 mb-2">Age Range</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <Smile size={18} />
                                            </div>
                                            <input
                                                {...register("ageRange")}
                                                className="block w-full rounded-xl border-slate-200 pl-10 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                                                placeholder="e.g. 3-5 years"
                                            />
                                        </div>
                                        {errors.ageRange && <p className="mt-1 text-sm text-red-500">{errors.ageRange.message}</p>}
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-bold text-slate-900 mb-2">Ideal For</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <Star size={18} />
                                            </div>
                                            <input
                                                {...register("idealFor")}
                                                className="block w-full rounded-xl border-slate-200 pl-10 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                                                placeholder="e.g. Bedtime"
                                            />
                                        </div>
                                        {errors.idealFor && <p className="mt-1 text-sm text-red-500">{errors.idealFor.message}</p>}
                                    </div>

                                    <div className="relative md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-900 mb-2">Total Pages</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <BookOpen size={18} />
                                            </div>
                                            <input
                                                type="number"
                                                {...register("pageCount", { valueAsNumber: true })}
                                                className="block w-full rounded-xl border-slate-200 pl-10 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                                                placeholder="e.g. 12"
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">Total number of pages in the physical or digital book.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Content & Narration */}
                {currentStep === 2 && (
                    <div key="step-2" className="space-y-8">
                        {/* Story Content */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <FileText className="text-indigo-600" />
                                Story Content
                            </h2>
                            <p className="text-slate-500 mb-6">Paste the full story text below. We will automatically split paragraphs into pages.</p>
                            <textarea
                                {...register("storyContent")}
                                rows={12}
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 px-6 py-4 text-base shadow-inner focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all font-serif leading-relaxed"
                                placeholder="Once upon a time...&#10;&#10;On the next page..."
                            />
                            {errors.storyContent && <p className="mt-2 text-sm text-red-500 font-medium">{errors.storyContent.message}</p>}
                        </div>

                        {/* Narration Script */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <span className="text-2xl">🎙️</span>
                                Narration Script
                            </h2>
                            <p className="text-slate-500 mb-6">This script guides the audio narration. Include scene descriptions and cues.</p>
                            <textarea
                                {...register("narrationFlow")}
                                rows={8}
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 px-6 py-4 text-sm font-mono leading-7 shadow-inner focus:bg-white focus:border-indigo-500 focus:ring-indigo-500"
                                placeholder="[SCENE START]&#10;NARRATOR: (Softly) Once upon a time..."
                            />
                        </div>
                    </div>
                )}

                {/* Sticky Footer */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-50">
                    <div className="max-w-5xl mx-auto flex justify-between items-center">
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className={clsx(
                                "px-6 py-2.5 rounded-full text-sm font-bold transition-all",
                                currentStep === 1
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200"
                            )}
                        >
                            Back
                        </button>

                        {currentStep < 2 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-500 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                            >
                                Next Step
                                <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={clsx(
                                    "inline-flex items-center gap-2 rounded-full px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5",
                                    isSubmitting ? "bg-slate-400 cursor-wait" : "bg-green-600 hover:bg-green-500 shadow-green-200 hover:shadow-lg"
                                )}
                            >
                                {isSubmitting ? (
                                    <>Saving...</>
                                ) : (
                                    <>
                                        <Check size={18} />
                                        Publish Story
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
