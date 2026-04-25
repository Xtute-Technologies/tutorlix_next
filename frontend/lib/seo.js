import { SITE_URL } from '@/lib/siteMetadata';

const DEFAULT_OG_IMAGE = `${SITE_URL}/icon.png`;

export function getCanonicalUrl(pathname = '/') {
  return new URL(pathname, SITE_URL).toString();
}

export function getPageTitle(title) {
  return title;
}

export function getMetaImage(image = DEFAULT_OG_IMAGE) {
  return image.startsWith('http') ? image : new URL(image, SITE_URL).toString();
}

export function buildHeadMetadata({ title, description, pathname, type = 'website', image }) {
  const canonical = getCanonicalUrl(pathname);
  const ogImage = getMetaImage(image);

  return {
    title,
    description,
    canonical,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Tutorlix',
      type,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Tutorlix',
    url: SITE_URL,
    email: 'info@xtute.com',
    telephone: '+91-7042462748',
    parentOrganization: {
      '@type': 'Organization',
      name: 'XTUTE TECHNOLOGIES PVT LTD',
    },
  };
}

export function buildWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Tutorlix',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/courses?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildFaqSchema(faqs = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function buildBreadcrumbSchema(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.path),
    })),
  };
}

export function buildCourseSchema(course) {
  if (!course) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.name,
    description: course.description || 'Online learning course on Tutorlix.',
    provider: {
      '@type': 'Organization',
      name: 'Tutorlix',
      sameAs: SITE_URL,
    },
    url: getCanonicalUrl(course.path || '/courses'),
    image: course.image ? getMetaImage(course.image) : undefined,
    educationalCredentialAwarded: undefined,
  };
}

export function buildCourseListSchema(courses = [], pathname = '/courses') {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Tutorlix Courses',
    url: getCanonicalUrl(pathname),
    hasPart: courses.map((course) => ({
      '@type': 'Course',
      name: course.name,
      description: course.description || 'Online learning course on Tutorlix.',
      url: getCanonicalUrl(course.path || '/courses'),
      provider: {
        '@type': 'Organization',
        name: 'Tutorlix',
      },
    })),
  };
}

const SEO_COPY_BY_PROFILE = {
  school: {
    homepage: {
      sectionTitle: 'Maths Learning Paths for School Students',
      sectionDescription:
        'Tutorlix helps school learners study online through maths tutoring for IB MYP, IBDP Maths, IGCSE Maths, AP Calculus, Algebra, Geometry and SAT Maths. Students can move between live classes, question banks, study notes, masterclasses and contact support to build stronger concepts and exam confidence.',
      faqDescription: 'Explore the most common questions students and parents ask before choosing a Tutorlix maths learning path.',
      faqs: [
        {
          question: 'What maths subjects does Tutorlix support?',
          answer:
            'Tutorlix supports school maths pathways such as IB MYP, IBDP Maths, IGCSE Maths, AP Calculus, Algebra, Geometry and SAT Maths preparation.',
        },
        {
          question: 'Is Tutorlix suitable for IB and IGCSE students?',
          answer:
            'Yes. Tutorlix is designed to support school students who need structured help with IB, IGCSE, AP and SAT maths topics.',
        },
        {
          question: 'Does Tutorlix offer live maths classes?',
          answer:
            'Yes. Students can explore live maths classes, guided courses, question banks, notes and masterclasses for concept clarity and revision.',
        },
        {
          question: 'Are question banks available for school maths practice?',
          answer:
            'Yes. Tutorlix question banks help students practise topic-wise questions and strengthen exam-focused preparation.',
        },
        {
          question: 'Can students use notes and courses together?',
          answer:
            'Yes. Tutorlix connects courses, notes, question banks and live sessions so students can study and practise in one place.',
        },
      ],
    },
    courses: {
      title: 'Online Maths Courses for School Students',
      subtitle: 'Explore live maths classes and guided courses for IB, IGCSE, AP, SAT, Algebra, Geometry and related school learning paths.',
      introTitle: 'Structured maths support for stronger exam preparation',
      introParagraphs: [
        'Tutorlix offers online maths courses for school learners who want better concept clarity, regular practice and stronger exam performance. Students can explore support for IB Maths, IGCSE Maths, AP Calculus, Algebra, Geometry and SAT Maths in a format that is easier to follow from home.',
        'Each course can be paired with question banks, study notes and revision-focused learning support. This helps students move from learning a concept to solving questions, revising weak areas and preparing more confidently for tests and school assessments.',
      ],
      liveTitle: 'Live Online Maths Classes',
      liveDescription:
        'Tutorlix live classes support doubt solving, concept clarity and structured study plans for school maths learners. Students can build a better revision routine by combining classes with notes and question banks.',
      faqDescription: 'Common questions about Tutorlix online maths courses and live classes for school students.',
      faqs: [
        {
          question: 'What maths courses can students explore on Tutorlix?',
          answer:
            'Students can explore online maths courses for IB, IGCSE, AP, SAT, Algebra, Geometry and related school-level learning tracks.',
        },
        {
          question: 'Are Tutorlix maths courses suitable for exam preparation?',
          answer:
            'Yes. Tutorlix maths courses are designed to support exam preparation, concept building, revision and regular practice for school learners.',
        },
        {
          question: 'Can I use notes and question banks along with maths courses?',
          answer:
            'Yes. Tutorlix courses work with notes, question banks and live support so students can study theory and practise consistently.',
        },
      ],
    },
    questionBank: {
      title: 'Maths Question Banks for Structured Practice',
      description:
        'Practise with topic-wise and exam-focused maths question banks on Tutorlix. Use these banks to revise concepts, improve consistency and move from class learning into detailed question practice.',
      introTitle: 'Topic-wise and exam-focused maths practice',
      introDescription:
        'Tutorlix question banks help school students organise revision by syllabus, topic and exam goal. After practising here, learners can strengthen weak areas with live classes, courses and study notes for a more complete maths study plan.',
      emptyState:
        'Question-bank courses are loaded from the database and filtered by the currently selected school profile.',
      faqDescription: 'Quick answers about using Tutorlix maths question banks for school revision and exam practice.',
      faqs: [
        {
          question: 'How do Tutorlix maths question banks help students?',
          answer:
            'They help school learners practise topic-wise questions, improve consistency and revise important maths concepts before tests and exams.',
        },
        {
          question: 'Can students use question banks for exam-focused practice?',
          answer:
            'Yes. Tutorlix maths question banks are useful for revision, targeted practice and improving confidence before assessments and exam preparation.',
        },
        {
          question: 'Are maths question banks linked to courses and notes?',
          answer:
            'Yes. Students can move between courses, notes and question-bank resources to build a complete maths study workflow.',
        },
      ],
    },
    notes: {
      title: 'Maths Notes for School Students',
      description:
        'Access structured maths notes on Tutorlix for IB, IGCSE, AP, SAT, Algebra, Geometry and related school topics.',
      introTitle: 'Study concepts first, then practise with confidence',
      introDescription:
        'Tutorlix maths notes are designed to make difficult school topics easier to revise. Learners can use notes to understand methods, formulas and worked examples, then move to question banks for practice or live classes and courses for guided learning.',
      faqTitle: 'Maths Notes FAQs',
      faqDescription: 'Common questions about using Tutorlix maths notes for revision and school exam preparation.',
      faqs: [
        {
          question: 'What kind of maths notes are available on Tutorlix?',
          answer:
            'Tutorlix offers notes that support school maths learning across IB, IGCSE, AP, SAT, Algebra, Geometry and related topics where content is available.',
        },
        {
          question: 'Can maths notes be used together with question banks?',
          answer:
            'Yes. Students can study with notes first and then use question banks for focused maths practice and revision.',
        },
        {
          question: 'Are Tutorlix maths notes useful for live classes too?',
          answer:
            'Yes. Notes can support learners before, during and after live maths classes by reinforcing concepts, methods and examples.',
        },
      ],
    },
    masterclass: {
      title: 'Maths Masterclasses for Exam Success',
      description:
        'Attend Tutorlix maths masterclasses for concept clarity, exam preparation and advanced problem solving.',
      introTitle: 'Focused maths sessions for stronger preparation',
      introDescription:
        'Tutorlix maths masterclasses help school learners revisit high-value concepts, improve exam technique and tackle more challenging problems with guidance. Students can combine these sessions with live classes, notes and question banks for a complete revision routine.',
      benefitTitle: 'Why Tutorlix Maths Masterclass?',
      imageAltPrefix: 'Maths masterclass session for',
    },
    contact: {
      leftDescription:
        'Have a question about maths tutoring, IB, IGCSE, AP, SAT, live classes, notes or revision support? Fill out the form and our team will get back to you within 24 hours.',
      rightDescription:
        'Reach out for maths tutoring support, live classes, notes, question banks, masterclasses and course guidance.',
    },
  },
  college: {
    homepage: {
      sectionTitle: 'Career-Focused Learning Paths for Tech Students',
      sectionDescription:
        'Tutorlix helps college learners build practical tech skills through full stack development, DSA, system design, AI and generative AI learning paths. Learners can combine guided courses, question banks, study notes, masterclasses and contact support to move from concept learning into project work and interview preparation.',
      faqDescription: 'Explore the most common questions tech learners ask before choosing a Tutorlix course or guided learning path.',
      faqs: [
        {
          question: 'What technical subjects does Tutorlix support?',
          answer:
            'Tutorlix supports full stack development, DSA, system design, AI, generative AI and related technical learning paths for college learners.',
        },
        {
          question: 'Is Tutorlix suitable for coding and computer science learners?',
          answer:
            'Yes. Tutorlix supports learners who want to strengthen coding fundamentals, build projects and improve technical interview readiness.',
        },
        {
          question: 'Does Tutorlix offer live classes and structured tech courses?',
          answer:
            'Yes. Learners can explore live classes, guided courses, notes, practice resources and masterclasses for technical subjects.',
        },
        {
          question: 'Are practice resources available for technical learning?',
          answer:
            'Yes. Tutorlix includes question-bank style practice resources and learning materials to support coding and technical preparation.',
        },
        {
          question: 'Can learners study DSA, full stack development and AI on Tutorlix?',
          answer:
            'Yes. Tutorlix includes structured learning paths for DSA, full stack development, AI, generative AI and related technology topics.',
        },
      ],
    },
    courses: {
      title: 'Tutorlix now aligned with Microsoft Learn Curriculum',
      subtitle: 'Explore guided learning paths in full stack development, DSA, system design, AI and generative AI.',
      introTitle: 'Structured technical learning for skills, projects and interviews',
      introParagraphs: [
        'Tutorlix offers online technical courses for learners who want stronger coding foundations, project experience and clearer problem-solving skills. Students can explore full stack development, DSA, system design, AI and generative AI in a format designed for steady learning and practical application.',
        'Each course can be paired with notes, guided practice and revision resources. This helps learners move from understanding a topic to solving problems, revising patterns and building confidence for internships, interviews and advanced study.',
      ],
      liveTitle: 'Live Online Tech Classes',
      liveDescription:
        'Tutorlix live classes support doubt solving, concept clarity and structured learning plans across coding and technical subjects. Learners can reinforce sessions with notes and practice resources.',
      faqDescription: 'Common questions about Tutorlix technical courses, live classes and skill-building paths.',
      faqs: [
        {
          question: 'What tech courses can learners explore on Tutorlix?',
          answer:
            'Learners can explore online courses in full stack development, DSA, system design, AI, generative AI and related technical learning tracks.',
        },
        {
          question: 'Are Tutorlix tech courses suitable for interview preparation?',
          answer:
            'Yes. Tutorlix technical courses are structured to support concept building, coding confidence, project work and interview preparation.',
        },
        {
          question: 'Can I use notes and practice resources along with courses?',
          answer:
            'Yes. Tutorlix courses work alongside notes, practice resources and live learning support so learners can study theory and practise consistently.',
        },
      ],
    },
    questionBank: {
      title: 'Practice Sets for Coding and Technical Preparation',
      description:
        'Practise with structured problem sets on Tutorlix for coding, DSA, system design thinking and technical revision.',
      introTitle: 'Practice by topic, concept and preparation goal',
      introDescription:
        'Tutorlix practice resources help technical learners organise revision by concept, topic and preparation goal. After practising here, learners can strengthen weak areas with guided courses and study notes for a more complete technical study plan.',
      emptyState:
        'Practice resources are loaded from the database and filtered by the currently selected learner profile.',
      faqDescription: 'Quick answers about using Tutorlix practice resources for coding, DSA and technical revision.',
      faqs: [
        {
          question: 'How do Tutorlix practice sets help technical learners?',
          answer:
            'They help learners practise by topic, improve consistency and revise important coding and technical concepts across available learning tracks.',
        },
        {
          question: 'Can learners use these resources for interview preparation?',
          answer:
            'Yes. Tutorlix practice resources are useful for targeted revision, consistent problem solving and improving confidence before technical interviews or assessments.',
        },
        {
          question: 'Are practice sets linked to courses and notes?',
          answer:
            'Yes. Learners can move between courses, notes and practice resources to build a complete technical learning workflow.',
        },
      ],
    },
    notes: {
      title: 'Study Notes for Full Stack Development, DSA and AI',
      description:
        'Access structured technical notes on Tutorlix for full stack development, DSA, system design, AI and generative AI topics.',
      introTitle: 'Study concepts first, then practise with confidence',
      introDescription:
        'Tutorlix study notes help technical learners break down difficult topics into clearer explanations, patterns and implementation ideas. Learners can use notes to understand concepts first, then move to practice resources or guided courses for deeper learning.',
      faqTitle: 'Study Notes FAQs',
      faqDescription: 'Common questions about using Tutorlix notes for technical learning and revision.',
      faqs: [
        {
          question: 'What kind of notes are available on Tutorlix?',
          answer:
            'Tutorlix offers notes that support technical learning paths such as full stack development, DSA, system design, AI and generative AI where content is available.',
        },
        {
          question: 'Can notes be used together with practice resources?',
          answer:
            'Yes. Learners can study with notes first and then use practice resources for focused technical problem solving and revision.',
        },
        {
          question: 'Are Tutorlix notes useful for live classes too?',
          answer:
            'Yes. Notes can support learners before, during and after live classes by reinforcing concepts, patterns and worked examples.',
        },
      ],
    },
    masterclass: {
      title: 'Masterclasses for Full Stack Development, DSA and AI',
      description:
        'Attend Tutorlix masterclasses for concept clarity, technical depth and advanced problem solving across modern tech skills.',
      introTitle: 'Focused sessions for stronger technical preparation',
      introDescription:
        'Tutorlix masterclasses help learners revisit high-value concepts, understand better approaches and tackle more challenging technical problems with guidance. Learners can combine these sessions with courses, notes and practice resources for a complete study routine.',
      benefitTitle: 'Why Tutorlix Masterclass?',
      imageAltPrefix: 'Technical masterclass session for',
    },
    contact: {
      leftDescription:
        'Have a question about full stack development, DSA, system design, AI courses, live classes, notes or guided technical learning? Fill out the form and our team will get back to you within 24 hours.',
      rightDescription:
        'Reach out for full stack development, DSA, system design, AI learning paths, live classes, notes, practice resources and course guidance.',
    },
  },
  professional: {
    homepage: {
      sectionTitle: 'Advanced Learning Paths for Working Professionals',
      sectionDescription:
        'Tutorlix helps working professionals upskill through system design, full stack development, cloud-focused engineering paths, AI and generative AI learning tracks. Learners can combine guided courses, study notes, practice resources, masterclasses and contact support to move from theory into applied technical confidence.',
      faqDescription: 'Explore the most common questions professionals ask before choosing a Tutorlix upskilling path.',
      faqs: [
        {
          question: 'What subjects does Tutorlix support for professionals?',
          answer:
            'Tutorlix supports upskilling paths in system design, full stack development, AI, generative AI and related technical areas for working professionals.',
        },
        {
          question: 'Is Tutorlix useful for career upskilling?',
          answer:
            'Yes. Tutorlix supports professionals who want stronger technical depth, practical learning and better preparation for role transitions and interviews.',
        },
        {
          question: 'Does Tutorlix offer live classes and guided learning paths?',
          answer:
            'Yes. Learners can explore live classes, guided courses, notes, practice resources and masterclasses for structured technical upskilling.',
        },
        {
          question: 'Are practice resources available for revision?',
          answer:
            'Yes. Tutorlix includes structured practice resources to help learners revise key concepts and strengthen applied understanding.',
        },
        {
          question: 'Can professionals learn system design and AI on Tutorlix?',
          answer:
            'Yes. Tutorlix includes learning paths for system design, full stack development, AI, generative AI and adjacent technical topics.',
        },
      ],
    },
  },
};

const SEO_SECTION_KEYS = ['homepage', 'courses', 'questionBank', 'notes', 'masterclass', 'contact'];

const cloneValue = (value) => JSON.parse(JSON.stringify(value));

export function getDefaultSeoProfileContent(profileType = 'college') {
  return cloneValue(SEO_COPY_BY_PROFILE[profileType] || SEO_COPY_BY_PROFILE.college);
}

export function normalizeSeoProfileContent(profileType = 'college', incoming = {}) {
  const defaults = getDefaultSeoProfileContent(profileType);
  const next = { ...defaults };

  SEO_SECTION_KEYS.forEach((key) => {
    const incomingSection = incoming?.[key];
    if (!incomingSection || typeof incomingSection !== 'object') {
      return;
    }

    next[key] = {
      ...defaults[key],
      ...incomingSection,
    };

    if (Array.isArray(defaults[key]?.faqs)) {
      next[key].faqs = Array.isArray(incomingSection.faqs)
        ? incomingSection.faqs.map((item) => ({
            question: item?.question || '',
            answer: item?.answer || '',
          }))
        : defaults[key].faqs;
    }

    if (Array.isArray(defaults[key]?.introParagraphs)) {
      next[key].introParagraphs = Array.isArray(incomingSection.introParagraphs)
        ? incomingSection.introParagraphs.map((item) => item || '')
        : defaults[key].introParagraphs;
    }
  });

  return next;
}

SEO_COPY_BY_PROFILE.professional.courses = SEO_COPY_BY_PROFILE.college.courses;
SEO_COPY_BY_PROFILE.professional.questionBank = SEO_COPY_BY_PROFILE.college.questionBank;
SEO_COPY_BY_PROFILE.professional.notes = SEO_COPY_BY_PROFILE.college.notes;
SEO_COPY_BY_PROFILE.professional.masterclass = SEO_COPY_BY_PROFILE.college.masterclass;
SEO_COPY_BY_PROFILE.professional.contact = {
  leftDescription:
    'Have a question about system design, full stack development, AI courses, live classes, notes or guided upskilling? Fill out the form and our team will get back to you within 24 hours.',
  rightDescription:
    'Reach out for system design, full stack development, AI learning paths, live classes, notes, practice resources and course guidance.',
};

export function getSeoProfileContent(profileType = 'college', incoming = null) {
  if (!incoming || typeof incoming !== 'object') {
    return getDefaultSeoProfileContent(profileType);
  }

  return normalizeSeoProfileContent(profileType, incoming);
}
