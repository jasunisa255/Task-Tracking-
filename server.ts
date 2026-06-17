import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { INITIAL_TASKS } from "./src/types";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json({ limit: "50mb" }));

  // Shared Data Directory setup
  const DATA_DIR = path.join(process.cwd(), "data");
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const TASKS_PATH = path.join(DATA_DIR, "tasks.json");
  const USERS_PATH = path.join(DATA_DIR, "users.json");
  const ASSIGNEES_PATH = path.join(DATA_DIR, "assignees.json");
  const SALES_PATH = path.join(DATA_DIR, "sales.json");

  // Helper to write JSON file safely
  const writeJson = (filePath: string, data: any) => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      console.error(`Error writing JSON to ${filePath}:`, error);
    }
  };

  // Helper to read JSON file safely
  const readJson = (filePath: string, fallback: any) => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(`Error reading JSON from ${filePath}:`, error);
    }
    // If reading fails or file doesn't exist, write fallback and return it
    writeJson(filePath, fallback);
    return fallback;
  };

  // Default values
  const DEFAULT_USERS = [
    { name: "Ammy", email: "sunissa@gmail.com", password: "Ammy", role: "admin" },
    { name: "ปุ้ม", email: "raveewan@gmail.com", password: "Pumpuy", role: "user" },
    { name: "ตะวัน", email: "athittaya@gmail.com", password: "Taiwan", role: "user" },
    { name: "จ๋า", email: "ja.sunisa255@gmail.com", password: "Ja", role: "admin" }
  ];
  const DEFAULT_ASSIGNEES = ["Ammy", "ตะวัน", "ปุ้ม", "จ๋า"];
  const DEFAULT_SALES = ["รุ่งทิวา", "นัทชา", "พนัทดา", "ธิดาวัลย์", "สิริอาภา"];

  // Load and cache state
  const state = {
    tasks: readJson(TASKS_PATH, INITIAL_TASKS),
    usersList: readJson(USERS_PATH, DEFAULT_USERS),
    assigneesList: readJson(ASSIGNEES_PATH, DEFAULT_ASSIGNEES),
    salesList: readJson(SALES_PATH, DEFAULT_SALES)
  };

  // --- API ROUTE: GET ALL STATE ---
  app.get("/api/all-data", (req, res) => {
    res.json(state);
  });

  // --- API ROUTE: SAVE ALL STATE (Partial Support) ---
  app.post("/api/save-all", (req, res) => {
    const { tasks, usersList, assigneesList, salesList } = req.body;
    
    if (tasks !== undefined) {
      state.tasks = tasks;
      writeJson(TASKS_PATH, tasks);
    }
    if (usersList !== undefined) {
      state.usersList = usersList;
      writeJson(USERS_PATH, usersList);
    }
    if (assigneesList !== undefined) {
      state.assigneesList = assigneesList;
      writeJson(ASSIGNEES_PATH, assigneesList);
    }
    if (salesList !== undefined) {
      state.salesList = salesList;
      writeJson(SALES_PATH, salesList);
    }
    
    res.json({ success: true, data: state });
  });

  // Serve compiled assets in production or use Vite dev server in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
