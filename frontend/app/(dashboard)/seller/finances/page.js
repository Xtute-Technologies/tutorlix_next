'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { sellerExpenseAPI } from '@/lib/lmsService';
import SellerExpenseList from '@/components/seller/SellerExpenseList';
import { Card, CardContent } from '@/components/ui/card';
import { IndianRupee, TrendingDown } from 'lucide-react';

export default function SellerFinancesPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (!user || user.role !== 'seller') {
            router.push('/dashboard');
            return;
        }
        fetchData();
    }, [user, router]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // The API response for sellers will be filtered by the backend to show only their expenses
            const data = await sellerExpenseAPI.getAll();
            setExpenses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Fetch error:', error);
            setMessage({ type: 'error', text: 'Failed to fetch financial records' });
            setExpenses([]);
        } finally {
            setLoading(false);
        }
    };

    // const totalStats = expenses.reduce((acc, curr) => {
    //     return acc + parseFloat(curr.amount || 0);
    // }, 0);

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

            {/* Stats Card */}
            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-none shadow-md">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-red-100 font-medium text-sm uppercase">Total Deducted Expenses</p>
                            <h2 className="text-3xl font-bold mt-2 flex items-center">
                                <IndianRupee className="h-6 w-6 mr-1" />
                                {totalStats.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </h2>
                        </div>
                        <div className="bg-white/20 p-3 rounded-full">
                            <TrendingDown className="h-8 w-8 text-white" />
                        </div>
                    </CardContent>
                </Card>
            </div> */}

            {message.text && (
                <div className={`p-4 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                    {message.text}
                </div>
            )}


            {/* <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-800">Expense History</h3>
            </div> */}

            <SellerExpenseList
                data={expenses}
                loading={loading}
                userRole="seller"
                onEdit={() => { }} // Sellers cannot edit
                onDelete={() => { }} // Sellers cannot delete
            />


        </div>
    );
}
