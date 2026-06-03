import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, Mail, User, ArrowLeft, Eye, EyeOff, AlertCircle } from "lucide-react";
import ParticleNetwork from "@/components/ParticleNetwork";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Import assets
import authBackground from "@/assets/auth/background.jpg";
import logoImage from "@/assets/logos/logo_image.png";
import logoText from "@/assets/logos/logo_text.png";

export default function Auth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState("login"); // "login" or "reset"
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Authentication failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setView("login");
      alert("Password reset request submitted successfully.");
    }, 1500);
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${authBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <ParticleNetwork />
      <div className="absolute inset-0 bg-black/40 z-0"></div>

      <div className="w-full max-w-[440px] flex flex-col gap-8 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-5">
            <img 
              src={logoImage} 
              alt="LionCity Logo" 
              className="w-[130px] h-[130px] drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-transform hover:scale-105 duration-500" 
            />
            <img 
              src={logoText} 
              alt="LionCity" 
              className="h-24 brightness-0 invert opacity-100 drop-shadow-[0_8px_20px_rgba(0,0,0,0.4)]" 
            />
          </div>
          <p className="text-[12px] text-white font-black tracking-[0.35em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            AI-LOGISTICS MANAGEMENT SYSTEM
          </p>
        </div>

        {/* Fixed Height Card with Identical Internal Spacing */}
        <Card className="border-white/20 bg-white/10 backdrop-blur-[45px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] rounded-[2.5rem] overflow-hidden flex flex-col border-t border-l border-white/30 h-[500px]">
          
          {view === "login" ? (
            <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-300">
              <CardHeader className="pb-4 pt-10 px-10 text-center">
                <CardTitle className="text-4xl font-bold text-white tracking-tight mb-2">
                  Welcome
                </CardTitle>
                <CardDescription className="text-white/80 text-[15px] font-semibold leading-relaxed max-w-[320px] mx-auto">
                  Please enter your authorized credentials
                </CardDescription>
              </CardHeader>
              
              <form onSubmit={handleLogin} className="flex-1 flex flex-col justify-between">
                <CardContent className="space-y-5 px-10">
                  {error && (
                    <Alert variant="destructive" className="bg-red-500/20 border-red-500/50 text-white">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs font-bold uppercase tracking-wider ml-2">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-white text-[11px] font-black uppercase tracking-[0.15em] ml-1">
                      EMAIL
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-4 h-4.5 w-4.5 text-white/30 group-focus-within:text-white transition-colors" />
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="Enter your email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-14 pl-12 bg-black/20 border-white/10 focus:border-[#0d7c78]/50 focus:bg-black/40 focus:ring-0 text-white placeholder:text-white/20 rounded-2xl transition-all text-base font-medium" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between ml-1">
                      <Label htmlFor="password" className="text-white text-[11px] font-black uppercase tracking-[0.15em]">
                        PASSWORD
                      </Label>
                      <button 
                        type="button" 
                        onClick={() => setView("reset")}
                        className="text-[10px] text-white/60 font-black hover:text-white transition-colors uppercase tracking-widest"
                      >
                        RESET PASSWORD
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-4 h-4.5 w-4.5 text-white/30 group-focus-within:text-white transition-colors" />
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-14 pl-12 pr-12 bg-black/20 border-white/10 focus:border-[#0d7c78]/50 focus:bg-black/40 focus:ring-0 text-white rounded-2xl transition-all text-base placeholder:text-white/30 font-medium" 
                        required 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="pt-4 pb-10 px-10">
                  <Button type="submit" className="w-full bg-[#0d7c78] hover:bg-[#14b8a6] text-white shadow-[0_15px_40px_rgba(13,124,120,0.4)] h-14 text-lg font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-[0.2em]" disabled={isLoading}>
                    {isLoading ? "Authenticating..." : "LOGIN"}
                  </Button>
                </CardFooter>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-8 duration-300">
              <CardHeader className="pb-4 pt-10 px-10 text-center relative">
                <button 
                  onClick={() => setView("login")}
                  className="absolute left-8 top-10 text-white/40 hover:text-white transition-colors transition-transform hover:scale-110 active:scale-90"
                >
                  <ArrowLeft size={24} />
                </button>
                <CardTitle className="text-4xl font-bold text-white tracking-tight mb-2">
                  Reset
                </CardTitle>
                <CardDescription className="text-white/80 text-[15px] font-semibold leading-relaxed max-w-[320px] mx-auto">
                  Provide your details to recover access
                </CardDescription>
              </CardHeader>
              
              <form onSubmit={handleReset} className="flex-1 flex flex-col justify-between">
                <CardContent className="space-y-5 px-10">
                  <div className="space-y-3">
                    <Label htmlFor="full-name" className="text-white text-[11px] font-black uppercase tracking-[0.15em] ml-1">
                      FULL NAME
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-4 h-4.5 w-4.5 text-white/30 group-focus-within:text-white transition-colors" />
                      <Input 
                        id="full-name" 
                        placeholder="Enter your full name" 
                        className="h-14 pl-12 bg-black/20 border-white/10 focus:border-[#0d7c78]/50 focus:bg-black/40 focus:ring-0 text-white placeholder:text-white/30 rounded-2xl transition-all text-base font-medium" 
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="reset-email" className="text-white text-[11px] font-black uppercase tracking-[0.15em] ml-1">
                      EMAIL
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-4 h-4.5 w-4.5 text-white/30 group-focus-within:text-white transition-colors" />
                      <Input 
                        id="reset-email" 
                        type="email" 
                        placeholder="Enter your email" 
                        className="h-14 pl-12 bg-black/20 border-white/10 focus:border-[#0d7c78]/50 focus:bg-black/40 focus:ring-0 text-white placeholder:text-white/30 rounded-2xl transition-all text-base font-medium" 
                        required 
                      />
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="pt-4 pb-10 px-10">
                  <Button type="submit" className="w-full bg-[#0d7c78] hover:bg-[#14b8a6] text-white shadow-[0_15px_40px_rgba(13,124,120,0.4)] h-14 text-lg font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-[0.2em]" disabled={isLoading}>
                    {isLoading ? "Processing..." : "RESET PASSWORD"}
                  </Button>
                </CardFooter>
              </form>
            </div>
          )}
        </Card>

        <div className="text-center">
          <p className="text-[12px] text-white flex items-center justify-center gap-2.5 font-black tracking-[0.3em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            <ShieldCheck className="w-4.5 h-4.5" /> SECURE ENCRYPTED ACCESS
          </p>
        </div>
      </div>
    </div>
  );
}
