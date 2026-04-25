import {
  Rocket,
  Users,
  Code2,
  BookOpen,
  Target,
  BrainCircuit,
  GraduationCap,
  School,
  Laptop,
} from "lucide-react";
import { normalizeSeoProfileContent } from '@/lib/seo';

export const profileSelectionOptions = [
  {
    id: "school",
    title: "School Student",
    desc: "Learn basics & build strong foundation",
    icon: School,
  },
  {
    id: "college",
    title: "College Student",
    desc: "Upskill, prepare for career",
    icon: GraduationCap,
  },
  {
    id: "professional",
    title: "IT Professional",
    desc: "Advance skills & switch roles",
    icon: Laptop,
  },
];

export const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";

export const HOME_ICON_MAP = {
  rocket: Rocket,
  users: Users,
  "code-2": Code2,
  "book-open": BookOpen,
  target: Target,
  "brain-circuit": BrainCircuit,
};

const slugifyValue = (value = "") =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildConceptNote = (tutorialSlug, tutorialTitle, conceptTitle) => {
  const conceptSlug = slugifyValue(conceptTitle);
  return {
    slug: conceptSlug,
    title: conceptTitle,
    noteUrl: "",
  };
};

const buildConceptNotes = (tutorialSlug, tutorialTitle, concepts = []) =>
  concepts.map((conceptTitle) => buildConceptNote(tutorialSlug, tutorialTitle, conceptTitle));

const defaultSchoolTutorials = [
  {
    slug: "number-and-algebra",
    title: "Number and Algebra",
    shortDescription: "Sequences, series, logarithms, and binomial expansion.",
    overview:
      "This tutorial builds the algebraic foundation used across IB Mathematics. It starts with number patterns and sequences, moves through series and logarithmic relationships, and then connects those ideas to binomial expansion and algebraic manipulation.",
    conceptsCovered: buildConceptNotes("number-and-algebra", "Number and Algebra", [
      "Arithmetic and geometric sequences and series",
      "Sigma notation and finite summation techniques",
      "Exponential laws and logarithmic rules",
      "Equation solving with powers and logarithms",
      "Binomial expansion and binomial coefficients",
      "Algebraic rearrangement, factorization, and simplification",
      "Mathematical notation fluency used across IB problem solving",
    ]),
    learnPoints: [
      "Work confidently with arithmetic and geometric sequences and series.",
      "Understand logarithmic laws and how logarithms model inverse exponential behavior.",
      "Apply binomial expansion accurately and recognize when approximations are useful.",
      "Build the algebra fluency needed for functions, calculus, and probability.",
    ],
    scopeLabel: "Core Topics (All Courses)",
  },
  {
    slug: "functions",
    title: "Functions",
    shortDescription: "Graphing, transformations, and specific types like exponential and logarithmic functions.",
    overview:
      "This tutorial explains how functions describe relationships between variables and how those relationships appear visually on graphs. It covers graphing techniques, transformations, and the behavior of important function families including exponential and logarithmic models.",
    conceptsCovered: buildConceptNotes("functions", "Functions", [
      "Function notation, domain, and range",
      "Graph interpretation using intercepts, symmetry, and end behavior",
      "Transformations including translations, reflections, and stretches",
      "Linear, quadratic, rational, exponential, and logarithmic functions",
      "Inverse functions and composite functions",
      "Equation solving through graphical and algebraic reasoning",
      "Modeling real relationships with functions",
    ]),
    learnPoints: [
      "Interpret domain, range, intercepts, and key features from function graphs.",
      "Apply translations, reflections, stretches, and other transformations cleanly.",
      "Compare linear, quadratic, exponential, and logarithmic functions.",
      "Use function notation and modeling to solve contextual problems.",
    ],
    scopeLabel: "Core Topics (All Courses)",
  },
  {
    slug: "geometry-and-trigonometry",
    title: "Geometry and Trigonometry",
    shortDescription: "2D and 3D geometry, trigonometric functions, and identities.",
    overview:
      "This tutorial focuses on shape, space, angle, and periodic relationships. Students work through geometric reasoning in two and three dimensions and then connect that reasoning to trigonometric functions, equations, and identities.",
    conceptsCovered: buildConceptNotes("geometry-and-trigonometry", "Geometry and Trigonometry", [
      "Coordinate geometry in two dimensions",
      "Distance, midpoint, gradient, and line relationships",
      "Area, volume, and geometric reasoning in 2D and 3D",
      "Sine, cosine, and tangent as ratios and functions",
      "Unit-circle thinking and standard trigonometric graphs",
      "Trigonometric identities and equations",
      "Applications of trigonometry in non-right and contextual problems",
    ]),
    learnPoints: [
      "Solve problems involving angles, lengths, areas, and volumes in 2D and 3D settings.",
      "Understand sine, cosine, and tangent as functions, not just ratios.",
      "Use trigonometric identities and equations in structured problem solving.",
      "Read and interpret trigonometric graphs with confidence.",
    ],
    scopeLabel: "Core Topics (All Courses)",
  },
  {
    slug: "statistics-and-probability",
    title: "Statistics and Probability",
    shortDescription: "Data analysis, probability distributions, and correlation.",
    overview:
      "This tutorial develops statistical reasoning from data collection through interpretation. It covers descriptive statistics, probability models, distributions, and correlation so students can explain trends and make mathematically sound conclusions.",
    conceptsCovered: buildConceptNotes("statistics-and-probability", "Statistics and Probability", [
      "Data collection, organization, and visual representation",
      "Measures of center and spread",
      "Discrete and continuous probability ideas",
      "Conditional probability and tree or Venn-diagram reasoning",
      "Probability distributions and expected value",
      "Scatter plots, correlation, and regression interpretation",
      "Critical interpretation of statistical conclusions",
    ]),
    learnPoints: [
      "Summarize and interpret data using tables, diagrams, and numerical measures.",
      "Work with probability rules and common distributions in a structured way.",
      "Understand correlation, regression, and the limits of statistical conclusions.",
      "Translate real data into mathematical language and justified interpretations.",
    ],
    scopeLabel: "Core Topics (All Courses)",
  },
  {
    slug: "calculus",
    title: "Calculus",
    shortDescription: "Differentiation and integration techniques.",
    overview:
      "This tutorial introduces change and accumulation through differentiation and integration. It covers core techniques, graph interpretation, and practical applications so students can move from formulas to reasoning about rates and areas.",
    conceptsCovered: buildConceptNotes("calculus", "Calculus", [
      "Limits as the foundation of calculus reasoning",
      "Differentiation rules for algebraic and transcendental functions",
      "Tangents, rates of change, and gradient interpretation",
      "Optimization and motion applications of derivatives",
      "Antiderivatives and definite integrals",
      "Area under curves and accumulation models",
      "Links between graphs, derivatives, and integrals",
    ]),
    learnPoints: [
      "Differentiate common function types and interpret derivatives graphically.",
      "Use integration to recover quantities and calculate area-related results.",
      "Connect calculus methods to motion, optimization, and modeling problems.",
      "Build technique alongside conceptual understanding for exam questions.",
    ],
    scopeLabel: "Core Topics (All Courses)",
  },
];

const defaultCollegeTutorials = [
  {
    slug: "data-structures-and-algorithms",
    title: "Data Structures & Algorithms",
    shortDescription: "Arrays, linked lists, trees, graphs, recursion, and problem-solving patterns.",
    overview:
      "This tutorial track builds the core programming problem-solving ability expected in college placements and software internships. It covers fundamental data structures, algorithm analysis, and the practical thinking patterns needed to solve coding interview questions with clarity.",
    conceptsCovered: buildConceptNotes("data-structures-and-algorithms", "Data Structures & Algorithms", [
      "Asymptotic analysis with time and space complexity",
      "Arrays, strings, stacks, queues, linked lists, trees, heaps, and hash maps",
      "Searching, sorting, and recursion",
      "Binary trees, BSTs, heaps, and traversal strategies",
      "Graphs, shortest paths, traversal, and connectivity problems",
      "Dynamic programming, greedy algorithms, and divide-and-conquer",
      "Problem decomposition and correctness reasoning",
    ]),
    learnPoints: [
      "Choose the right data structure for search, update, traversal, and storage tasks.",
      "Understand time and space complexity and use them to compare solutions.",
      "Apply recursion, dynamic programming, greedy methods, and graph traversal patterns.",
      "Translate abstract algorithmic thinking into clean, testable code.",
    ],
    scopeLabel: "Career Core",
  },
  {
    slug: "web-development",
    title: "Web Development",
    shortDescription: "Frontend fundamentals, APIs, full-stack architecture, and deployment basics.",
    overview:
      "This tutorial introduces the complete web development journey from browser-side interfaces to backend services. It is designed for college students who need practical project-building ability, not just syntax familiarity.",
    conceptsCovered: buildConceptNotes("web-development", "Web Development", [
      "HTML structure, semantic content, forms, and accessibility basics",
      "CSS selectors, layout, responsive design, and styling systems",
      "JavaScript language fundamentals, DOM updates, and browser APIs",
      "State, component thinking, and UI interactivity in frontend apps",
      "HTTP, REST APIs, authentication, and request/response flow",
      "Backend routing, data persistence, and deployment foundations",
      "Project structure and full-stack integration workflows",
    ]),
    learnPoints: [
      "Build responsive frontend interfaces with modern component-based thinking.",
      "Understand how APIs, routing, authentication, and databases work together.",
      "Develop project structure discipline for scalable full-stack applications.",
      "Move from small assignments to portfolio-quality web products.",
    ],
    scopeLabel: "Career Core",
  },
  {
    slug: "database-systems",
    title: "Database Systems",
    shortDescription: "SQL design, normalization, querying, indexing, and transaction basics.",
    overview:
      "This tutorial helps students move beyond basic table queries and understand how data systems are actually modeled and queried in production applications. It covers relational thinking, query optimization basics, and practical data design habits.",
    conceptsCovered: buildConceptNotes("database-systems", "Database Systems", [
      "Relational modeling with tables, keys, and constraints",
      "Core SQL operations including SELECT, INSERT, UPDATE, and DELETE",
      "Joins, aggregations, filtering, grouping, and subqueries",
      "Schema design and normalization basics",
      "Transactions, consistency, and data integrity concepts",
      "Views, foreign keys, and window functions",
      "Indexes and practical query performance awareness",
    ]),
    learnPoints: [
      "Design structured schemas with cleaner normalization decisions.",
      "Write joins, aggregations, subqueries, and filters confidently.",
      "Understand indexes, constraints, and transaction concepts at a practical level.",
      "Connect database choices to application performance and maintainability.",
    ],
    scopeLabel: "Career Core",
  },
  {
    slug: "aptitude-and-problem-solving",
    title: "Aptitude & Problem Solving",
    shortDescription: "Quantitative aptitude, logical reasoning, and campus placement problem solving.",
    overview:
      "This tutorial sharpens the analytical skills frequently tested in campus hiring rounds. It combines speed, structured reasoning, and accuracy so students can perform better in placement preparation alongside technical study.",
    conceptsCovered: buildConceptNotes("aptitude-and-problem-solving", "Aptitude & Problem Solving", [
      "Percentages, ratios, averages, and profit-loss reasoning",
      "Time-speed-distance and work-time problems",
      "Permutation, combination, and probability-style aptitude questions",
      "Logical sequencing, coding-decoding, and puzzle structures",
      "Data interpretation using charts and tabular information",
      "Pattern recognition and elimination strategies",
      "Test-taking speed and error-reduction habits",
    ]),
    learnPoints: [
      "Break down quantitative questions into repeatable reasoning frameworks.",
      "Improve speed and accuracy on common aptitude problem types.",
      "Recognize logical traps and solve reasoning questions systematically.",
      "Prepare with a stronger balance of technical and non-technical readiness.",
    ],
    scopeLabel: "Placement Prep",
  },
  {
    slug: "system-design-foundations",
    title: "System Design Foundations",
    shortDescription: "Scalability basics, architecture thinking, and backend design tradeoffs.",
    overview:
      "This tutorial introduces architecture-level thinking in a beginner-friendly way for college students preparing for advanced internships or full-time roles. It focuses on conceptual clarity rather than senior-level depth.",
    conceptsCovered: buildConceptNotes("system-design-foundations", "System Design Foundations", [
      "Clients, servers, APIs, and request flow",
      "Databases, caching, and storage choices",
      "Load balancing, scaling, and fault tolerance basics",
      "Synchronous versus asynchronous processing",
      "Queues, background jobs, and event-driven thinking",
      "Service boundaries and simple distributed-system tradeoffs",
      "Communicating architecture clearly in interviews",
    ]),
    learnPoints: [
      "Understand clients, servers, databases, caching, queues, and APIs as system parts.",
      "Reason about scale, reliability, latency, and availability tradeoffs.",
      "Explain architecture choices in interviews and project reviews more clearly.",
      "Build a strong bridge from coding skills to engineering design thinking.",
    ],
    scopeLabel: "Advanced Prep",
  },
];

const defaultProfessionalTutorials = [
  {
    slug: "system-design",
    title: "System Design",
    shortDescription: "Scalable services, architecture tradeoffs, availability, and performance design.",
    overview:
      "This tutorial is aimed at working professionals who need stronger architecture depth for senior interviews, team leadership, or backend-heavy roles. It covers distributed system building blocks and the reasoning behind production tradeoffs.",
    conceptsCovered: buildConceptNotes("system-design", "System Design", [
      "Scalability, reliability, and availability goals",
      "Caching, replication, partitioning, and consistency models",
      "Message queues, asynchronous workflows, and backpressure",
      "Load balancing and traffic management",
      "Database tradeoffs across relational and distributed storage",
      "Failure handling, resilience, and graceful degradation",
      "Design communication for interviews and architecture reviews",
    ]),
    learnPoints: [
      "Design systems using caching, queues, databases, and service boundaries intentionally.",
      "Evaluate latency, consistency, reliability, and scaling tradeoffs in realistic scenarios.",
      "Communicate architecture decisions with more precision in interviews and design discussions.",
      "Move from feature implementation thinking to system-level engineering judgment.",
    ],
    scopeLabel: "Professional Track",
  },
  {
    slug: "cloud-and-devops",
    title: "Cloud & DevOps",
    shortDescription: "CI/CD, containers, deployment pipelines, observability, and cloud fundamentals.",
    overview:
      "This tutorial helps professionals strengthen modern delivery and infrastructure skills. It focuses on the operational side of engineering, including deployments, automation, reliability, and practical cloud-native workflows.",
    conceptsCovered: buildConceptNotes("cloud-and-devops", "Cloud & DevOps", [
      "Continuous integration and delivery pipeline fundamentals",
      "Containers, images, and reproducible build environments",
      "Infrastructure automation and environment consistency",
      "Deployment strategies and release safety",
      "Cloud service building blocks for compute, storage, and networking",
      "Observability through logs, metrics, traces, and alerts",
      "Operational feedback loops in DevOps teams",
    ]),
    learnPoints: [
      "Understand deployment pipelines and how to reduce release friction safely.",
      "Work confidently with containers, environments, and cloud service building blocks.",
      "Improve monitoring, logging, and observability for production systems.",
      "Connect infrastructure decisions to team velocity and service reliability.",
    ],
    scopeLabel: "Professional Track",
  },
  {
    slug: "backend-architecture",
    title: "Backend Architecture",
    shortDescription: "Service boundaries, APIs, data flow, resilience, and maintainable backend design.",
    overview:
      "This tutorial focuses on engineering backend systems that remain understandable and maintainable as teams and products grow. It is useful for professionals moving into stronger ownership roles or scaling beyond CRUD-heavy applications.",
    conceptsCovered: buildConceptNotes("backend-architecture", "Backend Architecture", [
      "API design and service contract clarity",
      "Domain boundaries and modular backend organization",
      "Data flow design across synchronous and asynchronous layers",
      "Idempotency, retries, and failure-aware workflows",
      "Security, validation, and safe input handling",
      "Operational maintainability and service ownership concerns",
      "Refactoring backend systems for growth and clarity",
    ]),
    learnPoints: [
      "Design cleaner service contracts and backend boundaries.",
      "Handle failures, retries, idempotency, and asynchronous workflows more deliberately.",
      "Reduce complexity by structuring backend code and data flows with stronger patterns.",
      "Think in terms of maintainability, not just immediate delivery speed.",
    ],
    scopeLabel: "Professional Track",
  },
  {
    slug: "ai-engineering",
    title: "AI Engineering",
    shortDescription: "LLM workflows, prompt systems, evaluation, and product integration basics.",
    overview:
      "This tutorial is for professionals who want to move from curiosity about AI to practical implementation skills. It focuses on integrating modern AI capabilities into real applications with attention to reliability, UX, and evaluation.",
    conceptsCovered: buildConceptNotes("ai-engineering", "AI Engineering", [
      "Prompt design and instruction quality",
      "Retrieval-augmented workflows and grounded answers",
      "Structured outputs and tool-using systems",
      "Evaluation loops for quality and regression detection",
      "Latency, cost, and reliability tradeoffs in production AI",
      "Knowledge retrieval and context management patterns",
      "Safety, hallucination handling, and user trust",
    ]),
    learnPoints: [
      "Understand where AI fits well in real product and automation workflows.",
      "Work with prompts, structured outputs, retrieval, and evaluation loops effectively.",
      "Recognize tradeoffs around hallucinations, cost, latency, and safety.",
      "Build more realistic AI features instead of demo-only prototypes.",
    ],
    scopeLabel: "Professional Track",
  },
  {
    slug: "technical-interview-strategy",
    title: "Technical Interview Strategy",
    shortDescription: "Interview storytelling, senior-level problem framing, and role transition preparation.",
    overview:
      "This tutorial helps experienced engineers prepare for role changes, promotions, and interview processes where communication matters as much as raw coding. It blends technical clarity with professional positioning.",
    conceptsCovered: buildConceptNotes("technical-interview-strategy", "Technical Interview Strategy", [
      "Project storytelling with ownership and impact framing",
      "Coding interview structure and communication discipline",
      "System design response structure and tradeoff explanation",
      "Behavioral interview examples using clear narratives",
      "Resume and profile alignment with target roles",
      "Senior-level judgment signals and leadership communication",
      "Interview iteration through feedback and reflection",
    ]),
    learnPoints: [
      "Explain past projects and ownership decisions in a stronger interview narrative.",
      "Frame tradeoffs and architecture reasoning in a senior-friendly way.",
      "Prepare for coding, design, and behavioral rounds as one coherent story.",
      "Present depth, judgment, and impact more effectively during transitions.",
    ],
    scopeLabel: "Career Growth",
  },
];

export const defaultProfileHomeContent = {
  school: {
    navigation: {
      primary_links: [
        { label: "Home", url: "/", visibility: "public" },
        { label: "Live Classes", url: "/courses", visibility: "public" },
        { label: "Question Banks", url: "/question-banks", visibility: "public" },
        { label: "Notes", url: "/notes", visibility: "public" },
        { label: "Masterclass", url: "/masterclass", visibility: "public" },
        { label: "Contact", url: "/contact", visibility: "public" },
      ],
      question_banks_label: "Question Banks",
      question_banks_url: "/question-banks",
      tutorials_enabled: true,
      tutorials_heading: "Core Topics (All Courses)",
      tutorials_description: "All IB Math courses cover these five areas, though depth differs.",
    },
    hero: {
      tag: "For School Students",
      headline:
        "Online maths tutoring for IB MYP, IBDP Maths, IGCSE Maths, AP Calculus AB/BC, AP Precalculus, Algebra 2, Geometry, Algebra 1, and SAT Maths.",
      bullets: [
        "Concept clarity with expert teachers",
        "Maths & science made easy",
        "Learn at your own pace",
      ],
      quick_programs: ["IB MYP", "IBDP Maths", "IGCSE Maths", "AP Calculus AB/BC", "SAT Maths"],
      stats: [
        { value: "1:1", label: "Online classes" },
        { value: "Live", label: "Doubt solving" },
        { value: "Exam", label: "Focused plans" },
      ],
      cta: "Get Academic Guidance",
      lead_title: "Start your journey",
      lead_success_title: "Sent!",
      lead_success_cta: "Send another",
    },
    benefits: {
      title: "Why students love Tutorlix",
      subtitle: "Strong concepts, clear basics, and learning made fun.",
      items: [
        {
          icon: "book-open",
          title: "Concept Clarity",
          description: "Simple explanations that build strong foundations.",
        },
        {
          icon: "users",
          title: "Expert Teachers",
          description: "Learn from experienced teachers.",
        },
        {
          icon: "target",
          title: "Step-by-Step Learning",
          description: "Structured learning for school success.",
        },
      ],
    },
    about: {
      badge: "About Tutorlix",
      title: "Interactive learning that\nactually works.",
      description:
        "Take your math and computer science skills to the next level with Tutorlix. Say goodbye to boring lectures and hello to hands-on lessons and exciting projects.",
      cards: [
        {
          icon: "target",
          title: "Fortnightly Testing",
          description:
            "Track progress with challenging tests designed to apply your problem-solving skills.",
        },
        {
          icon: "brain-circuit",
          title: "High-Quality Content",
          description:
            "Well-recorded lectures and dynamic resources ensure an informative experience.",
        },
      ],
      image_url:
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop",
      quote: "Education is not the filling of a pail, but the lighting of a fire.",
      quote_author: "W.B. Yeats",
    },
    testimonials: {
      title: "Student Success Stories",
      subtitle: "Don't just take our word for it. Hear from our community.",
      items: [
        {
          name: "Diya Shukla",
          course: "Maths for BE, BTech, BBA and BCA",
          text: "Maths became simple and interesting.",
        },
        {
          name: "B. Jahnavi",
          course: "JEE Maths (One Year)",
          text: "Teaching style is very clear.",
        },
        {
          name: "Vinod Kumar",
          course: "Front End Development",
          text: "Every doubt is cleared properly.",
        },
      ],
    },
    tutorials: defaultSchoolTutorials,
  },
  college: {
    navigation: {
      primary_links: [
        { label: "Home", url: "/", visibility: "public" },
        { label: "Live Classes", url: "/courses", visibility: "public" },
        { label: "Microsoft Courses", url: "/microsoft-courses", visibility: "public" },
        { label: "Question Banks", url: "/question-banks", visibility: "public" },
        { label: "Notes", url: "/notes", visibility: "public" },
        { label: "Masterclass", url: "/masterclass", visibility: "public" },
        { label: "Contact", url: "/contact", visibility: "public" },
      ],
      question_banks_label: "Question Banks",
      question_banks_url: "/question-banks",
      tutorials_enabled: true,
      tutorials_heading: "Career-Ready Topic Tracks",
      tutorials_description: "These tutorials help college students build stronger coding, project, placement, and engineering fundamentals.",
    },
    hero: {
      tag: "For College Students",
      headline: "Become job-ready\nbefore graduation.",
      bullets: [
        "Industry-aligned curriculum",
        "Internship & placement support",
        "Hands-on project learning",
      ],
      quick_programs: ["Full Stack Dev", "Data Science & AI", "DSA", "Placement Prep", "System Design Basics"],
      stats: [
        { value: "Projects", label: "Portfolio building" },
        { value: "Mentors", label: "Career guidance" },
        { value: "Jobs", label: "Placement focus" },
      ],
      cta: "Get Career Guidance",
      lead_title: "Start your journey",
      lead_success_title: "Sent!",
      lead_success_cta: "Send another",
    },
    benefits: {
      title: "Why college students choose us",
      subtitle: "Learn skills that actually matter in the real world.",
      items: [
        {
          icon: "rocket",
          title: "Industry-Oriented Learning",
          description: "Curriculum aligned with placements.",
        },
        {
          icon: "code-2",
          title: "Hands-on Projects",
          description: "Build real projects for your portfolio.",
        },
        {
          icon: "users",
          title: "Mentorship Support",
          description: "Guidance from senior mentors.",
        },
      ],
    },
    about: {
      badge: "About Tutorlix",
      title: "Interactive learning that\nactually works.",
      description:
        "Take your math and computer science skills to the next level with Tutorlix. Say goodbye to boring lectures and hello to hands-on lessons and exciting projects.",
      cards: [
        {
          icon: "target",
          title: "Fortnightly Testing",
          description:
            "Track progress with challenging tests designed to apply your problem-solving skills.",
        },
        {
          icon: "brain-circuit",
          title: "High-Quality Content",
          description:
            "Well-recorded lectures and dynamic resources ensure an informative experience.",
        },
      ],
      image_url:
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop",
      quote: "Education is not the filling of a pail, but the lighting of a fire.",
      quote_author: "W.B. Yeats",
    },
    testimonials: {
      title: "Student Success Stories",
      subtitle: "Don't just take our word for it. Hear from our community.",
      items: [
        {
          name: "Diya Shukla",
          course: "Maths for BE, BTech, BBA and BCA",
          text: "Maths became simple and interesting.",
        },
        {
          name: "B. Jahnavi",
          course: "JEE Maths (One Year)",
          text: "Teaching style is very clear.",
        },
        {
          name: "Vinod Kumar",
          course: "Front End Development",
          text: "Every doubt is cleared properly.",
        },
      ],
    },
    tutorials: defaultCollegeTutorials,
  },
  professional: {
    navigation: {
      primary_links: [
        { label: "Home", url: "/", visibility: "public" },
        { label: "Live Classes", url: "/courses", visibility: "public" },
        { label: "Microsoft Courses", url: "/microsoft-courses", visibility: "public" },
        { label: "Question Banks", url: "/question-banks", visibility: "public" },
        { label: "Notes", url: "/notes", visibility: "public" },
        { label: "Masterclass", url: "/masterclass", visibility: "public" },
        { label: "Contact", url: "/contact", visibility: "public" },
      ],
      question_banks_label: "Question Banks",
      question_banks_url: "/question-banks",
      tutorials_enabled: true,
      tutorials_heading: "Professional Growth Tracks",
      tutorials_description: "These tutorials focus on advanced engineering depth, delivery skills, and career progression for working professionals.",
    },
    hero: {
      tag: "For Working Professionals",
      headline: "Switch or grow your\ntech career faster.",
      bullets: [
        "Upskill with real-world projects",
        "Mentorship from senior engineers",
        "Designed for busy professionals",
      ],
      quick_programs: ["System Design", "Cloud & DevOps", "Backend Engineering", "Interview Prep", "AI for Engineers"],
      stats: [
        { value: "Flexible", label: "Weekend-friendly" },
        { value: "Senior", label: "Mentor support" },
        { value: "Career", label: "Switch plans" },
      ],
      cta: "Get Upskilling Plan",
      lead_title: "Start your journey",
      lead_success_title: "Sent!",
      lead_success_cta: "Send another",
    },
    benefits: {
      title: "Why professionals trust Tutorlix",
      subtitle: "Upskill faster and move ahead in your career.",
      items: [
        {
          icon: "rocket",
          title: "Career Acceleration",
          description: "Designed for career switch and growth.",
        },
        {
          icon: "brain-circuit",
          title: "Advanced Skill Paths",
          description: "Modern stacks used in real companies.",
        },
        {
          icon: "users",
          title: "1:1 Mentorship",
          description: "Solve real-world problems with experts.",
        },
      ],
    },
    about: {
      badge: "About Tutorlix",
      title: "Interactive learning that\nactually works.",
      description:
        "Take your math and computer science skills to the next level with Tutorlix. Say goodbye to boring lectures and hello to hands-on lessons and exciting projects.",
      cards: [
        {
          icon: "target",
          title: "Fortnightly Testing",
          description:
            "Track progress with challenging tests designed to apply your problem-solving skills.",
        },
        {
          icon: "brain-circuit",
          title: "High-Quality Content",
          description:
            "Well-recorded lectures and dynamic resources ensure an informative experience.",
        },
      ],
      image_url:
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop",
      quote: "Education is not the filling of a pail, but the lighting of a fire.",
      quote_author: "W.B. Yeats",
    },
    testimonials: {
      title: "Student Success Stories",
      subtitle: "Don't just take our word for it. Hear from our community.",
      items: [
        {
          name: "Diya Shukla",
          course: "Maths for BE, BTech, BBA and BCA",
          text: "Maths became simple and interesting.",
        },
        {
          name: "B. Jahnavi",
          course: "JEE Maths (One Year)",
          text: "Teaching style is very clear.",
        },
        {
          name: "Vinod Kumar",
          course: "Front End Development",
          text: "Every doubt is cleared properly.",
        },
      ],
    },
    tutorials: defaultProfessionalTutorials,
  },
};

const mergeSection = (baseSection = {}, overrideSection = {}) => {
  const merged = { ...baseSection, ...overrideSection };

  Object.keys(baseSection).forEach((key) => {
    if (Array.isArray(baseSection[key])) {
      merged[key] = Array.isArray(overrideSection?.[key])
        ? overrideSection[key]
        : baseSection[key];
    }
  });

  return merged;
};

export const normalizeTutorialPages = (tutorial, fallback = {}) => {
  const fallbackPages = Array.isArray(fallback.pages)
    ? fallback.pages
    : fallback?.slug
      ? [fallback]
      : [];

  const inputPages = Array.isArray(tutorial.pages)
    ? tutorial.pages
    : tutorial?.slug
      ? [tutorial]
      : [];

  return inputPages.map((page, index) => {
    const fallbackPage = fallbackPages.find((item) => item.slug === page.slug) || fallbackPages[index] || {};
    const fallbackConcepts = Array.isArray(fallbackPage.conceptsCovered) ? fallbackPage.conceptsCovered : [];
    const conceptsCovered = Array.isArray(page.conceptsCovered)
      ? page.conceptsCovered.map((concept) => {
          if (typeof concept === "string") {
            return buildConceptNote(
              page.slug || fallbackPage.slug || tutorial.slug || fallback.slug || "tutorial",
              page.title || fallbackPage.title || tutorial.title || fallback.title || "Tutorial",
              concept
            );
          }

          const conceptFallback = fallbackConcepts.find((item) => item.slug === concept.slug) || {};
          return {
            ...conceptFallback,
            ...concept,
          };
        })
      : fallbackConcepts;

    return {
      ...fallbackPage,
      ...page,
      conceptsCovered,
      learnPoints: Array.isArray(page.learnPoints)
        ? page.learnPoints
        : (Array.isArray(fallbackPage.learnPoints) ? fallbackPage.learnPoints : []),
    };
  });
};

const mergeTutorials = (baseTutorials = [], overrideTutorials) => {
  if (!Array.isArray(overrideTutorials)) {
    return baseTutorials;
  }

  return overrideTutorials.map((tutorial) => {
    const fallback = baseTutorials.find((item) => item.slug === tutorial.slug) || {};
    const pages = normalizeTutorialPages(tutorial, fallback);

    if (Array.isArray(tutorial.pages) || Array.isArray(fallback.pages)) {
      return {
        ...fallback,
        ...tutorial,
        pages,
      };
    }

    return {
      ...fallback,
      ...tutorial,
      ...pages[0],
      pages,
    };
  });
};

export const getAllDefaultTutorials = () =>
  Object.values(defaultProfileHomeContent).flatMap((profile) =>
    Array.isArray(profile?.tutorials) ? profile.tutorials : []
  );

export const findDefaultTutorial = (topicSlug) =>
  getAllDefaultTutorials().find((tutorial) => tutorial?.slug === topicSlug) || null;

export const findDefaultTutorialPage = (topicSlug, pageSlug = null) => {
  const tutorial = findDefaultTutorial(topicSlug);
  if (!tutorial) {
    return { tutorial: null, page: null };
  }

  const pages = normalizeTutorialPages(tutorial);
  const page =
    (pageSlug ? pages.find((item) => item?.slug === pageSlug) : null) ||
    pages[0] ||
    null;

  return { tutorial, page };
};

export const buildProfileHomeContent = (profileType, homeContent = {}) => {
  const fallback = defaultProfileHomeContent[profileType] || defaultProfileHomeContent.college;

  return {
    navigation: mergeSection(fallback.navigation, homeContent?.navigation),
    hero: mergeSection(fallback.hero, homeContent?.hero),
    benefits: mergeSection(fallback.benefits, homeContent?.benefits),
    about: mergeSection(fallback.about, homeContent?.about),
    testimonials: mergeSection(fallback.testimonials, homeContent?.testimonials),
    seo: normalizeSeoProfileContent(profileType, homeContent?.seo),
    tutorials: Array.isArray(homeContent?.tutorials)
      ? mergeTutorials(fallback.tutorials, homeContent.tutorials)
      : fallback.tutorials,
  };
};
