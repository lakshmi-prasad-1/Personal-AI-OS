import { Router, type IRouter } from "express";
import { GetCurrentUserResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { usersService } from "../services/usersService";

const router: IRouter = Router();

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const user = await usersService.getById(req.auth!.userId);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(GetCurrentUserResponse.parse(user));
});

export default router;
