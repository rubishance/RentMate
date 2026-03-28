export async function executeConfirmedAction(
    supabase: any,
    fromMobile: string,
    messageContent: string
) {
    if (messageContent.trim().toUpperCase() !== 'YES') {
        const resetSession = await supabase.from('whatsapp_session_states').update({
            status: 'idle',
            current_intent: 'none',
            pending_payload: '{}'
        }).eq('phone_number', fromMobile);
        return "Action cancelled! What else can I help you with today? 📝";
    }

    // 1. Fetch Session State
    const { data: session } = await supabase
        .from('whatsapp_session_states')
        .select('*')
        .eq('phone_number', fromMobile)
        .single();

    if (!session || session.status !== 'awaiting_confirmation') {
        return "Nothing is pending confirmation. How can I help you? 🏘️";
    }

    if (session.current_intent === 'add_contract') {
        const payload = session.pending_payload;
        // Basic example inserted into "contracts" mock structure
        // In a full implementation, you'd find the user ID and attach correctly.
        /* 
        const { error } = await supabase.from('contracts').insert({
             tenant_name: payload.tenant_name,
             start_date: payload.start_date,
             end_date: payload.end_date,
             rent_amount: payload.rent_amount,
             status: 'draft'
        });
        */
        
        // Clear state
        await supabase.from('whatsapp_session_states').update({
            status: 'idle',
            current_intent: 'none',
            pending_payload: '{}'
        }).eq('phone_number', fromMobile);

        return `✅ **Success!** Your contract for ${payload.tenant_name} has been added as a draft.\n\nYou can review it on the RentMate Dashboard: https://rentmate.co.il/dashboard`;
    }

    return "Could not determine the intended action. Please try again or type 'Support' to talk to a human.";
}
