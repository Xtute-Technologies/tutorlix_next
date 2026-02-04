"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Check, Sparkles, Search, Plus } from "lucide-react";
import DotGrid from "@/components/DotGrid";
import { useProfile } from "@/context/ProfileContext";
import { z } from "zod";
import FormBuilder from "@/components/FormBuilder";
import { productLeadAPI } from "@/lib/lmsService";
import { profileContent } from "@/app/data/homeContent";

// Shadcn UI components for the "More" menu
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const leadSchema = z.object({
  name: z.string().trim().min(1, "Please enter your full name"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().length(10, "Phone number must be 10 digits").regex(/^\d+$/, "Only numbers allowed"),
  state: z.string().min(1, "Please select your state"),
});

const PROFILE_INTERESTS = {
  school: [
    { id: "f1", name: "Class 9-10 Foundation" },
    { id: "f2", name: "JEE/NEET Prep" },
  ],
  college: [
    { id: "c1", name: "Full Stack Dev" },
    { id: "c2", name: "Data Science & AI" },
  ],
  professional: [
    { id: "p1", name: "System Design" },
    { id: "p2", name: "Cloud & DevOps" },
  ],
};

export default function HomeHero({ categories = [] }) {
  const { profileType } = useProfile();
  const [open, setOpen] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState("");
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);

  const activeProfile = profileContent[profileType] || profileContent.college;

  const finalInterests = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    return PROFILE_INTERESTS[profileType] || PROFILE_INTERESTS.college;
  }, [categories, profileType]);

  // Configuration for "More" logic
  const MAX_VISIBLE = 1;
  const visibleCategories = finalInterests.slice(0, MAX_VISIBLE);
  const remainingCategories = finalInterests.slice(MAX_VISIBLE);

  useEffect(() => {
    setSelectedInterest("");
  }, [profileType]);

  const leadFields = useMemo(
    () => [
      { name: "name", label: "Full Name", type: "text", placeholder: "John Doe", required: true },
      { name: "phone", label: "Phone Number", type: "phone", placeholder: "98765 43210", required: true },
      { name: "email", label: "Email", type: "email", placeholder: "john@example.com", required: true },
      { name: "state", label: "State", type: "state_names", placeholder: "Select your state", required: true },
    ],
    [],
  );

  const handleLeadSubmit = async (formData) => {
    if (!selectedInterest) {
      alert("Please select an area of interest.");
      return;
    }
    try {
      setSubmittingLead(true);
      await productLeadAPI.create({
        ...formData,
        phone: `${formData.phone}`,
        source: "Home Page",
        interest_area: `${selectedInterest}`,
      });
      setLeadSuccess(true);
    } catch (error) {
      alert("Something went wrong.");
    } finally {
      setSubmittingLead(false);
    }
  };

  return (
    <section className="relative bg-black text-white pt-16 pb-24 md:pt-24 md:pb-32">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <p className="text-green-400 font-medium uppercase text-sm tracking-wide">{activeProfile.tag}</p>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">{activeProfile.headline}</h1>
            <div className="space-y-6">
              {activeProfile.bullets.map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
                  <p className="text-lg text-slate-200">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Form Card */}
          <div className="w-full max-w-md mx-auto lg:ml-auto relative z-10">
            <Card className="border-0 shadow-2xl bg-white text-slate-900 rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" /> Start your journey
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 pt-2">
                {leadSuccess ? (
                  <div className="text-center py-10">
                    <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full mx-auto flex items-center justify-center mb-4">
                      <Check />
                    </div>
                    <h3 className="font-bold">Sent!</h3>
                    <Button variant="link" onClick={() => setLeadSuccess(false)}>
                      Send another
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-4">
                      <label className="text-xs font-semibold text-slate-500 uppercase">I am interested in</label>
                      <div className="flex flex-wrap gap-2">
                        {/* Visible categories */}
                        {visibleCategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedInterest(cat.name)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                              selectedInterest === cat.name
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}>
                            {cat.name}
                          </button>
                        ))}

                        {remainingCategories.length > 0 && (
                          <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                              <button
                                className={`px-3 py-1.5 text-xs font-medium rounded-md border flex items-center gap-1 ${
                                  remainingCategories.some((c) => c.name === selectedInterest)
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-slate-100 text-primary border-blue-100"
                                }`}>
                                <Plus className="h-3 w-3" />
                                {remainingCategories.some((c) => c.name === selectedInterest)
                                  ? selectedInterest
                                  : `${remainingCategories.length} More`}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[200px]" align="start">
                              <Command>
                                <CommandInput placeholder="Search interests..." />
                                <CommandList>
                                  <CommandEmpty>No results found.</CommandEmpty>
                                  <CommandGroup>
                                    {remainingCategories.map((cat) => (
                                      <CommandItem
                                        key={cat.id}
                                        value={cat.name}
                                        onSelect={(value) => {
                                          setSelectedInterest(cat.name);
                                          setOpen(false);
                                        }}>
                                        <Check className={`mr-2 h-4 w-4 ${selectedInterest === cat.name ? "opacity-100" : "opacity-0"}`} />
                                        {cat.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>

                    <FormBuilder
                      fields={leadFields}
                      validationSchema={leadSchema}
                      onSubmit={handleLeadSubmit}
                      submitLabel={activeProfile.cta}
                      isSubmitting={submittingLead}
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
