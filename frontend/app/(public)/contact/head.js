export default function Head() {
  const title = 'Contact Tutorlix | Courses, Tutoring and Learning Support';
  const description =
    'Contact Tutorlix for maths tutoring, full stack development, DSA, AI courses, live classes, notes and learning guidance.';
  const canonical = 'https://tutorlix.com/contact';
  const image = 'https://tutorlix.com/icon.png';

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </>
  );
}
