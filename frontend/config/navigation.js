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
        items: [{ title: "View Bookings", url: "/seller/bookings" }],
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
        ],
      },
      {
        title: "Communication",
        url: "#",
        icon: MessageSquare,
        isActive: true,
        items: [{ title: "Messages", url: "/admin/messages", icon: MessageSquare }],
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
