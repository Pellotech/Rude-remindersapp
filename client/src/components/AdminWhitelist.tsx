import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Crown, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface WhitelistResponse {
  emails: string[];
  count: number;
}

export function AdminWhitelist() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Fetch current whitelist
  const { data: whitelist, isLoading } = useQuery<WhitelistResponse>({
    queryKey: ['/api/admin/whitelist'],
    retry: false,
  });

  // Add email mutation
  const addEmailMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return apiRequest('/api/admin/whitelist', {
        method: 'POST',
        body: { email, password }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/whitelist'] });
      setNewEmail('');
      setNewPassword('');
      toast({
        title: "Test User Created",
        description: `${data.email} has been added with premium access and can now log in.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add email to whitelist",
        variant: "destructive",
      });
    }
  });

  // Remove email mutation
  const removeEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest('/api/admin/whitelist', {
        method: 'DELETE',
        body: { email }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/whitelist'] });
      toast({
        title: "Email Removed",
        description: `${data.email} has been removed from the premium whitelist.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove email from whitelist",
        variant: "destructive",
      });
    }
  });

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email format",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    addEmailMutation.mutate({ email: newEmail.trim(), password: newPassword });
  };

  const handleRemoveEmail = (email: string) => {
    removeEmailMutation.mutate(email);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-600" />
          Premium Email Whitelist
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Create test user accounts with email + password. They get premium access and can log in immediately.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Test User */}
        <div className="space-y-4">
          <Label>Create Test User with Premium Access</Label>
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-email" className="text-sm">Email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="appstoreuser@rudereminders.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                data-testid="input-whitelist-email"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="new-password" className="text-sm">Password (min 8 characters)</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter password for this test user"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                data-testid="input-whitelist-password"
                autoComplete="off"
              />
            </div>
            <Button 
              onClick={handleAddEmail}
              disabled={addEmailMutation.isPending}
              className="w-full"
              data-testid="button-add-whitelist"
            >
              <Plus className="h-4 w-4 mr-2" />
              {addEmailMutation.isPending ? 'Creating User...' : 'Create Test User'}
            </Button>
          </div>
        </div>

        {/* Current Test Users */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Current Test Users ({whitelist?.count || 0})</Label>
            {isLoading && <span className="text-sm text-muted-foreground">Loading...</span>}
          </div>
          
          {whitelist?.emails && whitelist.emails.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {whitelist.emails.map((email) => (
                <div 
                  key={email}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-900/20"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-green-600" />
                    <span className="font-mono text-sm">{email}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveEmail(email)}
                    disabled={removeEmailMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    data-testid={`button-remove-${email}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No test users created yet.</p>
              <p className="text-sm">Create test users above - they can log in with email/password and get premium access.</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            How it works
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Creates a user account with email + password you provide</li>
            <li>• User can log in immediately using those credentials</li>
            <li>• Automatically gets all premium features without subscription</li>
            <li>• Perfect for beta testers, App Store reviewers, or team members</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}