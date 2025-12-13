"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Plus, Search, Book, Calendar, MoreHorizontal,
    LayoutGrid, List, Filter, Loader2, Sparkles, Edit
} from "lucide-react";
import clsx from "clsx";

interface Story {
    id: string;
    title: string;
    description: string;
    coverImageUrl?: string;
    pageCount?: number;
    createdAt: string;
    status?: string;
}

export default function StoriesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [stories, setStories] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    useEffect(() => {
        const fetchStories = async () => {
            try {
                const res = await fetch("/api/stories");
                if (res.ok) {
                    const data = await res.json();
                    setStories(data);
                }
            } catch (error) {
                console.error("Failed to fetch stories", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStories();
    }, []);

    const filteredStories = stories.filter(story =>
        story.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                            Story Library
                            <span className="bg-indigo-100 text-indigo-700 text-sm font-bold px-3 py-1 rounded-full">
                                {stories.length}
                            </span>
                        </h1>
                        <p className="text-slate-500 mt-2 text-lg">Manage and organize your digital storybooks.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/stories/create"
                            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5"
                        >
                            <Plus size={20} className="stroke-[3px]" />
                            <span className="tracking-wide">Create New Story</span>
                        </Link>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl p-2 flex flex-col sm:flex-row gap-4 items-center justify-between transition-all">
                    {/* Search */}
                    <div className="relative w-full sm:max-w-md group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent rounded-xl text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        />
                    </div>

                    {/* View Toggles & Filters */}
                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={clsx(
                                    "p-2 rounded-md transition-all",
                                    viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={clsx(
                                    "p-2 rounded-md transition-all",
                                    viewMode === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <List size={18} />
                            </button>
                        </div>

                        <div className="h-6 w-px bg-slate-200 mx-2" />

                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
                            <Filter size={16} />
                            Filter
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                        <Loader2 size={48} className="animate-spin text-indigo-600 mb-4" />
                        <p className="font-medium animate-pulse">Loading library...</p>
                    </div>
                ) : filteredStories.length > 0 ? (
                    <div className={clsx(
                        "grid gap-8 pb-10",
                        viewMode === "grid"
                            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                            : "grid-cols-1"
                    )}>
                        {filteredStories.map((story) => (
                            <div
                                key={story.id}
                                className={clsx(
                                    "group relative bg-white border border-slate-200 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-100/50 hover:border-indigo-200",
                                    viewMode === "grid"
                                        ? "flex flex-col rounded-2xl overflow-hidden hover:-translate-y-1"
                                        : "flex flex-row items-center rounded-2xl p-4 gap-6 hover:bg-slate-50"
                                )}
                            >
                                {/* Cover Image - Link to Detail */}
                                <Link href={`/admin/stories/${story.id}`} className={clsx(
                                    "relative overflow-hidden bg-slate-100 block",
                                    viewMode === "grid" ? "aspect-[3/4] w-full" : "h-24 w-24 rounded-lg flex-shrink-0"
                                )}>
                                    {story.coverImageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={story.coverImageUrl}
                                            alt={story.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                                            <Book size={viewMode === "grid" ? 48 : 24} className="mb-2 opacity-50" />
                                            {viewMode === "grid" && <span className="text-xs font-bold uppercase tracking-wider">No Cover</span>}
                                        </div>
                                    )}

                                    {/* Gradient Overlay (Grid only) */}
                                    {viewMode === "grid" && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    )}

                                    {/* Floating Page Count Badge */}
                                    <div className="absolute top-3 right-3">
                                        <div className="bg-white/90 backdrop-blur-sm border border-white/20 px-2 py-1 rounded-md shadow-sm text-xs font-bold text-slate-800 flex items-center gap-1">
                                            <LayoutGrid size={12} className="text-indigo-500" />
                                            {story.pageCount || 0}
                                        </div>
                                    </div>
                                </Link>

                                {/* Content */}
                                <div className={clsx(
                                    "flex flex-col flex-1",
                                    viewMode === "grid" ? "p-5" : ""
                                )}>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1 w-full">
                                            <Link href={`/admin/stories/${story.id}`} className={clsx(
                                                "font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block",
                                                viewMode === "grid" ? "text-lg line-clamp-2 leading-tight" : "text-xl"
                                            )}>
                                                {story.title}
                                            </Link>
                                            {viewMode === "list" && (
                                                <p className="text-slate-500 line-clamp-1 max-w-2xl">{story.description}</p>
                                            )}
                                        </div>
                                        {viewMode === "list" && (
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/admin/stories/${story.id}/edit`}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Edit Story"
                                                >
                                                    <Edit size={18} />
                                                </Link>
                                                <Link
                                                    href={`/admin/stories/${story.id}`}
                                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                                                >
                                                    <MoreHorizontal size={20} />
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {viewMode === "grid" && (
                                        <>
                                            <p className="mt-2 text-sm text-slate-500 line-clamp-2 flex-grow">{story.description}</p>

                                            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    {new Date(story.createdAt).toLocaleDateString(undefined, {
                                                        month: 'short', day: 'numeric', year: 'numeric'
                                                    })}
                                                </div>
                                                <Link
                                                    href={`/admin/stories/${story.id}/edit`}
                                                    className="flex items-center gap-1 text-indigo-600 font-bold hover:text-indigo-700 hover:underline decoration-2 underline-offset-2 transition-all"
                                                >
                                                    <Edit size={14} />
                                                    Edit Story
                                                </Link>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 text-center">
                        <div className="h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                            <Sparkles size={40} className="text-indigo-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No stories found</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mb-8">
                            Your library is empty. Start creating amazing stories for your readers today.
                        </p>
                        <Link
                            href="/admin/stories/create"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5"
                        >
                            <Plus size={18} />
                            Create First Story
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
