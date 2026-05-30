"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const videos_controller_1 = require("./videos.controller");
(0, node_test_1.default)("videos controller returns video details", async () => {
    const controller = new videos_controller_1.VideosController({
        getVideoDetails: async () => ({
            id: "video-1",
            title: "Demo Video",
        }),
    });
    const result = await controller.getVideo("video-1");
    strict_1.default.equal(result.id, "video-1");
    strict_1.default.equal(result.title, "Demo Video");
});
