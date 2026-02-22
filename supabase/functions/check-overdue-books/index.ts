import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find all overdue, unreturned borrowings
    const { data: overdue, error: queryErr } = await supabase
      .from("borrowings")
      .select("id, user_id, book_id, due_date, books(title)")
      .is("returned_at", null)
      .lt("due_date", new Date().toISOString());

    if (queryErr) throw queryErr;
    if (!overdue?.length) {
      return new Response(
        JSON.stringify({ message: "No overdue books", created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    let created = 0;

    for (const row of overdue) {
      const bookTitle =
        (row.books as { title: string } | null)?.title ?? "Unknown";

      // Check if already notified today for this user
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("type", "overdue_reminder")
        .gte("created_at", todayStart.toISOString())
        .ilike("message", `%${bookTitle}%`)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const dueDate = new Date(row.due_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const { error: insertErr } = await supabase
        .from("notifications")
        .insert({
          user_id: row.user_id,
          title: "Overdue Book Reminder",
          message: `Your book "${bookTitle}" was due on ${dueDate}. Please return it.`,
          type: "overdue_reminder",
          link: "/borrow-return",
        });

      if (!insertErr) created++;
    }

    return new Response(
      JSON.stringify({ message: "Done", created, checked: overdue.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
