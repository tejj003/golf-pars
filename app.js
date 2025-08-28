// Type definitions
const generateId = () => Math.random().toString(36).substr(2, 9);

// Default par values
const STANDARD_18_PARS = [4,4,3,4,5,4,3,4,4,4,5,4,3,4,4,5,3,4];
const STANDARD_9_PARS = STANDARD_18_PARS.slice(0, 9);

// Storage keys
const STORAGE_KEYS = {
    currentRound: 'golf.currentRound',
    history: 'golf.history',
    settings: 'golf.settings'
};

// State management
class AppState {
    constructor() {
        this.currentScreen = 'landing';
        this.currentRound = null;
        this.history = [];
        this.settings = {
            theme: 'light'
        };
        this.currentPlayerTab = 0; // Add this to track active player tab
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.currentRound);
            if (saved) {
                this.currentRound = JSON.parse(saved);
                this.currentScreen = 'scorecard';
            }
            
            const history = localStorage.getItem(STORAGE_KEYS.history);
            if (history) {
                this.history = JSON.parse(history);
            }
            
            const settings = localStorage.getItem(STORAGE_KEYS.settings);
            if (settings) {
                this.settings = JSON.parse(settings);
            }
        } catch (e) {
            console.error('Failed to load from storage:', e);
        }
    }

    saveToStorage() {
        try {
            if (this.currentRound) {
                localStorage.setItem(STORAGE_KEYS.currentRound, JSON.stringify(this.currentRound));
            }
            localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(this.history));
            localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(this.settings));
        } catch (e) {
            console.error('Failed to save to storage:', e);
        }
    }

    startNewRound() {
        this.currentRound = {
            holes: 18,
            players: [],
            course: {
                name: '',
                rating: 72.0,
                slope: 113,
                pars: [...STANDARD_18_PARS]
            },
            startedAt: new Date().toISOString()
        };
        this.currentScreen = 'setup';
        this.saveToStorage();
    }

    resetApp() {
        if (confirm('This will erase all saved data on this device. Are you sure?')) {
            localStorage.clear();
            this.currentRound = null;
            this.history = [];
            this.currentScreen = 'landing';
            render();
        }
    }
}

const appState = new AppState();

// Utility functions
const sum = (arr) => arr.reduce((a, b) => a + (b || 0), 0);

const front9Total = (player) => sum(player.strokes.slice(0, 9));

const back9Total = (player) => player.strokes.length > 9 ? sum(player.strokes.slice(9, 18)) : 0;

const total = (player) => sum(player.strokes.filter(s => s !== null));

const vsPar = (player, course) => {
    const playerTotal = total(player);
    const coursePar = sum(course.pars.slice(0, player.strokes.length));
    return playerTotal - coursePar;
};

const handicapDiff = (gross, rating = 72, slope = 113) => {
    const diff = ((gross - rating) * 113) / slope;
    return Math.round(diff * 10) / 10;
};

const estimatedHandicap = (diff) => Math.round(0.96 * diff * 10) / 10;

// Winner calculation with tiebreakers
const calculateWinner = (players, course) => {
    const playerTotals = players.map(p => ({
        player: p,
        gross: total(p),
        back9: back9Total(p),
        last6: sum(p.strokes.slice(-6)),
        last3: sum(p.strokes.slice(-3)),
        hole18: p.strokes[17] || 999
    }));

    playerTotals.sort((a, b) => {
        if (a.gross !== b.gross) return a.gross - b.gross;
        if (a.back9 !== b.back9) return a.back9 - b.back9;
        if (a.last6 !== b.last6) return a.last6 - b.last6;
        if (a.last3 !== b.last3) return a.last3 - b.last3;
        return a.hole18 - b.hole18;
    });

    const winners = playerTotals.filter(pt => pt.gross === playerTotals[0].gross);
    return winners.map(w => w.player);
};

// Add haptic feedback function (for mobile)
const vibrate = (duration = 10) => {
    if ('vibrate' in navigator) {
        navigator.vibrate(duration);
    }
};

// Enhanced UI Components with icons and better visual feedback
const LandingScreen = () => `
    <div class="landing-screen">
        <h1>Golf Ledger</h1>
        <p>Keep score. Offline. On your phone.</p>
        <button class="btn-primary" onclick="appState.startNewRound(); vibrate(); render();">
            Start Round
        </button>
        <button class="btn-secondary" onclick="appState.currentScreen = 'settings'; vibrate(); render();">
            Settings
        </button>
    </div>
`;

const SetupScreen = () => {
    const round = appState.currentRound;
    return `
        <div class="setup-screen">
            <header>
                <h2>Round Setup</h2>
            </header>
            
            <section class="setup-section">
                <h3>Players</h3>
                <div class="players-list">
                    ${round.players.map((player, i) => `
                        <div class="player-item">
                            <input type="text" value="${player.name}" 
                                onchange="updatePlayerName(${i}, this.value)"
                                maxlength="20" placeholder="Player name">
                            <button class="btn-small btn-icon" onclick="removePlayer(${i}); vibrate();">×</button>
                        </div>
                    `).join('')}
                    ${round.players.length === 0 ? '<div class="player-item" style="padding: 20px; color: var(--text-tertiary); text-align: center; font-size: 15px;">Add players to start</div>' : ''}
                </div>
                ${round.players.length < 6 ? 
                    `<button class="btn-secondary" onclick="addPlayer(); vibrate();">
                        Add Player
                    </button>` : ''}
            </section>

            <section class="setup-section">
                <h3>Holes</h3>
                <div class="segmented-control">
                    <button class="${round.holes === 9 ? 'active' : ''}" 
                        onclick="setHoles(9); vibrate();">9 Holes</button>
                    <button class="${round.holes === 18 ? 'active' : ''}" 
                        onclick="setHoles(18); vibrate();">18 Holes</button>
                </div>
            </section>

            <section class="setup-section">
                <details>
                    <summary>Course Settings</summary>
                    <div class="course-settings">
                        <label>
                            Course Name
                            <input type="text" value="${round.course.name || ''}" 
                                onchange="updateCourseName(this.value)"
                                placeholder="Enter course name">
                        </label>
                        <label>
                            Course Rating
                            <input type="number" value="${round.course.rating}" 
                                min="67" max="77" step="0.1"
                                onchange="updateCourseRating(this.value)">
                        </label>
                        <label>
                            Course Slope
                            <input type="number" value="${round.course.slope}" 
                                min="55" max="155" step="1"
                                onchange="updateCourseSlope(this.value)">
                        </label>
                    </div>
                </details>
            </section>

            <section class="setup-section">
                <h3>Par Settings</h3>
                <div class="par-presets" style="display: flex; gap: 8px; margin-bottom: 16px;">
                    <button class="btn-small" style="flex: 1;" onclick="setParsPreset('standard18'); vibrate();">Standard 18</button>
                    <button class="btn-small" style="flex: 1;" onclick="setParsPreset('standard9'); vibrate();">Standard 9</button>
                </div>
                
                <div class="par-grid-container">
                    <div class="par-grid ${round.holes === 18 ? 'par-grid-18' : 'par-grid-9'}">
                        ${round.course.pars.slice(0, round.holes).map((par, i) => `
                            <div class="par-card">
                                <div class="hole-label">Hole ${i + 1}</div>
                                <div class="par-controls">
                                    <button class="par-btn minus" onclick="updatePar(${i}, -1); vibrate();" ${par <= 3 ? 'disabled' : ''}>
                                        <svg width="16" height="2" viewBox="0 0 16 2" fill="currentColor">
                                            <rect width="16" height="2" rx="1"/>
                                        </svg>
                                    </button>
                                    <div class="par-value">Par ${par}</div>
                                    <button class="par-btn plus" onclick="updatePar(${i}, 1); vibrate();" ${par >= 5 ? 'disabled' : ''}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                            <rect x="7" width="2" height="16" rx="1"/>
                                            <rect y="7" width="16" height="2" rx="1"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${round.holes === 18 ? '<div class="par-divider">Front 9 | Back 9</div>' : ''}
                </div>
                
                <div class="course-par-total">
                    <span style="opacity: 0.8;">Total Par</span>
                    <span style="font-size: 24px; font-weight: 700;">${sum(round.course.pars.slice(0, round.holes))}</span>
                </div>
            </section>

            <button class="btn-primary" 
                ${round.players.length === 0 ? 'disabled' : ''}
                onclick="appState.currentScreen = 'scorecard'; vibrate(20); render();">
                Start Playing
            </button>
        </div>
    `;
};

const ScorecardScreen = () => {
    const round = appState.currentRound;
    const coursePar = sum(round.course.pars.slice(0, round.holes));
    const courseName = round.course.name || 'Golf Course';
    
    // Mobile-optimized card-based layout
    return `
        <div class="scorecard-screen">
            <div class="scorecard-header">
                <div class="course-info">
                    <div class="course-name">${courseName}</div>
                    <div class="course-par">Par ${coursePar}</div>
                </div>
                <button class="btn-edit" onclick="appState.currentScreen = 'setup'; vibrate(); render();">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <path d="M12.146 2.146a2 2 0 012.708 0l1 1a2 2 0 010 2.708l-8.5 8.5a2 2 0 01-.708.414l-3.5 1a1 1 0 01-1.228-1.228l1-3.5a2 2 0 01.414-.708l8.5-8.5a2 2 0 01.314-.186zM13.56 3.56L5.414 11.706a.5.5 0 00-.104.177l-.652 2.283 2.283-.652a.5.5 0 00.177-.104L15.264 5.264a.5.5 0 000-.708l-1-1a.5.5 0 00-.704 0z"/>
                    </svg>
                </button>
            </div>
            
            <div class="scorecard-tabs">
                <div class="tabs-header">
                    ${round.players.map((player, index) => `
                        <button class="tab ${index === appState.currentPlayerTab ? 'active' : ''}" 
                            onclick="switchToPlayer(${index}); vibrate();">
                            ${player.name}
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <div class="scorecard-content">
                ${round.players.map((player, playerIndex) => `
                    <div class="player-scorecard" id="player-${playerIndex}" style="${playerIndex === appState.currentPlayerTab ? '' : 'display: none;'}">
                        <div class="score-summary">
                            <div class="summary-item">
                                <span class="label">Total</span>
                                <span class="value">${total(player) || '—'}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">vs Par</span>
                                <span class="value ${vsPar(player, round.course) > 0 ? 'over' : vsPar(player, round.course) < 0 ? 'under' : ''}">
                                    ${total(player) ? (vsPar(player, round.course) > 0 ? '+' : '') + vsPar(player, round.course) : '—'}
                                </span>
                            </div>
                            ${round.holes === 18 ? `
                                <div class="summary-item">
                                    <span class="label">Front</span>
                                    <span class="value">${front9Total(player) || '—'}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Back</span>
                                    <span class="value">${back9Total(player) || '—'}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="holes-grid">
                            ${player.strokes.slice(0, round.holes).map((stroke, holeIndex) => {
                                const holePar = round.course.pars[holeIndex];
                                const diff = stroke ? stroke - holePar : null;
                                const diffClass = diff > 0 ? 'over' : diff < 0 ? 'under' : 'even';
                                const diffText = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : diff === 0 ? 'E' : '';
                                
                                return `
                                    <div class="hole-card ${stroke ? 'filled' : ''}">
                                        <div class="hole-header">
                                            <div class="hole-info">
                                                <span class="hole-number">Hole ${holeIndex + 1}</span>
                                                ${stroke ? `<span class="hole-diff ${diffClass}">${diffText}</span>` : ''}
                                            </div>
                                            <span class="hole-par">Par ${holePar}</span>
                                        </div>
                                        <input type="number" 
                                            class="stroke-input"
                                            value="${stroke || ''}" 
                                            placeholder="—"
                                            min="1" max="15"
                                            inputmode="numeric"
                                            pattern="[0-9]*"
                                            onchange="updateStroke(${playerIndex}, ${holeIndex}, this.value); vibrate();"
                                            onfocus="this.select()">
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="scorecard-footer">
                <button class="btn-primary" 
                    ${!canEndRound() ? 'disabled' : ''}
                    onclick="endRound(); vibrate(30);">
                    End Round
                </button>
                <button class="btn-secondary btn-icon" onclick="appState.currentScreen = 'settings'; vibrate(); render();">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                        <path fill-rule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm6.93 6.588l-1.093.674a6.002 6.002 0 010 2.476l1.093.674a8.038 8.038 0 010-3.824zM15.357 5.643l-.788.943a6.002 6.002 0 01-2.15 1.24l-.135-1.24a8.038 8.038 0 013.073-.943zM11.586 3.07l-.674 1.093a6.002 6.002 0 01-2.476 0L7.762 3.07a8.038 8.038 0 013.824 0zM5.643 4.643l.943.788a6.002 6.002 0 011.24 2.15l-1.24.135a8.038 8.038 0 01-.943-3.073zM3.07 8.414l1.093.674a6.002 6.002 0 010 2.476l-1.093.674a8.038 8.038 0 010-3.824zM4.643 14.357l.788-.943a6.002 6.002 0 012.15-1.24l.135 1.24a8.038 8.038 0 01-3.073.943zM8.414 16.93l.674-1.093a6.002 6.002 0 012.476 0l.674 1.093a8.038 8.038 0 01-3.824 0zm5.943-2.573l-.943-.788a6.002 6.002 0 01-1.24-2.15l1.24-.135a8.038 8.038 0 01.943 3.073z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
};

const SummaryScreen = (roundResult) => {
    const winners = roundResult.winner;
    const winnerNames = winners.map(w => appState.currentRound.players.find(p => p.id === w.playerId).name);
    
    return `
        <div class="summary-screen">
            <div class="winner-banner">
                <h2>🏆 Winner${winners.length > 1 ? 's' : ''}: ${winnerNames.join(', ')}</h2>
                <p>(Lowest Gross)</p>
            </div>
            
            <div class="summary-cards">
                ${appState.currentRound.players.map(player => {
                    const stats = roundResult.totals[player.id];
                    const isWinner = winners.some(w => w.playerId === player.id);
                    return `
                        <div class="player-summary ${isWinner ? 'winner' : ''}">
                            <h3>${isWinner ? '🏆 ' : ''}${player.name}</h3>
                            <div class="stats-grid">
                                <div class="stat">
                                    <span class="label">Gross</span>
                                    <span class="value">${stats.gross}</span>
                                </div>
                                <div class="stat">
                                    <span class="label">±Par</span>
                                    <span class="value ${stats.vsPar > 0 ? 'over' : stats.vsPar < 0 ? 'under' : ''}">
                                        ${stats.vsPar > 0 ? '+' : ''}${stats.vsPar}
                                    </span>
                                </div>
                                ${appState.currentRound.holes === 18 ? `
                                    <div class="stat">
                                        <span class="label">Front 9</span>
                                        <span class="value">${stats.front9}</span>
                                    </div>
                                    <div class="stat">
                                        <span class="label">Back 9</span>
                                        <span class="value">${stats.back9}</span>
                                    </div>
                                ` : ''}
                                ${stats.estHandicapDiff !== undefined ? `
                                    <div class="stat">
                                        <span class="label">Est. HCP <span class="tooltip" title="Estimated from this round; not WHS official.">ⓘ</span></span>
                                        <span class="value">${stats.estHandicapDiff}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="summary-actions">
                <button class="btn-primary" onclick="startNewRoundKeepSettings(); vibrate(20);">
                    ⛳ Start New Round
                </button>
                <button class="btn-secondary" onclick="appState.currentScreen = 'scorecard'; vibrate(); render();">
                    ← Back to Scorecard
                </button>
            </div>
        </div>
    `;
};

const SettingsScreen = () => `
    <div class="settings-screen">
        <header>
            <h2>Settings</h2>
            <button class="btn-small btn-icon" onclick="appState.currentScreen = appState.currentRound ? 'scorecard' : 'landing'; vibrate(); render();">×</button>
        </header>
        
        <section class="settings-section">
            <h3>Theme</h3>
            <div class="segmented-control">
                <button class="${appState.settings.theme === 'light' ? 'active' : ''}" 
                    onclick="setTheme('light'); vibrate();">Light</button>
                <button class="${appState.settings.theme === 'dark' ? 'active' : ''}" 
                    onclick="setTheme('dark'); vibrate();">Dark</button>
            </div>
        </section>
        
        <section class="settings-section">
            <h3>Data Management</h3>
            <button class="btn-danger" onclick="appState.resetApp(); vibrate(50);">Reset All Data</button>
            <p class="hint">This will erase all saved data on this device.</p>
        </section>
        
        <section class="settings-section">
            <h3>Privacy</h3>
            <p class="hint">All data is stored locally on your device. No information is sent to any server.</p>
        </section>
        
        <section class="settings-section">
            <h3>About</h3>
            <p class="hint">Golf Ledger v1.0<br>Keep your golf scores offline, anywhere.</p>
        </section>
    </div>
`;

// Event handlers
const updatePlayerName = (index, name) => {
    const trimmed = name.trim();
    if (trimmed) {
        // Check for duplicates
        const existing = appState.currentRound.players.filter((p, i) => i !== index && p.name === trimmed);
        if (existing.length > 0) {
            appState.currentRound.players[index].name = `${trimmed} ${existing.length + 1}`;
        } else {
            appState.currentRound.players[index].name = trimmed;
        }
        appState.saveToStorage();
    }
};

const addPlayer = () => {
    const baseName = 'Player';
    const existingCount = appState.currentRound.players.filter(p => p.name.startsWith(baseName)).length;
    const name = existingCount > 0 ? `${baseName} ${existingCount + 1}` : baseName;
    
    appState.currentRound.players.push({
        id: generateId(),
        name: name,
        strokes: new Array(appState.currentRound.holes).fill(null)
    });
    appState.saveToStorage();
    render();
};

const removePlayer = (index) => {
    appState.currentRound.players.splice(index, 1);
    appState.saveToStorage();
    render();
};

const setHoles = (holes) => {
    if (appState.currentRound.holes === 18 && holes === 9) {
        if (!confirm('Switching to 9 holes will remove data for holes 10-18. Continue?')) {
            return;
        }
    }
    
    appState.currentRound.holes = holes;
    
    // Adjust player strokes arrays
    appState.currentRound.players.forEach(player => {
        if (holes === 9) {
            player.strokes = player.strokes.slice(0, 9);
        } else if (player.strokes.length < 18) {
            player.strokes = [...player.strokes, ...new Array(18 - player.strokes.length).fill(null)];
        }
    });
    
    // Adjust pars if needed
    if (holes === 9) {
        appState.currentRound.course.pars = appState.currentRound.course.pars.slice(0, 9);
    } else if (appState.currentRound.course.pars.length < 18) {
        appState.currentRound.course.pars = [...STANDARD_18_PARS];
    }
    
    appState.saveToStorage();
    render();
};

const updateCourseName = (name) => {
    appState.currentRound.course.name = name;
    appState.saveToStorage();
};

const updateCourseRating = (rating) => {
    const val = parseFloat(rating);
    if (val >= 67 && val <= 77) {
        appState.currentRound.course.rating = val;
        appState.saveToStorage();
    }
};

const updateCourseSlope = (slope) => {
    const val = parseInt(slope);
    if (val >= 55 && val <= 155) {
        appState.currentRound.course.slope = val;
        appState.saveToStorage();
    }
};

const updatePar = (hole, delta) => {
    const currentPar = appState.currentRound.course.pars[hole];
    const newPar = currentPar + delta;
    if (newPar >= 3 && newPar <= 5) {
        appState.currentRound.course.pars[hole] = newPar;
        appState.saveToStorage();
        render();
    }
};

const setParsPreset = (preset) => {
    if (preset === 'standard18') {
        appState.currentRound.course.pars = [...STANDARD_18_PARS];
    } else if (preset === 'standard9') {
        appState.currentRound.course.pars = [...STANDARD_9_PARS];
    }
    appState.saveToStorage();
    render();
};

const updateStroke = (playerIndex, holeIndex, value) => {
    const val = value ? parseInt(value) : null;
    if (val === null || (val >= 1 && val <= 15)) {
        appState.currentRound.players[playerIndex].strokes[holeIndex] = val;
        appState.saveToStorage();
        
        // Re-render but maintain current player tab
        render();
        
        // After render, restore focus to next input if possible
        setTimeout(() => {
            const nextHole = holeIndex + 1;
            if (nextHole < appState.currentRound.holes) {
                const nextInput = document.querySelector(`#player-${playerIndex} .holes-grid > div:nth-child(${nextHole + 1}) input`);
                if (nextInput) {
                    nextInput.focus();
                }
            }
        }, 10);
    }
};

const canEndRound = () => {
    return appState.currentRound.players.every(player => 
        player.strokes.slice(0, appState.currentRound.holes).every(stroke => stroke !== null)
    );
};

const endRound = () => {
    if (!canEndRound()) return;
    
    const round = appState.currentRound;
    const totals = {};
    
    round.players.forEach(player => {
        const gross = total(player);
        const diff = handicapDiff(gross, round.course.rating, round.course.slope);
        
        totals[player.id] = {
            gross: gross,
            vsPar: vsPar(player, round.course),
            front9: front9Total(player),
            back9: back9Total(player),
            estHandicapDiff: estimatedHandicap(diff)
        };
    });
    
    const winners = calculateWinner(round.players, round.course);
    
    const result = {
        id: generateId(),
        round: round,
        finishedAt: new Date().toISOString(),
        totals: totals,
        winner: winners.map(w => ({ playerId: w.id }))
    };
    
    // Save to history
    appState.history.push(result);
    appState.saveToStorage();
    
    // Show summary
    appState.currentScreen = 'summary';
    appState.lastRoundResult = result;
    render();
};

const startNewRoundKeepSettings = () => {
    const oldRound = appState.currentRound;
    appState.currentRound = {
        holes: oldRound.holes,
        players: oldRound.players.map(p => ({
            id: generateId(),
            name: p.name,
            strokes: new Array(oldRound.holes).fill(null)
        })),
        course: {
            ...oldRound.course,
            pars: [...oldRound.course.pars]
        },
        startedAt: new Date().toISOString()
    };
    appState.currentScreen = 'scorecard';
    appState.saveToStorage();
    render();
};

const setTheme = (theme) => {
    appState.settings.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    appState.saveToStorage();
    render();
};

// Main render function
const render = () => {
    const app = document.getElementById('app');
    
    switch (appState.currentScreen) {
        case 'landing':
            app.innerHTML = LandingScreen();
            break;
        case 'setup':
            app.innerHTML = SetupScreen();
            break;
        case 'scorecard':
            app.innerHTML = ScorecardScreen();
            break;
        case 'summary':
            app.innerHTML = SummaryScreen(appState.lastRoundResult);
            break;
        case 'settings':
            app.innerHTML = SettingsScreen();
            break;
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('App starting...'); // Debug log
    
    try {
        // Apply saved theme
        document.documentElement.setAttribute('data-theme', appState.settings.theme);
        
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(e => console.log('SW registration failed:', e));
        }
        
        // Initial render
        render();
        console.log('App rendered successfully'); // Debug log
    } catch (error) {
        console.error('Error during initialization:', error);
        // Fallback UI
        document.getElementById('app').innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h2>Error Loading App</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()">Reload</button>
            </div>
        `;
    }
});

// Update helper function to save current tab
window.switchToPlayer = (index) => {
    appState.currentPlayerTab = index; // Save the current tab
    document.querySelectorAll('.player-scorecard').forEach((el, i) => {
        el.style.display = i === index ? 'block' : 'none';
    });
    document.querySelectorAll('.tab').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });
};
