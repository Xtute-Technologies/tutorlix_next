'use client';

import { useEffect, useState } from 'react';
import { bookingAPI, productAPI } from '@/lib/lmsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import {INDIAN_STATES} from "@/config/states"
// --- Imports for Autocomplete ---
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

export default function CreateBookingForm({ onSuccess }) {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // State for Autocomplete Popover
  const [openState, setOpenState] = useState(false);

  const [formData, setFormData] = useState({
    student_name: '',
    email: '',
    phone: '',
    state: '',
    password: '',
    product: '',
    coupon_code: ''
  });

  const [debouncedCoupon, setDebouncedCoupon] = useState(formData.coupon_code);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [priceInfo, setPriceInfo] = useState(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);

  const selectedProduct = products.find(p => p.id.toString() === formData.product);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Debounce Logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCoupon(formData.coupon_code);
    }, 500);
    return () => clearTimeout(handler);
  }, [formData.coupon_code]);

  // Price Fetch Logic
  useEffect(() => {
    if (formData.product) {
      fetchPriceInfo();
    } else {
      setPriceInfo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.product, debouncedCoupon]);

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

  const fetchPriceInfo = async () => {
    try {
      setCalculatingPrice(true);
      const resp = await bookingAPI.previewPrice({
        product: formData.product,
        coupon_code: debouncedCoupon 
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (value) => {
    setFormData({ ...formData, product: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage({ type: '', text: '' });
    try {
      await bookingAPI.sellerCreate(formData);
      // Determine success message based on context
      setMessage({ type: 'success', text: 'Booking created successfully!' });
      
      // Clear form
      setFormData({
        student_name: '', email: '', phone: '', state: '', 
        password: '', product: '', coupon_code: ''
      });
      setDebouncedCoupon('');
      setPriceInfo(null);

      // Trigger Parent Refresh
      if (onSuccess) onSuccess();

    } catch (error) {
      const errorMsg = error.response?.data?.detail 
        || Object.entries(error.response?.data || {}).map(([key, val]) => `${key}: ${val}`).join(', ')
        || 'Failed to create booking';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {message.text && (
        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
           {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
                <Label htmlFor="student_name">Name *</Label>
                <Input id="student_name" name="student_name" value={formData.student_name} onChange={handleChange} required placeholder="John Doe" />
            </div>
            <div className="space-y-1">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="email@example.com" />
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91..." />
            </div>
            
            {/* --- STATE AUTOCOMPLETE --- */}
            <div className="space-y-1 flex flex-col">
                <Label htmlFor="state">State</Label>
                <Popover open={openState} onOpenChange={setOpenState}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openState}
                      className={cn(
                        "w-full justify-between font-normal",
                        !formData.state && "text-muted-foreground"
                      )}
                    >
                      {formData.state
                        ? INDIAN_STATES.find((state) => state === formData.state) || formData.state
                        : "Select state..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
                                // Update formData.state
                                setFormData(prev => ({ ...prev, state: currentValue === prev.state ? "" : currentValue }));
                                setOpenState(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.state === state ? "opacity-100" : "opacity-0"
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
            </div>
        </div>

        <div className="space-y-1">
            <Label htmlFor="password">Password *</Label>
            <Input id="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Student login password" />
        </div>

        <div className="border-t pt-3 mt-2">
            <h4 className="text-sm font-medium mb-3 text-gray-500 uppercase tracking-wider">Course Selection</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label>Select Course *</Label>
                    <Select value={formData.product} onValueChange={handleSelectChange}>
                        <SelectTrigger>
                            <SelectValue placeholder={loadingProducts ? "Loading..." : "Select Course"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            {products.map(p => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                    <span className="flex items-center gap-2 w-full">
                                        <span className="font-medium">{p.name}</span>
                                        <span className="text-gray-300">|</span>
                                        {p.discounted_price ? (
                                            <>
                                                <span className="font-bold text-green-600">₹{p.discounted_price}</span>
                                                <span className="text-xs text-gray-400 line-through">₹{p.price}</span>
                                            </>
                                        ) : (
                                            <span className="text-gray-600">₹{p.price}</span>
                                        )}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label>Coupon</Label>
                    <Input name="coupon_code" value={formData.coupon_code} onChange={handleChange} placeholder="OFFER20" />
                </div>
            </div>

            {/* Price Preview */}
            {selectedProduct && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-3 text-sm">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-600">Base Price:</span>
                        <span className={selectedProduct.discounted_price ? 'line-through text-gray-400' : 'text-gray-900'}>
                            ₹{selectedProduct.price}
                        </span>
                    </div>
                    {selectedProduct.discounted_price && (
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-600">Discount:</span>
                            <span className="text-gray-900">Now ₹{selectedProduct.discounted_price}</span>
                          </div>
                    )}
                    {debouncedCoupon && (
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-600">Coupon ({debouncedCoupon}):</span>
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
                            ₹{priceInfo?.final_amount ?? (selectedProduct.discounted_price || selectedProduct.price)}
                        </span>
                    </div>
                </div>
            )}
        </div>

        <Button type="submit" className="w-full" disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {creating ? "Creating..." : "Generate Booking Link"}
        </Button>
      </form>
    </div>
  );
}