import React, { useRef, useState } from "react";
import {
  LogOut,
  User as UserIcon,
  Settings,
  Camera,
  RefreshCw,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

/**
 * AccountMenu
 *
 * The account dropdown rendered in the Topbar. Extracted from App.js and
 * refactored off inline styles / hardcoded hex onto Design_System tokens.
 *
 * Behavior preserved from the original `AccountDropdown`:
 * - View Profile / Account Settings / Logout items
 * - Avatar upload via the `updateAvatar` -> `/auth/avatar` flow
 * - 1MB client-side file-size guard
 * - logout via `useAuth().logout`
 */
export default function AccountMenu() {
  const { user, logout, updateAvatar } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 1MB.");
      return;
    }

    setUploading(true);
    try {
      await updateAvatar(file);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload avatar.");
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  const initials = user.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarSrc = user.avatar_url
    ? `${process.env.REACT_APP_BACKEND_URL}${user.avatar_url}`
    : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-11 items-center gap-3 rounded-full border border-border bg-muted/50 py-1 pl-1 pr-3 transition-colors duration-base hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Avatar className="h-8 w-8 border border-border shadow-token-sm">
            <AvatarImage src={avatarSrc} />
            <AvatarFallback className="bg-primary text-[10px] font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left">
            <span className="text-[13px] font-bold leading-tight text-foreground">
              {user.full_name}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              {user.role.replace("_", " ")}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[280px] overflow-hidden rounded-2xl border-border bg-popover p-0 text-popover-foreground shadow-token-lg"
        align="end"
        sideOffset={10}
      >
        <div className="bg-gradient-to-br from-primary/25 to-transparent p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <button
              type="button"
              onClick={handleAvatarClick}
              aria-label="Change profile photo"
              aria-busy={uploading}
              className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
            >
              <Avatar className="h-20 w-20 border-[3px] border-primary/50 shadow-token-lg transition-transform duration-base group-hover:scale-105">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40 opacity-0 transition-opacity duration-base group-hover:opacity-100">
                <Camera size={20} className="text-background" aria-hidden="true" />
              </span>
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/60">
                  <RefreshCw className="animate-spin text-background" size={20} aria-hidden="true" />
                </span>
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <div className="w-full space-y-1">
              <div className="break-words px-2 text-lg font-extrabold leading-tight">
                {user.full_name}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-primary">
                <Shield size={10} aria-hidden="true" /> {user.role.replace("_", " ")}
              </div>
            </div>

            <div className="w-full truncate rounded-xl border border-popover-foreground/10 bg-popover-foreground/10 px-3 py-2 text-[12px] font-medium text-popover-foreground/60">
              {user.email}
            </div>
          </div>
        </div>

        <div className="p-1.5">
          <DropdownMenuSeparator className="mx-0 my-1 bg-popover-foreground/10" />
          <DropdownMenuItem className="cursor-pointer rounded-xl py-2.5 focus:bg-primary/20 focus:text-popover-foreground">
            <UserIcon className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold">View Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer rounded-xl py-2.5 focus:bg-primary/20 focus:text-popover-foreground">
            <Settings className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold">Account Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="mx-0 my-1 bg-popover-foreground/10" />
          <DropdownMenuItem
            className="cursor-pointer rounded-xl py-2.5 text-destructive focus:bg-destructive/20 focus:text-destructive"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-bold">Logout</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
