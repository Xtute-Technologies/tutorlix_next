// app/jobs/[id]/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function getJobsFromResponse(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.jobs || payload?.data || payload?.results || [];
}

function formatSalary(job) {
  if (!job?.minSalary && !job?.maxSalary) return 'Salary not listed';

  const currency = job.currency || 'USD';

  if (job.minSalary && job.maxSalary) {
    return `${currency} ${job.minSalary.toLocaleString()} - ${job.maxSalary.toLocaleString()}`;
  }

  if (job.minSalary) return `From ${currency} ${job.minSalary.toLocaleString()}`;
  return `Up to ${currency} ${job.maxSalary.toLocaleString()}`;
}

function getJobDetailHref(job) {
  return `/jobs/${encodeURIComponent(job.guid)}`;
}

function saveJob(job) {
  if (typeof window === 'undefined' || !job?.guid) return;
  sessionStorage.setItem(`tutorlix-job-${job.guid}`, JSON.stringify(job));
}

export default function JobDetailPage({ params }) {
  const [job, setJob] = useState(null);
  const [relatedJobs, setRelatedJobs] = useState([]);

  useEffect(() => {
    const id = decodeURIComponent(params.id);
    const savedJob = sessionStorage.getItem(`tutorlix-job-${id}`);

    if (savedJob) {
      setJob(JSON.parse(savedJob));
    }
  }, [params.id]);

  useEffect(() => {
    if (!job) return;

    const fetchRelatedJobs = async () => {
      try {
        const keyword = job.category?.[0] || job.parentCategories?.[0] || job.title?.split(' ')?.[0] || '';
        const params = new URLSearchParams({
          q: keyword,
          country: 'India',
          sort: 'recent',
          page: '1',
        });

        const response = await fetch(`/api/jobs?${params.toString()}`);
        const data = await response.json();

        const jobs = getJobsFromResponse(data)
          .filter((item) => item.guid !== job.guid)
          .slice(0, 5);

        setRelatedJobs(jobs);
      } catch (error) {
        console.error(error);
        setRelatedJobs([]);
      }
    };

    fetchRelatedJobs();
  }, [job]);

  if (!job) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-950">Job details unavailable</h1>
        <p className="mt-3 text-slate-600">Please go back to jobs and open the listing again.</p>
        <Link
          href="/jobs"
          className="mt-6 inline-flex rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white"
        >
          Back to Jobs
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/jobs" className="text-sm font-bold text-primary hover:underline">
          ← Back to jobs
        </Link>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">{job.companyName}</p>

              <h1 className="mt-2 text-3xl font-extrabold leading-tight text-slate-950">
                {job.title}
              </h1>

              <div className="mt-5 flex flex-wrap gap-2">
                {job.employmentType && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                    {job.employmentType}
                  </span>
                )}

                {(job.category || job.parentCategories || []).slice(0, 3).map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <p className="font-bold text-slate-950">Salary</p>
                  <p>{formatSalary(job)}</p>
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
                href={job.applicationLink || 'https://himalayas.app/jobs'}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Apply Now
              </a>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">Job Description</h2>

              <div
                className="prose prose-slate mt-5 max-w-none"
                dangerouslySetInnerHTML={{
                  __html: job.description || job.excerpt || 'No description available.',
                }}
              />
            </section>

            <p className="text-sm text-slate-500">
              Job listing powered by Himalayas. Apply button opens the original source.
            </p>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-extrabold text-slate-950">Related Jobs</h2>

              <div className="mt-4 space-y-3">
                {relatedJobs.length === 0 ? (
                  <p className="text-sm text-slate-500">No related jobs found.</p>
                ) : (
                  relatedJobs.map((item) => (
                    <Link
                      key={item.guid}
                      href={getJobDetailHref(item)}
                      onClick={() => saveJob(item)}
                      className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md"
                    >
                      <p className="text-sm font-semibold text-slate-500">
                        {item.companyName}
                      </p>

                      <h3 className="mt-1 line-clamp-2 font-bold leading-5 text-slate-950">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-sm text-slate-600">
                        {item.locationRestrictions?.length
                          ? item.locationRestrictions.join(', ')
                          : 'Remote / Worldwide'}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {formatSalary(item)}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
              <h3 className="font-extrabold text-slate-950">Powered by Himalayas</h3>
              <p className="mt-2">
                Related jobs and job details are powered by Himalayas.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}