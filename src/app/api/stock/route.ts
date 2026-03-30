import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Get the authenticated user
    const supabase = await createClient(); // THE CRITICAL FIX IS HERE
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 2. Check authorization
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Parse request body
    const body = await request.json();

    // 4. Update the stock in the database
    const { data, error } = await supabase
      .from("products")
      .update({ stock: body.stock })
      .eq("id", body.productId);

    if (error) {
      return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
    }

    // 5. Return success
    return NextResponse.json({ message: "Stock updated successfully", data });
    
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}