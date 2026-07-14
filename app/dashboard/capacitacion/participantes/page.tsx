import { getParticipantsPaginated } from "@/app/actions/participants";
import { ParticipantsClient } from "./ParticipantsClient";
import { createClient } from "@/utils/supabase/server";

export default async function ParticipantesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { participants, total, error } = await getParticipantsPaginated(1, 20, "");

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-red-800 font-semibold">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <ParticipantsClient 
      user={user} 
      initialParticipants={participants || []}
      initialTotal={total}
    />
  );
}
