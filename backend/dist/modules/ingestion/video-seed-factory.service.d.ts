import type { VideoSeed } from "../../shared/types/ingestion.types";
export declare class VideoSeedFactoryService {
    buildYoutubeSeed(url: string): VideoSeed;
    buildInstagramSeed(url: string): VideoSeed;
}
