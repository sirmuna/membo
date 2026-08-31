import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const results: Record<string, any> = {};

  const tables = [
    "organisations",
    "organisation_memberships",
    "organisation_join_requests",
    "organisation_invitations",
    "ownership_transfers",
  ];

  for (const table of tables) {
    try {
      // Query database schema information_schema directly
      const { data, error } = await supabase
        .from(table)
        .select("nonexistent_column_for_inspection")
        .limit(1);

      if (error) {
        // The error message from PostgREST typically contains: "Could not find column nonexistent_column_for_inspection in schema public and table ownership_transfers or similar, but columns available are: id, sender_id, receiver_id..."
        // Let's return the error message so we can parse it!
        results[table] = {
          message: error.message,
          hint: error.hint,
          details: error.details,
        };
      } else {
        results[table] = { data };
      }
    } catch (err: any) {
      results[table] = { error: err.message };
    }
  }

  return NextResponse.json(results);
}
