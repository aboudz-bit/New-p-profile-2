import { Router } from "express";
import { authRouter } from "./auth.routes";
import { branchesRouter } from "./branches.routes";
import { usersRouter } from "./users.routes";
import { directoryRouter } from "./directory.routes";
import { modelsRouter } from "./models.routes";
import { profilesRouter } from "./profiles.routes";
import { claimRequestsRouter } from "./claimRequests.routes";
import { warrantiesRouter } from "./warranties.routes";
import { maintenanceRouter } from "./maintenance.routes";
import { documentsRouter } from "./documents.routes";
import { dashboardRouter } from "./dashboard.routes";
import { publicRouter } from "./public.routes";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Unauthenticated public QR scan resolution (safe preview only).
apiRouter.use("/public", publicRouter);

apiRouter.use("/auth", authRouter);
apiRouter.use("/branches", branchesRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/directory", directoryRouter);
apiRouter.use("/models", modelsRouter);
apiRouter.use("/profiles", profilesRouter);
apiRouter.use("/claim-requests", claimRequestsRouter);
apiRouter.use("/warranties", warrantiesRouter);
apiRouter.use("/maintenance", maintenanceRouter);
apiRouter.use("/documents", documentsRouter);
apiRouter.use("/dashboard", dashboardRouter);
