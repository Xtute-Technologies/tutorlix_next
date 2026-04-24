'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { masterclassAPI } from '@/lib/lmsService';
import { useProfile } from '@/context/ProfileContext';
import { getSeoProfileContent } from '@/lib/seo';

export default function MasterclassesPage() {
    const { profileType, activeHomeContent } = useProfile();
    const seoContent = activeHomeContent?.seo || getSeoProfileContent(profileType);
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
                        {seoContent.masterclass.title}
                    </h1>
                    <p className="mt-4 text-lg text-blue-100">
                        {seoContent.masterclass.description}
                    </p>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">

                <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <h2 className="text-2xl font-bold text-slate-900">{seoContent.masterclass.introTitle}</h2>
                    <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600 md:text-base">
                        {seoContent.masterclass.introDescription}{' '}
                        Students can combine these sessions with
                        <Link href="/courses" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">live classes and courses</Link>,
                        <Link href="/notes" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">notes</Link>
                        and
                        <Link href="/question-bank" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">question banks</Link>
                        for a complete revision routine.
                    </p>
                </div>

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
                                        alt={`${seoContent.masterclass.imageAltPrefix} ${item.name}`}
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
                        {seoContent.masterclass.benefitTitle}
                    </h3>

                    <div className="space-y-6 text-gray-600">

                        <div>
                            <h4 className="font-semibold text-gray-900">
                                🎯 Exam-focused sessions
                            </h4>
                            <p className="text-sm mt-1">
                                Focus on the high-value maths ideas and question types that matter most for revision.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900">
                                🧠 Concept clarity
                            </h4>
                            <p className="text-sm mt-1">
                                Break down difficult topics into manageable methods and step-by-step explanations.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900">
                                📝 Better problem solving
                            </h4>
                            <p className="text-sm mt-1">
                                Learn how to approach advanced maths questions with a calmer, more structured process.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900">
                                📈 Live Interaction
                            </h4>
                            <p className="text-sm mt-1">
                                Ask questions live and use the session to clear doubts before your next assessment.
                            </p>
                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}
