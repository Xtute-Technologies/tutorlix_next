import React from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, User as UserIcon, Calendar, DollarSign, Eye, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function NoteHoverCard({ note, children, side = "right", align = "start", linkHref }) {
  if (!note) return children;

  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(note.effective_price || note.price); // Using effective price as it handles discounts

  const targetLink = linkHref || (note.slug ? `/notes/${note.slug}` : `/notes/${note.id}`);

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="cursor-pointer inline-flex">{children}</div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0 overflow-hidden" side={side} align={align}>
        {/* Header */}
        <div className="bg-muted/50 p-3 border-b flex items-start gap-3">
          <div className="bg-primary/10 p-2 rounded-md shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold leading-tight line-clamp-2 mb-1">{note.title}</h4>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-background">
                {note.note_type === "course_specific" ? "Course Note" : "Individual"}
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] h-5 px-1.5 font-normal capitalize",
                  note.privacy === "public" && "bg-green-100 text-green-700 hover:bg-green-100",
                  note.privacy === "purchaseable" && "bg-amber-100 text-amber-700 hover:bg-amber-100",
                  note.privacy === "logged_in" && "bg-blue-100 text-blue-700 hover:bg-blue-100",
                )}>
                {note.privacy}
              </Badge>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Description */}
          {note.description ? (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{note.description}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No description available.</p>
          )}

          {/* Creator Info - Must Show as requested */}
          {note.creator && (
            <div className="flex items-center gap-3 p-2 rounded-md bg-slate-50 border border-slate-100">
              <Avatar className="h-8 w-8 border bg-white">
                <AvatarImage src={note.creator?.profile_image} />
                <AvatarFallback className="text-xs">{note.creator?.full_name?.[0] || "T"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-semibold truncate text-slate-900">{note.creator?.full_name || "Unknown Teacher"}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="bg-blue-100 text-blue-700 px-1 rounded-[2px]">{note.creator?.role || "Creator"}</span>
                </span>
              </div>
            </div>
          )}

          {/* Footer Info */}
          
          {/* <div className="flex items-center justify-between pt-1 border-t mt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(note.created_at).toLocaleDateString()}</span>
            </div>
            <div className="font-semibold text-sm">
              {note.price > 0 ? <span className="text-green-600">{formattedPrice}</span> : <span className="text-slate-500">Free</span>}
            </div>
          </div> */}

          {/* Action Button */}
          <Button size="sm" className="w-full h-8 text-xs gap-2" asChild>
            <Link href={targetLink} prefetch={false}>
              Open Preview <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
