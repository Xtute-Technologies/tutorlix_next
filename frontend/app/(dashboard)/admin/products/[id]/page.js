"use client";

import React, { useEffect, useState } from 'react';
import ProductWizard from '@/components/admin/products/ProductWizard';
import { productAPI } from '@/lib/lmsService';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function EditProductPage() {
  const params = useParams();
  const id = params?.id;
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!id) return;
        setLoading(true);
        const data = await productAPI.getById(id);
        
        // Ensure complex fields are structured correctly if they come back as null
        const processedData = {
            ...data,
            instructors: data.instructors || [],
            images: data.images || [],
            curriculum: data.curriculum || [],
            features: data.features || []
        };
        
        setProduct(processedData);
      } catch (err) {
        console.error(err);
        setError("Failed to load product.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex h-screen items-center justify-center text-destructive">
            {error}
        </div>
    );
  }

  return <ProductWizard initialData={product} />;
}
