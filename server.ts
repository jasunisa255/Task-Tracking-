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
    { name: "จ๋า", email: "ja.sunisa255@gmail.com", password: "Ja", role: "admin" },
    { name: "อาทิตยา", email: "artitaya_sup@phyathai.com", password: "541659", role: "user" },
    { name: "รวีวรรณ", email: "raveewan_wia@phyathai.com", password: "552801", role: "user" },
    { name: "สุนิสสา", email: "sunissa_usa@phyathai.com", password: "720925", role: "user" },
    { name: "สุนิษา", email: "sunisa_sud@phyathai.com", password: "534002", role: "user" }
  ];
  const DEFAULT_ASSIGNEES = ["จ๋า", "อาทิตยา", "รวีวรรณ", "สุนิสสา", "สุนิษา"];
  const DEFAULT_SALES = ["รุ่งทิวา", "นัทชา", "พนัทดา", "ธิดาวัลย์", "สิริอาภา"];

  // Load and cache state
  const state = {
    tasks: readJson(TASKS_PATH, INITIAL_TASKS),
    usersList: readJson(USERS_PATH, DEFAULT_USERS),
    assigneesList: readJson(ASSIGNEES_PATH, DEFAULT_ASSIGNEES),
    salesList: readJson(SALES_PATH, DEFAULT_SALES)
  };

  // Timestamps for bi-directional synchronization
  const TIMESTAMPS_PATH = path.join(DATA_DIR, "timestamps.json");
  const DEFAULT_TIMESTAMPS = {
    tasks: 0,
    usersList: 0,
    assigneesList: 0,
    salesList: 0
  };
  const serverTimestamps = readJson(TIMESTAMPS_PATH, DEFAULT_TIMESTAMPS);

  // --- API ROUTE: GET ALL STATE ---
  app.get("/api/all-data", (req, res) => {
    res.json(state);
  });

  // --- API ROUTE: SAVE ALL STATE (Legacy Support with Timestamp bumping) ---
  app.post("/api/save-all", (req, res) => {
    const { tasks, usersList, assigneesList, salesList } = req.body;
    let updated = false;
    
    if (tasks !== undefined) {
      state.tasks = tasks;
      writeJson(TASKS_PATH, tasks);
      serverTimestamps.tasks = Date.now();
      updated = true;
    }
    if (usersList !== undefined) {
      state.usersList = usersList;
      writeJson(USERS_PATH, usersList);
      serverTimestamps.usersList = Date.now();
      updated = true;
    }
    if (assigneesList !== undefined) {
      state.assigneesList = assigneesList;
      writeJson(ASSIGNEES_PATH, assigneesList);
      serverTimestamps.assigneesList = Date.now();
      updated = true;
    }
    if (salesList !== undefined) {
      state.salesList = salesList;
      writeJson(SALES_PATH, salesList);
      serverTimestamps.salesList = Date.now();
      updated = true;
    }

    if (updated) {
      writeJson(TIMESTAMPS_PATH, serverTimestamps);
    }
    
    res.json({ success: true, data: state, timestamps: serverTimestamps });
  });

  // --- API ROUTE: BI-DIRECTIONAL REAL-TIME CONFLICT-FREE SYNC ---
  app.post("/api/sync", (req, res) => {
    const { clientTimestamps, clientData } = req.body;
    let writeNeeded = false;

    const collections = ["tasks", "usersList", "assigneesList", "salesList"] as const;
    const paths = {
      tasks: TASKS_PATH,
      usersList: USERS_PATH,
      assigneesList: ASSIGNEES_PATH,
      salesList: SALES_PATH
    };

    collections.forEach((col) => {
      const cTs = clientTimestamps?.[col] ? Number(clientTimestamps[col]) : 0;
      const sTs = serverTimestamps[col] ? Number(serverTimestamps[col]) : 0;

      if (cTs > sTs && clientData?.[col] !== undefined) {
        // Client data is newer, update server state and write file
        state[col] = clientData[col];
        serverTimestamps[col] = cTs;
        writeJson(paths[col], clientData[col]);
        writeNeeded = true;
      }
    });

    if (writeNeeded) {
      writeJson(TIMESTAMPS_PATH, serverTimestamps);
    }

    res.json({
      success: true,
      timestamps: serverTimestamps,
      data: state
    });
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
