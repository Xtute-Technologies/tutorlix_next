'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { profileTypeAPI } from '@/lib/lmsService';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
    const [profileType, setProfileType] = useState("");
    const [profileTypes, setProfileTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfileTypes = async () => {
            try {
                setLoading(true);
                const data = await profileTypeAPI.getAll();
                const availableTypes = Array.isArray(data) ? data : [];
                setProfileTypes(availableTypes);

                const stored = localStorage.getItem("tutorlix_profile");
                const storedExists = availableTypes.some((item) => item.slug === stored);
                const nextProfile = storedExists
                    ? stored
                    : (availableTypes[0]?.slug || "college");

                setProfileType(nextProfile);
                localStorage.setItem("tutorlix_profile", nextProfile);
            } catch (error) {
                console.error("Failed to load profile types:", error);
                setProfileTypes([]);
                const fallback = localStorage.getItem("tutorlix_profile") || "college";
                setProfileType(fallback);
            } finally {
                setLoading(false);
            }
        };

        loadProfileTypes();
    }, []);

    const updateProfile = (type) => {
        setProfileType(type); // 🔥 THIS triggers re-render everywhere
        localStorage.setItem("tutorlix_profile", type);
    };

    return (
        <ProfileContext.Provider value={{ profileType, profileTypes, loading, updateProfile }}>
            {children}
        </ProfileContext.Provider>
    );
}

export const useProfile = () => {
    const ctx = useContext(ProfileContext);
    if (!ctx) {
        throw new Error("useProfile must be used inside ProfileProvider");
    }
    return ctx;
};
