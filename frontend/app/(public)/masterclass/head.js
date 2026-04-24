export default function Head() {
  const title = 'Masterclasses for Maths, Full Stack Development, DSA & AI | Tutorlix';
  const description =
    'Attend Tutorlix masterclasses for maths, full stack development, DSA, system design, AI and advanced problem solving.';
  const canonical = 'https://tutorlix.com/masterclass';
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
