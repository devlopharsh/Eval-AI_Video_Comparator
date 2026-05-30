import { Controller, Get, Param } from "@nestjs/common";
import { VideosService } from "./videos.service";

@Controller("video")
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get(":id")
  async getVideo(@Param("id") id: string) {
    return this.videosService.getVideoDetails(id);
  }
}
