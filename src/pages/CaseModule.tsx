import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Input, Select, DatePicker, Tag, Modal,
  Form, InputNumber, Radio, Upload, message, Divider, Descriptions,
  Card, Row, Col, Statistic, Popconfirm, Tooltip, Checkbox
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, UploadOutlined, FileTextOutlined, DownloadOutlined,
  ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Patient, ContactRecord, Attachment } from '@/types';
import { storage, genId } from '@/store';
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

  useEffect(() => {
    const list = storage.getPatients();
    setData(list);
    setFilteredData(list);
  }, []);

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

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const newData: Patient = {
        ...values,
        id: editPatient?.id || genId(),
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
      if (editPatient) {
        updated = data.map(p => p.id === editPatient.id ? newData : p);
        message.success('病例修改成功');
      } else {
        updated = [newData, ...data];
        message.success('病例登记成功');
      }
      setData(updated);
      setFilteredData(updated);
      storage.savePatients(updated);
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
          scroll={{ x: 1400 }}
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
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        zIndex={1000}
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
          <Upload
            multiple
            beforeUpload={(file) => {
              const att: Attachment = {
                id: genId(),
                fileName: file.name,
                fileSize: file.size,
                uploadTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                fileType: file.type || '未知'
              };
              setAttachmentList([...attachmentList, att]);
              return false;
            }}
            onRemove={(file) => {
              const idx = attachmentList.findIndex(a => a.fileName === file.name);
              if (idx > -1) {
                setAttachmentList(attachmentList.filter((_, i) => i !== idx));
              }
              return true;
            }}
          >
            <Button icon={<UploadOutlined />}>上传病历/检验报告等附件</Button>
          </Upload>
          {attachmentList.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {attachmentList.map(a => (
                <Tag key={a.id} color="blue" style={{ marginBottom: 8 }} closable
                  onClose={() => setAttachmentList(attachmentList.filter(x => x.id !== a.id))}>
                  <FileTextOutlined /> {a.fileName}
                  <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
                    ({(a.fileSize / 1024).toFixed(1)} KB)
                  </span>
                </Tag>
              ))}
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
        width={900}
      >
        {viewPatient && (
          <div>
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

            {viewPatient.attachments.length > 0 && (
              <>
                <Divider plain orientation="left">附件列表</Divider>
                {viewPatient.attachments.map(a => (
                  <Tag key={a.id} color="blue" style={{ marginBottom: 8 }}>
                    <FileTextOutlined /> {a.fileName}
                    <Button type="link" size="small" icon={<DownloadOutlined />}>
                      下载
                    </Button>
                  </Tag>
                ))}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CaseModule;
