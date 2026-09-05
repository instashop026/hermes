import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rmCoinRouter from "./rm-coin";
import telegramRouter from "./telegram";
import socialRouter from "./social";
import adminRouter from "./admin";
import catalogRouter from "./catalog";

const router: IRouter = Router();

router.use(healthRouter);
router.use(rmCoinRouter);
router.use(telegramRouter);
router.use(socialRouter);
router.use("/admin", adminRouter);
router.use("/catalog", catalogRouter);

export default router;
