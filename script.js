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

function showSummary() {
    const screens = document.querySelectorAll('.landing-screen, .setup-screen, .scorecard-screen, .summary-screen');
    screens.forEach(screen => screen.style.display = 'none');
    
    document.getElementById('summaryScreen').style.display = 'flex';
    
    // Calculate winner
    const scores = gameState.players.map(player => {
        const totalScore = calculatePlayerTotal(player.name);
        const vsPar = totalScore - gameState.coursePar;
        return { name: player.name, totalScore, vsPar };
    });
    
    scores.sort((a, b) => a.totalScore - b.totalScore);
    const winner = scores[0];
    
    // Render winner banner
    const bannerHTML = `
        <div class="winner-banner">
            <h2>🏆 ${winner.name} Wins!</h2>
            <p>${winner.totalScore} strokes (${formatVsPar(winner.vsPar)})</p>
        </div>
    `;
    
    // Render player summaries
    const cardsHTML = scores.map((player, index) => {
        const strokes = gameState.scores[player.name] || {};
        const holesPlayed = Object.values(strokes).filter(s => s).length;
        
        return `
            <div class="player-summary ${index === 0 ? 'winner' : ''}">
                <h3>${player.name}</h3>
                <div class="stats-grid">
                    <div class="stat">
                        <span class="label">Total</span>
                        <span class="value">${player.totalScore}</span>
                    </div>
                    <div class="stat">
                        <span class="label">vs Par</span>
                        <span class="value ${player.vsPar > 0 ? 'over' : player.vsPar < 0 ? 'under' : ''}">${formatVsPar(player.vsPar)}</span>
                    </div>
                    <div class="stat">
                        <span class="label">Holes</span>
                        <span class="value">${holesPlayed}</span>
                    </div>
                    <div class="stat">
                        <span class="label">Avg</span>
                        <span class="value">${holesPlayed > 0 ? (player.totalScore / holesPlayed).toFixed(1) : '-'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    const actionsHTML = `
        <div class="summary-actions">
            <button class="btn-secondary" onclick="downloadPDF()">📄 Download PDF</button>
            <button class="btn-primary" onclick="resetGame()">New Game</button>
        </div>
    `;
    
    document.getElementById('summaryScreen').innerHTML = bannerHTML + 
        '<div class="summary-cards">' + cardsHTML + '</div>' + actionsHTML;
}

// Add PDF download function
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Get current date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    
    // Title
    doc.setFontSize(20);
    doc.text('Golf Scorecard', 105, 20, { align: 'center' });
    
    // Course info
    doc.setFontSize(12);
    doc.text(`Course: ${gameState.courseName}`, 20, 35);
    doc.text(`Date: ${dateStr}`, 20, 42);
    doc.text(`Time: ${timeStr}`, 20, 49);
    doc.text(`Course Par: ${gameState.coursePar}`, 20, 56);
    
    // Player scores
    let yPos = 70;
    doc.setFontSize(14);
    doc.text('Final Scores', 20, yPos);
    yPos += 10;
    
    // Calculate and sort scores
    const scores = gameState.players.map(player => {
        const totalScore = calculatePlayerTotal(player.name);
        const vsPar = totalScore - gameState.coursePar;
        return { name: player.name, totalScore, vsPar };
    });
    scores.sort((a, b) => a.totalScore - b.totalScore);
    
    // Add player scores to PDF
    doc.setFontSize(12);
    scores.forEach((player, index) => {
        const medal = index === 0 ? '🏆 ' : '';
        doc.text(`${medal}${player.name}: ${player.totalScore} (${formatVsPar(player.vsPar)})`, 20, yPos);
        yPos += 7;
    });
    
    // Hole-by-hole breakdown
    yPos += 10;
    doc.setFontSize(14);
    doc.text('Hole-by-Hole Scores', 20, yPos);
    yPos += 10;
    
    // Create table data
    doc.setFontSize(10);
    
    // Table header
    let xPos = 20;
    doc.text('Player', xPos, yPos);
    xPos += 40;
    
    // Hole numbers
    for (let i = 1; i <= gameState.holes; i++) {
        doc.text(i.toString(), xPos, yPos);
        xPos += 12;
    }
    doc.text('Total', xPos, yPos);
    
    yPos += 7;
    
    // Player scores by hole
    gameState.players.forEach(player => {
        xPos = 20;
        doc.text(player.name, xPos, yPos);
        xPos += 40;
        
        for (let hole = 1; hole <= gameState.holes; hole++) {
            const score = gameState.scores[player.name]?.[hole] || '-';
            doc.text(score.toString(), xPos, yPos);
            xPos += 12;
        }
        
        const total = calculatePlayerTotal(player.name);
        doc.text(total.toString(), xPos, yPos);
        yPos += 7;
    });
    
    // Save the PDF
    doc.save(`golf-scorecard-${gameState.courseName}-${dateStr.replace(/\//g, '-')}.pdf`);
}

// ...existing code...