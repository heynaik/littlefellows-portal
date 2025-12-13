"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Music, Play, Trash2, UploadCloud } from "lucide-react";
import { ChildProfileService, ChildProfile } from "@/lib/services/childProfileService";

interface VoiceControlProps {
    orderId: number | string;
    parentEmail: string;
    item: any;
}

export function VoiceControl({ orderId, parentEmail, item }: VoiceControlProps) {
    // State
    const [profile, setProfile] = useState<ChildProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Inputs
    const [voiceOwner, setVoiceOwner] = useState(""); // e.g. Dad
    const [file, setFile] = useState<File | null>(null);

    // Derived
    const childName = extractChildName(item);

    // Initial Fetch
    useEffect(() => {
        if (parentEmail && childName) {
            loadProfile();
        }
    }, [parentEmail, childName]);

    const loadProfile = async () => {
        setLoading(true);
        const p = await ChildProfileService.getProfile(parentEmail, childName);
        setProfile(p);
        if (p?.voiceOwner) setVoiceOwner(p.voiceOwner);
        setLoading(false);
    };

    const handleUpload = async () => {
        setErrorMsg("");
        if (!file || !voiceOwner) {
            setErrorMsg("Please provide both a name (Dad/Mom) and a voice file.");
            return;
        }

        setLoading(true);
        try {
            // 1. Get Presigned URL (AWS)
            const fileExt = file.name.split('.').pop();
            const fileName = `voice-${orderId}-${Date.now()}.${fileExt}`;

            const resUrl = await fetch(`/api/upload-url?fileName=${fileName}&contentType=${file.type}`);
            if (!resUrl.ok) throw new Error("Failed to get upload URL");

            const { url } = await resUrl.json();
            if (!url) throw new Error("Invalid upload URL");

            // 2. Upload to S3
            const uploadRes = await fetch(url, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
            });
            if (!uploadRes.ok) throw new Error("Failed to upload");

            // Check if local upload returned a specific path
            let publicUrl = "";
            const uploadJson = await uploadRes.json().catch(() => null); // parse JSON if possible
            if (uploadJson && uploadJson.path) {
                publicUrl = uploadJson.path;
            } else {
                // S3 Fallback (or if PUT returned empty body)
                publicUrl = url.split('?')[0];
            }

            // 3. Save to Digital Profile (Firestore)
            await ChildProfileService.saveVoice(parentEmail, childName, publicUrl, voiceOwner);

            // Reload
            await loadProfile();
            setFile(null);
            setVoiceOwner("");

        } catch (error: any) {
            console.error("Voice Upload Error:", error);
            setErrorMsg("Upload failed: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = () => {
        setShowConfirmDelete(true);
    };

    const confirmDelete = async () => {
        setLoading(true);
        setShowConfirmDelete(false);
        try {
            await ChildProfileService.deleteVoice(parentEmail, childName);
            await loadProfile();
        } catch (error: any) {
            console.error(error);
            setErrorMsg("Failed to delete voice: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    // If we can't identify the child, we can't create a profile easily
    if (!childName || childName === "Unknown Child") {
        return (
            <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 italic">
                {/* Could not identify child name for personalization.  - Clean up UI if not needed */}
            </div>
        );
    }

    // Check if Default Voice is selected
    const isDefaultVoice = item.meta_data?.some((m: any) => {
        const val = String(m.value || '').toLowerCase();
        return val.includes('default voice'); // Logic matches "Use a Default Voice"
    });

    if (isDefaultVoice) {
        return null; // Don't show anything if default voice is selected
    }

    const hasVoice = Boolean(profile?.voiceUrl);

    return (
        <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Music size={16} className="text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Add Voice of Loved One: <span className="text-indigo-600">{childName}</span>
                    </span>
                </div>
                {/* Connection Status Badge */}
                {profile ? (
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">Connected</span>
                ) : (
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">New Profile</span>
                )}
            </div>

            {hasVoice ? (
                <div className="flex flex-col gap-3 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <Play size={12} fill="currentColor" />
                            </div>
                            <span className="text-sm font-bold text-slate-800">{profile?.voiceOwner || "Voice"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {profile?.voiceUrl && (
                                <a
                                    href={profile.voiceUrl}
                                    download={`voice-${childName}.mp3`}
                                    className="p-1 px-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md transition-all flex items-center gap-1"
                                    title="Download Voice"
                                >
                                    <Download size={14} />
                                </a>
                            )}
                            {showConfirmDelete ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-red-600 uppercase">Sure?</span>
                                    <button
                                        type="button"
                                        onClick={confirmDelete}
                                        disabled={loading}
                                        className="p-1 px-2 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700"
                                    >
                                        Yes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmDelete(false)}
                                        disabled={loading}
                                        className="p-1 px-2 bg-slate-200 text-slate-600 rounded text-xs font-bold hover:bg-slate-300"
                                    >
                                        No
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleDeleteClick}
                                    disabled={loading}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                    title="Delete Voice"
                                >
                                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                            )}
                        </div>
                    </div>
                    <audio controls src={profile?.voiceUrl || ""} className="w-full h-8" />

                    {errorMsg && (
                        <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100">
                            {errorMsg}
                        </p>
                    )}
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    <input
                        type="text"
                        placeholder="Voice Owner (e.g. Dad)"
                        className="flex-1 min-w-[140px] text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                        value={voiceOwner}
                        onChange={e => setVoiceOwner(e.target.value)}
                    />
                    <div className="relative flex-1 min-w-[140px]">
                        <input
                            type="file"
                            accept="audio/*"
                            onChange={e => setFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                        />
                        <div className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-center hover:bg-slate-50">
                            <span className="text-xs font-medium text-slate-500 flex items-center justify-center gap-2 truncate">
                                <UploadCloud size={14} />
                                {file ? file.name : "Select Audio"}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={loading || !file || !voiceOwner}
                        className="bg-slate-900 text-white font-bold py-2 px-4 rounded-lg text-sm shadow hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : "Save"}
                    </button>
                </div>
            )}

            {errorMsg && !hasVoice && (
                <p className="mt-2 text-xs text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100">
                    {errorMsg}
                </p>
            )}
        </div>
    );
}

function extractChildName(item: any): string {
    if (!item?.meta_data) return "Unknown Child";

    // Search common naming keys
    const nameKeys = ['child name', 'child_name', 'name', 'kid name', 'kid_name', 'boy name', 'girl name', 'personalization'];

    for (const meta of item.meta_data) {
        const k = (meta.key || '').toLowerCase();
        // Skip irrelevant keys
        if (k.includes('price') || k.includes('upload') || k.includes('voice')) continue;

        if (nameKeys.some(key => k.includes(key))) {
            return String(meta.value).trim();
        }
    }

    return "Unknown Child";
}
