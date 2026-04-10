import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SupportForm from "./SupportForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | Mountain Connects",
  description:
    "Report a bug, request a feature, or get help with your Mountain Connects account.",
};

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/support");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold text-primary">Get Support</h1>
      <p className="mt-2 text-foreground/60">
        Tell us about a bug, request a feature, or get help with your account.
        Our team reviews every report.
      </p>
      <SupportForm
        userName={userData?.full_name || ""}
        userEmail={userData?.email || user.email || ""}
      />
    </div>
  );
}
