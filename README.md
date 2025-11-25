# Kendo Scoreboard

A traditional Japanese-style digital scoreboard system for Kendo matches, supporting multiple match formats with automatic scoring and winner calculation.

## Features

### Multiple Match Types
- **5-Man Team Match** (Dantai Shiai) - Full 5-player team format
- **3-Man Team Match** (Shiai) - Simplified 3-player team format  
- **Individual Match** (Kojin Shiai) - 8 independent matches

### Core Functionality
- ⏱️ **Match Timer** - Customizable countdown timer with start/stop/reset
- 🎯 **Scoring System** - Men (面), Kote (小手), Do (胴), Tsuki (突き)
- ⚠️ **Penalty Tracking** - Hansoku system (2 penalties = 1 point to opponent)
- ↩️ **Undo Feature** - Revert last action
- 🏆 **Winner Calculation** - Automatic determination based on wins, then points
- 📊 **Summary Display** - Real-time tracking of total wins and points

### Visual Features
- Traditional Kendo scoreboard aesthetic with light theme
- Red team background highlighting
- Red team points display right-to-left (traditional orientation)
- Active row highlighting for easy tracking
- Visual indicators for Ippon-gachi (1-point wins) and Hikiwaki (draws)

## Installation

### Quick Start
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/kendo-scoreboard.git
   ```

2. Open `index.html` in your web browser

That's it! No build process or dependencies required.

### File Structure
```
kendo-scoreboard/
├── index.html              # Main menu
├── team-match.html         # 5-man team scoreboard
├── team-match-3man.html    # 3-man team scoreboard
├── individual-match.html   # Individual matches
├── style.css               # Shared styling
├── script.js               # 5-man match logic
├── script-3man.js          # 3-man match logic
└── script-individual.js    # Individual match logic
```

## Usage

### Starting a Match
1. Open `index.html` in your browser
2. Select match type:
   - **5-Man Team Match** - Traditional team format
   - **3-Man Team Match** - Shorter team format
   - **Individual Match** - Multiple individual bouts

### Scoring Points
1. Click a row to select the active match
2. Use the control buttons to score:
   - **Men** (M) - Head strike
   - **Kote** (K) - Wrist strike
   - **Do** (D) - Body strike
   - **Tsuki** (T) - Throat thrust
3. **Hansoku** - Award penalties (2 = 1 point to opponent)

### Team Matches
- Click **End Match** to finalize current match result
- System automatically advances to next match
- Summary row tracks total wins and points
- Winner announced when all matches complete

### Timer Controls
- **Start/Stop** - Control timer
- **Reset** - Reset current match timer
- **Reset All** - Reset all matches and scores
- **Edit Time** - Set custom match duration

## Deployment

### Web Hosting (cPanel, Apache, Nginx)
Simply upload all files to your web server's public directory. No server-side processing required.

### GitHub Pages
1. Push to GitHub repository
2. Go to Settings → Pages
3. Select branch and folder
4. Your scoreboard will be live at `https://yourusername.github.io/kendo-scoreboard`

## Technology Stack

- **HTML5** - Structure
- **CSS3** - Styling with Flexbox/Grid layouts
- **Vanilla JavaScript** - No frameworks or libraries
- **Google Fonts** - Noto Serif JP for authentic Japanese typography

## Browser Compatibility

Works in all modern browsers:
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

Requires JavaScript enabled.

## Features in Detail

### Winner Calculation Logic
1. **Primary**: Team with most wins
2. **Tiebreaker**: Team with most points
3. **Result**: "DRAW - HIKIWAKI" if both tied

### Match Result Indicators
- **Ippon-gachi** (一本勝ち): Boxed '1' for 1-point wins
- **Hikiwaki** (引き分け): 'X' mark for draws
- **Custom team names** displayed in winner announcement

### Row Height
Consistent 100px minimum height prevents layout shifts when scoring.

## License

MIT License - Feel free to use and modify for your Kendo dojo or organization.

## Contributing

Contributions welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Acknowledgments

Designed for traditional Kendo scoring practices following All Japan Kendo Federation guidelines.

---

Made with ⚔️ for the Kendo community
