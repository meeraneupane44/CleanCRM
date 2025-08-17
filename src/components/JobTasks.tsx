import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { PencilIcon, TrashIcon, PlusIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// -------------------- Types --------------------
interface Task {
  id: string;
  job_id: string;
  description: string;
  is_completed: boolean;
  created_at: string;
}

interface Props {
  jobId: string;
}

// -------------------- Component --------------------
const JobTasks: React.FC<Props> = ({ jobId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingDesc, setEditingDesc] = useState("");

  useEffect(() => {
    fetchTasks();
  }, [jobId]);

  async function fetchTasks() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });

    if (error) toast.error("Failed to load tasks");
    else setTasks(data || []);

    setLoading(false);
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskDesc.trim()) return;

    const { data, error } = await supabase.from("tasks").insert({
      job_id: jobId,
      description: newTaskDesc.trim(),
    });

    if (error) {
      toast.error("Error creating task");
      return;
    }

    setNewTaskDesc("");
    fetchTasks();
  }

  async function handleToggleTask(task: Task) {
    const updated = !task.is_completed;
    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: updated })
      .eq("id", task.id);

    if (error) {
      toast.error("Failed to update task");
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_completed: updated } : t))
    );
  }

  async function handleDeleteTask(taskId: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      toast.error("Failed to delete task");
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("Task deleted");
    }
  }

  async function handleSaveEdit() {
    if (!editingTask) return;
    const { error } = await supabase
      .from("tasks")
      .update({ description: editingDesc.trim() })
      .eq("id", editingTask.id);

    if (error) {
      toast.error("Failed to update task");
      return;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingTask.id ? { ...t, description: editingDesc.trim() } : t
      )
    );

    setEditingTask(null);
    toast.success("Task updated");
  }

  return (
    <Card className="mt-6">
      <CardContent className="py-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <PlusIcon className="w-5 h-5" /> Job Checklist
        </h3>

        {/* Add Task Form */}
        <form onSubmit={handleAddTask} className="flex gap-2 items-center">
          <Input
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
            placeholder="Add new task..."
          />
          <Button type="submit">Add</Button>
        </form>

        {/* Task List */}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-gray-500">No tasks yet. Add one above!</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between border rounded px-3 py-2"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={task.is_completed}
                    onChange={() => handleToggleTask(task)}
                  />
                  <span
                    className={`text-sm ${
                      task.is_completed ? "line-through text-gray-400" : ""
                    }`}
                  >
                    {task.description}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <Dialog
                    open={editingTask?.id === task.id}
                    onOpenChange={(open) =>
                      open
                        ? (setEditingTask(task), setEditingDesc(task.description))
                        : setEditingTask(null)
                    }
                  >
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <Label>Edit Task</Label>
                      <Input
                        value={editingDesc}
                        onChange={(e) => setEditingDesc(e.target.value)}
                      />
                      <Button onClick={handleSaveEdit}>Save</Button>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    <TrashIcon className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default JobTasks;
