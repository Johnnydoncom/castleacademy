"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, UserPlus, Loader2, ShieldCheck } from "lucide-react";
import { Field } from "@/components/field";

export function AdminManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch {
      toast.error("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add admin");
      }
      toast.success("Admin added successfully");
      setNewUsername("");
      setNewPassword("");
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteAdmin = async (id: string, username: string) => {
    if (username === "castacadmin") {
      toast.error("Cannot delete the default admin account");
      return;
    }
    if (!confirm(`Are you sure you want to delete the admin '${username}'?`)) return;

    try {
      const res = await fetch(`/api/admin/admins?id=${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete admin");
      }
      toast.success("Admin deleted");
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="bg-card p-6 sm:p-8 rounded-xl shadow-sm border border-border/60">
        <h2 className="text-base font-semibold text-foreground mb-5">Create New Admin</h2>
        <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-5 items-end">
          <Field label="Username" className="mb-0">
            <Input 
              id="new-username" 
              placeholder="e.g. jdoe" 
              value={newUsername} 
              onChange={e => setNewUsername(e.target.value)} 
              required
              className="bg-muted/50"
            />
          </Field>
          <Field label="Password" hint="Min 8 characters" className="mb-0">
            <Input 
              id="new-password" 
              type="password" 
              placeholder="••••••••" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              required
              className="bg-muted/50"
            />
          </Field>
          <Button type="submit" disabled={adding || !newUsername || !newPassword} className="w-full sm:w-auto bg-foreground hover:bg-foreground/90 text-background shadow-sm gap-2">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Add Admin
          </Button>
        </form>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border/60 overflow-hidden">
        <div className="px-6 py-5 border-b border-border/50 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-gold" />
          <h2 className="text-base font-semibold text-foreground">Active Admins</h2>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading admins...</span>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground font-bold tracking-wide">
                    {admin.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{admin.username}</p>
                      {(admin.role === "owner" || admin.username === "castacadmin") && (
                        <span className="px-2 py-0.5 rounded-full bg-gold/20 text-royal-deep text-[10px] font-bold uppercase tracking-widest">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Added {new Date(admin.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                  {admin.username !== "castacadmin" && admin.role !== "owner" && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                      title="Delete Admin"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {admins.length === 0 && !loading && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No admins found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
