'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { categoryAPI, productAPI } from '@/lib/lmsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, BookOpen, ArrowLeft } from 'lucide-react';

export default function CategoryDetailPage() {
  const params = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoryData, allProducts] = await Promise.all([
        categoryAPI.getById(params.id),
        productAPI.getAll(),
      ]);
      
      setCategory(categoryData);
      
      // Filter products by category
      const categoryProducts = Array.isArray(allProducts)
        ? allProducts.filter(p => p.category?.toString() === params.id && p.is_active)
        : [];
      setProducts(categoryProducts);
    } catch (error) {
      console.error('Error fetching data:', error);
      setCategory(null);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.effective_price - b.effective_price;
        case 'price-high':
          return b.effective_price - a.effective_price;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Category not found</h2>
        <Link href="/categories">
          <Button>Browse All Categories</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link href="/categories" className="hover:text-primary">Categories</Link>
            <span>/</span>
            <span className="text-gray-900">{category.name}</span>
          </div>
        </div>
      </div>

      {/* Category Header */}
      <div className="bg-gradient-to-br from-primary to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/categories">
            <Button variant="ghost" size="sm" className="mb-4 text-white hover:bg-white/20">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Categories
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{category.name}</h1>
          {category.heading && (
            <p className="text-xl text-blue-100 mb-6">{category.heading}</p>
          )}
          {category.description && (
            <p className="text-blue-50 max-w-3xl">{category.description}</p>
          )}
          <div className="mt-6">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {products.length} {products.length === 1 ? 'Course' : 'Courses'} Available
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search courses in this category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="price-low">Price (Low to High)</SelectItem>
                <SelectItem value="price-high">Price (High to Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Search */}
          {searchQuery && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Searching for:</span>
              <Badge variant="secondary" className="gap-1">
                {searchQuery}
                <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-red-600">×</button>
              </Badge>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6 text-gray-600">
          Showing {filteredProducts.length} of {products.length} courses
        </div>

        {/* Course Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Link key={product.id} href={`/courses/${product.id}`}>
                <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                  {/* Course Image */}
                  {product.primary_image ? (
                    <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                      <img
                        src={product.primary_image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      {product.discounted_price && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-red-500 text-white">
                            {product.discount_percentage || 0}% OFF
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center rounded-t-lg">
                      <BookOpen className="h-16 w-16 text-white opacity-50" />
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="line-clamp-2">{product.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {product.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      {/* Price */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-2xl font-bold text-primary">
                            ₹{product.effective_price}
                          </span>
                          {product.discounted_price && (
                            <span className="ml-2 text-sm text-gray-500 line-through">
                              ₹{product.price}
                            </span>
                          )}
                        </div>
                        <Badge variant="secondary">{product.total_seats} seats</Badge>
                      </div>

                      {/* Enroll Button */}
                      <Button className="w-full" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg">
            <div className="mb-4">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No courses found' : 'No courses available'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? 'Try adjusting your search to find what you\'re looking for.'
                : 'Courses will be added to this category soon.'}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
