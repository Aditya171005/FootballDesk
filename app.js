// ── IMPORTS ──────────────────────────────────────────────
const express    = require('express');
const mongoose   = require('mongoose');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path       = require('path');

const Match = require('./models/Match');
const User  = require('./models/user');

const app  = express();
const PORT = 3000;
const JWT_SECRET    = 'football_secret_key_2025';
const MONGO_URI     = 'mongodb://127.0.0.1:27017/FootBallDb';
const FOOTBALL_API  = '5e3ea7c97334419ba8813431d9b4edf6';
const MISTRAL_KEY   = 'pHVvgEL7ArGZZgoqOrGcDKjhzLHCNdak';
const CEREBRAS_KEY  = 'csk-vfywy2kcpdr6x9hp2wcfhwcpvt2ehdpfhp6xkjv2peryfjpn';

// ── CACHE ─────────────────────────────────────────────────
const cache = {};
const CACHE_TTL = 5 * 60 * 1000;
const CHAT_CACHE_TTL = 3 * 60 * 1000;

async function cachedFetch(url) {
    const now = Date.now();
    if (cache[url] && (now - cache[url].time) < CACHE_TTL) {
        console.log('✅ Cache hit:', url);
        return cache[url].data;
    }
    console.log('🌐 Fetching:', url);
    const res = await fetch(url, { headers: { 'X-Auth-Token': FOOTBALL_API } });
    if (res.status === 429) throw new Error('RATE_LIMITED');
    if (!res.ok) throw new Error(`API_ERROR_${res.status}`);
    const data = await res.json();
    cache[url] = { data, time: now };
    return data;
}

// ── MIDDLEWARE ────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
    if (req.path.endsWith('.html')) return res.redirect('/');
    next();
});

// ── MONGODB ───────────────────────────────────────────────
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected — FootBallDb'))
    .catch(err => console.error('❌ MongoDB error:', err.message));

// ── AUTH MIDDLEWARE ───────────────────────────────────────
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login');
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch (err) { res.clearCookie('token'); return res.redirect('/login'); }
}

function isAdmin(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login');
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch (err) { res.clearCookie('token'); return res.redirect('/login'); }
}

app.use((req, res, next) => {
    const token = req.cookies.token;
    res.locals.user = null;
    if (token) {
        try { res.locals.user = jwt.verify(token, JWT_SECRET); }
        catch (e) { res.clearCookie('token'); }
    }
    next();
});

// ── AUTH ROUTES ───────────────────────────────────────────
app.get('/login', (req, res) => res.render('login', { error: null }));
app.get('/loginpage', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.render('login', { error: 'User not found' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.render('login', { error: 'Wrong password' });
        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, maxAge: 86400000 });
        res.redirect('/');
    } catch (err) { res.render('login', { error: 'Login failed' }); }
});

app.post('/logining', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ $or: [{ email }, { username: email }] });
        if (!user) return res.render('login', { error: 'User not found' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.render('login', { error: 'Wrong password' });
        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, maxAge: 86400000 });
        res.redirect('/');
    } catch (err) { res.render('login', { error: 'Login failed' }); }
});

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const exists = await User.findOne({ $or: [{ username }, { email }] });
        if (exists) return res.render('login', { error: 'Username or email already taken' });
        const hashed = await bcrypt.hash(password, 10);
        await User.create({ username, email, password: hashed });
        res.redirect('/login');
    } catch (err) { res.render('login', { error: 'Registration failed' }); }
});

app.get('/logout', (req, res) => { res.clearCookie('token'); res.redirect('/login'); });

// ── API PROXY ROUTES ──────────────────────────────────────
app.get('/api/standings/:league', async (req, res) => {
    try {
        const data = await cachedFetch(`https://api.football-data.org/v4/competitions/${req.params.league}/standings`);
        res.json(data);
    } catch (err) {
        if (err.message === 'RATE_LIMITED') return res.status(429).json({ error: 'Rate limited — try again in 60s' });
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/crest', async (req, res) => {
    if (!req.query.url) return res.status(400).send('Missing url');
    try {
        const response = await fetch(req.query.url);
        if (!response.ok) return res.status(response.status).send('Failed');
        res.set('Content-Type', response.headers.get('content-type') || 'image/png');
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(Buffer.from(await response.arrayBuffer()));
    } catch (err) { res.status(500).send('Error'); }
});

app.get('/api/scorers/:league', async (req, res) => {
    try {
        const data = await cachedFetch(`https://api.football-data.org/v4/competitions/${req.params.league}/scorers?limit=20`);
        res.json(data);
    } catch (err) {
        if (err.message === 'RATE_LIMITED') return res.status(429).json({ error: 'Rate limited — try again in 60s' });
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/matches/:league', async (req, res) => {
    try {
        let url = `https://api.football-data.org/v4/competitions/${req.params.league}/matches`;
        if (req.query.matchday) url += `?matchday=${req.query.matchday}`;
        const data = await cachedFetch(url);
        res.json(data);
    } catch (err) {
        if (err.message === 'RATE_LIMITED') return res.status(429).json({ error: 'Rate limited — try again in 60s' });
        res.status(500).json({ error: err.message });
    }
});

// ── TEAM SEARCH API ───────────────────────────────────────
app.get('/api/teams/all', async (req, res) => {
    const leagues = ['PL', 'PD', 'BL1', 'SA', 'FL1'];
    const leagueNames = { PL: 'Premier League', PD: 'La Liga', BL1: 'Bundesliga', SA: 'Serie A', FL1: 'Ligue 1' };
    try {
        const results = await Promise.allSettled(
            leagues.map(code => cachedFetch(`https://api.football-data.org/v4/competitions/${code}/standings`)
                .then(data => ({ code, data }))
            )
        );
        const teams = [];
        results.forEach(r => {
            if (r.status === 'fulfilled') {
                const { code, data } = r.value;
                const table = data.standings?.find(s => s.type === 'TOTAL')?.table || [];
                table.forEach(entry => {
                    teams.push({
                        id: entry.team.id, name: entry.team.name,
                        shortName: entry.team.shortName, tla: entry.team.tla,
                        crest: entry.team.crest, leagueCode: code,
                        leagueName: leagueNames[code], position: entry.position
                    });
                });
            }
        });
        res.json({ teams });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── TODAY'S MATCHES API ───────────────────────────────────
app.get('/api/today/matches', async (req, res) => {
    const leagues = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL'];
    const leagueNames = { PL: 'Premier League', PD: 'La Liga', BL1: 'Bundesliga', SA: 'Serie A', FL1: 'Ligue 1', CL: 'Champions League' };
    const today = new Date().toISOString().split('T')[0];
    try {
        const results = await Promise.allSettled(
            leagues.map(code => cachedFetch(`https://api.football-data.org/v4/competitions/${code}/matches`).then(d => ({ code, d })))
        );
        const grouped = {};
        results.forEach(r => {
            if (r.status !== 'fulfilled') return;
            const { code, d } = r.value;
            const todayMatches = (d.matches || []).filter(m => m.utcDate && m.utcDate.startsWith(today));
            if (todayMatches.length > 0) {
                grouped[code] = { name: leagueNames[code], matches: todayMatches };
            }
        });
        res.json({ grouped, today });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── QUIZ API ──────────────────────────────────────────────
app.post('/api/quiz', async (req, res) => {
    const { category = 'Mixed', difficulty = 'Medium' } = req.body;
    const prompt = `Generate exactly 10 football quiz questions. Category: ${category}. Difficulty: ${difficulty}.
Return ONLY a valid JSON array, absolutely no markdown, no backticks, no extra text before or after.
Format: [{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]
"correct" is the 0-based index of the correct option in the options array.
Make questions specific, factual, and interesting.`;

    let questions = null;

    try {
        const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY}` },
            body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: prompt }], max_tokens: 2000, temperature: 0.7 })
        });
        if (r.ok) {
            const d = await r.json();
            const text = d.choices?.[0]?.message?.content?.trim() || '';
            questions = JSON.parse(text.replace(/```json|```/g, '').trim());
        }
    } catch (e) { console.log('Mistral quiz error:', e.message); }

    if (!questions) {
        try {
            const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CEREBRAS_KEY}` },
                body: JSON.stringify({ model: 'gpt-oss-120b', messages: [{ role: 'user', content: prompt }], max_tokens: 2000, temperature: 0.7 })
            });
            if (r.ok) {
                const d = await r.json();
                const text = d.choices?.[0]?.message?.content?.trim() || '';
                questions = JSON.parse(text.replace(/```json|```/g, '').trim());
            }
        } catch (e) { console.log('Cerebras quiz error:', e.message); }
    }

    if (!questions || !Array.isArray(questions)) return res.status(500).json({ error: 'Failed to generate questions' });
    res.json({ questions: questions.slice(0, 10) });
});

// ── SMART FOOTBALL AI CHAT ────────────────────────────────
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid messages' });

        const userMessage = messages[messages.length - 1]?.content || '';
        const msg = userMessage.toLowerCase();

        const wantsScorers   = /scorer|top scorer|golden boot|hat.?trick|most goal|assist|who.*scor|goal.*leader/i.test(msg);
        const wantsStandings = /stand|table|position|rank|point|top of|bottom of|relegat|champion|league table|who.*lead/i.test(msg);
        const wantsFixtures  = /fixture|upcoming|next match|when.*play|schedule/i.test(msg);
        const wantsResults   = /result|score|beat|won|lost|draw|last match|last game/i.test(msg);

        const leagueMap = [
            { pattern: /premier league|epl|arsenal|chelsea|liverpool|man city|man utd|manchester|spurs|tottenham|newcastle|west ham|aston villa|brighton/i, code: 'PL' },
            { pattern: /la liga|spanish|barcelona|real madrid|atletico|sevilla|valencia|villarreal/i, code: 'PD' },
            { pattern: /bundesliga|german|bayern|dortmund|bvb|leverkusen|frankfurt|stuttgart|harry kane/i, code: 'BL1' },
            { pattern: /serie a|italian|juventus|inter|ac milan|napoli|roma|lazio|fiorentina/i, code: 'SA' },
            { pattern: /ligue 1|french|psg|paris|marseille|lyon|monaco|lille/i, code: 'FL1' },
        ];

        let detectedLeague = 'PL';
        for (const { pattern, code } of leagueMap) {
            if (pattern.test(msg)) { detectedLeague = code; break; }
        }

        const leagueNames = { PL: 'Premier League', PD: 'La Liga', BL1: 'Bundesliga', SA: 'Serie A', FL1: 'Ligue 1' };

        const cacheKey = 'chat:' + detectedLeague + ':' + msg.trim().substring(0, 100);
        if (cache[cacheKey] && (Date.now() - cache[cacheKey].time) < CHAT_CACHE_TTL) {
            return res.json({ reply: cache[cacheKey].reply });
        }

        let liveContext = '';
        try {
            if (wantsStandings || wantsResults || wantsFixtures) {
                const standingsData = await cachedFetch(`https://api.football-data.org/v4/competitions/${detectedLeague}/standings`);
                const table = standingsData.standings?.find(s => s.type === 'TOTAL')?.table || [];
                if (table.length > 0) {
                    liveContext += `\n\n=== LIVE ${leagueNames[detectedLeague]} STANDINGS (2025/26 Season) ===\n`;
                    table.forEach(e => { liveContext += `${e.position}. ${e.team.name} — ${e.points}pts | P${e.playedGames} W${e.won} D${e.draw} L${e.lost} | GF${e.goalsFor} GA${e.goalsAgainst} GD${e.goalDifference} | Form:${e.form || 'N/A'}\n`; });
                }
            }
            if (wantsScorers) {
                const scorersData = await cachedFetch(`https://api.football-data.org/v4/competitions/${detectedLeague}/scorers?limit=20`);
                const scorers = scorersData.scorers || [];
                if (scorers.length > 0) {
                    liveContext += `\n\n=== LIVE ${leagueNames[detectedLeague]} TOP SCORERS (2025/26 Season) ===\n`;
                    scorers.forEach((s, i) => { liveContext += `${i + 1}. ${s.player.name} (${s.team.name}) — ${s.goals} goals, ${s.assists || 0} assists in ${s.playedMatches} games\n`; });
                }
            }
            if (wantsResults) {
                const matchData = await cachedFetch(`https://api.football-data.org/v4/competitions/${detectedLeague}/matches`);
                const finished = (matchData.matches || []).filter(m => m.status === 'FINISHED').slice(-8);
                if (finished.length > 0) {
                    liveContext += `\n\n=== RECENT ${leagueNames[detectedLeague]} RESULTS ===\n`;
                    finished.forEach(m => { const date = new Date(m.utcDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); liveContext += `${m.homeTeam.name} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.name} (${date})\n`; });
                }
            }
            if (wantsFixtures) {
                const matchData = await cachedFetch(`https://api.football-data.org/v4/competitions/${detectedLeague}/matches`);
                const upcoming = (matchData.matches || []).filter(m => ['SCHEDULED', 'TIMED'].includes(m.status)).slice(0, 8);
                if (upcoming.length > 0) {
                    liveContext += `\n\n=== UPCOMING ${leagueNames[detectedLeague]} FIXTURES ===\n`;
                    upcoming.forEach(m => { const date = new Date(m.utcDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); liveContext += `${m.homeTeam.name} vs ${m.awayTeam.name} — ${date}\n`; });
                }
            }
            if (!liveContext) {
                const standingsData = await cachedFetch(`https://api.football-data.org/v4/competitions/PL/standings`);
                const table = standingsData.standings?.find(s => s.type === 'TOTAL')?.table || [];
                liveContext += `\n\n=== LIVE PREMIER LEAGUE STANDINGS (2025/26) ===\n`;
                table.slice(0, 10).forEach(e => { liveContext += `${e.position}. ${e.team.name} — ${e.points}pts\n`; });
            }
        } catch (fetchErr) { liveContext = '\n\n(Live data temporarily unavailable)'; }

        const systemPrompt = `You are a football expert AI assistant on Football Hub website.\nCRITICAL RULES:\n1. The LIVE DATA section below contains real 2025/26 season stats. Always trust it over your training data.\n2. For current standings, scorers, results or fixtures — answer ONLY from the live data.\n3. For historical questions — use your training knowledge.\n4. Keep answers short, clear and pundit-style.\n5. If live data doesn't contain what's asked, say so honestly.\n${liveContext}`;

        const chatMessages = [{ role: 'system', content: systemPrompt }, ...messages.slice(-10).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))];

        let reply = null;
        try {
            const r = await fetch('https://api.mistral.ai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY}` }, body: JSON.stringify({ model: 'mistral-small-latest', messages: chatMessages, max_tokens: 1024, temperature: 0.7 }) });
            if (r.ok) { const d = await r.json(); reply = d.choices?.[0]?.message?.content?.trim(); }
        } catch (e) {}

        if (!reply) {
            try {
                const r = await fetch('https://api.cerebras.ai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CEREBRAS_KEY}` }, body: JSON.stringify({ model: 'gpt-oss-120b', messages: chatMessages, max_tokens: 1024, temperature: 0.7 }) });
                if (r.ok) { const d = await r.json(); reply = d.choices?.[0]?.message?.content?.trim(); }
            } catch (e) {}
        }

        if (!reply) return res.status(500).json({ reply: '⚠️ AI is busy right now. Please try again in a moment!' });
        cache[cacheKey] = { reply, time: Date.now() };
        res.json({ reply });
    } catch (err) {
        res.status(500).json({ reply: '⚠️ Something went wrong. Please try again!' });
    }
});

// ── PAGE ROUTES ───────────────────────────────────────────
app.get('/', (req, res) => res.render('index'));
app.get('/standings', (req, res) => res.render('standings'));
app.get('/teams', (req, res) => res.render('teams'));
app.get('/player', (req, res) => res.render('player'));
app.get('/chart', (req, res) => res.render('chart'));
app.get('/about', (req, res) => res.render('about'));
app.get('/scorers', (req, res) => res.render('scorers'));
app.get('/fixtures', (req, res) => res.render('fixtures'));
app.get('/rugbNews', (req, res) => res.render('rugbNews'));
app.get('/news', (req, res) => res.render('rugbNews'));
app.get('/champions-league', (req, res) => res.render('champions-league'));

// ── NEW FEATURE ROUTES ────────────────────────────────────
app.get('/quiz', (req, res) => res.render('quiz'));
app.get('/compare', (req, res) => res.render('compare'));
app.get('/history', (req, res) => res.render('history'));
app.get('/today', (req, res) => res.render('today'));

app.get('/localTeams', async (req, res) => {
    try { const liveMatches = await Match.find({ status: 'Live' }); res.render('localTeams', { liveMatches }); }
    catch (err) { res.render('localTeams', { liveMatches: [] }); }
});

// Manual local match scoreboard
app.get('/local-match', (req, res) => {
    res.render('updatematch');
});

app.get('/startMatch', isLoggedIn, (req, res) => res.render('update_match', { match: null }));

app.get('/footBall', isLoggedIn, async (req, res) => {
    try { res.render('footBall', { matches: await Match.find().sort({ date: -1 }) }); }
    catch (err) { res.render('footBall', { matches: [] }); }
});
app.post('/footBall', isLoggedIn, async (req, res) => {
    try { await Match.create(req.body); res.redirect('/footBall'); }
    catch (err) { res.redirect('/footBall'); }
});
app.get('/update_match/:id', isLoggedIn, async (req, res) => {
    try { const match = await Match.findById(req.params.id); if (!match) return res.redirect('/footBall'); res.render('update_match', { match }); }
    catch (err) { res.redirect('/footBall'); }
});
app.post('/update_match/:id', isLoggedIn, async (req, res) => {
    try { await Match.findByIdAndUpdate(req.params.id, req.body); res.redirect('/footBall'); }
    catch (err) { res.redirect('/footBall'); }
});
app.post('/delete_match/:id', isLoggedIn, async (req, res) => {
    try { await Match.findByIdAndDelete(req.params.id); res.redirect('/footBall'); }
    catch (err) { res.redirect('/footBall'); }
});

app.post('/match', async (req, res) => {
    try { const match = new Match(req.body); await match.save(); res.status(201).json({ message: 'Match created', match }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/match/:id', async (req, res) => {
    try { res.json(await Match.findById(req.params.id)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/match/update/:id', async (req, res) => {
    try { res.json(await Match.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ADMIN ROUTES ──────────────────────────────────────────
app.get('/admin', isAdmin, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || admin.role !== 'admin') return res.status(403).send('Access denied. Admins only.');
        const users = await User.find({}).sort({ createdAt: -1 });
        const matches = await Match.find({}).sort({ createdAt: -1 });
        res.render('admin', { admin, users, matches, message: req.query.message || null, error: req.query.error || null });
    } catch (err) { res.status(500).send('Server error: ' + err.message); }
});
app.post('/admin/users/:id/promote', isAdmin, async (req, res) => {
    try { const admin = await User.findById(req.user.id); if (!admin || admin.role !== 'admin') return res.status(403).send('Access denied.'); await User.findByIdAndUpdate(req.params.id, { role: 'admin' }); res.redirect('/admin?message=User promoted to admin'); }
    catch (err) { res.redirect('/admin?error=' + err.message); }
});
app.post('/admin/users/:id/demote', isAdmin, async (req, res) => {
    try { const admin = await User.findById(req.user.id); if (!admin || admin.role !== 'admin') return res.status(403).send('Access denied.'); await User.findByIdAndUpdate(req.params.id, { role: 'user' }); res.redirect('/admin?message=Admin role removed'); }
    catch (err) { res.redirect('/admin?error=' + err.message); }
});
app.post('/admin/users/:id/delete', isAdmin, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || admin.role !== 'admin') return res.status(403).send('Access denied.');
        if (req.params.id === req.user.id) return res.redirect('/admin?error=Cannot delete yourself');
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/admin?message=User deleted');
    } catch (err) { res.redirect('/admin?error=' + err.message); }
});
app.post('/admin/matches/:id/delete', isAdmin, async (req, res) => {
    try { const admin = await User.findById(req.user.id); if (!admin || admin.role !== 'admin') return res.status(403).send('Access denied.'); await Match.findByIdAndDelete(req.params.id); res.redirect('/admin?message=Match deleted'); }
    catch (err) { res.redirect('/admin?error=' + err.message); }
});

// ── TEAM PAGE ─────────────────────────────────────────────
app.get('/team/:id', async (req, res) => {
    const teamId = parseInt(req.params.id);
    const leagues = ['PL', 'PD', 'BL1', 'SA', 'FL1'];
    const leagueNames = { PL: 'Premier League', PD: 'La Liga', BL1: 'Bundesliga', SA: 'Serie A', FL1: 'Ligue 1' };
    try {
        let standing = null, homeRecord = null, awayRecord = null, leagueCode = null, leagueName = null, team = null;
        for (const code of leagues) {
            try {
                const data = await cachedFetch(`https://api.football-data.org/v4/competitions/${code}/standings`);
                const totalTable = data.standings?.find(s => s.type === 'TOTAL')?.table || [];
                const found = totalTable.find(e => e.team.id === teamId);
                if (found) { standing = found; team = found.team; leagueCode = code; leagueName = leagueNames[code]; break; }
            } catch(e) { continue; }
        }
        if (!team) return res.status(404).send('<div style="text-align:center;padding:80px;background:#0a0e17;color:#fff;min-height:100vh;"><h1 style="font-size:72px;color:#ff4444;">404</h1><p>Team not found</p><a href="/" style="color:#FFD700;">← Home</a></div>');
        try {
            const matchData = await cachedFetch(`https://api.football-data.org/v4/competitions/${leagueCode}/matches`);
            const finished = (matchData.matches || []).filter(m => m.status === 'FINISHED');
            const calcRecord = (matches, side) => {
                let w = 0, d = 0, l = 0, gf = 0, ga = 0;
                matches.forEach(m => { const mine = side === 'home' ? m.score.fullTime.home : m.score.fullTime.away; const opp = side === 'home' ? m.score.fullTime.away : m.score.fullTime.home; gf += mine; ga += opp; if (mine > opp) w++; else if (mine === opp) d++; else l++; });
                return { playedGames: matches.length, won: w, draw: d, lost: l, goalsFor: gf, goalsAgainst: ga, goalDifference: gf - ga };
            };
            homeRecord = calcRecord(finished.filter(m => m.homeTeam?.id === teamId), 'home');
            awayRecord = calcRecord(finished.filter(m => m.awayTeam?.id === teamId), 'away');
        } catch(e) {}
        res.render('team', { team, standing, homeRecord, awayRecord, leagueCode, leagueName });
    } catch (err) { res.status(500).send('Server error: ' + err.message); }
});

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).send(`<div style="text-align:center;padding:80px;font-family:sans-serif;background:#0a0e17;color:#fff;min-height:100vh;"><h1 style="font-size:72px;color:#10b981;">404</h1><p style="font-size:20px;color:#9ca3af;">Page not found</p><a href="/" style="color:#10b981;font-size:16px;">← Back to Home</a></div>`);
});

// ── START ─────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log(`⚽ Football Hub → http://localhost:${PORT}`);
    console.log('═══════════════════════════════════════════');
    console.log(`🧠 Quiz     → /quiz`);
    console.log(`⚖️  Compare  → /compare`);
    console.log(`📜 History  → /history`);
    console.log(`📅 Today    → /today`);
    console.log('═══════════════════════════════════════════');
});