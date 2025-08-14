import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ymdLocalFromDate } from "@/lib/dates";

type JobStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

interface Cleaner {
  id: string;
  name: string | null;
}

interface JobRow {
  id: string;
  cleaner_id: string | null;
  status: JobStatus;
}

type StatusLabel = "available" | "busy" | "offline";

const JobMetricsPanel: React.FC = () => {
  const [todaysJobs, setTodaysJobs] = useState(0);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [activeCleaners, setActiveCleaners] = useState<Array<{ id: string; name: string; status: StatusLabel }>>([]);

  const today = useMemo(() => ymdLocalFromDate(new Date()), []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      // cleaners
      const { data: cleaners, error: cErr } = await supabase
        .from("users")
        .select("id, name, role")
        .eq("role", "cleaner")
        .order("name");
      if (cErr) throw cErr;

      // today jobs
      const { data: jobs, error: jErr } = await supabase
        .from("jobs")
        .select("id, cleaner_id, status, date")
        .eq("date", today);
      if (jErr) throw jErr;

      const todaysCount = jobs?.length ?? 0;
      const completedCount = (jobs || []).filter((j) => j.status === "completed").length;

      // status per cleaner:
      // busy: has any in_progress today
      // available: has jobs today but none in_progress
      // offline: no jobs today
      const byCleaner = new Map<string, JobRow[]>();
      (jobs || []).forEach((j) => {
        if (!j.cleaner_id) return;
        if (!byCleaner.has(j.cleaner_id)) byCleaner.set(j.cleaner_id, []);
        byCleaner.get(j.cleaner_id)!.push(j as JobRow);
      });

      const list = (cleaners || []).map((c: any) => {
        const cj = byCleaner.get(c.id) || [];
        let status: StatusLabel = "offline";
        if (cj.length > 0) {
          status = cj.some((j) => j.status === "in_progress") ? "busy" : "available";
        }
        return { id: c.id as string, name: (c.name as string) || "Unnamed", status };
      });

      if (mounted) {
        setTodaysJobs(todaysCount);
        setCompletedJobs(completedCount);
        setActiveCleaners(list);
      }
    }

    load().catch((e) => console.error(e));

    // live refresh
    const ch = supabase
      .channel("metrics-refresh")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => load())
      .subscribe();

    return () => {
      mounted = false;
      // ✅ do not return the Promise:
      void supabase.removeChannel(ch);
    };
  }, [today]);

  const getStatusColor = (status: StatusLabel) => {
    switch (status) {
      case "available": return "bg-green-500";
      case "busy": return "bg-amber-500";
      case "offline": return "bg-slate-300";
      default: return "bg-slate-300";
    }
  };

  const activeCleanerCount = activeCleaners.filter((c) => c.status !== "offline").length;
  const completionRate = todaysJobs === 0 ? 0 : Math.round((completedJobs / todaysJobs) * 100);

  return (
    <div className="w-full bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Today's Overview</h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="p-3 flex flex-col items-center justify-center">
            <Clock className="h-5 w-5 text-blue-500 mb-1" />
            <p className="text-xs text-muted-foreground">Today's Jobs</p>
            <p className="text-2xl font-bold">{todaysJobs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex flex-col items-center justify-center">
            <CheckCircle className="h-5 w-5 text-green-500 mb-1" />
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold">{completedJobs}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium">Completion Rate</span>
          <span className="text-sm font-medium">{completionRate}%</span>
        </div>
        <Progress value={completionRate} className="h-2" />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Active Cleaners</span>
          <Badge variant="outline" className="font-normal">
            <Users className="h-3 w-3 mr-1" />
            {activeCleanerCount}/{activeCleaners.length}
          </Badge>
        </div>

        <div className="space-y-2">
          {activeCleaners.map((cleaner) => (
            <div key={cleaner.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-md">
              <div className="flex items-center">
                <div className={`h-2 w-2 rounded-full mr-2 ${getStatusColor(cleaner.status)}`} />
                <span className="text-sm">{cleaner.name}</span>
              </div>
              <Badge variant={cleaner.status === "available" ? "secondary" : "outline"} className="text-xs font-normal">
                {cleaner.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JobMetricsPanel;
