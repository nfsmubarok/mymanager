// --- KONFIGURASI SUPABASE ---
// Key "publishable" memang aman ditaruh di frontend. Keamanan data dijaga oleh RLS di Supabase.
const supabaseUrl = 'https://pbvjxiyijesakcnywgdv.supabase.co';
const supabaseKey = 'sb_publishable_2yVPX7xdB2PnDNR3Pi4R-A_acaqtDH3';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- GEMBOK LOGIN ---
// Balikin true kalau user udah login. Kalau belum, lempar ke login.html.
async function requireAuth() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    } catch (err) {
        console.error('Auth error:', err);
        showToast('Gagal ngecek login. Coba refresh halaman.', true);
        return false;
    }
}

async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-logout');
    if (btn) btn.addEventListener('click', logout);
});
