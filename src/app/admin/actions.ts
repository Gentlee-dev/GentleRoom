"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getAdmin } from "@/lib/supabase/server";
import { STATUSES } from "@/lib/constants";

export async function signIn(_prev: string | null, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function updateRequest(formData: FormData) {
  const { supabase, isAdmin, user } = await getAdmin();
  if (!isAdmin || !user) throw new Error("권한이 없습니다.");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const reply = String(formData.get("reply") ?? "").trim();
  if (!(status in STATUSES)) throw new Error("잘못된 상태값");

  const { error } = await supabase
    .from("requests")
    .update({ status, reply: reply || null, handled_by: user.id })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteRequest(formData: FormData) {
  const { supabase, isAdmin } = await getAdmin();
  if (!isAdmin) throw new Error("권한이 없습니다.");
  const { error } = await supabase.from("requests").delete().eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function updateJoinCode(formData: FormData) {
  const { supabase, isAdmin } = await getAdmin();
  if (!isAdmin) throw new Error("권한이 없습니다.");
  const value = String(formData.get("join_code") ?? "").trim();
  const { error } = await supabase
    .from("app_settings")
    .update({ value: value || null })
    .eq("key", "join_code");
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
