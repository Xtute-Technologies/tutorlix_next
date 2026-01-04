'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { productAPI } from '@/lib/lmsService';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  BookOpen,
  Users,
  Tag,
  CheckCircle,
  Calendar,
  Star,
  Share2,
  Heart
} from 'lucide-react';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await productAPI.getById(params.id);
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);



  const handleEnroll = () => {
    if (!user) {
      router.push(`/login?redirect=/courses/${params.id}`);
      return;
    }
    // TODO: Implement enrollment logic
    alert('Enrollment functionality coming soon!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Course not found</h2>
        <Link href="/courses">
          <Button>Browse All Courses</Button>
        </Link>
      </div>
    );
  }

  const images = product.images || [];
  const currentImage = images[selectedImageIndex] || null;

  return (
    <div className="bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link href="/courses" className="hover:text-primary">Courses</Link>
            <span>/</span>
            <span className="text-gray-900">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4">
                <Badge className="mb-2">{product.category_name}</Badge>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {product.name}
                </h1>
                <p className="text-lg text-gray-600">{product.description}</p>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{product.total_seats} seats available</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>4.5 (120 reviews)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Self-paced</span>
                </div>
              </div>
            </div>

            {/* Image Gallery */}
            {images.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  {/* Main Image */}
                  <div className="mb-4">
                    <img
                      src={currentImage?.image_url || currentImage?.image}
                      alt={product.name}
                      className="w-full h-96 object-cover rounded-lg"
                    />
                  </div>

                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="grid grid-cols-5 gap-2">
                      {images.map((image, index) => (
                        <button
                          key={image.id}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`relative aspect-video rounded overflow-hidden border-2 transition ${index === selectedImageIndex
                              ? 'border-primary'
                              : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <img
                            src={image.image_url || image.image}
                            alt={`${product.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Course Details Tabs */}
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="overview">
                  <TabsList className="mb-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                    <TabsTrigger value="instructor">Instructor</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-4">About This Course</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold mb-4">What You will Learn</h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        {[
                          'Master the fundamentals',
                          'Build real-world projects',
                          'Industry best practices',
                          'Hands-on experience',
                          'Certificate of completion',
                          'Lifetime access'
                        ].map((item, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="curriculum">
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold">Course Curriculum</h3>
                      <p className="text-gray-600">
                        Detailed curriculum information will be available once you enroll.
                      </p>
                      <div className="space-y-2">
                        {[
                          'Introduction to the Course',
                          'Core Concepts and Fundamentals',
                          'Advanced Topics',
                          'Practical Projects',
                          'Final Assessment'
                        ].map((module, index) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Module {index + 1}: {module}</span>
                              <BookOpen className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="instructor">
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold">Your Instructor</h3>
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                          T
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">Expert Instructor</h4>
                          <p className="text-gray-600 text-sm mb-2">Professional Educator</p>
                          <p className="text-gray-700">
                            With years of experience in the field, our instructors are dedicated to helping
                            you achieve your learning goals.
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="reviews">
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold">Student Reviews</h3>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="text-center">
                          <div className="text-4xl font-bold">4.5</div>
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${star <= 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                  }`}
                              />
                            ))}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">120 reviews</div>
                        </div>
                      </div>
                      <p className="text-gray-600">Reviews will be visible after enrollment.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Price Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-primary">
                        ₹{product.effective_price}
                      </span>
                      {product.discounted_price && (
                        <span className="text-xl text-gray-500 line-through">
                          ₹{product.price}
                        </span>
                      )}
                    </div>
                    {product.discounted_price && (
                      <Badge className="bg-red-500">
                        Save {product.discount_percentage}%
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Button onClick={handleEnroll} className="w-full" size="lg">
                      Enroll Now
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Heart className="h-4 w-4 mr-2" />
                      Add to Wishlist
                    </Button>
                    <Button variant="ghost" className="w-full">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Course
                    </Button>
                  </div>

                  <div className="mt-6 pt-6 border-t space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Available Seats</span>
                      <span className="font-semibold">{product.total_seats}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Duration</span>
                      <span className="font-semibold">Self-paced</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Level</span>
                      <span className="font-semibold">All Levels</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Language</span>
                      <span className="font-semibold">English</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Category Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Course Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/categories/${product.category}`}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
                      {product.category_name}
                    </Badge>
                  </Link>
                  <p className="text-sm text-gray-600 mt-2">
                    Explore more courses in this category
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
