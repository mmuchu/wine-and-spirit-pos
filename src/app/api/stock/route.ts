import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Import the server client we fixed

export async function POST(request: Request) {
  // 1. Get the authenticated user
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. FETCH THE USER'S ROLE FROM THE PROFILES TABLE
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
  }

  // 3. ENFORCE RBAC: Only Admins or Managers can add/update stock
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return NextResponse.json({ 
      error: 'Forbidden: You do not have permission to modify stock' 
    }, { status: 403 });
  }

  // --- If they pass the security check, proceed with the logic ---
  try {
    const body = await request.json();
    // ... your stock update logic here ...

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}