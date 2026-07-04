import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import notesRouter from "./notes";
import ideasRouter from "./ideas";
import memoriesRouter from "./memories";
import resourcesRouter from "./resources";
import graphRouter from "./graph";
import chatsRouter from "./chats";
import brainRouter from "./brain";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(notesRouter);
router.use(ideasRouter);
router.use(memoriesRouter);
router.use(resourcesRouter);
router.use(graphRouter);
router.use(chatsRouter);
router.use(brainRouter);

export default router;
