import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminWhitelist } from '@/components/AdminWhitelist';
import { BackNavigation } from '@/components/BackNavigation';
import { Shield, Settings, Users, Crown, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Only allow access to admin email (case-insensitive)
  const isAuthorized = user?.email?.toLowerCase() === 'loqvm1@gmail.com';

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Not logged in - show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2 items-center">
              <Shield className="h-8 w-8 text-purple-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Login Required</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
              Please log in with your admin account to access the admin panel.
            </p>
            <Button 
              onClick={() => setLocation("/login?redirect=/admin")}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Logged in but not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <Shield className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
              You don't have permission to access the admin panel.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Logged in as: {user.email}
            </p>
            <Button 
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full mt-4"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <BackNavigation />

        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                <Shield className="h-6 w-6" />
                Admin Panel
              </CardTitle>
              <p className="text-purple-700 dark:text-purple-300">
                Manage app settings and user access controls
              </p>
            </CardHeader>
          </Card>

          <div className="grid gap-6">
            <AdminWhitelist />
          </div>
        </div>
      </div>
    </div>
  );
}