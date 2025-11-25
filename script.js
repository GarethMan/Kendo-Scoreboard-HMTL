class KendoScoreboard {
    constructor() {
        this.positions = ['Senpo', 'Jiho', 'Chuken', 'Fukusho', 'Taisho'];
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
                result: null, // 'white', 'red', 'draw', or null
                winType: null, // 'ippon-gachi' (1 point), 'nihon-gachi' (2 points), 'hikiwaki'
                history: []
            }))
        };

        this.dom = {
            timerDisplay: document.getElementById('timer-display'),
            btnStartStop: document.getElementById('btn-start-stop'),
            btnEndMatch: document.getElementById('btn-end-match'),
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
            redSummary: document.getElementById('red-summary')
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

            // Determine Result Mark (X for Draw)
            let resultMark = '';
            if (match.result === 'draw') {
                resultMark = '<div class="mark-hikiwaki">×</div>';
            }

            row.innerHTML = `
                <div class="cell order-cell">${pos}</div>
                <div class="cell name-cell">
                    <input type="text" value="Player ${index + 1}" class="name-input" aria-label="White Player ${pos}">
                </div>
                <!-- White Score -->
                <div class="cell score-cell" id="white-score-${index}">
                    <div class="ippon-container" id="white-ippon-${index}"></div>
                    <div class="hansoku-container" id="white-hansoku-${index}"></div>
                </div>
                <!-- Result Column -->
                <div class="cell result-cell">${resultMark}</div>
                <!-- Red Score -->
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
    }

    setupEventListeners() {
        this.dom.btnStartStop.addEventListener('click', () => this.toggleTimer());
        this.dom.btnEndMatch.addEventListener('click', () => this.endMatch());
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
                const player = e.target.dataset.player;
                this.undoLastAction();
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (e.code === 'Space') {
                e.preventDefault();
                this.toggleTimer();
            }
        });
    }

    getCurrentMatch() {
        return this.state.matches[this.activeMatchIndex];
    }

    // --- Timer Logic ---
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
        this.renderRows(); // Re-render to clear result marks
        this.updateSummary();
    }

    resetAllMatches() {
        this.stopTimer();
        this.state.matches.forEach((match, index) => {
            match.timer.minutes = match.timer.originalMinutes;
            match.timer.seconds = match.timer.originalSeconds;
            match.red = { ippons: [], hansoku: 0 };
            match.white = { ippons: [], hansoku: 0 };
            match.result = null;
            match.winType = null;
            match.history = [];
        });
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

    // --- Scoring & End Match Logic ---

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
        this.renderRows(); // Re-render for result marks
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

        this.renderRows(); // To show result marks (X)
        this.updateSummary();

        // Advance to next match if possible
        if (this.activeMatchIndex < this.positions.length - 1) {
            this.setActiveMatch(this.activeMatchIndex + 1);
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
    }

    renderMatchScores(index) {
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.scoreboard = new KendoScoreboard();
});
