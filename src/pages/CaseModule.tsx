import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, Space, Input, Select, DatePicker, Tag, Modal,
  Form, InputNumber, Radio, Upload, message, Divider, Descriptions,
  Card, Row, Col, Statistic, Popconfirm, Tooltip, Checkbox, List,
  Timeline
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, UploadOutlined, FileTextOutlined, DownloadOutlined,
  ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined,
  FileOutlined, FolderOpenOutlined, TeamOutlined, SendOutlined,
  InboxOutlined, FileDoneOutlined, PhoneOutlined, ExperimentOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Patient, ContactRecord, Attachment, Sample, FollowUp } from '@/types';
import { storage, genId, createFollowUpForPatient } from '@/store';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const DISEASE_TYPES = [
  '新型冠状病毒感染', '流行性感冒', '手足口病', '病毒性肝炎',
  '肺结核', '狂犬病', '艾滋病', '登革热', '细菌性痢疾', '其他'
];

const SYMPTOM_LIST = [
  '发热', '咳嗽', '乏力', '咽痛', '头痛', '肌肉酸痛', '腹泻',
  '呕吐', '皮疹', '呼吸困难', '胸闷', '流涕', '鼻塞', '味觉减退',
  '嗅觉减退', '食欲下降', '体重减轻', '黄疸'
];

const CONTACT_TYPES = [
  '家庭接触', '工作接触', '学习接触', '聚餐接触', '聚会接触',
  '交通工具接触', '医疗暴露', '其他'
];

const RELATION_TYPES = [
  '家庭成员', '同事', '同学', '朋友', '邻居', '医患', '其他'
];

const statusMap: Record<string, { color: string; icon: React.ReactNode }> = {
  '待调查': { color: 'default', icon: <ClockCircleOutlined /> },
  '调查中': { color: 'processing', icon: <ClockCircleOutlined /> },
  '已结案': { color: 'success', icon: <CheckCircleOutlined /> }
};

const CaseModule: React.FC = () => {
  const [data, setData] = useState<Patient[]>([]);
  const [filteredData, setFilteredData] = useState<Patient[]>([]);
  const [allSamples, setAllSamples] = useState<Sample[]>([]);
  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRecord | null>(null);
  const [contactList, setContactList] = useState<ContactRecord[]>([]);
  const [attachmentList, setAttachmentList] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tempCaseId, setTempCaseId] = useState<string>('');

  useEffect(() => {
    const list = storage.getPatients();
    const samples = storage.getSamples();
    const followUps = storage.getFollowUps();
    setData(list);
    setFilteredData(list);
    setAllSamples(samples);
    setAllFollowUps(followUps);
  }, []);

  const relatedSamples = useMemo(() => {
    if (!viewPatient) return [];
    return allSamples.filter(s => s.patientId === viewPatient.id);
  }, [viewPatient, allSamples]);

  const relatedFollowUps = useMemo(() => {
    if (!viewPatient) return [];
    return allFollowUps.filter(f => f.patientId === viewPatient.id);
  }, [viewPatient, allFollowUps]);

  const timelineEvents = useMemo(() => {
    if (!viewPatient) return [];
    const events: any[] = [];

    events.push({
      date: viewPatient.reportDate,
      type: 'case',
      title: '病例报告',
      description: `病例 ${viewPatient.caseNo} 已报告，疾病类型：${viewPatient.diseaseType}`,
      icon: <FileTextOutlined />,
      color: 'blue'
    });

    relatedSamples.forEach(s => {
      events.push({
        date: s.collectDate,
        type: 'sample',
        title: '样本采集',
        description: `${s.sampleNo} - ${s.sampleType}，采样人：${s.collector}`,
        icon: <TeamOutlined />,
        color: 'cyan',
        data: s
      });
      if (s.sendDate) {
        events.push({
          date: s.sendDate,
          type: 'sample',
          title: '样本送检',
          description: `${s.sampleNo} 已送检，送检人：${s.sender || '-'}`,
          icon: <SendOutlined />,
          color: 'purple',
          data: s
        });
      }
      if (s.receiveDate) {
        events.push({
          date: s.receiveDate,
          type: 'sample',
          title: '样本接收',
          description: `${s.sampleNo} 已由 ${s.labName || '-'} 接收，接收人：${s.receiver || '-'}`,
          icon: <InboxOutlined />,
          color: 'geekblue',
          data: s
        });
      }
      if (s.resultDate && s.result) {
        events.push({
          date: s.resultDate,
          type: 'sample',
          title: '检测结果',
          description: `${s.sampleNo} 检测结果：${s.result}`,
          icon: <FileDoneOutlined />,
          color: s.result === '阳性' ? 'red' : 'green',
          data: s
        });
      }
    });

    relatedFollowUps.forEach(f => {
      events.push({
        date: f.planDate,
        type: 'followup',
        title: '随访计划',
        description: `${f.followUpType}随访，计划日期：${f.planDate}，状态：${f.status}`,
        icon: <PhoneOutlined />,
        color: f.status === '已失访' ? 'orange' : 'lime',
        data: f
      });
      if (f.followUpTime) {
        events.push({
          date: f.followUpTime,
          type: 'followup',
          title: '随访完成',
          description: `通话结果：${f.callResult || '-'}，${f.healthStatus || ''}`,
          icon: <CheckCircleOutlined />,
          color: 'green',
          data: f
        });
      }
    });

    return events.sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());
  }, [viewPatient, relatedSamples, relatedFollowUps]);

  const handleSearch = (values: any) => {
    let result = [...data];
    if (values.keyword) {
      const kw = values.keyword.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(kw) ||
        p.idCard.includes(kw) ||
        p.caseNo.toLowerCase().includes(kw) ||
        p.phone.includes(kw)
      );
    }
    if (values.diseaseType) {
      result = result.filter(p => p.diseaseType === values.diseaseType);
    }
    if (values.status) {
      result = result.filter(p => p.status === values.status);
    }
    if (values.dateRange) {
      const [start, end] = values.dateRange;
      result = result.filter(p => {
        const d = dayjs(p.reportDate);
        return d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'));
      });
    }
    setFilteredData(result);
  };

  const handleReset = () => {
    searchForm.resetFields();
    setFilteredData(data);
  };

  const openAddModal = () => {
    const newTempId = genId();
    setTempCaseId(newTempId);
    setEditPatient(null);
    setContactList([]);
    setAttachmentList([]);
    form.resetFields();
    form.setFieldsValue({
      reportDate: dayjs(),
      onsetDate: dayjs()
    });
    setModalVisible(true);
  };

  const openEditModal = (record: Patient) => {
    setTempCaseId(record.id);
    setEditPatient(record);
    setContactList([...record.contactHistory]);
    setAttachmentList([...record.attachments]);
    form.setFieldsValue({
      ...record,
      reportDate: dayjs(record.reportDate),
      onsetDate: dayjs(record.onsetDate)
    });
    setModalVisible(true);
  };

  const openDetailModal = (record: Patient) => {
    setViewPatient(record);
    setDetailVisible(true);
  };

  const handleCancel = async () => {
    if (!editPatient && tempCaseId && attachmentList.length > 0) {
      Modal.confirm({
        title: '确认取消',
        content: '取消后，已上传的附件将被删除，确定要取消吗？',
        okText: '确定取消',
        cancelText: '继续编辑',
        onOk: async () => {
          try {
            await window.api.cleanupTempAttachments({ caseId: tempCaseId });
            message.info('已清理临时附件');
          } catch (e) {
            console.error('清理临时附件失败:', e);
          }
          setModalVisible(false);
        }
      });
    } else {
      setModalVisible(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const caseId = editPatient?.id || tempCaseId;

      const newData: Patient = {
        ...values,
        id: caseId,
        caseNo: editPatient?.caseNo ||
          `JB${dayjs().format('YYYYMM')}${String(data.length + 1).padStart(3, '0')}`,
        reportDate: values.reportDate.format('YYYY-MM-DD'),
        onsetDate: values.onsetDate.format('YYYY-MM-DD'),
        contactHistory: contactList,
        attachments: attachmentList,
        status: editPatient?.status || '待调查',
        createdAt: editPatient?.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
        createUser: editPatient?.createUser || '管理员'
      };

      let updated: Patient[];
      let isNew = false;

      if (editPatient) {
        updated = data.map(p => p.id === editPatient.id ? newData : p);
        message.success('病例修改成功');
      } else {
        updated = [newData, ...data];
        isNew = true;
        message.success('病例登记成功');
      }

      setData(updated);
      setFilteredData(updated);
      storage.savePatients(updated);

      if (isNew) {
        const followUp = createFollowUpForPatient(newData);
        if (followUp) {
          message.info(
            `已自动生成随访计划，计划随访日期：${followUp.planDate}`
          );
        } else {
          message.info('该病例已有待随访任务，未重复生成');
        }
      }

      setModalVisible(false);
    } catch {
      // 表单验证错误，不处理
    }
  };

  const handleDelete = (id: string) => {
    const updated = data.filter(p => p.id !== id);
    setData(updated);
    setFilteredData(updated);
    storage.savePatients(updated);
    message.success('删除成功');
  };

  const handleAddContact = () => {
    setEditingContact(null);
    contactForm.resetFields();
    contactForm.setFieldsValue({
      contactDate: dayjs()
    });
    setContactModalVisible(true);
  };

  const handleEditContact = (record: ContactRecord) => {
    setEditingContact(record);
    contactForm.setFieldsValue({
      ...record,
      contactDate: dayjs(record.contactDate)
    });
    setContactModalVisible(true);
  };

  const handleSaveContact = async () => {
    try {
      const values = await contactForm.validateFields();
      const newContact: ContactRecord = {
        ...values,
        id: editingContact?.id || genId(),
        contactDate: values.contactDate.format('YYYY-MM-DD')
      };
      let list: ContactRecord[];
      if (editingContact) {
        list = contactList.map(c => c.id === editingContact.id ? newContact : c);
      } else {
        list = [...contactList, newContact];
      }
      setContactList(list);
      setContactModalVisible(false);
      message.success('接触史保存成功');
    } catch {
      // 忽略
    }
  };

  const handleDeleteContact = (id: string) => {
    setContactList(contactList.filter(c => c.id !== id));
  };

  const handleAttachmentUpload = (file: File) => {
    if (!tempCaseId) {
      message.error('请先保存病例基础信息后再上传附件');
      return Upload.LIST_IGNORE;
    }

    setUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Data = e.target?.result as string;
        const result = await window.api.uploadAttachment({
          caseId: tempCaseId,
          fileName: file.name,
          fileData: base64Data,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size
        });

        if (result.success) {
          const newAttachment: Attachment = {
            id: genId(),
            fileName: result.originalName,
            fileSize: file.size,
            uploadTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            fileType: file.type || '未知',
            filePath: result.filePath,
            storedName: result.storedName
          };
          setAttachmentList([...attachmentList, newAttachment]);
          message.success('附件上传成功');
        } else {
          message.error(`上传失败：${result.error}`);
        }
      } catch (error: any) {
        message.error(`上传失败：${error.message}`);
      } finally {
        setUploading(false);
      }
    };

    reader.readAsDataURL(file);
    return Upload.LIST_IGNORE;
  };

  const handleRemoveAttachment = async (attachment: Attachment) => {
    try {
      await window.api.deleteAttachment({ filePath: attachment.filePath });
      setAttachmentList(attachmentList.filter(a => a.id !== attachment.id));
      message.success('附件已删除');
    } catch (error: any) {
      message.error(`删除失败：${error.message}`);
    }
  };

  const handleOpenAttachment = async (attachment: Attachment) => {
    try {
      const result = await window.api.openAttachment({ filePath: attachment.filePath });
      if (!result.success) {
        message.error(`打开失败：${result.error}`);
      }
    } catch (error: any) {
      message.error(`打开失败：${error.message}`);
    }
  };

  const handleExportAttachment = async (attachment: Attachment) => {
    try {
      const result = await window.api.exportAttachment({
        filePath: attachment.filePath,
        fileName: attachment.fileName
      });
      if (result.success) {
        message.success(`已导出到：${result.exportPath}`);
      } else if (!result.canceled) {
        message.error(`导出失败：${result.error}`);
      }
    } catch (error: any) {
      message.error(`导出失败：${error.message}`);
    }
  };

  const columns: ColumnsType<Patient> = [
    {
      title: '病例编号',
      dataIndex: 'caseNo',
      width: 130,
      fixed: 'left',
      render: (t) => <Tag color="blue">{t}</Tag>
    },
    { title: '姓名', dataIndex: 'name', width: 90 },
    {
      title: '性别',
      dataIndex: 'gender',
      width: 70,
      render: (g) => <Tag color={g === '男' ? 'blue' : 'pink'}>{g}</Tag>
    },
    { title: '年龄', dataIndex: 'age', width: 70 },
    { title: '身份证号', dataIndex: 'idCard', width: 190 },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    {
      title: '疾病类型',
      dataIndex: 'diseaseType',
      width: 140,
      ellipsis: true
    },
    {
      title: '发病日期',
      dataIndex: 'onsetDate',
      width: 110
    },
    {
      title: '报告日期',
      dataIndex: 'reportDate',
      width: 110
    },
    {
      title: '附件',
      dataIndex: 'attachments',
      width: 90,
      render: (list: Attachment[]) => list.length > 0 ? (
        <Tag color="purple">{list.length} 份</Tag>
      ) : <span style={{ color: '#ccc' }}>-</span>
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s) => {
        const cfg = statusMap[s] || statusMap['待调查'];
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {s}
          </Tag>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openDetailModal(record)}
            >
              查看
            </Button>
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            >
              编辑
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定删除该病例吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const contactColumns: ColumnsType<ContactRecord> = [
    { title: '接触者姓名', dataIndex: 'contactName', width: 120 },
    { title: '接触类型', dataIndex: 'contactType', width: 120 },
    { title: '与病例关系', dataIndex: 'contactRelation', width: 120 },
    { title: '接触日期', dataIndex: 'contactDate', width: 120 },
    { title: '接触地点', dataIndex: 'contactLocation', width: 150 },
    { title: '接触描述', dataIndex: 'description', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleEditContact(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDeleteContact(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  const stats = {
    total: data.length,
    pending: data.filter(p => p.status === '待调查').length,
    processing: data.filter(p => p.status === '调查中').length,
    done: data.filter(p => p.status === '已结案').length
  };

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="病例总数"
              value={stats.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="待调查"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="调查中"
              value={stats.processing}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="已结案"
              value={stats.done}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="page-card" style={{ padding: 20 }}>
        <div className="page-header">
          <div className="page-title">病例登记</div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAddModal}
            size="large"
          >
            新增病例
          </Button>
        </div>

        <Form form={searchForm} layout="inline" className="toolbar" onFinish={handleSearch}>
          <Form.Item name="keyword">
            <Input
              placeholder="搜索姓名/身份证/病例编号/电话"
              prefix={<SearchOutlined />}
              style={{ width: 260 }}
              allowClear
            />
          </Form.Item>
          <Form.Item name="diseaseType">
            <Select
              placeholder="疾病类型"
              style={{ width: 160 }}
              allowClear
              options={DISEASE_TYPES.map(d => ({ label: d, value: d }))}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="状态"
              style={{ width: 120 }}
              allowClear
              options={[
                { label: '待调查', value: '待调查' },
                { label: '调查中', value: '调查中' },
                { label: '已结案', value: '已结案' }
              ]}
            />
          </Form.Item>
          <Form.Item name="dateRange">
            <RangePicker style={{ width: 260 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">查询</Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          scroll={{ x: 1600 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSize: 10
          }}
        />
      </div>

      <Modal
        title={editPatient ? '编辑病例' : '新增病例'}
        open={modalVisible}
        width={900}
        onOk={handleSave}
        onCancel={handleCancel}
        okText="保存"
        cancelText="取消"
        zIndex={1000}
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 8 }}
        >
          <Divider orientation="left" plain>基础信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="姓名"
                name="name"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="性别"
                name="gender"
                rules={[{ required: true, message: '请选择性别' }]}
              >
                <Radio.Group>
                  <Radio value="男">男</Radio>
                  <Radio value="女">女</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="年龄"
                name="age"
                rules={[{ required: true, message: '请输入年龄' }]}
              >
                <InputNumber min={0} max={150} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="身份证号"
                name="idCard"
                rules={[
                  { required: true, message: '请输入身份证号' },
                  { len: 18, message: '身份证号应为18位' }
                ]}
              >
                <Input placeholder="请输入18位身份证号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="联系电话"
                name="phone"
                rules={[
                  { required: true, message: '请输入联系电话' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
                ]}
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="现住址"
                name="address"
                rules={[{ required: true, message: '请输入现住址' }]}
              >
                <Input placeholder="请输入详细地址" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="疾病类型"
                name="diseaseType"
                rules={[{ required: true, message: '请选择疾病类型' }]}
              >
                <Select
                  placeholder="请选择疾病类型"
                  options={DISEASE_TYPES.map(d => ({ label: d, value: d }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="发病日期"
                name="onsetDate"
                rules={[{ required: true, message: '请选择发病日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="报告日期"
                name="reportDate"
                rules={[{ required: true, message: '请选择报告日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>临床症状</Divider>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="症状勾选"
                name="symptoms"
                rules={[{ required: true, message: '请至少选择一个症状' }]}
              >
                <Checkbox.Group options={SYMPTOM_LIST} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="其他症状描述" name="otherSymptoms">
                <TextArea rows={2} placeholder="如有其他症状请描述" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>
            <Space>
              <span>接触史记录</span>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddContact}
              >
                添加接触史
              </Button>
            </Space>
          </Divider>
          {contactList.length > 0 ? (
            <Table
              columns={contactColumns}
              dataSource={contactList}
              rowKey="id"
              size="small"
              pagination={false}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
              暂无接触史记录，请点击上方按钮添加
            </div>
          )}

          <Divider orientation="left" plain>附件上传</Divider>
          <div style={{ marginBottom: 12 }}>
            <Upload
              multiple
              beforeUpload={handleAttachmentUpload}
              showUploadList={false}
            >
              <Button
                icon={<UploadOutlined />}
                loading={uploading}
                type="primary"
              >
                上传病历/检验报告等附件
              </Button>
            </Upload>
            <span style={{ marginLeft: 12, color: '#999', fontSize: 12 }}>
              支持 PDF、Word、Excel、图片等格式，文件将保存在本地
            </span>
          </div>
          {attachmentList.length > 0 ? (
            <List
              size="small"
              dataSource={attachmentList}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      size="small"
                      icon={<FolderOpenOutlined />}
                      onClick={() => handleOpenAttachment(item)}
                    >
                      打开
                    </Button>,
                    <Button
                      type="link"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => handleExportAttachment(item)}
                    >
                      导出
                    </Button>,
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => handleRemoveAttachment(item)}
                    >
                      删除
                    </Button>
                  ]}
                  style={{
                    padding: '8px 12px',
                    background: '#fafafa',
                    borderRadius: 4,
                    marginBottom: 8
                  }}
                >
                  <List.Item.Meta
                    avatar={<FileOutlined style={{ color: '#1677ff', fontSize: 20 }} />}
                    title={item.fileName}
                    description={
                      <Space size={12}>
                        <span style={{ color: '#999' }}>
                          大小: {(item.fileSize / 1024).toFixed(1)} KB
                        </span>
                        <span style={{ color: '#999' }}>
                          上传时间: {item.uploadTime}
                        </span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: '#999', border: '1px dashed #d9d9d9', borderRadius: 4 }}>
              暂无附件，请点击上方按钮上传
            </div>
          )}
        </Form>
      </Modal>

      <Modal
        title={editingContact ? '编辑接触史' : '添加接触史'}
        open={contactModalVisible}
        onOk={handleSaveContact}
        onCancel={() => setContactModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
        zIndex={1100}
      >
        <Form form={contactForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="接触者姓名"
                name="contactName"
                rules={[{ required: true, message: '请输入接触者姓名' }]}
              >
                <Input placeholder="请输入接触者姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="接触类型"
                name="contactType"
                rules={[{ required: true, message: '请选择接触类型' }]}
              >
                <Select
                  placeholder="请选择接触类型"
                  options={CONTACT_TYPES.map(c => ({ label: c, value: c }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="与病例关系"
                name="contactRelation"
                rules={[{ required: true, message: '请选择与病例关系' }]}
              >
                <Select
                  placeholder="请选择关系"
                  options={RELATION_TYPES.map(r => ({ label: r, value: r }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="接触日期"
                name="contactDate"
                rules={[{ required: true, message: '请选择接触日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="接触地点"
                name="contactLocation"
                rules={[{ required: true, message: '请输入接触地点' }]}
              >
                <Input placeholder="请输入接触地点" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="接触过程描述"
                name="description"
                rules={[{ required: true, message: '请描述接触过程' }]}
              >
                <TextArea rows={3} placeholder="请详细描述接触的时间、方式、持续时间等" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="病例详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>关闭</Button>,
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setDetailVisible(false);
              openEditModal(viewPatient!);
            }}
          >
            编辑
          </Button>
        ]}
      >
        {viewPatient && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
            <Descriptions title="基础信息" bordered column={2} size="small">
              <Descriptions.Item label="病例编号">{viewPatient.caseNo}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[viewPatient.status].color}>
                  {statusMap[viewPatient.status].icon} {viewPatient.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="姓名">{viewPatient.name}</Descriptions.Item>
              <Descriptions.Item label="性别/年龄">
                {viewPatient.gender} / {viewPatient.age}岁
              </Descriptions.Item>
              <Descriptions.Item label="身份证号">{viewPatient.idCard}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{viewPatient.phone}</Descriptions.Item>
              <Descriptions.Item label="现住址" span={2}>{viewPatient.address}</Descriptions.Item>
              <Descriptions.Item label="疾病类型">{viewPatient.diseaseType}</Descriptions.Item>
              <Descriptions.Item label="发病日期">{viewPatient.onsetDate}</Descriptions.Item>
              <Descriptions.Item label="报告日期">{viewPatient.reportDate}</Descriptions.Item>
              <Descriptions.Item label="登记时间">
                {viewPatient.createdAt}
              </Descriptions.Item>
              <Descriptions.Item label="登记人">{viewPatient.createUser}</Descriptions.Item>
            </Descriptions>

            <Divider plain orientation="left">临床症状</Divider>
            <div style={{ marginBottom: 16 }}>
              {viewPatient.symptoms.map(s => (
                <Tag key={s} color="red" style={{ marginBottom: 8 }}>{s}</Tag>
              ))}
              {viewPatient.otherSymptoms && (
                <div style={{ marginTop: 8, color: '#666' }}>
                  其他：{viewPatient.otherSymptoms}
                </div>
              )}
            </div>

            <Divider plain orientation="left">接触史记录</Divider>
            {viewPatient.contactHistory.length > 0 ? (
              <Table
                columns={contactColumns.slice(0, -1)}
                dataSource={viewPatient.contactHistory}
                rowKey="id"
                size="small"
                pagination={false}
              />
            ) : (
              <div style={{ color: '#999', padding: 12 }}>无接触史记录</div>
            )}

            <Divider plain orientation="left">附件列表 ({viewPatient.attachments.length})</Divider>
            {viewPatient.attachments.length > 0 ? (
              <List
                size="small"
                dataSource={viewPatient.attachments}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        size="small"
                        icon={<FolderOpenOutlined />}
                        onClick={() => handleOpenAttachment(item)}
                      >
                        打开
                      </Button>,
                      <Button
                        type="link"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => handleExportAttachment(item)}
                      >
                        导出
                      </Button>
                    ]}
                    style={{
                      padding: '8px 12px',
                      background: '#fafafa',
                      borderRadius: 4,
                      marginBottom: 8
                    }}
                  >
                    <List.Item.Meta
                      avatar={<FileOutlined style={{ color: '#1677ff', fontSize: 20 }} />}
                      title={item.fileName}
                      description={
                        <Space size={12}>
                          <span style={{ color: '#999' }}>
                            大小: {(item.fileSize / 1024).toFixed(1)} KB
                          </span>
                          <span style={{ color: '#999' }}>
                            上传: {item.uploadTime}
                          </span>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ color: '#999', padding: 12, textAlign: 'center' }}>
                暂无附件
              </div>
            )}

            <Divider plain orientation="left">
              <Space><ExperimentOutlined /> 处置过程时间线 ({timelineEvents.length}条记录)
              </Space>
            </Divider>
            {timelineEvents.length > 0 ? (
              <Timeline
                mode="left"
                items={timelineEvents.map((event, idx) => ({
                  color: event.color,
                  dot: event.icon,
                  children: (
                    <div
                      style={{ cursor: event.data ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (event.data) {
                          if (event.type === 'sample') {
                            message.info(`样本详情：${event.data.sampleNo}，状态：${event.data.status}`);
                          } else if (event.type === 'followup') {
                            message.info(`随访详情：${event.data.id}，状态：${event.data.status}`);
                          }
                        }
                      }}
                    >
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <div style={{ fontWeight: 500 }}>
                          {event.title}
                          {event.data && (
                            <Tag
                              color="blue"
                              style={{ marginLeft: 8, fontSize: 11 }}
                            >
                              点击查看
                            </Tag>
                          )}
                        </div>
                        <div style={{ color: '#666', fontSize: 13 }}>
                          {event.description}
                        </div>
                        <div style={{ color: '#999', fontSize: 12 }}>
                          {event.date}
                        </div>
                      </Space>
                    </div>
                  )
                }))}
              />
            ) : (
              <div style={{ color: '#999', padding: 20, textAlign: 'center' }}>
                <ClockCircleOutlined style={{ fontSize: 30, opacity: 0.4 }} />
                <div style={{ marginTop: 8 }}>暂无处置过程记录</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  该病例暂未关联采样或随访记录
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CaseModule;
