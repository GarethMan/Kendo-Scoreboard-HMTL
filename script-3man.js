class KendoScoreboard {
    constructor() {
        this.positions = ['Senpo', 'Chuken', 'Taisho'];
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
        this.renderRows();
        this.updateActiveRowUI();
        this.updateTimerDisplay();
        this.updateSummary();
        this.setupEventListeners();
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

            row.innerHTML = `
                <div class="cell order-cell">${pos}</div>
                <div class="cell name-cell">
                    <input type="text" value="Player ${index + 1}" class="name-input" aria-label="White Player ${pos}">
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
                    <input type="text" value="Player ${index + 1}" class="name-input" aria-label="Red Player ${pos}">
                </div>
                <div class="cell order-cell">${pos}</div>
            `;
            this.dom.rowsContainer.appendChild(row);
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

        document.querySelectorAll('.btn-undo').forEach(btn => {
            btn.addEventListener('click', (e) => {
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
    }

    resetAllMatches() {
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
        const m = parseInt(this.dom.inputMinutes.value) || 0;
        const s = parseInt(this.dom.inputSeconds.value) || 0;
        match.timer.minutes = m;
        match.timer.seconds = s;
        match.timer.originalMinutes = m;
        match.timer.originalSeconds = s;
        this.updateTimerDisplay();
        this.closeTimeModal();
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
    }

    addIppon(player, type) {
        const match = this.getCurrentMatch();
        if (match[player].ippons.length >= 2) return;

        this.saveState();
        match[player].ippons.push(type);
        this.renderMatchScores(this.activeMatchIndex);

        if (match[player].ippons.length === 2) {
            this.stopTimer();
        }
    }

    addHansoku(player) {
        const match = this.getCurrentMatch();
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
    }

    endMatch() {
        const match = this.getCurrentMatch();
        this.stopTimer();
        this.saveState();

        const redScore = match.red.ippons.length;
        const whiteScore = match.white.ippons.length;

        if (redScore > whiteScore) {
            match.result = 'red';
            match.winType = redScore === 1 ? 'ippon-gachi' : 'nihon-gachi';
        } else if (whiteScore > redScore) {
            match.result = 'white';
            match.winType = whiteScore === 1 ? 'ippon-gachi' : 'nihon-gachi';
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

        const marks = [];

        playerData.ippons.forEach(type => {
            const mark = document.createElement('div');
            mark.className = 'mark-ippon';
            mark.textContent = type;
            marks.push(mark);
        });

        if (isWinner && winType === 'ippon-gachi') {
            const mark = document.createElement('div');
            mark.className = 'mark-ippon-gachi';
            mark.textContent = '1';
            marks.push(mark);
        }

        if (player === 'red') {
            marks.reverse();
        }

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
            const whitePlayerInput = document.querySelector(`input[aria-label="White Player ${pos}"]`);
            const redPlayerInput = document.querySelector(`input[aria-label="Red Player ${pos}"]`);

            const whitePlayerName = whitePlayerInput ? whitePlayerInput.value : `Player ${index + 1}`;
            const redPlayerName = redPlayerInput ? redPlayerInput.value : `Player ${index + 1}`;

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

            csvContent += `"${date}","${time}","3-Man Team",${safeWhiteTeam},${safeRedTeam},"${pos}",${safeWhitePlayer},"${whitePoints}",${whiteScore},${redScore},"${redPoints}",${safeRedPlayer},"${result}","${winType}"\n`;
        });

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
        a.download = `kendo-3man-match-${date.replace(/\//g, '-')}-${time.replace(/:/g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    startDaihyosha() {
        this.state.daihyosha.active = true;
        this.dom.daihyoshaRow.classList.remove('hidden');
        this.dom.daihyoshaRow.classList.add('active');

        // Clear winner announcement
        this.dom.winnerAnnouncement.textContent = '';

        // Set up click listener for daihyosha row
        this.dom.daihyoshaRow.addEventListener('click', () => {
            this.stopTimer();
            this.activeMatchIndex = 'rep';
            this.updateActiveRowUI();
            this.updateTimerDisplay();
        });

        // Activate the daihyosha row
        this.activeMatchIndex = 'rep';
        this.updateActiveRowUI();
        this.updateTimerDisplay();
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.scoreboard = new KendoScoreboard();
});
