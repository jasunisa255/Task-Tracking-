/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WorkTask {
  id: string;
  docNo: string;
  companyName: string;
  arCode: string;
  employeeCount: number;
  actualEmployeeCount?: number; // จำนวนพนักงานเข้าตรวจจริง
  inspectionDate: string; // YYYY-MM-DD
  contractEndDate: string; // YYYY-MM-DD
  isExtendedContract?: boolean; // Toggled if contract end date is extended
  originalContractEndDate?: string; // Stored if contract is extended (YYYY-MM-DD)
  selectedServices: string[]; // Options revised below
  deliveryChannel: string; // "E-mail" | "ไปรษณีย์" | "อื่นๆ" or custom string
  assignee: string; // Dynamic
  sale?: string; // Sales agent
  companyGroup?: string; // กลุ่มบริษัท/เครือเดียวกัน
  
  weightScore: number; // 1: ทั่วไป, 2: งานซับซ้อน/อาชีวอนามัย, 3: งานยากมาก/ซับซ้อนสูง (legacy/general weight)
  status: "ยังไม่เริ่ม" | "กำลังทำ" | "✓ เรียบร้อยแล้ว";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  deliveryDetail: string; // "จัดส่งไปที่ใคร ทางไหน เมื่อไหร่"
  notes: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  serviceAssignees?: Record<string, string>;
  serviceDeliveryChannels?: Record<string, string>;
  isUrgent?: boolean; // Urgent field
  urgentNote?: string; // Urgent tracking note
}

export type AssigneeType = string;

export const SERVICES_OPTIONS = [
  "สรุปรวมองค์กร",
  "Excel",
  "ใบรายงานสำหรับ HR",
  "walk through survey",
  "ปัจจัยเสี่ยง",
  "จผส.1",
  "Executive summary",
  "Template บริษัท",
  "Upload web",
  "รับงานทุกงาน",
  "บริษัทไม่รับผลใดๆ",
  "บริษัทไม่มียอดเข้าตรวจ"
];

export const DELIVERY_CHANNELS = [
  "อื่นๆ",
  "E-mail",
  "ไปรษณีย์"
];

export const STATUS_OPTIONS = [
  "ยังไม่เริ่ม",
  "กำลังทำ",
  "✓ เรียบร้อยแล้ว"
] as const;

export const INITIAL_TASKS: WorkTask[] = [];
