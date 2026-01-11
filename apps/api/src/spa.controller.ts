import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";
import { join } from "path";

// In Docker (production), WORKDIR is /app
const INDEX_PATH =
  process.env.NODE_ENV === "production"
    ? "/app/apps/web/dist/index.html"
    : join(process.cwd(), "apps/web/dist/index.html");

@Controller()
export class SpaController {
  @Get("*")
  serveSpa(@Res() res: Response) {
    res.sendFile(INDEX_PATH);
  }
}
