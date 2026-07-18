import { Calendar, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";

interface UpcomingEvent {
  reference: string;
  full_name: string;
  event_type: string;
  start_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

export function DashboardUpcoming({ events }: { events: UpcomingEvent[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Upcoming Events</h3>
        <Link href="/admin/bookings" className="text-sm font-medium text-gold hover:text-gold/80 flex items-center gap-1 transition-colors">
          View all <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {!events || events.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 min-h-[200px]">
            <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.reference} className="p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-foreground line-clamp-1">{event.full_name}</h4>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  event.status === 'confirmed' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {event.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{event.event_type}</p>
              
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(parseISO(event.start_date), "MMM d, yyyy")}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
