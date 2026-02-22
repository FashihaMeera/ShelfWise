import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
    to: string;
    subject: string;
    html: string;
}

async function sendEmail(payload: EmailPayload) {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
        console.log("RESEND_API_KEY not set, skipping email:", payload.subject);
        return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: "ShelfWise <onboarding@resend.dev>",
            to: [payload.to],
            subject: payload.subject,
            html: payload.html,
        }),
    });

    const data = await res.json();
    return { success: res.ok, data };
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, serviceKey);

        const now = new Date();
        const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

        // 1. Due date reminders (books due within 2 days)
        const { data: dueSoon } = await supabase
            .from("borrowings")
            .select("*, books(title), profiles!borrowings_user_id_fkey(full_name)")
            .is("returned_at", null)
            .lte("due_date", twoDaysFromNow.toISOString())
            .gt("due_date", now.toISOString());

        let sentCount = 0;

        for (const borrowing of dueSoon || []) {
            // Get user email from auth
            const { data: authUser } = await supabase.auth.admin.getUserById(borrowing.user_id);
            if (!authUser?.user?.email) continue;

            const dueDate = new Date(borrowing.due_date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });

            const result = await sendEmail({
                to: authUser.user.email,
                subject: `📚 Reminder: "${(borrowing as any).books?.title}" is due soon`,
                html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #6366f1;">📚 ShelfWise - Due Date Reminder</h2>
            <p>Hi ${(borrowing as any).profiles?.full_name || "Reader"},</p>
            <p>This is a reminder that <strong>"${(borrowing as any).books?.title}"</strong> is due on <strong>${dueDate}</strong>.</p>
            <p>Please return it on time to avoid late fees.</p>
            <hr style="border-color: #e5e7eb;" />
            <p style="color: #9ca3af; font-size: 12px;">ShelfWise Library Management System</p>
          </div>
        `,
            });

            if (result.success) sentCount++;
        }

        // 2. Overdue alerts
        const { data: overdueBooks } = await supabase
            .from("borrowings")
            .select("*, books(title), profiles!borrowings_user_id_fkey(full_name)")
            .is("returned_at", null)
            .lt("due_date", now.toISOString());

        for (const borrowing of overdueBooks || []) {
            const { data: authUser } = await supabase.auth.admin.getUserById(borrowing.user_id);
            if (!authUser?.user?.email) continue;

            const daysOverdue = Math.floor((now.getTime() - new Date(borrowing.due_date).getTime()) / (1000 * 60 * 60 * 24));

            const result = await sendEmail({
                to: authUser.user.email,
                subject: `⚠️ Overdue: "${(borrowing as any).books?.title}" (${daysOverdue} days)`,
                html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #ef4444;">⚠️ ShelfWise - Overdue Notice</h2>
            <p>Hi ${(borrowing as any).profiles?.full_name || "Reader"},</p>
            <p><strong>"${(borrowing as any).books?.title}"</strong> is now <strong>${daysOverdue} day(s) overdue</strong>.</p>
            <p>Please return it as soon as possible to minimize late fees.</p>
            <hr style="border-color: #e5e7eb;" />
            <p style="color: #9ca3af; font-size: 12px;">ShelfWise Library Management System</p>
          </div>
        `,
            });

            if (result.success) sentCount++;
        }

        return new Response(
            JSON.stringify({ success: true, emails_sent: sentCount }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
