'use client';

import { useEffect, useState } from 'react';
import { bookingAPI } from '@/lib/lmsService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Plus, Eye, MoreHorizontal, ExternalLink, MapPin, Phone, Mail, User, CreditCard } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// MAKE SURE THIS PATH IS CORRECT FOR YOUR PROJECT STRUCTURE
import CreateBookingForm from './CreateBookingForm';
import Link from 'next/link';

export default function SellerBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [selectedBooking, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const bookingsRes = await bookingAPI.getAll({ ordering: '-booking_date' });
      setBookings(bookingsRes);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSuccess = () => {
    fetchData();
    setIsCreateDialogOpen(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleViewStudent = (studentData) => {
    // Normalize student data structure just in case it's a flat string or object
    // const student = typeof studentData === 'object' ? studentData : { name: studentData };
    setSelectedStudent(studentData);
    setStudentDialogOpen(true);
  };

  const columns = [
    {
      accessorKey: 'student_name',
      header: 'Student',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900">{row.original.student_name}</div>
          <div className="text-sm text-gray-500">{row.original?.student_email || "No email"}</div>
        </div>
      ),
    },
    {
      accessorKey: 'course_name',
      header: 'Course',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.course_name}</span>
      ),
    },
    {
      accessorKey: 'final_amount',
      header: 'Amount',
      cell: ({ row }) => `₹${row.original.final_amount}`,
    },
    {
      accessorKey: 'payment_status',
      header: 'Status',
      cell: ({ row }) => {
        const colors = {
          paid: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200",
          pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200",
          failed: "bg-red-100 text-red-700 hover:bg-red-200 border-red-200",
        }
        return (
          <Badge variant="outline" className={`${colors[row.original.payment_status] || "bg-gray-100"} capitalize`}>
            {row.original.payment_status}
          </Badge>
        );
      },
    },
    {
      id: "payment_link",
      header: "Link",
      cell: ({ row }) => (
        row.original.payment_link ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-blue-600 gap-2"
            onClick={() => copyToClipboard(row.original.payment_link)}
          >
            <Copy className="h-3 w-3" />
            <span className="underline">Copy</span>
          </Button>
        ) : <span className="text-gray-400 text-xs">-</span>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleViewStudent(row.original)}
            title="View Student Details"
          >
            <Eye className="h-4 w-4 text-gray-500" />
          </Button>
        )
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings History</h1>
          <p className="text-gray-600 mt-1">Manage student enrollments and payments</p>
        </div>

        {/* CREATE BOOKING DIALOG */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
              <DialogDescription>
                Generate a payment link for a new student.
              </DialogDescription>
            </DialogHeader>

            {/* IF THIS IS EMPTY: check that 'CreateBookingForm.jsx' exists 
                and is exported correctly as 'export default function...' 
            */}
            <div className="mt-4">
              <CreateBookingForm onSuccess={handleBookingSuccess} />
            </div>

          </DialogContent>
        </Dialog>
      </div>

      {/* VIEW DETAILS DIALOG (Updated) */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className={"sm:max-w-2xl"}>
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>

          {selectedBooking ? (
            <div className="space-y-6 py-2 text-sm">

              {/* Student Section */}
              <section className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <User className="h-3 w-3" />
                  Student Information
                </h4>

                <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
                  {[
                    ["Name", selectedBooking.student_name],
                    ["Email", selectedBooking.student_email || "-"],
                    ["Phone", selectedBooking.student_phone || "-"],
                    ["State", selectedBooking.student_state],
                  ].map(
                    ([label, value]) =>
                      value && (
                        <div key={label} className="flex justify-between gap-4">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-foreground text-right">
                            {value}
                          </span>
                        </div>
                      )
                  )}
                </div>
              </section>

              {/* Order Section */}
              <section className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  Order Details
                </h4>

                <div className="rounded-md border border-border p-4 space-y-3">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Course</span>
                    <span className="font-semibold text-foreground text-right">
                      {selectedBooking.product_name}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Booking Date</span>
                    <span className="text-foreground">
                      {new Date(selectedBooking.booking_date).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="text-lg font-bold text-foreground">
                      ₹{selectedBooking.final_amount}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-muted-foreground">Payment Status</span>
                    <Badge
                      variant={
                        selectedBooking.payment_status === "paid"
                          ? "default"
                          : "secondary"
                      }
                      className="capitalize"
                    >
                      {selectedBooking.payment_status}
                    </Badge>
                  </div>

                  {/* Payment Link */}
                  {selectedBooking.payment_link && (
                    <div className="pt-3 mt-2 border-t border-border space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Payment Link
                      </span>

                      <div className="flex gap-2">

                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() =>
                            copyToClipboard(selectedBooking.payment_link)
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>

                        <a
                          href={selectedBooking.payment_link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="icon" variant="outline" className="h-7 w-7">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Footer */}
              <div className="pt-2 text-center text-xs text-muted-foreground">
                <p>
                  Booked by{" "}
                  <span className="font-medium text-foreground">
                    {selectedBooking.sales_rep_name}
                  </span>
                </p>
                <p className="mt-1 opacity-70">Ref: {selectedBooking.booking_id}</p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Loading details...
            </div>
          )}
        </DialogContent>
      </Dialog>


      <DataTable
        columns={columns}
        data={bookings}
        loading={loading}
        searchKey="student_name"
      />
    </div>
  );
}