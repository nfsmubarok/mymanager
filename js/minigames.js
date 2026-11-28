let solvedBoard = []; // kunci jawaban
let lives = 3;
let cellsLeft = 45;

function setStatus(msg) {
    const el = document.getElementById('game-status');
    if (el) el.textContent = msg;
}

function generateSudoku() {
    const levelDropdown = document.getElementById('sudoku-level');
    const targetHoles = levelDropdown ? parseInt(levelDropdown.value) : 45;

    lives = 3;
    cellsLeft = targetHoles;
    updateLivesDisplay();
    setStatus('');
    const oldSeal = document.querySelector('#sudoku-paper > .hanko-seal');
    if (oldSeal) oldSeal.remove(); // game baru, stempel lama dibuang

    // Papan dasar yang valid, lalu angkanya diacak biar tiap game beda
    const base = [
        [1,2,3, 4,5,6, 7,8,9], [4,5,6, 7,8,9, 1,2,3], [7,8,9, 1,2,3, 4,5,6],
        [2,3,4, 5,6,7, 8,9,1], [5,6,7, 8,9,1, 2,3,4], [8,9,1, 2,3,4, 5,6,7],
        [3,4,5, 6,7,8, 9,1,2], [6,7,8, 9,1,2, 3,4,5], [9,1,2, 3,4,5, 6,7,8]
    ];
    const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
    solvedBoard = base.map(row => row.map(val => nums[val - 1]));

    const puzzleBoard = solvedBoard.map(row => row.slice());
    let holes = targetHoles;
    while (holes > 0) {
        const r = Math.floor(Math.random() * 9);
        const c = Math.floor(Math.random() * 9);
        if (puzzleBoard[r][c] !== 0) {
            puzzleBoard[r][c] = 0;
            holes--;
        }
    }
    renderBoard(puzzleBoard);
}

function updateLivesDisplay() {
    const display = document.getElementById('lives-display');
    if (!display) return;
    display.textContent = '●'.repeat(lives) + '○'.repeat(3 - lives);
    display.setAttribute('aria-label', `Sisa ${lives} dari 3`);
}

function lockBoard() {
    document.querySelectorAll('.sudoku-cell').forEach(input => {
        input.readOnly = true;
        input.classList.add('readonly');
    });
}

function renderBoard(board) {
    const container = document.getElementById('sudoku-board');
    container.innerHTML = '';

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const val = board[r][c];
            const input = document.createElement('input');
            input.type = 'text';
            input.inputMode = 'numeric';
            input.maxLength = 1;
            input.autocomplete = 'off';
            input.className = 'sudoku-cell';
            input.setAttribute('aria-label', `Baris ${r + 1}, kolom ${c + 1}`);
            if (c === 2 || c === 5) input.classList.add('thick-right');
            if (r === 2 || r === 5) input.classList.add('thick-bottom');

            if (val !== 0) {
                input.value = val;
                input.classList.add('readonly');
                input.readOnly = true;
            } else {
                input.addEventListener('input', function () {
                    const num = parseInt(this.value.slice(-1));
                    if (this.value === '') return;
                    if (isNaN(num) || num < 1 || num > 9) { this.value = ''; return; }
                    this.value = num;

                    if (num === solvedBoard[r][c]) {
                        this.classList.add('readonly', 'solved');
                        this.readOnly = true;
                        cellsLeft--;
                        if (cellsLeft === 0) {
                            setStatus('Beres! Lu berhasil mecahin sudoku-nya.');
                            showToast('Beres! Sudoku kepecahin.');
                            if (window.Motion) Motion.stampHanko(document.getElementById('sudoku-paper'));
                        }
                    } else {
                        lives--;
                        updateLivesDisplay();
                        this.value = '';
                        this.classList.add('wrong');
                        setTimeout(() => this.classList.remove('wrong'), 400);
                        if (lives <= 0) {
                            lockBoard();
                            setStatus('Nyawa abis. Klik "Ulang dari awal" buat coba lagi.');
                        } else {
                            setStatus(`Angka ${num} salah di situ.`);
                        }
                    }
                });
            }
            container.appendChild(input);
        }
    }
}

// Panah keyboard buat pindah antar kotak
document.addEventListener('keydown', (e) => {
    if (!e.target.classList || !e.target.classList.contains('sudoku-cell')) return;
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
    if (!(e.key in moves)) return;
    const cells = Array.from(document.querySelectorAll('.sudoku-cell'));
    const next = cells[cells.indexOf(e.target) + moves[e.key]];
    if (next) { e.preventDefault(); next.focus(); }
});

document.addEventListener('DOMContentLoaded', async () => {
    generateSudoku();
    await requireAuth();
});
