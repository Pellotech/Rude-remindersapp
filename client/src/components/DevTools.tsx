import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Crown, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DevToolsProps {
  isVisible: boolean;
  onToggle: () => void;
}

export function DevTools({ isVisible, onToggle }: DevToolsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user status
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: premiumStatus, isLoading: premiumLoading } = useQuery({
    queryKey: ["/api/user/premium-status"],
  });

  // Mutation to toggle premium status
  const togglePremiumMutation = useMutation({
    mutationFn: async (isPremium: boolean) => {
      const response = await fetch('/api/dev/toggle-premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPremium })
      });
      if (!response.ok) throw new Error('Failed to toggle premium status');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/premium-status"] });
      toast({
        title: "Developer Mode",
        description: `Switched to ${data.subscriptionPlan} plan`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to toggle premium status",
        variant: "destructive",
      });
    }
  });

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggle}
          variant="outline"
          size="sm"
          className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
        >
          <Settings className="h-4 w-4 mr-1" />
          Dev Tools
        </Button>
      </div>
    );
  }

  const isLoading = userLoading || premiumLoading;
  const isPremium = premiumStatus?.isPremium || false;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 bg-yellow-50 border-yellow-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Developer Tools
            </CardTitle>
            <Button onClick={onToggle} variant="ghost" size="sm">
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Current Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Current Status</Label>
                <div className="flex items-center gap-2">
                  {isPremium ? (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                      <User className="h-3 w-3 mr-1" />
                      Free
                    </Badge>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Features</Label>
                <div className="text-xs space-y-1">
                  <div className={`flex justify-between ${isPremium ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>AI Responses</span>
                    <span>{isPremium ? '✓' : '✗'}</span>
                  </div>
                  <div className={`flex justify-between ${isPremium ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>AI Quotes</span>
                    <span>{isPremium ? '✓' : '✗'}</span>
                  </div>
                  <div className={`flex justify-between ${isPremium ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>Unlimited Reminders</span>
                    <span>{isPremium ? '✓' : '✗'}</span>
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Test as Premium</Label>
                <Switch
                  checked={isPremium}
                  onCheckedChange={(checked) => togglePremiumMutation.mutate(checked)}
                  disabled={togglePremiumMutation.isPending}
                />
              </div>

              {/* User ID Info */}
              <div className="pt-2 border-t border-yellow-200">
                <div className="text-xs text-gray-500">
                  User: {user?.id || 'Unknown'}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}