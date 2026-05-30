"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestDto = void 0;
const class_validator_1 = require("class-validator");
const SUPPORTED_VIDEO_URL_PATTERN = /^(https?:\/\/)?(www\.)?((youtube\.com|youtu\.be)\/|instagram\.com\/)/i;
class IngestDto {
}
exports.IngestDto = IngestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(SUPPORTED_VIDEO_URL_PATTERN, {
        message: "video_url_a must be a valid YouTube or Instagram URL.",
    }),
    __metadata("design:type", String)
], IngestDto.prototype, "video_url_a", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(SUPPORTED_VIDEO_URL_PATTERN, {
        message: "video_url_b must be a valid YouTube or Instagram URL.",
    }),
    __metadata("design:type", String)
], IngestDto.prototype, "video_url_b", void 0);
