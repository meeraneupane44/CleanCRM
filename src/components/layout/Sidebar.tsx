import React, { useState } from "react";
import {useNavigate, useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import SignupForm from "@/components/SignupForm";

import {
  CalendarIcon,
  HomeIcon,
  UsersIcon,
  ClipboardListIcon,
  SettingsIcon,
  LogOutIcon,
  MenuIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

const Sidebar = ({ className, isOpen = false, onToggle }: SidebarProps) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };
  const navItems = [
    { icon: <HomeIcon size={20} />, label: "Dashboard", href: "/" },
    { icon: <CalendarIcon size={20} />, label: "Scheduler", href: "/scheduler" },
    { icon: <UsersIcon size={20} />, label: "Cleaners", href: "/cleaners" },
    { icon: <ClipboardListIcon size={20} />, label: "Clients", href: "/clients" },
    { icon: <SettingsIcon size={20} />, label: "Settings", href: "/settings" },
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-background">
      {/* Logo + Toggle */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary p-1">
            <span className="text-lg font-bold text-primary-foreground">DFW</span>
          </div>
          <h2 className="text-lg font-semibold">20 Cleaners</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle} className="lg:hidden">
          <MenuIcon size={20} />
        </Button>
      </div>

      <Separator />

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={index}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted hover:text-foreground"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* User Info + Logout */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin"
                alt="Admin"
              />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-muted-foreground">admin@dfw20cleaners.com</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOutIcon size={18} />
          </Button>
        </div>
      </div>
    </div>
  );

  const MobileSidebar = () => (
    <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <MenuIcon size={24} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );

  const DesktopSidebar = () => (
    <div className={cn("hidden h-full w-[280px] flex-col border-r lg:flex", className)}>
      <SidebarContent />
    </div>
  );

  return (
    <>
      <MobileSidebar />
      <DesktopSidebar />
    </>
  );
};

export default Sidebar;
