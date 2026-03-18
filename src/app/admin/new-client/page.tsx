// src/app/admin/new-client/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function NewClientPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    shopName: "",
    adminEmail: "",
    password: "",
  });

  const handleCreate = async () => {
    if(!form.shopName || !form.adminEmail || !form.password) {
      alert("Please fill all fields");
      return;
    }
    
    setLoading(true);
    try {
      // 1. Create the Organization (Shop)
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: form.shopName })
        .select('id')
        .single();

      if (orgError) throw orgError;

      // 2. Create the Admin User for that Shop
      // Note: In production, use a server action or backend function for user creation
      // This client-side signup works for Supabase Auth.
      const { data: user, error: userError } = await supabase.auth.signUp({
        email: form.adminEmail,
        password: form.password,
        options: {
          data: {
            organization_id: org.id, // LINK USER TO ORG
            role: 'admin'
          }
        }
      });

      if (userError) throw userError;

      alert(`Success! Shop created with ID: ${org.id}`);
      router.push('/admin');
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Register New Client</h1>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Shop Name (e.g. Nairobi Spirits)"
            value={form.shopName}
            onChange={(e) => setForm({...form, shopName: e.target.value})}
            className="w-full p-3 border rounded-lg"
          />
          
          <input
            type="email"
            placeholder="Admin Email (e.g. owner@gmail.com)"
            value={form.adminEmail}
            onChange={(e) => setForm({...form, adminEmail: e.target.value})}
            className="w-full p-3 border rounded-lg"
          />

          <input
            type="text"
            placeholder="Password for Admin"
            value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}
            className="w-full p-3 border rounded-lg"
          />
        </div>

        <button 
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 disabled:bg-gray-300"
        >
          {loading ? "Creating..." : "Create Shop & User"}
        </button>
      </div>
    </div>
  );
}
