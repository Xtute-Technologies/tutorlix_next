'use client';

import { useEffect, useState } from 'react';
import { masterclassAPI } from '@/lib/lmsService';

export default function MasterclassesPage() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const data = await masterclassAPI.getAll({ is_active: true });
            setClasses(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-lg">
                Loading Masterclasses...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">

            {/* 🔷 HERO SECTION */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-600 py-20 text-white">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <h1 className="text-5xl font-bold">
                        Tutorlix Free Masterclasses
                    </h1>
                    <p className="mt-4 text-lg text-blue-100">
                        Learn directly from industry professionals through live sessions.
                    </p>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">

                {/* 🟦 MASTERCLASS GRID */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">

                    {classes.map((item) => {
                        const imageUrl = item.image
                            ? item.image.startsWith('http')
                                ? item.image
                                : `${process.env.NEXT_PUBLIC_API_URL}${item.image}`
                            : null;

                        return (
                            <div
                                key={item.id}
                                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition duration-300 overflow-hidden border border-gray-100 flex flex-col"
                            >
                                {imageUrl && (
                                    <img
                                        src={imageUrl}
                                        alt={item.name}
                                        className="w-full h-52 object-cover"
                                    />
                                )}

                                <div className="p-6 flex flex-col flex-grow">

                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                        {item.name}
                                    </h2>

                                    <p className="text-sm text-gray-500 mb-6">
                                        {item.time}
                                    </p>

                                    <div className="mt-auto">
                                        <a
                                            href={item.class_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block text-center bg-gradient-to-r from-slate-500 to-slate-500 hover:from-slate-600 hover:to-slate-600 text-white font-medium py-2.5 rounded-lg transition shadow-md"
                                        >
                                            Visit
                                        </a>
                                    </div>

                                </div>
                            </div>
                        );
                    })}

                </div>

                {/* 🟪 WHY TUTORLIX SECTION */}
                <div className="bg-gray-50 rounded-2xl p-8 shadow-md border border-gray-100 h-fit">

                    <h3 className="text-2xl font-bold text-gray-900 mb-8">
                        Why Tutorlix Masterclass?
                    </h3>

                    <div className="space-y-6 text-gray-600">

                        <div>
                            <h4 className="font-semibold text-gray-900">
                                🎓 Industry Experts
                            </h4>
                            <p className="text-sm mt-1">
                                Learn from professionals working in real-world tech environments.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900">
                                🚀 Practical Sessions
                            </h4>
                            <p className="text-sm mt-1">
                                No boring theory — focus on implementation & problem solving.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900">
                                💡 Career-Focused Learning
                            </h4>
                            <p className="text-sm mt-1">
                                Understand skills required to crack real tech interviews.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900">
                                📈 Live Interaction
                            </h4>
                            <p className="text-sm mt-1">
                                Ask questions live and engage directly with instructors.
                            </p>
                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}