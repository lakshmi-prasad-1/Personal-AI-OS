import { Router, type IRouter } from "express";
import { RegisterBody, RegisterResponse, LoginBody, LoginResponse } from "@workspace/api-zod";
import { authService } from "../services/authService";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await authService.register(parsed.data.email, parsed.data.password);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  const { token, user } = result;
  res.status(201).json(
    RegisterResponse.parse({
      token,
      user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
    }),
  );
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await authService.login(parsed.data.email, parsed.data.password);
  if ("error" in result) {
    res.status(401).json({ error: result.error });
    return;
  }

  const { token, user } = result;
  res.json(
    LoginResponse.parse({
      token,
      user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
    }),
  );
});

export default router;
