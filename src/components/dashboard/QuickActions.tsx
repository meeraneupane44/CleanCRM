import React, { useEffect, useMemo, useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ymdLocalFromDate, formatYMDLocal } from "@/lib/dates";

interface QuickActionsProps {
  onCreateJob?: (jobData: any) => void;
  onAssignCleaner?: (assignData: any) => void;
}

type JobStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

interface Cleaner {
  id: string;
  name: string | null;
}

interface AssignableJob {
  id: string;
  date: string;              // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  address: string | null;
  notes: string | null;
}

async function fetchCleaners(): Promise<Cleaner[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("role", "cleaner")
    .order("name");
  if (error) throw error;
  return (data || []) as Cleaner[];
}

async function fetchUnassignedScheduledJobs(fromDate: string): Promise<AssignableJob[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("id, date, start_time, address, notes, status, cleaner_id")
    .is("cleaner_id", null)
    .eq("status", "scheduled")
    .gte("date", fromDate)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data || []) as AssignableJob[];
}

async function createJobDirect(p: {
  address: string;
  date: string;         // YYYY-MM-DD
  start_time?: string;  // HH:MM or HH:MM:SS
  end_time?: string;    // HH:MM or HH:MM:SS
  notes?: string;
  client_id?: string;
  cleaner_id?: string;  // optional
  status?: JobStatus;
}) {
  const payload: any = { ...p, status: p.status ?? "scheduled" };
  if (payload.start_time && payload.start_time.length === 5) payload.start_time += ":00";
  if (payload.end_time && payload.end_time.length === 5) payload.end_time += ":00";
  const { error } = await supabase.from("jobs").insert(payload);
  if (error) throw error;
}

async function assignCleaner(jobId: string, cleanerId: string) {
  const { error } = await supabase.from("jobs").update({ cleaner_id: cleanerId }).eq("id", jobId);
  if (error) throw error;
}

const QuickActions = ({
  onCreateJob = () => {},
  onAssignCleaner = () => {},
}: QuickActionsProps) => {
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [assignCleanerOpen, setAssignCleanerOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Real data
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [availableJobs, setAvailableJobs] = useState<AssignableJob[]>([]);
  const today = useMemo(() => ymdLocalFromDate(new Date()), []);

  async function refresh() {
    try {
      const [c, j] = await Promise.all([
        fetchCleaners(),
        fetchUnassignedScheduledJobs(today),
      ]);
      setCleaners(c);
      setAvailableJobs(j);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load quick actions data");
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refresh();
      // realtime refetch on changes
      const ch = supabase
        .channel("quick-actions-refresh")
        .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => refresh())
        .subscribe();
      return () => {
        mounted = false;
        // ⚠️ do not return the promise to React:
        void supabase.removeChannel(ch);
      };
    })();
    // The IIFE returns nothing; cleanup is inside it
    return () => {};
  }, [today]);

  // ------ Create Job form state ------
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [clientId, setClientId] = useState("");
  const [createCleanerId, setCreateCleanerId] = useState("");

  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!date || !address) {
        toast.error("Date and address are required");
        return;
      }
      await createJobDirect({
        address,
        date: ymdLocalFromDate(date),
        start_time: time || undefined,
        end_time: endTime || undefined,
        notes: notes || undefined,
        client_id: clientId || undefined,
        cleaner_id: createCleanerId || undefined,
        status: "scheduled",
      });
      toast.success("Job created");
      onCreateJob({ date, address });
      setCreateJobOpen(false);
      // reset
      setTime(""); setEndTime(""); setAddress(""); setNotes(""); setClientId(""); setCreateCleanerId("");
      await refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to create job");
    }
  };

  // ------ Assign Cleaner form state ------
  const [assignJobId, setAssignJobId] = useState("");
  const [assignCleanerId, setAssignCleanerId] = useState("");

  const handleAssignCleanerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!assignJobId || !assignCleanerId) {
        toast.error("Pick a job and a cleaner");
        return;
      }
      await assignCleaner(assignJobId, assignCleanerId);
      toast.success("Cleaner assigned");
      onAssignCleaner({ jobId: assignJobId, cleanerId: assignCleanerId });
      setAssignCleanerOpen(false);
      setAssignJobId(""); setAssignCleanerId("");
      await refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to assign cleaner");
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="flex gap-3">
        <Dialog open={createJobOpen} onOpenChange={setCreateJobOpen}>
          <DialogTrigger asChild>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Create Job
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle>Create New Job</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateJobSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button id="date" variant="outline" className="w-full justify-start text-left font-normal">
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="time">Start Time</Label>
                  <Input id="time" type="time" value={time} onChange={(e)=>setTime(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="end">End Time (optional)</Label>
                  <Input id="end" type="time" value={endTime} onChange={(e)=>setEndTime(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" placeholder="Enter client address" value={address} onChange={(e)=>setAddress(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cleaner">Assign Cleaner (optional)</Label>
                  <Select value={createCleanerId} onValueChange={setCreateCleanerId}>
                    <SelectTrigger><SelectValue placeholder="Select a cleaner" /></SelectTrigger>
                    <SelectContent>
                      {cleaners.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name || "Unnamed"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="client">Client ID (optional)</Label>
                  <Input id="client" placeholder="UUID" value={clientId} onChange={(e)=>setClientId(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" placeholder="Special instructions or notes" value={notes} onChange={(e)=>setNotes(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Create Job</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={assignCleanerOpen} onOpenChange={setAssignCleanerOpen}>
          <DialogTrigger asChild>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              <UserPlus className="mr-2 h-4 w-4" /> Assign Cleaner
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle>Assign Cleaner to Job</DialogTitle></DialogHeader>
            <form onSubmit={handleAssignCleanerSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="job">Select Job</Label>
                  <Select value={assignJobId} onValueChange={setAssignJobId}>
                    <SelectTrigger><SelectValue placeholder="Select a job" /></SelectTrigger>
                    <SelectContent>
                      {availableJobs.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {formatYMDLocal(j.date)} • {j.start_time?.slice(0,5) || "--:--"} • {j.notes || j.address || "Job"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cleaner">Select Cleaner</Label>
                  <Select value={assignCleanerId} onValueChange={setAssignCleanerId}>
                    <SelectTrigger><SelectValue placeholder="Select a cleaner" /></SelectTrigger>
                    <SelectContent>
                      {cleaners.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name || "Unnamed"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={!assignJobId || !assignCleanerId}>Assign Cleaner</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default QuickActions;
