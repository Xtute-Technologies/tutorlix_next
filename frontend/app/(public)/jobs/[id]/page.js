// app/jobs/[id]/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function JobDetailPage({ params }) {
    const [job, setJob] = useState(null);

    useEffect(() => {
        const savedJob = sessionStorage.getItem(`tutorlix-job-${decodeURIComponent(params.id)}`);
        if (savedJob) setJob(JSON.parse(savedJob));
    }, [params.id]);

    if (!job) {
        return (
            <div className="min-h-screen bg-slate-50 px-6 py-20 text-center">
                <h1 className="text-2xl font-bold text-slate-900">Job details unavailable</h1>
                <p className="mt-3 text-slate-600">Please go back to jobs and open the listing again.</p>
                <Link href="/jobs" className="mt-6 inline-block rounded-xl bg-slate-950 px-6 py-3 text-white">
                    Back to Jobs
                </Link>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <Link href="/jobs" className="text-sm font-semibold text-primary hover:underline">
                    ← Back to jobs
                </Link>

                <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500">{job.companyName}</p>
                    <h1 className="mt-2 text-3xl font-extrabold text-slate-950">{job.title}</h1>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {job.employmentType && <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">{job.employmentType}</span>}
                        {(job.category || []).slice(0, 3).map((item) => (
                            <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">{item}</span>
                        ))}
                    </div>
                    <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700 sm:grid-cols-3">
                        <div>
                            <p className="font-bold text-slate-950">Salary</p>
                            <p>
                                {job.minSalary && job.maxSalary
                                    ? `${job.currency || 'USD'} ${job.minSalary.toLocaleString()} - ${job.maxSalary.toLocaleString()}`
                                    : job.minSalary
                                        ? `From ${job.currency || 'USD'} ${job.minSalary.toLocaleString()}`
                                        : job.maxSalary
                                            ? `Up to ${job.currency || 'USD'} ${job.maxSalary.toLocaleString()}`
                                            : 'Salary not listed'}
                            </p>
                        </div>

                        <div>
                            <p className="font-bold text-slate-950">Location</p>
                            <p>
                                {job.locationRestrictions?.length
                                    ? job.locationRestrictions.join(', ')
                                    : 'Remote / Worldwide'}
                            </p>
                        </div>
                    </div>

                    <a
                        href={job.applicationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-8 inline-flex rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        Apply Now
                    </a>
                </section>

                <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-950">Job Description</h2>

                    <div
                        className="prose prose-slate mt-5 max-w-none"
                        dangerouslySetInnerHTML={{
                            __html: job.description || job.excerpt || 'No description available.',
                        }}
                    />
                </section>

                <p className="mt-6 text-sm text-slate-500">
                    Job listing powered by Himalayas. Apply button opens the original source.
                </p>
            </div>
        </main>
    );
}