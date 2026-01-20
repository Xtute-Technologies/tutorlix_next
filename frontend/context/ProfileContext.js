'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
    const [profileType, setProfileType] = useState("college");

    useEffect(() => {
        const stored = localStorage.getItem("tutorlix_profile");
        if (stored) {
            setProfileType(stored);
        }
    }, []);

    const updateProfile = (type) => {
        setProfileType(type); // 🔥 THIS triggers re-render everywhere
        localStorage.setItem("tutorlix_profile", type);
    };

    return (
        <ProfileContext.Provider value={{ profileType, updateProfile }}>
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
