 // src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { shiftService } from "@/lib/services/shiftService";
import { ShiftModal } from "@/components/shifts/ShiftModal";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { useRole } from "@/lib/hooks/useRole";

const navigation = [
  { name: "Dashboard", href: "/", icon: HomeIcon },
  { name: "POS", href: "/pos", icon: CartIcon },
  { name: "Inventory", href: "/inventory", icon: BoxIcon },
  { name: "Suppliers", href: "/suppliers", icon: TruckIcon, adminOnly: true },
  { name: "Expenses", href: "/expenses", icon: ExpenseIcon, managerOnly: true },
  { name: "Reports", href: "/reports", icon: ChartIcon, managerOnly: true },
  { name: "Profit & Loss", href: "/reports/profit-loss", icon: ScaleIcon, adminOnly: true },
  { name: "Daily Audit", href: "/reports/audit", icon: ClipboardListIcon, adminOnly: true },
  { name: "Stock Return", href: "/reports/stock", icon: DocumentIcon, managerOnly: true },
  { name: "Shift History", href: "/shift-history", icon: ClockIcon },
  { name: "Settings", href: "/settings", icon: CogIcon, adminOnly: true },
];

export function Sidebar() {
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  
  const { organizationId, loading: orgLoading } = useOrganization();
  const { isManager, isAdmin, isOwner } = useRole();
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftMode, setShiftMode] = useState<'open' | 'close'>('open');

  // Filter Navigation
  const visibleNavigation = navigation.filter(item => {
    if (isOwner) return true;
    if (isAdmin) return true;
    if (item.adminOnly && !isAdmin) return false;
    if (item.managerOnly && !isManager) return false;
    return true;
  });

  // Fetch User Email ONCE
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserEmail(data.user.email ?? null);
    };
    getUser();
  }, [supabase]);

  // Check Shift Status ONLY when organizationId changes
  useEffect(() => {
    if (organizationId) checkActiveShift();
  }, [organizationId]);

  const checkActiveShift = async () => {
    try {
      const shift = await shiftService.getCurrentShift(organizationId);
      setCurrentShift(shift);
    } catch (err: any) {
      console.error("Error checking shift:", err?.message || err);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleShiftAction = async () => {
    if (currentShift) {
      setShiftMode('close');
      setIsShiftModalOpen(true);
    } else {
      setShiftMode('open');
      setIsShiftModalOpen(true);
    }
  };

  const handleCashConfirm = async (amount: number, notes?: string) => {
    setIsShiftModalOpen(false);
    
    if (shiftMode === 'open') {
      if (!organizationId) {
        alert("Organization context missing.");
        return;
      }

      try {
        const newShift = await shiftService.openShift(organizationId, amount);
        setCurrentShift(newShift);
      } catch (error: any) {
        console.error("Shift error:", error);
        // FIX: Show actual error message to user
        alert(error?.message || "Failed to start shift. Check console for details.");
      }
    } else {
      const params = new URLSearchParams({
        action: 'close_shift',
        cash: String(amount),
        notes: notes || ''
      });
      router.push(`/reports/stock?${params.toString()}`);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 p-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <h1 className="font-bold text-gray-900">Kenyan Spirit</h1>
        </div>
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          <MenuIcon className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 tracking-tight">KENYAN SPIRIT</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Lounge & Bistro</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                  ${isActive 
                    ? "bg-black text-white shadow-lg shadow-gray-200" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}
                `}
              >
                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
          {/* Shift Widget */}
          <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
               <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Shift Status</p>
                  <p className={`text-sm font-bold mt-0.5 ${currentShift ? 'text-emerald-500' : 'text-gray-400'}`}>
                    {orgLoading ? 'Loading...' : (currentShift ? 'Active' : 'Closed')}
                  </p>
               </div>
               <div className={`w-3 h-3 rounded-full shadow-inner ${currentShift ? 'bg-emerald-400 animate-pulse' : 'bg-gray-300'}`}></div>
            </div>
            <button 
               onClick={handleShiftAction}
               disabled={orgLoading || !organizationId}
               className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                 currentShift 
                   ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                   : 'bg-black text-white hover:bg-gray-800'
               } disabled:bg-gray-100 disabled:text-gray-400`}
             >
               {orgLoading ? 'Initializing...' : (currentShift ? 'Close Shift' : 'Start Shift')}
             </button>
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-200">
                <span className="text-gray-600 font-bold text-sm">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-gray-700 truncate">{userEmail || "User"}</p>
                <p className="text-[10px] text-gray-400">Cashier</p>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Sign Out"
            >
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Modals */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onConfirm={handleCashConfirm}
        mode={shiftMode}
        expectedCash={0}
      />
    </>
  );
}

// --- Icons ---
function HomeIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>); }
function CartIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>); }
function BoxIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>); }
function TruckIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>); }
function ExpenseIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>); }
function ChartIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>); }
function ScaleIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.119 2.01.265 3 .434m-3-.434c.25.03.5.062.75.097m-.75-.097c-1.472-.174-2.882-.265-4.185-.75m0 0c-1.472 0-2.882.265-4.185.75M12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.119 2.01.265 3 .434m-3-.434c.25.03.5.062.75.097m-.75-.097c-1.472-.174-2.882-.265-4.185-.75M3 12.75V6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-.75.75H3.75a.75.75 0 0 1-.75-.75Z" /></svg>); }
function ClipboardListIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.042-.114 2.25 2.25 0 0 0-2.26-2.243 48.41 48.41 0 0 0-2.26.114c-1.131.094-1.976 1.057-1.976 2.192v.96m0 0v.96m0 0H8.25m0 0v.96m0 0v.96m0 0H6.75m0 0v-.96m0 0v-.96m0 0V6.75m0 0v-.96m0 0V5.25m0 0v-.96m0 0V3.75m0 0A2.25 2.25 0 0 1 7.5 1.5h9a2.25 2.25 0 0 1 2.25 2.25v.96m-4.5 0v-.96m0 0v.96m0 0v.96m0 0H12m0 0v-.96m0 0v.96m0 0v.96m0 0h-.75m0 0v-.96m0 0v-.96m0 0H9m0 0v.96m0 0v.96m0 0h-.75m0 0v-.96m0 0v-.96m0 0H6m0 0v.96m0 0v.96m0 0H5.25m0 0v-.96m0 0v-.96m0 0V6.75" /></svg>); }
function DocumentIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>); }
function ClockIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>); }
function CogIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>); }
function MenuIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>); }
function LogoutIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>); }