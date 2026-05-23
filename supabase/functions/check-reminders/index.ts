import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendTwilioSms(phone: string, message: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromPhone) {
    console.log(`[SIMULATED SMS] To: ${phone} | Message: ${message}`);
    return false; // not configured
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: fromPhone,
        Body: message,
      }),
    });
    const data = await res.json();
    console.log("Twilio response:", data.sid ? "sent" : data.message);
    return res.ok;
  } catch (e) {
    console.error("Twilio error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get current time in HH:MM format
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const today = now.toISOString().split("T")[0];

    console.log(`Checking reminders for time: ${currentTime}, date: ${today}`);

    // Fetch all reminders matching current time
    const { data: reminders, error: remError } = await supabase
      .from("reminders")
      .select("*, profiles!inner(name, mobile)")
      .eq("time", currentTime);

    if (remError) {
      console.error("Error fetching reminders:", remError);
      // Try without join if profiles join fails
      const { data: plainReminders, error: plainError } = await supabase
        .from("reminders")
        .select("*")
        .eq("time", currentTime);

      if (plainError) throw plainError;

      for (const rem of plainReminders || []) {
        // Get profile separately
        const { data: prof } = await supabase
          .from("profiles")
          .select("name, mobile")
          .eq("user_id", rem.user_id)
          .single();

        const phone = prof?.mobile || "";
        const message = `Reminder: Time to take your medicine ${rem.medicine_name}${rem.dosage ? ` (${rem.dosage})` : ""}.`;

        // Check if already sent today
        const { data: existing } = await supabase
          .from("sms_logs")
          .select("id")
          .eq("reminder_id", rem.id)
          .eq("sent_date", today)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const sent = await sendTwilioSms(phone, message);

        await supabase.from("sms_logs").insert({
          reminder_id: rem.id,
          user_id: rem.user_id,
          phone_number: phone,
          message,
          status: sent ? "sent" : "simulated",
          sent_date: today,
        });
      }

      return new Response(
        JSON.stringify({ processed: plainReminders?.length ?? 0, time: currentTime }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    for (const rem of reminders || []) {
      const phone = (rem as any).profiles?.mobile || "";
      const message = `Reminder: Time to take your medicine ${rem.medicine_name}${rem.dosage ? ` (${rem.dosage})` : ""}.`;

      // Check if already sent today
      const { data: existing } = await supabase
        .from("sms_logs")
        .select("id")
        .eq("reminder_id", rem.id)
        .eq("sent_date", today)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const sent = await sendTwilioSms(phone, message);

      await supabase.from("sms_logs").insert({
        reminder_id: rem.id,
        user_id: rem.user_id,
        phone_number: phone,
        message,
        status: sent ? "sent" : "simulated",
        sent_date: today,
      });

      processed++;
    }

    return new Response(
      JSON.stringify({ processed, time: currentTime }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
