'use client';

import { useEffect, useState } from 'react';
import { studentClassAPI, courseClassAPI } from '@/lib/lmsService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Video, Clock, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';


export default function StudentClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [courseClasses, studentClasses] = await Promise.all([
        courseClassAPI.getAll().catch(()=>[]),
        studentClassAPI.getAll().catch(()=>[]),
      ]);
      
      const allClasses = [
        ...(Array.isArray(courseClasses) ? courseClasses : []).map(c => ({ ...c, type: 'Group Class' })),
        ...(Array.isArray(studentClasses) ? studentClasses : []).map(c => ({ ...c, type: 'Private Class' }))
      ].sort((a, b) => {
          const dateA = a.start_time ? new Date(a.start_time) : new Date(a.created_at);
          const dateB = b.start_time ? new Date(b.start_time) : new Date(b.created_at);
          return dateB - dateA;
      });

      setClasses(allClasses);

    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };



  // Reusable Card Component
  const ClassCard = ({ classItem }) => {
    // If backend provides explicit flags (new system), use them.
    // Otherwise fallback to frontend logic (legacy/private classes).
    
    // Default assumptions
    let isJoinable = false;
    let isExpired = false;
    let timeDisplay = classItem.time || 'TBA';
    let dateDisplay = '';

    // Logic for Course Specific Classes (Group Classes)
    if (classItem.type === 'Group Class') {
        const start = classItem.start_time ? new Date(classItem.start_time) : null;
        const end = classItem.end_time ? new Date(classItem.end_time) : null;
        
        // 1. Check Expiry from Backend Flag
        if (classItem.is_booking_expired) {
            isExpired = true;
        }

        // 2. Check Join Status
        // If backend sends 'link', it implies join is allowed. 
        // We can also double check with 'join_allowed' flag if present.
        if (classItem.link && !isExpired) {
            isJoinable = true;
        }

        // Formatting
        if (start) {
             dateDisplay = start.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
             timeDisplay = `${start.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})} ${end ? ' - ' + end.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'}) : ''}`;
        }
    } 
    // Logic for Student Specific Classes (Private Classes - Legacy)
    else {
        // Private classes typically don't expire in the same way, or handled differently.
        // Assume always joinable if link exists for now, unless we add expiry logic there too.
         if (classItem.class_link || classItem.link) {
            isJoinable = true;
         }
    }

    return (
    <Card className={`mb-4 transition-shadow ${isExpired ? 'bg-red-50 border-red-100' : 'hover:shadow-md'}`}>
      <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={classItem.type === 'Group Class' ? 'default' : 'secondary'}>
              {classItem.type}
            </Badge>
            {classItem.product_name && <Badge variant="outline">{classItem.product_name}</Badge>}
            {isExpired && <Badge variant="destructive">Booking Expired</Badge>}
          </div>
          <h3 className="text-xl font-bold">{classItem.name || 'Untitled Class'}</h3>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
            {dateDisplay && (
                <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {dateDisplay}
                </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {timeDisplay}
            </div>
            {classItem.teacher_name && (
              <div className="flex items-center gap-1">
                <span className="font-semibold">Instructor:</span> {classItem.teacher_name}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            {/* Case 1: Active & Joinable */}
            {isJoinable && !isExpired && (
            <Button asChild className="w-full md:w-auto">
                <a href={classItem.link || classItem.class_link} target="_blank" rel="noopener noreferrer">
                <Video className="h-4 w-4 mr-2" /> Join Class
                </a>
            </Button>
            )}

            {/* Case 2: Expired Subscription */}
            {isExpired && (
                <Button variant="destructive" className="w-full md:w-auto" onClick={() => window.location.href = `/courses/${classItem.product || ''}`}>
                    Renew / Pay Now
                </Button>
            )}

            {/* Case 3: Not Joinable (Too early, Ended, etc) but NOT Expired */}
            {!isJoinable && !isExpired && classItem.start_time && (
                <Button disabled variant="outline" className="w-full md:w-auto opacity-70 cursor-not-allowed">
                     <Clock className="h-4 w-4 mr-2" /> 
                    {(() => {
                        const now = new Date();
                        const start = new Date(classItem.start_time);
                        const end = classItem.end_time ? new Date(classItem.end_time) : new Date(start.getTime() + 60*60*1000);
                        
                        if (now > end) return "Class Ended";
                        if (now < start) return "Not Started Yet";
                        return "Session Locked"; // Should rarely happen if time logic is consistent
                    })()}
                </Button>
            )}
        </div>
      </CardContent>
    </Card>
  )};

  // Helper list renderer to avoid duplication
  const ClassList = ({ data }) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-muted-foreground">No classes found in this category.</p>
        </div>
      );
    }
    return data.map((cls, idx) => <ClassCard key={idx} classItem={cls} />);
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Classes</h1>
          <p className="text-muted-foreground">Join upcoming sessions or schedule new ones.</p>
        </div>
        

      </div>

      {/* Tabs for Filtering */}
      <Tabs defaultValue="all" className="w-full space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Classes</TabsTrigger>
          <TabsTrigger value="group">Group Classes</TabsTrigger>
          <TabsTrigger value="private">Private Classes</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ClassList data={classes} />
        </TabsContent>

        <TabsContent value="group" className="space-y-4">
          <ClassList data={classes.filter(c => c.type === 'Group Class')} />
        </TabsContent>

        <TabsContent value="private" className="space-y-4">
          <ClassList data={classes.filter(c => c.type === 'Private Class')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}