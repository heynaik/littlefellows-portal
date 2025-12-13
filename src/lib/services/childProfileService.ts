// Local JSON DB Version (No Firebase)
export interface ChildProfile {
    id?: string;
    parentEmail: string;
    childName: string;
    voiceUrl?: string | null;
    voiceOwner?: string | null;
    createdAt?: any;
    updatedAt?: any;
}

export const ChildProfileService = {
    /**
     * Find a specific child profile for a parent.
     */
    async getProfile(parentEmail: string, childName: string): Promise<ChildProfile | null> {
        try {
            const params = new URLSearchParams({
                parentEmail,
                childName,
                _t: Date.now().toString() // Cache buster
            });
            const res = await fetch(`/api/child-profiles-api?${params.toString()}`, {
                cache: "no-store",
                headers: { "Pragma": "no-cache" }
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data as ChildProfile | null;
        } catch (e) {
            console.error("Error fetching child profile:", e);
            return null;
        }
    },

    /**
     * Create or Update the voice data for a child.
     */
    async saveVoice(parentEmail: string, childName: string, voiceUrl: string, voiceOwner: string) {
        try {
            const res = await fetch("/api/child-profiles-api", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    parentEmail,
                    childName,
                    voiceUrl,
                    voiceOwner
                })
            });
            if (!res.ok) throw new Error("Failed to save voice");
            const data = await res.json();
            return data.id;
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    /**
     * Delete voice (clear fields)
     */
    async deleteVoice(parentEmail: string, childName: string) {
        try {
            const res = await fetch("/api/child-profiles-api", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    parentEmail,
                    childName,
                    action: "delete_voice"
                })
            });
            if (!res.ok) throw new Error("Delete failed");
        } catch (e) {
            console.error(e);
            throw e; // Propagate error to UI
        }
    },

    /**
     * Get all child profiles (for Admin List)
     */
    async getAllProfiles(): Promise<ChildProfile[]> {
        try {
            const res = await fetch(`/api/child-profiles-api?getAll=true&_t=${Date.now()}`, {
                cache: "no-store"
            });
            if (!res.ok) return [];
            const data = await res.json();
            return data as ChildProfile[];
        } catch (e) {
            console.error("Error fetching all profiles:", e);
            return [];
        }
    }
};
