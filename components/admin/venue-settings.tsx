"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";
import { Label } from "@/components/ui/label";
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Loader2, Save } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SOCIALS = [
  { id: "facebook", icon: Facebook, label: "Facebook" },
  { id: "instagram", icon: Instagram, label: "Instagram" },
  { id: "twitter", icon: Twitter, label: "Twitter" },
  { id: "youtube", icon: Youtube, label: "YouTube" },
  { id: "linkedin", icon: Linkedin, label: "LinkedIn" },
];

export function VenueSettings() {
  const [hours, setHours] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/venue-hours").then(r => r.json()),
      fetch("/api/social").then(r => r.json())
    ]).then(([hoursData, socialData]) => {
      setHours(hoursData.venueHours || []);
      setSocialLinks(socialData.links || {});
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load settings");
      setLoading(false);
    });
  }, []);

  const updateHour = (day: number, field: string, val: any) => {
    setHours(prev => prev.map(h => h.day_of_week === day ? { ...h, [field]: val } : h));
  };

  const saveHours = async () => {
    setSavingHours(true);
    try {
      const payload = hours.map(h => ({
        dayOfWeek: h.day_of_week,
        isOpen: h.is_open,
        openTime: h.open_time,
        closeTime: h.close_time
      }));
      const res = await fetch("/api/admin/venue-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: payload })
      });
      if (!res.ok) throw new Error();
      toast.success("Venue hours updated successfully");
    } catch {
      toast.error("Failed to update hours");
    } finally {
      setSavingHours(false);
    }
  };

  const updateSocial = async (platform: string, url: string) => {
    try {
      const res = await fetch("/api/social", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, url })
      });
      if (!res.ok) throw new Error();
      setSocialLinks(prev => ({ ...prev, [platform]: url }));
      toast.success(`${platform} link updated`);
    } catch {
      toast.error(`Failed to update ${platform} link`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <section className="bg-card p-6 sm:p-8 rounded-xl shadow-sm border border-border/60">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Venue Hours</h2>
            <p className="text-sm text-muted-foreground mt-1">Set your regular opening and closing times for automated availability.</p>
          </div>
          <Button onClick={saveHours} disabled={savingHours} className="bg-gold hover:bg-gold/90 text-royal-deep shrink-0 gap-2">
            {savingHours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Schedule
          </Button>
        </div>

        <div className="space-y-3">
          {DAYS.map((dayName, idx) => {
            const h = hours.find(x => x.day_of_week === idx);
            if (!h) return null;
            return (
              <div key={idx} className={`flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-4 rounded-lg border transition-colors ${h.is_open ? 'bg-card border-border' : 'bg-muted/30 border-border/50'}`}>
                <div className="w-40 flex items-center space-x-3">
                  <Switch 
                    id={`day-${idx}`} 
                    checked={h.is_open} 
                    onCheckedChange={(c) => updateHour(idx, 'is_open', c)} 
                    className="data-[state=checked]:bg-gold"
                  />
                  <Label htmlFor={`day-${idx}`} className={`font-medium ${h.is_open ? 'text-foreground' : 'text-muted-foreground'}`}>{dayName}</Label>
                </div>
                
                <div className="flex flex-1 items-center gap-3 opacity-100 transition-opacity" style={{ opacity: h.is_open ? 1 : 0.5 }}>
                  <TimePicker 
                    value={h.open_time.slice(0,5)} 
                    onChange={v => updateHour(idx, 'open_time', v)}
                    disabled={!h.is_open}
                    className="w-32 bg-muted/50 focus:bg-card"
                  />
                  <span className="text-sm text-muted-foreground font-medium">to</span>
                  <TimePicker 
                    value={h.close_time.slice(0,5)} 
                    onChange={v => updateHour(idx, 'close_time', v)}
                    disabled={!h.is_open}
                    className="w-32 bg-muted/50 focus:bg-card"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-card p-6 sm:p-8 rounded-xl shadow-sm border border-border/60">
        <div className="mb-6 border-b border-border/50 pb-5">
          <h2 className="text-base font-semibold text-foreground">Social Links</h2>
          <p className="text-sm text-muted-foreground mt-1">Update your social media presence displayed in the public footer.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOCIALS.map(s => {
            const Icon = s.icon;
            const currentUrl = socialLinks[s.id] || "";
            return (
              <div key={s.id} className="group flex flex-col gap-2.5 p-4 rounded-xl border border-border hover:border-gold/30 hover:shadow-sm transition-all bg-muted/10">
                <Label className="flex items-center gap-2 text-muted-foreground font-medium">
                  <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-card shadow-sm border border-border/50 group-hover:text-gold transition-colors">
                    <Icon className="h-4 w-4" />
                  </span>
                  {s.label}
                </Label>
                <Input 
                  placeholder={`https://${s.id}.com/yourpage`} 
                  defaultValue={currentUrl}
                  onBlur={(e) => {
                    if (e.target.value !== currentUrl) {
                      updateSocial(s.id, e.target.value);
                    }
                  }}
                  className="bg-card text-sm"
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
