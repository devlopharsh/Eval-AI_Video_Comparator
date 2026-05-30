import { IsString, Matches } from "class-validator";

const SUPPORTED_VIDEO_URL_PATTERN =
  /^(https?:\/\/)?(www\.)?((youtube\.com|youtu\.be)\/|instagram\.com\/)/i;

export class IngestDto {
  @IsString()
  @Matches(SUPPORTED_VIDEO_URL_PATTERN, {
    message: "video_url_a must be a valid YouTube or Instagram URL.",
  })
  video_url_a!: string;

  @IsString()
  @Matches(SUPPORTED_VIDEO_URL_PATTERN, {
    message: "video_url_b must be a valid YouTube or Instagram URL.",
  })
  video_url_b!: string;
}
