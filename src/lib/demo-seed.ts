import { supabase } from "@/integrations/supabase/client";

export const DEMO_IDS = {
  sakura: "11111111-1111-1111-1111-111111111101",
  kaito: "11111111-1111-1111-1111-111111111102",
  rin: "11111111-1111-1111-1111-111111111103",
  yuki: "11111111-1111-1111-1111-111111111104",
  akira: "11111111-1111-1111-1111-111111111105",
  midori: "11111111-1111-1111-1111-111111111106",
  hiro: "11111111-1111-1111-1111-111111111107",
  mei: "11111111-1111-1111-1111-111111111108",
};

// First 5 become friends, last 3 send pending friend requests
const FRIEND_IDS = [DEMO_IDS.sakura, DEMO_IDS.kaito, DEMO_IDS.rin, DEMO_IDS.yuki, DEMO_IDS.midori];
const REQUESTERS = [DEMO_IDS.akira, DEMO_IDS.hiro, DEMO_IDS.mei];

export async function seedDemoSocial(userId: string) {
  // Friendships (both directions; only own direction for RLS — the other side
  // exists too because the demo profile rows can't write, so we insert what we can.
  // Our select policy reads both sides via friend_id, so a one-way row from us is enough.
  const friendRows = FRIEND_IDS.map((fid) => ({ user_id: userId, friend_id: fid }));
  await supabase.from("friendships").upsert(friendRows, { onConflict: "user_id,friend_id" } as any).then(() => {});

  // Pending friend requests TO us (we can't insert as another user due to RLS,
  // so instead insert outgoing requests FROM us to these accounts to show outgoing).
  // To still demo the inbox, also insert one self-loop using REQUESTERS by abusing
  // the from_user check: not allowed. So we surface them as "suggested" only.
  // Instead, simulate inbox by creating requests via service-only path is not available
  // from the client — so we skip true inbox seed and rely on real signups for that demo.

  // DMs: send a few from us; we can't send AS them due to RLS. The chat will look one-sided
  // but proves the flow. Use show recs.
  const dms = [
    { from_user: userId, to_user: DEMO_IDS.sakura, content: "Hey! How's Frieren so far?" },
    { from_user: userId, to_user: DEMO_IDS.kaito, content: "", show_rec: { id: "solo-leveling", title: "Solo Leveling", cover: "linear-gradient(135deg, #3b82f6, #0f172a)" } },
    { from_user: userId, to_user: DEMO_IDS.rin, content: "Dandadan ep 5 was wild 😂" },
  ];
  await supabase.from("direct_messages").insert(dms);
}
