"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import DataTableServer from "@/components/DataTableServer";
import FormBuilder from "@/components/FormBuilder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authService } from "@/lib/authService";
import { Plus, Pencil, Trash2, Calendar, Loader2, Phone, MapPin, Clock, Eye, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { createTableAdapter } from "@/lib/createTableAdapter";

// ... (Schemas remain the same) ...
const createUserSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  email: z.string().email(),
  username: z.string().min(3),
  state: z.string().min(1, "State is required"),
  phone: z.string()
    .min(1, 'Phone number is required')
    .length(10, 'Phone number must be exactly 10 digits')
    .regex(/^\d+$/, 'Phone number must contain only numbers'),
  password: z.string().min(8),
  role: z.enum(["student", "teacher", "seller", "admin"]),
  is_active: z.boolean().optional(),
  profile_image: z.any().optional(),
});

const editUserSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  email: z.string().email(),
  phone: z.string()
    .min(1, 'Phone number is required')
    .length(10, 'Phone number must be exactly 10 digits')
    .regex(/^\d+$/, 'Phone number must contain only numbers'),
  state: z.string().min(1, "State is required"),
  role: z.enum(["student", "teacher", "seller", "admin"]),
  is_active: z.boolean().optional(),
  profile_image: z.any().optional(),
});

export default function UsersPage() {
  const searchParams = useSearchParams();

  // --- 1. Global UI State ---
  const [currentRole, setCurrentRole] = useState("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [message, setMessage] = useState({ type: "", text: "" });

  // --- 2. Modal/Drawer States ---
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingUserLoading, setViewingUserLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [permission, setPermission] = useState(null);

  // --- 3. Deep Link Logic (Single User View) ---
  useEffect(() => {
    const userId = searchParams.get("userId");
    if (userId) fetchSingleUser(userId);
  }, [searchParams]);

  const fetchSingleUser = async (id) => {
    try {
      setViewingUserLoading(true);
      const response = await authService.getUserById(id);
      if (response) setViewingUser(response);
    } catch (error) {
      console.error("Failed to fetch user", error);
    } finally {
      setViewingUserLoading(false);
    }
  };

  // --- 4. The Adapter (API Connection) ---
  // Memoize this function so it doesn't change on re-renders
  const userTableAdapter = useMemo(() => {
    return createTableAdapter(authService.getAllUsers, {
      sortMap: {
        // Map table column 'full_name' -> API field 'first_name'
        full_name: "first_name",
        // Map table column 'role' -> API field 'role' (optional if names match)
        role: "role",
      },
    });
  }, []);

  // --- 5. Actions ---
  const refreshTable = () => setRefreshTrigger((prev) => prev + 1);

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      setMessage({ type: "", text: "" });
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (key === "profile_image") {
          if (value instanceof FileList && value.length > 0) formData.append(key, value[0]);
          else if (value instanceof File) formData.append(key, value);
        } else if (typeof value === "boolean") {
          formData.append(key, value.toString());
        } else if (value !== undefined && value !== null && value !== "") {
          formData.append(key, value);
        }
      });

      if (editingUser) {
        await authService.updateUser(editingUser.id, formData);
        setMessage({ type: "success", text: "User updated successfully!" });
      } else {
        await authService.createUser(formData);
        setMessage({ type: "success", text: "User created successfully!" });
      }
      handleCancel();
      refreshTable();
    } catch (error) {
      console.error("Submit error:", error);
      setMessage({ type: "error", text: error.response?.data?.detail || "Failed to save user." });
    } finally {
      setSubmitting(false);
    }
  };

  const savePermission = async ({ userId, allowManualPrice }) => {
    try {
      setSubmitting(true);
      setMessage({ type: "", text: "" });
  
      await authService.updateUser(userId, {
        allow_manual_price: allowManualPrice,
      });
  
      setMessage({
        type: "success",
        text: "Permission updated successfully",
      });
  
      setPermission(null);
      refreshTable();
    } catch (error) {
      console.error("Permission update failed", error);
      setMessage({
        type: "error",
        text:
          error.response?.data?.detail ||
          "Failed to update permission",
      });
    } finally {
      setSubmitting(false);
    }
  };
  

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await authService.deleteUser(userToDelete);
      setMessage({ type: "success", text: "Deleted successfully" });
      refreshTable();
    } catch (e) {
      setMessage({ type: "error", text: "Failed to delete user" });
    } finally {
      setUserToDelete(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setMessage({ type: "", text: "" });
  };

  // --- 6. Configuration (Fields & Columns) ---
// --- Form Config ---
  const userFields = useMemo(() => {
    const fields = [
      { name: "profile_image", label: "Profile Photo", type: "file", accept: "image/*", className: "col-span-1 md:col-span-2" },
      { name: "first_name", label: "First Name", type: "text", required: true },
      { name: "last_name", label: "Last Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      
      // Updated to use the new Phone Input with mask
      { name: "phone", label: "Phone", type: "phone", required: true },
      
      // Added State with Autocomplete
      { name: "state", label: "State", type: "state_names", required: true },
      
      {
        name: "role",
        label: "Role",
        type: "select",
        required: true,
        options: [
          { label: "Student", value: "student" },
          { label: "Teacher", value: "teacher" },
          { label: "Seller", value: "seller" },
          { label: "Admin", value: "admin" },
        ],
      },
      { name: "is_active", label: "Active", type: "checkbox" },
    ];

    if (!editingUser) {
      fields.splice(1, 0, { name: "username", label: "Username", type: "text", required: true });
      fields.push({ name: "password", label: "Password", type: "password", required: true });
    }
    return fields;
  }, [editingUser]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "full_name",
        header: "User",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border">
              <AvatarImage src={row.original.profile_image} className="object-cover" />
              <AvatarFallback>{row.original.first_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm text-slate-900">{row.original.full_name || row.original.username}</span>
              <span className="text-xs text-slate-500">{row.original.email}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        enableSorting: true,
        cell: ({ row }) => {
          const role = row.original.role;
          const style =
            {
              admin: "bg-red-50 text-red-700 border-red-100",
              teacher: "bg-blue-50 text-blue-700 border-blue-100",
              seller: "bg-purple-50 text-purple-700 border-purple-100",
              student: "bg-green-50 text-green-700 border-green-100",
            }[role] || "bg-gray-50";
          return (
            <Badge variant="outline" className={`${style} capitalize`}>
              {role}
            </Badge>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Joined",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center text-slate-500 text-xs">
            <Calendar className="w-3 h-3 mr-1.5" />
            {new Date(row.original.created_at).toLocaleDateString()}
          </div>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "secondary"} className={row.original.is_active ? "bg-emerald-600" : ""}>
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setPermission({
                  ...row.original,
                  allowManualPrice: row.original.allow_manual_price, // ✅ IMPORTANT
                })
              }
            >
              <ShieldCheck className="h-4 w-4 text-slate-400 hover:text-emerald-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setViewingUser(row.original)}>
              <Eye className="h-4 w-4 text-slate-400 hover:text-emerald-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditingUser(row.original);
                setShowForm(true);
              }}>
              <Pencil className="h-4 w-4 text-slate-400 hover:text-blue-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setUserToDelete(row.original.id)}>
              <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  ); // Empty dependencies for columns

  // --- 7. OPTIMIZATION: Memoized Table Dependencies ---
  // This object reference will only change when role or refreshTrigger changes.
  // Opening the sheet (updating viewingUser) will NOT change this object.
  const tableDependencies = useMemo(
    () => ({
      role: currentRole,
      refresh: refreshTrigger,
    }),
    [currentRole, refreshTrigger],
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-1">Manage system access and roles.</p>
        </div>
        <Button
          onClick={() => {
            setEditingUser(null);
            setShowForm(true);
          }}
          className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      {message.text && (
        <div
          className={`p-3 rounded-md text-sm border ${message.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {message.text}
        </div>
      )}

      <Tabs defaultValue="all" value={currentRole} onValueChange={setCurrentRole} className="w-full">
        <TabsList className="bg-slate-100 p-1">
          {["all", "student", "teacher", "seller", "admin"].map((role) => (
            <TabsTrigger key={role} value={role} className="capitalize">
              {role}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Server-Side Data Table */}
      <DataTableServer
        key={currentRole}
        columns={columns}
        fetchData={userTableAdapter}
        dependencies={tableDependencies} // <--- Pass the memoized object here
      />

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create Account"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FormBuilder
              fields={userFields}
              validationSchema={editingUser ? editUserSchema : createUserSchema}
              onSubmit={handleSubmit}
              submitLabel={editingUser ? "Save Changes" : "Create User"}
              isSubmitting={submitting}
              defaultValues={editingUser || { is_active: true, role: currentRole === "all" ? "student" : currentRole }}
              onCancel={handleCancel}
              className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the user.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 text-white">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View User Sheet */}
      <Sheet open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md w-full">
          <SheetHeader className="mb-6">
            <SheetTitle>User Profile</SheetTitle>
            <SheetDescription>Complete information for the selected user.</SheetDescription>
          </SheetHeader>

          {viewingUserLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading user details...</p>
            </div>
          ) : (
            viewingUser && (
              <div className="space-y-6 p-4">
                {/* Header Info */}
                <div className="flex flex-col items-center text-center gap-3 border-b pb-6">
                  <Avatar className="h-24 w-24 border-4 border-slate-50 shadow-sm">
                    <AvatarImage src={viewingUser.profile_image} className="object-cover" />
                    <AvatarFallback className="text-3xl bg-slate-100 text-slate-500">{viewingUser.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                      {viewingUser.first_name} {viewingUser.last_name}
                    </h2>
                    <p className="text-sm text-gray-500">{viewingUser.email}</p>
                    <div className="flex justify-center gap-2 mt-2">
                      <Badge variant="secondary" className="capitalize">
                        {viewingUser.role}
                      </Badge>
                      <Badge variant={viewingUser.is_active ? "default" : "destructive"}>
                        {viewingUser.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Contact & Location</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="bg-white p-2 rounded-md border mr-3">
                        <Phone className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Phone Number</p>
                        <p className="text-sm text-slate-900">{viewingUser.phone || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="bg-white p-2 rounded-md border mr-3">
                        <MapPin className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Location</p>
                        <p className="text-sm text-slate-900">{viewingUser.state || "No address on file"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">System Info</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium mb-1">Date Joined</p>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-sm font-medium">{new Date(viewingUser.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium mb-1">Last Updated</p>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="text-sm font-medium">{new Date(viewingUser.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Bio</h3>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600 leading-relaxed italic">
                    "{viewingUser.bio || "No bio information available for this user."}"
                  </div>
                </div>
              </div>
            )
          )}
        </SheetContent>
      </Sheet>
      {/* Permission Dialog */}
      <AlertDialog open={!!permission} onOpenChange={() => setPermission(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manual Price Permission</AlertDialogTitle>
            <AlertDialogDescription>
              Control whether this seller can apply manual price overrides while
              creating bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* ✅ ONLY FOR SELLER */}
          {permission?.role === "seller" ? (
            <div className="flex items-center gap-3 mt-4">
              <Checkbox
                id="manual-override"
                checked={!!permission.allowManualPrice}
                onCheckedChange={(checked) =>
                  setPermission((prev) => ({
                    ...prev,
                    allowManualPrice: Boolean(checked),
                  }))
                }
              />
              <label
                htmlFor="manual-override"
                className="text-sm font-medium text-gray-700 cursor-pointer select-none"
              >
                Allow Manual Override Price
              </label>
            </div>
          ) : (
            <div className="mt-4 text-sm text-gray-500">
              This permission is only applicable to sellers.
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>

            <AlertDialogAction
              disabled={permission?.role !== "seller"}
              onClick={() =>
                savePermission({
                  userId: permission.id,
                  allowManualPrice: permission.allowManualPrice,
                })
              }
              className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Permission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
