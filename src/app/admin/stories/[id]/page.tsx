"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, User, Tag, Smile, Star, Calendar, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

interface StoryPage {
    title: string;
    content: string;
    imagePrompt?: string;
}

interface Story {
    id: string;
    title: string;
    description: string;
    coverImageUrl?: string;
    character: string;
    genre: string;
    ageRange: string;
    idealFor: string;
    pageCount: number;
    pages: StoryPage[];
    narrationFlow?: string;
    createdAt: string;
}

export default function StoryDetailPage() {
    const params = useParams();
    const router = useRouter(); // Use Next.js router
    const [story, setStory] = useState<Story | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Delete State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // UI State
    const [isPagesExpanded, setIsPagesExpanded] = useState(true);



    const CopyButton = ({ text, className = "" }: { text: string, className?: string }) => {
        const [copied, setCopied] = useState(false);
        const handleCopy = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent card click
            if (text) {
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        };
        return (
            <button
                type="button"
                onClick={handleCopy}
                className={`p-2 text-indigo-600 bg-white/50 hover:bg-white rounded-lg shadow-sm border border-indigo-100 hover:border-indigo-300 transition-all z-20 hover:scale-105 active:scale-95 ${className}`}
                title="Copy to clipboard"
            >
                {copied ? <Check size={16} className="text-green-600 stroke-[3px]" /> : <Copy size={16} className="stroke-[2px]" />}
            </button>
        );
    };

    useEffect(() => {
        const fetchStory = async () => {
            try {
                // Determine ID: handle wrapped params if necessary (though usually transparent in client components)
                // But for safety with Next 15 changes, we rely on the hook returning the string directly usually.
                // If params is a promise (Next 15 server components), client components unwrap it via `useParams`.
                const id = params?.id;
                if (!id) return;

                const res = await fetch(`/api/stories/${id}`);
                if (!res.ok) throw new Error("Failed to fetch story");
                const data = await res.json();
                setStory(data);
            } catch (err) {
                const message = err instanceof Error ? err.message : "An error occurred";
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchStory();
    }, [params]);

    const handleDelete = async () => {
        if (!story) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/stories/${story.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            // Use router for smooth transition
            router.push("/admin/stories");
        } catch (err) {
            console.error(err);
            alert("Error deleting story");
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
            </div>
        );
    }

    if (error || !story) {
        return (
            <div className="flex h-96 flex-col items-center justify-center text-center">
                <p className="text-red-500 font-medium mb-2">Error loading story</p>
                <p className="text-slate-500">{error || "Story not found"}</p>
                <Link href="/admin/stories" className="mt-4 text-indigo-600 hover:underline">Back to Stories</Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-16 px-4 sm:px-6 lg:px-8 space-y-8 relative">
            {/* Header */}
            <div className="py-6">
                <div className="flex justify-between items-center mb-6">
                    <Link href="/admin/stories" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Stories
                    </Link>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="inline-flex items-center gap-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
                        >
                            Delete
                        </button>
                        <Link
                            href={`/admin/stories/${story.id}/edit`}
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md"
                        >
                            Edit Story
                        </Link>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Cover Image */}
                    <div className="w-full md:w-1/3 max-w-[300px] aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 shadow-lg border border-slate-200 relative">
                        {story.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={story.coverImageUrl} alt={story.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <span>No Cover</span>
                            </div>
                        )}
                    </div>

                    {/* Meta Data */}
                    <div className="flex-1 space-y-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">{story.title}</h1>
                            <p className="text-lg text-slate-600 leading-relaxed">{story.description}</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <span className="block text-xs uppercase text-slate-400 font-bold mb-1">Character</span>
                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                    <User size={16} className="text-indigo-500" />
                                    {story.character}
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <span className="block text-xs uppercase text-slate-400 font-bold mb-1">Genre</span>
                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                    <Tag size={16} className="text-indigo-500" />
                                    {story.genre}
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <span className="block text-xs uppercase text-slate-400 font-bold mb-1">Age Range</span>
                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                    <Smile size={16} className="text-indigo-500" />
                                    {story.ageRange}
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <span className="block text-xs uppercase text-slate-400 font-bold mb-1">Ideal For</span>
                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                    <Star size={16} className="text-indigo-500" />
                                    {story.idealFor}
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <span className="block text-xs uppercase text-slate-400 font-bold mb-1">Pages</span>
                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                    <BookOpen size={16} className="text-indigo-500" />
                                    {story.pageCount}
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <span className="block text-xs uppercase text-slate-400 font-bold mb-1">Created</span>
                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                    <Calendar size={16} className="text-indigo-500" />
                                    {new Date(story.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs / Sections */}
            <div className="space-y-8">
                {/* Pages Section */}
                <div className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-200">
                    <button
                        onClick={() => setIsPagesExpanded(!isPagesExpanded)}
                        className="w-full flex items-center justify-between group mb-2"
                    >
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <BookOpen className="text-indigo-600" />
                            Story Pages
                            <span className="bg-indigo-100 text-indigo-700 text-sm font-bold px-3 py-1 rounded-full ml-2">
                                {story.pages.length}
                            </span>
                        </h2>
                        <div className="p-2 bg-white rounded-full text-slate-400 group-hover:text-indigo-600 shadow-sm transition-colors">
                            {isPagesExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                    </button>

                    {isPagesExpanded && (
                        <div className="grid grid-cols-1 gap-6 mt-6 animate-in slide-in-from-top-4 duration-300">
                            {story.pages.map((page, index) => (
                                <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500"></div>
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <div className="flex-1 relative">
                                            <div className="absolute top-0 right-0">
                                                <CopyButton text={page.content} />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-3">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold border border-indigo-100">
                                                    {index + 1}
                                                </span>
                                                {page.title}
                                            </h3>
                                            <p className="text-slate-600 font-serif text-lg leading-relaxed whitespace-pre-wrap pr-10">{page.content}</p>
                                        </div>
                                        {page.imagePrompt && (
                                            <div className="w-full md:w-1/3 bg-slate-50 rounded-xl p-4 border border-slate-100 h-fit relative">
                                                <div className="absolute top-4 right-4">
                                                    <CopyButton text={page.imagePrompt || ""} />
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Image Prompt</p>
                                                <p className="text-sm text-slate-500 italic pr-8">{page.imagePrompt}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Narration Section */}
                {story.narrationFlow && (
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <span className="text-2xl">🎙️</span>
                            Narration Script
                        </h2>
                        <div className="bg-slate-900 rounded-2xl p-6 md:p-8 shadow-lg text-slate-300 font-mono text-sm leading-7 whitespace-pre-wrap relative group">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <CopyButton text={story.narrationFlow} className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-slate-500" />
                            </div>
                            {story.narrationFlow}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Story?</h3>
                        <p className="text-slate-600 mb-6">
                            Are you sure you want to delete <span className="font-semibold">&quot;{story.title}&quot;</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all"
                            >
                                {isDeleting ? "Deleting..." : "Delete Story"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
