"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimePicker } from "@/components/ui/time-picker";
import { Field } from "@/components/field";

export function BlockedSlots() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blocked-slots");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBlocks(data.blockedSlots || []);
    } catch (err) {
      toast.error("Failed to load blocked slots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !start || !end) return toast.error("Fill in date, start and end times");
    if (start >= end) return toast.error("End time must be after start time");

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/blocked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotDate: date, startTime: start, endTime: end, reason }),
      });
      if (!res.ok) throw new Error("Failed to add block");
      toast.success("Time slot blocked");
      setDate(""); setStart(""); setEnd(""); setReason("");
      fetchBlocks();
    } catch (err) {
      toast.error("Failed to block slot");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/blocked-slots?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Block removed");
      fetchBlocks();
    } catch (err) {
      toast.error("Failed to remove block");
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border/60">
        <h2 className="text-sm font-semibold text-foreground mb-5">Create New Block</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_120px_120px_1.5fr_auto] items-end">
          <Field label="Date" className="mb-0">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="bg-muted/30" />
          </Field>
          <Field label="Start Time" className="mb-0">
            <TimePicker value={start} onChange={setStart} placeholder="09:00" />
          </Field>
          <Field label="End Time" className="mb-0">
            <TimePicker value={end} onChange={setEnd} placeholder="17:00" />
          </Field>
          <Field label="Reason (Optional)" className="mb-0">
            <Input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Maintenance" className="bg-muted/30" />
          </Field>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto bg-gold hover:bg-gold/90 text-royal-deep shadow-sm gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Block
          </Button>
        </form>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border/60 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="font-semibold text-muted-foreground">Date</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Time Range</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Reason</TableHead>
              <TableHead className="text-right font-semibold text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading blocked slots...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : blocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-sm">
                  No blocked slots found.
                </TableCell>
              </TableRow>
            ) : (
              blocks.map(b => (
                <TableRow key={b.id} className="group hover:bg-muted/30 border-border/50 transition-colors">
                  <TableCell className="font-medium text-foreground">{b.slot_date}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-sm">
                      {b.start_time.slice(0,5)} <span className="text-muted-foreground/50">→</span> {b.end_time.slice(0,5)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {b.reason ? b.reason : <span className="text-muted-foreground/50 italic">None</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(b.id)} 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                      title="Remove block"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
