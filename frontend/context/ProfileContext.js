'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { profileTypeAPI } from '@/lib/lmsService';
import { buildProfileHomeContent } from '@/app/data/homeContent';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
    const [profileType, setProfileType] = useState("");
    const [profileTypes, setProfileTypes] = useState([]);
    const [activeProfile, setActiveProfile] = useState(null);
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
                setActiveProfile(availableTypes.find((item) => item.slug === nextProfile) || null);
                localStorage.setItem("tutorlix_profile", nextProfile);
            } catch (error) {
                console.error("Failed to load profile types:", error);
                setProfileTypes([]);
                const fallback = localStorage.getItem("tutorlix_profile") || "college";
                setProfileType(fallback);
                setActiveProfile(null);
            } finally {
                setLoading(false);
            }
        };

        loadProfileTypes();
    }, []);

    useEffect(() => {
        setActiveProfile(profileTypes.find((item) => item.slug === profileType) || null);
    }, [profileType, profileTypes]);

    const updateProfile = (type) => {
        setProfileType(type); // 🔥 THIS triggers re-render everywhere
        localStorage.setItem("tutorlix_profile", type);
    };

    const activeHomeContent = buildProfileHomeContent(profileType, activeProfile?.home_content);

    return (
        <ProfileContext.Provider value={{ profileType, profileTypes, activeProfile, activeHomeContent, loading, updateProfile }}>
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
