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
  { name: "Expenses", href: "/expenses", icon: ReceiptIcon, managerOnly: true },
  { name: "Reports", href: "/reports", icon: ChartIcon, managerOnly: true },
  { name: "Profit & Loss", href: "/reports/profit-loss", icon: ScaleIcon, adminOnly: true },
  { name: "Daily Audit", href: "/reports/audit", icon: ClipboardIcon, adminOnly: true },
  { name: "Stock Return", href: "/reports/stock", icon: DocumentIcon, managerOnly: true },
  { name: "Sales History", href: "/reports/sales-history", icon: ArrowPathIcon, managerOnly: true }, // ADDED THIS
  { name: "Shift History", href: "/shift-history", icon: ClockIcon },
  { name: "Settings", href: "/settings", icon: CogIcon, adminOnly: true },
  { name: "Super Admin", href: "/admin", icon: ShieldIcon, ownerOnly: true },
];

export function Sidebar() {
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  
  const { organizationId, loading: orgLoading } = useOrganization();
  const { isManager, isAdmin, isOwner, userRole } = useRole();
  
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftMode, setShiftMode] = useState<'open' | 'close'>('open');

  const visibleNavigation = navigation.filter(item => {
    if (item.ownerOnly && !isOwner) return false;
    if (isOwner) return true;
    if (isAdmin) return true;
    if (item.adminOnly && !isAdmin) return false;
    if (item.managerOnly && !isManager) return false;
    return true;
  });

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserEmail(data.user.email ?? null);
    };
    getUser();
  }, [supabase]);

  const checkActiveShift = async () => {
    try {
      const shift = await shiftService.getCurrentShift(organizationId);
      setCurrentShift(shift);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (organizationId) checkActiveShift();
  }, [organizationId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleShiftAction = async () => {
    if (currentShift) { setShiftMode('close'); setIsShiftModalOpen(true); }
    else { setShiftMode('open'); setIsShiftModalOpen(true); }
  };

  const handleCashConfirm = async (amount: number) => {
    setIsShiftModalOpen(false);
    if (shiftMode === 'open') {
      if (!organizationId) return;
      try { 
        await shiftService.openShift(organizationId, amount); 
        checkActiveShift(); 
      } catch (e) { console.error(e); }
    } else {
      router.push(`/reports/stock?action=close_shift&cash=${amount}`);
    }
  };

  return (
    <>
      <aside className="fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r flex flex-col">
        <div className="h-16 flex items-center px-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg"><span className="text-white font-bold text-lg">K</span></div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 tracking-tight">KENYAN SPIRIT</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Lounge & Bistro</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? "bg-black text-white shadow-lg" : "text-gray-500 hover:bg-gray-50"}`}>
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t bg-gray-50/50 shrink-0">
          <div className="mb-4 p-4 bg-white rounded-xl border shadow-sm">
             <div className="flex justify-between items-center mb-3">
               <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Shift Status</p>
                  <p className={`text-sm font-bold mt-0.5 ${currentShift ? 'text-emerald-500' : 'text-gray-400'}`}>{orgLoading ? 'Loading...' : (currentShift ? 'Active' : 'Closed')}</p>
               </div>
             </div>
             <button onClick={handleShiftAction} disabled={orgLoading || !organizationId} className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${currentShift ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-black text-white hover:bg-gray-800'} disabled:bg-gray-100 disabled:text-gray-400`}>
               {orgLoading ? 'Initializing...' : (currentShift ? 'Close Shift' : 'Start Shift')}
             </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-gray-700 truncate">{userEmail || "User"}</p>
                <p className="text-[10px] text-gray-400">{isOwner ? 'Owner' : (userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User')}</p>
              </div>
            </div>
            <button onClick={handleSignOut} className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      <ShiftModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} onConfirm={handleCashConfirm} mode={shiftMode} expectedCash={0} />
    </>
  );
}

// --- Icons ---
function HomeIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>); }
function CartIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>); }
function BoxIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>); }
function TruckIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>); }
function ReceiptIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h.007v.008H12V7.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h.007v.008h-.007V7.5Zm-.795 3.75h.008v.007h-.008v-.007Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 0h.008v.007h-.008v-.007Zm-.375 3.75h.007v.008H12v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 0h.007v.008H12v-.008Zm-.375 3.75h.007v.008H12v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 0h.007v.008H12v-.008ZM9.75 21h4.5c.138 0 .252-.095.289-.231l1.44-5.769a.375.375 0 0 0-.289-.469H8.31a.375.375 0 0 0-.289.469l1.44 5.769c.037.136.151.231.289.231Z" /></svg>); }
function ChartIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>); }
function ScaleIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.119 2.01.265 3 .434m-3-.434c.25.03.5.062.75.097m-.75-.097c-1.472-.174-2.882-.265-4.185-.75m0 0c-1.472 0-2.882.265-4.185.75M12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.119 2.01.265 3 .434m-3-.434c.25.03.5.062.75.097m-.75-.097c-1.472-.174-2.882-.265-4.185-.75M3 12.75V6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-.75.75H3.75a.75.75 0 0 1-.75-.75Z" /></svg>); }
function ClipboardIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.042-.114 2.25 2.25 0 0 0-2.26-2.243 48.41 48.41 0 0 0-2.26.114c-1.131.094-1.976 1.057-1.976 2.192v.96m0 0v.96m0 0H8.25m0 0v.96m0 0v.96m0 0H6.75m0 0v-.96m0 0v-.96m0 0V6.75m0 0v-.96m0 0V5.25m0 0v-.96m0 0V3.75m0 0A2.25 2.25 0 0 1 7.5 1.5h9a2.25 2.25 0 0 1 2.25 2.25v.96m-4.5 0v-.96m0 0v.96m0 0v.96m0 0H12m0 0v-.96m0 0v.96m0 0v.96m0 0h-.75m0 0v-.96m0 0v-.96m0 0H9m0 0v.96m0 0v.96m0 0h-.75m0 0v-.96m0 0v-.96m0 0H6m0 0v.96m0 0v.96m0 0H5.25m0 0v-.96m0 0v-.96m0 0V6.75" /></svg>); }
function DocumentIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>); }
function ArrowPathIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>); }
function ClockIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>); }
function CogIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>); }
function ShieldIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.168-8.25-3.036Z" /></svg>); }
function LogoutIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>); }