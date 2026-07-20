"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  CreditCard,
  Copy,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  FileText,
  CalendarClock,
  Check,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function BookingsTable() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [reference, setReference] = useState("");

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(status !== "all" && { status }),
        ...(paymentStatus !== "all" && { payment_status: paymentStatus }),
        ...(reference && { reference }),
      });
      const res = await fetch(`/api/admin/bookings?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBookings(data.bookings);
      setTotal(data.total);
    } catch (err) {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, status, paymentStatus, reference]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
      fetchBookings();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "mark_paid" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Booking marked as paid and confirmed");
      fetchBookings();
    } catch {
      toast.error("Failed to mark as paid");
    }
  };

  const rescheduleAction = async (id: string, action: "approve_reschedule" | "reject_reschedule") => {
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(d.message || "Done");
      fetchBookings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "pending":
        return (
          <Badge
            variant="secondary"
            className="bg-gold/20 text-royal-deep hover:bg-gold/30 border-transparent shadow-none gap-1"
          >
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "confirmed":
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 hover:bg-green-200 border-transparent shadow-none dark:bg-green-900/30 dark:text-green-400 gap-1"
          >
            <CheckCircle2 className="h-3 w-3" />
            Confirmed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="secondary"
            className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent shadow-none gap-1"
          >
            <XCircle className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      case "expired":
        return (
          <Badge
            variant="secondary"
            className="bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-transparent shadow-none gap-1"
          >
            <Clock className="h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return <Badge className="shadow-none">{s}</Badge>;
    }
  };

  const getPaymentBadge = (s: string, method?: string) => {
    switch (s) {
      case "unpaid":
        return (
          <Badge
            variant="outline"
            className="text-muted-foreground border-border"
          >
            Unpaid
          </Badge>
        );
      case "paid":
        return (
          <Badge
            variant="secondary"
            className="bg-gold text-royal-deep hover:bg-gold/90 border-transparent shadow-none gap-1"
          >
            {method === "manual" ? (
              <Banknote className="h-3 w-3" />
            ) : (
              <CreditCard className="h-3 w-3" />
            )}
            Paid
            {method === "manual" && (
              <span className="text-[9px] opacity-70 ml-0.5">(Manual)</span>
            )}
          </Badge>
        );
      case "refunded":
        return (
          <Badge
            variant="secondary"
            className="bg-muted text-foreground hover:bg-muted/80 border-transparent shadow-none"
          >
            Refunded
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatPaidAt = (paidAt: string | null) => {
    if (!paidAt) return null;
    try {
      const d = new Date(paidAt);
      return d.toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return paidAt;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/60">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reference..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="pl-9 bg-muted/30 border-border focus-visible:ring-gold"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-40 bg-muted/30 border-border focus:ring-gold">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={paymentStatus}
            onValueChange={(v) => {
              setPaymentStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-40 bg-muted/30 border-border focus:ring-gold">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="font-semibold text-muted-foreground">
                    Reference
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground">
                    Client Info
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground">
                    Schedule
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground">
                    Payment
                  </TableHead>
                  <TableHead className="text-right font-semibold text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Loading bookings...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : bookings.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground text-sm"
                    >
                      No bookings found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((b) => (
                    <TableRow
                      key={b.id}
                      className="group hover:bg-muted/30 border-border/50 transition-colors"
                    >
                      {/* Reference */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-1 rounded-md inline-block">
                            {b.reference}
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() =>
                                  copyToClipboard(b.reference, "Reference")
                                }
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                              >
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Copy reference</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>

                      {/* Client info */}
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {b.full_name}
                        </div>
                        <div className="text-[13px] text-muted-foreground mt-0.5">
                          {b.email}
                        </div>
                        <div className="text-[13px] text-muted-foreground">
                          {b.phone}
                        </div>
                      </TableCell>

                      {/* Schedule */}
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">
                          {b.start_date}{" "}
                          {b.start_date !== b.end_date
                            ? `to ${b.end_date}`
                            : ""}
                        </div>
                        <div className="text-[13px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"></span>
                          {b.start_time.slice(0, 5)} — {b.end_time.slice(0, 5)}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>{getStatusBadge(b.status)}</TableCell>

                      {/* Payment */}
                      <TableCell>
                        <div className="flex flex-col gap-1.5 items-start">
                          {getPaymentBadge(
                            b.payment_status || "unpaid",
                            b.payment_method
                          )}
                          {b.invoice_total > 0 && (
                            <span className="text-[11px] font-medium text-muted-foreground/80">
                              ₦{b.invoice_total.toLocaleString()}
                            </span>
                          )}
                          {b.paid_at && (
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatPaidAt(b.paid_at)}
                            </span>
                          )}
                          {b.nomba_transaction_id && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[9px] font-mono text-muted-foreground/50 truncate max-w-[100px] cursor-help">
                                  Tx: {b.nomba_transaction_id.slice(-12)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="font-mono text-xs break-all">
                                  {b.nomba_transaction_id}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-2">
                          {/* Reschedule request — approve / decline */}
                          {b.reschedule_status === "requested" && (
                            <div className="w-full max-w-[220px] rounded-lg border border-violet-200 bg-violet-50 p-2 text-left">
                              <p className="flex items-center gap-1 text-[11px] font-semibold text-violet-700">
                                <CalendarClock className="h-3 w-3" /> Reschedule requested
                              </p>
                              <p className="mt-0.5 text-[10px] text-violet-600">
                                → {b.reschedule_date} {b.reschedule_start_time?.slice(0, 5)}–{b.reschedule_end_time?.slice(0, 5)}
                              </p>
                              {b.reschedule_reason && (
                                <p className="mt-0.5 text-[10px] italic text-violet-500">{b.reschedule_reason}</p>
                              )}
                              <div className="mt-1.5 flex gap-1">
                                <Button size="sm" className="h-6 flex-1 gap-1 bg-violet-600 text-[10px] text-white hover:bg-violet-700" onClick={() => rescheduleAction(b.id, "approve_reschedule")}>
                                  <Check className="h-3 w-3" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="h-6 flex-1 gap-1 text-[10px]" onClick={() => rescheduleAction(b.id, "reject_reschedule")}>
                                  <X className="h-3 w-3" /> Decline
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Invoice / receipt PDF */}
                          <div className="flex items-center gap-2">
                            <a
                              href={`/api/admin/invoice/${b.reference}?type=invoice`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <FileText className="h-3 w-3" /> Invoice
                            </a>
                            {b.payment_status === "paid" && (
                              <a
                                href={`/api/admin/invoice/${b.reference}?type=receipt`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <FileText className="h-3 w-3" /> Receipt
                              </a>
                            )}
                          </div>

                          {/* Status change dropdown */}
                          <Select
                            value={b.status}
                            onValueChange={(v) => updateStatus(b.id, v)}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs inline-flex ml-auto bg-card border-border focus:ring-gold font-medium">
                              <SelectValue placeholder="Update" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending" className="text-xs">
                                Mark Pending
                              </SelectItem>
                              <SelectItem value="confirmed" className="text-xs">
                                Confirm
                              </SelectItem>
                              <SelectItem
                                value="cancelled"
                                className="text-xs text-destructive focus:text-destructive"
                              >
                                Cancel
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Mark as Paid button — only for unpaid bookings */}
                          {(b.payment_status === "unpaid" ||
                            !b.payment_status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] gap-1 border-gold/50 text-gold hover:bg-gold/10 hover:text-royal-deep font-medium"
                              onClick={() => markAsPaid(b.id)}
                            >
                              <Banknote className="h-3 w-3" />
                              Mark Paid
                            </Button>
                          )}

                          {/* Checkout link — for unpaid bookings with a checkout link */}
                          {b.checkout_link &&
                            (b.payment_status === "unpaid" ||
                              !b.payment_status) && (
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={b.checkout_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Pay link
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Open Nomba checkout page
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          b.checkout_link,
                                          "Checkout link"
                                        )
                                      }
                                      className="p-0.5 rounded hover:bg-muted"
                                    >
                                      <Copy className="h-3 w-3 text-muted-foreground" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Copy checkout link (to resend to customer)
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <div>
            Showing{" "}
            <span className="font-medium text-foreground">
              {bookings.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">{total}</span> total
            bookings
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-border hover:bg-muted text-muted-foreground"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="border-border hover:bg-muted text-muted-foreground"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
