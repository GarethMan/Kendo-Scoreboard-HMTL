class KendoScoreboard {
    constructor(config) {
        this.positions = config.positions;
        this.matchTypeLabel = config.matchTypeLabel || 'Team';
        this.csvPrefix = config.csvPrefix || 'kendo-match';
        this.storageKey = config.storageKey || 'kendo-team';
        this.activeMatchIndex = 0;

        this.state = {
            matches: this.positions.map(() => ({
                timer: {
                    minutes: 5,
                    seconds: 0,
                    isRunning: false,
                    intervalId: null,
                    originalMinutes: 5,
                    originalSeconds: 0
                },
                red: { ippons: [], hansoku: 0 },
                white: { ippons: [], hansoku: 0 },
                whiteName: '',
                redName: '',
                result: null,
                winType: null,
                history: []
            })),
            daihyosha: {
                active: false,
                timer: {
                    minutes: 5,
                    seconds: 0,
                    isRunning: false,
                    intervalId: null,
                    originalMinutes: 5,
                    originalSeconds: 0
                },
                red: { ippons: [], hansoku: 0 },
                white: { ippons: [], hansoku: 0 },
                whiteName: 'White Representative',
                redName: 'Red Representative',
                result: null,
                winType: null,
                history: []
            }
        };

        this.dom = {
            timerDisplay: document.getElementById('timer-display'),
            btnStartStop: document.getElementById('btn-start-stop'),
            btnEndMatch: document.getElementById('btn-end-match'),
            btnDaihyosha: document.getElementById('btn-daihyosha'),
            btnReset: document.getElementById('btn-reset'),
            btnResetAll: document.getElementById('btn-reset-all'),
            btnEditTime: document.getElementById('btn-edit-time'),
            modal: document.getElementById('time-modal'),
            inputMinutes: document.getElementById('input-minutes'),
            inputSeconds: document.getElementById('input-seconds'),
            btnSaveTime: document.getElementById('btn-save-time'),
            btnCancelTime: document.getElementById('btn-cancel-time'),
            rowsContainer: document.getElementById('rows-container'),
            whiteSummary: document.getElementById('white-summary'),
            redSummary: document.getElementById('red-summary'),
            winnerAnnouncement: document.getElementById('winner-announcement'),
            daihyoshaRow: document.getElementById('daihyosha-row')
        };

        this.init();
    }

    init() {
        this.restoreState();
        this.renderRows();
        this.updateActiveRowUI();
        this.updateTimerDisplay();
        this.updateSummary();
        this.setupEventListeners();

        // Restore daihyosha visibility if it was active
        if (this.state.daihyosha.active && this.dom.daihyoshaRow) {
            this.dom.daihyoshaRow.classList.remove('hidden');
            this.renderDaihyoshaScores();
            // Restore daihyosha names
            const whiteRepInput = this.dom.daihyoshaRow.querySelector('input[aria-label="White Player Representative"]');
            const redRepInput = this.dom.daihyoshaRow.querySelector('input[aria-label="Red Player Representative"]');
            if (whiteRepInput) whiteRepInput.value = this.state.daihyosha.whiteName;
            if (redRepInput) redRepInput.value = this.state.daihyosha.redName;
        }

        // Restore team names from localStorage
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.whiteTeamName) {
                    const whiteTeamInput = document.querySelector('input[aria-label="White Team Name"]');
                    if (whiteTeamInput) whiteTeamInput.value = parsed.whiteTeamName;
                }
                if (parsed.redTeamName) {
                    const redTeamInput = document.querySelector('input[aria-label="Red Team Name"]');
                    if (redTeamInput) redTeamInput.value = parsed.redTeamName;
                }
            } catch (e) { /* ignore parse errors */ }
        }

        // Listen for team name changes
        const whiteTeamInput = document.querySelector('input[aria-label="White Team Name"]');
        const redTeamInput = document.querySelector('input[aria-label="Red Team Name"]');
        if (whiteTeamInput) whiteTeamInput.addEventListener('input', () => this.persistState());
        if (redTeamInput) redTeamInput.addEventListener('input', () => this.persistState());
    }

    renderRows() {
        this.dom.rowsContainer.innerHTML = '';
        this.positions.forEach((pos, index) => {
            const match = this.state.matches[index];
            const row = document.createElement('div');
            row.className = `match-row ${index === this.activeMatchIndex ? 'active' : ''}`;
            row.dataset.index = index;
            row.addEventListener('click', () => this.setActiveMatch(index));

            let resultMark = '';
            if (match.result === 'draw') {
                resultMark = '<div class="mark-hikiwaki">×</div>';
            }

            const whiteName = match.whiteName || `Player ${index + 1}`;
            const redName = match.redName || `Player ${index + 1}`;

            row.innerHTML = `
                <div class="cell order-cell">${pos}</div>
                <div class="cell name-cell">
                    <input type="text" value="${whiteName}" class="name-input" aria-label="White Player ${pos}">
                </div>
                <div class="cell score-cell" id="white-score-${index}">
                    <div class="ippon-container" id="white-ippon-${index}"></div>
                    <div class="hansoku-container" id="white-hansoku-${index}"></div>
                </div>
                <div class="cell result-cell">${resultMark}</div>
                <div class="cell score-cell" id="red-score-${index}">
                    <div class="ippon-container" id="red-ippon-${index}"></div>
                    <div class="hansoku-container" id="red-hansoku-${index}"></div>
                </div>
                <div class="cell name-cell">
                    <input type="text" value="${redName}" class="name-input" aria-label="Red Player ${pos}">
                </div>
                <div class="cell order-cell">${pos}</div>
            `;
            this.dom.rowsContainer.appendChild(row);

            // Attach input listeners to sync names back to state
            const whiteInput = row.querySelector(`input[aria-label="White Player ${pos}"]`);
            const redInput = row.querySelector(`input[aria-label="Red Player ${pos}"]`);
            if (whiteInput) {
                whiteInput.addEventListener('input', () => {
                    match.whiteName = whiteInput.value;
                    this.persistState();
                });
            }
            if (redInput) {
                redInput.addEventListener('input', () => {
                    match.redName = redInput.value;
                    this.persistState();
                });
            }

            this.renderMatchScores(index);
        });
    }

    setActiveMatch(index) {
        if (this.activeMatchIndex !== index) {
            this.stopTimer();
            this.activeMatchIndex = index;
            this.updateActiveRowUI();
            this.updateTimerDisplay();
        }
    }

    updateActiveRowUI() {
        const rows = this.dom.rowsContainer.querySelectorAll('.match-row');
        rows.forEach((row, idx) => {
            if (idx === this.activeMatchIndex) {
                row.classList.add('active');
            } else {
                row.classList.remove('active');
            }
        });

        // Handle daihyosha row
        if (this.dom.daihyoshaRow) {
            if (this.activeMatchIndex === 'rep') {
                this.dom.daihyoshaRow.classList.add('active');
            } else {
                this.dom.daihyoshaRow.classList.remove('active');
            }
        }
    }

    setupEventListeners() {
        this.dom.btnStartStop.addEventListener('click', () => this.toggleTimer());
        this.dom.btnEndMatch.addEventListener('click', () => this.endMatch());
        this.dom.btnDaihyosha.addEventListener('click', () => this.startDaihyosha());
        this.dom.btnReset.addEventListener('click', () => this.resetMatch());
        this.dom.btnResetAll.addEventListener('click', () => this.resetAllMatches());
        this.dom.btnEditTime.addEventListener('click', () => this.openTimeModal());

        this.dom.btnSaveTime.addEventListener('click', () => this.saveTime());
        this.dom.btnCancelTime.addEventListener('click', () => this.closeTimeModal());

        document.querySelectorAll('.btn-score').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = e.target.dataset.player;
                const type = e.target.dataset.type;
                this.addIppon(player, type);
            });
        });

        document.querySelectorAll('.btn-penalty').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = e.target.dataset.player;
                this.addHansoku(player);
            });
        });

        document.querySelectorAll('.btn-fusen').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = e.target.dataset.player;
                this.addFusen(player);
            });
        });

        document.querySelectorAll('.btn-undo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = e.target.dataset.player;
                this.undoLastAction();
            });
        });

        document.getElementById('btn-download').addEventListener('click', () => {
            this.downloadResults();
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (e.code === 'Space') {
                e.preventDefault();
                this.toggleTimer();
            }
        });

        // Issue 4: Daihyosha click listener set up once here, with guard
        if (this.dom.daihyoshaRow) {
            this.dom.daihyoshaRow.addEventListener('click', () => {
                if (!this.state.daihyosha.active) return;
                this.stopTimer();
                this.activeMatchIndex = 'rep';
                this.updateActiveRowUI();
                this.updateTimerDisplay();
            });

            // Listen for daihyosha name changes
            const whiteRepInput = this.dom.daihyoshaRow.querySelector('input[aria-label="White Player Representative"]');
            const redRepInput = this.dom.daihyoshaRow.querySelector('input[aria-label="Red Player Representative"]');
            if (whiteRepInput) {
                whiteRepInput.addEventListener('input', () => {
                    this.state.daihyosha.whiteName = whiteRepInput.value;
                    this.persistState();
                });
            }
            if (redRepInput) {
                redRepInput.addEventListener('input', () => {
                    this.state.daihyosha.redName = redRepInput.value;
                    this.persistState();
                });
            }
        }
    }

    startDaihyosha() {
        this.state.daihyosha.active = true;
        this.dom.daihyoshaRow.classList.remove('hidden');
        this.dom.daihyoshaRow.classList.add('active');

        // Clear winner announcement
        this.dom.winnerAnnouncement.textContent = '';

        // Activate the daihyosha row
        this.activeMatchIndex = 'rep';
        this.updateActiveRowUI();
        this.updateTimerDisplay();
        this.persistState();
    }

    renderDaihyoshaScores() {
        const match = this.state.daihyosha;
        this.renderPlayerScore('rep', 'red', match.red, match.result === 'red', match.winType);
        this.renderPlayerScore('rep', 'white', match.white, match.result === 'white', match.winType);
    }

    getCurrentMatch() {
        if (this.activeMatchIndex === 'rep') {
            return this.state.daihyosha;
        }
        return this.state.matches[this.activeMatchIndex];
    }

    toggleTimer() {
        const match = this.getCurrentMatch();
        if (match.timer.isRunning) {
            this.stopTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        const match = this.getCurrentMatch();
        if (match.timer.minutes === 0 && match.timer.seconds === 0) return;

        match.timer.isRunning = true;
        this.dom.btnStartStop.textContent = 'Stop';
        this.dom.btnStartStop.style.backgroundColor = '#c0392b';

        match.timer.intervalId = setInterval(() => {
            this.tick();
        }, 1000);
    }

    stopTimer() {
        const match = this.getCurrentMatch();
        match.timer.isRunning = false;
        this.dom.btnStartStop.textContent = 'Start';
        this.dom.btnStartStop.style.backgroundColor = '';
        if (match.timer.intervalId) clearInterval(match.timer.intervalId);
    }

    tick() {
        const match = this.getCurrentMatch();
        if (match.timer.seconds > 0) {
            match.timer.seconds--;
        } else {
            if (match.timer.minutes > 0) {
                match.timer.minutes--;
                match.timer.seconds = 59;
            } else {
                this.stopTimer();
            }
        }
        this.updateTimerDisplay();
        this.persistState();
    }

    updateTimerDisplay() {
        const match = this.getCurrentMatch();
        const m = String(match.timer.minutes).padStart(2, '0');
        const s = String(match.timer.seconds).padStart(2, '0');
        this.dom.timerDisplay.textContent = `${m}:${s}`;
    }

    resetMatch() {
        this.stopTimer();
        const match = this.getCurrentMatch();
        match.timer.minutes = match.timer.originalMinutes;
        match.timer.seconds = match.timer.originalSeconds;
        match.red = { ippons: [], hansoku: 0 };
        match.white = { ippons: [], hansoku: 0 };
        match.result = null;
        match.winType = null;
        match.history = [];
        this.updateTimerDisplay();

        if (this.activeMatchIndex === 'rep') {
            this.renderDaihyoshaScores();
        } else {
            this.renderRows();
        }
        this.updateSummary();
        this.persistState();
    }

    resetAllMatches() {
        if (!confirm('Are you sure you want to reset all matches?')) return;

        this.stopTimer();
        this.state.matches.forEach((match) => {
            match.timer.minutes = match.timer.originalMinutes;
            match.timer.seconds = match.timer.originalSeconds;
            match.red = { ippons: [], hansoku: 0 };
            match.white = { ippons: [], hansoku: 0 };
            match.result = null;
            match.winType = null;
            match.history = [];
        });

        // Reset and hide daihyosha
        const daihyosha = this.state.daihyosha;
        daihyosha.active = false;
        daihyosha.timer.minutes = daihyosha.timer.originalMinutes;
        daihyosha.timer.seconds = daihyosha.timer.originalSeconds;
        daihyosha.red = { ippons: [], hansoku: 0 };
        daihyosha.white = { ippons: [], hansoku: 0 };
        daihyosha.result = null;
        daihyosha.winType = null;
        daihyosha.history = [];

        // Hide the daihyosha row
        if (this.dom.daihyoshaRow) {
            this.dom.daihyoshaRow.classList.add('hidden');
            this.dom.daihyoshaRow.classList.remove('active');
        }

        // Reset to first match
        this.activeMatchIndex = 0;

        this.renderRows();
        this.updateTimerDisplay();
        this.updateSummary();
        localStorage.removeItem(this.storageKey);
    }

    openTimeModal() {
        this.stopTimer();
        const match = this.getCurrentMatch();
        this.dom.inputMinutes.value = match.timer.minutes;
        this.dom.inputSeconds.value = String(match.timer.seconds).padStart(2, '0');
        this.dom.modal.classList.remove('hidden');
    }

    closeTimeModal() {
        this.dom.modal.classList.add('hidden');
    }

    saveTime() {
        const match = this.getCurrentMatch();
        let m = parseInt(this.dom.inputMinutes.value) || 0;
        let s = parseInt(this.dom.inputSeconds.value) || 0;
        // Issue 7: Clamp seconds 0-59, minutes >= 0
        if (m < 0) m = 0;
        if (s < 0) s = 0;
        if (s > 59) s = 59;
        match.timer.minutes = m;
        match.timer.seconds = s;
        match.timer.originalMinutes = m;
        match.timer.originalSeconds = s;
        this.updateTimerDisplay();
        this.closeTimeModal();
        this.persistState();
    }

    saveState() {
        const match = this.getCurrentMatch();
        const stateCopy = JSON.parse(JSON.stringify({
            red: match.red,
            white: match.white,
            result: match.result,
            winType: match.winType
        }));
        match.history.push(stateCopy);
        if (match.history.length > 20) match.history.shift();
    }

    undoLastAction() {
        const match = this.getCurrentMatch();
        if (match.history.length === 0) return;
        const previousState = match.history.pop();
        match.red = previousState.red;
        match.white = previousState.white;
        match.result = previousState.result;
        match.winType = previousState.winType;

        if (this.activeMatchIndex === 'rep') {
            this.renderDaihyoshaScores();
        } else {
            this.renderRows();
        }
        this.updateSummary();
        this.persistState();
    }

    addIppon(player, type) {
        const match = this.getCurrentMatch();
        // Issue 2: Block scoring after match ended
        if (match.result) return;
        if (match[player].ippons.length >= 2) return;

        this.saveState();
        match[player].ippons.push(type);
        this.renderMatchScores(this.activeMatchIndex);

        if (match[player].ippons.length === 2) {
            this.stopTimer();
        }
        this.persistState();
    }

    addHansoku(player) {
        const match = this.getCurrentMatch();
        // Issue 2: Block scoring after match ended
        if (match.result) return;

        this.saveState();
        match[player].hansoku++;

        if (match[player].hansoku % 2 === 0) {
            const opponent = player === 'red' ? 'white' : 'red';
            if (match[opponent].ippons.length < 2) {
                match[opponent].ippons.push('H');
                if (match[opponent].ippons.length === 2) {
                    this.stopTimer();
                }
            }
        }

        this.renderMatchScores(this.activeMatchIndex);
        this.persistState();
    }

    addFusen(player) {
        const match = this.getCurrentMatch();
        // Issue 2: Block scoring after match ended
        if (match.result) return;
        // Issue 5: Block double fusen — if opponent already has fusen
        const opponent = player === 'red' ? 'white' : 'red';
        if (match[opponent].ippons.includes('')) return;

        this.saveState();

        match[player].ippons = ['', ''];

        this.stopTimer();
        this.renderMatchScores(this.activeMatchIndex);
        this.persistState();
    }

    endMatch() {
        const match = this.getCurrentMatch();
        this.stopTimer();
        this.saveState();

        const redScore = match.red.ippons.length;
        const whiteScore = match.white.ippons.length;

        if (redScore > whiteScore) {
            match.result = 'red';
            if (match.red.ippons.includes('')) {
                match.winType = 'fusen-gachi';
            } else {
                match.winType = redScore === 1 ? 'ippon-gachi' : 'nihon-gachi';
            }
        } else if (whiteScore > redScore) {
            match.result = 'white';
            if (match.white.ippons.includes('')) {
                match.winType = 'fusen-gachi';
            } else {
                match.winType = whiteScore === 1 ? 'ippon-gachi' : 'nihon-gachi';
            }
        } else {
            match.result = 'draw';
            match.winType = 'hikiwaki';
        }

        // If this is daihyosha, display the winner immediately
        if (this.activeMatchIndex === 'rep') {
            this.renderDaihyoshaScores();
            const whiteTeamName = document.querySelector('input[aria-label="White Team Name"]')?.value || 'WHITE TEAM';
            const redTeamName = document.querySelector('input[aria-label="Red Team Name"]')?.value || 'RED TEAM';

            if (match.result === 'white') {
                this.dom.winnerAnnouncement.textContent = `Winner: ${whiteTeamName}`;
            } else if (match.result === 'red') {
                this.dom.winnerAnnouncement.textContent = `Winner: ${redTeamName}`;
            } else {
                this.dom.winnerAnnouncement.textContent = 'DRAW - HIKIWAKI';
            }
        } else {
            this.renderRows();
            this.updateSummary();

            if (this.activeMatchIndex < this.positions.length - 1) {
                this.setActiveMatch(this.activeMatchIndex + 1);
            }
        }
        this.persistState();
    }

    updateSummary() {
        let redWins = 0;
        let whiteWins = 0;
        let redPoints = 0;
        let whitePoints = 0;

        this.state.matches.forEach(match => {
            if (match.result === 'red') redWins++;
            if (match.result === 'white') whiteWins++;
            redPoints += match.red.ippons.length;
            whitePoints += match.white.ippons.length;
        });

        this.dom.whiteSummary.textContent = `Wins: ${whiteWins} | Pts: ${whitePoints}`;
        this.dom.redSummary.textContent = `Wins: ${redWins} | Pts: ${redPoints}`;

        this.updateWinner(redWins, whiteWins, redPoints, whitePoints);
    }

    updateWinner(redWins, whiteWins, redPoints, whitePoints) {
        const allMatchesEnded = this.state.matches.every(match => match.result !== null);

        if (!allMatchesEnded) {
            this.dom.winnerAnnouncement.textContent = '';
            return;
        }

        const whiteTeamName = document.querySelector('input[aria-label="White Team Name"]').value || 'WHITE TEAM';
        const redTeamName = document.querySelector('input[aria-label="Red Team Name"]').value || 'RED TEAM';

        let winner = '';
        if (whiteWins > redWins) {
            winner = `Winner: ${whiteTeamName}`;
        } else if (redWins > whiteWins) {
            winner = `Winner: ${redTeamName}`;
        } else {
            if (whitePoints > redPoints) {
                winner = `Winner: ${whiteTeamName}`;
            } else if (redPoints > whitePoints) {
                winner = `Winner: ${redTeamName}`;
            } else {
                winner = 'DRAW - HIKIWAKI';
            }
        }

        this.dom.winnerAnnouncement.textContent = winner;
    }

    renderMatchScores(index) {
        if (index === 'rep') {
            this.renderDaihyoshaScores();
            return;
        }
        const match = this.state.matches[index];
        this.renderPlayerScore(index, 'red', match.red, match.result === 'red', match.winType);
        this.renderPlayerScore(index, 'white', match.white, match.result === 'white', match.winType);
    }

    renderPlayerScore(index, player, playerData, isWinner, winType) {
        const ipponContainer = document.getElementById(`${player}-ippon-${index}`);
        if (!ipponContainer) return;
        ipponContainer.innerHTML = '';

        // For red team, we'll build marks in an array and reverse at the end
        const marks = [];

        // Always render actual points first
        playerData.ippons.forEach(type => {
            const mark = document.createElement('div');
            mark.className = 'mark-ippon';
            mark.textContent = type;
            marks.push(mark);
        });

        // If winner by 1 point (Ippon-gachi), append Boxed 1
        if (isWinner && winType === 'ippon-gachi') {
            const mark = document.createElement('div');
            mark.className = 'mark-ippon-gachi';
            mark.textContent = '1';
            marks.push(mark);
        }

        // For red team, reverse the order so points flow right-to-left
        if (player === 'red') {
            marks.reverse();
        }

        // Append all marks to container
        marks.forEach(mark => ipponContainer.appendChild(mark));

        const hansokuContainer = document.getElementById(`${player}-hansoku-${index}`);
        if (!hansokuContainer) return;
        hansokuContainer.innerHTML = '';

        const displayCount = playerData.hansoku % 2;
        for (let i = 0; i < displayCount; i++) {
            const mark = document.createElement('div');
            mark.className = 'mark-hansoku';
            mark.textContent = '▲';
            hansokuContainer.appendChild(mark);
        }
    }

    calculateSummary() {
        let redWins = 0;
        let whiteWins = 0;
        let redPoints = 0;
        let whitePoints = 0;

        this.state.matches.forEach(match => {
            if (match.result === 'red') redWins++;
            if (match.result === 'white') whiteWins++;
            redPoints += match.red.ippons.length;
            whitePoints += match.white.ippons.length;
        });

        return { redWins, whiteWins, redPoints, whitePoints };
    }

    downloadResults() {
        const whiteTeamInput = document.querySelector('input[aria-label="White Team Name"]');
        const redTeamInput = document.querySelector('input[aria-label="Red Team Name"]');
        const whiteTeamName = whiteTeamInput ? whiteTeamInput.value : 'WHITE TEAM';
        const redTeamName = redTeamInput ? redTeamInput.value : 'RED TEAM';

        const date = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString();

        let csvContent = "Date,Time,Match Type,White Team,Red Team,Position,White Player,White Points,White Score,Red Score,Red Points,Red Player,Result,Win Type\n";

        this.positions.forEach((pos, index) => {
            const match = this.state.matches[index];

            // Issue 1: Read names from state instead of DOM
            const whitePlayerName = match.whiteName || `Player ${index + 1}`;
            const redPlayerName = match.redName || `Player ${index + 1}`;

            const whitePoints = match.white.ippons.join(' ') || '';
            const redPoints = match.red.ippons.join(' ') || '';
            const whiteScore = match.white.ippons.length;
            const redScore = match.red.ippons.length;

            let result = match.result || 'Pending';
            let winType = match.winType || '';

            // Escape CSV fields
            const safeWhiteTeam = `"${whiteTeamName.replace(/"/g, '""')}"`;
            const safeRedTeam = `"${redTeamName.replace(/"/g, '""')}"`;
            const safeWhitePlayer = `"${whitePlayerName.replace(/"/g, '""')}"`;
            const safeRedPlayer = `"${redPlayerName.replace(/"/g, '""')}"`;

            csvContent += `"${date}","${time}","${this.matchTypeLabel}",${safeWhiteTeam},${safeRedTeam},"${pos}",${safeWhitePlayer},"${whitePoints}",${whiteScore},${redScore},"${redPoints}",${safeRedPlayer},"${result}","${winType}"\n`;
        });

        // Issue 6: Append daihyosha row to CSV if active
        if (this.state.daihyosha.active) {
            const d = this.state.daihyosha;
            const whitePlayerName = d.whiteName || 'White Representative';
            const redPlayerName = d.redName || 'Red Representative';
            const whitePoints = d.white.ippons.join(' ') || '';
            const redPoints = d.red.ippons.join(' ') || '';
            const whiteScore = d.white.ippons.length;
            const redScore = d.red.ippons.length;
            const result = d.result || 'Pending';
            const winType = d.winType || '';

            const safeWhiteTeam = `"${whiteTeamName.replace(/"/g, '""')}"`;
            const safeRedTeam = `"${redTeamName.replace(/"/g, '""')}"`;
            const safeWhitePlayer = `"${whitePlayerName.replace(/"/g, '""')}"`;
            const safeRedPlayer = `"${redPlayerName.replace(/"/g, '""')}"`;

            csvContent += `"${date}","${time}","${this.matchTypeLabel}",${safeWhiteTeam},${safeRedTeam},"Daihyosha",${safeWhitePlayer},"${whitePoints}",${whiteScore},${redScore},"${redPoints}",${safeRedPlayer},"${result}","${winType}"\n`;
        }

        // Add Summary Row
        const summary = this.calculateSummary();
        let winner = 'Draw';
        if (summary.whiteWins > summary.redWins) winner = whiteTeamName;
        else if (summary.redWins > summary.whiteWins) winner = redTeamName;
        else if (summary.whitePoints > summary.redPoints) winner = `${whiteTeamName} (Points)`;
        else if (summary.redPoints > summary.whitePoints) winner = `${redTeamName} (Points)`;

        csvContent += `\n"SUMMARY",,,${summary.whiteWins} Wins / ${summary.whitePoints} Pts,,${summary.redWins} Wins / ${summary.redPoints} Pts,,,,,,,"Winner: ${winner.replace(/"/g, '""')}"\n`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.csvPrefix}-${date.replace(/\//g, '-')}-${time.replace(/:/g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Issue 13: Persistence
    persistState() {
        const whiteTeamInput = document.querySelector('input[aria-label="White Team Name"]');
        const redTeamInput = document.querySelector('input[aria-label="Red Team Name"]');

        const data = {
            whiteTeamName: whiteTeamInput ? whiteTeamInput.value : '',
            redTeamName: redTeamInput ? redTeamInput.value : '',
            activeMatchIndex: this.activeMatchIndex,
            matches: this.state.matches.map(m => ({
                timer: {
                    minutes: m.timer.minutes,
                    seconds: m.timer.seconds,
                    originalMinutes: m.timer.originalMinutes,
                    originalSeconds: m.timer.originalSeconds
                },
                red: m.red,
                white: m.white,
                whiteName: m.whiteName,
                redName: m.redName,
                result: m.result,
                winType: m.winType
            })),
            daihyosha: {
                active: this.state.daihyosha.active,
                timer: {
                    minutes: this.state.daihyosha.timer.minutes,
                    seconds: this.state.daihyosha.timer.seconds,
                    originalMinutes: this.state.daihyosha.timer.originalMinutes,
                    originalSeconds: this.state.daihyosha.timer.originalSeconds
                },
                red: this.state.daihyosha.red,
                white: this.state.daihyosha.white,
                whiteName: this.state.daihyosha.whiteName,
                redName: this.state.daihyosha.redName,
                result: this.state.daihyosha.result,
                winType: this.state.daihyosha.winType
            }
        };

        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    restoreState() {
        const saved = localStorage.getItem(this.storageKey);
        if (!saved) return;

        try {
            const data = JSON.parse(saved);

            if (data.activeMatchIndex !== undefined) {
                this.activeMatchIndex = data.activeMatchIndex;
            }

            if (data.matches && data.matches.length === this.state.matches.length) {
                data.matches.forEach((savedMatch, i) => {
                    const match = this.state.matches[i];
                    if (savedMatch.timer) {
                        match.timer.minutes = savedMatch.timer.minutes;
                        match.timer.seconds = savedMatch.timer.seconds;
                        match.timer.originalMinutes = savedMatch.timer.originalMinutes;
                        match.timer.originalSeconds = savedMatch.timer.originalSeconds;
                    }
                    if (savedMatch.red) match.red = savedMatch.red;
                    if (savedMatch.white) match.white = savedMatch.white;
                    match.whiteName = savedMatch.whiteName || '';
                    match.redName = savedMatch.redName || '';
                    match.result = savedMatch.result;
                    match.winType = savedMatch.winType;
                });
            }

            if (data.daihyosha) {
                const d = this.state.daihyosha;
                d.active = data.daihyosha.active || false;
                if (data.daihyosha.timer) {
                    d.timer.minutes = data.daihyosha.timer.minutes;
                    d.timer.seconds = data.daihyosha.timer.seconds;
                    d.timer.originalMinutes = data.daihyosha.timer.originalMinutes;
                    d.timer.originalSeconds = data.daihyosha.timer.originalSeconds;
                }
                if (data.daihyosha.red) d.red = data.daihyosha.red;
                if (data.daihyosha.white) d.white = data.daihyosha.white;
                d.whiteName = data.daihyosha.whiteName || 'White Representative';
                d.redName = data.daihyosha.redName || 'Red Representative';
                d.result = data.daihyosha.result;
                d.winType = data.daihyosha.winType;
            }
        } catch (e) {
            // If parsing fails, start fresh
        }
    }
}
