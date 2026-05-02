const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    team1: { type: String, required: true },
    team2: { type: String, required: true },
    goals1: { type: Number, default: 0 },
    goals2: { type: Number, default: 0 },
    touchdowns1: { type: Number, default: 0 },
    touchdowns2: { type: Number, default: 0 },
    safeties1: { type: Number, default: 0 },
    safeties2: { type: Number, default: 0 },
    fouls1: { type: Number, default: 0 },
    fouls2: { type: Number, default: 0 },
    totalPoints1: { type: Number, default: 0 },
    totalPoints2: { type: Number, default: 0 },
    matchTime: { type: Number, default: 0 },
    winner: { type: String, default: "" },
    status: { type: String, default: "Live" }
}, { timestamps: true });


    

const Match = mongoose.model("Match", matchSchema);

module.exports = Match;