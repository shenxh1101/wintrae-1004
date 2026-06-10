import type {
  Patient, FollowUp, Sample, PlaceInspection, AbnormalItem
} from '@/types';

const KEYS = {
  PATIENTS: 'cdc_patients',
  FOLLOWUPS: 'cdc_followups',
  SAMPLES: 'cdc_samples',
  PLACES: 'cdc_places',
  ABNORMALS: 'cdc_abnormals'
} as const;

const mockPatients: Patient[] = [
  {
    id: '1',
    caseNo: 'JB202606001',
    name: '张三',
    idCard: '110101199001011234',
    gender: '男',
    age: 35,
    phone: '13800138001',
    address: '北京市朝阳区建国路88号',
    diseaseType: '新型冠状病毒感染',
    reportDate: '2026-06-01',
    onsetDate: '2026-05-30',
    symptoms: ['发热', '咳嗽', '乏力'],
    contactHistory: [
      {
        id: 'c1',
        contactName: '李四',
        contactType: '家庭接触',
        contactRelation: '同事',
        contactDate: '2026-05-28',
        contactLocation: '办公室',
        description: '共同办公，未佩戴口罩'
      }
    ],
    attachments: [],
    status: '调查中',
    createdAt: '2026-06-01 09:30:00',
    createUser: '王医生'
  },
  {
    id: '2',
    caseNo: 'JB202606002',
    name: '王五',
    idCard: '110102198505052345',
    gender: '女',
    age: 40,
    phone: '13900139002',
    address: '北京市海淀区中关村大街1号',
    diseaseType: '流行性感冒',
    reportDate: '2026-06-02',
    onsetDate: '2026-06-01',
    symptoms: ['发热', '头痛', '肌肉酸痛'],
    contactHistory: [],
    attachments: [],
    status: '待调查',
    createdAt: '2026-06-02 14:20:00',
    createUser: '李医生'
  },
  {
    id: '3',
    caseNo: 'BN202606003',
    name: '赵六',
    idCard: '110103197803083456',
    gender: '男',
    age: 48,
    phone: '13700137003',
    address: '北京市西城区金融街10号',
    diseaseType: '新型冠状病毒感染',
    reportDate: '2026-06-03',
    onsetDate: '2026-06-02',
    symptoms: ['发热', '咳嗽'],
    contactHistory: [],
    attachments: [],
    status: '已结案',
    createdAt: '2026-06-03 10:15:00',
    createUser: '张医生'
  }
];

const mockFollowUps: FollowUp[] = [
  {
    id: 'f1',
    patientId: '1',
    patientName: '张三',
    phone: '13800138001',
    diseaseType: '新型冠状病毒感染',
    planDate: '2026-06-05',
    status: '待随访',
    followUpType: '电话'
  },
  {
    id: 'f2',
    patientId: '2',
    patientName: '王五',
    phone: '13900139002',
    diseaseType: '流行性感冒',
    planDate: '2026-06-06',
    status: '待随访',
    followUpType: '电话'
  },
  {
    id: 'f3',
    patientId: '3',
    patientName: '赵六',
    phone: '13700137003',
    diseaseType: '新型冠状病毒感染',
    planDate: '2026-06-04',
    status: '已完成',
    followUpType: '电话',
    callResult: '接通',
    healthStatus: '症状好转，体温正常',
    followUpTime: '2026-06-04 15:30:00',
    operator: '李护士'
  }
];

const mockSamples: Sample[] = [
  {
    id: 's1',
    sampleNo: 'YP202606001',
    patientId: '1',
    patientName: '张三',
    sampleType: '鼻咽拭子',
    collectDate: '2026-06-01',
    collector: '采样员A',
    sendDate: '2026-06-01',
    sender: '送检员B',
    receiveDate: '2026-06-02',
    receiver: '实验室C',
    labName: '区疾控中心实验室',
    resultDate: '2026-06-03',
    result: '阳性',
    status: '已出结果'
  },
  {
    id: 's2',
    sampleNo: 'YP202606002',
    patientId: '2',
    patientName: '王五',
    sampleType: '咽拭子',
    collectDate: '2026-06-02',
    collector: '采样员A',
    status: '已采样'
  }
];

const mockPlaces: PlaceInspection[] = [
  {
    id: 'p1',
    placeName: '阳光小学',
    placeType: '学校',
    address: '北京市朝阳区建国路100号',
    contactPerson: '刘校长',
    contactPhone: '13600136004',
    inspectDate: '2026-06-03',
    inspector: '检查员1',
    items: [
      { id: 'i1', name: '体温检测设施', standard: '配备体温检测设备', result: '合格' },
      { id: 'i2', name: '消毒记录', standard: '每日消毒记录完整', result: '合格' },
      { id: 'i3', name: '应急预案', standard: '有完整应急预案', result: '不合格', remark: '预案未及时更新' }
    ],
    issues: '应急预案需要更新',
    rectification: '一周内完成预案更新',
    status: '待整改',
    nextInspectDate: '2026-06-17'
  },
  {
    id: 'p2',
    placeName: '新华菜市场',
    placeType: '市场',
    address: '北京市海淀区中关村大街50号',
    contactPerson: '孙经理',
    contactPhone: '13500135005',
    inspectDate: '2026-06-02',
    inspector: '检查员2',
    items: [
      { id: 'i1', name: '环境消毒', standard: '每日消毒', result: '合格' },
      { id: 'i2', name: '通风情况', standard: '良好通风', result: '合格' }
    ],
    issues: '',
    rectification: '',
    status: '正常'
  },
  {
    id: 'p3',
    placeName: '幸福养老院',
    placeType: '养老机构',
    address: '北京市西城区西直门内大街30号',
    contactPerson: '周院长',
    contactPhone: '13400134006',
    inspectDate: '2026-06-01',
    inspector: '检查员3',
    items: [
      { id: 'i1', name: '老人健康监测', standard: '每日体温监测记录', result: '合格' },
      { id: 'i2', name: '医疗保障', standard: '配备基础医疗设备', result: '合格' },
      { id: 'i3', name: '访客管理', standard: '严格访客登记', result: '合格' }
    ],
    issues: '',
    rectification: '',
    status: '正常'
  }
];

const mockAbnormals: AbnormalItem[] = [
  {
    id: 'a1',
    type: '病例异常',
    name: '张三',
    reason: '症状持续加重',
    date: '2026-06-05',
    level: '高',
    status: '待处理'
  },
  {
    id: 'a2',
    type: '场所异常',
    name: '阳光小学',
    reason: '聚集性发热病例',
    date: '2026-06-04',
    level: '中',
    status: '处理中',
    handler: '王主任'
  }
];

function getStore(): any {
  let store = null;

  const patients = localStorage.getItem(KEYS.PATIENTS);
  const followUps = localStorage.getItem(KEYS.FOLLOWUPS);
  const samples = localStorage.getItem(KEYS.SAMPLES);
  const places = localStorage.getItem(KEYS.PLACES);
  const abnormals = localStorage.getItem(KEYS.ABNORMALS);

  if (!patients) {
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(mockPatients));
  }
  if (!followUps) {
    localStorage.setItem(KEYS.FOLLOWUPS, JSON.stringify(mockFollowUps));
  }
  if (!samples) {
    localStorage.setItem(KEYS.SAMPLES, JSON.stringify(mockSamples));
  }
  if (!places) {
    localStorage.setItem(KEYS.PLACES, JSON.stringify(mockPlaces));
  }
  if (!abnormals) {
    localStorage.setItem(KEYS.ABNORMALS, JSON.stringify(mockAbnormals));
  }

  store = {
    patients: JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]'),
    followUps: JSON.parse(localStorage.getItem(KEYS.FOLLOWUPS) || '[]'),
    samples: JSON.parse(localStorage.getItem(KEYS.SAMPLES) || '[]'),
    places: JSON.parse(localStorage.getItem(KEYS.PLACES) || '[]'),
    abnormals: JSON.parse(localStorage.getItem(KEYS.ABNORMALS) || '[]')
  };

  return store;
}

export const storage = {
  getPatients(): Patient[] {
    const store = getStore();
    return store.patients;
  },
  savePatients(data: Patient[]) {
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(data));
  },
  getFollowUps(): FollowUp[] {
    const store = getStore();
    return store.followUps;
  },
  saveFollowUps(data: FollowUp[]) {
    localStorage.setItem(KEYS.FOLLOWUPS, JSON.stringify(data));
  },
  getSamples(): Sample[] {
    const store = getStore();
    return store.samples;
  },
  saveSamples(data: Sample[]) {
    localStorage.setItem(KEYS.SAMPLES, JSON.stringify(data));
  },
  getPlaces(): PlaceInspection[] {
    const store = getStore();
    return store.places;
  },
  savePlaces(data: PlaceInspection[]) {
    localStorage.setItem(KEYS.PLACES, JSON.stringify(data));
  },
  getAbnormals(): AbnormalItem[] {
    const store = getStore();
    return store.abnormals;
  },
  saveAbnormals(data: AbnormalItem[]) {
    localStorage.setItem(KEYS.ABNORMALS, JSON.stringify(data));
  }
};

export const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
