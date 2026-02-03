'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!text) return;
    
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            // Fixed width prevents the "jumping" effect
            className="h-8 w-20 relative overflow-hidden hover:bg-zinc-100 transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center text-green-600 font-medium"
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-[11px]">Done</span>
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center text-zinc-500"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-[11px]">Copy</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
  
        
   
  );
};

export default CopyButton;