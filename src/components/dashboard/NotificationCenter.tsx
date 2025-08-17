import React, { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle, Clock, Image, AlertCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Notification {
  id: string;
  type: "check-in" | "check-out" | "delay" | "photo";
  message: string;
  timestamp: string;
  cleanerName: string;
  jobAddress?: string;
  isRead: boolean;
}

interface NotificationCenterProps {
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onClear?: (id: string) => void;
  onViewAll?: () => void;
}

const seed: Notification[] = [
  {
    id: "1",
    type: "check-in",
    message: "has checked in at the job site",
    timestamp: "10 mins ago",
    cleanerName: "Maria Lopez",
    jobAddress: "123 Main St, Dallas",
    isRead: false,
  },
  {
    id: "2",
    type: "delay",
    message: "reported a 15-minute delay",
    timestamp: "25 mins ago",
    cleanerName: "John Smith",
    jobAddress: "456 Oak Ave, Fort Worth",
    isRead: false,
  },
  {
    id: "3",
    type: "photo",
    message: "uploaded before/after photos",
    timestamp: "1 hour ago",
    cleanerName: "Sarah Johnson",
    jobAddress: "789 Pine Rd, Arlington",
    isRead: true,
  },
  {
    id: "4",
    type: "check-out",
    message: "has completed the job",
    timestamp: "2 hours ago",
    cleanerName: "David Wilson",
    jobAddress: "101 Elm St, Plano",
    isRead: true,
  },
];

export default function NotificationCenter({
  notifications = seed,
  onMarkAsRead = () => {},
  onClear = () => {},
  onViewAll = () => {},
}: NotificationCenterProps) {
  const [items, setItems] = useState<Notification[]>(notifications);
  const [open, setOpen] = useState(false);

  useEffect(() => setItems(notifications), [notifications]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.isRead).length,
    [items]
  );

  function getIcon(type: Notification["type"]) {
    switch (type) {
      case "check-in":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "check-out":
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case "delay":
        return <Clock className="h-5 w-5 text-amber-500" />;
      case "photo":
        return <Image className="h-5 w-5 text-purple-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  }

  function getBadge(type: Notification["type"]) {
    const map: Record<Notification["type"], string> = {
      "check-in": "bg-green-100 text-green-800",
      "check-out": "bg-blue-100 text-blue-800",
      delay: "bg-amber-100 text-amber-800",
      photo: "bg-purple-100 text-purple-800",
    };
    return (
      <Badge variant="secondary" className={map[type] || ""}>
        {type === "photo"
          ? "Photos"
          : type === "check-in"
          ? "Check In"
          : type === "check-out"
          ? "Check Out"
          : "Delay"}
      </Badge>
    );
  }

  function markAsRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    onMarkAsRead(id);
  }

  function clearOne(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    onClear(id);
  }

  // Reusable list
  function NotificationList({
    data,
    animate, // turn animations on/off to avoid flicker in the widget
  }: {
    data: Notification[];
    animate?: boolean;
  }) {
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-8 text-center">
          <Bell className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-gray-600">No notifications</p>
        </div>
      );
    }

    const ItemWrapper: React.ElementType = animate ? motion.div : "div";
    const wrapperProps = animate
      ? { initial: false as const, layout: true }
      : {};

    const innerProps = animate
      ? {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -8 },
          transition: { duration: 0.15 },
        }
      : {};

    const container = (
      <div className="space-y-3">
        {data.map((n) => (
          <ItemWrapper
            key={n.id}
            {...wrapperProps}
            {...innerProps}
            className={`p-3 rounded-lg border ${
              n.isRead
                ? "bg-white border-slate-200"
                : "bg-blue-50 border-blue-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm text-slate-900">
                    {n.cleanerName}
                  </p>
                  <div className="flex items-center gap-2">
                    {getBadge(n.type)}
                    <span className="text-xs text-slate-500">
                      {n.timestamp}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-800">{n.message}</p>
                {n.jobAddress && (
                  <p className="text-xs text-slate-600 mt-1">{n.jobAddress}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2 py-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                    >
                      Mark as read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2 py-1 text-red-600 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearOne(n.id);
                    }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </ItemWrapper>
        ))}
      </div>
    );

    // Only wrap with AnimatePresence if we animate items
    return animate ? <AnimatePresence initial={false}>{container}</AnimatePresence> : container;
  }

  return (
    <>
      {/* Compact widget (no animations → no flicker) */}
      <Card className="w-full bg-white shadow-sm border-0">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
              >
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(true);
              onViewAll?.();
            }}
            className="text-sm font-medium"
          >
            View all
          </Button>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {/* ~3 cards tall */}
          <ScrollArea className="h-[360px] px-2">
            <NotificationList data={items} animate={false} />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* View-all modal (higher contrast + smooth but stable animations) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>All Notifications</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <ScrollArea className="h-[70vh] pr-2">
              <NotificationList data={items} animate />
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
