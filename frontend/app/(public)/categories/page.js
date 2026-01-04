'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { categoryAPI } from '@/lib/lmsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, ArrowRight } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getAll();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter categories
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        category.heading?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        category.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Browse Categories</h1>
        <p className="text-gray-600">Explore courses organized by topic and field of study</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

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
        Showing {filteredCategories.length} of {categories.length} categories
      </div>

      {/* Categories Grid */}
      {filteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCategories.map((category) => (
            <Link key={category.id} href={`/categories/${category.id}`}>
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex-1 group-hover:text-primary transition">
                      {category.name}
                    </CardTitle>
                    <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 transform group-hover:translate-x-1 transition" />
                  </div>
                  {category.heading && (
                    <CardDescription className="line-clamp-2">
                      {category.heading}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {category.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {category.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {category.products_count || 0} {category.products_count === 1 ? 'course' : 'courses'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg">
          <div className="mb-4">
            <Search className="h-16 w-16 text-gray-300 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No categories found' : 'No categories available'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? 'Try adjusting your search to find what you\'re looking for.'
              : 'Categories will be added soon.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-primary hover:underline"
            >
              Clear Search
            </button>
          )}
        </div>
      )}
    </div>
  );
}
