/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Users,
  TrendingUp,
  Filter,
  RotateCcw,
  Download,
  Upload,
  X,
  FileSpreadsheet,
  LayoutDashboard,
  TableProperties,
  UserCheck,
  Calendar,
  Check,
  Mail,
  Send,
  Info,
  ChevronRight,
  TrendingDown,
  RefreshCw,
  Building2,
  CheckCircle2,
  Percent,
  Archive,
  ShieldAlert,
  AlertCircle,
  Star,
  Settings,
  Bell,
  BellRing,
  Megaphone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import {
  WorkTask,
  SERVICES_OPTIONS,
  DELIVERY_CHANNELS,
  STATUS_OPTIONS,
  INITIAL_TASKS
} from "./types";
// @ts-ignore
import phyathaiLogo from "./assets/images/phyathai2_logo_1781666038861.jpg";

const MONTHS_THAI = [
  { value: "01", label: "มกราคม (Jan)" },
  { value: "02", label: "กุมภาพันธ์ (Feb)" },
  { value: "03", label: "มีนาคม (Mar)" },
  { value: "04", label: "เมษายน (Apr)" },
  { value: "05", label: "พฤษภาคม (May)" },
  { value: "06", label: "มิถุนายน (Jun)" },
  { value: "07", label: "กรกฎาคม (Jul)" },
  { value: "08", label: "สิงหาคม (Aug)" },
  { value: "09", label: "กันยายน (Sep)" },
  { value: "10", label: "ตุลาคม (Oct)" },
  { value: "11", label: "พฤศจิกายน (Nov)" },
  { value: "12", label: "ธันวาคม (Dec)" }
];

// Beautiful Custom Tooltip for Recharts Visualizations
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 text-slate-100 p-2.5 rounded-lg border border-slate-800 shadow-xl text-xs font-sans space-y-1">
        <p className="font-bold text-slate-300">{label}</p>
        {payload.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 justify-between">
            <span className="flex items-center gap-1.5 font-light" style={{ color: item.color || item.fill }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              {item.name}:
            </span>
            <span className="font-bold text-white ml-2">
              {Number(item.value).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Static App Configuration
const SYSTEM_TODAY = "2026-06-11";
const STORAGE_KEY = "health_checkup_tracker_tasks_v1";
const SALES_STORAGE_KEY = "health_checkup_tracker_sales_v1";
const DEFAULT_SALES = ["รุ่งทิวา", "นัทชา", "พนัทดา", "ธิดาวัลย์", "สิริอาภา"];



export default function App() {
  // --- AUTH STATE & LOG-IN USER ---
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; role: "admin" | "user" } | null>(() => {
    const saved = localStorage.getItem("health_checkup_user_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Make sure it has a role property (migration)
        if (parsed && typeof parsed === "object") {
          const email = (parsed.email || "").toLowerCase();
          const role = parsed.role || (email === "sunissa@gmail.com" || email === "ja.sunisa255@gmail.com" ? "admin" : "user");
          return {
            email: parsed.email || "",
            name: parsed.name || "",
            role: role
          };
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // --- SYNCHRONIZATION AND CONFLICT RESOLUTION SYSTEM ---
  const TASKS_TS_KEY = "health_checkup_tracker_tasks_ts_v2";
  const SALES_TS_KEY = "health_checkup_tracker_sales_ts_v2";
  const ASSIGNEES_TS_KEY = "health_checkup_tracker_assignees_ts_v2";
  const USERS_TS_KEY = "health_checkup_tracker_users_ts_v2";

  const getLocalTimestamp = (key: string) => {
    const ts = localStorage.getItem(key);
    if (ts) return Number(ts);
    // If we have saved data locally from a previous session, default to a high baseline (so it overrides any fresh container template 0-timestamp)
    if (key === TASKS_TS_KEY && localStorage.getItem(STORAGE_KEY)) return 1718000000000;
    if (key === SALES_TS_KEY && localStorage.getItem(SALES_STORAGE_KEY)) return 1718000000000;
    if (key === ASSIGNEES_TS_KEY && localStorage.getItem("health_checkup_tracker_assignees_v1")) return 1718000000000;
    if (key === USERS_TS_KEY && localStorage.getItem("health_checkup_tracker_users_v1")) return 1718000000000;
    return 0;
  };

  const setLocalTimestamp = (key: string, val: number) => {
    localStorage.setItem(key, String(val));
  };

  const lastSyncedTasksRef = useRef<string>("");
  const lastSyncedUsersRef = useRef<string>("");
  const lastSyncedAssigneesRef = useRef<string>("");
  const lastSyncedSalesRef = useRef<string>("");
  const isSavingRef = useRef<boolean>(false);

  // Dynamic Login Accounts / Users - "ไม่ต้องโชว์ชื่อตรงหน้าแรก ให้admin จัดการเพิ่มลบได้เอง"
  const [usersList, setUsersList] = useState<{name: string, email: string, password: string, role: "admin" | "user"}[]>(() => {
    const saved = localStorage.getItem("health_checkup_tracker_users_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((usr: any) => {
            const email = (usr.email || "").toLowerCase();
            let name = usr.name || "";
            if (email === "sunissa@gmail.com") name = "Ammy";
            else if (email === "athittaya@gmail.com") name = "ตะวัน";
            else if (email === "raveewan@gmail.com") name = "ปุ้ม";
            else if (email === "ja.sunisa255@gmail.com") name = "จ๋า";
            return {
              name,
              email: usr.email || "",
              password: usr.password || "",
              role: usr.role || (email === "sunissa@gmail.com" || email === "ja.sunisa255@gmail.com" ? "admin" : "user")
            };
          });
        }
      } catch (e) {
        console.error("Failed to parse usersList", e);
      }
    }
    return [
      { name: "Ammy", email: "sunissa@gmail.com", password: "Ammy", role: "admin" },
      { name: "ปุ้ม", email: "raveewan@gmail.com", password: "Pumpuy", role: "user" },
      { name: "ตะวัน", email: "athittaya@gmail.com", password: "Taiwan", role: "user" },
      { name: "จ๋า", email: "ja.sunisa255@gmail.com", password: "Ja", role: "admin" }
    ];
  });

  // Sync users list to localStorage and Server
  useEffect(() => {
    const currentStr = JSON.stringify(usersList);
    localStorage.setItem("health_checkup_tracker_users_v1", currentStr);
    if (lastSyncedUsersRef.current && currentStr === lastSyncedUsersRef.current) {
      return;
    }
    // Changed locally, so bump timestamp and save
    lastSyncedUsersRef.current = currentStr;
    const now = Date.now();
    setLocalTimestamp(USERS_TS_KEY, now);

    isSavingRef.current = true;
    fetch("/api/save-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usersList })
    })
    .then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        if (body && body.timestamps) {
          const sTs = Number(body.timestamps.usersList) || Date.now();
          setLocalTimestamp(USERS_TS_KEY, sTs);
        }
      }
    })
    .catch(err => console.error("Error saving usersList to server:", err))
    .finally(() => {
      isSavingRef.current = false;
    });
  }, [usersList]);

  // Dynamic Assignees list - "ชื่อผู้รับผิดชอบสามารถเพิ่มหรือลบเองได้"
  const [assigneesList, setAssigneesList] = useState<string[]>(() => {
    const saved = localStorage.getItem("health_checkup_tracker_assignees_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((name: string) => name.trim());
        }
      } catch (e) {
        console.error("Failed to parse assigneesList", e);
      }
    }
    return ["Ammy", "ตะวัน", "ปุ้ม", "จ๋า"];
  });

  // Sync assignees list to localStorage and Server
  useEffect(() => {
    const currentStr = JSON.stringify(assigneesList);
    localStorage.setItem("health_checkup_tracker_assignees_v1", currentStr);
    if (lastSyncedAssigneesRef.current && currentStr === lastSyncedAssigneesRef.current) {
      return;
    }
    // Changed locally, so bump timestamp and save
    lastSyncedAssigneesRef.current = currentStr;
    const now = Date.now();
    setLocalTimestamp(ASSIGNEES_TS_KEY, now);

    isSavingRef.current = true;
    fetch("/api/save-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneesList })
    })
    .then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        if (body && body.timestamps) {
          const sTs = Number(body.timestamps.assigneesList) || Date.now();
          setLocalTimestamp(ASSIGNEES_TS_KEY, sTs);
        }
      }
    })
    .catch(err => console.error("Error saving assigneesList to server:", err))
    .finally(() => {
      isSavingRef.current = false;
    });
  }, [assigneesList]);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const getFormattedDateTime = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    return `${dd}/${mm} ${hours}:${mins}`;
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError("");

    const inputUser = loginEmail.trim();
    const inputPass = loginPassword.trim();

    if (!inputUser) {
      setLoginError("กรุณากรอกอีเมลหรือชื่อผู้เข้าใช้งาน");
      return;
    }
    
    if (!inputPass) {
      setLoginError("กรุณากรอกรหัสผ่าน");
      return;
    }

    // Check predefined users first from state
    const matched = usersList.find(user => 
      user.name === inputUser || 
      user.email.toLowerCase() === inputUser.toLowerCase() ||
      user.email.toLowerCase().split("@")[0] === inputUser.toLowerCase()
    );

    if (matched) {
      if (matched.password !== inputPass) {
        setLoginError(`รหัสผ่านไม่ถูกต้องสำหรับคุณ ${matched.name}`);
        return;
      }
      const sessionData = {
        email: matched.email,
        name: matched.name,
        role: matched.role || "user" as const
      };

      localStorage.setItem("health_checkup_user_session", JSON.stringify(sessionData));
      setCurrentUser(sessionData);
      showToast(`ยินดีต้อนรับคุณ ${matched.name} เข้าสู่ระบบ (สิทธิ์: ${sessionData.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งานทั่วไป"})`, "success");
      setLoginError("");
      setLoginEmail("");
      setLoginPassword("");
      return;
    }

    // Fallback: Check if general email and check general rules
    if (inputUser.includes("@")) {
      if (inputPass.length !== 6) {
        setLoginError("สำหรับบัญชีภายนอก รหัสผ่านต้องมีความยาว 6 ตัวอักษร");
        return;
      }
      const derivedName = inputUser.split("@")[0];
      const sessionData = {
        email: inputUser,
        name: derivedName,
        role: "user" as const
      };

      localStorage.setItem("health_checkup_user_session", JSON.stringify(sessionData));
      setCurrentUser(sessionData);
      showToast(`ยินดีต้อนรับคุณ ${derivedName} เข้าสู่ระบบหลัก`, "success");
      setLoginError("");
      setLoginEmail("");
      setLoginPassword("");
      return;
    }

    setLoginError("ไม่พบข้อมูลบัญชีหรือชื่อผู้ใช้นี้ กรุณาตรวจสอบอีเมลหรือชื่อผู้ใช้งานให้ถูกต้อง");
  };

  const handleLogout = () => {
    localStorage.removeItem("health_checkup_user_session");
    setCurrentUser(null);
    showToast("ออกจากระบบตรวจสุขภาพเรียบร้อยแล้ว", "info");
  };

  // --- STATE ---
  const [tasks, setTasks] = useState<WorkTask[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved tasks, restoring initial templates.", e);
      }
    }
    return INITIAL_TASKS;
  });

  // Dynamic Sales agent list
  const [salesList, setSalesList] = useState<string[]>(() => {
    const saved = localStorage.getItem(SALES_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse salesList", e);
      }
    }
    return DEFAULT_SALES;
  });

  // Sync sales list changes and Server
  useEffect(() => {
    const currentStr = JSON.stringify(salesList);
    localStorage.setItem(SALES_STORAGE_KEY, currentStr);
    if (lastSyncedSalesRef.current && currentStr === lastSyncedSalesRef.current) {
      return;
    }
    // Changed locally, so bump timestamp and save
    lastSyncedSalesRef.current = currentStr;
    const now = Date.now();
    setLocalTimestamp(SALES_TS_KEY, now);

    isSavingRef.current = true;
    fetch("/api/save-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salesList })
    })
    .then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        if (body && body.timestamps) {
          const sTs = Number(body.timestamps.salesList) || Date.now();
          setLocalTimestamp(SALES_TS_KEY, sTs);
        }
      }
    })
    .catch(err => console.error("Error saving salesList to server:", err))
    .finally(() => {
      isSavingRef.current = false;
    });
  }, [salesList]);

  // Track initial mount after states are fully in scope to avoid redundant writes
  useEffect(() => {
    lastSyncedTasksRef.current = JSON.stringify(tasks);
    lastSyncedUsersRef.current = JSON.stringify(usersList);
    lastSyncedAssigneesRef.current = JSON.stringify(assigneesList);
    lastSyncedSalesRef.current = JSON.stringify(salesList);
  }, []);

  // Sales Manage Modal State
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);

  // Urgent Task Action Notification States
  const [isUrgentModalOpen, setIsUrgentModalOpen] = useState(false);
  const [urgentTaskSelected, setUrgentTaskSelected] = useState<WorkTask | null>(null);
  const [urgentTeamNote, setUrgentTeamNote] = useState("");

  // Active View tabs
  const [activeTab, setActiveTab] = useState<"tasks" | "dashboard" | "backoffice">("tasks");
  const [dashboardSubTab, setDashboardSubTab] = useState<"kpi_overview" | "performance_individual">("kpi_overview");

  // Backoffice Form Inputs
  const [backofficeUserName, setBackofficeUserName] = useState("");
  const [backofficeUserEmail, setBackofficeUserEmail] = useState("");
  const [backofficeUserPassword, setBackofficeUserPassword] = useState("");
  const [backofficeUserRole, setBackofficeUserRole] = useState<"admin" | "user">("user");
  const [backofficeAssigneeName, setBackofficeAssigneeName] = useState("");
  const [backofficeSaleName, setBackofficeSaleName] = useState("");

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterSale, setFilterSale] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterDateBasis, setFilterDateBasis] = useState<"inspectionDate" | "contractEndDate" | "endDate">("inspectionDate");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(20);

  // Bulk Selection State
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Dynamically parse unique years from tasks
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    tasks.forEach(t => {
      if (t.inspectionDate && t.inspectionDate.length >= 4) {
        yearsSet.add(t.inspectionDate.substring(0, 4));
      }
      if (t.contractEndDate && t.contractEndDate.length >= 4) {
        yearsSet.add(t.contractEndDate.substring(0, 4));
      }
      if (t.endDate && t.endDate.length >= 4) {
        yearsSet.add(t.endDate.substring(0, 4));
      }
    });
    // Add default year
    yearsSet.add("2026");
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [tasks]);

  const [metricFilter, setMetricFilter] = useState<string>("all"); // used for quick cards filtering
  const [sortBy, setSortBy] = useState<keyof WorkTask | "">("contractEndDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Editing / Adding Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkTask | null>(null);

  // Form Fields State
  const [formDocNo, setFormDocNo] = useState("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formArCode, setFormArCode] = useState("");
  const [formEmployeeCount, setFormEmployeeCount] = useState(100);
  const [formActualEmployeeCount, setFormActualEmployeeCount] = useState(0);
  const [formInspectionDate, setFormInspectionDate] = useState("");
  const [formContractEndDate, setFormContractEndDate] = useState("");
  const [formIsExtendedContract, setFormIsExtendedContract] = useState(false);
  const [formOriginalContractEndDate, setFormOriginalContractEndDate] = useState("");
  const [formServices, setFormServices] = useState<string[]>([]);
  const [formServiceAssignees, setFormServiceAssignees] = useState<Record<string, string>>({});
  const [formServiceDeliveryChannels, setFormServiceDeliveryChannels] = useState<Record<string, string>>({});
  const [formChannel, setFormChannel] = useState<string>("");
  const [formAssignee, setFormAssignee] = useState<string>("");
  const [formSale, setFormSale] = useState<string>("");
  const [formCompanyGroup, setFormCompanyGroup] = useState<string>("");
  const [formWeight, setFormWeight] = useState<number>(1);
  const [formStatus, setFormStatus] = useState<"ยังไม่เริ่ม" | "กำลังทำ" | "✓ เรียบร้อยแล้ว">("ยังไม่เริ่ม");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formDeliveryDetail, setFormDeliveryDetail] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIsUrgent, setFormIsUrgent] = useState(false);
  const [formUrgentNote, setFormUrgentNote] = useState("");

  // CSV Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState("");
  const [importPreview, setImportPreview] = useState<Partial<WorkTask>[]>([]);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast System for user feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  const isFirstFetchRef = useRef(true);

  // Helper to retrieve and merge state from server with bidirectional sync
  const fetchAllDataFromServer = async (silent = false) => {
    if (isSavingRef.current && !isFirstFetchRef.current) {
      return;
    }
    try {
      // 1. Gather our local timestamps
      const clientTimestamps = {
        tasks: getLocalTimestamp(TASKS_TS_KEY),
        usersList: getLocalTimestamp(USERS_TS_KEY),
        assigneesList: getLocalTimestamp(ASSIGNEES_TS_KEY),
        salesList: getLocalTimestamp(SALES_TS_KEY)
      };

      // 2. Prepare client data payload
      const clientData = {
        tasks: tasks,
        usersList: usersList,
        assigneesList: assigneesList,
        salesList: salesList
      };

      // 3. POST to /api/sync
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientTimestamps, clientData })
      });

      if (res.ok) {
        const body = await res.json();
        if (body && body.timestamps && body.data) {
          const sTimestamps = body.timestamps;
          const sData = body.data;

          const isFirstFetch = isFirstFetchRef.current;
          if (isFirstFetch) {
            isFirstFetchRef.current = false;
          }

          // Merge or update tasks
          if (sData.tasks) {
            const sTs = Number(sTimestamps.tasks) || 0;
            const cTs = clientTimestamps.tasks;

            let finalTasks = tasks;
            if (sTs > cTs || isFirstFetch) {
              let changedFromServer = false;
              if (isFirstFetch) {
                // Bi-directional merge of missing records on first boot
                const mergedMap = new Map<string, WorkTask>();
                sData.tasks.forEach((t: WorkTask) => { if (t?.id) mergedMap.set(t.id, t); });
                tasks.forEach((t: WorkTask) => { if (t?.id) mergedMap.set(t.id, t); });
                finalTasks = Array.from(mergedMap.values());
                changedFromServer = JSON.stringify(finalTasks) !== JSON.stringify(sData.tasks);
              } else {
                finalTasks = sData.tasks;
              }

              // Update React state, memory ref and localStorage
              const finalStr = JSON.stringify(finalTasks);
              lastSyncedTasksRef.current = (isFirstFetch && changedFromServer) ? "" : finalStr;
              setTasks(finalTasks);
              localStorage.setItem(STORAGE_KEY, finalStr);
              setLocalTimestamp(TASKS_TS_KEY, Math.max(sTs, cTs));
            }
          }

          // Merge or update usersList
          if (sData.usersList) {
            const sTs = Number(sTimestamps.usersList) || 0;
            const cTs = clientTimestamps.usersList;

            let finalUsers = usersList;
            if (sTs > cTs || isFirstFetch) {
              let changedFromServer = false;
              if (isFirstFetch) {
                const mergedMap = new Map<string, any>();
                sData.usersList.forEach((u: any) => { if (u?.email) mergedMap.set(u.email.toLowerCase(), u); });
                usersList.forEach((u: any) => {
                  if (u?.email) {
                    const emailLower = u.email.toLowerCase();
                    const existing = mergedMap.get(emailLower);
                    if (!existing) mergedMap.set(emailLower, u);
                    else mergedMap.set(emailLower, { ...existing, ...u });
                  }
                });
                finalUsers = Array.from(mergedMap.values());
                changedFromServer = JSON.stringify(finalUsers) !== JSON.stringify(sData.usersList);
              } else {
                finalUsers = sData.usersList;
              }

              const finalStr = JSON.stringify(finalUsers);
              lastSyncedUsersRef.current = (isFirstFetch && changedFromServer) ? "" : finalStr;
              setUsersList(finalUsers);
              localStorage.setItem("health_checkup_tracker_users_v1", finalStr);
              setLocalTimestamp(USERS_TS_KEY, Math.max(sTs, cTs));
            }
          }

          // Merge or update assigneesList
          if (sData.assigneesList) {
            const sTs = Number(sTimestamps.assigneesList) || 0;
            const cTs = clientTimestamps.assigneesList;

            let finalAssignees = assigneesList;
            if (sTs > cTs || isFirstFetch) {
              let changedFromServer = false;
              if (isFirstFetch) {
                const uniqueSet = new Set<string>();
                sData.assigneesList.forEach((a: string) => { if (a && a.trim()) uniqueSet.add(a.trim()); });
                assigneesList.forEach((a: string) => { if (a && a.trim()) uniqueSet.add(a.trim()); });
                finalAssignees = Array.from(uniqueSet);
                changedFromServer = JSON.stringify(finalAssignees) !== JSON.stringify(sData.assigneesList);
              } else {
                finalAssignees = sData.assigneesList;
              }

              const finalStr = JSON.stringify(finalAssignees);
              lastSyncedAssigneesRef.current = (isFirstFetch && changedFromServer) ? "" : finalStr;
              setAssigneesList(finalAssignees);
              localStorage.setItem("health_checkup_tracker_assignees_v1", finalStr);
              setLocalTimestamp(ASSIGNEES_TS_KEY, Math.max(sTs, cTs));
            }
          }

          // Merge or update salesList
          if (sData.salesList) {
            const sTs = Number(sTimestamps.salesList) || 0;
            const cTs = clientTimestamps.salesList;

            let finalSales = salesList;
            if (sTs > cTs || isFirstFetch) {
              let changedFromServer = false;
              if (isFirstFetch) {
                const uniqueSet = new Set<string>();
                sData.salesList.forEach((s: string) => { if (s && s.trim()) uniqueSet.add(s.trim()); });
                salesList.forEach((s: string) => { if (s && s.trim()) uniqueSet.add(s.trim()); });
                finalSales = Array.from(uniqueSet);
                changedFromServer = JSON.stringify(finalSales) !== JSON.stringify(sData.salesList);
              } else {
                finalSales = sData.salesList;
              }

              const finalStr = JSON.stringify(finalSales);
              lastSyncedSalesRef.current = (isFirstFetch && changedFromServer) ? "" : finalStr;
              setSalesList(finalSales);
              localStorage.setItem(SALES_STORAGE_KEY, finalStr);
              setLocalTimestamp(SALES_TS_KEY, Math.max(sTs, cTs));
            }
          }
        }
      }
    } catch (e) {
      if (!silent) {
        console.error("Failed to sync data with server", e);
      }
    }
  };

  // Fetch initial data and start client polling to keep different users perfectly synchronized in real-time
  useEffect(() => {
    fetchAllDataFromServer();

    const interval = setInterval(() => {
      fetchAllDataFromServer(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // --- PERSISTENCE ---
  useEffect(() => {
    const currentStr = JSON.stringify(tasks);
    localStorage.setItem(STORAGE_KEY, currentStr);
    if (lastSyncedTasksRef.current && currentStr === lastSyncedTasksRef.current) {
      return;
    }
    // Changed locally, so bump timestamp and save
    lastSyncedTasksRef.current = currentStr;
    const now = Date.now();
    setLocalTimestamp(TASKS_TS_KEY, now);

    isSavingRef.current = true;
    fetch("/api/save-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks })
    })
    .then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        if (body && body.timestamps) {
          const sTs = Number(body.timestamps.tasks) || Date.now();
          setLocalTimestamp(TASKS_TS_KEY, sTs);
        }
      }
    })
    .catch(err => console.error("Error saving tasks to server:", err))
    .finally(() => {
      isSavingRef.current = false;
    });
  }, [tasks]);

  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // --- CALCULATION FOR METRICS (OVERALL PROGRESS) ---
  const todayDateObj = useMemo(() => new Date(SYSTEM_TODAY), []);

  const getIsTaskOverdue = (task: WorkTask) => {
    if (task.status === "✓ เรียบร้อยแล้ว" || !task.contractEndDate) return false;
    const end = new Date(task.contractEndDate);
    return end < todayDateObj;
  };

  // --- DASHBOARD MO/YR FILTERED TASKS SUBSET ---
  const dashboardTasks = useMemo(() => {
    return tasks.filter(task => {
      const targetDate = task[filterDateBasis];
      if (!targetDate) return filterYear === "all" && filterMonth === "all";
      
      const parts = targetDate.split("-");
      if (parts.length < 2) return filterYear === "all" && filterMonth === "all";
      const year = parts[0];
      const month = parts[1];
      
      const matchYear = filterYear === "all" || year === filterYear;
      const matchMonth = filterMonth === "all" || month === filterMonth;
      
      return matchYear && matchMonth;
    });
  }, [tasks, filterYear, filterMonth, filterDateBasis]);

  const metrics = useMemo(() => {
    const total = dashboardTasks.length;
    const completed = dashboardTasks.filter(t => t.status === "✓ เรียบร้อยแล้ว").length;
    const inProgress = dashboardTasks.filter(t => t.status === "กำลังทำ").length;
    const notStarted = dashboardTasks.filter(t => t.status === "ยังไม่เริ่ม").length;
    const overdue = dashboardTasks.filter(t => getIsTaskOverdue(t)).length;

    return { total, completed, inProgress, notStarted, overdue };
  }, [dashboardTasks]);

  // --- CALCULATIONS FOR TEAM PERFORMANCE ---
  const teamPerformance = useMemo(() => {
    return assigneesList.map(member => {
      // Find all tasks where this user is active in the current dashboard context
      const activeTasks = dashboardTasks.filter(t => {
        const isCoordinator = t.assignee === member;
        const hasServiceAssigned = t.selectedServices?.some(s => {
          const sAssignee = t.serviceAssignees?.[s] || t.assignee;
          return sAssignee === member;
        });
        return isCoordinator || hasServiceAssigned;
      });

      const totalAssigned = activeTasks.length;

      // Completed Tasks active in
      const completedTasks = activeTasks.filter(t => t.status === "✓ เรียบร้อยแล้ว");
      const completedCount = completedTasks.length;

      // In-Progress Tasks active in
      const inProgressTasks = activeTasks.filter(t => t.status === "กำลังทำ");
      const inProgressCount = inProgressTasks.length;

      // Not Started Tasks active in
      const notStartedTasks = activeTasks.filter(t => t.status === "ยังไม่เริ่ม");
      const notStartedCount = notStartedTasks.length;

      // Sum of employees managed successfully (proportional to services assigned)
      const completedEmployees = completedTasks.reduce((sum, t) => {
        const totalServices = t.selectedServices?.length || 1;
        const myServicesCount = t.selectedServices?.filter(s => {
          const sAssignee = t.serviceAssignees?.[s] || t.assignee;
          return sAssignee === member;
        }).length || 0;
        
        const proportion = myServicesCount / totalServices;
        const finalProportion = proportion > 0 ? proportion : (t.assignee === member ? 1 : 0);
        return sum + Math.round((Number(t.employeeCount) || 0) * finalProportion);
      }, 0);

      // Sum of weight scores (accumulated difficulty) for completed tasks
      const completedWeight = completedTasks.reduce((sum, t) => {
        const totalServices = t.selectedServices?.length || 1;
        const myServicesCount = t.selectedServices?.filter(s => {
          const sAssignee = t.serviceAssignees?.[s] || t.assignee;
          return sAssignee === member;
        }).length || 0;
        
        const proportion = myServicesCount / totalServices;
        const finalProportion = proportion > 0 ? proportion : (t.assignee === member ? 1 : 0);
        return sum + (Number(t.weightScore) || 0) * finalProportion;
      }, 0);

      // Calculate progress code bar like Sunisa format: ████████░░ 80%
      let progressPercentage = 0;
      if (totalAssigned > 0) {
        progressPercentage = Math.round((completedCount / totalAssigned) * 100);
        progressPercentage = Math.min(progressPercentage, 100);
      }

      // Generate visual text blocks (10 total characters)
      const filledBricks = Math.round(progressPercentage / 10);
      const emptyBricks = 10 - filledBricks;
      const progressTextIcon = "█".repeat(filledBricks) + "░".repeat(Math.max(0, emptyBricks));

      return {
        name: member,
        completedCount,
        inProgressCount,
        notStartedCount,
        completedEmployees,
        completedWeight: Number(completedWeight.toFixed(1)),
        totalAssigned,
        progressPercentage,
        progressTextIcon
      };
    });
  }, [dashboardTasks, assigneesList]);

  // --- CALCULATE DATA FOR THE NEW BAR CHARTS (COMPANIES, SERVICES, EMPLOYEES) ---
  const chartPerformanceData = useMemo(() => {
    return assigneesList.map(member => {
      // Find all tasks where this user is active
      const activeTasks = dashboardTasks.filter(t => {
        const isCoordinator = t.assignee === member;
        const hasServiceAssigned = t.selectedServices?.some(s => {
          const sAssignee = t.serviceAssignees?.[s] || t.assignee;
          return sAssignee === member;
        });
        return isCoordinator || hasServiceAssigned;
      });

      const companies = activeTasks.length;

      // Cumulative employees based on proportional service assignment
      const employees = activeTasks.reduce((sum, t) => {
        const totalServices = t.selectedServices?.length || 1;
        const myServicesCount = t.selectedServices?.filter(s => {
          const sAssignee = t.serviceAssignees?.[s] || t.assignee;
          return sAssignee === member;
        }).length || 0;
        const proportion = myServicesCount / totalServices;
        const finalProportion = proportion > 0 ? proportion : (t.assignee === member ? 1 : 0);
        return sum + Math.round((Number(t.employeeCount) || 0) * finalProportion);
      }, 0);

      let companySummaryCount = 0;
      let excelFileCount = 0;
      let hrReportCount = 0;
      let walkThroughSurveyCount = 0;
      let riskFactorCount = 0;
      let jps1Count = 0;
      let execSummaryCount = 0;

      // Only count services directly assigned to this specific member!
      dashboardTasks.forEach(t => {
        if (t.selectedServices) {
          t.selectedServices.forEach(s => {
            const sAssignee = t.serviceAssignees?.[s] || t.assignee;
            if (sAssignee === member) {
              if (s === "สรุปรวมองค์กร" || s === "Summary Report (สรุปรวมองค์กร)") companySummaryCount++;
              else if (s === "Excel" || s === "เอกเซลล์ไฟล์" || s === "Excel File") excelFileCount++;
              else if (s === "ใบรายงานสำหรับ HR" || s === "ใบรายงาน For Hr" || s === "ใบรายงานผลสำหรับ HR") hrReportCount++;
              else if (s === "walk through survey") walkThroughSurveyCount++;
              else if (s === "ปัจจัยเสี่ยง") riskFactorCount++;
              else if (s === "จผส.1") jps1Count++;
              else if (s === "Executive summary" || s === "Excutice Summary (canva)") execSummaryCount++;
            }
          });
        }
      });

      return {
        name: member,
        "จำนวนบริษัท": companies,
        "จำนวนพนักงาน": employees,
        "สรุปรวมองค์กร": companySummaryCount,
        "Excel": excelFileCount,
        "ใบรายงานสำหรับ HR": hrReportCount,
        "walk through survey": walkThroughSurveyCount,
        "ปัจจัยเสี่ยง": riskFactorCount,
        "จผส.1": jps1Count,
        "Executive summary": execSummaryCount,
        "จำนวนงานบริการทั้งหมด": companySummaryCount + excelFileCount + hrReportCount + walkThroughSurveyCount + riskFactorCount + jps1Count + execSummaryCount
      };
    });
  }, [dashboardTasks, assigneesList]);

  // --- CALCULATE STATUS DATA FOR PIE CHART (COMPLETED VS PENDING) ---
  const pieStatusData = useMemo(() => {
    const completedCount = dashboardTasks.filter(t => t.status === "✓ เรียบร้อยแล้ว").length;
    const pendingCount = dashboardTasks.filter(t => t.status === "กำลังทำ" || t.status === "ยังไม่เริ่ม").length;
    
    return [
      { name: "งานเสร็จ (Completed)", value: completedCount, color: "#10b981" },
      { name: "งานค้าง (Pending)", value: pendingCount, color: "#f43f5e" }
    ];
  }, [dashboardTasks]);

  // --- DEPARTMENT AND SERVICE TYPE KPI CALCULATIONS ---
  const getDaysDiff = (dateStr1: string, dateStr2: string) => {
    if (!dateStr1 || !dateStr2) return null;
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    const d1Ms = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const d2Ms = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    const diffTime = d1Ms - d2Ms;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const departmentKPI = useMemo(() => {
    // Filter tasks which have contractEndDate defined because KPI is based on contractEndDate
    const tasksWithContract = dashboardTasks.filter(t => t.contractEndDate);
    const totalWithContract = tasksWithContract.length;

    // 1. Completed on time: status: ✓ เรียบร้อยแล้ว, endDate <= contractEndDate + 30 days
    const completedOnTime = tasksWithContract.filter(t => {
      if (t.status !== "✓ เรียบร้อยแล้ว") return false;
      const diff = getDaysDiff(t.endDate || SYSTEM_TODAY, t.contractEndDate);
      return diff !== null && diff <= 30;
    });

    // 2. Completed late: status: ✓ เรียบร้อยแล้ว, endDate > contractEndDate + 30 days
    const completedLate = tasksWithContract.filter(t => {
      if (t.status !== "✓ เรียบร้อยแล้ว") return false;
      const diff = getDaysDiff(t.endDate || SYSTEM_TODAY, t.contractEndDate);
      return diff !== null && diff > 30;
    });

    // 3. Pending inside 30 days limit (Active on-track): status !== ✓ เรียบร้อยแล้ว, today <= contractEndDate + 30 days
    const pendingOnTrack = tasksWithContract.filter(t => {
      if (t.status === "✓ เรียบร้อยแล้ว") return false;
      const diff = getDaysDiff(SYSTEM_TODAY, t.contractEndDate);
      return diff !== null && diff <= 30;
    });

    // 4. Pending late beyond 30 days limit (Overdue KPI): status !== ✓ เรียบร้อยแล้ว, today > contractEndDate + 30 days
    const pendingOverdueFailed = tasksWithContract.filter(t => {
      if (t.status === "✓ เรียบร้อยแล้ว") return false;
      const diff = getDaysDiff(SYSTEM_TODAY, t.contractEndDate);
      return diff !== null && diff > 30;
    });

    // Overall Success rate calculation
    const successCount = completedOnTime.length + pendingOnTrack.length;
    const failCount = completedLate.length + pendingOverdueFailed.length;
    const kpiRate = totalWithContract > 0 ? Math.round((successCount / totalWithContract) * 100) : 100;

    // Service Choice Breakdown
    const serviceOptionsBreakdown = SERVICES_OPTIONS.map(srv => {
      const associatedTasks = dashboardTasks.filter(t => {
        if (!t.selectedServices) return srv === "บริษัทไม่รับผลใดๆ";
        
        if (srv === "รับงานทุกงาน") {
          return t.selectedServices.includes("รับงานทุกงาน") || 
            (t.selectedServices.includes("สรุปรวมองค์กร") && t.selectedServices.includes("Excel") && t.selectedServices.includes("ใบรายงานสำหรับ HR")) ||
            t.selectedServices.length >= 4;
        }
        
        if (srv === "บริษัทไม่รับผลใดๆ") {
          return t.selectedServices.includes("บริษัทไม่รับผลใดๆ") || t.selectedServices.length === 0;
        }

        if (srv === "บริษัทไม่มียอดเข้าตรวจ") {
          return t.selectedServices.includes("บริษัทไม่มียอดเข้าตรวจ");
        }
        
        return t.selectedServices.includes(srv) && 
          !t.selectedServices.includes("บริษัทไม่รับผลใดๆ") && 
          !t.selectedServices.includes("บริษัทไม่มียอดเข้าตรวจ");
      });

      const totalEmployeesForService = associatedTasks.reduce((sum, t) => sum + (Number(t.employeeCount) || 0), 0);
      return {
        serviceName: srv,
        companyCount: associatedTasks.length,
        totalEmployees: totalEmployeesForService,
        companies: associatedTasks.map(t => ({
          id: t.id,
          name: t.companyName,
          docNo: t.docNo,
          assignee: t.assignee,
          status: t.status,
          contractEndDate: t.contractEndDate,
          inspectionDate: t.inspectionDate
        }))
      };
    }).sort((a, b) => b.companyCount - a.companyCount);

    // Count contract extensions
    const extendedTasks = dashboardTasks.filter(t => t.isExtendedContract);
    const extendedContractCount = extendedTasks.length;

    return {
      totalWithContract,
      completedOnTime,
      completedLate,
      pendingOnTrack,
      pendingOverdueFailed,
      successCount,
      failCount,
      kpiRate,
      serviceBreakdown: serviceOptionsBreakdown,
      extendedContractCount,
      extendedTasks
    };
  }, [dashboardTasks]);

  // --- FILTERING & SORTING LOGIC ---
  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => {
        // Text Match
        const matchQuery =
          task.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.docNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.arCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.companyGroup && task.companyGroup.toLowerCase().includes(searchQuery.toLowerCase())) ||
          task.notes.toLowerCase().includes(searchQuery.toLowerCase());

        // Dropdown filter: Assignee
        const matchAssignee = filterAssignee === "all" || task.assignee === filterAssignee;

        // Dropdown filter: Sale
        const matchSale = filterSale === "all" || task.sale === filterSale;

        // Dropdown filter: Status
        const matchStatus = filterStatus === "all" || task.status === filterStatus;

        // Dropdown filter: Delivery Channel
        const matchChannel = filterChannel === "all" || 
          (filterChannel === "E-mail" && task.deliveryChannel === "E-mail") ||
          (filterChannel === "ไปรษณีย์" && task.deliveryChannel === "ไปรษณีย์") ||
          (filterChannel === "อื่นๆ" && task.deliveryChannel !== "E-mail" && task.deliveryChannel !== "ไปรษณีย์");

        // Dropdown filter: Year and Month based on selected Date Basis
        let matchDateMoYr = true;
        const targetDate = task[filterDateBasis];
        if (targetDate) {
          const parts = targetDate.split("-");
          if (parts.length >= 2) {
            const y = parts[0];
            const m = parts[1];
            const matchY = filterYear === "all" || y === filterYear;
            const matchM = filterMonth === "all" || m === filterMonth;
            matchDateMoYr = matchY && matchM;
          } else {
            matchDateMoYr = filterYear === "all" && filterMonth === "all";
          }
        } else {
          matchDateMoYr = filterYear === "all" && filterMonth === "all";
        }

        // Metric Card click filter helper
        let matchMetric = true;
        if (metricFilter === "completed") {
          matchMetric = task.status === "✓ เรียบร้อยแล้ว";
        } else if (metricFilter === "inprogress") {
          matchMetric = task.status === "กำลังทำ";
        } else if (metricFilter === "notstarted") {
          matchMetric = task.status === "ยังไม่เริ่ม";
        } else if (metricFilter === "overdue") {
          matchMetric = getIsTaskOverdue(task);
        } else if (metricFilter === "all_count") {
          matchMetric = true;
        }

        return matchQuery && matchAssignee && matchStatus && matchChannel && matchDateMoYr && matchMetric && matchSale;
      })
      .sort((a, b) => {
        // Force urgent tasks to the top
        const aUrgent = a.isUrgent ? 1 : 0;
        const bUrgent = b.isUrgent ? 1 : 0;
        if (aUrgent !== bUrgent) {
          return bUrgent - aUrgent; // 1 (urgent) before 0 (normal)
        }

        if (!sortBy) return 0;

        let aVal = a[sortBy] !== undefined && a[sortBy] !== null ? a[sortBy] : "";
        let bVal = b[sortBy] !== undefined && b[sortBy] !== null ? b[sortBy] : "";

        // Format to comparable numbers/strings
        if (typeof aVal === "string") {
          aVal = (aVal as string).toLowerCase();
          bVal = (bVal as string).toLowerCase();
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [tasks, searchQuery, filterAssignee, filterSale, filterStatus, filterChannel, filterYear, filterMonth, filterDateBasis, metricFilter, sortBy, sortDirection]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterAssignee, filterSale, filterStatus, filterChannel, filterYear, filterMonth, filterDateBasis, metricFilter, sortBy, sortDirection, pageSize]);

  // Calculate Paginated Tasks
  const paginatedTasks = useMemo(() => {
    if (pageSize === "all") return filteredTasks;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTasks.slice(startIndex, startIndex + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  const totalPages = pageSize === "all" ? 1 : Math.ceil(filteredTasks.length / pageSize);

  // --- QUICK TASK MANAGEMENT HANDLERS ---
  const handleToggleStatus = (id: string) => {
    setTasks(prev =>
      prev.map(task => {
        if (task.id === id) {
          const currentStatus = task.status;
          let nextStatus: "ยังไม่เริ่ม" | "กำลังทำ" | "✓ เรียบร้อยแล้ว";
          let updatedDates = {};

          if (currentStatus === "ยังไม่เริ่ม") {
            nextStatus = "กำลังทำ";
            updatedDates = { startDate: SYSTEM_TODAY };
          } else if (currentStatus === "กำลังทำ") {
            nextStatus = "✓ เรียบร้อยแล้ว";
            updatedDates = { endDate: SYSTEM_TODAY };
          } else {
            nextStatus = "ยังไม่เริ่ม";
            updatedDates = { startDate: "", endDate: "" };
          }

          showToast(`เปลี่ยนสถานะงานของ ${task.companyName} เป็น "${nextStatus}" เรียบร้อย`, "info");
          return {
            ...task,
            status: nextStatus,
            ...updatedDates,
            lastEditedBy: currentUser?.email || "Ja.sunisa255@gmail.com",
            lastEditedAt: getFormattedDateTime()
          };
        }
        return task;
      })
    );
  };

  const handleDeleteTask = (id: string, name: string) => {
    if (confirm(`คุณเคยมั่นใจใช่หรือไม่ว่าจะลบงานของ "${name}" ?`)) {
      setTasks(prev => prev.filter(t => t.id !== id));
      setSelectedTaskIds(prev => prev.filter(taskId => taskId !== id));
      showToast(`ลบข้อมูลงานของ ${name} สำเร็จ`, "warning");
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTaskIds(paginatedTasks.map(t => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const handleSelectTask = (id: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(taskId => taskId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedTaskIds.length === 0) return;
    if (window.confirm(`คุณต้องการลบข้อมูลจำนวน ${selectedTaskIds.length} แถวที่เลือกไว้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
      setSelectedTaskIds([]);
      showToast(`ลบข้อมูล ${selectedTaskIds.length} รายการสำเร็จ`, "success");
    }
  };

  const handleDuplicateTask = (task: WorkTask) => {
    // Generate new docNo and id
    const newId = Date.now().toString();
    const newDocPattern = `DOC-2026-${Math.floor(100 + Math.random() * 900)}`;

    const duplicated: WorkTask = {
      ...task,
      id: newId,
      docNo: newDocPattern,
      companyName: `${task.companyName} (คัดลอก)`,
      status: "ยังไม่เริ่ม",
      startDate: "",
      endDate: "",
      deliveryDetail: ""
    };

    setTasks(prev => [duplicated, ...prev]);
    showToast(`คัดลอกข้อมูลงานไปยัง ${duplicated.companyName} สำเร็จ`, "success");
  };

  const handleTriggerUrgent = (task: WorkTask) => {
    setUrgentTaskSelected(task);
    setUrgentTeamNote(task.isUrgent ? (task.urgentNote || "").split(" (แจ้งโดย:")[0] : "");
    setIsUrgentModalOpen(true);
  };

  const handleSaveUrgent = () => {
    if (!urgentTaskSelected) return;
    const finalNote = urgentTeamNote.trim();
    setTasks(prev => prev.map(t => {
      if (t.id === urgentTaskSelected.id) {
        return {
          ...t,
          isUrgent: true,
          urgentNote: finalNote ? `${finalNote} (แจ้งโดย: ${currentUser?.name || "สุนิสสา"})` : `ตามงานด่วนที่สุด (แจ้งโดย: ${currentUser?.name || "สุนิสสา"})`,
          lastEditedBy: currentUser?.email || "Ja.sunisa255@gmail.com",
          lastEditedAt: getFormattedDateTime()
        };
      }
      return t;
    }));
    showToast(`ส่งแจ้งเตือนตามด่วนบริษัท ${urgentTaskSelected.companyName} สำเร็จ`, "info");
    setIsUrgentModalOpen(false);
    setUrgentTaskSelected(null);
    setUrgentTeamNote("");
  };

  const handleResolveUrgent = (task: WorkTask) => {
    setTasks(prev => prev.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          isUrgent: false,
          urgentNote: "",
          lastEditedBy: currentUser?.email || "Ja.sunisa255@gmail.com",
          lastEditedAt: getFormattedDateTime()
        };
      }
      return t;
    }));
    showToast(`ยกเลิกสถานะตามด่วนพนักงาน ${task.companyName} แล้ว`, "success");
  };

  // --- FORM OPEN HANDLER ---
  const handleOpenForm = (task: WorkTask | null = null) => {
    if (task) {
      setSelectedTask(task);
      setFormDocNo(task.docNo);
      setFormCompanyName(task.companyName);
      setFormArCode(task.arCode);
      setFormEmployeeCount(task.employeeCount);
      setFormActualEmployeeCount(task.actualEmployeeCount !== undefined ? task.actualEmployeeCount : task.employeeCount);
      setFormInspectionDate(task.inspectionDate);
      setFormContractEndDate(task.contractEndDate);
      setFormIsExtendedContract(task.isExtendedContract || false);
      setFormOriginalContractEndDate(task.originalContractEndDate || "");
      setFormServices(task.selectedServices);
      setFormServiceAssignees(task.serviceAssignees || {});
      setFormServiceDeliveryChannels(task.serviceDeliveryChannels || {});
      setFormChannel(task.deliveryChannel);
      setFormAssignee(task.assignee);
      setFormSale(task.sale || "");
      setFormCompanyGroup(task.companyGroup || "");
      setFormWeight(task.weightScore);
      setFormStatus(task.status);
      setFormStartDate(task.startDate);
      setFormEndDate(task.endDate);
      setFormDeliveryDetail(task.deliveryDetail);
      setFormNotes(task.notes);
      setFormIsUrgent(task.isUrgent || false);
      setFormUrgentNote(task.urgentNote || "");
    } else {
      setSelectedTask(null);
      // Auto-increment simple code or random code
      const randNo = Math.floor(100 + Math.random() * 900);
      setFormDocNo(`DOC-2026-${randNo}`);
      setFormCompanyName("");
      setFormArCode("");
      setFormEmployeeCount(100);
      setFormActualEmployeeCount(0);
      setFormInspectionDate(SYSTEM_TODAY);
      setFormContractEndDate("");
      setFormIsExtendedContract(false);
      setFormOriginalContractEndDate("");
      setFormServices(["สรุปรวมองค์กร", "Excel", "ใบรายงานสำหรับ HR"]);
      setFormServiceAssignees({});
      setFormServiceDeliveryChannels({});
      setFormChannel("E-mail");
      setFormAssignee(currentUser?.name || "สุนิสสา");
      setFormSale("");
      setFormCompanyGroup("");
      setFormWeight(1);
      setFormStatus("ยังไม่เริ่ม");
      setFormStartDate("");
      setFormEndDate("");
      setFormDeliveryDetail("");
      setFormNotes("");
      setFormIsUrgent(false);
      setFormUrgentNote("");
    }
    setIsFormOpen(true);
  };

  // --- SAVE FORM DATA ---
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCompanyName.trim()) {
      alert("กรุณากรอกชื่อบริษัท");
      return;
    }

    const taskData: WorkTask = {
      id: selectedTask ? selectedTask.id : Date.now().toString(),
      docNo: formDocNo.trim() || "-",
      companyName: formCompanyName,
      arCode: formArCode || "-",
      employeeCount: Number(formEmployeeCount) || 0,
      actualEmployeeCount: Number(formActualEmployeeCount) || 0,
      inspectionDate: formInspectionDate,
      contractEndDate: formContractEndDate,
      isExtendedContract: formIsExtendedContract,
      originalContractEndDate: formIsExtendedContract ? formOriginalContractEndDate : "",
      selectedServices: formServices,
      serviceAssignees: formServiceAssignees,
      serviceDeliveryChannels: formServiceDeliveryChannels,
      deliveryChannel: formChannel,
      assignee: formAssignee || "สุนิสสา",
      sale: formSale,
      companyGroup: formCompanyGroup.trim(),
      weightScore: Number(formWeight) || 1,
      status: formStatus,
      startDate: formStartDate,
      endDate: formEndDate,
      deliveryDetail: formDeliveryDetail,
      notes: formNotes,
      isUrgent: formIsUrgent,
      urgentNote: formIsUrgent ? formUrgentNote : "",
      lastEditedBy: currentUser?.email || "Ja.sunisa255@gmail.com",
      lastEditedAt: getFormattedDateTime()
    };

    // Auto-populate dates based on status if not filled to assist user speed
    if (formStatus === "✓ เรียบร้อยแล้ว" && !taskData.endDate) {
      taskData.endDate = SYSTEM_TODAY;
    }
    if (formStatus === "กำลังทำ" && !taskData.startDate) {
      taskData.startDate = SYSTEM_TODAY;
    }

    // --- DUPLICATE CHECKS FOR AR CODE & COMPANY NAME ---
    const normalizedCompany = taskData.companyName.trim().toLowerCase();
    const normalizedArCode = taskData.arCode.trim().toLowerCase();

    const duplicateCompany = tasks.find(t => 
      (!selectedTask || t.id !== selectedTask.id) && 
      t.companyName.trim().toLowerCase() === normalizedCompany
    );

    const duplicateAr = (normalizedArCode && normalizedArCode !== "-" && normalizedArCode !== "ไม่มี" && normalizedArCode !== "ไม่ระบุ")
      ? tasks.find(t => 
          (!selectedTask || t.id !== selectedTask.id) && 
          t.arCode && t.arCode.trim().toLowerCase() === normalizedArCode
        )
      : null;

    if (duplicateCompany || duplicateAr) {
      let duplicateWarnings: string[] = [];
      if (duplicateCompany) {
        duplicateWarnings.push(`ชื่อบริษัทซ้ำ: "${duplicateCompany.companyName}"`);
      }
      if (duplicateAr) {
        duplicateWarnings.push(`รหัส AR Code ซ้ำ: "${duplicateAr.arCode}" (บริษัท "${duplicateAr.companyName}")`);
      }

      const confirmSave = window.confirm(
        `🚨 ตรวจพบข้อมูลซ้ำซ้อนในระบบ:\n${duplicateWarnings.map(w => `• ${w}`).join("\n")}\n\nคุณยังต้องการบันทึกข้อมูลนี้ต่อไปหรือไม่?`
      );
      if (!confirmSave) {
        return; // Halt and don't save
      }
    }

    if (selectedTask) {
      setTasks(prev => prev.map(t => (t.id === selectedTask.id ? taskData : t)));
      showToast(`แก้ไขข้อมูลบริษัท ${taskData.companyName} สำเร็จ`, "success");
    } else {
      setTasks(prev => [taskData, ...prev]);
      showToast(`บันทึกข้อมูลบริษัทใหม่ ${taskData.companyName} สำเร็จ`, "success");
    }

    setIsFormOpen(false);
  };

  // --- IMPORT / EXPORT TO CSV ---
  const handleExportCSV = () => {
    // Generate simple Thai-friendly CSV
    const headers = [
      "เลขที่เอกสาร",
      "ชื่อบริษัท",
      "ชื่อ AR code",
      "จำนวนพนักงานทั้งหมด",
      "จำนวนพนักงานเข้าตรวจจริง",
      "วันที่เข้าตรวจ",
      "วันที่สิ้นสุดสัญญา",
      "งานที่บริษัทเลือกรับ",
      "ช่องทางจัดส่ง",
      "ชื่อผู้รับผิดชอบ",
      "พนักงานขาย (Sale)",
      "คะแนนความยาก",
      "สถานะงาน",
      "วันที่เริ่มทำ",
      "วันที่ทำเสร็จ",
      "จัดส่งไปที่ใครทางไหนเมื่อไหร่",
      "หมายเหตุ",
      "กลุ่มบริษัทในเครือเดียวกัน"
    ];

    const rows = filteredTasks.map(t => [
      t.docNo,
      t.companyName,
      t.arCode,
      t.employeeCount,
      t.actualEmployeeCount !== undefined ? t.actualEmployeeCount : t.employeeCount,
      t.inspectionDate,
      t.contractEndDate,
      t.selectedServices.join(";"),
      t.deliveryChannel,
      t.assignee,
      t.sale || "",
      t.weightScore,
      t.status,
      t.startDate,
      t.endDate,
      t.deliveryDetail,
      t.notes,
      t.companyGroup || ""
    ]);

    // Use BOM for Excel Thai language support
    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join(
        "\n"
      );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `รายงานตรวจสุขภาพ_ออกระบบ_${SYSTEM_TODAY}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("ส่งออกไฟล์ CSV เป็นยอดที่แสดงอยู่ปัจจุบันเรียบร้อยแล้ว", "success");
  };

  const handleToggleService = (service: string) => {
    if (formServices.includes(service)) {
      setFormServices(prev => prev.filter(s => s !== service));
      setFormServiceAssignees(prev => {
        const next = { ...prev };
        delete next[service];
        return next;
      });
      setFormServiceDeliveryChannels(prev => {
        const next = { ...prev };
        delete next[service];
        return next;
      });
    } else {
      setFormServices(prev => [...prev, service]);
      if (service === "บริษัทไม่รับผลใดๆ") {
        setFormStatus("✓ เรียบร้อยแล้ว");
      }
    }
  };

  const handleImportCSVClick = () => {
    setImportCsvText("");
    setImportPreview([]);
    setImportError("");
    setIsImportModalOpen(true);
  };

  const handleProcessDataMatrix = (matrix: any[][]) => {
    try {
      if (matrix.length < 2) {
        setImportError("ข้อมูลต้องประกอบด้วยแถวหัวข้อ และแถวข้อมูลอย่างน้อย 1 แถว");
        return;
      }

      // Helper keywords for detection
      const kwDocNo = ["เลขที่", "docno", "ที่เอกสาร", "document", "no.", "id"];
      const kwCompany = ["บริษัท", "company", "ลูกค้า", "customer", "ชื่อ", "name"];
      const kwEmployee = ["พนักงานทั้งหมด", "พนักงาน", "จำนวน", "employee", "count", "emp"];
      const kwInspectDate = ["วันที่เข้าตรวจ", "วันเข้าตรวจ", "ตรวจ", "ตรวจสุขภาพ", "inspection", "วันตรวจ", "วันที่ตรวจ"];
      const kwEndDate = ["วันสิ้นสุดสัญญา", "contract", "หมดสัญญา", "วันหมดสัญญา", "สิ้นสุด", "กำหนดส่ง", "duedate", "due"];
      const kwSale = ["พนักงานขาย", "sale", "ผู้ขาย", "เซลล์", "เซล", "sales"];
      const kwServices = ["บริการ", "selectedservices", "งานที่เลือก", "ประเภทงาน", "งาน"];
      const kwChannel = ["ส่งเล่ม", "deliverychannel", "ช่องทาง", "จัดส่ง", "ส่ง"];
      const kwAssignee = ["ผู้ดูแล", "assignee", "ผู้ประสานงาน", "สุนิสสา", "ผู้ประสาน", "รับผิดชอบ", "ผู้ดูแลหลัก", "ชื่อผู้ประสาน"];
      const kwWeight = ["น้ำหนัก", "score", "weight", "ความยาก", "แต้ม"];
      const kwStatus = ["สถานะ", "status", "state"];
      const kwStartDate = ["เริ่มทำ", "startdate", "วันที่เริ่ม", "เริ่มทำงาน", "วันที่เริ่มทำ", "วันเริ่ม"];
      const kwEndDateActual = ["เรียบร้อย", "enddate", "ส่งเล่มจริง", "วันที่เสร็จ", "เสร็จสิ้น", "เสร็จ", "วันที่เสร็จสิ้น", "ส่งสำเร็จ"];
      const kwDeliveryDetail = ["รายละเอียด", "deliverydetail", "เลขพัสดุ", "ส่งมอบ", "ที่ไหน", "รายละเอียดการจัดส่ง"];
      const kwNotes = ["หมายเหตุ", "notes", "note", "คำอธิบาย"];
      const kwCompanyGroup = ["กลุ่มบริษัท", "เครือ", "ในเครือ", "กลุ่มบริษัทในเครือเดียวกัน", "companygroup", "group"];

      // Scan first 10 rows to find the best header row (the one with the most column matches)
      let bestHeaderRowIndex = 0;
      let maxMatches = 0;
      
      const checkMatches = (row: string[]) => {
        let matches = 0;
        const joinedKeywords = [
          ...kwDocNo, ...kwCompany, ...kwEmployee, ...kwInspectDate, ...kwEndDate, ...kwSale,
          ...kwServices, ...kwChannel, ...kwAssignee, ...kwWeight, ...kwStatus, ...kwStartDate,
          ...kwEndDateActual, ...kwDeliveryDetail, ...kwNotes, ...kwCompanyGroup
        ];
        for (const cell of row) {
          if (!cell) continue;
          const c = String(cell).toLowerCase();
          if (joinedKeywords.some(kw => c.includes(kw))) matches++;
        }
        return matches;
      };

      for (let i = 0; i < Math.min(10, matrix.length); i++) {
        const rowKeys = matrix[i].map(h => String(h || "").trim());
        const matches = checkMatches(rowKeys);
        if (matches > maxMatches) {
          maxMatches = matches;
          bestHeaderRowIndex = i;
        }
      }

      const headerRow = matrix[bestHeaderRowIndex].map(h => String(h || "").trim());
      
      // Helper to seek matching column index with strict exclusions and priority on exact/close matches
      const findColIndex = (
        keywords: string[], 
        exclusions: string[] = [], 
        exactOnly: boolean = false
      ) => {
        // Try exact match first
        const exactIdx = headerRow.findIndex(h => 
          keywords.some(kw => h.toLowerCase() === kw.toLowerCase())
        );
        if (exactIdx !== -1) return exactIdx;

        if (exactOnly) return -1;

        // Try fuzzy match, ensuring no exclusions are present
        return headerRow.findIndex(h => {
          const lowerH = h.toLowerCase();
          const matchesKeyword = keywords.some(kw => lowerH.includes(kw.toLowerCase()));
          const hasExclusion = exclusions.some(exc => lowerH.includes(exc.toLowerCase()));
          return matchesKeyword && !hasExclusion;
        });
      };

      // Try fuzzy matching headers, falling back to standard index mapping if not found
      let docNoIdx = findColIndex(kwDocNo);
      let companyNameIdx = findColIndex(kwCompany, ["ผู้ประสาน", "ประสานงาน", "เซล", "sale", "พนักงาน"]);
      let arCodeIdx = findColIndex(["ar", "รหัส", "arcode"], ["รหัสผู้ดูแล", "รหัสพนักงาน"]);
      let employeeCountIdx = findColIndex(kwEmployee, ["จริง", "เข้าตรวจ", "ตรวจจริง", "ขาย", "ดูแล", "ประสาน", "วัน", "เสร็จ", "เริ่ม", "เลขที่"]);
      let actualEmployeeCountIdx = findColIndex(["ตรวจจริง", "เข้าตรวจ", "actual", "real", "พนักงานที่ตรวจ", "จำนวนตรวจจริง"]);
      let inspectionDateIdx = findColIndex(kwInspectDate, ["จริง", "คน", "พนักงาน", "จำนวน", "actual"]);
      let contractEndDateIdx = findColIndex(kwEndDate, ["เริ่ม", "จริง"]);
      let servicesIdx = findColIndex(kwServices, ["พนักงาน", "ประสาน", "เริ่ม", "เสร็จ", "ยาก", "ขาย", "น้ำหนัก", "ดูแล", "ส่ง", "ผู้รับ"]);
      let deliveryChannelIdx = findColIndex(kwChannel, ["วัน", "ที่เริ่ม", "วันเสร็จ", "เสร็จสิ้น", "เรียบร้อย"]);
      let assigneeIdx = findColIndex(kwAssignee, ["ช่องทาง"]);
      let saleIdx = findColIndex(kwSale);
      let weightScoreIdx = findColIndex(kwWeight);
      let statusIdx = findColIndex(kwStatus);
      let startDateIdx = findColIndex(kwStartDate);
      let endDateIdx = findColIndex(kwEndDateActual);
      let deliveryDetailIdx = findColIndex(kwDeliveryDetail);
      let notesIdx = findColIndex(kwNotes);
      let companyGroupIdx = findColIndex(kwCompanyGroup);

      // If key columns like company name aren't found, fallback to standard index mapping
      if (companyNameIdx === -1) {
        docNoIdx = 0;
        companyNameIdx = 1;
        arCodeIdx = 2;
        employeeCountIdx = 3;
        actualEmployeeCountIdx = 16;
        inspectionDateIdx = 4;
        contractEndDateIdx = 5;
        servicesIdx = 6;
        deliveryChannelIdx = 7;
        assigneeIdx = 8;
        saleIdx = 9;
        weightScoreIdx = 10;
        statusIdx = 11;
        startDateIdx = 12;
        endDateIdx = 13;
        deliveryDetailIdx = 14;
        notesIdx = 15;
        companyGroupIdx = 17;
      }

      const parsedTasks: Partial<WorkTask>[] = [];
      const dataRows = matrix.slice(bestHeaderRowIndex + 1);

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.length === 0) continue;
        
        // If row consists purely of empty strings or nulls, skip it
        const hasData = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== "");
        if (!hasData) continue;

        // Secure cell helper to prevent crashing on missing columns (incomplete columns)
        const getCell = (idx: number, fallback: string = "", isDate: boolean = false): string => {
          if (idx < 0 || idx >= row.length) return fallback;
          const val = row[idx];
          if (val === undefined || val === null) return fallback;
          
          if (val instanceof Date) {
            const year = val.getUTCFullYear();
            const month = val.getUTCMonth() + 1;
            const day = val.getUTCDate();
            let finalYear = year;
            if (finalYear > 2500) finalYear -= 543;
            return `${finalYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }

          const strVal = String(val).trim();
          if (!strVal) return fallback;

          if (isDate) {
            // Excel Serial Number check (e.g. "45012" or 45012)
            if (/^\d{5}$/.test(strVal)) {
              const serial = parseInt(strVal, 10);
              const dateObj = new Date((serial - 25569) * 86400 * 1000);
              const year = dateObj.getUTCFullYear();
              const month = dateObj.getUTCMonth() + 1;
              const day = dateObj.getUTCDate();
              let finalYear = year;
              if (finalYear > 2500) finalYear -= 543;
              return `${finalYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }

            // Splitting with standard delimiters: -, /, .
            const parts = strVal.split(/[-/.]/);
            if (parts.length === 3) {
              let day = 1;
              let month = 1;
              let year = 2026;

              if (parts[0].length === 4) {
                // YYYY-MM-DD format
                year = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                day = parseInt(parts[2], 10);
              } else {
                // DD-MM-YYYY or MM-DD-YYYY or DD-MM-YY format
                const p0 = parseInt(parts[0], 10);
                const p1 = parseInt(parts[1], 10);
                const p2 = parseInt(parts[2], 10);

                if (p2 > 100) {
                  year = p2;
                  if (p1 > 12) {
                    day = p1;
                    month = p0;
                  } else {
                    day = p0;
                    month = p1;
                  }
                } else if (p0 > 100) {
                  year = p0;
                  month = p1;
                  day = p2;
                } else {
                  year = p2;
                  day = p0;
                  month = p1;
                }
              }

              if (year && month && day) {
                if (year > 2500) year -= 543;
                if (year < 100) {
                  if (year > 50) {
                    year += 2500 - 543;
                  } else {
                    year += 2000;
                  }
                }
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              }
            }
          }
          return strVal;
        };

        const docNo = getCell(docNoIdx) || `DOC-IMP-${150 + i}`;
        const companyName = getCell(companyNameIdx) || `ข้อมูลนำเข้าแถวที่ ${i + 1}`;
        const arCode = getCell(arCodeIdx) || "-";
        
        const rawEmpVal = getCell(employeeCountIdx);
        const employeeCount = Number(rawEmpVal) || 0;

        const rawActualEmpVal = actualEmployeeCountIdx >= 0 ? getCell(actualEmployeeCountIdx) : "";
        const actualEmployeeCount = rawActualEmpVal ? (Number(rawActualEmpVal) || 0) : employeeCount;

        const inspectionDate = getCell(inspectionDateIdx, SYSTEM_TODAY, true) || SYSTEM_TODAY;
        const contractEndDate = getCell(contractEndDateIdx, "", true) || "";
        const servicesStr = getCell(servicesIdx) || "";
        const selectedServices = servicesStr ? servicesStr.split(";").map(s => s.trim()).filter(Boolean) : ["สรุปรวมองค์กร", "Excel", "ใบรายงานสำหรับ HR"];
        
        const rawChannel = getCell(deliveryChannelIdx);
        const deliveryChannel = (rawChannel === "ไปรษณีย์" || rawChannel === "E-mail") 
          ? rawChannel 
          : (rawChannel && rawChannel !== "ไม่ระบุ" ? rawChannel : "อื่นๆ");
        
        const rawAssignee = getCell(assigneeIdx) || "ไม่ระบุ";
        let assignee = rawAssignee.trim();
        const lowerAssignee = assignee.toLowerCase();
        if (assignee === "สุนิสสา" || lowerAssignee === "ammy") {
          assignee = "Ammy";
        } else if (assignee === "อาทิตยา" || assignee === "ตะวัน") {
          assignee = "ตะวัน";
        } else if (assignee === "รวีวรรณ" || assignee === "ปุ้ม") {
          assignee = "ปุ้ม";
        } else if (assignee === "สุนิษา" || assignee === "จ๋า") {
          assignee = "จ๋า";
        } else if (assignee) {
          if (assignee.includes("สุนิสสา") || lowerAssignee.includes("ammy")) assignee = "Ammy";
          else if (assignee.includes("อาทิตยา") || assignee.includes("ตะวัน")) assignee = "ตะวัน";
          else if (assignee.includes("รวีวรรณ") || assignee.includes("ปุ้ม")) assignee = "ปุ้ม";
          else if (assignee.includes("สุนิษา") || assignee.includes("จ๋า")) assignee = "จ๋า";
        }
        const sale = getCell(saleIdx) || "";
        
        const rawWeight = getCell(weightScoreIdx);
        const weightScore = Number(rawWeight) || 1;

        // Custom status parser for maximum flexibility with spreadsheet terminologies
        const rawStatus = getCell(statusIdx).trim().toLowerCase();
        let status: "ยังไม่เริ่ม" | "กำลังทำ" | "✓ เรียบร้อยแล้ว" = "ยังไม่เริ่ม";
        if (rawStatus) {
          if (
            rawStatus.includes("เรียบร้อย") ||
            rawStatus.includes("เสร็จ") ||
            rawStatus.includes("สำเร็จ") ||
            rawStatus.includes("done") ||
            rawStatus.includes("complete") ||
            rawStatus.includes("✓") ||
            rawStatus.includes("yes") ||
            rawStatus.includes("true")
          ) {
            status = "✓ เรียบร้อยแล้ว";
          } else if (
            rawStatus.includes("กำลัง") ||
            rawStatus.includes("ทำอยู่") ||
            rawStatus.includes("ดำเนิน") ||
            rawStatus.includes("progress") ||
            rawStatus.includes("doing")
          ) {
            status = "กำลังทำ";
          }
        }

        if (selectedServices.includes("บริษัทไม่รับผลใดๆ")) {
          status = "✓ เรียบร้อยแล้ว";
        }

        const startDate = getCell(startDateIdx, "", true) || "";
        const endDate = getCell(endDateIdx, "", true) || "";
        const deliveryDetail = getCell(deliveryDetailIdx) || "";
        const notes = getCell(notesIdx) || "";
        const companyGroup = companyGroupIdx >= 0 ? getCell(companyGroupIdx) : "";

        parsedTasks.push({
          id: `imp-${Date.now()}-${i}`,
          docNo,
          companyName,
          arCode,
          employeeCount,
          actualEmployeeCount,
          inspectionDate,
          contractEndDate,
          selectedServices,
          deliveryChannel,
          assignee,
          sale,
          weightScore,
          status,
          startDate,
          endDate,
          deliveryDetail,
          notes,
          companyGroup
        });
      }

      if (parsedTasks.length === 0) {
        setImportError("ไม่สามารถวิเคราะห์แถวข้อมูลได้ กรุณาตรวจสอบรูปแบบคอลัมน์");
      } else {
        setImportPreview(parsedTasks);
        setImportError("");
      }
    } catch (err: any) {
      setImportError(`เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล: ${err?.message || err}`);
    }
  };

  const handleProcessCsvText = (text: string) => {
    try {
      if (!text.trim()) {
        setImportError("ไม่พบข้อมูลสำหรับการนำเข้า");
        return;
      }

      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        setImportError("ข้อมูลต้องประกอบด้วยแถวหัวข้อ และแถวข้อมูลอย่างน้อย 1 แถว");
        return;
      }

      const matrix: string[][] = [];
      for (let i = 0; i < lines.length; i++) {
        const row = lines[i].trim();
        if (!row) continue;

        // Custom split ignoring nested commas in quotes
        const columns: string[] = [];
        let insideQuote = false;
        let currentField = "";

        for (let charIndex = 0; charIndex < row.length; charIndex++) {
          const char = row[charIndex];
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === "," && !insideQuote) {
            columns.push(currentField.trim());
            currentField = "";
          } else {
            currentField += char;
          }
        }
        columns.push(currentField.trim());
        matrix.push(columns);
      }

      handleProcessDataMatrix(matrix);
    } catch (err: any) {
      setImportError(`เกิดข้อผิดพลาดในการอ่านข้อมูล: ${err?.message || err}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === "xlsx" || fileExtension === "xls" || fileExtension === "ods" || fileExtension === "csv") {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          
          if (fileExtension === "csv") {
            let text = "";
            try {
              text = new TextDecoder("utf-8", { fatal: true }).decode(data);
            } catch (e) {
              text = new TextDecoder("windows-874").decode(data);
            }
            setImportCsvText(text);
            handleProcessCsvText(text);
            return;
          }

          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          // Get rows as array of arrays
          const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            setImportError("ไม่พบข้อมูลในไฟล์สเปรดชีต");
            return;
          }

          // Process spreadsheet rows
          handleProcessDataMatrix(jsonData);
        } catch (err: any) {
          setImportError(`เกิดข้อผิดพลาดในการอ่านไฟล์ Excel/CSV: ${err?.message || err}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Fallback to plain text CSV reading
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setImportCsvText(text);
        handleProcessCsvText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = () => {
    if (importPreview.length === 0) return;

    const newTasksToAppend = importPreview.map((item, index) => ({
      id: `task-imported-${Date.now()}-${index}`,
      docNo: item.docNo || `DOC-${index + 500}`,
      companyName: item.companyName || "บริษัทไม่ระบุชื่อ",
      arCode: item.arCode || "-",
      employeeCount: item.employeeCount || 0,
      inspectionDate: item.inspectionDate || SYSTEM_TODAY,
      contractEndDate: item.contractEndDate || "",
      selectedServices: item.selectedServices || ["สรุปรวมองค์กร", "Excel", "ใบรายงานสำหรับ HR"],
      deliveryChannel: item.deliveryChannel || "อื่นๆ",
      assignee: item.assignee || "ไม่ระบุ",
      sale: item.sale || "",
      weightScore: item.weightScore || 1,
      status: item.status || "ยังไม่เริ่ม",
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      deliveryDetail: item.deliveryDetail || "",
      notes: item.notes || "",
      companyGroup: item.companyGroup || "",
      actualEmployeeCount: item.actualEmployeeCount !== undefined ? item.actualEmployeeCount : (item.employeeCount || 0)
    }));

    // --- SCAN IMPORTED DATA FOR DUPLICATES AGAINST EXISTING TASKS ---
    const existingCompanies = new Set(tasks.map(t => t.companyName.trim().toLowerCase()));
    const existingArCodes = new Set(
      tasks
        .map(t => t.arCode ? t.arCode.trim().toLowerCase() : "")
        .filter(ar => ar && ar !== "-" && ar !== "ไม่มี" && ar !== "ไม่ระบุ")
    );

    const duplicateImports: string[] = [];
    newTasksToAppend.forEach(task => {
      const normCompany = task.companyName.trim().toLowerCase();
      const normAr = task.arCode.trim().toLowerCase();

      let isDup = false;
      let dupDetail = "";
      if (existingCompanies.has(normCompany)) {
        isDup = true;
        dupDetail = `บริษัท "${task.companyName}" (ชื่อซ้ำ)`;
      }
      if (normAr && normAr !== "-" && normAr !== "ไม่มี" && normAr !== "ไม่ระบุ" && existingArCodes.has(normAr)) {
        isDup = true;
        if (dupDetail) {
          dupDetail += ` และ AR Code "${task.arCode}" (AR ซ้ำ)`;
        } else {
          dupDetail = `บริษัท "${task.companyName}" (AR Code ซ้ำ: "${task.arCode}")`;
        }
      }

      if (isDup) {
        duplicateImports.push(dupDetail);
      }
    });

    if (duplicateImports.length > 0) {
      const limit = 5;
      const shownDups = duplicateImports.slice(0, limit);
      const remaining = duplicateImports.length - limit;
      const dupMessage = shownDups.map(d => `• ${d}`).join("\n") + (remaining > 0 ? `\n... และอีก ${remaining} รายการ` : "");

      const confirmImport = window.confirm(
        `🚨 พบคู่ข้อมูลที่มีชื่อบริษัท หรือ AR Code ซ้ำซ้อนกับในระบบจำนวน ${duplicateImports.length} รายการ:\n\n${dupMessage}\n\nคุณยังคงต้องการยืนยันการนำเข้าข้อมูลทั้งหมดใช่หรือไม่?`
      );
      if (!confirmImport) {
        return; // Halt and don't import
      }
    }

    setTasks(prev => [...newTasksToAppend, ...prev]);
    setIsImportModalOpen(false);
    showToast(`นำเข้าข้อมูลงานจำนวน ${newTasksToAppend.length} รายการสำเร็จ!`, "success");
  };

  const handleResetToDemo = () => {
    if (confirm("คุณต้องการล้างข้อมูลปัจจุบันเพื่อดาวน์โหลดชุดข้อมูลตัวอย่างตรวจสุขภาพดั้งเดิมใช่หรือไม่?")) {
      setTasks(INITIAL_TASKS);
      setMetricFilter("all");
      setSearchQuery("");
      setFilterAssignee("all");
      setFilterStatus("all");
      showToast("รีเซ็ตเป็นข้อมูลตัวอย่างเรียบร้อยแล้ว", "success");
    }
  };

  // Handle Sort
  const handleSort = (field: keyof WorkTask) => {
    if (sortBy === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

  // Quick reset filters helper
  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterAssignee("all");
    setFilterSale("all");
    setFilterStatus("all");
    setFilterChannel("all");
    setMetricFilter("all");
    setFilterYear("all");
    setFilterMonth("all");
    setFilterDateBasis("inspectionDate");
    showToast("ล้างตัวกรองทั้งหมดแล้ว", "info");
  };

  // Count active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filterAssignee !== "all") count++;
    if (filterSale !== "all") count++;
    if (filterStatus !== "all") count++;
    if (filterChannel !== "all") count++;
    if (metricFilter !== "all" && metricFilter !== "") count++;
    if (filterYear !== "all") count++;
    if (filterMonth !== "all") count++;
    return count;
  }, [searchQuery, filterAssignee, filterSale, filterStatus, filterChannel, metricFilter, filterYear, filterMonth]);

  // --- BACKOFFICE ACTIONS ---
  const handleAddBackofficeUser = (e: React.FormEvent) => {
    e.preventDefault();
    const name = backofficeUserName.trim();
    const email = backofficeUserEmail.trim();
    const password = backofficeUserPassword.trim();
    const role = backofficeUserRole;

    if (!name || !email || !password) {
      showToast("กรุณากรอกข้อมูลผู้ใช้งานให้ครบทุกช่อง", "warning");
      return;
    }

    if (usersList.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      showToast("อีเมลนี้ถูกใช้งานไปแล้ว", "warning");
      return;
    }

    setUsersList(prev => [...prev, { name, email, password, role }]);
    showToast(`เพิ่มผู้ใช้คุณ ${name} สำเร็จแล้วในระดับ: ${role === "admin" ? "แอดมิน" : "ผู้ใช้งาน"}`, "success");
    setBackofficeUserName("");
    setBackofficeUserEmail("");
    setBackofficeUserPassword("");
    setBackofficeUserRole("user");
  };

  const handleChangeUserRole = (email: string, newRole: "admin" | "user") => {
    const isSelf = email.toLowerCase() === currentUser?.email.toLowerCase();
    
    if (isSelf && newRole !== "admin") {
      const confirmSelfDemote = confirm("คุณแน่ใจหรือไม่ที่จะลดระดับสิทธิ์ของตัวเองเป็น User? หากกดยืนยันคุณจะออกจากระบบจัดการข้อมูลหลังบ้านทันทีค่ะ!");
      if (!confirmSelfDemote) return;
    }

    setUsersList(prev => prev.map(u => {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return { ...u, role: newRole };
      }
      return u;
    }));

    if (isSelf) {
      const updatedSession = { ...currentUser, role: newRole };
      localStorage.setItem("health_checkup_user_session", JSON.stringify(updatedSession));
      setCurrentUser(updatedSession);
      if (newRole !== "admin") {
        setActiveTab("tasks"); // Redirect away from backoffice tab
      }
    }

    showToast(`เปลี่ยนประเภทบัญชีของเป็น ${newRole === "admin" ? "แอดมิน (Admin)" : "ผู้เริ่มระบบ (User)"} สำเร็จแล้ว`, "info");
  };

  const handleDeleteBackofficeUser = (email: string, name: string) => {
    if (email === currentUser?.email) {
      alert("ไม่สามารถลบบัญชีที่คุณกำลังล็อกอินเข้าใช้งานในปัจจุบันได้ค่ะ!");
      return;
    }
    if (confirm(`คุณมั่นใจที่จะลบบัญชีผู้ใช้ของคุณ ${name} หรือไม่?`)) {
      setUsersList(prev => prev.filter(u => u.email !== email));
      showToast(`ลบบัญชีผู้ใช้คุณ ${name} เรียบร้อยแล้ว`, "info");
    }
  };

  const handleAddBackofficeAssignee = (e: React.FormEvent) => {
    e.preventDefault();
    const name = backofficeAssigneeName.trim();
    if (!name) return;

    if (assigneesList.includes(name)) {
      showToast("มีรายชื่อผู้ประสานงานหลักนี้อยู่แล้วในระบบ", "warning");
      return;
    }

    setAssigneesList(prev => [...prev, name]);
    showToast(`เพิ่มคุณ ${name} เข้าตารางผู้รับผิดชอบเรียบร้อย`, "success");
    setBackofficeAssigneeName("");
  };

  const handleDeleteBackofficeAssignee = (name: string) => {
    if (confirm(`คุณแน่ใจไหมที่ต้องการลบคุณ ${name} ออกจากรายชื่อผู้ดูแล?`)) {
      setAssigneesList(prev => prev.filter(item => item !== name));
      showToast(`ลบคุณ ${name} ออกแล้ว`, "info");
    }
  };

  const handleAddBackofficeSale = (e: React.FormEvent) => {
    e.preventDefault();
    const name = backofficeSaleName.trim();
    if (!name) return;

    if (salesList.includes(name)) {
      showToast("มีรายชื่อพนักงานขายนี้ในระบบแล้ว", "warning");
      return;
    }

    setSalesList(prev => [...prev, name]);
    showToast(`เพิ่มพนักงานขายคุณ ${name} สำเร็จ`, "success");
    setBackofficeSaleName("");
  };

  const handleDeleteBackofficeSale = (name: string) => {
    if (confirm(`คุณมั่นใจที่จะลบพนักงานขายคุณ ${name} หรือไม่?`)) {
      setSalesList(prev => prev.filter(item => item !== name));
      showToast(`ลบพนักงานขายคุณ ${name} เรียบร้อย`, "info");
    }
  };


  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 text-slate-100" id="login_screen_wrapper">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden" id="login_card">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-3">
              <img
                src={phyathaiLogo}
                alt="Phyathai 2 Hospital Logo"
                className="h-16 w-auto object-contain rounded-xl bg-white p-1.5 shadow-md border border-slate-700/20"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-lg font-bold tracking-tight uppercase font-display text-white">
              Work Tracking & Performance
            </h1>
            <p className="text-slate-400 text-xs font-light max-w-sm mx-auto leading-relaxed">
              ระบบส่วนหน้าบันทึกสะสม ติดตามผลงานและสรุปผลอาชีวอนามัยของกลุ่มตรวจสุขภาพ (Clinical Group)
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 pt-1" id="login_form">
            {loginError && (
              <div className="bg-red-950/50 border border-red-800/40 text-red-200 text-xs p-3 rounded-lg flex items-center gap-2" id="login_error_box">
                <span className="text-red-400">⚠️</span>
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                อีเมลผู้เข้าใช้งาน (Email)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-slate-800 border border-slate-700/65 rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-100 placeholder-slate-500 transition-all font-mono"
                  id="input_login_email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                รหัสพนักงานเข้าใช้ (Password 6 ตัว)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                  <span className="text-sm">🔑</span>
                </span>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={loginPassword}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9a-zA-Z]/g, ""); // Keep alphanumeric only
                    setLoginPassword(val.slice(0, 6));
                  }}
                  placeholder="รหัสพนักงาน 6 ตัว"
                  className="w-full bg-slate-800 border border-slate-700/65 rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-100 placeholder-slate-500 transition-all font-mono tracking-widest"
                  id="input_login_password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-xs font-bold transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 mt-2 cursor-pointer"
              id="btn_submit_login"
            >
              Sign In • เข้าสู่ระบบอย่างปลอดภัย
            </button>
          </form>

          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={() => {
                if (!loginEmail.trim()) {
                  setLoginError("กรุณากรอกอีเมลกองช่องด้านบนเพื่อรับรหัสผ่านทางอีเมล");
                  return;
                }
                const matched = usersList.find(user => 
                  user.email.toLowerCase() === loginEmail.trim().toLowerCase() ||
                  user.name === loginEmail.trim()
                );
                if (!matched) {
                  setLoginError("ไม่พบอีเมลหรือชื่อผู้ใช้นี้ในระบบ");
                  return;
                }
                showToast(`ส่งรหัสผ่านไปยัง ${matched.email} เรียบร้อยแล้ว`, "success");
                setLoginError("");
              }}
              className="text-[11px] text-slate-400 hover:text-blue-400 font-medium transition-colors cursor-pointer"
            >
              ลืมรหัสผ่าน? คลิกที่นี่เพื่อรับรหัสผ่านทาง E-mail
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col antialiased text-slate-900" id="main_app_wrapper">
      {/* HEADER SECTION */}
      <header className="bg-slate-900 text-white shadow-sm border-b border-slate-800 shrink-0 select-none" id="app_header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={phyathaiLogo}
                alt="Phyathai 2 Hospital Logo"
                className="h-10 w-auto object-contain rounded bg-white p-0.5 shrink-0 shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div>
                <h1 className="text-sm sm:text-base font-display font-semibold tracking-tight text-white uppercase flex items-center gap-2">
                  Work Tracking & Performance System
                </h1>
                <p className="text-slate-400 text-[10px] leading-none mt-0.5">
                  ระบบติดตามงานสรุปรวมผลตรวจสุขภาพองค์กร • Today: {SYSTEM_TODAY} (11 Jun 2026)
                </p>
              </div>
            </div>
            
            {/* Active User Information (High Density) */}
            <div className="flex items-center gap-3 text-xs self-start sm:self-auto">
              <span className="bg-slate-800 px-3 py-1 rounded-full text-slate-300 border border-slate-700/60 font-mono text-[10px]" title={currentUser.email}>
                User: {currentUser.name} • {currentUser.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-white hover:bg-slate-800 transition-all px-2.5 py-1 rounded border border-slate-700/40 font-mono text-[10px] cursor-pointer"
                title="ออกจากระบบบันทึกเวลาปัจจุบัน"
              >
                ออกจากระบบ (Log Out)
              </button>
              <button
                onClick={handleResetToDemo}
                className="text-slate-400 hover:text-white transition-all p-1 hover:bg-slate-800 rounded border border-slate-700/40 cursor-pointer"
                title="โหลดชุดข้อมูลตัวอย่างหากข้อมูลล้างออก"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* SUBNAV TAB SELECTOR */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40" id="sub_navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-11">
            <div className="flex gap-1 sm:gap-2 overflow-x-auto h-full scrollbar-none">
              <button
                onClick={() => { setActiveTab("tasks"); setMetricFilter("all"); }}
                className={`flex items-center gap-1.5 px-3 h-full border-b-2 font-display text-xs font-bold transition-all ${
                  activeTab === "tasks"
                    ? "border-blue-600 text-blue-700 bg-blue-50/25"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                📋 จัดการงานตรวจสุขภาพ
              </button>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-1.5 px-3 h-full border-b-2 font-display text-xs font-bold transition-all ${
                  activeTab === "dashboard"
                    ? "border-blue-600 text-blue-700 bg-blue-50/25"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                📊 แดชบอร์ด & สถิติ
              </button>
              {currentUser?.role === "admin" ? (
                <button
                  onClick={() => setActiveTab("backoffice")}
                  className={`flex items-center gap-1.5 px-3 h-full border-b-2 font-display text-xs font-bold transition-all ${
                    activeTab === "backoffice"
                      ? "border-blue-600 text-blue-700 bg-blue-50/25"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  ⚙️ จัดการข้อมูลหลังบ้าน (Backoffice)
                </button>
              ) : (
                <button
                  onClick={() => showToast("สิทธิ์การเข้าถึงข้อมูลหลังบ้านถูกจำกัดเฉพาะ Admin เท่านั้นค่ะ", "warning")}
                  className="flex items-center gap-1.5 px-3 h-full border-b-2 border-transparent font-display text-xs font-bold text-slate-400 cursor-not-allowed opacity-60 hover:bg-rose-50/50"
                  title="สิทธิ์การเข้าถึงข้อมูลหลังบ้านถูกจำกัดเฉพาะ Admin เท่านั้น"
                >
                  🔒 จัดการระบบ (เฉพาะ Admin)
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
            </div>
          </div>
        </div>
      </nav>

      {/* TOAST SYSTEM ALERTS */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : toast.type === "warning"
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : toast.type === "warning" ? (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            ) : (
              <Info className="w-5 h-5 text-blue-600" />
            )}
            <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-8">
        
        {/* OVERDUE URGENT NOTIFICATION BAR */}
        {metrics.overdue > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 border-l-4 border-rose-500 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900"
            id="overdue_alert_banner"
          >
            <div className="flex items-center gap-3">
              <div className="bg-rose-500 text-white rounded-full p-1.5 animate-pulse shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-sm text-rose-900">
                  ⚠️ ตรวจพบงานหมดสัญญาแต่ทำไม่เสร็จ!
                </h4>
                <p className="text-xs text-rose-700 font-light mt-0.5">
                  มีบริษัทค้างตรวจสะสมจำนวน <strong className="font-bold underline text-rose-850">{metrics.overdue} บริษัท</strong> ที่เลยกำหนดสิ้นสุดสัญญาแล้ว แต่ยังไม่ได้เปลี่ยนสถานะเป็นเรียบร้อย
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setMetricFilter("overdue");
                setActiveTab("tasks");
                showToast("ฟิลเตอร์เฉพาะงานที่ค้างส่งมอบตามสัญญา", "info");
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-101"
            >
              ดูบริษัทที่ค้างสัญญาค้างตรวจทันที
            </button>
          </motion.div>
        )}

        {/* 1. SECTION: DASHBOARD SHEETS */}
        {activeTab === "dashboard" && (
          <section className="flex flex-col gap-4" id="dashboard_section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-1.5">
              <h2 className="text-sm font-bold text-slate-905 uppercase tracking-wider flex items-center gap-1.5">
                <LayoutDashboard className="w-4 h-4 text-blue-600 animate-pulse-slow" /> Dashboard & Metrics Summary
              </h2>
              <span className="text-[10px] text-slate-400 font-normal">ระบบแสดงสถิติและประเมินผลประสิทธิภาพมาตรฐานโรงพยาบาล</span>
            </div>

            {/* Segment Filter for Month/Year Selection */}
            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 shadow-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border border-slate-800 animate-fade-in" id="dashboard_segment_segment_widget">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                    แบ่งกลุ่มข้อมูลตามรายปี & รายเดือน (Real-Time Temporal Segments)
                  </h3>
                </div>
                <p className="text-slate-400 text-[10.5px]">
                  เลือกปีคริสต์ศักราชและเดือนเพื่อประเมินผลประสิทธิภาพรายบุคคลและกราฟสรุปแบบรายคาบ
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Date basis */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">เกณฑ์ประเมินจาก</span>
                  <select
                    value={filterDateBasis}
                    onChange={(e) => setFilterDateBasis(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 py-1 py-1.5 rounded-lg outline-none cursor-pointer focus:border-teal-500 font-medium"
                  >
                    <option value="inspectionDate">🗓️ วันที่เข้าตรวจสุขภาพ</option>
                    <option value="contractEndDate">📆 วันสิ้นสุดสัญญา</option>
                    <option value="endDate">🏁 วันเสร็จสิ้นส่งมอบ</option>
                  </select>
                </div>

                {/* Year */}
                <div className="flex flex-col gap-1 min-w-[100px]">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">ปี ค.ศ. / พ.ศ.</span>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-teal-300 text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer focus:border-teal-500 font-bold"
                  >
                    <option value="all">ทุกปี (All Years)</option>
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>ปี {yr} (พ.ศ. {Number(yr) + 543})</option>
                    ))}
                  </select>
                </div>

                {/* Month */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">เดือน</span>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-teal-300 text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer focus:border-teal-500 font-bold"
                  >
                    <option value="all">ทุกเดือน (All Months)</option>
                    {MONTHS_THAI.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Quick reset inside dashboard */}
                {(filterYear !== "all" || filterMonth !== "all") && (
                  <button
                    onClick={() => {
                      setFilterYear("all");
                      setFilterMonth("all");
                    }}
                    className="flex items-center gap-1.5 bg-rose-900/40 hover:bg-rose-900/65 text-rose-200 border border-rose-800/80 text-[11px] px-2.5 py-1.5 rounded-lg self-end h-[32px] transition-all cursor-pointer font-bold"
                  >
                    <RotateCcw className="w-3 h-3 text-rose-400" /> ล้างคาบเวลา
                  </button>
                )}
              </div>
            </div>

            {/* Dashboard Sub-Tabs for clean separation */}
            <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 border shadow-xs">
              <button
                onClick={() => { setDashboardSubTab("kpi_overview"); showToast("เปิดดูภาพรวมและเกณฑ์ KPI แผนก", "info"); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  dashboardSubTab === "kpi_overview"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                📊 KPI ภาพรวมแผนก & สรุปประเภทงานที่เข้าตรวจ
              </button>
              <button
                onClick={() => { setDashboardSubTab("performance_individual"); showToast("เปิดดูสถิติประสิทธิภาพเจ้าหน้าที่รายบุคคล", "info"); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  dashboardSubTab === "performance_individual"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                👤 Performance & กราฟเปรียบเทียบผลงานรายคน
              </button>
            </div>

            {/* SUB-VIEW 1: KPI DEPARTMENT OVERVIEW */}
            {dashboardSubTab === "kpi_overview" && (
              <div className="flex flex-col gap-6 animate-fade-in" id="dashboard_kpi_overview_tab">
                
                {/* 5 Core executive blocks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Card 1: Total Companies */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4 hover:shadow-sm transition-all" id="card_total_companies_count">
                    <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">จำนวนบริษัทที่เข้าตรวจดูแล</p>
                      <h3 className="text-xl font-bold text-slate-800 mt-0.5">
                        {dashboardTasks.length} <span className="text-xs text-slate-400 font-normal">บริษัท</span>
                      </h3>
                      <div className="text-[10px] text-slate-400 font-medium mt-1 flex flex-col gap-0.5">
                        <span>พนักงานทั้งหมด (ตามสรุปงาน): {dashboardTasks.reduce((sum, t) => sum + (Number(t.employeeCount) || 0), 0).toLocaleString()} คน</span>
                        <span className="text-emerald-600 font-semibold">พนักงานเข้าตรวจจริง: {dashboardTasks.reduce((sum, t) => {
                          const actual = t.actualEmployeeCount !== undefined ? t.actualEmployeeCount : t.employeeCount;
                          return sum + (Number(actual) || 0);
                        }, 0).toLocaleString()} คน</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: 30-day KPI completion rate */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4 hover:shadow-sm transition-all" id="card_kpi_rate">
                    <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5.5 h-5.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ผ่านเกณฑ์ส่งเล่ม KPI 30 วัน</p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl font-extrabold text-emerald-600 font-mono">
                          {departmentKPI.kpiRate}%
                        </span>
                        <span className="text-[9px] text-emerald-500 font-bold">จากทั้งหมด</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        ทันกำหนด {departmentKPI.successCount} / {departmentKPI.totalWithContract} บ.ที่มีสัญญา
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Failed KPI Count */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4 hover:shadow-sm transition-all" id="card_failed_kpi">
                    <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                      <Clock className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ตกเกณฑ์ KPI (ล่าช้า &gt; 30 วัน)</p>
                      <h3 className="text-xl font-bold text-rose-600 mt-0.5 font-mono">
                        {departmentKPI.failCount} <span className="text-xs text-rose-400 font-normal">บริษัท</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        เล่มรายงานส่งช้า หรือเลยสัญญายังไม่เสร็จ
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Global completed items percentage */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4 hover:shadow-sm transition-all" id="card_status_percentage">
                    <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <Percent className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">อัตราดำเนินการเรียบร้อย</p>
                      <h3 className="text-xl font-bold text-indigo-600 mt-0.5 font-mono">
                        {dashboardTasks.length > 0 ? Math.round((dashboardTasks.filter(t => t.status === "✓ เรียบร้อยแล้ว").length / dashboardTasks.length) * 100) : 0}%
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        เสร็จแล้ว {dashboardTasks.filter(t => t.status === "✓ เรียบร้อยแล้ว").length} บ. / ค้าง {dashboardTasks.filter(t => t.status !== "✓ เรียบร้อยแล้ว").length} บ.
                      </p>
                    </div>
                  </div>

                  {/* Card 5: Extended Contracts Count */}
                  <div className="bg-amber-50/40 p-5 rounded-xl border border-amber-200 shadow-xs flex items-center gap-4 hover:shadow-sm transition-all border-l-4 border-l-amber-500" id="card_extended_contracts">
                    <div className="w-11 h-11 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs animate-pulse-slow">
                      <AlertCircle className="w-5.5 h-5.5 text-amber-100" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">บริษัทขยายอายุสัญญา</p>
                      <h3 className="text-xl font-bold text-amber-700 mt-0.5 font-mono">
                        {departmentKPI.extendedContractCount} <span className="text-xs text-amber-600 font-normal">บริษัท</span>
                      </h3>
                      <p className="text-[10px] text-amber-800/80 font-medium mt-1">
                        เล่มรายงานที่มีการต่อระยะเวลารายงานผล
                      </p>
                    </div>
                  </div>
                </div>

                {/* KPI 30-Day Analysis Panel */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs" id="kpi_limit_30_days_widget">
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-emerald-600 animate-bounce-slow" /> KPI ประสิทธิภาพเวลาการส่งมอบลัพธ์การตรวจ (ภายใน 30 วันหลังสิ้นสุดอายุสัญญา)
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        เกณฑ์ประเมินส่งข้อมูลรายงานผลตรวจสุขภาพเล่มสมบูรณ์ให้โรงงานลูกค้า ต้องดำเนินการส่งและแจ้งสถานะเป็นเรียบร้อยภายใน 30 วันนับจาก contractEndDate
                      </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 text-white rounded-xl py-1.5 px-3.5 flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">KPI แผนกผ่านเกณฑ์</p>
                        <p className="text-[8px] text-slate-400 font-mono">Department Pass Target</p>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400 font-mono">{departmentKPI.kpiRate}%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
                    {/* Ring score gauge */}
                    <div className="lg:col-span-4 bg-slate-900 text-white rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-inner relative">
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="56" cy="56" r="46" className="stroke-slate-850" strokeWidth="8" fill="transparent" />
                          <motion.circle
                            cx="56"
                            cy="56"
                            r="46"
                            className="stroke-emerald-400"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray="289"
                            initial={{ strokeDashoffset: 289 }}
                            animate={{ strokeDashoffset: 289 - (289 * departmentKPI.kpiRate) / 100 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-2xl font-black font-mono text-white tracking-tighter">
                            {departmentKPI.kpiRate}%
                          </span>
                          <span className="text-[8.5px] text-slate-400 font-bold uppercase mt-0.5">
                            PASS RATE
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3.5 space-y-1">
                        <p className="text-[11.5px] font-sans font-bold text-slate-200">
                          {departmentKPI.kpiRate >= 80 ? "🏆 ยอดเยี่ยมตามมาตรฐานและเป้าหมาย" :
                           departmentKPI.kpiRate >= 50 ? "⚠️ ปานกลาง ควรเร่งประสานส่งมอบ" : "🚨 วิกฤต! คะแนนเวลาแผนกต่ำกว่าเป้าหมายหลัก"}
                        </p>
                        <p className="text-[9.5px] text-slate-500 font-light leading-snug">
                          คำนวณจากงานปิดตรวจประมูลที่มีเกณฑ์อายุสัญญาทั้งสิ้น {departmentKPI.totalWithContract} บริษัท
                        </p>
                      </div>
                    </div>

                    {/* Classification explain cards */}
                    <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Class A: Complied finished */}
                      <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-3.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-800">1. ดำเนินงานเสร็จ ทันตามกำหนด</span>
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.2 rounded-full">✓ ทัน KPI</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-light mt-1">
                            บริษัทที่ตรวจสุขภาพเรียบร้อยและบันทึกเสร็จสิ้นส่งมอบงานภายใน 30 วันหลังสิ้นสุดสัญญากำหนด
                          </p>
                        </div>
                        <div className="text-lg font-bold text-emerald-600 font-mono mt-2 flex items-baseline gap-1">
                          {departmentKPI.completedOnTime.length} <span className="text-xs text-slate-400 font-normal">บริษัท</span>
                        </div>
                      </div>

                      {/* Class B: On track active */}
                      <div className="bg-blue-50/20 border border-blue-100 rounded-xl p-3.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-800">2. กำลังทำ และยังไม่เกินกำหนด</span>
                            <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.2 rounded-full">⏳ ในเวลา</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-light mt-1">
                            บริษัทที่ยังตรวจดำเนินงานอยู่ แต่เนื่องจากเวลานับจากสิ้นสุดสัญญาปัจจัยยังไม่ถึงเกณฑ์ 30 วัน ยังไม่หลุดเป้า
                          </p>
                        </div>
                        <div className="text-lg font-bold text-blue-600 font-mono mt-2 flex items-baseline gap-1">
                          {departmentKPI.pendingOnTrack.length} <span className="text-xs text-slate-400 font-normal">บริษัท</span>
                        </div>
                      </div>

                      {/* Class C: Completed late */}
                      <div className="bg-amber-50/35 border border-amber-200 rounded-xl p-3.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-800">3. เรียบร้อยแล้ว (แต่เลยดีล/ล่าช้า)</span>
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.2 rounded-full">⚠️ เกินกำหนด</span>
                          </div>
                          <p className="text-[10px] text-slate-505 font-light mt-1">
                            ดำเนินการเรียบร้อยส่งมอบสำเร็จ แต่บันทึกเสร็จจริงหรือส่งเล่มล่าช้าพ้นความคุ้มครองดีล 30 วันแรก
                          </p>
                        </div>
                        <div className="text-lg font-bold text-amber-600 font-mono mt-2 flex items-baseline gap-1">
                          {departmentKPI.completedLate.length} <span className="text-xs text-slate-400 font-normal">บริษัท</span>
                        </div>
                      </div>

                      {/* Class D: Delayed critical overdue */}
                      <div className="bg-rose-50/35 border border-rose-200 rounded-xl p-3.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-800">4. ค้างล่าช้าและพ้น 30 วันวิกฤต</span>
                            <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-2 py-0.2 rounded-full">🚨 ตก KPI หลัก</span>
                          </div>
                          <p className="text-[10px] text-slate-505 font-light mt-1">
                            บริษัทที่ล่าช้าเกิน 30 วันปฏิทิน และในปัจจุบันประจักษ์ว่าสถานะยังทำไม่เรียบร้อย หลุดเกณฑ์ตามเวลาชัดเจน
                          </p>
                        </div>
                        <div className="text-lg font-bold text-rose-600 font-mono mt-2 flex items-baseline gap-1">
                          {departmentKPI.pendingOverdueFailed.length} <span className="text-xs text-slate-400 font-normal">บริษัท</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* List breakdown by KPI efficiency */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 mt-4">
                    <h4 className="text-[11.5px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>📂 ตรวจเช็คสถานะและแยกรายชื่อบริษัทตามประสิทธิภาพเวลา</span>
                      <span className="text-[9px] text-slate-400 font-mono font-medium">คลิกการ์ดเพื่อค้นหาและลงมือทำงานในตารางหลักทันที</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Box 1: Fail/Overdue */}
                      <div className="bg-white border border-rose-200 rounded-xl p-3 flex flex-col">
                        <div className="flex items-center justify-between pb-1.5 border-b border-rose-100 mb-2">
                          <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> ตกเกณฑ์ KPI ล่าช้า ({departmentKPI.completedLate.length + departmentKPI.pendingOverdueFailed.length} บ.)
                          </span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {departmentKPI.pendingOverdueFailed.map(t => {
                            const diffVal = getDaysDiff(SYSTEM_TODAY, t.contractEndDate) || 0;
                            return (
                              <div
                                key={t.id}
                                onClick={() => { setSearchQuery(t.companyName); setActiveTab("sheet"); }}
                                className="border border-rose-100 hover:border-rose-400 p-2.5 rounded-lg text-xs transition-all cursor-pointer shadow-xs flex items-center justify-between gap-3 bg-rose-50/5 hover:bg-rose-50/20"
                              >
                                <div>
                                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                    🏢 {t.companyName}
                                    {t.isExtendedContract && (
                                      <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1 rounded-sm leading-none border border-amber-200">ขยายเวลา</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    หมดสัญญา:{" "}
                                    {t.isExtendedContract && t.originalContractEndDate ? (
                                      <span className="inline-flex items-center gap-1">
                                        <span className="line-through text-slate-400">{t.originalContractEndDate}</span>
                                        <strong className="font-bold text-amber-600">{t.contractEndDate}</strong>
                                      </span>
                                    ) : (
                                      <strong className="font-bold text-slate-600">{t.contractEndDate}</strong>
                                    )}{" "}
                                    • เข้าตรวจ: {t.inspectionDate}
                                  </p>
                                  <p className="text-[10px] text-rose-700 font-bold mt-1">
                                    ผู้ดูแล: <span className="bg-rose-100/60 text-rose-800 px-1 py-0.2 rounded text-[9.5px]">{t.assignee}</span>
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="bg-rose-600 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded block">
                                    เลยดีล {diffVal} วัน
                                  </span>
                                  <span className="text-[9px] text-rose-500 font-bold block mt-1">ค้างตรวจเกิน 30 วัน</span>
                                </div>
                              </div>
                            );
                          })}

                          {departmentKPI.completedLate.map(t => {
                            const delayDays = getDaysDiff(t.endDate || SYSTEM_TODAY, t.contractEndDate) || 0;
                            return (
                              <div
                                key={t.id}
                                onClick={() => { setSearchQuery(t.companyName); setActiveTab("sheet"); }}
                                className="border border-amber-200 hover:border-amber-400 p-2.5 rounded-lg text-xs transition-all cursor-pointer shadow-xs flex items-center justify-between gap-3 bg-amber-50/5 hover:bg-amber-50/15"
                              >
                                <div>
                                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                    🏢 {t.companyName}
                                    {t.isExtendedContract && (
                                      <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1 rounded-sm leading-none border border-amber-200">ขยายเวลา</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    หมดสัญญา:{" "}
                                    {t.isExtendedContract && t.originalContractEndDate ? (
                                      <span className="inline-flex items-center gap-1">
                                        <span className="line-through text-slate-400">{t.originalContractEndDate}</span>
                                        <strong className="font-bold text-amber-600">{t.contractEndDate}</strong>
                                      </span>
                                    ) : (
                                      <strong className="font-bold text-slate-600">{t.contractEndDate}</strong>
                                    )}{" "}
                                    • ส่งเล่มจริง: {t.endDate}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">ผู้ประสานงานหลัก: {t.assignee}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="bg-amber-500 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded block">
                                    ใช้เวลา {delayDays} วัน
                                  </span>
                                  <span className="text-[9px] text-amber-600 font-semibold block mt-1">เรียบร้อยแต่เกิน 30 วัน</span>
                                </div>
                              </div>
                            );
                          })}

                          {(departmentKPI.completedLate.length + departmentKPI.pendingOverdueFailed.length) === 0 && (
                            <div className="text-center py-6 text-[10.5px] text-slate-400 italic">
                              🎉 ไม่มีบริษัทตกเกณฑ์ แผนกทำผลงานได้ตามกำหนดเวลา!
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Box 2: Compliant on track */}
                      <div className="bg-white border border-emerald-200 rounded-xl p-3 flex flex-col">
                        <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100 mb-2">
                          <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ผ่านเกณฑ์ตามเกณฑ์เวลา ({departmentKPI.completedOnTime.length + departmentKPI.pendingOnTrack.length} บ.)
                          </span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {departmentKPI.completedOnTime.map(t => {
                            const realDays = getDaysDiff(t.endDate || SYSTEM_TODAY, t.contractEndDate) || 0;
                            return (
                              <div
                                key={t.id}
                                onClick={() => { setSearchQuery(t.companyName); setActiveTab("sheet"); }}
                                className="border border-emerald-100 hover:border-emerald-400 p-2.5 rounded-lg text-xs transition-all cursor-pointer shadow-xs flex items-center justify-between gap-3 bg-emerald-50/5 hover:bg-emerald-50/20"
                              >
                                <div>
                                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                    🏢 {t.companyName}
                                    {t.isExtendedContract && (
                                      <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1 rounded-sm leading-none border border-amber-200">ขยายเวลา</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    หมดสัญญา:{" "}
                                    {t.isExtendedContract && t.originalContractEndDate ? (
                                      <span className="inline-flex items-center gap-1">
                                        <span className="line-through text-slate-400">{t.originalContractEndDate}</span>
                                        <strong className="font-bold text-amber-600">{t.contractEndDate}</strong>
                                      </span>
                                    ) : (
                                      <strong className="font-bold text-slate-600">{t.contractEndDate}</strong>
                                    )}{" "}
                                    • ส่งเล่มจริง: {t.endDate}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">ส่งมอบโดย: {t.assignee}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="bg-emerald-500 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded block">
                                    ใน {realDays} วัน
                                  </span>
                                  <span className="text-[9px] text-emerald-600 font-bold block mt-1">✓ สำเร็จทันเวลา</span>
                                </div>
                              </div>
                            );
                          })}

                          {departmentKPI.pendingOnTrack.map(t => {
                            const diffDays = getDaysDiff(SYSTEM_TODAY, t.contractEndDate) || 0;
                            return (
                              <div
                                key={t.id}
                                onClick={() => { setSearchQuery(t.companyName); setActiveTab("sheet"); }}
                                className="border border-blue-100 hover:border-blue-400 p-2.5 rounded-lg text-xs transition-all cursor-pointer shadow-xs flex items-center justify-between gap-3 bg-blue-50/5 hover:bg-blue-50/15"
                              >
                                <div>
                                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                    🏢 {t.companyName}
                                    {t.isExtendedContract && (
                                      <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1 rounded-sm leading-none border border-amber-200">ขยายเวลา</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    หมดสัญญา:{" "}
                                    {t.isExtendedContract && t.originalContractEndDate ? (
                                      <span className="inline-flex items-center gap-1">
                                        <span className="line-through text-slate-400">{t.originalContractEndDate}</span>
                                        <strong className="font-bold text-amber-600">{t.contractEndDate}</strong>
                                      </span>
                                    ) : (
                                      <strong className="font-bold text-slate-600">{t.contractEndDate}</strong>
                                    )}{" "}
                                    • แพลนตรวจ: {t.inspectionDate}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">ผู้ประสานหลัก: {t.assignee}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="bg-blue-500 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded block">
                                    {diffDays <= 0 ? `เหลือ ${-diffDays + 30} วัน` : `เลยไปแล้ว ${diffDays} วัน`}
                                  </span>
                                  <span className="text-[9px] text-blue-600 font-semibold block mt-1">⏳ รอตรวจ/กำลังทำ</span>
                                </div>
                              </div>
                            );
                          })}

                          {(departmentKPI.completedOnTime.length + departmentKPI.pendingOnTrack.length) === 0 && (
                            <div className="text-center py-6 text-[10.5px] text-slate-400 italic">
                              ไม่มีบริษัทที่ตรงตามกลุ่มเงื่อนเวลา ณ เดือนนี้
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. WORK SERVICES DISTRIBUTION (รับประเภทไหน กี่บริษัท) */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs" id="services_distribution_widget">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 border-b border-slate-100 pb-2 gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Archive className="w-4 h-4 text-purple-600" /> 3. ตรวจสอบการเลือกรับงานประเภทต่างๆ (รับงานประเภทไหน กี่บริษัท)
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">ยอดรวมจำนวนแต่ละบริษัทและพนักงานจำแนกตามความต้องการบริการของโรงพยาบาล (จัดเรียงจากมากไปน้อย)</p>
                    </div>
                    {/* Highlight "บริษัทไม่รับผลใดๆ" count specifically */}
                    <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-xs shrink-0">
                      <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">ส่วนที่บริษัทไม่รับผลใดๆ:</span>
                      <strong className="text-rose-700 text-sm font-black">
                        {departmentKPI.serviceBreakdown.find(s => s.serviceName === "บริษัทไม่รับผลใดๆ")?.companyCount || 0} บริษัท
                      </strong>
                    </div>
                  </div>

                  {/* Summary Comparative Chart */}
                  <div className="w-full h-80 mb-6 border border-slate-100 rounded-xl bg-slate-50/50 p-3 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentKPI.serviceBreakdown} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="serviceName" type="category" tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={125} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(241, 245, 249, 0.5)'}} />
                        <Bar dataKey="companyCount" name="จำนวนบริษัท" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14}>
                          {departmentKPI.serviceBreakdown.map((entry, index) => {
                            let fillColor = "#6366f1"; // Default Indigo
                            if (entry.serviceName === "บริษัทไม่รับผลใดๆ") fillColor = "#f43f5e"; // Rose
                            else if (entry.serviceName === "บริษัทไม่มียอดเข้าตรวจ") fillColor = "#f97316"; // Orange
                            else if (entry.serviceName === "รับงานทุกงาน") fillColor = "#7c3aed"; // Violet
                            return <Cell key={`cell-${index}`} fill={fillColor} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departmentKPI.serviceBreakdown.map((srv) => {
                      const percentageShare = dashboardTasks.length > 0 ? Math.round((srv.companyCount / dashboardTasks.length) * 100) : 0;
                      return (
                        <div key={srv.serviceName} className="bg-slate-50/60 border border-slate-250/70 p-4 rounded-xl shadow-xs transition-all flex flex-col justify-between hover:shadow-sm">
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <span className="text-xs font-bold text-slate-800 bg-white border px-2 py-1 rounded-lg shadow-2xs leading-snug truncate block max-w-[210px] sm:max-w-xs" title={srv.serviceName}>
                                {srv.serviceName}
                              </span>
                              <span className="bg-purple-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0">
                                {srv.companyCount} บริษัท
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-400 font-semibold mb-2">
                              👥 ยอดความคุมพนักงานตรวจ: <strong className="text-slate-800 font-bold">{srv.totalEmployees.toLocaleString()} คน</strong>
                            </p>

                            <div className="my-2.5">
                              <div className="flex justify-between text-[9px] text-slate-400 mb-1 font-mono">
                                <span>สัดส่วนในโครงการรวม</span>
                                <span>{percentageShare}%</span>
                              </div>
                              <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                <div className="bg-purple-500 h-full rounded" style={{ width: `${percentageShare}%` }} />
                              </div>
                            </div>

                            {/* Tags list for companies */}
                            <div className="mt-3.5 pt-2.5 border-t border-slate-200/55">
                              <p className="text-[9.5px] text-slate-400 font-extrabold uppercase mb-1.5">รายชื่อบริษัทที่เลือกตรวจ:</p>
                              {srv.companies.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                  {srv.companies.map(comp => (
                                    <span
                                      key={comp.id}
                                      onClick={() => { setSearchQuery(comp.name); setActiveTab("sheet"); }}
                                      className="bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-slate-600 hover:text-purple-800 text-[9.5px] px-1.5 py-0.5 rounded cursor-pointer transition-all leading-relaxed inline-block font-medium shadow-2xs hover:scale-101 max-w-[155px] truncate"
                                      title={`ดับเบิลคลิกเพื่อดึงข้อมูลหลัก สัญญา:${comp.contractEndDate}`}
                                    >
                                      🏢 {comp.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">ไม่มีบันทึกข้อมูลบริการนี้</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. DELIVERY CHANNELS DISTRIBUTION (วิเคราะห์ช่องทางส่งเล่ม) */}
                {(() => {
                  const emailCount = dashboardTasks.filter(t => t.deliveryChannel === "E-mail").length;
                  const postCount = dashboardTasks.filter(t => t.deliveryChannel === "ไปรษณีย์").length;
                  const otherCount = dashboardTasks.filter(t => t.deliveryChannel !== "E-mail" && t.deliveryChannel !== "ไปรษณีย์").length;
                  const total = emailCount + postCount + otherCount;
                  const deliveryChannelData = [
                    { name: "E-mail (อีเมล)", value: emailCount, percentage: total > 0 ? Math.round((emailCount / total) * 100) : 0, color: "#3b82f6" },
                    { name: "ไปรษณีย์ (จัดส่งเล่ม)", value: postCount, percentage: total > 0 ? Math.round((postCount / total) * 100) : 0, color: "#f59e0b" },
                    { name: "อื่นๆ", value: otherCount, percentage: total > 0 ? Math.round((otherCount / total) * 100) : 0, color: "#10b981" }
                  ];

                  return (
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs" id="delivery_channel_distribution_widget">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-indigo-600" /> 4. ตรวจสอบสัดส่วนช่องทางที่บริษัทเลือกรับงานเล่มรายงาน (Delivery Channel Comparison)
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">กราฟแสดงการเปรียบเทียบสัดส่วนและยอดสรุปของช่องจัดการกระดาษ/อีเมลที่ลูกค้าตรวจเลือกมา</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        {/* Recharts Pie Chart */}
                        <div className="lg:col-span-4 flex flex-col items-center justify-center bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200">
                          <div className="w-full h-48 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={deliveryChannelData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={65}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  {deliveryChannelData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`${value} บริษัท`]} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex items-center gap-6 mt-2">
                            {deliveryChannelData.map((entry) => (
                              <div key={entry.name} className="flex items-center gap-1.5 text-xs font-medium">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-slate-600">{entry.name} ({entry.percentage}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Detailed Cards */}
                        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {deliveryChannelData.map((channel) => (
                            <div key={channel.name} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all">
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs font-bold text-slate-800 px-2.5 py-1 rounded-lg bg-slate-100 border">{channel.name}</span>
                                  <span className="text-xs font-mono font-bold text-slate-500">{channel.percentage}%</span>
                                </div>
                                <h2 className="text-2xl font-black font-mono text-slate-850 mb-1">
                                  {channel.value} <span className="text-xs text-slate-400 font-normal">บริษัท</span>
                                </h2>
                                <p className="text-[10.5px] text-slate-500 leading-relaxed font-light">
                                  ช่องส่งรายงานตามสัญญาลูกค้ากลุ่มเป้าหมาย จัดทำตามมาตรฐานการตรวจสอบข้อมูลของโรงพยาบาล
                                </p>
                              </div>
                              <div className="mt-4 pt-3 border-t border-slate-100">
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ backgroundColor: channel.color, width: `${channel.percentage}%` }} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}

            {/* SUB-VIEW 2: INDIVIDUAL TEAM PERFORMANCE TRACKER */}
            {dashboardSubTab === "performance_individual" && (
              <div className="flex flex-col gap-5 animate-fade-in" id="dashboard_individual_performance_tab">
                
                {/* Team Performance Dashboard Cards & Table */}
                <div id="team_performance_dashboard">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3.5 gap-2 border-b border-slate-200 pb-2 bg-slate-50 p-2.5 rounded-xl">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-600" /> Team Performance Tracker
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Base Weights: ทั่วไป = 1 | อาชีวอนามัย = 2 | ซับซ้อน = 3
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
                    {teamPerformance.map(member => (
                      <div
                        key={member.name}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-[10px] uppercase shadow-sm">
                                {member.name.substring(0, 1).toUpperCase()}
                              </div>
                              <h4 className="font-sans font-bold text-slate-800 text-xs">
                                {member.name}
                              </h4>
                            </div>
                            <span className="text-slate-400 text-[10px]">
                              {member.totalAssigned} บ.
                            </span>
                          </div>

                          <div className="space-y-1.5 text-[11px] text-slate-600 mb-2.5">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                              <span className="font-medium text-slate-500">จำนวนที่ดูแลหลัก:</span>
                              <span className="font-bold text-slate-800">{member.totalAssigned} บริษัท</span>
                            </div>
                            <div className="flex justify-between items-center bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100/40">
                              <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[10.5px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                ทำเสร็จเรียบร้อย:
                              </span>
                              <span className="font-bold text-emerald-700 font-mono">
                                {member.completedCount} บ.
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-amber-50/50 px-2 py-0.5 rounded border border-amber-100/40">
                              <span className="text-amber-700 font-semibold flex items-center gap-1 text-[10.5px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                กำลังดำเนินการ:
                              </span>
                              <span className="font-bold text-amber-700 font-mono">
                                {member.inProgressCount} บ.
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">
                              <span className="text-slate-500 font-medium flex items-center gap-1 text-[10.5px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                ยังไม่เริ่มทำ:
                              </span>
                              <span className="font-semibold text-slate-600 font-mono">
                                {member.notStartedCount} บ.
                              </span>
                            </div>
                            <div className="flex justify-between pt-1 font-sans">
                              <span>พนักงานสำเร็จ:</span>
                              <span className="font-semibold text-slate-700">{member.completedEmployees.toLocaleString()} คน</span>
                            </div>
                            <div className="flex justify-between font-sans">
                              <span>แต้มความยากสำเร็จ:</span>
                              <span className="font-bold text-blue-600">
                                {member.completedWeight} แต้ม
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Compact high-density progress style matching the theme */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>ความคืบหน้า</span>
                            <span>{member.progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                member.progressPercentage >= 80 ? "bg-emerald-500" :
                                member.progressPercentage >= 50 ? "bg-blue-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${member.progressPercentage}%` }}
                            />
                          </div>
                          
                          {/* Graphical visual block text box */}
                          <pre className="font-mono text-[9px] text-slate-505 tracking-wider bg-slate-50 py-0.5 rounded text-center select-none border border-slate-100 leading-none mt-1">
                            {member.progressTextIcon}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Comparative Visual Graph (Pure CSS Bento Box) */}
                  <div className="bg-slate-900 text-white rounded-xl p-4.5 shadow-sm border border-slate-800">
                    <h4 className="text-[11px] text-slate-400 uppercase font-mono mb-3 flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-blue-400" /> GRAPHICAL PERFORMANCE OVERVIEW</span>
                      <span className="text-[10px] text-slate-500 font-normal">เปรียบเทียบร้อยละความคืบหน้าสะสม</span>
                    </h4>
                    <div className="space-y-3">
                      {teamPerformance.map(member => (
                        <div key={member.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800/50 pb-2.5 last:border-0 last:pb-0">
                          <div className="w-36 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-xs font-semibold text-slate-200">
                              {member.name}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="w-full bg-slate-800 rounded h-2 overflow-hidden flex">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${member.progressPercentage}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={`h-full rounded ${
                                  member.progressPercentage > 80
                                    ? "bg-emerald-500"
                                    : member.progressPercentage > 50
                                    ? "bg-blue-500"
                                    : "bg-amber-500"
                                }`}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-[10.5px] font-mono sm:pl-4 min-w-[270px] text-right justify-between">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <span>เสร็จ: <strong className="text-emerald-400 font-bold">{member.completedCount}</strong></span>
                              <span className="text-slate-600">|</span>
                              <span>กำลังทำ: <strong className="text-amber-400 font-bold">{member.inProgressCount}</strong></span>
                              <span className="text-slate-600">|</span>
                              <span>ทั้งหมด: {member.totalAssigned}</span>
                            </span>
                            <span className="text-slate-200 font-medium whitespace-nowrap min-w-[110px] text-right">
                              {member.progressPercentage}% คืบหน้า ({member.completedWeight}★)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recharts Analytics Bento Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4" id="dashboard_analytics_charts">
                    {/* Chart 1: Company Distribution */}
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> จำนวนบริษัทที่ดูแล (รายบุคคล)
                        </h4>
                        <p className="text-[10px] text-slate-400 mb-4 font-light font-display">จำนวนบริษัทสะสมแยกรายเจ้าหน้าที่รับผิดชอบ</p>
                      </div>
                      <div className="w-full h-56" style={{ minHeight: "220px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="จำนวนบริษัท" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={26}>
                              {chartPerformanceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? "#2563eb" : index === 1 ? "#3b82f6" : index === 2 ? "#60a5fa" : "#93c5fd"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chart 2: Employee Count */}
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> จำนวนพนักงานที่ดูแล (คน)
                        </h4>
                        <p className="text-[10px] text-slate-400 mb-4 font-light font-display">ยอดรวมพนักงานในส่วนความรับผิดชอบของบุคลากรรายคน</p>
                      </div>
                      <div className="w-full h-56" style={{ minHeight: "220px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="จำนวนพนักงาน" fill="#10b981" radius={[4, 4, 0, 0]} barSize={26}>
                              {chartPerformanceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? "#059669" : index === 1 ? "#10b981" : index === 2 ? "#34d399" : "#6ee7b7"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chart 3: Services / Work Breakdown */}
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> ประเภทบริการที่เลือกรับ (Stacked)
                        </h4>
                        <p className="text-[10px] text-slate-400 mb-4 font-light font-display">สัดส่วนประเภทรายงานผลสุขภาพแยกย่อยที่แต่ละบุคคลดูแล</p>
                      </div>
                      <div className="w-full h-56" style={{ minHeight: "220px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartPerformanceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="สรุปรวมองค์กร" stackId="a" fill="#3b82f6" barSize={26} />
                            <Bar dataKey="Excel" stackId="a" fill="#8b5cf6" />
                            <Bar dataKey="ใบรายงานสำหรับ HR" stackId="a" fill="#10b981" />
                            <Bar dataKey="walk through survey" stackId="a" fill="#06b6d4" />
                            <Bar dataKey="ปัจจัยเสี่ยง" stackId="a" fill="#ec4899" />
                            <Bar dataKey="จผส.1" stackId="a" fill="#d946ef" />
                            <Bar dataKey="Executive summary" stackId="a" fill="#64748b" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </section>
        )}

        {/* 2. SECTION: DATA TRACKING SHEET (TABLE) */}
        {activeTab === "tasks" && (
          <section className="flex flex-col gap-4" id="work_tracker_sheet_section">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-1.5 animate-fade-in">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between w-full sm:w-auto">
                <span className="flex items-center gap-1.5"><TableProperties className="w-4 h-4 text-blue-600" /> Data Tracking Sheet</span>
              </h2>
              
              <div className="flex flex-wrap gap-1.5 self-stretch sm:self-auto justify-end">
                <button
                  onClick={handleExportCSV}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  title="ส่งออกรายงานแถวตามตัวกรองลง Excel/CSV"
                >
                  <Download className="w-3 h-3 text-emerald-600" /> Export CSV
                </button>
                <button
                  onClick={handleImportCSVClick}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  title="นำข้อมูลยอดใหม่เข้า"
                >
                  <Upload className="w-3 h-3 text-blue-600" /> Import CSV
                </button>
                {selectedTaskIds.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer animate-in fade-in"
                    title={`ลบ ${selectedTaskIds.length} รายการที่เลือก`}
                  >
                    <Trash2 className="w-3 h-3" /> ลบที่เลือก ({selectedTaskIds.length})
                  </button>
                )}
                <button
                  onClick={() => handleOpenForm(null)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all text-nowrap cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> บันทึกงานเพิ่ม
                </button>
              </div>
            </div>

            {/* URGENT TASK ALERT STRIP */}
            {tasks.filter(t => t.isUrgent).length > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-start sm:items-center gap-2">
                  <span className="flex h-2 w-2 relative mt-1 sm:mt-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <div>
                    <p className="font-extrabold text-rose-800">📌 บอร์ดแจ้งเตือนตามงานด่วนล่าสุด ({tasks.filter(t => t.isUrgent).length} โครงการ)</p>
                    <p className="text-rose-600 mt-0.5">มีสัญญาณเร่งด่วนส่งพึ่งทีม กรุณาตรวจสอบบริษัทที่มีสัญลักษณ์ระฆังสีแดง 🔔 หรือตรวจสอบใบสัญลักษณ์เตือนด่วนในระบบ</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                  {tasks.filter(t => t.isUrgent).slice(0, 4).map(ut => (
                    <span
                      key={ut.id}
                      onClick={() => handleTriggerUrgent(ut)}
                      className="bg-white hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      title="ดูรายละเอียดหรือจัดการตามด่วน"
                    >
                      🚨 {ut.companyName}
                    </span>
                  ))}
                  {tasks.filter(t => t.isUrgent).length > 4 && (
                    <span className="text-[10px] text-rose-600 font-bold bg-white px-2 py-0.5 rounded-lg border border-rose-200">
                      และอื่น ๆ ...
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* FILTERING & SEARCH PANEL CONTAINER */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col gap-3.5" id="filter_panel">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-emerald-700" /> ตัวกรองละเอียด ({filteredTasks.length} บริษัทเจอ)
                </h3>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs font-medium text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> ล้างตัวส่งกรองทั้งหมด ({activeFiltersCount})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Search Term */}
                <div className="sm:col-span-2 relative">
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold">พิมพ์ค้นหางาน</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ชื่อบริษัท / เลขเอกสาร / โน้ต..."
                    className="w-full bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white text-xs px-3.5 py-1.5 rounded-lg transition-all pl-8 placeholder:text-slate-400 outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-[25px] pointer-events-none" />
                </div>

                {/* Filter Assignee */}
                <div className="sm:col-span-2 font-display">
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold">ผู้รับผิดชอบ (⭐)</label>
                  <select
                    value={filterAssignee}
                    onChange={(e) => setFilterAssignee(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-teal-500 focus:bg-white text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="all">ทั้งหมด (ทุกคน)</option>
                    {assigneesList.map(assignee => (
                      <option key={assignee} value={assignee}>
                        {assignee}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Sale */}
                <div className="sm:col-span-2 font-display">
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold">พนักงานขาย (Sale)</label>
                  <select
                    value={filterSale}
                    onChange={(e) => setFilterSale(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-teal-500 focus:bg-white text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="all">ทั้งหมด</option>
                    {salesList.map(item => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Status */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold">สถานะความคืบหน้า</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-teal-500 focus:bg-white text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="all">ทั้งหมด (ทุกสถานะ)</option>
                    <option value="ยังไม่เริ่ม">ยังไม่เริ่ม</option>
                    <option value="กำลังทำ">กำลังทำ</option>
                    <option value="✓ เรียบร้อยแล้ว">✓ เรียบร้อยแล้ว</option>
                  </select>
                </div>

                {/* Filter Canal Delivery */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold">ช่องทางส่งเอกสาร</label>
                  <select
                    value={filterChannel}
                    onChange={(e) => setFilterChannel(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-teal-500 focus:bg-white text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="all">ทุกช่องทาง</option>
                    <option value="E-mail">E-mail</option>
                    <option value="ไปรษณีย์">ไปรษณีย์</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>

                {/* Metric Overlay quick filter */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold">กรองตามแดชบอร์ด</label>
                  <select
                    value={metricFilter}
                    onChange={(e) => setMetricFilter(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-teal-500 focus:bg-white text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="all">ไม่ใช้นอกเหนือ</option>
                    <option value="completed">เฉพาะ เรียบร้อยแล้ว</option>
                    <option value="inprogress">เฉพาะ กำลังทำ</option>
                    <option value="notstarted">เฉพาะ ยังไม่เริ่ม</option>
                    <option value="overdue">เฉพาะ สัญญาค้างเลยกำหนด (Expired)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Date-based filters (Year and Month) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2.5 border-t border-slate-100">
                {/* Year filter */}
                <div className="sm:col-span-3">
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold">📅 เลือกปีปฏิทิน (Year)</label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer font-semibold text-slate-700"
                  >
                    <option value="all">แสดงงานทั้งหมดปี (All Years)</option>
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>ปี ค.ศ. {yr} (พ.ศ. {Number(yr) + 543})</option>
                    ))}
                  </select>
                </div>

                {/* Month filter */}
                <div className="sm:col-span-3">
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold">🌙 เลือกเดือน (Month)</label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer font-semibold text-teal-700"
                  >
                    <option value="all">แสดงงานทั้งหมดเดือน (All Months)</option>
                    {MONTHS_THAI.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Date Basis selector */}
                <div className="sm:col-span-3">
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold">🔍 คัดกรองอิงตามเกณฑ์ข้อใด</label>
                  <select
                    value={filterDateBasis}
                    onChange={(e) => setFilterDateBasis(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer text-slate-700 font-semibold"
                  >
                    <option value="inspectionDate">🗓️ วันที่เข้าตรวจสุขภาพ (Inspection)</option>
                    <option value="contractEndDate">📆 วันสิ้นสุดสัญญา (Contract End)</option>
                    <option value="endDate">🏁 วันที่ส่งมอบเสร็จสิ้น (Completed Date)</option>
                  </select>
                </div>

                {/* Quick Shortcuts for Current/Next Periods */}
                <div className="sm:col-span-3 flex items-end gap-1.5">
                  <button
                    onClick={() => {
                      setFilterYear("2026");
                      setFilterMonth("06"); // June
                      setFilterDateBasis("inspectionDate");
                    }}
                    className="flex-1 py-1 px-2 border border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-[10px] font-bold text-slate-600 rounded transition-all text-center h-[30px]"
                    title="มิถุนายน 2026"
                  >
                    เดือนนี้ (มิ.ย.)
                  </button>
                  <button
                    onClick={() => {
                      setFilterYear("2026");
                      setFilterMonth("05"); // May
                      setFilterDateBasis("inspectionDate");
                    }}
                    className="flex-1 py-1 px-2 border border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-[10px] font-bold text-slate-600 rounded transition-all text-center h-[30px]"
                    title="พฤษภาคม 2026"
                  >
                    เดือนก่อน (พ.ค.)
                  </button>
                  <button
                    onClick={() => {
                      setFilterYear("2026");
                      setFilterMonth("all");
                    }}
                    className="flex-1 py-1 px-2 border border-blue-200 bg-blue-50/45 text-blue-700 hover:bg-blue-50 text-[10px] font-bold rounded transition-all text-center h-[30px]"
                  >
                    ทั้งปี 2026
                  </button>
                </div>
              </div>
            </div>

            {/* THE TRACKING SHEET TABLE MODULE */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" id="tasks_table_module">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[11px] font-display font-semibold uppercase tracking-wider border-b border-slate-200 select-none">
                      <th className="px-3 py-3 w-[40px] text-center">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={paginatedTasks.length > 0 && selectedTaskIds.length === paginatedTasks.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th
                        onClick={() => handleSort("companyName")}
                        className="px-4 py-3 cursor-pointer hover:bg-slate-200 text-nowrap transition-colors min-w-[200px]"
                      >
                        ชื่อบริษัท <ArrowSort active={sortBy === "companyName"} dir={sortDirection} />
                      </th>
                      <th
                        onClick={() => handleSort("arCode")}
                        className="px-3 py-3 cursor-pointer hover:bg-slate-200 text-nowrap transition-colors"
                      >
                        AR Code <ArrowSort active={sortBy === "arCode"} dir={sortDirection} />
                      </th>
                      <th
                        onClick={() => handleSort("employeeCount")}
                        className="px-3 py-3 cursor-pointer hover:bg-slate-200 text-nowrap text-right transition-colors"
                      >
                        พนักงาน (ทั้งหมด / ตรวจจริง) <ArrowSort active={sortBy === "employeeCount"} dir={sortDirection} />
                      </th>
                      <th
                        onClick={() => handleSort("inspectionDate")}
                        className="px-3 py-3 cursor-pointer hover:bg-slate-200 text-nowrap transition-colors"
                      >
                        วันที่ตรวจ <ArrowSort active={sortBy === "inspectionDate"} dir={sortDirection} />
                      </th>
                      <th
                        onClick={() => handleSort("contractEndDate")}
                        className="px-3 py-3 cursor-pointer hover:bg-slate-200 text-nowrap transition-colors"
                      >
                        หมดสัญญา <ArrowSort active={sortBy === "contractEndDate"} dir={sortDirection} />
                      </th>
                      <th className="px-3.5 py-3 text-nowrap">งานที่เลือกรับ</th>
                      <th className="px-3 py-3 text-nowrap">ช่องทางส่ง</th>
                      <th
                        onClick={() => handleSort("assignee")}
                        className="px-3.5 py-3 cursor-pointer hover:bg-slate-200 text-nowrap transition-colors"
                      >
                        ผู้รับผิดชอบ (⭐) <ArrowSort active={sortBy === "assignee"} dir={sortDirection} />
                      </th>
                      <th
                        onClick={() => handleSort("sale")}
                        className="px-3.5 py-3 cursor-pointer hover:bg-slate-200 text-nowrap transition-colors"
                      >
                        Sale <ArrowSort active={sortBy === "sale"} dir={sortDirection} />
                      </th>
                      <th
                        onClick={() => handleSort("weightScore")}
                        className="px-3 py-3 cursor-pointer hover:bg-slate-200 text-nowrap text-center transition-colors"
                      >
                        ความยาก <ArrowSort active={sortBy === "weightScore"} dir={sortDirection} />
                      </th>
                      <th
                        onClick={() => handleSort("status")}
                        className="px-3.5 py-3 cursor-pointer hover:bg-slate-200 text-nowrap transition-colors"
                      >
                        สถานะงาน <ArrowSort active={sortBy === "status"} dir={sortDirection} />
                      </th>
                      <th className="px-3 py-3 text-nowrap">วันที่เริ่ม/วันที่เสร็จ</th>
                      <th className="px-3 py-3 min-w-[150px]">ส่งที่ไหน/เมื่อไหร่</th>
                      <th className="px-3 py-3 min-w-[120px]">หมายเหตุ</th>
                      <th
                        onClick={() => handleSort("docNo")}
                        className="px-3.5 py-3 cursor-pointer hover:bg-slate-200 text-nowrap transition-colors"
                      >
                        เลขที่เอกสาร <ArrowSort active={sortBy === "docNo"} dir={sortDirection} />
                      </th>
                      <th className="px-3 py-3 text-center sticky right-0 bg-slate-100 z-10 w-[140px] shadow-l border-l border-slate-200">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="text-center py-12 text-slate-400 bg-slate-50/50">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <FileSpreadsheet className="w-10 h-10 text-slate-300" />
                            <p className="text-sm">ไม่พบข้อมูลใบงานตรวจสุขภาพที่ตรงตามตัวกรองปัจจุบัน</p>
                            <button
                              onClick={handleClearFilters}
                              className="text-xs text-emerald-600 font-semibold underline hover:text-emerald-800 mt-1 cursor-pointer"
                            >
                              แสดงข้อมูลทั้งหมดใหม่
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedTasks.map((task, index) => {
                        const expired = getIsTaskOverdue(task);
                        return (
                          <tr
                            key={task.id}
                            className={`group transition-colors hover:bg-slate-50/60 ${
                              selectedTaskIds.includes(task.id) ? "bg-blue-50/60" : ""
                            } ${
                              expired ? "bg-rose-50/40 hover:bg-rose-50/70 border-l-2 border-rose-500" : ""
                            } ${task.isUrgent ? "bg-amber-50/40 hover:bg-amber-50/70" : ""}`}
                          >
                            <td className="px-3 py-3 text-center">
                              <input 
                                type="checkbox"
                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={selectedTaskIds.includes(task.id)}
                                onChange={() => handleSelectTask(task.id)}
                              />
                            </td>
                            {/* Company Name */}
                            <td className="px-4 py-3 font-display">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center flex-wrap gap-1.5">
                                  <span className="font-semibold text-slate-900 leading-tight">
                                    {task.companyName}
                                  </span>
                                  {task.companyGroup && (
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchQuery(task.companyGroup || "");
                                        showToast(`กรองข้อมูลกลุ่มเครือบริษัท "${task.companyGroup}"`, "info");
                                      }}
                                      className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-indigo-200 cursor-pointer shadow-3xs transition-all"
                                      title="คลิกเพื่อกรองกลุ่มเครือบริษัทเดียวกันทั้งหมด"
                                    >
                                      🏢 เครือ: {task.companyGroup}
                                    </span>
                                  )}
                                  {task.isUrgent && (
                                    <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-rose-200 animate-pulse">
                                      🚨 ตามด่วน!
                                    </span>
                                  )}
                                </div>
                                {task.isUrgent && task.urgentNote && (
                                  <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 font-bold block w-fit mt-1">
                                    💬 แจ้งทีมด่วน: {task.urgentNote}
                                  </span>
                                )}
                                {task.isExtendedContract && (
                                  <span className="text-[10px] text-amber-700 bg-amber-100/65 px-2 py-0.5 rounded-md border border-amber-200/50 w-fit font-bold flex items-center gap-1 mt-0.5 shadow-3xs">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> ขยายเวลาสิ้นสุดสัญญา
                                  </span>
                                )}
                                {task.lastEditedBy && (
                                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    แก้ไขโดย: <strong className="text-slate-700">{task.lastEditedBy.split("@")[0]}</strong> ({task.lastEditedAt || "11/06"})
                                  </span>
                                )}
                                {expired && (
                                  <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5 mt-0.5">
                                    <AlertTriangle className="w-3" /> สิ้นสุดสัญญาค้างส่ง!
                                  </span>
                                )}
                              </div>
                            </td>
                            {/* AR code */}
                            <td className="px-3 py-3 text-slate-600 font-semibold font-mono">
                              {task.arCode}
                            </td>
                            {/* Employee count */}
                            <td className="px-3 py-3 text-right font-mono text-nowrap">
                              <div className="flex flex-col items-end">
                                <span className="font-semibold text-slate-800">{task.employeeCount ? task.employeeCount.toLocaleString() : "0"} คน</span>
                                <span className="text-[10px] text-teal-600 font-medium">ตรวจจริง: {task.actualEmployeeCount !== undefined ? task.actualEmployeeCount.toLocaleString() : (task.employeeCount || 0).toLocaleString()} คน</span>
                              </div>
                            </td>
                            {/* Inspection Date */}
                            <td className="px-3 py-3 text-slate-600 font-mono text-nowrap">
                              {task.inspectionDate || "-"}
                            </td>
                            {/* Contract End Date */}
                            <td className="px-3 py-3 text-nowrap">
                              <div className="flex flex-col">
                                {task.isExtendedContract && task.originalContractEndDate && (
                                  <span className="line-through text-slate-400 text-[10px] mr-1 font-mono leading-none block">
                                    {task.originalContractEndDate}
                                  </span>
                                )}
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className={`font-mono px-2 py-0.5 rounded-md text-[11px] ${
                                      task.isExtendedContract
                                        ? "bg-amber-100 border border-amber-300 text-amber-800 font-bold shadow-3xs"
                                        : expired
                                        ? "bg-rose-100/90 text-rose-800 font-bold shadow-sm"
                                        : "text-slate-700 hover:text-slate-900"
                                    }`}
                                    title={task.isExtendedContract ? `ขยายระยะเวลาสัญญาจากเดิม ${task.originalContractEndDate}` : ""}
                                  >
                                    {task.contractEndDate || "-"}
                                  </span>
                                  {task.isExtendedContract && (
                                    <span className="bg-amber-500 text-white font-extrabold text-[8.5px] px-1.5 py-0.5 rounded-md shadow-3xs flex items-center leading-none" title="มีการส่งขยายสัญญากับฝ่ายนโยบายเล่มรายงาน">
                                      ขยายเวลา
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            {/* Services List as badged pills */}
                            <td className="px-3.5 py-3">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {task.selectedServices.map(srv => {
                                  let colorClasses = "bg-slate-100 text-slate-700";
                                  if (srv === "สรุปรวมองค์กร") colorClasses = "bg-blue-50 text-blue-800 border-blue-100 border";
                                  if (srv === "Excel") colorClasses = "bg-amber-50 text-amber-800 border-amber-100 border";
                                  if (srv === "ใบรายงานสำหรับ HR") colorClasses = "bg-emerald-50 text-emerald-800 border-emerald-100 border";
                                  if (srv === "walk through survey") colorClasses = "bg-cyan-50 text-cyan-800 border-cyan-100 border";
                                  if (srv === "ปัจจัยเสี่ยง") colorClasses = "bg-rose-50 text-rose-800 border-rose-100 border";
                                  if (srv === "จผส.1") colorClasses = "bg-pink-50 text-pink-800 border-pink-100 border";
                                  if (srv === "Executive summary" || srv === "Excutice Summary (canva)") colorClasses = "bg-indigo-50 text-indigo-800 border-indigo-100 border";
                                  if (srv === "รับงานทุกงาน") colorClasses = "bg-violet-50 text-violet-800 border-violet-100 border font-bold";
                                  if (srv === "บริษัทไม่รับผลใดๆ") colorClasses = "bg-rose-50 text-rose-800 border-rose-100 border font-bold";
                                  if (srv === "บริษัทไม่มียอดเข้าตรวจ") colorClasses = "bg-orange-50 text-orange-850 border-orange-100 border font-bold";

                                  const sAssignee = task.serviceAssignees?.[srv] || task.assignee;
                                  const isSplit = sAssignee !== task.assignee;
                                  const sChannel = task.serviceDeliveryChannels?.[srv];

                                  return (
                                    <span key={srv} className={`text-[10px] px-1.5 py-0.5 rounded flex flex-wrap items-center gap-1.5 ${colorClasses}`} title={`${isSplit ? `ผู้รับผิดชอบงานนี้: ${sAssignee}` : ""}${sChannel ? ` | ช่องทางส่งมอบ: ${sChannel}` : ""}`}>
                                      <span className="font-semibold">{srv}</span>
                                      {sChannel && (
                                        <span className="text-[8.5px] bg-indigo-100 text-indigo-800 font-extrabold px-1 rounded flex items-center gap-0.5 leading-none">
                                          {sChannel === "E-mail" ? "✉️ E-mail" : sChannel === "ไปรษณีย์" ? "📦 ไปรษณีย์" : sChannel}
                                        </span>
                                      )}
                                      {isSplit && (
                                        <span className="text-[8.5px] bg-slate-900/10 px-1 rounded py-0 text-slate-600 font-bold">
                                          👤 {sAssignee}
                                        </span>
                                      )}
                                    </span>
                                  );
                                })}
                                {task.selectedServices.length === 0 && (
                                  <span className="text-slate-400 italic text-[11px]">ไม่ระบุ</span>
                                )}
                              </div>
                            </td>
                            {/* Delivery Channel */}
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                  task.deliveryChannel === "E-mail"
                                    ? "text-blue-600"
                                    : "text-amber-700"
                                }`}
                              >
                                {task.deliveryChannel === "E-mail" ? (
                                  <Mail className="w-3 h-3" />
                                ) : task.deliveryChannel === "ไปรษณีย์" ? (
                                  <Send className="w-3 h-3" />
                                ) : null}
                                {task.deliveryChannel || "-"}
                              </span>
                            </td>
                            {/* Assignee */}
                            <td className="px-3.5 py-3 font-medium">
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 w-fit">
                                  <UserCheck className="w-3 h-3 text-slate-500" />
                                  <span className="font-semibold text-[11px]">{task.assignee}</span>
                                  <span className="text-[8px] text-slate-400 font-normal ml-0.5">(หลัก)</span>
                                </span>
                                {/* Co-workers */}
                                {task.serviceAssignees && Object.values(task.serviceAssignees).some(v => v !== task.assignee) && (
                                  <div className="flex flex-wrap gap-1 mt-0.5 pl-1.5 border-l border-slate-200">
                                    {Array.from(new Set(Object.values(task.serviceAssignees))).filter(v => v !== task.assignee).map((worker, index) => (
                                      <span key={index} className="text-[8px] font-medium text-slate-500 bg-slate-50 border border-slate-150 px-1 rounded leading-none py-0.5">
                                        ร่วม: {worker}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            {/* Sale ⭐ */}
                            <td className="px-3.5 py-3 font-medium">
                              {task.sale ? (
                                <span className="inline-flex items-center bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-amber-800 w-fit shadow-3xs font-semibold text-[11px]">
                                  {task.sale}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">ไม่ระบุ</span>
                              )}
                            </td>
                            {/* Weight Score and Badge */}
                            <td className="px-3 py-3 text-center">
                              <span
                                className={`inline-block w-6 text-center rounded font-bold font-mono py-0.5 text-[11px] ${
                                  task.weightScore === 3
                                    ? "bg-rose-100 text-rose-800"
                                    : task.weightScore === 2
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                                title={
                                  task.weightScore === 3
                                    ? "ความยากสูง/รายงานอาชีวอนามัยซับซ้อนมาก"
                                    : task.weightScore === 2
                                    ? "ความซับซ้อนปานกลาง/มีรายงานอาชีวอนามัย"
                                    : "งานทั่วไป"
                                }
                              >
                                {task.weightScore}★
                              </span>
                            </td>
                            {/* Status and Action Double Click */}
                            <td className="px-3.5 py-3">
                              <button
                                onClick={() => handleToggleStatus(task.id)}
                                className={`text-[11px] font-medium font-display px-2 py-1 rounded-full text-left transition-all hover:scale-105 inline-flex items-center gap-1.5 cursor-pointer ${
                                  task.status === "✓ เรียบร้อยแล้ว"
                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                    : task.status === "กำลังทำ"
                                    ? "bg-amber-100 text-amber-850 hover:bg-amber-205"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                                title="คลิกเพื่อปรับสถานะถัดไปเด่นๆ"
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  task.status === "✓ เรียบร้อยแล้ว" ? "bg-emerald-600" :
                                  task.status === "กำลังทำ" ? "bg-amber-500 animate-ping" : "bg-slate-400"
                                }`} />
                                {task.status}
                              </button>
                            </td>
                            {/* Execution dates */}
                            <td className="px-3 py-3 text-slate-500 font-mono text-[10px]">
                              <div className="flex flex-col">
                                {task.startDate ? (
                                  <span>เริ่ม: {task.startDate}</span>
                                ) : (
                                  <span className="text-slate-300">เริ่ม: -</span>
                                )}
                                {task.endDate ? (
                                  <span className="text-emerald-700 font-semibold">เสร็จ: {task.endDate}</span>
                                ) : (
                                  <span className="text-slate-300">เสร็จ: -</span>
                                )}
                              </div>
                            </td>
                            {/* Delivery details details info */}
                            <td className="px-3 py-3 text-slate-600 truncate max-w-[140px]" title={task.deliveryDetail}>
                              {task.deliveryDetail || <span className="text-slate-300 italic">ยังไม่ได้จัดส่ง</span>}
                            </td>
                            {/* Notes */}
                            <td className="px-3 py-3 text-slate-500 truncate max-w-[130px]" title={task.notes}>
                              {task.notes || <span className="text-slate-300">-</span>}
                            </td>
                            {/* Doc No (moved to the end) */}
                            <td className="px-3.5 py-3 text-nowrap font-mono font-medium text-slate-600">
                              {task.docNo}
                            </td>

                            {/* Sticky Actions */}
                            <td className="px-3 py-3 text-center sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-200 z-10 w-[140px] shadow-sm">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleTriggerUrgent(task)}
                                  className={`p-1.5 rounded transition-all transition-colors cursor-pointer ${
                                    task.isUrgent
                                      ? "text-rose-600 bg-rose-50 hover:bg-rose-100"
                                      : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  }`}
                                  title={task.isUrgent ? "อัปเดต / ปิดระบบตามงานด่วน" : "ส่งแจ้งเตือนตามงานด่วนสะกิดทีม"}
                                >
                                  {task.isUrgent ? <BellRing className="w-3.5 h-3.5 text-rose-500 animate-bounce" /> : <Bell className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleOpenForm(task)}
                                  className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded transition-all transition-colors cursor-pointer"
                                  title="แก้ไขข้อมูลหลัก"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDuplicateTask(task)}
                                  className="p-1 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all transition-colors cursor-pointer"
                                  title="คัดลอกเวิร์ดเบรกดาวน์"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id, task.companyName)}
                                  className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded transition-all transition-colors cursor-pointer"
                                  title="ลบแถวคีย์เวิร์ดตรวจสุขภาพ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table footer count page info */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col items-center sm:flex-row justify-between gap-4 text-xs text-slate-500">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-600">แสดงหน้าละ:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value === "all" ? "all" : Number(e.target.value))}
                      className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-700 outline-none focus:border-blue-500"
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value="all">ทั้งหมด</option>
                    </select>
                  </div>
                  <div>
                    แสดงผลงาน <span className="text-slate-900 font-bold">{paginatedTasks.length}</span> จาก <span className="text-slate-900 font-bold">{filteredTasks.length}</span> บริษัท
                    {pageSize !== "all" && filteredTasks.length > 0 && (
                      <span className="ml-1">(หน้า {currentPage} จาก {totalPages})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {pageSize !== "all" && totalPages > 1 && (
                    <div className="flex items-center gap-1 mr-4">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 rounded border border-slate-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                      >
                        ก่อนหน้า
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 rounded border border-slate-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                      >
                        ถัดไป
                      </button>
                    </div>
                  )}
                  {activeFiltersCount > 0 && (
                    <div className="text-emerald-700 font-medium hidden lg:block">
                      (กรองอยู่ {activeFiltersCount} ตัวกรอง)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* QUICK LEGEND NOTE CARD */}
            <div className="bg-white rounded-xl p-4.5 shadow-sm border border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-bold text-slate-700">คู่มือสัญลักษณ์ประเมินการวัด:</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-[11px]">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> ✓ เรียบร้อยแล้ว (ทำการตรวจนัด และส่งข้อมูลออกเสร็จสิ้น)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> กำลังทำ (ทีมอยู่ระหว่างกระบวนการหรือทำ Executive Summary)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-450 rounded-full bg-slate-350 border" /> ยังไม่เริ่ม (รอวันเข้าตรวจ หรือเอกสารแรกเข้า)</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 border-l sm:border-l sm:pl-4 border-slate-200 leading-relaxed font-sans max-w-[420px]">
                *คะแนนความยาก: งานทั่วไป 1 คะแนน | งานประเมินอาชีวอนามัย/งานมีเสียง/ความดันสูง 2-3 คะแนน เพื่อความเป็นธรรมในตาราง Team Performance
              </div>
            </div>

          </section>
        )}

        {/* 3. SECTION: BACKOFFICE SETTINGS */}
        {activeTab === "backoffice" && (
          currentUser?.role !== "admin" ? (
            <div className="bg-white border border-rose-100 rounded-2xl p-8 max-w-sm mx-auto text-center shadow-md my-12 space-y-4">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">🔒</div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider font-display">ระบบสิทธิ์ปฏิเสธการเข้าถึง</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                ระดับสิทธิ์ผู้ใช้งานปัจจุบันของคุณคือ <strong>{currentUser?.name || "User"} (User)</strong> และคุณไม่ได้รับสิทธิ์แอดมิน (Admin) เพื่อเข้าถึงระบบปรับปรุงส่วนค่าทีม ผู้ประสานงาน ยอดขาย และสมาชิกหลังบ้าน กรุณาติดต่อแอดมินคุณสุนิษาค่ะ!
              </p>
              <button
                onClick={() => setActiveTab("tasks")}
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all"
              >
                กลับหน้าหลักทีมบันทึกตารางงาน
              </button>
            </div>
          ) : (
            <section className="flex flex-col gap-6 animate-fade-in" id="backoffice_section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-slate-700 animate-spin-slow" /> Backoffice System Configuration
                </h2>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">จัดการข้อมูลผู้ประสานงานหลัก พนักงานขาย และสิทธิ์บัญชีผู้ใช้งานระบบหลังบ้าน</p>
              </div>
              <div className="text-[10px] text-slate-500 font-sans bg-slate-100 border border-slate-200 px-2.5 py-1 rounded">
                สถานะแอดมินปัจจุบัน: <span className="font-bold text-blue-700">{currentUser?.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Card 1: Users / Account Management */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-950 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-teal-400" /> บัญชีเข้าใช้ระบบ ({usersList.length})
                      </h3>
                      <p className="text-[9.5px] text-slate-400 leading-none mt-0.5">พนักงานล็อกอินกลุ่มตรวจสุขภาพ</p>
                    </div>
                    <span className="text-[9px] bg-slate-800 text-teal-300 font-mono px-2 py-0.5 rounded font-extrabold border border-teal-500/25">
                      DYNAMIC LOCAL STORAGE
                    </span>
                  </div>

                  {/* Add User Form */}
                  <form onSubmit={handleAddBackofficeUser} className="p-4 bg-slate-50 border-b border-slate-150 space-y-3">
                    <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">➕ เพิ่มบัญชีผู้ดูแลใหม่</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="ชื่อเล่น (เช่น สุนิสสา)"
                        required
                        value={backofficeUserName}
                        onChange={e => setBackofficeUserName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] outline-none focus:border-teal-500 transition-all font-medium"
                      />
                      <input
                        type="email"
                        placeholder="อีเมล (เช่น sun@gmail.com)"
                        required
                        value={backofficeUserEmail}
                        onChange={e => setBackofficeUserEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] outline-none focus:border-teal-500 transition-all font-mono"
                      />
                      <input
                        type="text"
                        placeholder="รหัสผ่าน"
                        required
                        value={backofficeUserPassword}
                        onChange={e => setBackofficeUserPassword(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] outline-none focus:border-teal-500 transition-all font-mono"
                      />
                      <select
                        value={backofficeUserRole}
                        onChange={e => setBackofficeUserRole(e.target.value as "admin" | "user")}
                        className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[11px] outline-none focus:border-teal-500 transition-all font-bold text-indigo-700 bg-indigo-50/40"
                      >
                        <option value="user">👤 User / ผู้ใช้</option>
                        <option value="admin">👑 Admin / แอดมิน</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/10 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer animate-pulse-slow"
                    >
                      ✓ ดำเนินการเพิ่มสิทธิ์บัญชีใหม่
                    </button>
                  </form>

                  {/* Users Table */}
                  <div className="overflow-x-auto font-sans">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10.5px]">
                        <tr>
                          <th className="px-3 py-2">ชื่อผู้ใช้</th>
                          <th className="px-2 py-2">อีเมลระบบ</th>
                          <th className="px-2 py-2 text-center">สิทธิ์การใช้งาน</th>
                          <th className="px-2 py-2">รหัสผ่าน</th>
                          <th className="px-2 py-2 text-center w-[70px]">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {usersList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-slate-400 italic">
                              ไม่มีพบข้อมูลผู้เข้าใช้งาน กรุณาตั้งประวัติ
                            </td>
                          </tr>
                        ) : (
                          usersList.map((usr, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60 font-medium">
                              <td className="px-3 py-2 text-slate-900 font-bold flex items-center gap-1 font-sans">
                                <span className={`w-1.5 h-1.5 rounded-full ${usr.role === "admin" ? "bg-purple-650" : "bg-emerald-500"} animate-pulse`} />
                                {usr.name}
                              </td>
                              <td className="px-2 py-2 text-slate-500 font-mono text-[10.5px] truncate max-w-[110px]" title={usr.email}>
                                {usr.email}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <select
                                  value={usr.role || "user"}
                                  onChange={(e) => handleChangeUserRole(usr.email, e.target.value as "admin" | "user")}
                                  className={`text-[10px] font-extrabold rounded px-2 py-1.5 border outline-none cursor-pointer transition-all ${
                                    usr.role === "admin"
                                      ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                                  title={usr.email === currentUser?.email ? "คุณสามารถเปลี่ยนสิทธิ์ของคุณเองได้ (ระบบจะมีคำสั่งขออนุญาตยืนยัน)" : "สิทธิ์เข้าถึงหน้านี้และแอดมินระบบหลัก"}
                                >
                                  <option value="user">👤 User</option>
                                  <option value="admin">👑 Admin</option>
                                </select>
                              </td>
                              <td className="px-2 py-2 text-slate-600 font-mono tracking-widest text-[11px]">
                                {usr.password}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBackofficeUser(usr.email, usr.name)}
                                  disabled={usr.email === currentUser?.email}
                                  className={`p-1 rounded transition-colors cursor-pointer ${
                                    usr.email === currentUser?.email
                                      ? "text-slate-300 cursor-not-allowed text-slate-250"
                                      : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  }`}
                                  title={usr.email === currentUser?.email ? "ลบผู้ใช้ที่คุณกำลังล็อกอินอยู่ไม่ได้" : "ลบสิทธิ์บัญชีรายนี้"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 border-t border-slate-100 text-[10px] text-slate-400">
                  * หมายเหตุ: ระบบจดบัญชีสะสม และผู้แลหลังบ้านสามารถเพิ่ม/ลบสิทธิ์สมาชิกในการจัดการอย่างถาวร
                </div>
              </div>

              {/* Middle Section: Assignees List */}
              <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-indigo-900 text-white px-4 py-3 border-b border-indigo-950 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-300" /> ผู้ประสานงานหลัก ({assigneesList.length})
                      </h3>
                      <p className="text-[9.5px] text-indigo-200 mt-0.5">Coordinators / Assignees</p>
                    </div>
                  </div>

                  {/* Add Assignee */}
                  <form onSubmit={handleAddBackofficeAssignee} className="p-3 bg-indigo-50/50 border-b border-indigo-100 space-y-2">
                    <div className="text-[10px] font-bold text-indigo-800">เพิ่มรายชื่อผู้ดูแลชิ้นงานหลัก</div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="ชื่อคนดูแลใหม่..."
                        required
                        value={backofficeAssigneeName}
                        onChange={e => setBackofficeAssigneeName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-indigo-500 transition-all font-medium"
                      />
                      <button
                        type="submit"
                        className="bg-indigo-800 hover:bg-indigo-950 text-white px-3 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
                      >
                        เพิ่ม
                      </button>
                    </div>
                  </form>

                  {/* Assignees Dynamic list */}
                  <div className="p-3 divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                    {assigneesList.length === 0 ? (
                      <p className="text-center text-slate-400 italic text-xs py-4">ไม่มีรายชื่อ</p>
                    ) : (
                      assigneesList.map((member, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 text-xs text-slate-700 font-medium font-sans">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            {member}
                            {member === currentUser?.name && <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1 rounded font-bold">คุณ</span>}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteBackofficeAssignee(member)}
                            className="p-1 text-slate-450 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="ลบรายชื่อผู้ดูแลนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 border-t border-slate-100 text-[10px] text-slate-400">
                  * จะส่งกระแสข้อมูลเข้าสู่ฟิลเตอร์และดรอปดาวน์การเลือกในฟอร์มดูแลตรวจสุขภาพ
                </div>
              </div>

              {/* Card 3: Sales Agents */}
              <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-amber-900 text-white px-4 py-3 border-b border-amber-950 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        พนักงานขาย (Sale)
                      </h3>
                      <p className="text-[9.5px] text-amber-200 mt-0.5">Sales Agent List ({salesList.length})</p>
                    </div>
                  </div>

                  {/* Add Sale Form */}
                  <form onSubmit={handleAddBackofficeSale} className="p-3 bg-amber-50/50 border-b border-amber-100 space-y-2">
                    <div className="text-[10px] font-bold text-amber-800">เพิ่มชื่อพนักงานดูแลยอดขาย</div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="ชื่อพนักงานขาย..."
                        required
                        value={backofficeSaleName}
                        onChange={e => setBackofficeSaleName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-amber-500 transition-all font-medium"
                      />
                      <button
                        type="submit"
                        className="bg-amber-700 hover:bg-amber-850 text-white px-3 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
                      >
                        เพิ่ม
                      </button>
                    </div>
                  </form>

                  {/* Sales list */}
                  <div className="p-3 divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                    {salesList.length === 0 ? (
                      <p className="text-center text-slate-400 italic text-xs py-4">ไม่มีรายชื่อ</p>
                    ) : (
                      salesList.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 text-xs text-slate-700 font-semibold font-sans">
                          <span className="flex items-center gap-1.5 font-sans">
                            {item}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteBackofficeSale(item)}
                            className="p-1 text-slate-450 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="ลบรายชื่อพนักงานขายรายนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 border-t border-slate-100 text-[10px] text-slate-400">
                  * ใช้ในการติดตามข้อมูลรายรับและประสิทธิภาพทางการวิจัยการขายทั่วราชอาณาจักร
                </div>
              </div>

            </div>
          </section>
          )
        )}

      </main>

      {/* --- MODAL 1: ADD & EDIT WORK TASK (SLIDE DRAWER MODE / FULL OVERLAY MODAL) --- */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto" id="edit_task_modal_overlay">
            {/* Backdrop slide entry */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="fixed inset-0 bg-black"
            />

            <div className="min-h-screen px-4 text-center flex items-center justify-center py-6">
              <motion.div
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 10, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.15 }}
                className="inline-block w-full max-w-2xl text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl overflow-hidden relative z-10 border border-slate-300"
              >
                
                {/* Modal Title */}
                <div className="bg-teal-800 text-white px-6 py-4 flex items-center justify-between border-b border-teal-950">
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-bold">
                      {selectedTask ? "📝 แก้ไขข้อมูลงานตรวจสุขภาพ" : "➕ บันทึกพาร์ทเนอร์ตรวจสุขภาพตัวใหม่"}
                    </h3>
                    <p className="text-[11.5px] text-teal-100 font-light">
                      กรอกรายละเอียดที่จำเป็นในการคำนวณยอดและวัด Performance
                    </p>
                  </div>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="p-1 hover:bg-teal-700 rounded-lg text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form fields layout */}
                <form onSubmit={handleSaveForm} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Doc No */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        เลขที่เอกสาร <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                      </label>
                      <input
                        type="text"
                        value={formDocNo}
                        onChange={(e) => setFormDocNo(e.target.value)}
                        placeholder="เช่น DOC-2026-001 (ไม่บังคับ)"
                        className="w-full bg-slate-50 border border-slate-200 font-mono text-xs px-3 py-2 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all"
                      />
                    </div>

                    {/* AR Code */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        ชื่อ AR code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formArCode}
                        onChange={(e) => setFormArCode(e.target.value)}
                        placeholder="เช่น AR-90112"
                        className="w-full bg-slate-50 border border-slate-200 font-mono text-xs px-3 py-2 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Company Name */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        ชื่อบริษัทคู่ค้าตรวจสุขภาพ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formCompanyName}
                        onChange={(e) => setFormCompanyName(e.target.value)}
                        placeholder="บริษัท ไทยโฮลดิ้ง แมนูแฟคเจอริ่ง จำกัด"
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all"
                      />
                    </div>

                    {/* กลุ่มบริษัท / ในเครือเดียวกัน */}
                    <div className="sm:col-span-2 bg-indigo-50/40 p-3 rounded-lg border border-indigo-100/70">
                      <label className="text-xs font-bold text-indigo-950 block mb-1 flex items-center gap-1.5">
                        <span className="text-indigo-600">🏢</span> กลุ่มบริษัท / บริษัทในเครือเดียวกัน (ถ้ามี)
                        <span className="text-[10px] text-indigo-500 font-normal">(สำหรับจัดกรุ๊ปงานที่มีชื่อ AR และชื่อต่างกัน)</span>
                      </label>
                      <input
                        type="text"
                        value={formCompanyGroup}
                        onChange={(e) => setFormCompanyGroup(e.target.value)}
                        placeholder="เช่น เครือไทยเบฟ, กลุ่มซัมมิท, เครือเซ็นทรัล (เว้นว่างไว้หากไม่มี)"
                        className="w-full bg-white border border-indigo-200 text-xs px-3 py-1.5 rounded-md outline-none focus:border-indigo-500 transition-all font-semibold text-slate-800 placeholder:text-slate-400"
                        list="company-group-suggestions"
                      />
                      <datalist id="company-group-suggestions">
                        {Array.from(new Set(tasks.map(t => t.companyGroup).filter(Boolean))).map(g => (
                          <option key={g} value={g} />
                        ))}
                      </datalist>
                    </div>

                    {/* Employee Counts Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          จำนวนพนักงานทั้งหมด (ตามสรุปงาน) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={formEmployeeCount}
                          onChange={(e) => setFormEmployeeCount(Number(e.target.value) || 0)}
                          placeholder="เช่น 1500"
                          className="w-full bg-slate-50 border border-slate-200 font-mono text-xs px-3 py-2 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          จำนวนพนักงานเข้าตรวจจริง <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={formActualEmployeeCount}
                          onChange={(e) => setFormActualEmployeeCount(Number(e.target.value) || 0)}
                          placeholder="เช่น 1480"
                          className="w-full bg-slate-50 border border-slate-200 font-mono text-xs px-3 py-2 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Job Weight Score */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        คะแนนระดับความยากงาน (Weight Score) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formWeight}
                        onChange={(e) => setFormWeight(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all cursor-pointer"
                      >
                        <option value={1}>1 (งานทั่วไป - ตรวจคัดกรองเบื้องต้น)</option>
                        <option value={2}>2 (งานทักษะปานกลาง - มีรายงานอาชีวอนามัย/โรงงานสารเคมี)</option>
                        <option value={3}>3 (งานซับซ้อนยากสูง - ลูกค้าใหญ่ ประมวลเสียงระดับหูและสภาพแวดล้อม)</option>
                      </select>
                    </div>

                    {/* Inspection Date */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        วันที่เข้าตรวจ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formInspectionDate}
                        onChange={(e) => setFormInspectionDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 font-mono text-xs px-3 py-2 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Contract End Date */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        วันที่สิ้นสุดสัญญา (วัดสัญญาค้างส่งส่งมอบ) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formContractEndDate}
                        onChange={(e) => setFormContractEndDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 font-mono text-xs px-3 py-2 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Contract Extension option */}
                    <div className="sm:col-span-2 bg-amber-50/50 border border-amber-200 p-4 rounded-xl flex flex-col gap-3">
                      <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formIsExtendedContract}
                          onChange={(e) => setFormIsExtendedContract(e.target.checked)}
                          className="rounded text-amber-600 border-amber-350 focus:ring-amber-500 w-4.5 h-4.5 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          ⚠️ บันทึกการขยายอายุสัญญา (Contract Extension Recorded)
                        </span>
                      </label>

                      {formIsExtendedContract && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1.5 animate-fade-in">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              วันที่สิ้นสุดสัญญาเดิม (ก่อนส่งเสริมการขยาย) <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="date"
                              required={formIsExtendedContract}
                              value={formOriginalContractEndDate}
                              onChange={(e) => setFormOriginalContractEndDate(e.target.value)}
                              className="w-full bg-white border border-slate-250 font-mono text-xs px-3 py-2 rounded-lg outline-none focus:border-amber-500 transition-all"
                            />
                          </div>
                          <div className="flex flex-col justify-center text-xs text-amber-800 bg-amber-100/40 p-3 rounded-lg border border-amber-200/50">
                            <p className="font-bold flex items-center gap-1">💡 ข้อมูลการขยายสัญญา:</p>
                            <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                              ระบบจะแสดงสถานะการขยายอายุสัญญา, เปลี่ยนสีตัวเลขและแสดงการขีดทับค่าเดิมบนบอร์ดเพื่อให้พนักงานรับทราบอย่างชัดเจน
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Work selected (Executive Summary, สรุปรวมองค์กร, Excel File) */}
                    <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-lg border border-slate-150">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                        <span className="text-xs font-bold text-slate-700 block">
                          งานที่บริษัทเลือกรับ / ผู้รับผิดชอบรายข้อบริการ (เลือกได้มากกว่า 1 ข้อ)
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded leading-none">
                          👥 รองรับการแบ่งชิ้นงานทำร่วมกัน (Co-work)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                        {SERVICES_OPTIONS.map(srv => {
                          const isSelected = formServices.includes(srv);
                          return (
                            <div key={srv} className="flex flex-col xs:flex-row xs:items-center justify-between p-2 bg-white rounded-lg border border-slate-200/80 hover:border-slate-300 transition-all gap-2">
                              <label className="inline-flex items-center gap-2 cursor-pointer select-none font-medium flex-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleService(srv)}
                                  className="rounded text-teal-600 border-slate-300 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                                />
                                <span className="text-slate-700 font-bold">{srv}</span>
                              </label>

                              {isSelected && (
                                <div className="flex flex-col gap-1.5 min-w-[155px] border-l border-slate-150 pl-2">
                                  <div className="flex items-center gap-1.5 justify-between">
                                    <span className="text-[10px] text-slate-400">ผู้ดูแล:</span>
                                    <select
                                      value={formServiceAssignees[srv] || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setFormServiceAssignees(prev => ({
                                          ...prev,
                                          [srv]: val
                                        }));
                                      }}
                                      className="bg-slate-50 border border-slate-200 text-[10px] px-1 py-0.5 rounded outline-none text-slate-700 font-medium cursor-pointer max-w-[105px] truncate"
                                    >
                                      <option value="">(เจ้างาน: {formAssignee || "ตามระบบ"})</option>
                                      {assigneesList.map(member => (
                                        <option key={member} value={member}>{member}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex flex-col gap-1 w-[105px]">
                                    <div className="flex items-center gap-1.5 justify-between">
                                      <span className="text-[10px] text-slate-400">วิธีส่งมอบ:</span>
                                      <select
                                        value={
                                          (formServiceDeliveryChannels[srv] === "E-mail" || formServiceDeliveryChannels[srv] === "ไปรษณีย์" || !formServiceDeliveryChannels[srv]) 
                                            ? (formServiceDeliveryChannels[srv] || "") 
                                            : "อื่นๆ"
                                        }
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "อื่นๆ") {
                                            setFormServiceDeliveryChannels(prev => ({
                                              ...prev,
                                              [srv]: "อื่นๆ"
                                            }));
                                          } else {
                                            setFormServiceDeliveryChannels(prev => ({
                                              ...prev,
                                              [srv]: val
                                            }));
                                          }
                                        }}
                                        className="bg-slate-50 border border-slate-200 text-[10px] px-1 py-0.5 rounded outline-none text-indigo-700 font-bold cursor-pointer w-full truncate"
                                      >
                                        <option value="">(ตามหลัก: {(formChannel === "อื่นๆ" || formChannel === "ไม่ระบุ" || !formChannel) ? "อื่นๆ" : formChannel})</option>
                                        <option value="E-mail">✉️ E-mail</option>
                                        <option value="ไปรษณีย์">📦 ไปรษณีย์</option>
                                        <option value="อื่นๆ">✏️ อื่นๆ</option>
                                      </select>
                                    </div>
                                    
                                    {/* If other/custom is chosen for this service, let them type */}
                                    {formServiceDeliveryChannels[srv] !== undefined &&
                                     formServiceDeliveryChannels[srv] !== "" &&
                                     formServiceDeliveryChannels[srv] !== "E-mail" &&
                                     formServiceDeliveryChannels[srv] !== "ไปรษณีย์" && (
                                      <input
                                        type="text"
                                        placeholder="ระบุวิธีส่งมอบ..."
                                        value={(formServiceDeliveryChannels[srv] === "อื่นๆ" || formServiceDeliveryChannels[srv] === "ไม่ระบุ") ? "" : formServiceDeliveryChannels[srv]}
                                        onChange={(e) => {
                                          const typedVal = e.target.value;
                                          setFormServiceDeliveryChannels(prev => ({
                                            ...prev,
                                            [srv]: typedVal
                                          }));
                                        }}
                                        className="bg-slate-50 border border-slate-200 text-[10px] px-1 py-0.5 rounded outline-none font-medium text-slate-800 w-full"
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 font-light leading-snug">
                        * ระบบจะกระจายสัดส่วนพนักงาน คะแนนความยากงาน (Weight Score) และผลงานสะสมอัตโนมัติ ไปยังแต่ละผู้รับผิดชอบตามสัดส่วนบริการที่เลือกรับผิดชอบร่วมกัน!
                      </p>
                    </div>

                    {/* Delivery Channel */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        ช่องทางจัดส่งเอกสาร
                      </label>
                      <div className="flex gap-4 text-xs mt-2 items-center">
                        {["E-mail", "ไปรษณีย์", "อื่นๆ"].map(ch => {
                          const isEorP = ch === "E-mail" || ch === "ไปรษณีย์";
                          const isChecked = isEorP 
                            ? formChannel === ch 
                            : (formChannel !== "E-mail" && formChannel !== "ไปรษณีย์");
                          return (
                            <label key={ch} className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="formChannel"
                                checked={isChecked}
                                onChange={() => {
                                  if (isEorP) {
                                    setFormChannel(ch);
                                  } else {
                                    setFormChannel(formChannel === "E-mail" || formChannel === "ไปรษณีย์" ? "อื่นๆ" : formChannel);
                                  }
                                }}
                                className="text-teal-600 border-slate-300 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                              />
                              <span>{ch}</span>
                            </label>
                          );
                        })}
                      </div>
                      
                      {/* If custom channel ("อื่นๆ") is selected, show edit field */}
                      {(formChannel !== "E-mail" && formChannel !== "ไปรษณีย์") && (
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="ระบุช่องทางจัดส่งอื่นๆ..."
                            value={formChannel === "อื่นๆ" || formChannel === "ไม่ระบุ" ? "" : formChannel}
                            onChange={(e) => setFormChannel(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-1.5 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all font-medium text-slate-800"
                          />
                        </div>
                      )}
                    </div>

                    {/* Assignee */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        ผู้รับผิดชอบ (⭐)
                      </label>
                      <select
                        value={formAssignee}
                        onChange={(e) => setFormAssignee(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all cursor-pointer"
                      >
                        {assigneesList.map(member => (
                          <option key={member} value={member}>
                            {member}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sale */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                        <span>พนักงานขาย (Sale)</span>
                        <span className="text-[10px] text-amber-600 font-normal">เพิ่ม/แก้ไขชื่อได้ในแถบหลัก</span>
                      </label>
                      <select
                        value={formSale}
                        onChange={(e) => setFormSale(e.target.value)}
                        className="w-full bg-amber-50/20 border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all cursor-pointer font-medium"
                      >
                        <option value="">-- ไม่ระบุ --</option>
                        {salesList.map(item => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Task Status */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        สถานะงานล่าสุด
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => {
                          const selected = e.target.value as any;
                          setFormStatus(selected);
                          if (selected === "✓ เรียบร้อยแล้ว" && !formEndDate) {
                            setFormEndDate(SYSTEM_TODAY);
                          } else if (selected === "กำลังทำ" && !formStartDate) {
                            setFormStartDate(SYSTEM_TODAY);
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all cursor-pointer"
                      >
                        <option value="ยังไม่เริ่ม">ยังไม่เริ่ม (Not Started)</option>
                        <option value="กำลังทำ">กำลังทำ (In Progress)</option>
                        <option value="✓ เรียบร้อยแล้ว">✓ เรียบร้อยแล้ว (Completed)</option>
                      </select>
                    </div>

                    {/* Dates: Start Date & End Date */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-750 block mb-1 text-slate-500">
                          วันที่เริ่มทำจริง
                        </label>
                        <input
                          type="date"
                          value={formStartDate}
                          onChange={(e) => setFormStartDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 font-mono text-xs px-3 py-2 rounded-lg outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-100 block mb-1 text-slate-500">
                          วันที่ทำเสร็จสิ้น
                        </label>
                        <input
                          type="date"
                          value={formEndDate}
                          onChange={(e) => setFormEndDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 font-mono text-xs px-3 py-2 rounded-lg outline-none"
                        />
                      </div>
                    </div>

                    {/* Delivery details (To whom, canal, when) */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        จัดส่งไปที่ใคร ทางไหน เมื่อไหร่
                      </label>
                      <input
                        type="text"
                        value={formDeliveryDetail}
                        onChange={(e) => setFormDeliveryDetail(e.target.value)}
                        placeholder="เช่น ส่งคุณมาริสา แผนก HR ทางอีเมล เมื่อบ่ายวันที่ 2026-06-10"
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Remarks (Notes) */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        หมายเหตุ (เช่น ต้องทำผลอาชีวอนามัย)
                      </label>
                      <textarea
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        rows={2}
                        placeholder="ระบุข้อควรจำเพิ่มเติม เช่น วิเคราะห์กลุ่มเสียงดังเกินเกณฑ์, รอใบอนุมัติทางการเงิน..."
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-teal-500 focus:bg-white transition-all resize-none"
                      />
                    </div>

                  </div>

                  {/* Form Submission Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end gap-3.5">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-700/25 transition-all text-nowrap cursor-pointer"
                    >
                      {selectedTask ? "+ ยืนยันแก้ไขข้อมูล" : "✓ บันทึกข้อมูลบริษัท"}
                    </button>
                  </div>

                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: CSV IMPORT AND PREVIEW UTILITY --- */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto" id="csv_import_modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImportModalOpen(false)}
              className="fixed inset-0 bg-black"
            />

            <div className="min-h-screen px-4 text-center flex items-center justify-center py-6">
              <motion.div
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 10, opacity: 0 }}
                className="inline-block w-full max-w-2xl text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl overflow-hidden relative z-10 border border-slate-300"
              >
                
                {/* Modal Header */}
                <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between border-b">
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-bold text-white flex items-center gap-1.5">
                      <Upload className="w-5 h-5 text-blue-400" /> นำเข้าข้อมูลระบบประเมินจาก Excel หรือ CSV
                    </h3>
                    <p className="text-xs text-slate-300 font-light mt-0.5">
                      เลือกไฟล์สเปรดชีต Excel (.xlsx, .xls) หรือ CSV เพื่อเพิ่มในข้อมูลงาน
                    </p>
                  </div>
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="p-1 hover:bg-slate-700 rounded-lg text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* CSV Field Instruction */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-650 leading-relaxed space-y-1.5">
                    <span className="font-bold text-slate-800 flex items-center gap-1">📋 ลำดับคอลัมน์มาตรฐาน (หรือจับคู่ชื่อหัวคอลัมน์อัตโนมัติ):</span>
                    <code className="block bg-slate-200/60 p-1.5 rounded font-mono text-[10px] text-slate-700 select-all overflow-x-auto whitespace-nowrap">
                      เลขที่เอกสาร,ชื่อบริษัท,ชื่อ AR code,จำนวนพนักงาน,วันที่เข้าตรวจ,วันที่สิ้นสุดสัญญา,งานที่เลือกรับ(สรุปรวมองค์กร;Excel;ใบรายงานสำหรับ HR),ช่องทางจัดส่ง,ผู้รับผิดชอบ,ความยาก,สถานะ
                    </code>
                    <div className="bg-amber-50 text-amber-900 p-3 rounded-lg border border-amber-200 text-[11px] mt-1 space-y-1">
                      <p className="font-bold flex items-center gap-1">💡 จุดเด่นระบบอัปโหลดไฟล์ชุดใหม่:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                        <li><strong>รองรับสเปรดชีตเต็มตัว</strong>: สามารถเลือกนำเข้าไฟล์สกุล <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.ods</strong> หรือ <strong>.csv</strong> ได้ทันที</li>
                        <li><strong>ข้อมูลขาด/คอลัมน์ไม่ครบ?</strong>: นำเข้าได้แน่นอน! ระบบจะบันทึกข้ามส่วนที่ขาด คอลัมน์ที่เหลือจะเติมค่าเริ่มต้นให้อัตโนมัติ (เช่น ชื่อบริษัทสำรอง หรือสถานะเริ่มต้น) โดยไม่ปฏิเสธข้อมูล</li>
                        <li><strong>วิเคราะห์หัวคอลัมน์อัจฉริยะ</strong>: ระบบจับคู่คำสำคัญ เช่น 'บริษัท', 'หมดสัญญา', 'สถานะ' มาตั้งเป็นข้อมูลให้คุณทันที</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">1. อัปโหลดผ่านไฟล์เอกสาร (.xlsx, .xls, .csv)</span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" /> เลือกไฟล์ Excel/CSV ในเครื่อง
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".xlsx,.xls,.csv,.ods"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>

                    <div className="text-center font-bold text-xs text-slate-400 py-1">— หรือ —</div>

                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1">วางคัดลอกข้อความ CSV หรือตารางตรงนี้</span>
                      <textarea
                        value={importCsvText}
                        onChange={(e) => {
                          setImportCsvText(e.target.value);
                          handleProcessCsvText(e.target.value);
                        }}
                        rows={5}
                        placeholder="วางเนื้อหาแถวข้อมูล CSV..."
                        className="w-full bg-slate-50 border border-slate-200 font-mono text-xs p-3 rounded-lg outline-none focus:border-blue-500 focus:bg-white resize-none"
                      />
                    </div>
                  </div>

                  {/* Error & Alerts */}
                  {importError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}

                  {/* Preview of Parsed Rows */}
                  {importPreview.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-800 block">
                        🔍 ผลการวิเคราะห์ข้อมูล (พบ {importPreview.length} บริษัท)
                      </span>
                      <div className="border border-slate-200 rounded-lg max-h-[180px] overflow-y-auto bg-slate-50 text-[11px]">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-200/50 sticky top-0 text-slate-600 font-bold border-b text-[10px]">
                              <th className="p-1.5 px-2">ชื่อบริษัท</th>
                              <th className="p-1.5 px-2">Sale</th>
                              <th className="p-1.5 px-2">ผู้ดูแล (⭐)</th>
                              <th className="p-1.5 px-2">วันตรวจ / หมดสัญญา</th>
                              <th className="p-1.5 px-2">เริ่มทำ / วันเสร็จ</th>
                              <th className="p-1.5 px-2">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {importPreview.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-100/55">
                                <td className="p-1.5 px-2 font-medium truncate max-w-[150px]" title={item.companyName}>
                                  {item.companyName}
                                </td>
                                <td className="p-1.5 px-2 text-indigo-600 font-semibold">{item.sale || "-"}</td>
                                <td className="p-1.5 px-2">{item.assignee}</td>
                                <td className="p-1.5 px-2 font-mono text-[10px] text-slate-500">
                                  {item.inspectionDate || "-"} / {item.contractEndDate || "-"}
                                </td>
                                <td className="p-1.5 px-2 font-mono text-[10px] text-slate-500">
                                  {item.startDate || "-"} / {item.endDate || "-"}
                                </td>
                                <td className="p-1.5 px-2">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    item.status === "✓ เรียบร้อยแล้ว"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : item.status === "กำลังทำ"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-slate-50 text-slate-600 border border-slate-200"
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>

                {/* Import Modal Actions */}
                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={importPreview.length === 0}
                    onClick={handleConfirmImport}
                    className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all text-nowrap cursor-pointer ${
                      importPreview.length > 0
                        ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
                        : "bg-slate-400 cursor-not-allowed text-slate-250"
                    }`}
                  >
                     ยืนยันนำเข้า ({importPreview.length} รายการ)
                  </button>
                </div>

              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL FOR URGENT TASK NOTIFICATION / ESCALATION --- */}
      <AnimatePresence>
        {isUrgentModalOpen && urgentTaskSelected && (
          <div className="fixed inset-0 z-50 overflow-y-auto" id="urgent_notification_modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsUrgentModalOpen(false);
                setUrgentTaskSelected(null);
              }}
              className="fixed inset-0 bg-black"
            />

            <div className="min-h-screen px-4 text-center flex items-center justify-center py-6">
              <motion.div
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 10, opacity: 0 }}
                className="inline-block w-full max-w-md text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl overflow-hidden relative z-10 border border-slate-300"
              >
                
                {/* Modal Header */}
                <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between border-b">
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-bold text-white flex items-center gap-1.5">
                      <Megaphone className="w-5 h-5 text-rose-200 fill-rose-300 animate-pulse" /> สะกิดตามงานด่วนร่วมกับทีม
                    </h3>
                    <p className="text-xs text-rose-100 font-light mt-0.5">
                      ส่งสัญญาณรายงานด่วนพิเศษสำหรับโครงการนี้
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsUrgentModalOpen(false);
                      setUrgentTaskSelected(null);
                    }}
                    className="p-1 hover:bg-rose-700 rounded-lg text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 font-display">
                  {/* Display Current State */}
                  <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">บริษัท:</span>
                      <span className="font-bold text-slate-800">{urgentTaskSelected.companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">ผู้รับผิดชอบหลัก:</span>
                      <span className="font-bold text-blue-600">{urgentTaskSelected.assignee || "ยังไม่มอบหมาย"}</span>
                    </div>
                    {urgentTaskSelected.isUrgent && (
                      <div className="pt-2 border-t border-slate-200 mt-2">
                        <span className="text-rose-600 font-bold">⚠️ มีการตั้งค่าตามงานด่วนอยู่แล้ว:</span>
                        <p className="mt-1 bg-rose-50 border border-rose-100 p-2 rounded text-[11px] text-rose-700 font-medium">
                          "{urgentTaskSelected.urgentNote}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Input field for Urgent Note */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      ✍️ เพิ่มข้อความสะกิดตามด่วน
                    </label>
                    <textarea
                      rows={3}
                      value={urgentTeamNote}
                      onChange={(e) => setUrgentTeamNote(e.target.value)}
                      placeholder="เช่น ลูกค้าตามไฟลุกแล้ว, รบกวนช่วยเร่งเอาไฟล์ส่งเข้าระบบด่วนจี๋ค่ะ"
                      className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-lg outline-none focus:border-rose-500 focus:bg-white text-slate-800 font-medium"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">ข้อความด่วนสำเร็จรูป</span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        "📞 ลูกค้าจี้ขอไฟล์รายงานด่วนมาก",
                        "📄 ขอตัวต้นร่างสรุปผลองค์กรด่วน",
                        "🔍 กรุณาช่วยตรวจสอบใบราคา AR ด่วน",
                        "🧩 รดน. ปริ้นเล่มเดินงานตามด่วนด้วยค่ะ",
                        "✉️ รบกวนช่วยตามเรื่องช่องทางการจัดส่ง"
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setUrgentTeamNote(preset)}
                          className="bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200 text-[10px] px-2 py-1 rounded transition-all cursor-pointer font-semibold"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 px-6 py-4 flex justify-between gap-3 border-t border-slate-200">
                  {urgentTaskSelected.isUrgent ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleResolveUrgent(urgentTaskSelected);
                        setIsUrgentModalOpen(false);
                        setUrgentTaskSelected(null);
                      }}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-750 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      🔕 ยกเลิกแจ้งด่วน
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUrgentModalOpen(false);
                        setUrgentTaskSelected(null);
                      }}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveUrgent}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    🚀 ยืนยันแจ้งตามด่วน
                  </button>
                </div>

              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: SALES LIST MANAGEMENT --- */}
      <AnimatePresence>
        {isSalesModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto" id="sales_management_modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSalesModalOpen(false)}
              className="fixed inset-0 bg-black"
            />

            <div className="min-h-screen px-4 text-center flex items-center justify-center py-6">
              <motion.div
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 10, opacity: 0 }}
                className="inline-block w-full max-w-md text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl overflow-hidden relative z-10 border border-slate-300"
              >
                
                {/* Modal Header */}
                <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between border-b">
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-bold text-white flex items-center gap-1.5">
                      จัดการรายชื่อพนักงานขาย (Sales)
                    </h3>
                    <p className="text-xs text-amber-100 font-light mt-0.5">
                      เพิ่ม ลบ หรือแก้ไขรายชื่อพนักงานขายในระบบเพื่อปรับอัตโนมัติ
                    </p>
                  </div>
                  <button
                    onClick={() => setIsSalesModalOpen(false)}
                    className="p-1 hover:bg-amber-700 rounded-lg text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 font-display">
                  {/* Part 1: Add New Sale Input */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      + เพิ่มรายชื่อพนักงานขายใหม่
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="กรอกชื่อพนักงานขาย เช่น อรัญสิริ"
                        id="new_sale_input_name"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              if (salesList.includes(val)) {
                                showToast("ขออภัย! มีรายชื่อพนักงานขายนี้ในระบบแล้ว", "warning");
                                return;
                              }
                              setSalesList(prev => [...prev, val]);
                              (e.target as HTMLInputElement).value = "";
                              showToast(`เพิ่มรายชื่อ ${val} สำเร็จ!`, "success");
                            }
                          }
                        }}
                        className="flex-1 bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={() => {
                          const el = document.getElementById("new_sale_input_name") as HTMLInputElement;
                          const val = el?.value.trim();
                          if (val) {
                            if (salesList.includes(val)) {
                              showToast("ขออภัย! มีรายชื่อพนักงานขายนี้ในระบบแล้ว", "warning");
                              return;
                            }
                            setSalesList(prev => [...prev, val]);
                            el.value = "";
                            showToast(`เพิ่มรายชื่อ ${val} สำเร็จ!`, "success");
                          } else {
                            showToast("กรุณากรอกชื่อก่อนกดเพิ่ม", "info");
                          }
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        เพิ่มชื่อ
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      * สามารถกด Enter เพื่อเพิ่มรายชื่อได้อย่างรวดเร็ว
                    </p>
                  </div>

                  {/* Part 2: Sales Name List with Edit and Delete capabilities */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      รายชื่อทั้งหมดในระบบ ({salesList.length} คน)
                    </label>
                    
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1" id="sales_list_scroll_container">
                      {salesList.map((sale, index) => (
                        <SalesRowItem
                          key={sale}
                          name={sale}
                          onDelete={() => {
                            if (confirm(`คุณต้องการลบรายชื่อพนักงานขาย "${sale}" หรือไม่?\n(การลบจะไม่ลบข้อมูลในงานปัจจุบัน แต่จะทำให้ไม่มีรายชื่อให้เลือกในครั้งต่อไป)`)) {
                              setSalesList(prev => prev.filter(item => item !== sale));
                              showToast(`ลบรายชื่อ ${sale} เรียบร้อยแล้ว`, "success");
                            }
                          }}
                          onUpdate={(newName) => {
                            if (!newName.trim()) return;
                            if (salesList.includes(newName.trim()) && newName.trim() !== sale) {
                              showToast("ขออภัย! มีชื่อนี้ในระบบแล้ว", "warning");
                              return;
                            }
                            setSalesList(prev => {
                              const next = [...prev];
                              next[index] = newName.trim();
                              return next;
                            });
                            // Also cascade update corresponding tasks
                            setTasks(prev => prev.map(t => t.sale === sale ? { ...t, sale: newName.trim() } : t));
                            showToast("ปรับปรุงรายชื่อเรียบร้อยแล้ว", "success");
                          }}
                        />
                      ))}
                      {salesList.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs italic">
                          ไม่มีรายชื่อพนักงานขายในระบบ กรุณาเพิ่มชื่อด้านบน
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsSalesModalOpen(false)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    ✓ เสร็จสิ้นการตั้งค่า
                  </button>
                </div>

              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER METRICS INFO */}
      <footer className="bg-slate-800 text-slate-450 mt-auto py-6 border-t border-slate-750" id="app_footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs space-y-2">
          <p className="text-slate-400 font-display">
            ระบบติดตามงานตรวจสุขภาพสรุปรวมองค์กร แผนกพิมพ์ผล โรงพยาบาลพญาไท 2 พัฒนาโดย สุนิษา สุดแสวงและทีมสรุปรวม
          </p>
          <div className="flex justify-center items-center gap-3.5 text-[11px] text-slate-400">
            <span>ผู้ใช้: <strong>{currentUser ? `${currentUser.name} (${currentUser.email})` : "Ja.sunisa255@gmail.com"}</strong></span>
            <span>|</span>
            <span>สถานะระบบ: <span className="text-emerald-400">● เชื่อมโยงฐานข้อมูลส่วนกลางสำเร็จ (Server Database & Sync Active)</span></span>
            <span>|</span>
            <span>เวลาไทย: 2026-06-11 13:09 UTC+7</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-mono">
              (ระบบประมวลผลตัวดึงข้อมูลและจำแนกข้อมูลอัตโนมัติแบบเรียลไทม์บน React state ของคุณ)
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}

// Sub-component: Small caret style arrow representing direction sorting
function ArrowSort({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) {
    return <span className="text-slate-300 ml-1 text-[10px]">↕</span>;
  }
  return (
    <span className="text-teal-700 font-extrabold ml-1 font-mono text-[11px]">
      {dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

// Sub-component: Sales row editor
function SalesRowItem({ name, onDelete, onUpdate }: { name: string; onDelete: () => void; onUpdate: (newName: string) => void; key?: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(name);

  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-150 transition-all hover:bg-slate-100/50">
      {isEditing ? (
        <input
          type="text"
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          className="flex-1 bg-white border border-amber-300 text-xs px-2 py-1 rounded outline-none font-medium"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onUpdate(editVal);
              setIsEditing(false);
            } else if (e.key === "Escape") {
              setEditVal(name);
              setIsEditing(false);
            }
          }}
          autoFocus
        />
      ) : (
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 pl-1">
          <Star className="w-3" /> {name}
        </span>
      )}

      <div className="flex items-center gap-1">
        {isEditing ? (
          <>
            <button
              onClick={() => {
                onUpdate(editVal);
                setIsEditing(false);
              }}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
            >
              ✓ บันทึก
            </button>
            <button
              onClick={() => {
                setEditVal(name);
                setIsEditing(false);
              }}
              className="px-2 py-1 bg-slate-400 hover:bg-slate-500 text-white rounded text-[10px] font-bold cursor-pointer"
            >
              ยกเลิก
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setEditVal(name);
                setIsEditing(true);
              }}
              className="p-1 text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
              title="แก้ไขชื่อพนักงานขาย"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-slate-500 hover:text-rose-600 transition-all cursor-pointer"
              title="ลบรายชื่อ"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
