import { IsNotEmpty, IsString } from "class-validator";

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  session_id!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}
