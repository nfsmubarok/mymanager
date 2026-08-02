const dinoEl = document.getElementById("dino");
const obsEl = document.getElementById("obstacle");
const gameOverDiv = document.getElementById("game-over-modal");

let obsTypes = [
    { icon: '🌵', bottom: 0 },
    { icon: '🦅', bottom: 40 }, // Burung terbang (harus nunduk / diemin aja)
    { icon: '🪨', bottom: 0 }
];

let obsX = 600, dinoY = 0, gameScore = 0, gameSpeed = 5, gameActive = false, jumping = false, currentObs = obsTypes[0];

window.jump = function() {
    if (!jumping && gameActive) {
        jumping = true; dinoEl.classList.add("jump");
        setTimeout(() => { dinoEl.classList.remove("jump"); jumping = false; }, 500);
    }
}

document.addEventListener("keydown", function(event) {
    if(event.code === "Space") { event.preventDefault(); if(gameActive) jump(); else startGame(); }
});

window.startGame = function() {
    gameOverDiv.style.display = "none";
    gameActive = true; gameScore = 0; gameSpeed = 5; obsX = 600; jumping = false;
    dinoEl.classList.remove("jump"); document.getElementById('dino-score').innerText = "Score: 0";
    
    currentObs = obsTypes[0]; obsEl.innerText = currentObs.icon; obsEl.style.bottom = currentObs.bottom + 'px';
    updateFrame();
}

function updateFrame() {
    if(!gameActive) return;
    obsX -= gameSpeed;

    if(obsX <= -40) {
        obsX = 600 + Math.random() * 300; gameScore++;
        document.getElementById('dino-score').innerText = "Score: " + gameScore;
        if(gameSpeed < 12) gameSpeed += 0.25;
        currentObs = obsTypes[Math.floor(Math.random() * obsTypes.length)];
        obsEl.innerText = currentObs.icon; obsEl.style.bottom = currentObs.bottom + 'px';
    }
    obsEl.style.left = obsX + "px";

    let dY = parseInt(window.getComputedStyle(dinoEl).getPropertyValue("bottom"));
    let hitX = obsX > 30 && obsX < 90;
    let hitY = currentObs.bottom === 0 ? dY < 30 : dY > 10;

    if (hitX && hitY) {
        gameActive = false; document.getElementById('final-score').innerText = gameScore; gameOverDiv.style.display = 'flex'; return;
    }
    requestAnimationFrame(updateFrame);
}

window.onload = () => { if(typeof checkAuth === 'function') checkAuth(); };