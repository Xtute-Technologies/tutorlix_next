'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '@/context/ProfileContext';
import { getSeoProfileContent } from '@/lib/seo';

const SENIORITY_OPTIONS = [
    'Entry-level',
    'Mid-level',
    'Senior',
    'Manager',
    'Director',
    'Executive',
];

const EMPLOYMENT_OPTIONS = [
    'Full Time',
    'Part Time',
    'Contractor',
    'Temporary',
    'Intern',
    'Volunteer',
    'Other',
];

const SORT_OPTIONS = [
    { label: 'Most recent', value: 'recent' },
    { label: 'Most relevant', value: 'relevant' },
    { label: 'Salary high to low', value: 'salaryDesc' },
    { label: 'Salary low to high', value: 'salaryAsc' },
    { label: 'Company A-Z', value: 'nameAToZ' },
    { label: 'Company Z-A', value: 'nameZToA' },
];

function getJobsFromResponse(payload) {
    if (Array.isArray(payload)) return payload;
    return payload?.jobs || payload?.data || payload?.results || [];
}

function formatSalary(job) {
    if (!job?.minSalary && !job?.maxSalary) return 'Salary not listed';

    const currency = job.currency || 'USD';
    const formatter = new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    });

    if (job.minSalary && job.maxSalary) {
        return `${formatter.format(job.minSalary)} - ${formatter.format(job.maxSalary)}`;
    }

    if (job.minSalary) return `From ${formatter.format(job.minSalary)}`;
    return `Up to ${formatter.format(job.maxSalary)}`;
}

function formatDate(date) {
    if (!date) return 'Recently posted';

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return 'Recently posted';

    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(parsedDate);
}

function getInitials(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

export default function JobsPage() {
    const { profileType, activeHomeContent } = useProfile();
    const seoContent = activeHomeContent?.seo || getSeoProfileContent(profileType);

    const jobsSeo = seoContent?.jobs || {
        title: 'Remote Jobs for Developers, Tutors & Learners',
        description:
            'Explore India-first remote jobs across development, AI, education, operations, support, and more.',
        introTitle: 'Find remote jobs that match your skills',
        introDescription:
            'Search opportunities by role, country, seniority, employment type, and salary preference.',
    };

    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [query, setQuery] = useState('');
    const [country, setCountry] = useState('India');
    const [seniority, setSeniority] = useState('');
    const [employmentType, setEmploymentType] = useState('');
    const [sort, setSort] = useState('recent');
    const [worldwide, setWorldwide] = useState(false);
    const [page, setPage] = useState(1);

    const [appliedFilters, setAppliedFilters] = useState({
        query: '',
        country: 'India',
        seniority: '',
        employmentType: '',
        sort: 'recent',
        worldwide: false,
    });

    const searchParams = useMemo(() => {
        const params = new URLSearchParams();

        const selectedCountry = appliedFilters.country.trim() || 'India';

        if (appliedFilters.query.trim()) params.set('q', appliedFilters.query.trim());
        if (selectedCountry) params.set('country', selectedCountry);
        if (appliedFilters.seniority) params.set('seniority', appliedFilters.seniority);
        if (appliedFilters.employmentType) params.set('employment_type', appliedFilters.employmentType);
        if (appliedFilters.worldwide) params.set('worldwide', 'true');

        params.set('sort', appliedFilters.sort || 'recent');
        params.set('page', String(page));

        return params;
    }, [appliedFilters, page]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchJobs = async () => {
            setLoading(true);
            setError('');

            try {
                const response = await fetch(`/api/jobs?${searchParams.toString()}`, {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`Jobs API returned ${response.status}`);
                }

                const data = await response.json();
                setJobs(getJobsFromResponse(data));
            } catch (err) {
                if (err?.name === 'AbortError') return;
                console.error(err);
                setError('Unable to load jobs right now. Please try again.');
                setJobs([]);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();

        return () => controller.abort();
    }, [searchParams]);

    const handleSearch = () => {
        setAppliedFilters({
            query,
            country: country.trim() || 'India',
            seniority,
            employmentType,
            sort,
            worldwide,
        });
        setPage(1);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-950">
            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Tutorlix Jobs
                            </p>
                            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                                {jobsSeo.title}
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                                {jobsSeo.description}
                            </p>
                        </div>

                        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                            India jobs shown by default
                        </div>
                    </div>
                </section>

                <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-950">Search jobs</h2>
                            <p className="text-sm text-slate-500">Use filters, then click Search.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6" onKeyDown={handleKeyDown}>
                        <div className="xl:col-span-2">
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                Keyword
                            </label>
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="React engineer, AI, tutor..."
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                Country
                            </label>
                            <input
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                placeholder="India"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                Level
                            </label>
                            <select
                                value={seniority}
                                onChange={(e) => setSeniority(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                            >
                                <option value="">Any level</option>
                                {SENIORITY_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                Type
                            </label>
                            <select
                                value={employmentType}
                                onChange={(e) => setEmploymentType(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                            >
                                <option value="">Any type</option>
                                {EMPLOYMENT_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                Sort
                            </label>
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <input
                                type="checkbox"
                                checked={worldwide}
                                onChange={(e) => setWorldwide(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                            Include worldwide-friendly jobs
                        </label>

                        <button
                            type="button"
                            onClick={handleSearch}
                            disabled={loading}
                            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-8 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                    <div>
                        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-950">Remote job openings</h2>
                                <p className="text-sm text-slate-500">
                                    {loading ? 'Loading jobs...' : `${jobs.length} jobs found on this page`}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                                    disabled={page === 1 || loading}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800">
                                    Page {page}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPage((current) => current + 1)}
                                    disabled={loading || jobs.length === 0}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <div key={index} className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white" />
                                ))}
                            </div>
                        ) : jobs.length === 0 && !error ? (
                            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                                    🔎
                                </div>
                                <h3 className="text-xl font-bold text-slate-950">No jobs found</h3>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                    Try a broader keyword, another country, or enable worldwide-friendly jobs.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                                {jobs.map((item) => {
                                    const sourceUrl = item.companySlug
                                        ? `https://himalayas.app/companies/${item.companySlug}`
                                        : 'https://himalayas.app/jobs';

                                    return (
                                        <article
                                            key={item.guid || `${item.companyName}-${item.title}`}
                                            className="flex min-h-[300px] flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                                        >
                                            <div className="flex items-start gap-4">
                                                {item.companyLogo ? (
                                                    <img
                                                        src={item.companyLogo}
                                                        alt={`${item.companyName || 'Company'} logo`}
                                                        className="h-12 w-12 shrink-0 rounded-2xl border border-slate-100 bg-white object-contain p-1"
                                                    />
                                                ) : (
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-600">
                                                        {getInitials(item.companyName || 'Job')}
                                                    </div>
                                                )}

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-slate-500">
                                                        {item.companyName || 'Company'}
                                                    </p>
                                                    <h3 className="mt-1 line-clamp-2 text-lg font-extrabold leading-6 text-slate-950">
                                                        {item.title || 'Untitled role'}
                                                    </h3>
                                                </div>
                                            </div>

                                            <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                                                {item.excerpt || 'Visit the job source to read the full role description.'}
                                            </p>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {item.employmentType && (
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                                        {item.employmentType}
                                                    </span>
                                                )}
                                                {(item.category || item.parentCategories || []).slice(0, 2).map((category) => (
                                                    <span
                                                        key={category}
                                                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                                                    >
                                                        {category}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="mt-5 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                                                <p>
                                                    <span className="font-bold text-slate-950">Salary:</span>{' '}
                                                    {formatSalary(item)}
                                                </p>
                                                <p>
                                                    <span className="font-bold text-slate-950">Location:</span>{' '}
                                                    {item.locationRestrictions?.length
                                                        ? item.locationRestrictions.join(', ')
                                                        : 'Remote / Worldwide'}
                                                </p>
                                                <p>
                                                    <span className="font-bold text-slate-950">Posted:</span>{' '}
                                                    {formatDate(item.pubDate)}
                                                </p>
                                            </div>

                                            <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
                                                <a
                                                    href={item.applicationLink || sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                                                >
                                                    Apply
                                                </a>
                                                <a
                                                    href={sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    Source
                                                </a>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-xl font-extrabold text-slate-950">Why Tutorlix Jobs?</h3>
                            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
                                <div>
                                    <h4 className="font-bold text-slate-950">India-first search</h4>
                                    <p>Jobs load with India selected by default.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-950">Focused filters</h4>
                                    <p>Filter by role, country, level, job type, and salary sorting.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-950">Easy comparison</h4>
                                    <p>Review salary, company, location, and posting date quickly.</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">
                            <h3 className="font-extrabold text-slate-950">Powered by Himalayas</h3>
                            <p className="mt-2">
                                Job listings are provided by Himalayas. Tutorlix links back to Himalayas source pages and application links where available.
                            </p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">
                            <h3 className="font-extrabold text-slate-950">Keep learning</h3>
                            <p className="mt-2">
                                Pair job preparation with
                                <Link href="/courses" className="mx-1 font-semibold text-primary underline-offset-4 hover:underline">courses</Link>,
                                <Link href="/notes" className="mx-1 font-semibold text-primary underline-offset-4 hover:underline">notes</Link>
                                and
                                <Link href="/question-bank" className="mx-1 font-semibold text-primary underline-offset-4 hover:underline">question banks</Link>.
                            </p>
                        </div>
                    </aside>
                </section>
            </main>
        </div>
    );
}
