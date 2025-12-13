"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, ChevronRight, Check, Image as ImageIcon, User, Tag, Smile, Star,
    BookOpen, FileText, Loader2, Plus, Trash2, ArrowUp, ArrowDown
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";

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

    // Step 2 - Refactored to Array
    pages: z.array(z.object({
        title: z.string().min(1, "Page title is required"),
        content: z.string().min(1, "Page content is required"),
        imagePrompt: z.string().optional()
    })).min(1, "At least one page is required"),

    narrationFlow: z.string().optional(),
});

type StoryFormData = z.infer<typeof storySchema>;

export default function EditStoryPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStepping, setIsStepping] = useState(false);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [existingCoverKey, setExistingCoverKey] = useState<string | null>(null);
    const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);

    const {
        register,
        control,
        watch,
        handleSubmit,
        trigger,
        reset,
        formState: { errors },
    } = useForm<StoryFormData>({
        resolver: zodResolver(storySchema),
        mode: "onChange",
        defaultValues: {
            pageCount: 0,
            pages: [{ title: "Page 1", content: "", imagePrompt: "" }],
            narrationFlow: ""
        }
    });

    const { fields, append, remove, move } = useFieldArray({
        control,
        name: "pages",
    });

    // Fetch story data
    useEffect(() => {
        async function fetchStory() {
            if (!id) return;
            try {
                const res = await fetch(`/api/stories/${id}`);
                if (!res.ok) throw new Error("Failed to fetch story");
                const data = await res.json();

                reset({
                    title: data.title,
                    description: data.description,
                    idealFor: data.idealFor,
                    ageRange: data.ageRange,
                    character: data.character,
                    genre: data.genre,
                    pageCount: data.pageCount,
                    // Directly use the pages array from DB
                    pages: data.pages || [{ title: "Page 1", content: "", imagePrompt: "" }],
                    narrationFlow: data.narrationFlow || "",
                });

                if (data.coverImageUrl) {
                    setCoverPreview(data.coverImageUrl);
                    setExistingCoverUrl(data.coverImageUrl);
                }
                if (data.coverImageKey) {
                    setExistingCoverKey(data.coverImageKey);
                }

                setIsLoading(false);
            } catch (error) {
                console.error(error);
                alert("Failed to load story data");
                router.push("/admin/stories");
            }
        }

        fetchStory();
    }, [id, reset, router]);


    // Watch cover image for preview
    const coverImageFiles = watch("coverImage");

    useEffect(() => {
        if (coverImageFiles && coverImageFiles.length > 0) {
            const file = coverImageFiles[0];
            const url = URL.createObjectURL(file);
            setCoverPreview(url);

            // Cleanup to avoid memory leaks
            return () => URL.revokeObjectURL(url);
        }
    }, [coverImageFiles]);

    const nextStep = async (e?: React.MouseEvent) => {
        e?.preventDefault();

        if (isStepping) return;

        setIsStepping(true);

        let fieldsToValidate: (keyof StoryFormData)[] = [];
        if (currentStep === 1) {
            fieldsToValidate = ["title", "description", "idealFor", "ageRange", "character", "genre", "pageCount"];
        }

        const isStepValid = await trigger(fieldsToValidate);

        if (isStepValid) {
            setCurrentStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            // Debounce: Keep navigation locked for 500ms to prevent accidental double-clicks matching the next button
            setTimeout(() => setIsStepping(false), 500);
        } else {
            setIsStepping(false);
        }
    };

    const prevStep = () => {
        setCurrentStep(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const onSubmit = async (data: StoryFormData) => {
        // Prevent submission on Step 1
        if (currentStep !== 2) {
            await nextStep();
            return;
        }

        try {
            setIsSubmitting(true);
            let coverImageKey = existingCoverKey;
            let coverImageUrl = existingCoverUrl;

            // 1. Upload NEW Image if selected
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

            // 2. Prepare payload - Pages are already in correct format
            const payload = {
                title: data.title,
                description: data.description,
                character: data.character,
                genre: data.genre,
                ageRange: data.ageRange,
                idealFor: data.idealFor,
                pageCount: data.pageCount,
                narrationFlow: data.narrationFlow,
                pages: data.pages, // Direct assignment
                coverImageKey,
                coverImageUrl,
            };

            const saveRes = await fetch(`/api/stories/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!saveRes.ok) {
                const err = await saveRes.json();
                throw new Error(err.error || "Failed to update story");
            }

            alert("Story updated successfully!");
            router.push(`/admin/stories/${id}`);

        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            alert(`Error: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-24 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="py-8">
                <Link href={`/admin/stories/${id}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 mb-6 transition-colors">
                    <ArrowLeft size={16} />
                    Back to Detail
                </Link>
                <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Edit Story</h1>
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Editing</span>
                </div>

                <p className="text-lg text-slate-600 mt-2 max-w-2xl">Update the story details below.</p>
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
                    <div key="step-1" className="space-y-8 animate-in slide-in-from-right-8 duration-300">
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
                    <div key="step-2" className="space-y-8 animate-in slide-in-from-right-8 duration-300">

                        {/* Pages Editor */}
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                    <FileText className="text-indigo-600" />
                                    Story Pages
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => append({ title: `Page ${fields.length + 1}`, content: "", imagePrompt: "" })}
                                    className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors border border-indigo-200 dashed"
                                >
                                    <Plus size={16} />
                                    Add Page
                                </button>
                            </div>

                            <div className="space-y-6">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative group transition-all hover:border-indigo-200 hover:shadow-md">
                                        {/* Actions */}
                                        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => index > 0 && move(index, index - 1)}
                                                disabled={index === 0}
                                                className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                                            >
                                                <ArrowUp size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => index < fields.length - 1 && move(index, index + 1)}
                                                disabled={index === fields.length - 1}
                                                className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                                            >
                                                <ArrowDown size={18} />
                                            </button>
                                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                className="p-1 text-slate-400 hover:text-red-600"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Page Title & Content */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold border border-slate-200">
                                                        {index + 1}
                                                    </span>
                                                    <input
                                                        {...register(`pages.${index}.title` as const)}
                                                        className="block w-full border-none p-0 text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:ring-0"
                                                        placeholder="Page Title"
                                                    />
                                                </div>
                                                <textarea
                                                    {...register(`pages.${index}.content` as const)}
                                                    rows={5}
                                                    className="block w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-base shadow-sm focus:border-indigo-500 focus:ring-indigo-500 placeholder:text-slate-400 font-serif"
                                                    placeholder="Write the story text for this page..."
                                                />
                                                {errors.pages?.[index]?.content && (
                                                    <p className="text-xs text-red-500 font-medium">{errors.pages[index]?.content?.message}</p>
                                                )}
                                            </div>

                                            {/* Image Prompt */}
                                            <div className="space-y-2">
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Image Prompt</label>
                                                <textarea
                                                    {...register(`pages.${index}.imagePrompt` as const)}
                                                    rows={5}
                                                    className="block w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-inner focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 placeholder:text-slate-400 italic"
                                                    placeholder="Describe the image for this page..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => append({ title: `Page ${fields.length + 1}`, content: "", imagePrompt: "" })}
                                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={20} />
                                    Add Another Page
                                </button>
                            </div>
                        </div>

                        {/* Narration Script */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 mt-8">
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
                                disabled={isStepping}
                                className={clsx(
                                    "inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all",
                                    isStepping ? "opacity-50 cursor-wait" : "hover:bg-indigo-500 hover:shadow-lg hover:-translate-y-0.5"
                                )}
                            >
                                Next Step
                                <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isSubmitting || isStepping}
                                className={clsx(
                                    "inline-flex items-center gap-2 rounded-full px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5",
                                    (isSubmitting || isStepping) ? "bg-slate-400 cursor-wait" : "bg-green-600 hover:bg-green-500 shadow-green-200 hover:shadow-lg"
                                )}
                            >
                                {isSubmitting ? (
                                    <>Saving...</>
                                ) : (
                                    <>
                                        <Check size={18} />
                                        Update Story
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
