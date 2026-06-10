export interface Patient {
  id: string;
  caseNo: string;
  name: string;
  idCard: string;
  gender: '男' | '女';
  age: number;
  phone: string;
  address: string;
  diseaseType: string;
  reportDate: string;
  onsetDate: string;
  symptoms: string[];
  otherSymptoms?: string;
  contactHistory: ContactRecord[];
  attachments: Attachment[];
  status: '待调查' | '调查中' | '已结案';
  createdAt: string;
  createUser: string;
}

export interface ContactRecord {
  id: string;
  contactName: string;
  contactType: string;
  contactRelation: string;
  contactDate: string;
  contactLocation: string;
  description: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  uploadTime: string;
  fileType: string;
  filePath: string;
  storedName: string;
}

export interface FollowUp {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  diseaseType: string;
  planDate: string;
  status: '待随访' | '随访中' | '已完成' | '已失访';
  followUpType: '电话' | '上门' | '视频';
  callResult?: '接通' | '未接通' | '关机' | '空号' | '拒接';
  lossReason?: string;
  healthStatus?: string;
  remarks?: string;
  followUpTime?: string;
  operator?: string;
}

export interface Sample {
  id: string;
  sampleNo: string;
  patientId: string;
  patientName: string;
  caseNo?: string;
  diseaseType?: string;
  sampleType: string;
  collectDate: string;
  collector: string;
  sendDate?: string;
  sender?: string;
  receiveDate?: string;
  receiver?: string;
  labName?: string;
  resultDate?: string;
  result?: '阳性' | '阴性' | '待检测';
  resultRemark?: string;
  status: '已采样' | '已送检' | '已接收' | '已出结果';
}

export interface PlaceInspection {
  id: string;
  placeName: string;
  placeType: '学校' | '市场' | '养老机构' | '其他';
  address: string;
  contactPerson: string;
  contactPhone: string;
  inspectDate: string;
  inspector: string;
  items: InspectionItem[];
  issues: string;
  rectification: string;
  status: '正常' | '待整改' | '已整改';
  nextInspectDate?: string;
}

export interface InspectionItem {
  id: string;
  name: string;
  standard: string;
  result: '合格' | '不合格' | '不适用';
  remark?: string;
}

export interface ReportFilter {
  startDate: string;
  endDate: string;
  diseaseType?: string;
  region?: string;
}

export interface TrendData {
  date: string;
  count: number;
  disease: string;
}

export interface AbnormalItem {
  id: string;
  type: string;
  name: string;
  reason: string;
  date: string;
  level: '高' | '中' | '低';
  status: '待处理' | '处理中' | '已处理';
  handler?: string;
}

export type ModuleKey = 'case' | 'followup' | 'sample' | 'place' | 'report';
