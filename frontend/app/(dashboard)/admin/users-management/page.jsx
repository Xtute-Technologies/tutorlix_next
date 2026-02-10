"use client";

import { useEffect, useState, useMemo } from "react";
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

// --- Schemas ---
const createUserSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  email: z.string().email(),
  username: z.string().min(3),
  state: z.string().min(1, "State is required"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .length(10, "Phone number must be exactly 10 digits")
    .regex(/^\d+$/, "Phone number must contain only numbers"),
  password: z.string().min(8),
  role: z.enum(["student", "teacher", "seller", "admin"]),
  is_active: z.boolean().optional(),
  email_verified: z.boolean().optional(),
  profile_image: z.any().optional(),
});

const editUserSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  email: z.string().email(),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .length(10, "Phone number must be exactly 10 digits")
    .regex(/^\d+$/, "Phone number must contain only numbers"),
  state: z.string().min(1, "State is required"),
  role: z.enum(["student", "teacher", "seller", "admin"]),
  is_active: z.boolean().optional(),
  email_verified: z.boolean().optional(),
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

  // --- 3. Deep Link Logic ---
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

  // --- 4. The Adapter ---
  const userTableAdapter = useMemo(() => {
    return createTableAdapter(authService.getAllUsers, {
      sortMap: {
        full_name: "first_name",
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
      await authService.updateUser(userId, { allow_manual_price: allowManualPrice });
      setMessage({ type: "success", text: "Permission updated successfully" });
      setPermission(null);
      refreshTable();
    } catch (error) {
      console.error("Permission update failed", error);
      setMessage({ type: "error", text: error.response?.data?.detail || "Failed to update permission" });
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

  // --- 6. Configuration ---
  const userFields = useMemo(() => {
    const fields = [
      { name: "profile_image", label: "Profile Photo", type: "file", accept: "image/*", className: "col-span-1 md:col-span-2" },
      { name: "first_name", label: "First Name", type: "text", required: true },
      { name: "last_name", label: "Last Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "phone", required: true },
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
      { name: "email_verified", label: "Email Verified", type: "checkbox" },
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
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={row.original.profile_image} className="object-cover" />
              <AvatarFallback className="bg-muted text-muted-foreground">{row.original.first_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm text-foreground">{row.original.full_name || row.original.username}</span>
              <span className="text-xs text-muted-foreground">{row.original.email}</span>
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
          // Semantic Role Coloring using CSS variables & Opacity for Dark Mode support
          let badgeVariant = "secondary";
          let className = "capitalize";

          switch (role) {
            case "admin":
              badgeVariant = "destructive";
              break;
            case "teacher":
              // Blue-ish look using foreground/background manipulation
              className += " bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25 border-blue-500/20";
              badgeVariant = "outline";
              break;
            case "seller":
              // Purple-ish look
              className += " bg-purple-500/15 text-purple-700 dark:text-purple-400 hover:bg-purple-500/25 border-purple-500/20";
              badgeVariant = "outline";
              break;
            case "student":
              badgeVariant = "secondary";
              break;
          }

          return (
            <Badge variant={badgeVariant} className={className}>
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
          <div className="flex items-center text-muted-foreground text-xs">
            <Calendar className="w-3 h-3 mr-1.5" />
            {new Date(row.original.created_at).toLocaleDateString()}
          </div>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
              Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-muted-foreground">
              Inactive
            </Badge>
          ),
      },
      {
        accessorKey: "email_verified",
        header: "Verified",
        cell: ({ row }) =>
          row.original.email_verified ? (
            <Badge variant="outline" className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20">
              Verified
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-muted-foreground">
              Pending
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
              className="text-muted-foreground hover:text-foreground"
              onClick={() =>
                setPermission({
                  ...row.original,
                  allowManualPrice: row.original.allow_manual_price,
                })
              }>
              <ShieldCheck className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setViewingUser(row.original)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary"
              onClick={() => {
                setEditingUser(row.original);
                setShowForm(true);
              }}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setUserToDelete(row.original.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage system access and roles.</p>
        </div>
        <Button
          onClick={() => {
            setEditingUser(null);
            setShowForm(true);
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      {message.text && (
        <div
          className={`p-3 rounded-md text-sm border flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}>
          {message.text}
        </div>
      )}

      <Tabs defaultValue="all" value={currentRole} onValueChange={setCurrentRole} className="w-full">
        <TabsList className="bg-muted p-1">
          {["all", "student", "teacher", "seller", "admin"].map((role) => (
            <TabsTrigger
              key={role}
              value={role}
              className="capitalize data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              {role}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Server-Side Data Table */}
      <DataTableServer key={currentRole} columns={columns} fetchData={userTableAdapter} dependencies={tableDependencies} />

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-background border-border">
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
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete the user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View User Sheet */}
      <Sheet open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md w-full bg-background border-l border-border">
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
                <div className="flex flex-col items-center text-center gap-3 border-b border-border pb-6">
                  <Avatar className="h-24 w-24 border-4 border-muted shadow-sm">
                    <AvatarImage src={viewingUser.profile_image} className="object-cover" />
                    <AvatarFallback className="text-3xl bg-muted text-muted-foreground">{viewingUser.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      {viewingUser.first_name} {viewingUser.last_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">{viewingUser.email}</p>
                    <div className="flex justify-center gap-2 mt-2">
                      <Badge variant="secondary" className="capitalize">
                        {viewingUser.role}
                      </Badge>
                      <Badge variant={viewingUser.is_active ? "default" : "destructive"}>
                        {viewingUser.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant={viewingUser.email_verified ? "outline" : "secondary"}>
                        {viewingUser.email_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Contact & Location</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center p-3 bg-muted/40 rounded-lg border border-border">
                      <div className="bg-background p-2 rounded-md border border-border mr-3 shadow-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Phone Number</p>
                        <p className="text-sm text-foreground">{viewingUser.phone || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-muted/40 rounded-lg border border-border">
                      <div className="bg-background p-2 rounded-md border border-border mr-3 shadow-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Location</p>
                        <p className="text-sm text-foreground">{viewingUser.state || "No address on file"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">System Info</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/40 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Date Joined</p>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{new Date(viewingUser.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Last Updated</p>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{new Date(viewingUser.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bio</h3>
                  <div className="p-4 bg-muted/40 rounded-lg border border-border text-sm text-muted-foreground leading-relaxed italic">
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
            <AlertDialogDescription className="text-muted-foreground">
              Control whether this seller can apply manual price overrides while creating bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Only for Seller */}
          {permission?.role === "seller" ? (
            <div className="flex items-center gap-3 mt-4 p-4 bg-muted/50 rounded-md border border-border">
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
              <label htmlFor="manual-override" className="text-sm font-medium text-foreground cursor-pointer select-none">
                Allow Manual Override Price
              </label>
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground bg-muted p-3 rounded-md">This permission is only applicable to sellers.</div>
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
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
              Save Permission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
