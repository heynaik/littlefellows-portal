"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    setDoc,
    doc,
    deleteDoc
} from "firebase/firestore";
import { useAuthUser } from "@/lib/auth";
import { Trash2 } from "lucide-react";

interface Invite {
    code: string;
    role: "admin" | "vendor";
    isUsed: boolean;
    createdAt: any;
    usedBy?: string;
}

export default function AdminInvitesPage() {
    const { user } = useAuthUser(); // Assume admin check is handled by layout/middleware
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedRole, setSelectedRole] = useState<"vendor" | "admin">("vendor");

    // Load Invites
    useEffect(() => {
        const q = query(
            collection(db, "invites"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                code: doc.id,
                ...doc.data()
            })) as Invite[];
            setInvites(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const generateCode = async () => {
        setGenerating(true);
        try {
            // Create a random readable code (e.g. VENDOR-XY92)
            const prefix = selectedRole.toUpperCase();
            const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
            const code = `${prefix}-${randomPart}`;

            await setDoc(doc(db, "invites", code), {
                role: selectedRole,
                isUsed: false,
                createdBy: user?.uid,
                createdAt: serverTimestamp(),
            });

        } catch (e) {
            console.error("Error generating invite:", e);
            alert("Failed to create invite.");
        } finally {
            setGenerating(false);
        }
    };

    const handleDelete = async (code: string) => {
        console.log("Attempting to delete:", code);
        // if (!confirm("Are you sure you want to delete this invite?")) {
        //     console.log("Delete cancelled by user");
        //     return;
        // }

        try {
            console.log("Calling deleteDoc...");
            await deleteDoc(doc(db, "invites", code));
            console.log("Delete success");
        } catch (e) {
            console.error("Failed to delete:", e);
            alert("Failed to delete invite: " + (e as any).message);
        }
    };

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Invites</h1>
                    <p className="text-gray-500">Generate secure registration codes for your team.</p>
                </div>
            </div>

            {/* Generator Card */}
            <div className="mb-10 max-w-xl rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-800">Create New Invite</h2>
                <div className="flex gap-4">
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as "vendor" | "admin")}
                        className="rounded-xl border border-gray-300 px-4 py-2 outline-none focus:border-indigo-500"
                    >
                        <option value="vendor">Vendor</option>
                        <option value="admin">Admin</option>
                    </select>

                    <button
                        onClick={generateCode}
                        disabled={generating}
                        className="flex-1 rounded-xl bg-indigo-600 px-6 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {generating ? "Generating..." : "Generate Code"}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Code</th>
                            <th className="px-6 py-4 font-semibold">Role</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">Created</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-6 text-center text-gray-500">Loading...</td></tr>
                        ) : invites.length === 0 ? (
                            <tr><td colSpan={5} className="p-6 text-center text-gray-500">No invites found.</td></tr>
                        ) : (
                            invites.map((invite) => (
                                <tr key={invite.code} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-mono font-medium text-indigo-600 select-all">
                                        {invite.code}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${invite.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {invite.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {invite.isUsed ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                                                <span className="h-2 w-2 rounded-full bg-gray-300"></span>
                                                Used
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                                Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {invite.createdAt?.seconds
                                            ? new Date(invite.createdAt.seconds * 1000).toLocaleDateString()
                                            : 'Just now'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(invite.code)}
                                            className="ml-auto flex items-center gap-1 rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                            title="Delete Invite"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
