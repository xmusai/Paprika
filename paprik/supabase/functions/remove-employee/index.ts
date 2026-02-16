import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RemoveEmployeeRequest {
  employee_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "Invalid authorization token", details: authError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Authenticated user:", user.id);

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "manager") {
      console.error("Profile check failed:", profileError?.message || "Not a manager", profile);
      return new Response(
        JSON.stringify({ error: "Only managers can remove employees" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Manager verified:", user.id);

    const body: RemoveEmployeeRequest = await req.json();
    const { employee_id } = body;

    if (!employee_id) {
      console.error("Missing employee_id in request body");
      return new Response(
        JSON.stringify({ error: "Missing employee_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Removing employee:", employee_id);

    const { data: employee, error: employeeError } = await supabaseClient
      .from("profiles")
      .select("id, full_name, is_active")
      .eq("id", employee_id)
      .maybeSingle();

    if (employeeError || !employee) {
      console.error("Employee not found:", employeeError?.message || "No employee");
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!employee.is_active) {
      console.log("Employee already deactivated:", employee_id);
      return new Response(
        JSON.stringify({ error: "Employee is already deactivated" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Deactivating employee:", employee_id);

    const { error: deactivateError } = await supabaseClient
      .from("profiles")
      .update({ is_active: false })
      .eq("id", employee_id);

    if (deactivateError) {
      console.error("Failed to deactivate:", deactivateError.message);
      return new Response(
        JSON.stringify({ error: "Failed to deactivate employee", details: deactivateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Employee deactivated, removing future shifts");

    const today = new Date();
    const currentDateStr = today.toISOString().split('T')[0];

    const { error: deleteShiftsError } = await supabaseClient
      .from("schedules")
      .delete()
      .eq("employee_id", employee_id)
      .gte("date", currentDateStr);

    if (deleteShiftsError) {
      console.error("Failed to remove shifts:", deleteShiftsError.message);
      return new Response(
        JSON.stringify({ error: "Failed to remove future shifts", details: deleteShiftsError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Employee removed successfully:", employee_id);

    return new Response(
      JSON.stringify({ success: true, message: "Employee removed successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});