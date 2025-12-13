"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Music, Play, User, Calendar, Mail } from "lucide-react";
import { ChildProfileService, ChildProfile } from "@/lib/services/childProfileService";

export default function ChildProfilesPage() {
    const [profiles, setProfiles] = useState<ChildProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfiles();
    }, []);

    async function loadProfiles() {
        setLoading(true);
        const data = await ChildProfileService.getAllProfiles();
        setProfiles(data);
        setLoading(false);
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Child Profiles</h1>
                    <p className="text-slate-500 text-sm mt-1">Digital profiles and voice assets for retargeting.</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold uppercase text-slate-400">Total Profiles</p>
                    <p className="text-2xl font-black text-indigo-600">{profiles.length}</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20 text-slate-400">
                    <Loader2 className="animate-spin mr-2" /> Loading profiles...
                </div>
            ) : profiles.length === 0 ? (
                <div className="text-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400">
                    No child profiles found.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map((profile) => (
                        <div key={profile.id} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                        {profile.childName[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 leading-tight">{profile.childName}</h3>
                                        <p className="text-xs text-slate-500">Little Fellow</p>
                                    </div>
                                </div>
                                {profile.voiceUrl ? (
                                    <span className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded border border-green-100">
                                        Voiced
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-100">
                                        Silent
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Mail size={14} className="text-slate-400" />
                                    <span className="truncate">{profile.parentEmail}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Calendar size={14} className="text-slate-400" />
                                    <span>Joined {profile.createdAt?.seconds ? format(new Date(profile.createdAt.seconds * 1000), "MMM d, yyyy") : "Recently"}</span>
                                </div>
                            </div>

                            {profile.voiceUrl ? (
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                                            <Play size={10} fill="currentColor" />
                                        </div>
                                        <div className="text-xs font-bold text-slate-700">
                                            Recorded by {profile.voiceOwner || "Parent"}
                                        </div>
                                    </div>
                                    <audio controls src={profile.voiceUrl} className="w-full h-8" />
                                </div>
                            ) : (
                                <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200 text-center">
                                    <Music className="mx-auto text-slate-300 mb-1" size={20} />
                                    <p className="text-xs text-slate-400 font-medium">No voice recorded yet.</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
