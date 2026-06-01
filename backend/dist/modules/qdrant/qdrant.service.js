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
var QdrantService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let QdrantService = QdrantService_1 = class QdrantService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(QdrantService_1.name);
        this.baseUrl = this.configService.getOrThrow("qdrant.url");
        this.collection = this.configService.getOrThrow("qdrant.collection");
        this.apiKey = this.configService.get("qdrant.apiKey") ?? "";
    }
    async ensureCollection(vectorSize) {
        const collectionUrl = `${this.baseUrl}/collections/${this.collection}`;
        const existing = await fetch(collectionUrl, {
            headers: this.buildHeaders(),
        });
        if (existing.ok) {
            const payload = (await existing.json());
            const configuredVectors = payload.result?.config?.params?.vectors;
            const existingSize = this.extractVectorSize(configuredVectors);
            if (typeof existingSize === "number" && existingSize !== vectorSize) {
                throw new Error(`Qdrant collection "${this.collection}" expects vectors of dimension ${existingSize}, but received ${vectorSize}. Recreate the collection or align the configured embedding model dimension.`);
            }
            return;
        }
        if (existing.status !== 404) {
            throw new Error(`Failed to inspect Qdrant collection: ${await existing.text()}`);
        }
        const response = await fetch(collectionUrl, {
            method: "PUT",
            headers: this.buildHeaders(),
            body: JSON.stringify({
                vectors: {
                    size: vectorSize,
                    distance: "Cosine",
                },
            }),
        });
        if (!response.ok) {
            const detail = await response.text();
            if (response.status === 409 || detail.includes("already exists")) {
                this.logger.warn(`Qdrant collection "${this.collection}" already exists; continuing.`);
                return;
            }
            throw new Error(`Failed to create Qdrant collection: ${detail}`);
        }
    }
    async upsertTranscriptChunks(chunks) {
        if (chunks.length === 0) {
            return;
        }
        await this.ensureCollection(chunks[0].vector.length);
        const response = await fetch(`${this.baseUrl}/collections/${this.collection}/points`, {
            method: "PUT",
            headers: this.buildHeaders(),
            body: JSON.stringify({
                points: chunks.map((chunk) => ({
                    id: chunk.id,
                    vector: chunk.vector,
                    payload: chunk.payload,
                })),
            }),
        });
        if (!response.ok) {
            throw new Error(`Failed to upsert Qdrant points: ${await response.text()}`);
        }
        this.logger.log(`Upserted ${chunks.length} transcript chunks into Qdrant.`);
    }
    async searchSimilarChunks(input) {
        await this.ensureCollection(input.vector.length);
        const must = [
            {
                key: "sessionId",
                match: {
                    value: input.sessionId,
                },
            },
        ];
        if (input.side) {
            must.push({
                key: "side",
                match: {
                    value: input.side,
                },
            });
        }
        const response = await fetch(`${this.baseUrl}/collections/${this.collection}/points/search`, {
            method: "POST",
            headers: this.buildHeaders(),
            body: JSON.stringify({
                vector: input.vector,
                limit: input.limit,
                with_payload: true,
                filter: {
                    must,
                },
            }),
        });
        if (!response.ok) {
            throw new Error(`Failed to search Qdrant: ${await response.text()}`);
        }
        const payload = (await response.json());
        return (payload.result ?? []).map((item) => ({
            id: String(item.id),
            score: item.score,
            payload: item.payload,
        }));
    }
    extractVectorSize(vectors) {
        if (!vectors) {
            return undefined;
        }
        if ("size" in vectors && typeof vectors.size === "number") {
            return vectors.size;
        }
        const firstNamedVector = Object.values(vectors)[0];
        return firstNamedVector?.size;
    }
    buildHeaders() {
        return {
            "Content-Type": "application/json",
            ...(this.apiKey ? { "api-key": this.apiKey } : {}),
        };
    }
};
exports.QdrantService = QdrantService;
exports.QdrantService = QdrantService = QdrantService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], QdrantService);
