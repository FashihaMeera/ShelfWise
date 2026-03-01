import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Extract reset token from URL query params
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);

    // Also check hash for backward compat
    const hash = window.location.hash;
    if (hash.includes("token=")) {
      const match = hash.match(/token=([^&]+)/);
      if (match) setToken(match[1]);
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Weak password", description: "Password must be at least 6 characters." });
      return;
    }
    if (!token) {
      toast({ variant: "destructive", title: "Error", description: "No reset token found." });
      return;
    }
    setLoading(true);
    try {
      await authApi.confirmPasswordReset(token, password);
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      navigate("/login");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md glass animate-in-up text-center">
          <CardHeader>
            <Library className="h-10 w-10 text-primary mx-auto" />
            <CardTitle>Invalid link</CardTitle>
            <CardDescription>This password reset link is invalid or has expired. Please request a new one from the login page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass animate-in-up">
        <CardHeader className="text-center space-y-2">
          <Library className="h-8 w-8 text-primary mx-auto" />
          <CardTitle className="text-xl">Set new password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-9" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
