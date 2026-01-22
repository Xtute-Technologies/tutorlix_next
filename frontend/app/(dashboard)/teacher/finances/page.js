'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { teacherExpenseAPI } from '@/lib/lmsService';
import SharedExpenseList from '@/components/SharedExpenseList';
import { Card, CardContent } from '@/components/ui/card';
import { IndianRupee, TrendingDown } from 'lucide-react';

export default function TeacherFinancesPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (!user || user.role !== 'teacher') {
            router.push('/dashboard');
            return;
        }
        fetchData();
    }, [user, router]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // The API response for teachers will be filtered by the backend to show only their expenses
            const data = await teacherExpenseAPI.getAll();
            setExpenses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Fetch error:', error);
            setMessage({ type: 'error', text: 'Failed to fetch financial records' });
            setExpenses([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Finances</h1>
                    <p className="text-gray-600 mt-1">
                        Track Salary and financial incentives recorded by the platform.
                    </p>
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                    {message.text}
                </div>
            )}

            <SharedExpenseList
                data={expenses}
                loading={loading}
                userRole="teacher"
                onEdit={() => { }} // Teachers cannot edit
                onDelete={() => { }} // Teachers cannot delete
                entityType="teacher"
            />
        </div>
    );
}
