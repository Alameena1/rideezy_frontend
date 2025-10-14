"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Home, Navigation, Car, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Moving cars */}
        <motion.div
          className="absolute top-1/4 -left-20"
          animate={{ x: "100vw" }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        >
          <Car className="h-8 w-8 text-blue-400/30" />
        </motion.div>
        
        <motion.div
          className="absolute top-3/4 -left-40"
          animate={{ x: "100vw" }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 2 }}
        >
          <Car className="h-6 w-6 text-green-400/30" />
        </motion.div>
        
        <motion.div
          className="absolute top-1/3 -left-60"
          animate={{ x: "100vw" }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 5 }}
        >
          <Car className="h-10 w-10 text-yellow-400/30" />
        </motion.div>

        {/* Floating map pins */}
        <motion.div
          className="absolute top-1/5 left-1/4"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <MapPin className="h-6 w-6 text-red-400/20" />
        </motion.div>
        
        <motion.div
          className="absolute bottom-1/4 right-1/3"
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <MapPin className="h-8 w-8 text-purple-400/20" />
        </motion.div>
      </div>

      <Card className="w-full max-w-md bg-gray-800/80 backdrop-blur-sm border-gray-700 shadow-2xl relative z-10">
        <CardContent className="p-8 text-center">
          {/* Animated 404 Number */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="mb-6"
          >
            <div className="relative inline-block">
              <h1 className="text-8xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                404
              </h1>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-2 -right-2"
              >
                <Navigation className="h-6 w-6 text-yellow-400" />
              </motion.div>
            </div>
          </motion.div>

          {/* Error Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <h2 className="text-2xl font-semibold text-white mb-3">
              Destination Not Found
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Looks like you took a wrong turn! This route doesn't exist in our network. 
              Let's get you back on track.
            </p>
          </motion.div>

          {/* Animated Car Illustration */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="mb-6"
          >
            <div className="relative h-20 flex items-center justify-center">
              <motion.div
                animate={{ x: [-50, 50, -50] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center"
              >
                <Car className="h-12 w-12 text-blue-400" />
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-2 h-2 bg-yellow-400 rounded-full ml-1"
                />
              </motion.div>
              
              {/* Road line */}
              <div className="absolute bottom-4 left-0 right-0 h-0.5 bg-gray-600">
                <motion.div
                  animate={{ x: [-100, 100] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-20 h-0.5 bg-yellow-400"
                />
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col gap-3"
          >
            
            <Button 
              variant="outline" 
              onClick={() => window.history.back()} 
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Reverse Route
            </Button>
          </motion.div>

          {/* Additional Help */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6 pt-4 border-t border-gray-700"
          >
            <p className="text-sm text-gray-400">
              Need help?{" "}
              <Link href="/contact" className="text-blue-400 hover:text-blue-300 underline">
                Contact Support
              </Link>
            </p>
          </motion.div>
        </CardContent>
      </Card>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/10 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}