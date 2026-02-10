"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, ShoppingCart, Info, CheckCircle } from "lucide-react";
import { notePurchaseAPI, noteAPI } from "@/lib/notesService";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function NoteEnrollmentDialog({ note, trigger, onSuccess }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const price = note.effective_price || note.price || 0;
  const isFree = price <= 0;
  // If not explicitly purchaseable, treats as free enrollment
  const isFreeEnrollment = isFree && note.privacy !== 'purchaseable';

  const handleEnroll = async () => {
    try {
      setLoading(true);

      if (isFreeEnrollment) {
         await noteAPI.enroll(note.id);
         toast.success("Enrolled successfully!");
         setOpen(false);
         if (onSuccess) onSuccess();
         router.refresh();
         return;
      }

      const data = await notePurchaseAPI.create({ note_id: note.id });
      
      if (data.payment_status === 'paid') {
         // Free purchase succeeded immediately (e.g. price 0 but purchaseable type)
         toast.success("Enrolled successfully!");
         setOpen(false);
         if (onSuccess) onSuccess();
         router.refresh();
      } else if (data.payment_link) {
         // Paid purchase - redirect
         toast.success("Redirecting to payment...");
         window.location.href = data.payment_link;
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Enrollment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Get Access</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             {isFree ? <CheckCircle className="h-5 w-5 text-green-600" /> : <ShoppingCart className="h-5 w-5 text-primary" />}
             {isFree ? "Get Free Access" : "Purchase Note"}
          </DialogTitle>
          <DialogDescription>
            You are about to enroll in <strong>{note.title}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
           {!isFree && (
              <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
                  <span className="text-sm font-medium">Price:</span>
                  <div className="flex flex-col items-end">
                      {note.discounted_price ? (
                         <>
                             <span className="text-xs text-muted-foreground line-through">₹{note.price}</span>
                             <span className="text-lg font-bold text-green-600">₹{note.effective_price}</span>
                         </>
                      ) : (
                         <span className="text-lg font-bold">₹{note.price}</span>
                      )}
                  </div>
              </div>
           )}

           {isFree && (
              <div className="flex items-start gap-3 p-3 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>This note is free! Click confirm to add it to your library instantly.</p>
              </div>
           )}

           {note.access_duration_days > 0 && (
               <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                  <Lock className="h-3 w-3" />
                  <span>Valid for <strong>{note.access_duration_days} days</strong> after perusal.</span>
               </div>
           )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleEnroll} disabled={loading} className={isFree ? "bg-green-600 hover:bg-green-700" : ""}>
             {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
             {isFree ? "Confirm & Add to Library" : "Proceed to Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
