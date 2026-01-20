"use client";

import {
    Dialog,
    DialogContent,
    DialogOverlay,
    DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { profileSelectionOptions } from "@/app/data/homeContent";

export default function ProfileTypeModal({ open, onSelect }) {
    return (
        <Dialog open={open}>
            {/* Dark + blur overlay */}
            <DialogOverlay className="bg-black/40 backdrop-blur-xl" />

            <DialogContent
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                className="max-w-2xl p-10 bg-white [&>button]:hidden"
            >
                {/* Accessibility title */}
                <VisuallyHidden>
                    <DialogTitle>Select your profile type</DialogTitle>
                </VisuallyHidden>

                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900">
                        Welcome to Tutorlix
                    </h2>
                    <p className="text-slate-500 mt-2">
                        Choose your profile to get a personalized experience
                    </p>
                </div>

                {/* One box per row */}
                <div className="flex flex-col gap-4">
                    {profileSelectionOptions.map((p) => {
                        const Icon = p.icon;

                        return (
                            <button
                                key={p.id}
                                onClick={() => onSelect(p.id)}
                                className="flex items-center gap-4 border rounded-xl p-5 text-left bg-white transition-all hover:border-indigo-500 hover:shadow-md"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 shrink-0">
                                    <Icon className="h-6 w-6" />
                                </div>

                                <div>
                                    <h3 className="text-base font-medium text-slate-900">
                                        {p.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {p.desc}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <p className="text-xs text-slate-400 text-center mt-6">
                    You can change this later from “Switch Profile”
                </p>
            </DialogContent>
        </Dialog>
    );
}
