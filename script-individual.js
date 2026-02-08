class KendoScoreboard {
    constructor(config) {
        this.numMatches = 8;
        this.storageKey = (config && config.storageKey) || 'kendo-individual';
        this.activeMatchIndex = 0;

        this.state = {
            matches: Array(this.numMatches).fill(null).map(() => ({
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
                encho: false,
                history: []
            }))
        };

        this.dom = {
            timerDisplay: document.getElementById('timer-display'),
            btnStartStop: document.getElementById('btn-start-stop'),
            btnEndMatch: document.getElementById('btn-end-match'),
            btnEncho: document.getElementById('btn-encho'),
            btnReset: document.getElementById('btn-reset'),
            btnResetAll: document.getElementById('btn-reset-all'),
            btnEditTime: document.getElementById('btn-edit-time'),
            modal: document.getElementById('time-modal'),
            inputMinutes: document.getElementById('input-minutes'),
            inputSeconds: document.getElementById('input-seconds'),
            btnSaveTime: document.getElementById('btn-save-time'),
            btnCancelTime: document.getElementById('btn-cancel-time'),
            rowsContainer: document.getElementById('rows-container')
        };

        this.init();
    }

    init() {
        this.restoreState();
        this.renderRows();
        this.updateActiveRowUI();
        this.updateTimerDisplay();
        this.setupEventListeners();
    }

    renderRows() {
        this.dom.rowsContainer.innerHTML = '';
        for (let index = 0; index < this.numMatches; index++) {
            const match = this.state.matches[index];
            const row = document.createElement('div');
            row.className = `match-row ${index === this.activeMatchIndex ? 'active' : ''}`;
            row.dataset.index = index;
            row.addEventListener('click', () => this.setActiveMatch(index));

            let resultMark = '';
            if (match.result === 'draw') {
                resultMark = '<div class="mark-hikiwaki">×</div>';
            } else if (match.encho) {
                resultMark = '<div class="mark-encho">E</div>';
            }

            const whiteName = match.whiteName || '';
            const redName = match.redName || '';

            row.innerHTML = `
                <div class="cell name-cell">
                    <input type="text" value="${whiteName}" placeholder="White Player ${index + 1}" class="name-input" aria-label="White Player ${index + 1}">
                </div>
                <div class="cell score-cell" id="white-score-${index}">
                    <div class="ippon-container" id="white-ippon-${index}"></div>
                    <div class="hansoku-container" id="white-hansoku-${index}"></div>
                </div>
                <div class="cell result-cell" style="flex: 0 0 40px; display: flex; justify-content: center; align-items: center; border-left: 1px solid black; border-right: 1px solid black;">${resultMark}</div>
                <div class="cell score-cell" id="red-score-${index}">
                    <div class="ippon-container" id="red-ippon-${index}"></div>
                    <div class="hansoku-container" id="red-hansoku-${index}"></div>
                </div>
                <div class="cell name-cell">
                    <input type="text" value="${redName}" placeholder="Red Player ${index + 1}" class="name-input" aria-label="Red Player ${index + 1}">
                </div>
            `;
            this.dom.rowsContainer.appendChild(row);

            // Attach input listeners to sync names back to state
            const whiteInput = row.querySelector(`input[aria-label="White Player ${index + 1}"]`);
            const redInput = row.querySelector(`input[aria-label="Red Player ${index + 1}"]`);
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
        }
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
        this.dom.btnEncho.addEventListener('click', () => this.startEncho());
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
            btn.addEventListener('click', () => {
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

    getCurrentMatch() {
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
        match.encho = false;
        match.history = [];
        this.updateTimerDisplay();
        this.renderRows();
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
            match.encho = false;
            match.history = [];
        });
        this.renderRows();
        this.updateTimerDisplay();
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
        // Issue 3: Include encho in saved state
        const stateCopy = JSON.parse(JSON.stringify({
            red: match.red,
            white: match.white,
            result: match.result,
            encho: match.encho,
            timer: {
                minutes: match.timer.minutes,
                seconds: match.timer.seconds
            }
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
        // Issue 3: Restore encho and timer on undo
        if (previousState.encho !== undefined) {
            match.encho = previousState.encho;
        }
        if (previousState.timer) {
            match.timer.minutes = previousState.timer.minutes;
            match.timer.seconds = previousState.timer.seconds;
        }
        this.updateTimerDisplay();
        this.renderRows();
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

    startEncho() {
        const match = this.getCurrentMatch();
        this.saveState();
        match.encho = true;
        match.timer.minutes = 99;
        match.timer.seconds = 59;
        this.updateTimerDisplay();
        this.renderRows();
        this.startTimer();
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
        } else if (whiteScore > redScore) {
            match.result = 'white';
        } else {
            match.result = 'draw';
        }

        this.renderRows();
        this.persistState();

        if (this.activeMatchIndex < this.numMatches - 1) {
            this.setActiveMatch(this.activeMatchIndex + 1);
        }
    }

    renderMatchScores(index) {
        const match = this.state.matches[index];
        this.renderPlayerScore(index, 'red', match.red);
        this.renderPlayerScore(index, 'white', match.white);
    }

    renderPlayerScore(index, player, playerData) {
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

    downloadResults() {
        const date = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString();

        let csvContent = "Date,Time,Match,White Player,White Points,White Score,Red Score,Red Points,Red Player,Result\n";

        for (let index = 0; index < this.numMatches; index++) {
            const match = this.state.matches[index];

            // Issue 1: Read names from state
            const whitePlayerName = match.whiteName || `White Player ${index + 1}`;
            const redPlayerName = match.redName || `Red Player ${index + 1}`;

            const whitePoints = match.white.ippons.join(' ') || '';
            const redPoints = match.red.ippons.join(' ') || '';
            const whiteScore = match.white.ippons.length;
            const redScore = match.red.ippons.length;

            let result = '';
            if (match.result === 'white') result = 'White Win';
            else if (match.result === 'red') result = 'Red Win';
            else if (match.result === 'draw') result = 'Draw';
            else if (whiteScore > redScore) result = 'White Leading';
            else if (redScore > whiteScore) result = 'Red Leading';
            else result = 'Even';

            // Escape CSV fields
            const safeWhiteName = `"${whitePlayerName.replace(/"/g, '""')}"`;
            const safeRedName = `"${redPlayerName.replace(/"/g, '""')}"`;

            csvContent += `"${date}","${time}","Match ${index + 1}",${safeWhiteName},"${whitePoints}",${whiteScore},${redScore},"${redPoints}",${safeRedName},"${result}"\n`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kendo-individual-matches-${date.replace(/\//g, '-')}-${time.replace(/:/g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Issue 13: Persistence
    persistState() {
        const data = {
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
                encho: m.encho
            }))
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
                    match.encho = savedMatch.encho || false;
                });
            }
        } catch (e) {
            // If parsing fails, start fresh
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.scoreboard = new KendoScoreboard({ storageKey: 'kendo-individual' });
});
