import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  Mail,
} from "lucide-react";

// ✅ local date helpers (no UTC shift for DATE columns)
import { ymdLocalFromDate, formatYMDLocal } from "@/lib/dates";

/**
 * This page is aligned to your posted schema:
 * public.jobs(id, client_id, cleaner_id, status, date, start_time, end_time, address, notes, created_by, created_at, check_in_at, check_out_at)
 * public.users(id, email, name, phone, role, created_at, avatar_url)
 *
 * RPC expected (security definer):
 * - admin_create_job(p jsonb) -> uuid
 *   expects keys: { address, date, start_time?, end_time?, notes?, client_id?, cleaner_id, status? }
 */

// -------------------- Types --------------------
export type JobStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

interface JobRow {
  id: string;
  date: string | null; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  end_time: string | null; // HH:MM:SS
  address: string | null;
  status: JobStatus;
  cleaner_id?: string | null;
  client_id?: string | null;
  notes?: string | null;
  created_at?: string | null;
  check_in_at?: string | null;
  check_out_at?: string | null;
  client?: { name?: string | null; email?: string | null } | null; // joined via FK
  rating?: number | null; // optional placeholder if you add ratings later
}

interface CleanerProfile {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string | null; // join date fallback
}

// Availability derived in UI for now
type Availability = "Available" | "Busy" | "Off Duty";

// -------------------- Utils --------------------
function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  return (parts[0]?.[0] || "").concat(parts[1]?.[0] || "").toUpperCase();
}

function renderStars(rating = 0) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          className={`w-4 h-4 ${i < Math.floor(rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
        />
      ))}
      <span className="text-sm text-gray-600 ml-1">{(rating as any)?.toFixed?.(1) ?? rating}</span>
    </div>
  );
}

// Use for timestamps like created_at (NOT for DATE columns)
function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d as string;
  }
}

function getAvailability(todayJobs: JobRow[]): Availability {
  const hasInProgress = todayJobs.some((j) => j.status === "in_progress");
  if (hasInProgress) return "Busy";
  if (todayJobs.length > 0) return "Available";
  return "Off Duty";
}

function availabilityBadgeClass(a: Availability) {
  switch (a) {
    case "Available":
      return "bg-green-100 text-green-800";
    case "Busy":
      return "bg-yellow-100 text-yellow-800";
    case "Off Duty":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// -------------------- Data Access --------------------
async function fetchCleaners(): Promise<CleanerProfile[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, phone, email, avatar_url, created_at, role")
    .eq("role", "cleaner")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map((u: any) => ({
    id: u.id,
    name: u.name || "Unnamed Cleaner",
    phone: u.phone ?? null,
    email: u.email ?? null,
    avatar_url: u.avatar_url ?? null,
    created_at: u.created_at ?? null,
  }));
}

async function fetchJobsForCleaner(cleanerId: string): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select(
      `id, date, start_time, end_time, address, status, cleaner_id, client_id, notes, created_at, check_in_at, check_out_at,
       client:users!jobs_client_id_fkey(name,email)`
    )
    .eq("cleaner_id", cleanerId)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });
  if (error) throw error;
  return (data || []) as JobRow[];
}

async function adminCreateJob(input: {
  address: string;
  date: string; // YYYY-MM-DD
  start_time?: string; // HH:mm:SS or HH:mm
  end_time?: string;   // HH:mm:SS or HH:mm
  notes?: string;
  client_id?: string;
  cleaner_id: string;
  status?: JobStatus; // defaults to 'scheduled' in SQL if omitted
}): Promise<string> {
  const payload: any = { ...input };
  // Normalize times to HH:MM:SS
  if (payload.start_time && payload.start_time.length === 5) payload.start_time += ":00";
  if (payload.end_time && payload.end_time.length === 5) payload.end_time += ":00";
  const { data, error } = await supabase.rpc("admin_create_job", { p: payload });
  if (error) throw error;
  return data as string;
}

async function adminAssignCleaner(jobId: string, cleanerId: string) {
  const { error } = await supabase.rpc("admin_assign_cleaner", { job_id: jobId, cleaner_id: cleanerId });
  if (error) throw error;
}

// -------------------- Components --------------------
function CleanerListItem({
  cleaner,
  isActive,
  availability,
  onClick,
}: {
  cleaner: CleanerProfile;
  isActive: boolean;
  availability: Availability;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-gray-50 ${
        isActive ? "border-gray-400 bg-gray-50" : "border-gray-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={cleaner.avatar_url ?? undefined} alt={cleaner.name || "Cleaner"} />
          <AvatarFallback>{initials(cleaner.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{cleaner.name}</div>
          <div className="text-xs text-gray-500 truncate">{cleaner.email || cleaner.phone || "—"}</div>
        </div>
        <Badge className={availabilityBadgeClass(availability)}>{availability}</Badge>
      </div>
    </button>
  );
}

function CleanerDetails({
  cleaner,
  jobs,
  onAssigned,
}: {
  cleaner: CleanerProfile;
  jobs: JobRow[];
  onAssigned?: () => void;
}) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [form, setForm] = useState({
    notes: "",
    date: "",
    start: "",
    end: "",
    address: "",
    clientId: "",
  });

  // ✅ local "today" (matches DATE column)
  const todayIso = ymdLocalFromDate(new Date());
  const todayJobs = useMemo(() => jobs.filter((j) => j.date === todayIso), [jobs, todayIso]);
  const availability = getAvailability(todayJobs);

  const ratingAvg = useMemo(() => {
    const rated = jobs.filter((j) => typeof j.rating === "number");
    if (rated.length === 0) return 0;
    return rated.reduce((s, j) => s + (j.rating || 0), 0) / rated.length;
  }, [jobs]);

  const totalCompleted = jobs.filter((j) => j.status === "completed").length;

  async function handleAssignJob() {
    try {
      if (!form.date || !form.address) {
        toast.error("Date and address are required.");
        return;
      }
      await adminCreateJob({
        address: form.address,
        date: form.date,
        start_time: form.start || undefined,
        end_time: form.end || undefined,
        notes: form.notes || undefined,
        client_id: form.clientId || undefined,
        cleaner_id: cleaner.id,
        status: "scheduled",
      });
      toast.success("Job created and assigned.");
      setIsAssignDialogOpen(false);
      setForm({ notes: "", date: "", start: "", end: "", address: "", clientId: "" });
      onAssigned?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to assign job");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + Assign */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cleaner Details</h1>
          <div className="mt-1 text-sm text-gray-600">Joined: {formatDate(cleaner.created_at)}</div>
        </div>
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4" /> Assign New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Job to {cleaner.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">Job Notes/Title</Label>
                <Input
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Deep clean, bring extra mop..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="start">Start</Label>
                  <Input id="start" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="end">End</Label>
                  <Input id="end" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="clientId">Client ID (optional)</Label>
                  <Input id="clientId" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} placeholder="UUID of client" />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City" />
              </div>
              <Button onClick={handleAssignJob} className="w-full">Assign Job</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-shrink-0">
              <Avatar className="w-24 h-24">
                <AvatarImage src={cleaner.avatar_url ?? undefined} alt={cleaner.name || "Cleaner"} />
                <AvatarFallback className="text-lg">{initials(cleaner.name)}</AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{cleaner.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {renderStars(ratingAvg)}
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">{totalCompleted} jobs completed</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <PhoneIcon className="w-4 h-4" />
                  <span>{cleaner.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{cleaner.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={availabilityBadgeClass(availability)}>{availability}</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No job history available.</p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{job.notes || job.address || "Cleaning Job"}</h3>
                      <p className="text-sm text-gray-600">{job.client?.name || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === "completed" && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                      <Badge variant={job.status === "completed" ? "default" : job.status === "cancelled" ? "destructive" : "secondary"}>
                        {job.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600 mb-3">
                    {/* ✅ DATE uses local-safe formatter */}
                    <div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4" />{formatYMDLocal(job.date)}</div>
                    <div className="flex items-center gap-2"><ClockIcon className="w-4 h-4" />{job.start_time?.slice(0,5) || "—"}</div>
                    <div className="flex items-center gap-2"><MapPinIcon className="w-4 h-4" />{job.address || "—"}</div>
                  </div>

                  {typeof job.rating === "number" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Rating:</span>
                      {renderStars(job.rating || 0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// -------------------- Page --------------------
export default function CleanersPage() {
  const [loading, setLoading] = useState(true);
  const [cleaners, setCleaners] = useState<CleanerProfile[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // initial fetch
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchCleaners();
        if (!active) return;
        setCleaners(list);
        if (list.length > 0) setSelectedId(list[0].id);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load cleaners");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // fetch jobs when selection changes
  useEffect(() => {
    if (!selectedId) {
      setJobs([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        setJobsLoading(true);
        const j = await fetchJobsForCleaner(selectedId);
        if (!active) return;
        setJobs(j);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load jobs");
      } finally {
        if (active) setJobsLoading(false);
      }
    })();

    // realtime updates for the selected cleaner
    const channel = supabase
      .channel(`jobs-cleaner-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs", filter: `cleaner_id=eq.${selectedId}` },
        () => {
          fetchJobsForCleaner(selectedId).then(setJobs).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      active = false;
    };
  }, [selectedId]);

  const filteredCleaners = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return cleaners;
    return cleaners.filter((c) => [c.name ?? "", c.email ?? "", c.phone ?? ""].some((f) => f.toLowerCase().includes(q)));
  }, [cleaners, filter]);

  // ✅ compute availability using local "today" (matches DATE column)
  const today = ymdLocalFromDate(new Date());
  const availabilityById = useMemo(() => {
    const map = new Map<string, Availability>();
    if (selectedId) {
      const todayJobs = jobs.filter((j) => j.date === today);
      map.set(selectedId, getAvailability(todayJobs));
    }
    cleaners.forEach((c) => {
      if (!map.has(c.id)) map.set(c.id, "Off Duty");
    });
    return map;
  }, [selectedId, jobs, cleaners, today]);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: list & search */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>Cleaners</span>
                <span className="text-sm text-gray-500">{cleaners.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 relative">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by name, email, phone"
                  className="pl-9"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              {loading ? (
                <div className="text-sm text-gray-500 py-8 text-center">Loading…</div>
              ) : filteredCleaners.length === 0 ? (
                <div className="text-sm text-gray-500 py-8 text-center">No cleaners found.</div>
              ) : (
                <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
                  {filteredCleaners.map((c) => (
                    <CleanerListItem
                      key={c.id}
                      cleaner={c}
                      isActive={selectedId === c.id}
                      availability={availabilityById.get(c.id) || "Off Duty"}
                      onClick={() => setSelectedId(c.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: details */}
        <div className="lg:col-span-2">
          {!selectedId ? (
            <Card>
              <CardContent className="py-16 text-center text-gray-500">Select a cleaner to view details.</CardContent>
            </Card>
          ) : jobsLoading && jobs.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-gray-500">Loading jobs…</CardContent>
            </Card>
          ) : (
            (() => {
              const cleaner = cleaners.find((c) => c.id === selectedId)!;
              return (
                <CleanerDetails
                  cleaner={cleaner}
                  jobs={jobs}
                  onAssigned={() => {
                    fetchJobsForCleaner(cleaner.id).then(setJobs).catch(() => {});
                  }}
                />
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
