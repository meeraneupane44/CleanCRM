import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  FilterIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";

// ✅ shared date helpers (local timezone safe)
import {
  ymdLocalFromDate,
  startOfWeekLocal,
  endOfWeekLocal,
  formatYMDLocal,
} from "@/lib/dates";

// -------------------- Types --------------------
export type JobStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

interface CleanerRow {
  id: string;
  name: string | null;
}

interface DbJob {
  id: string;
  date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  end_time: string | null; // HH:MM:SS
  address: string | null;
  status: JobStatus;
  notes: string | null;
  cleaner_id: string | null;
  client_id: string | null;
  cleaner?: { id: string; name: string | null } | null; // flattened
  client?: { id: string; name: string | null } | null; // flattened
}

// -------------------- Utils --------------------
function hhmm(t?: string | null) {
  return t ? t.slice(0, 5) : "—";
}
function titleCaseStatus(s: JobStatus) {
  if (s === "in_progress") return "In Progress";
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";
  return "Scheduled";
}
function statusBadgeClass(s: JobStatus) {
  switch (s) {
    case "scheduled":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// -------------------- Data --------------------
async function fetchCleaners(): Promise<CleanerRow[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("role", "cleaner")
    .order("name");
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, name: r.name ?? null }));
}

async function fetchJobsRange(startISO: string, endISO: string): Promise<DbJob[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select(
      `
      id, date, start_time, end_time, address, status, notes, cleaner_id, client_id,
      cleaner:users!jobs_cleaner_id_fkey ( id, name ),
      client:users!jobs_client_id_fkey   ( id, name )
    `
    )
    .gte("date", startISO)
    .lte("date", endISO)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  // Flatten 1:1 joins (Supabase returns arrays for joins)
  return (data ?? []).map((r: any) => ({
    ...r,
    cleaner: Array.isArray(r.cleaner) ? r.cleaner[0] ?? null : r.cleaner ?? null,
    client: Array.isArray(r.client) ? r.client[0] ?? null : r.client ?? null,
  })) as DbJob[];
}

async function createJobDirect(p: {
  address: string;
  date: string; // YYYY-MM-DD
  start_time?: string; // HH:MM or HH:MM:SS
  end_time?: string; // HH:MM or HH:MM:SS
  notes?: string;
  client_id?: string;
  cleaner_id?: string;
  status?: JobStatus;
}) {
  const payload: any = { ...p };
  if (payload.start_time && payload.start_time.length === 5)
    payload.start_time += ":00";
  if (payload.end_time && payload.end_time.length === 5)
    payload.end_time += ":00";
  const { data, error } = await supabase
    .from("jobs")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// -------------------- Component --------------------
const JobScheduler: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [filterCleaner, setFilterCleaner] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [cleaners, setCleaners] = useState<CleanerRow[]>([]);
  const [jobs, setJobs] = useState<DbJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const range = useMemo(() => {
    if (viewMode === "day") {
      const d = ymdLocalFromDate(selectedDate);
      return { start: d, end: d };
    }
    const s = startOfWeekLocal(selectedDate);
    const e = endOfWeekLocal(selectedDate);
    return { start: ymdLocalFromDate(s), end: ymdLocalFromDate(e) };
  }, [selectedDate, viewMode]);

  async function refresh() {
    try {
      setLoading(true);
      const [c, j] = await Promise.all([
        cleaners.length ? Promise.resolve(cleaners) : fetchCleaners(),
        fetchJobsRange(range.start, range.end),
      ]);
      if (!cleaners.length) setCleaners(c);
      setJobs(j);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  // realtime refetch on any jobs change
  useEffect(() => {
    const ch = supabase
      .channel("jobs-scheduler")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const cleanerOk =
        filterCleaner === "all" || j.cleaner_id === filterCleaner;
      const statusOk =
        filterStatus === "all" || j.status === (filterStatus as JobStatus);
      return cleanerOk && statusOk;
    });
  }, [jobs, filterCleaner, filterStatus]);

  // Create Job dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newJob, setNewJob] = useState({
    notes: "",
    date: ymdLocalFromDate(selectedDate),
    start: "",
    end: "",
    address: "",
    cleanerId: "",
    clientId: "",
    status: "scheduled" as JobStatus,
  });

  useEffect(() => {
    // keep dialog date in sync when user changes calendar
    setNewJob((n) => ({ ...n, date: ymdLocalFromDate(selectedDate) }));
  }, [selectedDate]);

  async function handleCreateJob() {
    try {
      if (!newJob.date || !newJob.address) {
        toast.error("Date and address are required");
        return;
      }
      await createJobDirect({
        address: newJob.address,
        date: newJob.date,
        start_time: newJob.start || undefined,
        end_time: newJob.end || undefined,
        notes: newJob.notes || undefined,
        client_id: newJob.clientId || undefined,
        cleaner_id: newJob.cleanerId || undefined,
        status: newJob.status,
      });
      toast.success("Job created");
      setIsCreateDialogOpen(false);
      setNewJob({
        notes: "",
        date: ymdLocalFromDate(selectedDate),
        start: "",
        end: "",
        address: "",
        cleanerId: "",
        clientId: "",
        status: "scheduled",
      });
      refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create job");
    }
  }

  return (
    <div className="bg-white min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Job Scheduler</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <PlusIcon className="w-4 h-4" /> Create New Job
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Job</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes">Job Notes/Title</Label>
                  <Input
                    id="notes"
                    value={newJob.notes}
                    onChange={(e) =>
                      setNewJob({ ...newJob, notes: e.target.value })
                    }
                    placeholder="House cleaning / Deep clean"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newJob.date}
                      onChange={(e) =>
                        setNewJob({ ...newJob, date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="start">Start</Label>
                    <Input
                      id="start"
                      type="time"
                      value={newJob.start}
                      onChange={(e) =>
                        setNewJob({ ...newJob, start: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="end">End</Label>
                    <Input
                      id="end"
                      type="time"
                      value={newJob.end}
                      onChange={(e) =>
                        setNewJob({ ...newJob, end: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="cleaner">Assign Cleaner</Label>
                    <Select
                      value={newJob.cleanerId}
                      onValueChange={(value) =>
                        setNewJob({ ...newJob, cleanerId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cleaner" />
                      </SelectTrigger>
                      <SelectContent>
                        {cleaners.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name || "Unnamed"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newJob.address}
                    onChange={(e) =>
                      setNewJob({ ...newJob, address: e.target.value })
                    }
                    placeholder="123 Main St, City"
                  />
                </div>
                <div>
                  <Label htmlFor="client">Client ID (optional)</Label>
                  <Input
                    id="client"
                    value={newJob.clientId}
                    onChange={(e) =>
                      setNewJob({ ...newJob, clientId: e.target.value })
                    }
                    placeholder="UUID of client"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={newJob.status}
                    onValueChange={(v) =>
                      setNewJob({ ...newJob, status: v as JobStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateJob} className="w-full">
                  Create Job
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* View Toggle and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList>
              <TabsTrigger value="day">Day View</TabsTrigger>
              <TabsTrigger value="week">Week View</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-2 items-center">
            <FilterIcon className="w-4 h-4 text-gray-500" />
            <Select value={filterCleaner} onValueChange={setFilterCleaner}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by cleaner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cleaners</SelectItem>
                {cleaners.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name || "Unnamed"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" /> Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  // normalize to local midnight
                  onSelect={(d) =>
                    d && setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
                  }
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
          </div>

          {/* Job Cards */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {viewMode === "day"
                  ? `Jobs on ${selectedDate.toLocaleDateString()}`
                  : `Jobs for ${startOfWeekLocal(selectedDate).toLocaleDateString()} — ${endOfWeekLocal(selectedDate).toLocaleDateString()}`}
              </h2>

              {loading ? (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    Loading…
                  </CardContent>
                </Card>
              ) : filtered.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">No jobs found matching your filters.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filtered.map((job) => (
                    <Card key={job.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {job.notes || job.address || "Cleaning Job"}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {job.client?.name || "—"}
                            </p>
                          </div>
                          <Badge className={statusBadgeClass(job.status)}>
                            {titleCaseStatus(job.status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            {formatYMDLocal(job.date)}
                          </div>
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4" />
                            {hhmm(job.start_time)}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPinIcon className="w-4 h-4" />
                            {job.address || "—"}
                          </div>
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4" />
                            {job.cleaner?.name || "—"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobScheduler;
