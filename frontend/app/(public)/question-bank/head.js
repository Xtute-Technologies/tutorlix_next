export default function Head() {
  const title = 'Question Banks for Maths and Technical Practice | Tutorlix';
  const description =
    'Practice with Tutorlix question banks for maths and other structured learning paths through topic-wise and exam-focused revision.';
  const canonical = 'https://tutorlix.com/question-bank';
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
