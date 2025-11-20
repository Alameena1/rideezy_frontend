"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";
import { adminClientApiService, useAdminApiInterceptors } from "@/services/client/adminClientApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Dark theme chart colors
const CHART_COLORS = {
  primary: "#3B82F6",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  purple: "#8B5CF6",
  teal: "#14B8A6",
  blue: "#0088FE",
  green: "#00C49F",
  yellow: "#FFBB28",
  orange: "#FF8042",
  pink: "#8884D8",
};

const REVENUE_COLORS = [CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.yellow, CHART_COLORS.orange];

interface DashboardMetrics {
  metrics: {
    totalUsers: number;
    subscribedUsers: number;
    nonSubscribedUsers: number;
    totalRides: number;
    totalRevenue: number;
    activeRides: number;
    completedRides: number;
    monthlyGrowth: number;
  };
  userGrowth: { month: string; users: number; newUsers: number }[];
  rideCount: { month: string; rides: number; completed: number; cancelled: number }[];
  revenueDistribution: { name: string; value: number; color: string }[];
  platformRevenue: { month: string; revenue: number; rides: number }[];
}

type TimeRange = "7days" | "30days" | "90days" | "1year" | "all";

// Helper functions defined at module level
const getGrowthColor = (growth: number) => {
  if (growth > 0) return "text-green-400";
  if (growth < 0) return "text-red-400";
  return "text-gray-400";
};

const getGrowthIcon = (growth: number) => {
  if (growth > 0) return "↗";
  if (growth < 0) return "↘";
  return "→";
};

// Custom chart components for dark theme
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-gray-300 font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomAxisTick = ({ x, y, payload }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#9CA3AF" fontSize={12}>
        {payload.value}
      </text>
    </g>
  );
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Initialize the admin API interceptors
  useAdminApiInterceptors();
  
  const [dashboardData, setDashboardData] = useState<DashboardMetrics>({
    metrics: {
      totalUsers: 0,
      subscribedUsers: 0,
      nonSubscribedUsers: 0,
      totalRides: 0,
      totalRevenue: 0,
      activeRides: 0,
      completedRides: 0,
      monthlyGrowth: 0,
    },
    userGrowth: [],
    rideCount: [],
    revenueDistribution: [],
    platformRevenue: [],
  });
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    } else if (status === "authenticated" && (session?.user as any)?.role !== "admin") {
      router.push("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (status !== "authenticated" || (session?.user as any)?.role !== "admin") {
        return;
      }

      try {
        setLoading(true);
        console.log("📊 Fetching dashboard data...");
        
        const response = await adminClientApiService.dashboard.getDashboardMetrics({
          timeRange,
        });
        
        setDashboardData(response);
      } catch (err: any) {
        console.error("❌ Dashboard fetch error:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [session, status, timeRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-red-400">Error</CardTitle>
            <CardDescription className="text-gray-400">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Admin Dashboard</h1>
          <p className="text-gray-400">
            Welcome back, {(session?.user as any)?.name || session?.user?.email}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="7days" className="hover:bg-gray-700">Last 7 days</SelectItem>
              <SelectItem value="30days" className="hover:bg-gray-700">Last 30 days</SelectItem>
              <SelectItem value="90days" className="hover:bg-gray-700">Last 90 days</SelectItem>
              <SelectItem value="1year" className="hover:bg-gray-700">Last year</SelectItem>
              <SelectItem value="all" className="hover:bg-gray-700">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={formatNumber(dashboardData.metrics.totalUsers)}
          description="Registered users"
          growth={dashboardData.metrics.monthlyGrowth}
          icon="👥"
          color="blue"
        />
        <MetricCard
          title="Subscribed Users"
          value={formatNumber(dashboardData.metrics.subscribedUsers)}
          description="Active subscriptions"
          percentage={(dashboardData.metrics.subscribedUsers / dashboardData.metrics.totalUsers) * 100}
          icon="⭐"
          color="purple"
        />
        <MetricCard
          title="Total Rides"
          value={formatNumber(dashboardData.metrics.totalRides)}
          description={`${dashboardData.metrics.completedRides} completed`}
          icon="🚗"
          color="green"
        />
        <MetricCard
          title="Platform Revenue"
          value={formatCurrency(dashboardData.metrics.totalRevenue)}
          description="Total earnings"
          icon="💰"
          color="yellow"
        />
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4 bg-gray-800 p-1">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="revenue" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
          >
            Revenue
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
          >
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="rides" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
          >
            Rides
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">User Growth</CardTitle>
                <CardDescription className="text-gray-400">
                  New user registrations over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardData.userGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                      <XAxis 
                        dataKey="month" 
                        tick={<CustomAxisTick />}
                      />
                      <YAxis tick={<CustomAxisTick />} />
                      <Tooltip content={<CustomTooltip formatter={formatNumber} />} />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stroke={CHART_COLORS.primary}
                        fill={CHART_COLORS.primary}
                        fillOpacity={0.3}
                        name="Total Users"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="newUsers"
                        stroke={CHART_COLORS.success}
                        fill={CHART_COLORS.success}
                        fillOpacity={0.3}
                        name="New Users"
                        strokeWidth={2}
                      />
                      <Legend 
                        wrapperStyle={{ color: '#9CA3AF', fontSize: '12px' }}
                        iconSize={8}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Ride Activity */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Ride Activity</CardTitle>
                <CardDescription className="text-gray-400">
                  Ride statistics over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.rideCount}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                      <XAxis 
                        dataKey="month" 
                        tick={<CustomAxisTick />}
                      />
                      <YAxis tick={<CustomAxisTick />} />
                      <Tooltip content={<CustomTooltip formatter={formatNumber} />} />
                      <Bar 
                        dataKey="rides" 
                        name="Total Rides" 
                        fill={CHART_COLORS.primary} 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="completed" 
                        name="Completed" 
                        fill={CHART_COLORS.success} 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="cancelled" 
                        name="Cancelled" 
                        fill={CHART_COLORS.error} 
                        radius={[4, 4, 0, 0]}
                      />
                      <Legend 
                        wrapperStyle={{ color: '#9CA3AF', fontSize: '12px' }}
                        iconSize={8}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Distribution */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Revenue Distribution</CardTitle>
              <CardDescription className="text-gray-400">
                Breakdown of revenue sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.revenueDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      labelStyle={{ fill: '#E5E7EB', fontSize: '12px' }}
                    >
                      {dashboardData.revenueDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color || REVENUE_COLORS[index % REVENUE_COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                    <Legend 
                      wrapperStyle={{ color: '#9CA3AF', fontSize: '12px' }}
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Platform Revenue</CardTitle>
              <CardDescription className="text-gray-400">
                Revenue trends and breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData.platformRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                    <XAxis 
                      dataKey="month" 
                      tick={<CustomAxisTick />}
                    />
                    <YAxis tick={<CustomAxisTick />} />
                    <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={CHART_COLORS.purple}
                      fill={CHART_COLORS.purple}
                      fillOpacity={0.3}
                      name="Revenue"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">User Analytics</CardTitle>
                <CardDescription className="text-gray-400">
                  Detailed user metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Total Users</span>
                  <Badge variant="secondary" className="bg-blue-600 text-white">
                    {formatNumber(dashboardData.metrics.totalUsers)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Subscribed Users</span>
                  <Badge variant="default" className="bg-purple-600 text-white">
                    {formatNumber(dashboardData.metrics.subscribedUsers)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Non-Subscribed</span>
                  <Badge variant="outline" className="border-gray-500 text-gray-300">
                    {formatNumber(dashboardData.metrics.nonSubscribedUsers)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Subscription Rate</span>
                  <Badge variant="secondary" className="bg-green-600 text-white">
                    {((dashboardData.metrics.subscribedUsers / dashboardData.metrics.totalUsers) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
                <CardDescription className="text-gray-400">
                  User management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                  View All Users
                </Button>
                <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                  Manage Subscriptions
                </Button>
                <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                  User Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rides Tab */}
        <TabsContent value="rides">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Ride Statistics</CardTitle>
                <CardDescription className="text-gray-400">
                  Current ride metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Active Rides</span>
                  <Badge variant="secondary" className="bg-yellow-600 text-white">
                    {formatNumber(dashboardData.metrics.activeRides)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Completed Rides</span>
                  <Badge variant="default" className="bg-green-600 text-white">
                    {formatNumber(dashboardData.metrics.completedRides)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Completion Rate</span>
                  <Badge variant="outline" className="border-blue-500 text-blue-400">
                    {((dashboardData.metrics.completedRides / dashboardData.metrics.totalRides) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Ride Management</CardTitle>
                <CardDescription className="text-gray-400">
                  Quick actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                  View All Rides
                </Button>
                <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                  Ride Analytics
                </Button>
                <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                  Generate Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  growth?: number;
  percentage?: number;
  icon: string;
  color?: "blue" | "purple" | "green" | "yellow" | "red";
}

function MetricCard({ title, value, description, growth, percentage, icon, color = "blue" }: MetricCardProps) {
  const colorClasses = {
    blue: "text-blue-400",
    purple: "text-purple-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${colorClasses[color]}`}>
          {title}
        </CardTitle>
        <span className="text-2xl">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
        <p className="text-xs text-gray-400">
          {description}
          {growth !== undefined && (
            <span className={`ml-2 ${getGrowthColor(growth)}`}>
              {getGrowthIcon(growth)} {Math.abs(growth).toFixed(1)}%
            </span>
          )}
          {percentage !== undefined && (
            <span className="ml-2 text-gray-500">
              ({percentage.toFixed(1)}%)
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

// Skeleton Loader with Dark Theme
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-gray-700" />
          <Skeleton className="h-4 w-64 bg-gray-700" />
        </div>
        <Skeleton className="h-10 w-40 bg-gray-700" />
      </div>

      {/* Metrics Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24 bg-gray-700" />
              <Skeleton className="h-6 w-6 rounded-full bg-gray-700" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2 bg-gray-700" />
              <Skeleton className="h-3 w-32 bg-gray-700" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2 bg-gray-700" />
              <Skeleton className="h-4 w-48 bg-gray-700" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full bg-gray-700" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}