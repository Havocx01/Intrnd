import { Router } from "express";
import { getMajors } from "../data/majors.js";

const router = Router();

router.get("/", async (_request, response) => {
  const majors = await getMajors();
  response.json({ majors });
});

export default router;
