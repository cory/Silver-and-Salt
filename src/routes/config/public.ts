import type { VercelResponse } from "@vercel/node";
import { apiHandler, sendJson } from "../../server/http.js";
import { publicConfig } from "../../server/env.js";

export default apiHandler("config.public", async (_req, res: VercelResponse) => {
  sendJson(res, 200, publicConfig());
});
