// --- KONFIGURASI SUPABASE ---
const supabaseUrl = 'https://pbvjxiyijesakcnywgdv.supabase.co';
const supabaseKey = 'sb_publishable_2yVPX7xdB2PnDNR3Pi4R-A_acaqtDH3'; 
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- SISTEM GEMBOK LOGIN ---
async function checkAuth() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
        } else {
            if (typeof fetchCloudData === 'function') {
                fetchCloudData();
            }
        }
    } catch (err) {
        console.error("Auth Error:", err);
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}