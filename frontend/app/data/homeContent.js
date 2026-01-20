import {
    Rocket,
    Users,
    Code2,
    BookOpen,
    Target,
    BrainCircuit,
} from "lucide-react";

import { GraduationCap, School, Laptop } from "lucide-react";

/* ================= PROFILE SELECTION MODAL ================= */

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

/* ================= PROFILE HERO CONTENT ================= */

export const profileContent = {
    school: {
        tag: "For School Students",
        headline: (
            <>
                Build strong foundations <br />
                early. <span className="text-slate-400">The right way.</span>
            </>
        ),
        bullets: [
            "Concept clarity with expert teachers",
            "Maths & science made easy",
            "Learn at your own pace",
        ],
        formRole: "student",
        cta: "Get Academic Guidance",
    },

    college: {
        tag: "For College Students",
        headline: (
            <>
                Become job-ready <br />
                before graduation.
            </>
        ),
        bullets: [
            "Industry-aligned curriculum",
            "Internship & placement support",
            "Hands-on project learning",
        ],
        formRole: "student",
        cta: "Get Career Guidance",
    },

    professional: {
        tag: "For Working Professionals",
        headline: (
            <>
                Switch or grow your <br />
                tech career <span className="text-slate-400">faster.</span>
            </>
        ),
        bullets: [
            "Upskill with real-world projects",
            "Mentorship from senior engineers",
            "Designed for busy professionals",
        ],
        formRole: "professional",
        cta: "Get Upskilling Plan",
    },
};

/* ================= WHY US / BENEFITS ================= */

export const benefitsData = {
    school: {
        title: "Why students love Tutorlix",
        subtitle: "Strong concepts, clear basics, and learning made fun.",
        items: [
            {
                icon: BookOpen,
                title: "Concept Clarity",
                description: "Simple explanations that build strong foundations.",
            },
            {
                icon: Users,
                title: "Expert Teachers",
                description: "Learn from experienced teachers.",
            },
            {
                icon: Target,
                title: "Step-by-Step Learning",
                description: "Structured learning for school success.",
            },
        ],
    },

    college: {
        title: "Why college students choose us",
        subtitle: "Learn skills that actually matter in the real world.",
        items: [
            {
                icon: Rocket,
                title: "Industry-Oriented Learning",
                description: "Curriculum aligned with placements.",
            },
            {
                icon: Code2,
                title: "Hands-on Projects",
                description: "Build real projects for your portfolio.",
            },
            {
                icon: Users,
                title: "Mentorship Support",
                description: "Guidance from senior mentors.",
            },
        ],
    },

    professional: {
        title: "Why professionals trust Tutorlix",
        subtitle: "Upskill faster and move ahead in your career.",
        items: [
            {
                icon: Rocket,
                title: "Career Acceleration",
                description: "Designed for career switch & growth.",
            },
            {
                icon: BrainCircuit,
                title: "Advanced Skill Paths",
                description: "Modern stacks used in real companies.",
            },
            {
                icon: Users,
                title: "1:1 Mentorship",
                description: "Solve real-world problems with experts.",
            },
        ],
    },
};

/* ================= TESTIMONIALS ================= */

export const testimonialsData = [
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
];
