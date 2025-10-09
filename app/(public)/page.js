'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { categoryAPI, productAPI } from '@/lib/lmsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookOpen, Star, TrendingUp } from 'lucide-react';

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesData, featuredData] = await Promise.all([
        categoryAPI.getAll(),
        productAPI.getFeatured(),
      ]);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setFeaturedProducts(Array.isArray(featuredData) ? featuredData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setCategories([]);
      setFeaturedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Learn Without Limits
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Discover thousands of courses taught by expert instructors
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/courses">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Explore Courses
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white text-primary hover:bg-gray-100">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      {featuredProducts.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-8 w-8 text-primary" />
                  Featured Courses
                </h2>
                <p className="text-gray-600 mt-2">Special offers just for you</p>
              </div>
              <Link href="/courses">
                <Button variant="outline">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.slice(0, 6).map((product) => (
                <Link key={product.id} href={`/courses/${product.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    {product.primary_image && (
                      <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                        <img
                          src={product.primary_image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-red-500 text-white">
                            {product.discount_percentage || 0}% OFF
                          </Badge>
                        </div>
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="line-clamp-2">{product.name}</CardTitle>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {product.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                        <Badge variant="outline">{product.total_seats} seats</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Browse by Category
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Explore our wide range of course categories and find the perfect learning path for you
            </p>
          </div>

          {categories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categories.map((category) => (
                <Link key={category.id} href={`/categories/${category.id}`}>
                  <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{category.name}</span>
                        <ArrowRight className="h-5 w-5 text-primary" />
                      </CardTitle>
                      {category.heading && (
                        <CardDescription>{category.heading}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BookOpen className="h-4 w-4" />
                        <span>{category.products_count || 0} courses available</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No categories available at the moment.</p>
            </div>
          )}

          <div className="text-center mt-8">
            <Link href="/categories">
              <Button size="lg">
                View All Categories
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">{featuredProducts.length}+</div>
              <div className="text-blue-100">Active Courses</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">{categories.length}+</div>
              <div className="text-blue-100">Categories</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">1000+</div>
              <div className="text-blue-100">Happy Students</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Start Learning?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of students already learning on Tutorlix
          </p>
          <Link href="/register">
            <Button size="lg" className="px-8">
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
