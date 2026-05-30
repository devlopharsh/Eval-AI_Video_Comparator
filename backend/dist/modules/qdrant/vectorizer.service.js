"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorizerService = void 0;
const common_1 = require("@nestjs/common");
let VectorizerService = class VectorizerService {
    constructor() {
        this.dimension = 12;
    }
    embedText(text) {
        const vector = new Array(this.dimension).fill(0);
        for (let index = 0; index < text.length; index += 1) {
            vector[index % vector.length] += text.charCodeAt(index) / 255;
        }
        return vector.map((value) => Number(value.toFixed(4)));
    }
};
exports.VectorizerService = VectorizerService;
exports.VectorizerService = VectorizerService = __decorate([
    (0, common_1.Injectable)()
], VectorizerService);
