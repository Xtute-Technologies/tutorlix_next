export default function Head() {
    const title = 'Remote Jobs for Developers, Tutors & Learners | Tutorlix Jobs';
    const description =
        'Explore remote jobs across development, AI, DSA, education, and more. Find worldwide opportunities curated for Tutorlix learners and professionals.';
    const canonical = 'https://tutorlix.com/jobs';
    const image = 'https://tutorlix.com/icon.png';

    return (
        <>
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonical} />

            {/* Open Graph */}
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={canonical} />
            <meta property="og:type" content="website" />
            <meta property="og:image" content={image} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />

            {/* Optional but recommended */}
            <meta name="robots" content="index, follow" />
        </>
    );
}