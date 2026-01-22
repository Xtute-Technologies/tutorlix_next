'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form'; // Added Hook Form
import { zodResolver } from '@hookform/resolvers/zod'; // Added Zod Resolver
import { z } from 'zod'; // Added Zod
import { bookingAPI, productAPI } from '@/lib/lmsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/utils";
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
});

export default function CreateBookingForm({ onSuccess }) {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Custom states for logic outside react-hook-form (Price Preview)
  const [priceInfo, setPriceInfo] = useState(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [openState, setOpenState] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Setup Form
  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch, 
    control,
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
      coupon_code: ''
    }
  });

  // Watch values for Price Preview
  const watchedProduct = watch("product");
  const watchedCoupon = watch("coupon_code");
  
  // Find selected product object for display
  const selectedProductObj = products.find(p => p.id.toString() === watchedProduct);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Price Fetch Logic with Debounce
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
          coupon_code: watchedCoupon 
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
  }, [watchedProduct, watchedCoupon]);

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
    <div className="space-y-4">
      {message.text && (
        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
           {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Student Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
                <Label htmlFor="student_name">Name *</Label>
                <Input 
                  id="student_name" 
                  placeholder="John Doe" 
                  {...register("student_name")} 
                  className={errors.student_name ? "border-red-500" : ""}
                />
                {errors.student_name && <span className="text-xs text-red-500">{errors.student_name.message}</span>}
            </div>
            <div className="space-y-1">
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="email@example.com" 
                  {...register("email")}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Phone Input with Masking */}
            <div className="space-y-1">
                <Label htmlFor="phone">Phone *</Label>
                <div className="flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-200 bg-slate-50 text-gray-500 text-sm font-medium">
                      +91
                    </span>
                    <Input 
                        id="phone" 
                        type="tel"
                        placeholder="98765 43210" 
                        className={cn("rounded-l-none", errors.phone && "border-red-500")}
                        {...register("phone", {
                            onChange: (e) => {
                                // Masking: Numbers only, max 10
                                e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
                            }
                        })}
                    />
                </div>
                {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
            </div>
            
            {/* State Autocomplete via Controller */}
            <div className="space-y-1 flex flex-col">
                <Label>State *</Label>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <Popover open={openState} onOpenChange={setOpenState}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openState}
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground",
                            errors.state && "border-red-500"
                          )}
                        >
                          {field.value
                            ? INDIAN_STATES.find((state) => state === field.value) || field.value
                            : "Select state..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
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
                {errors.state && <span className="text-xs text-red-500">{errors.state.message}</span>}
            </div>
        </div>

        <div className="space-y-1">
            <Label htmlFor="password">Password *</Label>
            <Input 
                id="password" 
                placeholder="Student login password" 
                {...register("password")}
                className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
        </div>

        <div className="border-t pt-3 mt-2">
            <h4 className="text-sm font-medium mb-3 text-gray-500 uppercase tracking-wider">Course Selection</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label>Select Course *</Label>
                    <Controller
                        name="product"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className={errors.product ? "border-red-500" : ""}>
                                    <SelectValue placeholder={loadingProducts ? "Loading..." : "Select Course"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id.toString()}>
                                            <span className="flex items-center gap-2 w-full">
                                                <span className="font-medium">{p.name}</span>
                                                {/* <span className="text-gray-300">|</span> */}
                                                {/* {p.discounted_price ? (
                                                    <>
                                                        <span className="font-bold text-green-600">₹{p.discounted_price}</span>
                                                        <span className="text-xs text-gray-400 line-through">₹{p.price}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-gray-600">₹{p.price}</span>
                                                )} */}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.product && <span className="text-xs text-red-500">{errors.product.message}</span>}
                </div>
                <div className="space-y-1">
                    <Label>Coupon (Optional)</Label>
                    <Input 
                        placeholder="OFFER20" 
                        {...register("coupon_code")}
                    />
                </div>
            </div>

            {/* Price Preview */}
            {selectedProductObj && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-3 text-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-600">Base Price:</span>
                        <span className={selectedProductObj.discounted_price ? 'line-through text-gray-400' : 'text-gray-900'}>
                            ₹{selectedProductObj.price}
                        </span>
                    </div>
                    {selectedProductObj.discounted_price && (
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-600">Discount:</span>
                            <span className="text-gray-900">Now ₹{selectedProductObj.discounted_price}</span>
                          </div>
                    )}
                    {watchedCoupon && (
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-600">Coupon ({watchedCoupon}):</span>
                            {calculatingPrice ? (
                                <span className="text-gray-400 italic text-xs">Checking...</span>
                            ) : priceInfo?.discount_amount > 0 ? (
                                <span className="text-green-600 font-medium">- ₹{priceInfo.discount_amount}</span>
                            ) : (
                                <span className="text-red-500 text-xs">{priceInfo?.offer_message || "Invalid"}</span>
                            )}
                          </div>
                    )}
                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between items-center font-bold">
                        <span>Total:</span>
                        <span className="text-blue-600 text-lg">
                            ₹{priceInfo?.final_amount ?? (selectedProductObj.discounted_price || selectedProductObj.price)}
                        </span>
                    </div>
                </div>
            )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Creating..." : "Generate Booking Link"}
        </Button>
      </form>
    </div>
  );
}