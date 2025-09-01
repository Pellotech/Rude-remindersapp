import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminWhitelist } from '@/components/AdminWhitelist';
import { BackNavigation } from '@/components/BackNavigation';
import { Shield, Settings, Users, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function AdminPage() {
  const { user } = useAuth();
  
  // Only allow access to your specific email
  const isAdmin = user?.email === 'your-email@example.com'; // Replace with your actual email
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <Shield className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              You don't have permission to access the admin panel.
            </p>
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
            
            {/* Future admin features can go here */}
            <Card className="border-dashed border-2 border-gray-300 dark:border-gray-600">
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="flex items-center gap-4 text-gray-400 dark:text-gray-500">
                  <Settings className="h-8 w-8" />
                  <Users className="h-8 w-8" />
                  <Crown className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">
                    More Admin Features Coming Soon
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    User management, analytics, and more admin tools will be added here
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}