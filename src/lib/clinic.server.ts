/** Server-only helper: resolves the clinic workspace of the signed-in caller. */

type RpcClient = {
  rpc: (fn: "current_clinic_id") => PromiseLike<{
    data: string | null;
    error: { message: string } | null;
  }>;
};

export async function requireClinicId(supabase: RpcClient): Promise<string> {
  const { data, error } = await supabase.rpc("current_clinic_id");
  if (error) throw new Error(`Could not resolve your clinic: ${error.message}`);
  if (!data) throw new Error("You are not part of a clinic workspace yet");
  return data;
}
