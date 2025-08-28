// ...existing code...

function showScorecard() {
    // ...existing code...

    // Update footer based on completion - but don't disable End Game
    const finishBtn = document.querySelector('.scorecard-footer .btn-primary');
    const endBtn = document.querySelector('.scorecard-footer .btn-danger');
    
    if (isComplete) {
        finishBtn.textContent = 'View Summary';
        finishBtn.onclick = showSummary;
    } else {
        finishBtn.textContent = 'Finish Game';
        finishBtn.onclick = showSummary;
        finishBtn.disabled = true;
    }
    
    // End Game button is always enabled - removed the disabled line
    endBtn.onclick = () => {
        if (confirm('Are you sure you want to end the game? All progress will be lost.')) {
            resetGame();
        }
    };

    // ...existing code...
}

// ...existing code...