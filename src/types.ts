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

export const INITIAL_TASKS: WorkTask[] = [
  {
    id: "1",
    docNo: "DOC-2026-001",
    companyName: "บริษัท ซัมมิท โอโตโมทีฟ จำกัด",
    arCode: "AR-90112",
    employeeCount: 450,
    inspectionDate: "2026-05-10",
    contractEndDate: "2026-06-15",
    isExtendedContract: true,
    originalContractEndDate: "2026-05-30",
    selectedServices: ["สรุปรวมองค์กร", "Excel"],
    deliveryChannel: "E-mail",
    assignee: "สุนิสสา",
    serviceAssignees: { "สรุปรวมองค์กร": "สุนิสสา", "Excel": "รวีวรรณ" },
    serviceDeliveryChannels: { "สรุปรวมองค์กร": "ไปรษณีย์", "Excel": "E-mail" },
    companyGroup: "กลุ่มซัมมิท",
    weightScore: 2,
    status: "กำลังทำ",
    startDate: "2026-05-12",
    endDate: "",
    deliveryDetail: "",
    notes: "มีรายงานผลวิเคราะห์ข้อมูลอาชีวอนามัยเร่งด่วน",
    isUrgent: true,
    urgentNote: "ลูกค้าต้องการรายงานอย่างย่อภายในวันพรุ่งนี้"
  },
  {
    id: "2",
    docNo: "DOC-2026-002",
    companyName: "บริษัท กรุงเทพ บิสสิเนส พาร์ทเนอร์ส",
    arCode: "AR-90113",
    employeeCount: 120,
    inspectionDate: "2026-05-15",
    contractEndDate: "2026-06-05", // Overdue contract end date, status is NOT done!
    selectedServices: ["Excel", "ใบรายงานสำหรับ HR"],
    deliveryChannel: "E-mail",
    assignee: "อาทิตยา",
    weightScore: 1,
    status: "กำลังทำ",
    startDate: "2026-05-16",
    endDate: "",
    deliveryDetail: "",
    notes: "แก้ไข AR code ก่อนส่งเอกสาร"
  },
  {
    id: "3",
    docNo: "DOC-2026-003",
    companyName: "บริษัท เมโทรโพลิส อินดัสทรี จำกัด",
    arCode: "AR-90114",
    employeeCount: 1500, // Large client
    inspectionDate: "2026-04-20",
    contractEndDate: "2026-05-30", // This was completed successfully on time
    selectedServices: ["สรุปรวมองค์กร", "Excel", "ใบรายงานสำหรับ HR"],
    deliveryChannel: "ไปรษณีย์",
    assignee: "สุนิสสา",
    serviceAssignees: { "สรุปรวมองค์กร": "สุนิสสา", "Excel": "อาทิตยา", "ใบรายงานสำหรับ HR": "สุนิษา" },
    weightScore: 3, // Weight 3 due to complexity / occupational health
    status: "✓ เรียบร้อยแล้ว",
    startDate: "2026-04-22",
    endDate: "2026-05-28",
    deliveryDetail: "จัดส่งคุณสมคิด ฝ่ายบุคคล ทางไปรษณีย์ลงทะเบียน (EMS) เมื่อวันที่ 2026-05-29",
    notes: "ตรวจสภาพแวดล้อมทางเดินหายใจและความร้อนเสริม"
  },
  {
    id: "4",
    docNo: "DOC-2026-004",
    companyName: "ห้างหุ้นส่วนจำกัด วิจิตรการค้า",
    arCode: "AR-90115",
    employeeCount: 75,
    inspectionDate: "2026-05-18",
    contractEndDate: "2026-06-20",
    selectedServices: ["Excel"],
    deliveryChannel: "E-mail",
    assignee: "รวีวรรณ",
    weightScore: 1,
    status: "ยังไม่เริ่ม",
    startDate: "",
    endDate: "",
    deliveryDetail: "",
    notes: "รอเอกสารยืนยันชื่อผู้รับผลรอบสุดท้าย"
  },
  {
    id: "5",
    docNo: "DOC-2026-005",
    companyName: "บริษัท เอเชี่ยน ฟู้ดส์ แมนูแฟคเจอริ่ง",
    arCode: "AR-90116",
    employeeCount: 800,
    inspectionDate: "2026-04-12",
    contractEndDate: "2026-05-25", // Overdue! status "ยังไม่เริ่ม". This is a critical alert
    selectedServices: ["สรุปรวมองค์กร", "Excel"],
    deliveryChannel: "E-mail",
    assignee: "รวีวรรณ",
    weightScore: 2,
    status: "ยังไม่เริ่ม",
    startDate: "",
    endDate: "",
    deliveryDetail: "",
    notes: "มีพนักงานกลุ่มเสี่ยงเรื่องสารเคมี อาชีวอนามัย",
    isUrgent: true,
    urgentNote: "สัญญาใกล้หมดและเป็นลูกค้ารายใหญ่"
  },
  {
    id: "6",
    docNo: "DOC-2026-006",
    companyName: "บริษัท สยาม โลจิสติกส์ จำกัด",
    arCode: "AR-90117",
    employeeCount: 350,
    inspectionDate: "2026-05-02",
    contractEndDate: "2026-06-10", // Just overdue! Or close to
    selectedServices: ["สรุปรวมองค์กร"],
    deliveryChannel: "ไปรษณีย์",
    assignee: "อาทิตยา",
    weightScore: 1,
    status: "✓ เรียบร้อยแล้ว",
    startDate: "2026-05-04",
    endDate: "2026-06-08",
    deliveryDetail: "ส่งจดหมายตอบรับ ปณ.ดุสิต เลขที่ RE987654321TH เมื่อ 2026-06-08",
    notes: "เรียบร้อยดี"
  },
  {
    id: "7",
    docNo: "DOC-2026-007",
    companyName: "บริษัท สหพัฒนาอินเตอร์โฮลดิ้ง",
    arCode: "AR-90118",
    employeeCount: 2200, // Very large
    inspectionDate: "2026-04-05",
    contractEndDate: "2026-05-20",
    selectedServices: ["สรุปรวมองค์กร", "Excel", "ใบรายงานสำหรับ HR"],
    deliveryChannel: "E-mail",
    assignee: "อาทิตยา",
    weightScore: 3,
    status: "✓ เรียบร้อยแล้ว",
    startDate: "2026-04-10",
    endDate: "2026-05-18",
    deliveryDetail: "ส่งอีเมลหา HR Manager (khun_vilai@sahapat.com) และ CC ทีมแพทย์ เมื่อ 2026-05-18",
    notes: "รายงานประเมินเสียงดังและฝุ่นละอองอาชีวอนามัย"
  },
  {
    id: "8",
    docNo: "DOC-2026-008",
    companyName: "บริษัท เท็คแล็บ สลูชั่นส์ จำกัด",
    arCode: "AR-90119",
    employeeCount: 300,
    inspectionDate: "2026-06-01",
    contractEndDate: "2026-06-30",
    selectedServices: ["สรุปรวมองค์กร"],
    deliveryChannel: "E-mail",
    assignee: "สุนิษา",
    weightScore: 2,
    status: "✓ เรียบร้อยแล้ว", // สุนิษา completed something!
    startDate: "2026-06-02",
    endDate: "2026-06-09",
    deliveryDetail: "ส่งอีเมลกลางทีมแอดมิน admin@techlab.co.th เมื่อ 2026-06-09",
    notes: "มีข้อมูลเฉพาะคนต่างด้าว"
  }
];
