 "use client";

import React from 'react';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { shiftService } from "@/lib/services/shiftService";
import { ShiftModal } from "@/components/shifts/ShiftModal";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { useRole } from "@/lib/hooks/useRole";

// Define the type for navigation items
type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<any>; // Standard React Component type
  adminOnly?: boolean;
  managerOnly?: boolean;
  ownerOnly?: boolean;
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: HomeIcon },
  { name: "POS", href: "/pos", icon: CartIcon },
  { name: "Inventory", href: "/inventory", icon: BoxIcon },
  { name: "Settings", href: "/settings", icon: CogIcon, adminOnly: true },
];

export function Sidebar() {
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  
  const { organizationId, loading: orgLoading } = useOrganization();
  const { isAdmin, isOwner } = useRole();
  
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftMode, setShiftMode] = useState<'open' | 'close'>('open');

  // Filter Navigation based on roles
  const visibleNavigation = navigation.filter(item => {
    if (item.ownerOnly && !isOwner) return false;
    if (isOwner) return true; // Owner sees everything
    if (isAdmin) return true; // Admin sees everything
    if (item.adminOnly && !isAdmin) return false; // Hide admin items
    return true;
  });

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserEmail(data.user.email ?? null);
    };
    getUser();
  }, [supabase]);

  useEffect(() => {
    if (organizationId) checkActiveShift();
  }, [organizationId]);

  const checkActiveShift = async () => {
    try {
      const shift = await shiftService.getCurrentShift(organizationId);
      setCurrentShift(shift);
    } catch (err) { console.error(err); }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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

  const handleCashConfirm = async (amount: number) => {
    setIsShiftModalOpen(false);
    if (shiftMode === 'open') {
      if (!organizationId) return;
      try {
        const newShift = await shiftService.openShift(organizationId, amount);
        setCurrentShift(newShift);
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
            return (
              <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? "bg-black text-white shadow-lg" : "text-gray-500 hover:bg-gray-50"}`}>
                <item.icon className="w-5 h-5" />
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
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border">
                <span className="text-gray-600 font-bold text-sm">{userEmail ? userEmail.charAt(0).toUpperCase() : "U"}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-gray-700 truncate">{userEmail || "User"}</p>
                <p className="text-[10px] text-gray-400">Admin</p>
              </div>
            </div>
            <button onClick={handleSignOut} className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Sign Out">
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      <ShiftModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} onConfirm={handleCashConfirm} mode={shiftMode} expectedCash={0} />
    </>
  );
}

function HomeIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>); }
function CartIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>); }
function BoxIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>); }
function CogIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>); }
function LogoutIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>); }