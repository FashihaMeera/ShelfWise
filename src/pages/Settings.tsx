import { useState } from "react";
import { Settings as SettingsIcon, User, Lock, Library, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useLibrarySettings, useUpdateSetting } from "@/hooks/use-library-settings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useReadingList } from "@/hooks/use-reading-list";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SettingsPage = () => {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isAdmin = role === "admin";

  // Profile state
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [profileSaving, setProfileSaving] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Library settings
  const { data: settings, isLoading: settingsLoading } = useLibrarySettings();
  const updateSetting = useUpdateSetting();
  const { data: readingList, isLoading: readingListLoading } = useReadingList();

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      await authApi.updateProfile({
        full_name: fullName,
        avatar_url: avatarUrl || undefined,
      });
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ title: "Failed to update profile", description: err.message, variant: "destructive" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setPasswordSaving(true);
    try {
      await authApi.updatePassword(newPassword);
      toast({ title: "Password changed successfully" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Failed to change password", description: err.message, variant: "destructive" });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Configure your account and library.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-2" />Profile</TabsTrigger>
          <TabsTrigger value="password"><Lock className="h-4 w-4 mr-2" />Password</TabsTrigger>
          <TabsTrigger value="reading-list"><Heart className="h-4 w-4 mr-2" />Reading List</TabsTrigger>
          {isAdmin && <TabsTrigger value="library"><Library className="h-4 w-4 mr-2" />Library</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <div className="glass rounded-lg p-6 space-y-6 max-w-lg">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-xl">{(fullName || user?.email || "?")[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{fullName || "Set your name"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input id="avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            </div>
            <Button onClick={handleProfileSave} disabled={profileSaving}>
              {profileSaving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="password">
          <div className="glass rounded-lg p-6 space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <Button onClick={handlePasswordChange} disabled={passwordSaving || !newPassword}>
              {passwordSaving ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="reading-list">
          <div className="glass rounded-lg p-6 space-y-4">
            <h3 className="font-semibold">My Reading List</h3>
            {readingListLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : !readingList?.length ? (
              <p className="text-muted-foreground text-sm">Your reading list is empty. Add books from the catalog!</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Availability</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readingList.map((item: any) => (
                      <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/books/${item.book_id}`)}>
                        <TableCell className="font-medium">{item.books?.title || "Unknown"}</TableCell>
                        <TableCell>{item.books?.author || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={item.books?.available_copies > 0 ? "default" : "destructive"} className={item.books?.available_copies > 0 ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : ""}>
                            {item.books?.available_copies}/{item.books?.total_copies}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="library">
            <div className="glass rounded-lg p-6 space-y-4 max-w-lg">
              {settingsLoading ? (
                <p className="text-muted-foreground">Loading settings...</p>
              ) : (
                <>
                  {[
                    { key: "library_name", label: "Library Name", type: "text" },
                    { key: "default_loan_days", label: "Default Loan Period (days)", type: "number" },
                    { key: "max_borrows_per_member", label: "Max Borrows per Member", type: "number" },
                    { key: "reservation_expiry_days", label: "Reservation Expiry (days)", type: "number" },
                    { key: "fine_per_day", label: "Fine Rate per Day ($)", type: "number" },
                  ].map((setting) => (
                    <div key={setting.key} className="space-y-2">
                      <Label>{setting.label}</Label>
                      <div className="flex gap-2">
                        <Input
                          type={setting.type}
                          defaultValue={settings?.[setting.key] || ""}
                          onBlur={(e) => {
                            if (e.target.value !== settings?.[setting.key]) {
                              updateSetting.mutate({ key: setting.key, value: e.target.value });
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SettingsPage;
