let isLoginMode = true;

function renderMode() {
    document.getElementById('btn-submit').textContent = isLoginMode ? 'Masuk' : 'Bikin akun';
    const title = document.getElementById('form-title');
    if (title) title.textContent = isLoginMode ? 'Masuk' : 'Daftar';
    document.getElementById('form-subtitle').textContent = isLoginMode
        ? 'Selamat datang lagi. Masuk dulu, ya.'
        : 'Bikin akun baru buat mulai nyatet.';
    document.getElementById('toggle-label').textContent = isLoginMode ? 'Belum punya akun?' : 'Udah punya akun?';
    document.getElementById('btn-toggle').textContent = isLoginMode ? 'Daftar' : 'Masuk';
    document.getElementById('auth-password').setAttribute('autocomplete', isLoginMode ? 'current-password' : 'new-password');
}

function toggleMode() {
    isLoginMode = !isLoginMode;
    renderMode();
}

async function handleAuth(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const btn = document.getElementById('btn-submit');

    if (!email || !password) { showToast('Email dan password wajib diisi.', true); return; }

    btn.disabled = true;
    btn.textContent = 'Sebentar...';

    if (isLoginMode) {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            showToast(error.message, true);
            btn.disabled = false;
            renderMode();
        } else {
            showToast('Berhasil masuk. Lagi dialihkan...');
            setTimeout(() => { window.location.href = 'index.html'; }, 800);
        }
    } else {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        btn.disabled = false;
        if (error) {
            showToast(error.message, true);
            renderMode();
        } else {
            showToast('Akun udah dibuat. Silakan masuk.');
            isLoginMode = true;
            renderMode();
        }
    }
}

// Akun demo publik: datanya dipakai bareng semua pengunjung
async function loginAsDemo() {
    const btn = document.getElementById('btn-demo');
    btn.disabled = true;
    showToast('Lagi masuk ke akun demo...');
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: 'demo@zendash.com',
        password: 'demo123'
    });
    if (error) {
        btn.disabled = false;
        showToast('Gagal masuk akun demo: ' + error.message, true);
    } else {
        setTimeout(() => { window.location.href = 'index.html'; }, 600);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('auth-form').addEventListener('submit', handleAuth);
    document.getElementById('btn-toggle').addEventListener('click', toggleMode);
    document.getElementById('btn-demo').addEventListener('click', loginAsDemo);
    renderMode();

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) window.location.href = 'index.html';
});
