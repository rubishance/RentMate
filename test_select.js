const supabaseUrl = "https://qfvrekvugdjnwhnaucmz.supabase.co";
const supabaseKey = "493615eb140d60f969747468b3225cdcae00fb172fa67499ae8bf39df86e2b35"; // from secrets list digest... wait, digest is not the key!

fetch(supabaseUrl + "/rest/v1/whatsapp_conversations?select=*", {
    headers: {
        "apikey": "sb_publishable_3nV93e7E6AXGTNoSRPv2Xg_yd1NY6ey", // Anon Key
        "Authorization": "Bearer sb_publishable_3nV93e7E6AXGTNoSRPv2Xg_yd1NY6ey" // Anon Key
    }
}).then(res => res.text()).then(console.log);
