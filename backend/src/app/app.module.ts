import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { AppController } from "./app.controller";
import { ChatModule } from "../modules/chat/chat.module";
import { IngestionModule } from "../modules/ingestion/ingestion.module";
import { PrismaModule } from "../modules/prisma/prisma.module";
import { QdrantModule } from "../modules/qdrant/qdrant.module";
import { VideosModule } from "../modules/videos/videos.module";
import { configuration, validateEnvironment } from "../config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>("redis.host"),
          port: configService.getOrThrow<number>("redis.port"),
          password: configService.get<string>("redis.password") || undefined,
        },
      }),
    }),
    PrismaModule,
    QdrantModule,
    IngestionModule,
    VideosModule,
    ChatModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
