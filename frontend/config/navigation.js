import {
  BookOpen,
  Settings2,
  LayoutDashboard,
  Package,
  Tag,
  Percent,
  ShoppingCart,
  Users,
  Video,
  CheckSquare,
  GraduationCap,
  DollarSign,
  MessageSquare,
  File,
  FileText,
} from "lucide-react";

export const getNavItems = (role) => {
  // Seller Specific Navigation
  if (role === "seller") {
    return [
      {
        title: "Seller Dashboard",
        url: "/seller",
        icon: LayoutDashboard,
        isActive: true,
        items: [
          { title: "View Bookings", url: "/seller/bookings" },
          { title: "Finances", url: "/seller/finances" }
        ],
      },
    ];
  }

  // Admin Navigation
  if (role === "admin") {
    return [
      {
        title: "Dashboard",
        url: "/admin",
        icon: LayoutDashboard,
        isActive: true,
        items: [{ title: "Overview", url: "/admin" }],
      },
      {
        title: "Management",
        url: "#",
        icon: Settings2,
        isActive: true,
        items: [
          { title: "Users", url: "/admin/users-management", icon: Users },
          { title: "Products", url: "/admin/products", icon: Package },
          { title: "Categories", url: "/admin/categories", icon: Tag },
          { title: "Offers", url: "/admin/offers", icon: Percent },
          { title: "Bookings", url: "/admin/bookings", icon: ShoppingCart },
        ],
      },
       {
        title: "Study Material",
        url: "#",
        icon: FileText,
        isActive: true,
        items: [
          { title: "Notes Manage", url: "/admin/notes", icon: FileText },
          { title: "Student Enrollments", url: "/admin/notes/enrollments", icon: Users },
          { title: "Transaction", url: "/admin/notes/transactions", icon: Users },

        ],
      },
      {
        title: "Marketing",
        url: "#",
        icon: Settings2,
        isActive: true,
        items: [
          { title: "Micro Video", url: "/admin/users-management", icon: Users },
        ],
      },
      {
        title: "Academic",
        url: "#",
        icon: BookOpen,
        isActive: true,
        items: [
          { title: "Student Classes", url: "/admin/classes-student", icon: Users },
          { title: "Course Classes", url: "/admin/classes-course", icon: BookOpen },
          { title: "Recordings", url: "/admin/recordings", icon: Video },
          { title: "Attendance", url: "/admin/attendance", icon: CheckSquare },
          { title: "Test Scores", url: "/admin/test-scores", icon: GraduationCap },
        ],
      },

      {
        title: "Finance",
        url: "#",
        icon: DollarSign,
        isActive: true,
        items: [
          { title: "Expenses", url: "/admin/expenses", icon: DollarSign },
          { title: "Seller Expenses", url: "/admin/seller-expenses", icon: DollarSign },
          { title: "Teacher Expenses", url: "/admin/teacher-expenses", icon: DollarSign },
        ],
      },
      {
        title: "Leads",
        url: "#",
        icon: MessageSquare,
        isActive: true,
        items: [
          { title: "Contact Page", url: "/admin/messages", icon: MessageSquare },
          { title: "Product Leads", url: "/admin/product-leads", icon: MessageSquare }
        ],

      },
      {
        title: "Seller Dashboard",
        url: "/seller/bookings",
        icon: LayoutDashboard,
        isActive: true,
        items: [{ title: "Bookings", url: "/seller/bookings" }],
      },
    ];
  }

  if (role === "student") {
    return [
      {
        title: "Dashboard",
        url: "/student",
        icon: LayoutDashboard,
        isActive: true,
        items: [{ title: "Overview", url: "/student" }],
      },
      {
        title: "Learning",
        url: "#",
        icon: BookOpen,
        isActive: true,
        items: [
          { title: "My Bookings", url: "/student/bookings", icon: ShoppingCart },
          { title: "Classes", url: "/student/classes", icon: Users },
          { title: "Recordings", url: "/student/recordings", icon: Video },
          { title: "Attendance", url: "/student/attendance", icon: CheckSquare },
          { title: "Test Scores", url: "/student/scores", icon: GraduationCap },
          { title: "Study Material", url: "/student/notes", icon: FileText },
        ],
      },
    ];
  }
  if (role === "teacher") {
    return [
      {
        title: "Dashboard",
        url: "/teacher",
        icon: LayoutDashboard,
        isActive: true,
        items: [{ title: "Overview", url: "/teacher" }],
      },
      {
        title: "Academic",
        url: "#",
        icon: BookOpen,
        isActive: true,
        items: [
          { title: "Course Classes", url: "/teacher/classes-course", icon: BookOpen },
          { title: "Student Classes", url: "/teacher/classes-student", icon: Users },
          { title: "Recordings", url: "/teacher/recordings", icon: Video },
          { title: "Attendance", url: "/teacher/attendance", icon: CheckSquare },
          { title: "Test Scores", url: "/teacher/test-scores", icon: GraduationCap },
         
        ],
      },
      {
        title: "Study Material",
        url: "#",
        icon: FileText,
        isActive: true,
        items: [
          { title: "Notes Manage", url: "/teacher/notes", icon: FileText },
          { title: "Student Enrollments", url: "/teacher/notes/enrollments", icon: Users },
          { title: "Transaction", url: "/teacher/notes/transactions", icon: Users },

        ],
      },
      {
        title: "Finance",
        url: "#",
        icon: DollarSign,
        isActive: true,
        items: [
          { title: "My Finances", url: "/teacher/finances", icon: DollarSign }
        ],
      },
    ];
  }

  // Default / fallback items
  return [
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ];
};
