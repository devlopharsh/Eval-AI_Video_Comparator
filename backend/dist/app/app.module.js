"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const app_controller_1 = require("./app.controller");
const chat_module_1 = require("../modules/chat/chat.module");
const ingestion_module_1 = require("../modules/ingestion/ingestion.module");
const prisma_module_1 = require("../modules/prisma/prisma.module");
const qdrant_module_1 = require("../modules/qdrant/qdrant.module");
const videos_module_1 = require("../modules/videos/videos.module");
const configuration_1 = require("../config/configuration");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.configuration],
                validate: configuration_1.validateEnvironment,
            }),
            bullmq_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    connection: {
                        host: configService.getOrThrow("redis.host"),
                        port: configService.getOrThrow("redis.port"),
                        password: configService.get("redis.password") || undefined,
                    },
                }),
            }),
            prisma_module_1.PrismaModule,
            qdrant_module_1.QdrantModule,
            ingestion_module_1.IngestionModule,
            videos_module_1.VideosModule,
            chat_module_1.ChatModule,
        ],
        controllers: [app_controller_1.AppController],
    })
], AppModule);
