import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Input, Select, DatePicker, Tag, Modal,
  Form, message, Divider, Descriptions, Card, Row, Col, Statistic,
  Tooltip, Steps, Timeline, Radio, Progress, Alert
} from 'antd';
import {
  SwapOutlined, SearchOutlined, EditOutlined, EyeOutlined,
  PlusOutlined, CheckOutlined, ClockCircleOutlined, SendOutlined,
  InboxOutlined, FileDoneOutlined, ExperimentOutlined, TeamOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Sample, Patient } from '@/types';
import { storage, genId } from '@/store';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const SAMPLE_TYPES = [
  '鼻咽拭子', '咽拭子', '口咽拭子', '鼻拭子', '血液', '血清',
  '痰液', '粪便', '尿液', '脑脊液', '组织标本', '其他'
];

const LAB_NAMES = [
  '区疾控中心实验室', '市疾控中心实验室', '第三方检测机构A',
  '第三方检测机构B', '定点医院实验室'
];

const STATUS_FLOW = ['已采样', '已送检', '已接收', '已出结果'];

const statusMap: Record<string, { color: string; icon: React.ReactNode; step: number }> = {
  '已采样': { color: 'processing', icon: <TeamOutlined />, step: 0 },
  '已送检': { color: 'blue', icon: <SendOutlined />, step: 1 },
  '已接收': { color: 'cyan', icon: <InboxOutlined />, step: 2 },
  '已出结果': { color: 'success', icon: <FileDoneOutlined />, step: 3 }
};

const resultMap: Record<string, { color: string }> = {
  '阳性': { color: 'error' },
  '阴性': { color: 'success' },
  '待检测': { color: 'default' }
};

const SampleModule: React.FC = () => {
  const [data, setData] = useState<Sample[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredData, setFilteredData] = useState<Sample[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<Sample | null>(null);
  const [viewRecord, setViewRecord] = useState<Sample | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const list = storage.getSamples();
    const patientList = storage.getPatients();
    setData(list);
    setPatients(patientList);
    setFilteredData(list);
  }, []);

  const handleSearch = (values: any) => {
    let result = [...data];
    if (values.keyword) {
      const kw = values.keyword.toLowerCase();
      result = result.filter(s =>
        s.sampleNo.toLowerCase().includes(kw) ||
        s.patientName.toLowerCase().includes(kw)
      );
    }
    if (values.sampleType) {
      result = result.filter(s => s.sampleType === values.sampleType);
    }
    if (values.status) {
      result = result.filter(s => s.status === values.status);
    }
    if (values.result && values.result !== '全部') {
      result = result.filter(s => s.result === values.result);
    }
    if (values.dateRange) {
      const [start, end] = values.dateRange;
      result = result.filter(s => {
        const d = dayjs(s.collectDate);
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
    setEditRecord(null);
    setIsEditMode(false);
    setCurrentStep(0);
    form.resetFields();
    form.setFieldsValue({
      collectDate: dayjs()
    });
    setModalVisible(true);
  };

  const openEditModal = (record: Sample) => {
    setEditRecord(record);
    setIsEditMode(true);
    setCurrentStep(statusMap[record.status].step);
    form.setFieldsValue({
      ...record,
      collectDate: record.collectDate ? dayjs(record.collectDate) : undefined,
      sendDate: record.sendDate ? dayjs(record.sendDate) : undefined,
      receiveDate: record.receiveDate ? dayjs(record.receiveDate) : undefined,
      resultDate: record.resultDate ? dayjs(record.resultDate) : undefined
    });
    setModalVisible(true);
  };

  const openDetailModal = (record: Sample) => {
    setViewRecord(record);
    setDetailVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const step = isEditMode ? currentStep : 0;
      const status = STATUS_FLOW[step];

      const baseSample: Sample = {
        id: editRecord?.id || genId(),
        sampleNo: editRecord?.sampleNo ||
          `YP${dayjs().format('YYYYMM')}${String(data.length + 1).padStart(3, '0')}`,
        patientId: values.patientId || 'P' + genId(),
        patientName: values.patientName,
        caseNo: values.caseNo,
        diseaseType: values.diseaseType,
        sampleType: values.sampleType,
        collectDate: values.collectDate.format('YYYY-MM-DD'),
        collector: values.collector,
        status: status as Sample['status'],
        sendDate: step >= 1 ? values.sendDate?.format('YYYY-MM-DD') : undefined,
        sender: step >= 1 ? values.sender : undefined,
        receiveDate: step >= 2 ? values.receiveDate?.format('YYYY-MM-DD') : undefined,
        receiver: step >= 2 ? values.receiver : undefined,
        labName: step >= 2 ? values.labName : undefined,
        resultDate: step >= 3 ? values.resultDate?.format('YYYY-MM-DD') : undefined,
        result: step >= 3 ? values.result : undefined,
        resultRemark: step >= 3 ? values.resultRemark : undefined
      };

      let updated: Sample[];
      if (editRecord) {
        updated = data.map(s => s.id === editRecord.id ? baseSample : s);
        message.success('样本信息更新成功');
      } else {
        updated = [baseSample, ...data];
        message.success('样本登记成功');
      }

      setData(updated);
      setFilteredData(updated);
      storage.saveSamples(updated);
      setModalVisible(false);
    } catch {
      // 表单验证错误
    }
  };

  const handleNextStep = async () => {
    try {
      await form.validateFields();
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      }
    } catch {
      message.warning('请先完成当前步骤的信息填写');
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const columns: ColumnsType<Sample> = [
    {
      title: '样本编号',
      dataIndex: 'sampleNo',
      width: 130,
      fixed: 'left',
      render: (t) => <Tag color="blue">{t}</Tag>
    },
    {
      title: '病例编号',
      dataIndex: 'caseNo',
      width: 110,
      render: (d) => d || <span style={{ color: '#ccc' }}>-</span>
    },
    { title: '患者姓名', dataIndex: 'patientName', width: 100 },
    {
      title: '疾病类型',
      dataIndex: 'diseaseType',
      width: 120,
      render: (d) => d || <span style={{ color: '#ccc' }}>-</span>
    },
    { title: '样本类型', dataIndex: 'sampleType', width: 110 },
    {
      title: '采样日期',
      dataIndex: 'collectDate',
      width: 110,
      sorter: (a, b) => dayjs(a.collectDate).unix() - dayjs(b.collectDate).unix()
    },
    { title: '采样人', dataIndex: 'collector', width: 90 },
    {
      title: '送检日期',
      dataIndex: 'sendDate',
      width: 110,
      render: (d) => d || <span style={{ color: '#ccc' }}>-</span>
    },
    {
      title: '检测机构',
      dataIndex: 'labName',
      width: 170,
      render: (d) => d || <span style={{ color: '#ccc' }}>-</span>
    },
    {
      title: '检测结果',
      dataIndex: 'result',
      width: 100,
      render: (r) => r ? (
        <Tag color={resultMap[r].color} style={{ fontWeight: 600 }}>
          {r}
        </Tag>
      ) : <Tag>待检测</Tag>
    },
    {
      title: '流转状态',
      dataIndex: 'status',
      width: 110,
      render: (s) => {
        const cfg = statusMap[s];
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {s}
          </Tag>
        );
      }
    },
    {
      title: '流转进度',
      key: 'progress',
      width: 160,
      render: (_, record) => {
        const pct = ((statusMap[record.status].step + 1) / 4) * 100;
        return (
          <Progress
            percent={pct}
            size="small"
            showInfo={false}
            strokeColor={record.status === '已出结果' ? '#52c41a' : '#1677ff'}
          />
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
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
              详情
            </Button>
          </Tooltip>
          <Tooltip title={record.status === '已出结果' ? '查看/编辑' : '继续流转'}>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            >
              {record.status === '已出结果' ? '编辑' : '流转'}
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ];

  const stats = {
    total: data.length,
    collected: data.filter(s => s.status === '已采样').length,
    sent: data.filter(s => s.status === '已送检').length,
    received: data.filter(s => s.status === '已接收').length,
    done: data.filter(s => s.status === '已出结果').length,
    positive: data.filter(s => s.result === '阳性').length
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            {!isEditMode && (
              <Alert
                message="提示"
                description="可从已有病例中选择患者，自动带出姓名、病例编号和疾病类型。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            {!isEditMode && (
              <Form.Item
                label="关联病例"
                name="selectedPatientId"
              >
                <Select
                  placeholder="从已有病例中选择患者（可选）"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={patients.map(p => ({
                    label: `${p.name} - ${p.caseNo} - ${p.diseaseType}`,
                    value: p.id,
                    patient: p
                  }))}
                  onChange={(value, option) => {
                    if (value && option?.patient) {
                      const p = option.patient as Patient;
                      form.setFieldsValue({
                        patientId: p.id,
                        patientName: p.name,
                        caseNo: p.caseNo,
                        diseaseType: p.diseaseType
                      });
                    } else {
                      form.setFieldsValue({
                        patientId: undefined,
                        caseNo: undefined,
                        diseaseType: undefined
                      });
                    }
                  }}
                />
              </Form.Item>
            )}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="患者姓名"
                  name="patientName"
                  rules={[{ required: true, message: '请输入患者姓名' }]}
                >
                  <Input placeholder="请输入患者姓名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="疾病类型"
                  name="diseaseType"
                >
                  <Input placeholder="自动带出或手动输入" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="样本类型"
                  name="sampleType"
                  rules={[{ required: true, message: '请选择样本类型' }]}
                >
                  <Select
                    placeholder="请选择样本类型"
                    options={SAMPLE_TYPES.map(s => ({ label: s, value: s }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="病例编号"
                  name="caseNo"
                >
                  <Input placeholder="自动带出或手动输入" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="采样日期"
                  name="collectDate"
                  rules={[{ required: true, message: '请选择采样日期' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="采样人员"
                  name="collector"
                  rules={[{ required: true, message: '请输入采样人员' }]}
                >
                  <Input placeholder="请输入采样人员姓名" />
                </Form.Item>
              </Col>
            </Row>
          </>
        );
      case 1:
        return (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="送检日期"
                name="sendDate"
                rules={[{ required: true, message: '请选择送检日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="送检人员"
                name="sender"
                rules={[{ required: true, message: '请输入送检人员' }]}
              >
                <Input placeholder="请输入送检人员姓名" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="送检备注" name="sendRemark">
                <TextArea rows={2} placeholder="送检过程中注意事项等..." />
              </Form.Item>
            </Col>
          </Row>
        );
      case 2:
        return (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="接收日期"
                name="receiveDate"
                rules={[{ required: true, message: '请选择接收日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="接收人员"
                name="receiver"
                rules={[{ required: true, message: '请输入接收人员' }]}
              >
                <Input placeholder="请输入实验室接收人员姓名" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="检测机构"
                name="labName"
                rules={[{ required: true, message: '请选择检测机构' }]}
              >
                <Select
                  placeholder="请选择检测机构"
                  options={LAB_NAMES.map(l => ({ label: l, value: l }))}
                />
              </Form.Item>
            </Col>
          </Row>
        );
      case 3:
        return (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="检测结果日期"
                name="resultDate"
                rules={[{ required: true, message: '请选择结果日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="检测结果"
                name="result"
                rules={[{ required: true, message: '请选择检测结果' }]}
              >
                <Radio.Group>
                  <Radio.Button value="阴性" style={{ color: '#52c41a', borderColor: '#52c41a' }}>
                    阴性
                  </Radio.Button>
                  <Radio.Button value="阳性" style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}>
                    阳性
                  </Radio.Button>
                  <Radio.Button value="待检测">待检测</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="检测结果说明" name="resultRemark">
                <TextArea
                  rows={3}
                  placeholder="详细检测结果描述、Ct值等信息..."
                />
              </Form.Item>
            </Col>
          </Row>
        );
      default:
        return null;
    }
  };

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="样本总数"
              value={stats.total}
              prefix={<ExperimentOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="已采样"
              value={stats.collected}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="已送检"
              value={stats.sent}
              prefix={<SendOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="已接收"
              value={stats.received}
              prefix={<InboxOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="已出结果"
              value={stats.done}
              prefix={<FileDoneOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="阳性样本"
              value={stats.positive}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="page-card" style={{ padding: 20 }}>
        <div className="page-header">
          <div className="page-title">样本流转</div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAddModal}
            size="large"
          >
            登记采样
          </Button>
        </div>

        <Form form={searchForm} layout="inline" className="toolbar" onFinish={handleSearch}>
          <Form.Item name="keyword">
            <Input
              placeholder="搜索样本编号/患者姓名"
              prefix={<SearchOutlined />}
              style={{ width: 220 }}
              allowClear
            />
          </Form.Item>
          <Form.Item name="sampleType">
            <Select
              placeholder="样本类型"
              style={{ width: 140 }}
              allowClear
              options={SAMPLE_TYPES.map(s => ({ label: s, value: s }))}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="流转状态"
              style={{ width: 130 }}
              allowClear
              options={STATUS_FLOW.map(s => ({ label: s, value: s }))}
            />
          </Form.Item>
          <Form.Item name="result">
            <Select
              placeholder="检测结果"
              style={{ width: 120 }}
              allowClear
              options={[
                { label: '全部', value: '全部' },
                { label: '阳性', value: '阳性' },
                { label: '阴性', value: '阴性' },
                { label: '待检测', value: '待检测' }
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
          scroll={{ x: 1500 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSize: 10
          }}
        />
      </div>

      <Modal
        title={isEditMode ? (editRecord?.status === '已出结果' ? '编辑样本信息' : '样本流转登记') : '样本采样登记'}
        open={modalVisible}
        width={720}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText={currentStep < 3 && isEditMode ? '保存并继续' : '保存'}
        cancelText="取消"
        footer={(_, { OkBtn, CancelBtn }) => (
          <Space>
            {currentStep > 0 && isEditMode && (
              <Button onClick={handlePrevStep}>上一步</Button>
            )}
            {currentStep < 3 && isEditMode && (
              <Button type="primary" onClick={handleNextStep}>
                下一步
              </Button>
            )}
            <CancelBtn />
            <OkBtn />
          </Space>
        )}
      >
        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: 24 }}
          items={[
            { title: '采样', icon: <TeamOutlined /> },
            { title: '送检', icon: <SendOutlined /> },
            { title: '接收', icon: <InboxOutlined /> },
            { title: '结果', icon: <FileDoneOutlined /> }
          ]}
        />

        {editRecord && (
          <Alert
            message={`样本编号: ${editRecord.sampleNo} | 患者: ${editRecord.patientName}`}
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        <Form form={form} layout="vertical">
          {renderStepContent()}
        </Form>
      </Modal>

      <Modal
        title="样本流转详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>关闭</Button>,
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setDetailVisible(false);
              openEditModal(viewRecord!);
            }}
          >
            {viewRecord?.status === '已出结果' ? '编辑信息' : '继续流转'}
          </Button>
        ]}
      >
        {viewRecord && (
          <div>
            <Steps
              size="small"
              current={statusMap[viewRecord.status].step}
              style={{ marginBottom: 24 }}
              items={[
                {
                  title: '已采样',
                  description: `${viewRecord.collectDate} ${viewRecord.collector}`,
                  icon: <TeamOutlined />
                },
                {
                  title: '已送检',
                  description: viewRecord.sendDate ?
                    `${viewRecord.sendDate} ${viewRecord.sender}` : '-',
                  icon: <SendOutlined />
                },
                {
                  title: '已接收',
                  description: viewRecord.receiveDate ?
                    `${viewRecord.receiveDate} ${viewRecord.receiver} | ${viewRecord.labName}` : '-',
                  icon: <InboxOutlined />
                },
                {
                  title: '已出结果',
                  description: viewRecord.result ?
                    `${viewRecord.resultDate} ${viewRecord.result}` : '-',
                  icon: <FileDoneOutlined />,
                  status: viewRecord.result === '阳性' ? 'error' : undefined
                }
              ]}
            />

            <Descriptions title="样本信息" bordered column={2} size="small">
              <Descriptions.Item label="样本编号">
                <Tag color="blue">{viewRecord.sampleNo}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Tag color={statusMap[viewRecord.status].color}>
                  {statusMap[viewRecord.status].icon} {viewRecord.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="患者姓名">{viewRecord.patientName}</Descriptions.Item>
              <Descriptions.Item label="病例编号">{viewRecord.caseNo || '-'}</Descriptions.Item>
              <Descriptions.Item label="疾病类型">{viewRecord.diseaseType || '-'}</Descriptions.Item>
              <Descriptions.Item label="样本类型">{viewRecord.sampleType}</Descriptions.Item>
            </Descriptions>

            <Divider plain orientation="left">流转时间线</Divider>
            <Timeline
              items={[
                {
                  color: 'blue',
                  children: (
                    <div>
                      <strong>样本采集完成</strong>
                      <div style={{ color: '#666', fontSize: 12 }}>
                        时间: {viewRecord.collectDate} | 采样人: {viewRecord.collector}
                      </div>
                    </div>
                  )
                },
                ...(viewRecord.sendDate ? [{
                  color: 'purple',
                  children: (
                    <div>
                      <strong>样本已送检</strong>
                      <div style={{ color: '#666', fontSize: 12 }}>
                        时间: {viewRecord.sendDate} | 送检人: {viewRecord.sender}
                      </div>
                    </div>
                  )
                }] : []),
                ...(viewRecord.receiveDate ? [{
                  color: 'cyan',
                  children: (
                    <div>
                      <strong>实验室已接收</strong>
                      <div style={{ color: '#666', fontSize: 12 }}>
                        时间: {viewRecord.receiveDate} | 接收人: {viewRecord.receiver}
                      </div>
                      <div style={{ color: '#666', fontSize: 12 }}>
                        检测机构: {viewRecord.labName}
                      </div>
                    </div>
                  )
                }] : []),
                ...(viewRecord.result ? [{
                  color: viewRecord.result === '阳性' ? 'red' : 'green',
                  children: (
                    <div>
                      <strong>检测结果已出: <Tag color={resultMap[viewRecord.result!].color}>
                        {viewRecord.result}
                      </Tag></strong>
                      <div style={{ color: '#666', fontSize: 12 }}>
                        时间: {viewRecord.resultDate}
                      </div>
                      {viewRecord.resultRemark && (
                        <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                          {viewRecord.resultRemark}
                        </div>
                      )}
                    </div>
                  )
                }] : [])
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SampleModule;
