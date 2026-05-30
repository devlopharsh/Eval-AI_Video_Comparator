"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoSeedFactoryService = void 0;
const common_1 = require("@nestjs/common");
let VideoSeedFactoryService = class VideoSeedFactoryService {
    buildYoutubeSeed(url) {
        return {
            side: "A",
            platform: "YOUTUBE",
            sourceUrl: url,
            title: "How We Doubled Short-Form Retention in 7 Days",
            creator: "Northwind Growth",
            followerCount: 420000,
            views: 182000,
            likes: 14900,
            comments: 1800,
            uploadDate: new Date("2026-05-18T00:00:00.000Z"),
            durationSeconds: 522,
            hashtags: ["contentstrategy", "shorts", "retention"],
            transcript: "We tested seven opening patterns across 42 shorts, and one structure doubled average retention before the ten-second mark. The biggest lift came from stating the promise immediately, then proving it with a fast example before explaining the tactic. Every strong short in the sample reduced setup time, increased clarity, and gave the viewer a measurable reward in the opening beat.",
            transcriptSummary: "Immediate quantified hook, fast proof, and structured narrative reinforcement.",
            thumbnailUrl: "https://placehold.co/640x360?text=Video+A",
        };
    }
    buildInstagramSeed(url) {
        return {
            side: "B",
            platform: "INSTAGRAM",
            sourceUrl: url,
            title: "3 Content Fixes Every Creator Needs",
            creator: "Studio Switch",
            followerCount: 230000,
            views: 96000,
            likes: 5700,
            comments: 412,
            uploadDate: new Date("2026-05-21T00:00:00.000Z"),
            durationSeconds: 54,
            hashtags: ["creatortips", "reels", "growth"],
            transcript: "Here are three content mistakes I still see everywhere, and if you fix them, your videos can start converting better. The advice is useful, but the setup delays the concrete payoff. The reel moves quickly across separate tips, which keeps pace high but reduces cumulative narrative pressure and makes the opening feel more generic than outcome-driven.",
            transcriptSummary: "Fast list pacing with weaker opening payoff and less narrative accumulation.",
            thumbnailUrl: "https://placehold.co/640x360?text=Video+B",
        };
    }
};
exports.VideoSeedFactoryService = VideoSeedFactoryService;
exports.VideoSeedFactoryService = VideoSeedFactoryService = __decorate([
    (0, common_1.Injectable)()
], VideoSeedFactoryService);
