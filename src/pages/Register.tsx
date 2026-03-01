import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, setTokens } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, Mail, Lock, User, Loader2, Sun, Moon, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function Register() {
  const { theme, toggleTheme } = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Weak password", description: "Password must be at least 6 characters." });
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register(email, password, fullName);
      setTokens(res.access_token, res.refresh_token);
      await refreshUser();
      navigate("/dashboard");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Sign up failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCallback = useCallback(async (credential: string) => {
    setGoogleLoading(true);
    try {
      const res = await authApi.googleAuth(credential);
      setTokens(res.access_token, res.refresh_token);
      await refreshUser();
      navigate("/dashboard");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Google sign-up failed", description: err.message });
    } finally {
      setGoogleLoading(false);
    }
  }, [navigate, refreshUser, toast]);

  const handleGoogle = useCallback(() => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID_HERE") {
      toast({ variant: "destructive", title: "Google Sign-In not configured", description: "Set VITE_GOOGLE_CLIENT_ID in your .env file." });
      return;
    }

    if (!window.google?.accounts) {
      toast({ variant: "destructive", title: "Google SDK not loaded", description: "Please refresh the page and try again." });
      return;
    }

    setGoogleLoading(true);
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: { credential?: string }) => {
        if (response.credential) {
          handleGoogleCallback(response.credential);
        } else {
          setGoogleLoading(false);
          toast({ variant: "destructive", title: "Google sign-up failed", description: "No credential received." });
        }
      },
    });
    window.google.accounts.id.prompt((notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setGoogleLoading(false);
        const redirectUri = `${window.location.origin}/auth/callback`;
        const scope = "openid email profile";
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token id_token&scope=${scope}&nonce=${crypto.randomUUID()}`;
        window.location.href = url;
      }
    });
  }, [handleGoogleCallback, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      {/* Warm ambient background */}
      <div className="absolute inset-0 warm-gradient" />
      <div className="absolute inset-0 bg-dots opacity-20" />

      <Button variant="ghost" size="icon" onClick={toggleTheme} className="absolute top-4 right-4 z-10">
        {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
      </Button>

      <Card className="w-full max-w-md glass animate-in-up relative z-10">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="flex justify-center">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                <Library className="h-5 w-5" />
              </div>
              <span className="text-2xl font-bold tracking-tight">ShelfWise</span>
            </Link>
          </div>
          <div>
            <CardTitle className="text-xl">Create an account</CardTitle>
            <CardDescription className="mt-1">Start managing your library today</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full gap-2 h-11" onClick={handleGoogle} disabled={googleLoading}>
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or continue with email</span></div>
          </div>

          <form onSubmit={handleRegister} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="name" placeholder="Jane Doe" className="pl-9 h-11" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" className="pl-9 h-11" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-9 h-11" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 glow-primary" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center pb-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
