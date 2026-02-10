"use client";

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { bookingAPI, productAPI } from '@/lib/lmsService';
import { authService } from "@/lib/authService";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check, ChevronsUpDown, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { INDIAN_STATES } from "@/config/states";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// --- Custom Hook: Debounce ---
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// --- Validation Schema ---
const bookingFormSchema = z.object({
  student_name: z.string().min(1, "Student Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .length(10, "Phone number must be exactly 10 digits")
    .regex(/^\d+$/, "Phone number must contain only numbers"),
  state: z.string().min(1, "State is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  product: z.string().min(1, "Please select a course"),
  coupon_code: z.string().optional(),
  manual_price: z.number().optional()
});

export default function CreateBookingForm({ onSuccess }) {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Custom states for Price Preview
  const [priceInfo, setPriceInfo] = useState(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [openState, setOpenState] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { user } = useAuth();

  // User checking state
  const [checkingUser, setCheckingUser] = useState(false);
  const [existingUser, setExistingUser] = useState(null);

  // Setup Form
  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch, 
    control,
    trigger,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      student_name: '',
      email: '',
      phone: '',
      state: '',
      password: '',
      product: '',
      coupon_code: '',
      manual_price: 0
    }
  });

  // --- 1. Email Debounce & Auto-Check Logic ---
  const emailValue = watch("email");
  const debouncedEmail = useDebounce(emailValue, 600);

  useEffect(() => {
    const handleUserCheck = async () => {
        // Only verify if it looks like a valid email
        if (!debouncedEmail || !/\S+@\S+\.\S+/.test(debouncedEmail)) {
            // If user clears email, reset the existing user state if it was set
            if (existingUser) {
                resetUserFields();
            }
            return;
        }

        // Don't re-fetch if we already have this user loaded
        if (existingUser && existingUser.email === debouncedEmail) return;

        setCheckingUser(true);
        try {
            const res = await authService.checkUser(debouncedEmail);
            if (res.exists) {
                setExistingUser(res.user);
                
                // Auto-fill fields
                setValue("student_name", res.user.student_name || "");
                setValue("phone", res.user.phone || "");
                setValue("state", res.user.state || "");
                
                // Satisfy password validation for existing users
                setValue("password", "ExistingUser1!", { shouldValidate: true }); 
                
                setMessage({ type: 'success', text: 'Existing student found. Details auto-filled.' });
            } else {
                // If we previously had a user found, but now the email changed to a new one
                if (existingUser) {
                    resetUserFields();
                    setMessage({ type: 'info', text: 'New student email. Please fill in details.' });
                } else {
                    setMessage({ type: '', text: '' });
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCheckingUser(false);
        }
    };

    handleUserCheck();
  }, [debouncedEmail]);

  const resetUserFields = () => {
      setExistingUser(null);
      setValue("student_name", "");
      setValue("phone", "");
      setValue("state", "");
      setValue("password", ""); // Clear dummy password
      setMessage({ type: '', text: '' });
  };

  // --- 2. Price Preview Logic ---
  const watchedProduct = watch("product");
  const watchedCoupon = watch("coupon_code");
  const watchedPrice = watch("manual_price");
  const safeManualPrice = typeof watchedPrice === "number" && !Number.isNaN(watchedPrice) ? watchedPrice : 0.00;
  
  const selectedProductObj = products.find(p => p.id.toString() === watchedProduct);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchPrice = async () => {
      if (!watchedProduct) {
        setPriceInfo(null);
        return;
      }
      try {
        setCalculatingPrice(true);
        const resp = await bookingAPI.previewPrice({
          product: watchedProduct,
          coupon_code: watchedCoupon, 
          manual_price: safeManualPrice
        });
        setPriceInfo(resp);
      } catch (error) {
        setPriceInfo({
          error: true,
          offer_message: error.response?.data?.coupon_code || error.response?.data?.offer_message || "Invalid coupon"
        });
      } finally {
        setCalculatingPrice(false);
      }
    };

    const handler = setTimeout(() => {
      fetchPrice();
    }, 500);

    return () => clearTimeout(handler);
  }, [watchedProduct, watchedCoupon, watchedPrice]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const productsRes = await productAPI.getAll({ is_active: true });
      setProducts(productsRes);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const onSubmit = async (data) => {
    setMessage({ type: '', text: '' });
    try {
      await bookingAPI.sellerCreate(data);
      setMessage({ type: 'success', text: 'Booking created successfully!' });
      if (onSuccess) onSuccess();
    } catch (error) {
      const errorMsg = error.response?.data?.detail 
        || Object.entries(error.response?.data || {}).map(([key, val]) => `${key}: ${val}`).join(', ')
        || 'Failed to create booking';
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {message.text && (
        <div className={cn(
            "p-3 rounded-lg text-sm flex items-center gap-3 border",
            message.type === 'error' ? "bg-destructive/10 text-destructive border-destructive/20" : 
            message.type === 'success' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
            "bg-blue-500/10 text-blue-600 border-blue-500/20"
        )}>
           {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
           {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Student Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email Address <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="student@example.com" 
                    {...register("email")}
                    className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
                  />
                  {checkingUser && (
                      <div className="absolute right-3 top-2.5 bg-background p-0.5 rounded-full">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                  )}
                </div>
                {errors.email && <span className="text-xs text-destructive font-medium">{errors.email.message}</span>}
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="student_name" className="text-foreground">Full Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="student_name" 
                  placeholder="John Doe" 
                  disabled={!!existingUser}
                  {...register("student_name")} 
                  className={cn(
                      errors.student_name && "border-destructive focus-visible:ring-destructive", 
                      existingUser && "bg-muted text-muted-foreground opacity-100"
                  )}
                />
                {errors.student_name && <span className="text-xs text-destructive font-medium">{errors.student_name.message}</span>}
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone Input with Masking */}
            <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">Phone <span className="text-destructive">*</span></Label>
                <div className="flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm font-medium">
                      +91
                    </span>
                    <Input 
                        id="phone" 
                        type="tel"
                        disabled={!!existingUser}
                        placeholder="98765 43210" 
                        className={cn(
                            "rounded-l-none", 
                            errors.phone && "border-destructive focus-visible:ring-destructive",
                            existingUser && "bg-muted text-muted-foreground opacity-100"
                        )}
                        {...register("phone", {
                            onChange: (e) => {
                                e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
                            }
                        })}
                    />
                </div>
                {errors.phone && <span className="text-xs text-destructive font-medium">{errors.phone.message}</span>}
            </div>
            
            {/* State Autocomplete */}
            <div className="space-y-2 flex flex-col">
                <Label className="text-foreground">State <span className="text-destructive">*</span></Label>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <Popover open={openState && !existingUser} onOpenChange={(v) => !existingUser && setOpenState(v)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={!!existingUser}
                          aria-expanded={openState}
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground",
                            errors.state && "border-destructive text-destructive",
                            existingUser && "bg-muted text-muted-foreground opacity-100"
                          )}
                        >
                          {field.value
                            ? INDIAN_STATES.find((state) => state === field.value) || field.value
                            : "Select state..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[240px] p-0">
                        <Command>
                          <CommandInput placeholder="Search state..." />
                          <CommandList>
                            <CommandEmpty>No state found.</CommandEmpty>
                            <CommandGroup>
                              {INDIAN_STATES.map((state) => (
                                <CommandItem
                                  key={state}
                                  value={state}
                                  onSelect={(currentValue) => {
                                    setValue("state", currentValue, { shouldValidate: true });
                                    setOpenState(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === state ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {state}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.state && <span className="text-xs text-destructive font-medium">{errors.state.message}</span>}
            </div>
        </div>

        {/* Password (Only for new users) */}
        {!existingUser && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
            <Input 
                id="password" 
                type="password"
                placeholder="Create a password for the student" 
                {...register("password")}
                className={cn(errors.password && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.password && <span className="text-xs text-destructive font-medium">{errors.password.message}</span>}
        </div>
        )}

        <div className="border-t border-border pt-6 mt-2">
            <h4 className="text-sm font-bold mb-4 text-foreground uppercase tracking-wider flex items-center gap-2">
                Course Selection
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-foreground">Select Course <span className="text-destructive">*</span></Label>
                    <Controller
                        name="product"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className={errors.product ? "border-destructive" : ""}>
                                    <SelectValue placeholder={loadingProducts ? "Loading..." : "Select Course"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id.toString()}>
                                            <span className="font-medium">{p.name}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.product && <span className="text-xs text-destructive font-medium">{errors.product.message}</span>}
                </div>

                {user?.allow_manual_price && (
                  <div className="space-y-2">
                    <Label className="text-foreground">Manual Override Discount</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          placeholder="Enter discount amount"
                          className="pl-7"
                          {...register("manual_price", { valueAsNumber: true })}
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Max allowed: 50% of course price</p>
                  </div>
                )}

                <div className="space-y-2">
                    <Label className="text-foreground">Coupon (Optional)</Label>
                    <Input 
                        placeholder="OFFER20" 
                        {...register("coupon_code")}
                        className="uppercase"
                    />
                </div>
            </div>

            {/* Price Preview Box */}
            {selectedProductObj && (
                <div className="bg-muted/40 border border-border rounded-xl p-4 mt-6 text-sm animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Base Price</span>
                            <span className={selectedProductObj.discounted_price ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}>
                                ₹{selectedProductObj.price}
                            </span>
                        </div>
                        
                        {selectedProductObj.discounted_price && (
                              <div className="flex justify-between items-center text-emerald-600">
                                <span>Product Discount</span>
                                <span className="font-medium">Now ₹{selectedProductObj.discounted_price}</span>
                              </div>
                        )}
                        
                        {watchedCoupon && (
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Coupon ({watchedCoupon})</span>
                                {calculatingPrice ? (
                                    <span className="text-muted-foreground flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin"/> Checking...</span>
                                ) : priceInfo?.discount_amount > 0 ? (
                                    <span className="text-emerald-600 font-medium">- ₹{priceInfo.discount_amount}</span>
                                ) : (
                                    <span className="text-destructive text-xs">{priceInfo?.offer_message || "Invalid"}</span>
                                )}
                              </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Manual Discount</span>
                            {safeManualPrice > 0 ? (
                                <>
                                    {priceInfo?.manual_discount_message ? (
                                        <span className="text-destructive text-xs">{priceInfo.manual_discount_message}</span>
                                    ) : (
                                        <span className="text-emerald-600 font-medium">- ₹{safeManualPrice}.00</span>
                                    )}
                                </>
                            ) : <span>-</span>}
                        </div>
                    </div>

                    <div className="border-t border-border mt-3 pt-3 flex justify-between items-center">
                        <span className="font-bold text-foreground">Total Payable</span>
                        <span className="text-primary text-xl font-bold">
                            ₹{priceInfo?.final_amount ?? (selectedProductObj.discounted_price || selectedProductObj.price)}
                        </span>
                    </div>
                </div>
            )}
        </div>

        <Button type="submit" className="w-full h-12 font-bold shadow-lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Creating..." : "Generate Booking Link"}
        </Button>
      </form>
    </div>
  );
}