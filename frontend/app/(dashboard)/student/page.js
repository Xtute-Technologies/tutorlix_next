'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { bookingAPI, testScoreAPI, attendanceAPI } from '@/lib/lmsService'; // Check APIs
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, Clock, Award, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeCourses: 0,
    classesAttended: 0,
    avgScore: 0,
    nextClass: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Parallel fetch
        const [bookings, attendance, scores] = await Promise.all([
          bookingAPI.getAll().catch(() => []),
          attendanceAPI.getAll().catch(() => []),
          testScoreAPI.getAll().catch(() => [])
        ]);

        const activeCourses = Array.isArray(bookings)
          ? new Set(
            bookings
              .filter(b => b.payment_status === 'paid' && b?.product)
              .map(b => Number(b.product)) // ensure numeric
          ).size
          : 0;
        const attended = Array.isArray(attendance) ? attendance.filter(a => a.status === 'P').length : 0;

        // Calculate avg score
        let total = 0;
        let count = 0;
        if (Array.isArray(scores)) {
          scores.forEach(s => {
            const p = parseFloat(s.percentage);
            if (!isNaN(p)) {
              total += p;
              count++;
            }
          });
        }
        const avgScore = count > 0 ? (total / count).toFixed(1) : 0;

        setStats({
          activeCourses,
          classesAttended: attended,
          avgScore,
          nextClass: null // Would need class API for this
        });

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.first_name || 'Student'}!</h1>
        <p className="text-muted-foreground">Here is an overview of your learning progress.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCourses}</div>
            <p className="text-xs text-muted-foreground">Currently enrolled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes Attended</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.classesAttended}</div>
            <p className="text-xs text-muted-foreground">Total sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore}%</div>
            <p className="text-xs text-muted-foreground">Across all tests</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Link href="/student/classes" className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-slate-100 rounded-lg border border-dashed border-slate-300 transition-colors">
              <Calendar className="h-8 w-8 text-blue-500 mb-2" />
              <span className="font-bold text-slate-700">Book / Join Class</span>
            </Link>
            <Link href="/student/bookings" className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-slate-100 rounded-lg border border-dashed border-slate-300 transition-colors">
              <BookOpen className="h-8 w-8 text-green-500 mb-2" />
              <span className="font-bold text-slate-700">My Bookings</span>
            </Link>
          </CardContent>
        </Card>
        {/* <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>Contact your sales representative or support.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">Contact Support</Button>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}
