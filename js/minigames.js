window.generateSudoku = function() {
    // 1. Template Master Sudoku (Valid 100%)
    const base = [
        [1,2,3, 4,5,6, 7,8,9], [4,5,6, 7,8,9, 1,2,3], [7,8,9, 1,2,3, 4,5,6],
        [2,3,4, 5,6,7, 8,9,1], [5,6,7, 8,9,1, 2,3,4], [8,9,1, 2,3,4, 5,6,7],
        [3,4,5, 6,7,8, 9,1,2], [6,7,8, 9,1,2, 3,4,5], [9,1,2, 3,4,5, 6,7,8]
    ];

    // 2. Acak angka 1-9 (Algoritma Mapping Super Ringan)
    const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
    let board = base.map(row => row.map(val => nums[val-1]));

    // 3. Bolongin kotak acak buat dijadiin teka-teki
    let cellsToRemove = 45; // Level Medium. Makin gede angkanya, makin susah
    while(cellsToRemove > 0) {
        let r = Math.floor(Math.random() * 9);
        let c = Math.floor(Math.random() * 9);
        if (board[r][c] !== 0) {
            board[r][c] = 0;
            cellsToRemove--;
        }
    }
    renderBoard(board);
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
            
            // Garis tebal pemisah kotak 3x3
            if (c === 2 || c === 5) input.classList.add('thick-right');
            if (r === 2 || r === 5) input.classList.add('thick-bottom');

            if (val !== 0) {
                input.value = val;
                input.classList.add('readonly');
                input.readOnly = true;
            } else {
                input.addEventListener('input', function() {
                    // Batasin input cuma boleh 1 angka (1-9)
                    if (this.value.length > 1) this.value = this.value.slice(0, 1);
                    if (this.value < 1 || this.value > 9) this.value = '';
                });
            }
            
            input.dataset.r = r;
            input.dataset.c = c;
            container.appendChild(input);
        }
    }
}

window.checkSolution = function() {
    let inputs = document.querySelectorAll('.sudoku-cell');
    let grid = Array.from({length: 9}, () => Array(9).fill(0));
    let allFilled = true;

    // Ambil semua data dari inputan lu
    inputs.forEach(input => {
        let val = parseInt(input.value);
        if (!val) allFilled = false;
        grid[input.dataset.r][input.dataset.c] = val || 0;
    });

    if (!allFilled) {
        alert("Woy, isi semua kotaknya dulu dong!");
        return;
    }

    // 4. Algoritma Validasi Sudoku (O(N^2) tapi instan karena N cuma 9)
    let isValid = true;
    for(let i = 0; i < 9; i++) {
        let row = new Set(), col = new Set(), box = new Set();
        for(let j = 0; j < 9; j++) {
            let rVal = grid[i][j];
            let cVal = grid[j][i];
            
            // Rumus posisi kotak 3x3
            let bVal = grid[3 * Math.floor(i / 3) + Math.floor(j / 3)][3 * (i % 3) + (j % 3)];

            if(rVal && row.has(rVal)) isValid = false; row.add(rVal);
            if(cVal && col.has(cVal)) isValid = false; col.add(cVal);
            if(bVal && box.has(bVal)) isValid = false; box.add(bVal);
        }
    }

    if(isValid) {
        alert("GG! 🧠 Sudoku berhasil dipecahkan!");
    } else {
        alert("Masih ada angka yang bentrok di Baris / Kolom / Kotak 3x3. Coba cek lagi!");
    }
}

// Langsung generate board pas pertama kali halaman dibuka
window.onload = () => { 
    if(typeof checkAuth === 'function') checkAuth(); 
    generateSudoku(); 
};