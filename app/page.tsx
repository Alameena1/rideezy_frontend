"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ClientNavbarWrapper from "./comp/ClientNavbarWrapper";
import ServiceSection from "./comp/ServiceSection";
import Footer from "./comp/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  Shield, 
  Users, 
  Clock, 
  Star, 
  MapPin, 
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Phone,
  Calendar,
  Zap,
  Heart
} from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Add a small delay to ensure session is properly loaded
    if (status === "unauthenticated") {
      const timer = setTimeout(() => {
        router.push("/user/login");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Safe & Secure",
      description: "Verified drivers and real-time tracking for your peace of mind"
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "24/7 Service",
      description: "Ride whenever you need, day or night"
    },
    {
      icon: <DollarSign className="h-6 w-6" />,
      title: "Affordable Rates",
      description: "Competitive pricing with no surprise charges"
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      title: "Easy Booking",
      description: "Book your ride in just a few taps"
    }
  ];

  const stats = [
    { number: "10K+", label: "Happy Riders" },
    { number: "500+", label: "Verified Drivers" },
    { number: "50K+", label: "Rides Completed" },
    { number: "4.9", label: "Rating" }
  ];

  const driverBenefits = [
    "Flexible working hours",
    "Competitive earnings",
    "Weekly payments",
    "24/7 support",
    "Bonus incentives",
    "Zero commission fee"
  ];

  const riderBenefits = [
    "Instant booking",
    "Live tracking",
    "Multiple payment options",
    "Ride sharing",
    "Emergency contact",
    "Price estimation"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <ClientNavbarWrapper />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-10 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-10 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="relative container mx-auto px-4 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm px-4 py-2">
                  🚗 Ride Smarter, Not Harder
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  Your Ride,
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent"> Your Way</span>
                </h1>
                <p className="text-xl text-blue-100 leading-relaxed">
                  Experience seamless transportation with competitive earnings for drivers and affordable, reliable rides for passengers.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-white text-blue-600 hover:bg-gray-100 font-semibold text-lg px-8 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <Car className="h-5 w-5 mr-2" />
                  Start Driving
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10 font-semibold text-lg px-8 py-3 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Book a Ride
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl lg:text-3xl font-bold text-white">{stat.number}</div>
                    <div className="text-blue-200 text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* App Mockup Placeholder */}
            <div className="relative">
              <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-4 h-80 lg:h-96 flex flex-col">
                  {/* Mockup Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="text-white text-sm font-medium">RideEzy</div>
                    <div className="w-6"></div>
                  </div>
                  
                  {/* Mockup Content */}
                  <div className="flex-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="text-center mb-6">
                      <div className="text-2xl font-bold mb-2">Where to?</div>
                      <div className="text-blue-100">Book your ride in seconds</div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                          <div>Current Location</div>
                        </div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                          <div>Enter destination...</div>
                        </div>
                      </div>
                    </div>
                    
                    <Button className="w-full mt-6 bg-white text-blue-600 hover:bg-gray-100 font-semibold">
                      Find Rides
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-yellow-400 text-gray-900 px-4 py-2 rounded-full font-semibold shadow-lg animate-bounce">
                ⭐ 4.9 Rating
              </div>
              <div className="absolute -bottom-4 -left-4 bg-green-500 text-white px-4 py-2 rounded-full font-semibold shadow-lg animate-pulse">
                🚀 10K+ Rides
              </div>
            </div>
          </div>
        </div>
        
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-12">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" className="fill-white"></path>
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" className="fill-white"></path>
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" className="fill-white"></path>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 bg-blue-50 text-blue-600 border-blue-200 px-4 py-1">
              Why Choose RideEzy
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Experience the Difference
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're committed to providing the best ride-sharing experience for both drivers and riders
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-gray-50 group">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Driver Benefits Section */}
      <section className="py-20 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-green-100 text-green-700 border-0 mb-4">
                🚗 For Drivers
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Drive on Your Own Terms
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Join our platform and enjoy the freedom to work when you want, with competitive earnings and full support.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {driverBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-semibold">
                <Car className="h-5 w-5 mr-2" />
                Start Driving Today
              </Button>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Earning Potential</h3>
                <p className="text-gray-600">What you can make weekly</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <span>Part-time (20 hrs)</span>
                  <span className="font-bold text-green-600">₹500-₹800</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span>Full-time (40 hrs)</span>
                  <span className="font-bold text-blue-600">₹1,000-₹1,600</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                  <span>Peak hours</span>
                  <span className="font-bold text-purple-600">+30% more</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rider Benefits Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Easy Booking</h3>
                  <p className="text-blue-100">Ride in 3 simple steps</p>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold">1</div>
                    <div>
                      <div className="font-semibold">Enter your destination</div>
                      <div className="text-blue-200 text-sm">Where do you want to go?</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold">2</div>
                    <div>
                      <div className="font-semibold">Choose your ride</div>
                      <div className="text-blue-200 text-sm">Select from available options</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold">3</div>
                    <div>
                      <div className="font-semibold">Relax and enjoy</div>
                      <div className="text-blue-200 text-sm">Track your driver in real-time</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <Badge className="bg-blue-100 text-blue-700 border-0 mb-4">
                👥 For Riders
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Ride Smarter, Arrive Happier
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Get where you need to go with affordable, reliable rides and premium features for your comfort.
              </p>
              
              <div className="grid grid-cols-1 gap-4 mb-8">
                {riderBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Zap className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold">
                <Users className="h-5 w-5 mr-2" />
                Download the App
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <Heart className="h-12 w-12 mx-auto mb-6 text-pink-300" />
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Join thousands of satisfied users who trust RideEzy for their daily commute and travel needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105"
              >
                <Car className="h-5 w-5 mr-2" />
                Become a Driver
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white/10 font-semibold px-8 py-3 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105"
              >
                <Users className="h-5 w-5 mr-2" />
                Download Rider App
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}