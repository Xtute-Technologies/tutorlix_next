'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Users, 
    BookOpen, 
    Calendar, 
    Video, 
    Clock, 
    ArrowRight,
    PlayCircle
} from 'lucide-react';
import { productAPI, courseClassAPI, studentClassAPI } from '@/lib/lmsService';
import { authService } from '@/lib/authService';
import Link from 'next/link';

export default function TeacherDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCourses: 0,
        totalStudents: 0,
        classesToday: 0
    });
    const [myCourses, setMyCourses] = useState([]);
    const [todaysClasses, setTodaysClasses] = useState([]);
    const [upcomingClasses, setUpcomingClasses] = useState([]);

    useEffect(() => {
        if (user && user.role !== 'teacher') {
            router.push('/dashboard');
            return;
        }
        if (user) {
            fetchDashboardData();
        }
    }, [user, router]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [
                coursesRes,
                courseClassesRes,
                studentClassesRes,
                studentsRes
            ] = await Promise.all([
                productAPI.getAll({ my_products: 'true' }),
                courseClassAPI.getAll(),
                studentClassAPI.getAll(),
                authService.getAllUsers({ role: 'student' })
            ]);

            const courses = Array.isArray(coursesRes) ? coursesRes : [];
            const courseClasses = Array.isArray(courseClassesRes) ? courseClassesRes : [];
            const studentClasses = Array.isArray(studentClassesRes) ? studentClassesRes : [];
            const students = Array.isArray(studentsRes?.results) ? studentsRes.results : [];

            // Combine both types of classes
            const allClasses = [
                ...courseClasses.map(c => ({
                    ...c, 
                    type: 'course', 
                    title: c.name || `Class for ${c.product_name}`,
                    meeting_link: c.link // Normalize link from CourseSpecificClass
                })),
                ...studentClasses.map(c => ({
                    ...c, 
                    type: 'student', 
                    title: c.name,
                    meeting_link: c.class_link // Normalize class_link from StudentSpecificClass
                }))
            ];

            // Filter for Today and Upcoming
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const todayClasses = allClasses.filter(c => {
                // Assuming c.start_time or c.time contains the date/time string
                // Note: The backend models have different field names potentially depending on migration state
                // Admin ClassesStudent uses 'time' (string), CourseSpecificClass uses 'start_time' (datetime)
                // We need to parse dates carefully.
                
                // For course classes (datetime)
                if (c.start_time) {
                    const classDate = new Date(c.start_time);
                    return classDate >= today && classDate < tomorrow;
                }
                return false; 
                // Student classes currently use a string 'time' which might optionally contain date or just recurring time
                // If it's just a string like "Mondays 10am", we can't easily map to "Today" without robust parsing.
                // For this dashboard, we might focus primarily on Course Classes which have definite start_time, 
                // or safely ignore student classes in "Today" unless we parse them.
            });

            // Sort upcoming by date
            const sortedClasses = allClasses
                .filter(c => c.start_time)
                .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                .filter(c => new Date(c.start_time) >= today);

            setStats({
                totalCourses: courses.length,
                totalStudents: students.length, // Only returns "my students" due to backend logic
                classesToday: todayClasses.length
            });

            setMyCourses(courses.slice(0, 4)); // Top 4
            setTodaysClasses(todayClasses);
            setUpcomingClasses(sortedClasses.slice(0, 5));

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome, {user?.first_name || 'Teacher'}!</h1>
                <p className="text-gray-500 mt-1">Here is what's happening with your courses today.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-md">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 font-medium text-sm uppercase">My Courses</p>
                            <h2 className="text-4xl font-bold mt-2">{stats.totalCourses}</h2>
                        </div>
                        <div className="bg-white/20 p-3 rounded-full">
                            <BookOpen className="h-8 w-8 text-white" />
                        </div>
                    </CardContent>
                </Card>

                {/* <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-md">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-emerald-100 font-medium text-sm uppercase">Active Students</p>
                            <h2 className="text-4xl font-bold mt-2">{stats.totalStudents}</h2>
                        </div>
                        <div className="bg-white/20 p-3 rounded-full">
                            <Users className="h-8 w-8 text-white" />
                        </div>
                    </CardContent>
                </Card> */}

                <Card className="bg-white border text-gray-800 shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 font-medium text-sm uppercase">Classes Today</p>
                            <h2 className="text-4xl font-bold mt-2 text-indigo-600">{stats.classesToday}</h2>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-full">
                            <Calendar className="h-8 w-8 text-indigo-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area (Left 2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* My Courses Section */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-blue-600" />
                                My Courses
                            </h2>
                            <Link href="/teacher/classes-course">
                                <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                    View All <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {myCourses.length > 0 ? (
                                myCourses.map(course => (
                                    <Card key={course.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 line-clamp-1">{course.name}</h3>
                                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description}</p>
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <Badge variant="secondary" className="text-xs">
                                                            {course.total_seats} seats
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs">
                                                            {course.category_name || 'General'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-2 bg-gray-50 p-8 rounded-lg text-center border dashed border-gray-200">
                                    <p className="text-gray-500">You are not assigned to any courses yet.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Upcoming Classes Section */}
                    <section>
                         <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Video className="h-5 w-5 text-indigo-600" />
                                Upcoming Classes
                            </h2>
                            <Link href="/teacher/classes-course">
                                <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                    Full Schedule <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {upcomingClasses.length > 0 ? (
                                upcomingClasses.map((cls, index) => (
                                    <Card key={`${cls.type}-${cls.id}-${index}`} className="border-l-4 border-l-indigo-400">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-indigo-50 p-2 rounded-lg text-center min-w-[60px]">
                                                    <p className="text-xs text-indigo-600 font-bold uppercase">
                                                        {new Date(cls.start_time).toLocaleString('en-US', { month: 'short' })}
                                                    </p>
                                                    <p className="text-lg font-bold text-gray-800">
                                                        {new Date(cls.start_time).getDate()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">{cls.title}</h4>
                                                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {new Date(cls.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <Badge variant="outline" className="text-xs uppercase scale-90 origin-left">
                                                            {cls.type === 'student' ? '1-on-1' : 'Group'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            {cls.meeting_link && (
                                                <a href={cls.meeting_link} target="_blank" rel="noopener noreferrer">
                                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                                        Join
                                                    </Button>
                                                </a>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="bg-gray-50 p-8 rounded-lg text-center border dashed border-gray-200">
                                    <p className="text-gray-500">No upcoming classes scheduled soon.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Sidebar Information (Right 1/3) */}
                <div className="space-y-8">
                    {/* Today's Schedule Card */}
                    <Card className="bg-white border-orange-100 shadow-sm h-fit">
                        <CardHeader className="bg-orange-50 border-b border-orange-100 pb-3">
                            <CardTitle className="text-lg font-bold text-orange-800 flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Happening Today
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {todaysClasses.length > 0 ? (
                                <ul className="divide-y divide-gray-100">
                                    {todaysClasses.map((cls, i) => (
                                        <li key={i} className="p-4 hover:bg-orange-50/30 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-gray-800 text-sm">
                                                    {new Date(cls.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none">
                                                    Today
                                                </Badge>
                                            </div>
                                            <p className="text-sm font-medium text-gray-700">{cls.title}</p>
                                            <p className="text-xs text-gray-500 mt-1 truncate">
                                                {cls.product_name}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-6 text-center text-gray-500 text-sm">
                                    No classes scheduled for today.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <PlayCircle className="h-5 w-5 text-gray-500" />
                                Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-1 gap-2">
                            <Link href="/teacher/classes-course">
                                <Button variant="outline" className="w-full justify-start">
                                    Schedule New Class
                                </Button>
                            </Link>
                            <Link href="/teacher/recordings">
                                <Button variant="outline" className="w-full justify-start">
                                    Upload Recording
                                </Button>
                            </Link>
                            <Link href="/teacher/attendance">
                                <Button variant="outline" className="w-full justify-start">
                                    Mark Attendance
                                </Button>
                            </Link>
                            <Link href="/teacher/test-scores">
                                <Button variant="outline" className="w-full justify-start">
                                    Update Test Scores
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
