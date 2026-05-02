document.addEventListener("DOMContentLoaded", function () {
    initLiveScores();
    initNextMatch();
    loadTeamsFromStorage();
    setupEventListeners();
});

function initLiveScores() {
    const liveScores = document.querySelector("#live-scores p");

    setInterval(() => {
        const randomScore = Math.floor(Math.random() * 5) + " - " + Math.floor(Math.random() * 5);
        liveScores.textContent = `Match: Team A ${randomScore} Team B`;
    }, 3000);
}

function initNextMatch() {
    const nextMatchElement = document.querySelector("#next-match p");
    const fixtures = [
        { date: "March 5, 2026", match: "Team A vs Team B" },
        { date: "March 8, 2026", match: "Team C vs Team D" }
    ];
    let currentMatch = 0;

    setInterval(() => {
        currentMatch = (currentMatch + 1) % fixtures.length;
        nextMatchElement.innerHTML = `<strong>Next Match:</strong> ${fixtures[currentMatch].match} - ${fixtures[currentMatch].date}`;
    }, 5000);
}

function setupEventListeners() {
    document.querySelector(".btn").addEventListener("click", function () {
        alert("Coming Soon! Stay tuned for updates.");
    });

    document.getElementById("score1").addEventListener("input", calculatePoints);
    document.getElementById("score2").addEventListener("input", calculatePoints);
    document.getElementById("fouls1").addEventListener("input", calculatePoints);
    document.getElementById("fouls2").addEventListener("input", calculatePoints);

    window.addEventListener("message", function (event) {
        if (event.data && event.data.type === "updateMatch") {
            updateMatchDetails(event.data);
        }
    });
}

function toggleSection(sectionId) {
    let section = document.getElementById(sectionId);
    section.style.display = section.style.display === "none" ? "block" : "none";
}

function toggleLiveScores() {
    document.getElementById("matches-section").style.display = "none";
    toggleSection("live-scores-section");
}

function fetchLiveScores() {
    fetch("https://api.example.com/live-scores")
        .then(response => response.json())
        .then(data => {
            let scoresContent = document.getElementById("live-scores-content");
            scoresContent.innerHTML = data.matches.map(match =>
                `<p>${match.teamA} ${match.scoreA} - ${match.scoreB} ${match.teamB}</p>`
            ).join("");
        })
        .catch(error => console.error("Error fetching live scores:", error));
}

function updateMatch() {
    let team1 = document.getElementById("team1").value.trim() || "Team A";
    let team2 = document.getElementById("team2").value.trim() || "Team B";
    let score1 = document.getElementById("score1").value || 0;
    let score2 = document.getElementById("score2").value || 0;
    let fouls1 = document.getElementById("fouls1").value || 0;
    let fouls2 = document.getElementById("fouls2").value || 0;

    let matchDetails = `${team1} vs ${team2} - Score: ${score1} - ${score2} | Fouls: ${fouls1} - ${fouls2}`;
    document.getElementById("match-details").innerText = matchDetails;

    saveTeamsToStorage(team1, team2);
    alert("Match Updated! Teams are saved.");
}

function calculatePoints() {
    let score1 = parseInt(document.getElementById("score1").value) || 0;
    let score2 = parseInt(document.getElementById("score2").value) || 0;
    let fouls1 = parseInt(document.getElementById("fouls1").value) || 0;
    let fouls2 = parseInt(document.getElementById("fouls2").value) || 0;

    let points1 = Math.max(0, score1 * 3 - fouls1);
    let points2 = Math.max(0, score2 * 3 - fouls2);

    document.getElementById("points1").innerText = points1;
    document.getElementById("points2").innerText = points2;
}

function updateMatchDetails(data) {
    let { team1, team2, score1, score2, fouls1, fouls2, points1, points2 } = data;

    document.getElementById("match-details").innerHTML =
        `${team1} vs ${team2} - Score: ${score1} - ${score2} | Fouls: ${fouls1} - ${fouls2} | Points: ${points1} - ${points2}`;

    document.getElementById("points1").textContent = points1;
    document.getElementById("points2").textContent = points2;
}

function saveTeamsToStorage(team1, team2) {
    let teams = JSON.parse(localStorage.getItem("teams")) || [];

    if (!teams.includes(team1)) teams.push(team1);
    if (!teams.includes(team2)) teams.push(team2);

    localStorage.setItem("teams", JSON.stringify(teams));
    updateTeamsList();
}

function loadTeamsFromStorage() {
    let teams = JSON.parse(localStorage.getItem("teams")) || [];
    let teamsList = document.getElementById("teamsList");

    teams.forEach(team => addTeamToList(team));
}

function updateTeams() {
    let team1 = document.getElementById("team1NameInput").value.trim();
    let team2 = document.getElementById("team2NameInput").value.trim();

    if (team1 && team2) {
        document.getElementById("team1Display").textContent = team1;
        document.getElementById("team2Display").textContent = team2;
        document.getElementById("nextMatch").textContent = `${team1} vs ${team2} - March 8, 2025`;

        saveTeamsToStorage(team1, team2);
    }
}

function updateTeamsList() {
    let teams = JSON.parse(localStorage.getItem("teams")) || [];
    let teamsList = document.getElementById("teamsList");

    teamsList.innerHTML = ""; // Clear existing list
    teams.forEach(team => addTeamToList(team));
}

function addTeamToList(teamName) {
    let teamsList = document.getElementById("teamsList");
    if (!document.getElementById(teamName)) {
        let newTeam = document.createElement("li");
        newTeam.id = teamName;
        newTeam.innerHTML = `<a href="#">${teamName}</a>`;
        teamsList.appendChild(newTeam);
    }
}



function calculatePoints() {
    let goals1 = parseInt(document.getElementById("goals1").value) || 0;
    let goals2 = parseInt(document.getElementById("goals2").value) || 0;
    let touchdowns1 = parseInt(document.getElementById("touchdowns1").value) || 0;
    let touchdowns2 = parseInt(document.getElementById("touchdowns2").value) || 0;
    let safeties1 = parseInt(document.getElementById("safeties1").value) || 0;
    let safeties2 = parseInt(document.getElementById("safeties2").value) || 0;
    let fouls1 = parseInt(document.getElementById("fouls1").value) || 0;
    let fouls2 = parseInt(document.getElementById("fouls2").value) || 0;

    // Formula: (Goals × 3) + (Touchdowns × 6) + (Safeties × 2) - (Fouls × 1)
    let points1 = Math.max(0, (goals1 * 3) + (touchdowns1 * 6) + (safeties1 * 2) - fouls1);
    let points2 = Math.max(0, (goals2 * 3) + (touchdowns2 * 6) + (safeties2 * 2) - fouls2);

    // Update UI
    document.getElementById("points1").textContent = points1;
    document.getElementById("points2").textContent = points2;
}

function endMatch() {
    if (timer) {
        clearInterval(timer);
        timer = null;
        matchStarted = false;
        
        // Ensure scores are updated before showing winner
        updateMatch();
        
        setTimeout(() => {
            showWinner();
            alert("🏁 Match has ended!");
        }, 500); // Small delay to ensure points update properly
    }
}

