let solvedBoard = []; // Nyimpen kunci jawaban
let lives = 3;
let cellsLeft = 45; // Default (nanti ditimpa sama level)

window.generateSudoku = function() {
    // Ambil level dari dropdown
    const levelDropdown = document.getElementById('sudoku-level');
    const targetHoles = levelDropdown ? parseInt(levelDropdown.value) : 45;

    // Reset status game sesuai level
    lives = 3;
    cellsLeft = targetHoles; 
    updateLivesDisplay();

    // 1. Template Master (Valid 100%)
    const base = [
        [1,2,3, 4,5,6, 7,8,9], [4,5,6, 7,8,9, 1,2,3], [7,8,9, 1,2,3, 4,5,6],
        [2,3,4, 5,6,7, 8,9,1], [5,6,7, 8,9,1, 2,3,4], [8,9,1, 2,3,4, 5,6,7],
        [3,4,5, 6,7,8, 9,1,2], [6,7,8, 9,1,2, 3,4,5], [9,1,2, 3,4,5, 6,7,8]
    ];

    // 2. Acak angka biar jadi papan unik
    const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
    solvedBoard = base.map(row => row.map(val => nums[val-1])); // Ini KUNCI JAWABANNYA
    
    // 3. Clone untuk papan puzzle (yang bakal dibolongin)
    let puzzleBoard = JSON.parse(JSON.stringify(solvedBoard));
    
    let holes = targetHoles;
    while(holes > 0) {
        let r = Math.floor(Math.random() * 9);
        let c = Math.floor(Math.random() * 9);
        // Pastiin kotaknya belum bolong
        if (puzzleBoard[r][c] !== 0) {
            puzzleBoard[r][c] = 0;
            holes--;
        }
    }
    renderBoard(puzzleBoard);
}

function updateLivesDisplay() {
    const display = document.getElementById('lives-display');
    if(display) {
        display.innerText = '❤️'.repeat(lives) + '💔'.repeat(3 - lives);
    }
}

function renderBoard(board) {
    const container = document.getElementById('sudoku-board');
    container.innerHTML = '';
    
    for(let r = 0; r < 9; r++) {
        for(let c = 0; c < 9; c++) {
            let val = board[r][c];
            let input = document.createElement('input');
            input.type = 'number';
            input.min = 1; input.max = 9;
            input.className = 'sudoku-cell';
            
            // CSS Garis tebal pembatas blok 3x3
            if (c === 2 || c === 5) input.classList.add('thick-right');
            if (r === 2 || r === 5) input.classList.add('thick-bottom');

            if (val !== 0) {
                // Kotak bawaan soal (gak bisa diedit)
                input.value = val;
                input.classList.add('readonly');
                input.readOnly = true;
            } else {
                // Kotak kosong (event listener buat AUTO CHECK)
                input.addEventListener('input', function() {
                    let inputVal = this.value;
                    
                    // Kalau di backspace/kosong, biarin aja
                    if (inputVal === '') return; 
                    
                    // Biar gak bisa ngetik 2 angka (misal: 12)
                    if (inputVal.length > 1) {
                        this.value = inputVal.slice(-1); 
                        inputVal = this.value;
                    }
                    
                    let num = parseInt(inputVal);
                    if (num < 1 || num > 9 || isNaN(num)) {
                        this.value = ''; return;
                    }

                    // --- LOGIKA PENGECEKAN JAWABAN ---
                    let correctVal = solvedBoard[r][c];
                    
                    if (num === correctVal) {
                        // JAWABAN BENAR
                        this.classList.add('readonly');
                        this.readOnly = true;
                        this.style.color = 'var(--ocean-blue)'; // Warna biru buat tebakan bener
                        cellsLeft--;
                        
                        if (cellsLeft === 0) {
                            setTimeout(() => alert("GGWP! 🧠 Lu berhasil mecahin Sudoku-nya!"), 100);
                        }
                    } else {
                        // JAWABAN SALAH
                        lives--;
                        updateLivesDisplay();
                        this.value = ''; // Kosongin lagi
                        
                        // Efek kedip merah pas salah
                        this.style.backgroundColor = 'var(--sakura-pink)';
                        setTimeout(() => { this.style.backgroundColor = 'transparent'; }, 400);

                        // Kalau nyawa abis
                        if (lives <= 0) {
                            setTimeout(() => {
                                alert("Game Over! 💀 Nyawa lu abis.");
                                lockBoard(); // Kunci semua kotak
                            }, 100);
                        }
                    }
                });
            }
            container.appendChild(input);
        }
    }
}

function lockBoard() {
    let inputs = document.querySelectorAll('.sudoku-cell');
    inputs.forEach(input => {
        input.readOnly = true;
        input.classList.add('readonly');
    });
}

// Langsung generate board pas pertama kali halaman dibuka
window.onload = () => { 
    if(typeof checkAuth === 'function') checkAuth(); 
    generateSudoku(); 
};