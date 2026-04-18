'use client';

import { motion } from 'framer-motion';
import { useProfile } from "@/context/ProfileContext";
import { HOME_ICON_MAP } from "@/app/data/homeContent";

export default function HomeBenefits() {
  const { activeHomeContent } = useProfile();
  const activeBenefits = activeHomeContent?.benefits || {};
  const benefitItems = Array.isArray(activeBenefits.items) ? activeBenefits.items : [];

  return (
    <section className="py-12 bg-white overflow-hidden border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            {activeBenefits.title}
          </h2>
          <p className="text-sm md:text-base text-slate-600">
            {activeBenefits.subtitle}
          </p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6"
        >
          {benefitItems.map((benefit, index) => {
            const Icon = HOME_ICON_MAP[benefit.icon] || HOME_ICON_MAP.users;
            return (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, ease: "easeOut" },
                  },
                }}
                className="relative group p-4"
              >
                <div className="absolute top-0 left-6 w-[2px] h-0 bg-primary group-hover:h-full transition-all duration-700 ease-in-out opacity-20 group-hover:opacity-100" />
                <div className="relative pl-6">
                  <div className="mb-3 inline-flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 text-slate-900 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
