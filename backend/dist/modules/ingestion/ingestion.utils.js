"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSummaryFromTranscript = buildSummaryFromTranscript;
exports.extractHashtags = extractHashtags;
exports.ensureHttps = ensureHttps;
function buildSummaryFromTranscript(transcript) {
    const normalized = transcript.replace(/\s+/g, " ").trim();
    if (!normalized) {
        return "";
    }
    const firstSentence = normalized.match(/[^.!?]+[.!?]?/g)?.slice(0, 2).join(" ").trim();
    return firstSentence && firstSentence.length <= 220
        ? firstSentence
        : `${normalized.slice(0, 217).trim()}...`;
}
function extractHashtags(text) {
    const matches = text.match(/#[a-z0-9_]+/gi) ?? [];
    return [...new Set(matches.map((value) => value.replace(/^#/, "").toLowerCase()))];
}
function ensureHttps(url) {
    return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}
