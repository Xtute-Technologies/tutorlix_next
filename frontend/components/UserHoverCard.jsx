import React from 'react';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Phone, Mail, User, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function UserHoverCard({ user, children, side = "right", currentUserRole }) {
    if (!user) return children;

    const initials = user.full_name
        ? user.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
        : (user.username ? user.username.substring(0, 2).toUpperCase() : 'U');

    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <div className="cursor-pointer inline-flex">
                    {children}
                </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-80" side={side}>
                <div className="flex justify-between space-x-4">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={user.profile_image} alt={user.full_name} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 flex-1">
                        <h4 className="text-sm font-semibold">{user.full_name || user.username}</h4>
                        <div className="flex items-center pt-2 gap-1 mb-2">
                             {user.role && (
                                <Badge variant="secondary" className="text-xs uppercase">
                                    {user.role}
                                </Badge>
                             )}
                        </div>
                        
                        {user.email && (
                            <div className="flex items-center text-xs text-muted-foreground">
                                <Mail className="mr-2 h-3 w-3" />
                                {user.email}
                            </div>
                        )}
                        
                        {user.phone && (
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <Phone className="mr-2 h-3 w-3" />
                                {user.phone}
                            </div>
                        )}

                        {/* If we only have basic info, maybe show a generic message or ID */}
                        {(!user.email && !user.phone && !user.role) && (
                            <span className="text-xs text-muted-foreground">
                                ID: {user.id}
                            </span>
                        )}
                        
                        {currentUserRole === 'admin' && (
                            <div className="pt-2">
                                <Link href={`/admin/users-management?userId=${user.id}`} passHref>
                                    <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                        <ExternalLink className="mr-2 h-3 w-3" />
                                        View Details
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
