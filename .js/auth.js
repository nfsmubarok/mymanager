// --- KONFIGURASI SUPABASE ---
const supabaseUrl = 'https://pbvjxiyijesakcnywgdv.supabase.co';
const supabaseKey = 'sb_publishable_2yVPX7xdB2PnDNR3Pi4R-A_acaqtDH3'; 
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- SISTEM GEMBOK LOGIN ---
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    } else {
        fetchCloudData(); // Tarik data setelah dipastikan login
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}