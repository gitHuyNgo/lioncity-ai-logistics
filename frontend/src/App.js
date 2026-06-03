import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Truck, Map, Package, Route as RouteIcon, UserCircle2, RefreshCw, RadioTower, Warehouse, LogOut, User as UserIcon, Settings, Camera, Shield
} from "lucide-react";
import { http } from "./lib/api";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import Overview from "./pages/Overview";
import HubManagers from "./pages/HubManagers";
import Drivers from "./pages/Drivers";
import Vehicles from "./pages/Vehicles";
import Zones from "./pages/Zones";
import Orders from "./pages/Orders";
import Routing from "./pages/Routing";
import Shipper from "./pages/Shipper";
import Hubs from "./pages/Hubs";
import Auth from "./pages/Auth";
import "./App.css";

const NAV = [
  { group: "Command", items: [
    { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/routing", label: "Route Planning", icon: RouteIcon },
  ]},
  { group: "Operations (Hub Manager)", items: [
    { to: "/orders", label: "Orders & Dispatch", icon: Package },
    { to: "/drivers", label: "Shippers", icon: Users },
    { to: "/vehicles", label: "Fleet", icon: Truck },
    { to: "/zones", label: "Zones", icon: Map },
    { to: "/hubs", label: "Hubs", icon: Warehouse },
  ]},
  { group: "Admin & Field", items: [
    { to: "/hub-managers", label: "Hub Managers", icon: UserCircle2 },
    { to: "/shipper", label: "Shipper Cockpit", icon: RadioTower },
  ]},
];

function Sidebar() {
  const { user } = useAuth();
  
  const filteredNav = NAV.map(group => {
    const items = group.items.filter(item => {
      if (user?.role === "super_admin") return true;
      if (user?.role === "hub_manager") {
        return item.to !== "/hub-managers";
      }
      if (user?.role === "shipper") {
        return ["/", "/shipper", "/routing"].includes(item.to);
      }
      return false;
    });
    return { ...group, items };
  }).filter(group => group.items.length > 0);

  return (
    <aside className="lc-sidebar" data-testid="sidebar">
      <div className="lc-brand">
        <span className="dot"></span>
        <div>
          <div className="title sg-title">LionCity</div>
          <div className="subtitle">AI-Logistics · SG</div>
        </div>
      </div>
      {filteredNav.map(group => (
        <div key={group.group}>
          <div className="nav-group-label">{group.group}</div>
          {group.items.map(it => (
            <NavLink key={it.to} to={it.to} end={it.end}
              data-testid={`nav-${it.to.replace('/', '') || 'overview'}`}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <it.icon />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}

function AccountDropdown() {
  const { user, logout, updateAvatar } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

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

  const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="btn ghost" style={{ 
          padding: "4px 12px 4px 4px", 
          borderRadius: "99px", 
          height: 44, 
          display: "flex", 
          alignItems: "center", 
          gap: 12,
          background: "rgba(15, 23, 42, 0.03)",
          border: "1px solid rgba(15, 23, 42, 0.05)"
        }}>
          <Avatar className="h-8 w-8 border border-white/10 shadow-sm">
            <AvatarImage src={user.avatar_url ? `${process.env.REACT_APP_BACKEND_URL}${user.avatar_url}` : ""} />
            <AvatarFallback className="bg-[#0d7c78] text-white text-[10px] font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left">
            <span className="text-[13px] font-bold text-[#0f172a] opacity-90 leading-tight">{user.full_name}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0d7c78] opacity-80">{user.role.replace('_', ' ')}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px] bg-[#0b1e24] border-white/10 text-white p-0 rounded-2xl overflow-hidden shadow-2xl" align="end" sideOffset={10}>
        <div className="p-6 bg-gradient-to-br from-[#0d7c78]/25 to-transparent">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <Avatar className="h-20 w-20 border-3 border-[#0d7c78]/50 shadow-xl transition-transform group-hover:scale-105">
                <AvatarImage src={user.avatar_url ? `${process.env.REACT_APP_BACKEND_URL}${user.avatar_url}` : ""} />
                <AvatarFallback className="bg-[#0d7c78] text-white text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="text-white" />
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              {uploading && <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center"><RefreshCw className="animate-spin text-white" size={20} /></div>}
            </div>
            
            <div className="space-y-1 w-full">
              <div className="font-extrabold text-lg leading-tight break-words px-2">{user.full_name}</div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#14b8a6]/20 text-[10px] font-black uppercase tracking-[0.15em] text-[#14b8a6]">
                <Shield size={10} /> {user.role.replace('_', ' ')}
              </div>
            </div>

            <div className="text-[12px] text-white/60 truncate w-full font-medium bg-black/20 px-3 py-2 rounded-xl border border-white/5">
              {user.email}
            </div>
          </div>
        </div>
        
        <div className="p-1.5">
          <DropdownMenuSeparator className="bg-white/5 mx-0 my-1" />
          <DropdownMenuItem className="focus:bg-[#0d7c78]/20 focus:text-white rounded-xl py-2.5 cursor-pointer">
            <UserIcon className="mr-2 h-4 w-4 text-[#0d7c78]" />
            <span className="font-semibold text-sm">View Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="focus:bg-[#0d7c78]/20 focus:text-white rounded-xl py-2.5 cursor-pointer">
            <Settings className="mr-2 h-4 w-4 text-[#0d7c78]" />
            <span className="font-semibold text-sm">Account Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/5 mx-0 my-1" />
          <DropdownMenuItem className="focus:bg-red-500/20 text-red-400 focus:text-red-400 rounded-xl py-2.5 cursor-pointer" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span className="font-bold text-sm">Logout</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar() {
  const { user } = useAuth();
  const location = useLocation();

  const titleMap = {
    "/": "Operations Overview",
    "/hub-managers": "Hub Managers",
    "/drivers": "Shipper Management",
    "/vehicles": "Fleet",
    "/zones": "Zones",
    "/hubs": "Hubs",
    "/orders": "Orders & Dispatch",
    "/routing": "Route Planning",
    "/shipper": "Shipper Cockpit",
  };

  return (
    <header className="lc-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h1 style={{ fontSize: 18, color: "#0b1e24", fontWeight: 800, letterSpacing: "-0.01em", margin: 0 }}>
          {titleMap[location.pathname] || "LionCity"}
        </h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AccountDropdown />
      </div>
    </header>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0b1e24] text-white">
        <RefreshCw className="animate-spin mr-2" /> Loading session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

function Shell() {
  const { user } = useAuth();
  const [empty, setEmpty] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const checkEmpty = async () => {
    try {
      const s = await http.get("/stats");
      const isEmpty = Object.values(s.data).every(v => v === 0);
      setEmpty(isEmpty);
    } catch {
      setEmpty(false);
    }
  };
  useEffect(() => { checkEmpty(); }, []);

  const loadDemo = async () => {
    setSeeding(true);
    try { await http.post("/seed"); window.location.reload(); }
    finally { setSeeding(false); }
  };

  return (
    <div className="lc-shell">
      <Sidebar />
      <div className="lc-main">
        <TopBar />
        <main className="lc-content">
          {empty && user?.role === "super_admin" && (
            <div className="card" data-testid="empty-db-banner" style={{ marginBottom: 18, borderColor: "#fde68a", background: "#fffbeb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Database is empty</div>
                  <div style={{ fontSize: 12.5, color: "#6b5b2c" }}>
                    Start by loading demo data or simply create your own hubs, drivers, vehicles, zones and orders — everything you create persists in MongoDB.
                  </div>
                </div>
                <button className="btn primary" onClick={loadDemo} disabled={seeding} data-testid="load-demo-btn">
                  {seeding ? "Loading…" : "Load demo data"}
                </button>
              </div>
            </div>
          )}
          <Routes>
            <Route path="/" element={<Overview />} />
            {user?.role === "super_admin" && (
              <Route path="/hub-managers" element={<HubManagers />} />
            )}
            {(user?.role === "super_admin" || user?.role === "hub_manager") && (
              <>
                <Route path="/drivers" element={<Drivers />} />
                <Route path="/vehicles" element={<Vehicles />} />
                <Route path="/zones" element={<Zones />} />
                <Route path="/hubs" element={<Hubs />} />
                <Route path="/orders" element={<Orders />} />
              </>
            )}
            <Route path="/routing" element={<Routing />} />
            <Route path="/shipper" element={<Shipper />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={
            <ProtectedRoute>
              <Shell />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
