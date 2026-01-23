'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Check, Sparkles } from 'lucide-react';
import DotGrid from '@/components/DotGrid';
import { useProfile } from "@/context/ProfileContext";
import { z } from 'zod';
import FormBuilder from '@/components/FormBuilder';
import { productLeadAPI } from '@/lib/lmsService';
import { profileContent } from "@/app/data/homeContent";

// --- DYNAMIC INTEREST OPTIONS ---
const PROFILE_INTERESTS = {
  school: [
    { id: 'foundation', label: 'Class 9-10 Foundation' },
    { id: 'jee_neet', label: 'JEE/NEET Prep' },
    { id: 'coding_kids', label: 'Coding' }
  ],
  college: [
    { id: 'web', label: 'Full Stack Dev' },
    { id: 'data', label: 'Data Science & AI' },
    { id: 'dsa', label: 'DSA & Placement' }
  ],
  professional: [
    { id: 'system', label: 'System Design' },
    { id: 'cloud', label: 'Cloud & DevOps' },
    { id: 'switch', label: 'Career Switch' }
  ]
};

const leadSchema = z.object({
  name: z.string().min(1, "Full Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .length(10, "Phone number must be exactly 10 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),
  state: z.string().min(1, "State is required"),
});

function HeroFeatureItem({ text }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-1" />
      <p className="text-lg text-slate-200 font-medium leading-snug">{text}</p>
    </div>
  );
}

export default function HomeHero() {
  const { profileType } = useProfile();
  
  // Select content based on profile (fallback to college)
  const activeProfile = profileContent[profileType] || profileContent.college;
  const activeInterests = PROFILE_INTERESTS[profileType] || PROFILE_INTERESTS.college;

  const [selectedInterest, setSelectedInterest] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);

  // Reset selected interest when profile changes to avoid invalid states
  useEffect(() => {
    setSelectedInterest('');
  }, [profileType]);

  const leadFields = useMemo(() => [
    { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', required: true },
    { name: 'phone', label: 'Phone Number', type: 'phone', placeholder: '98765 43210', required: true },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com', required: true },
    { name: 'state', label: 'State', type: 'state_names', placeholder: 'Select your state', required: true },
  ], []);

  const handleLeadSubmit = async (formData) => {
    if (!selectedInterest) {
      alert("Please select an area of interest.");
      return;
    }

    try {
      setSubmittingLead(true);
      await productLeadAPI.create({
        name: formData.name,
        email: formData.email,
        phone: `+91${formData.phone}`,
        state: formData.state,
        source: 'Home Page',
        remarks: `Profile: ${activeProfile.formRole} | Interest: ${selectedInterest}`
      });
      setLeadSuccess(true);
      setSelectedInterest('');
    } catch (error) {
      console.error("Lead submission error", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmittingLead(false);
    }
  };

  return (
    <section className="relative bg-black text-white pt-16 pb-24 md:pt-24 md:pb-32">
      <div className="absolute inset-0 h-full w-full">
         <div style={{ width: '100%', height: '100%', position: 'relative' }}>
           <DotGrid
             dotSize={5}
             gap={15}
             baseColor="#271E37"
             activeColor="#5227FF"
             proximity={120}
             speedTrigger={100}
             shockRadius={250}
             shockStrength={5}
             maxSpeed={5000}
             resistance={750}
             returnDuration={1.5}
           />
         </div>
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-green-400 font-medium tracking-wide uppercase text-sm">
                {activeProfile.tag}
              </p>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-white">
                {activeProfile.headline}
              </h1>
            </div>
            <div className="space-y-6 pt-4">
              {activeProfile.bullets.map((text, i) => (
                <HeroFeatureItem key={i} text={text} />
              ))}
            </div>
          </div>

          {/* Right Form Card */}
          <div className="w-full max-w-md mx-auto lg:ml-auto relative z-10">
            <Card className="border-0 shadow-2xl shadow-slate-900/50 bg-white text-slate-900 rounded-2xl overflow-hidden">
              <CardHeader className="border-slate-100 bg-slate-50/50 mb-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Start your journey 
                </CardTitle>
                <p className="text-xs text-slate-500">Get a personalized learning roadmap</p>
              </CardHeader>
              
              <CardContent className="space-y-5 p-5 pt-0 mt-0">
                {leadSuccess ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                      <Check className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Request Received!</h3>
                    <p className="text-slate-600 text-sm">
                      Thanks for your interest. Our team will contact you shortly to guide you forward.
                    </p>
                    <Button variant="outline" onClick={() => setLeadSuccess(false)} className="mt-4">
                      Send another request
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">I am interested in</label>
                      <div className="flex flex-wrap gap-2">
                        {activeInterests.map((opt) => (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() => setSelectedInterest(opt.label)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 ${
                              selectedInterest === opt.label 
                                ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <FormBuilder
                      fields={leadFields}
                      validationSchema={leadSchema}
                      onSubmit={handleLeadSubmit}
                      submitLabel={activeProfile.cta}
                      isSubmitting={submittingLead}
                      className="grid grid-cols-1 gap-y-2"
                      submitButton={{ text: activeProfile.cta, loadingText: "Submitting..." }}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </section>
  );
}