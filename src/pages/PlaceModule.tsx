import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, Space, Input, Select, DatePicker, Tag, Modal,
  Form, message, Divider, Descriptions, Card, Row, Col, Statistic,
  Popconfirm, Tooltip, Radio, Checkbox as AntCheckbox
} from 'antd';
import {
  BankOutlined, SearchOutlined, EditOutlined, EyeOutlined,
  PlusOutlined, CheckOutlined, CloseOutlined, ExclamationOutlined,
  ScheduleOutlined, TeamOutlined, HomeOutlined, ShopOutlined,
  EnvironmentOutlined, FileTextOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { PlaceInspection, InspectionItem } from '@/types';
import { storage, genId, checkPlaceAbnormal } from '@/store';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const PLACE_TYPES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  '学校': { label: '学校', icon: <TeamOutlined />, color: 'blue' },
  '市场': { label: '市场', icon: <ShopOutlined />, color: 'orange' },
  '养老机构': { label: '养老机构', icon: <HomeOutlined />, color: 'green' },
  '其他': { label: '其他', icon: <BankOutlined />, color: 'default' }
};

const statusMap: Record<string, { color: string; icon: React.ReactNode }> = {
  '正常': { color: 'success', icon: <CheckOutlined /> },
  '待整改': { color: 'warning', icon: <ExclamationOutlined /> },
  '已整改': { color: 'processing', icon: <ScheduleOutlined /> }
};

const SCHOOL_ITEMS = [
  { name: '体温检测设施', standard: '门口配备体温检测设备，运行正常' },
  { name: '健康监测记录', standard: '师生每日健康监测记录完整' },
  { name: '消毒记录', standard: '教室、食堂等场所每日消毒记录完整' },
  { name: '通风情况', standard: '教室每日通风不少于3次' },
  { name: '应急预案', standard: '有完整的突发公共卫生事件应急预案' },
  { name: '防疫物资储备', standard: '口罩、消毒液等物资储备充足' },
  { name: '晨午检制度', standard: '严格执行晨午检制度' },
  { name: '因病缺勤追踪', standard: '因病缺勤学生追踪记录完整' },
  { name: '饮用水卫生', standard: '饮用水符合卫生标准' },
  { name: '食品卫生', standard: '食堂卫生符合食品安全要求' }
];

const MARKET_ITEMS = [
  { name: '环境消毒', standard: '每日对经营区域进行全面消毒' },
  { name: '通风情况', standard: '有良好的通风设施和措施' },
  { name: '从业人员健康证', standard: '所有从业人员持有效健康证' },
  { name: '活禽管理', standard: '如涉及活禽，严格落实"1110"制度' },
  { name: '冷链食品管理', standard: '进口冷链食品溯源清晰' },
  { name: '垃圾处理', standard: '垃圾日产日清，分类规范' },
  { name: '厕所卫生', standard: '公共厕所清洁卫生，配备洗手设施' },
  { name: '卫生知识宣传', standard: '有卫生防病宣传内容' }
];

const NURSING_ITEMS = [
  { name: '老人健康监测', standard: '每日对老人进行体温等健康监测' },
  { name: '医疗保障', standard: '配备基础医疗设备和药品' },
  { name: '医务人员配置', standard: '有专职或兼职医务人员' },
  { name: '消毒隔离', standard: '消毒隔离制度落实到位' },
  { name: '访客管理', standard: '严格访客登记和健康检查制度' },
  { name: '食品安全', standard: '食堂卫生符合标准，营养搭配合理' },
  { name: '应急预案', standard: '有突发公共卫生事件应急预案' },
  { name: '健康档案', standard: '每位老人建立健康档案' },
  { name: '通风采光', standard: '居室通风采光良好' },
  { name: '个人卫生', standard: '老人个人卫生状况良好' }
];

const INSPECTION_ITEMS_MAP: Record<string, typeof SCHOOL_ITEMS> = {
  '学校': SCHOOL_ITEMS,
  '市场': MARKET_ITEMS,
  '养老机构': NURSING_ITEMS,
  '其他': SCHOOL_ITEMS
};

const PlaceModule: React.FC = () => {
  const [data, setData] = useState<PlaceInspection[]>([]);
  const [filteredData, setFilteredData] = useState<PlaceInspection[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<PlaceInspection | null>(null);
  const [viewRecord, setViewRecord] = useState<PlaceInspection | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [placeType, setPlaceType] = useState<string>('学校');
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('全部');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  useEffect(() => {
    const list = storage.getPlaces();
    setData(list);
    setFilteredData(list);
  }, []);

  const handleSearch = (values: any) => {
    let result = [...data];
    if (typeFilter !== '全部') {
      result = result.filter(p => p.placeType === typeFilter);
    }
    if (values.keyword) {
      const kw = values.keyword.toLowerCase();
      result = result.filter(p =>
        p.placeName.toLowerCase().includes(kw) ||
        p.contactPerson.toLowerCase().includes(kw) ||
        p.contactPhone.includes(kw) ||
        p.address.toLowerCase().includes(kw)
      );
    }
    if (values.status) {
      result = result.filter(p => p.status === values.status);
    }
    if (values.dateRange) {
      const [start, end] = values.dateRange;
      result = result.filter(p => {
        const d = dayjs(p.inspectDate);
        return d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'));
      });
    }
    setFilteredData(result);
    setPagination(p => ({ ...p, current: 1 }));
  };

  const handleReset = () => {
    searchForm.resetFields();
    setTypeFilter('全部');
    setFilteredData(data);
    setPagination({ current: 1, pageSize: 10 });
  };

  const initInspectionItems = (type: string) => {
    const items = INSPECTION_ITEMS_MAP[type] || SCHOOL_ITEMS;
    return items.map(i => ({
      id: genId(),
      name: i.name,
      standard: i.standard,
      result: '合格' as const,
      remark: ''
    }));
  };

  const openAddModal = () => {
    setEditRecord(null);
    setPlaceType('学校');
    setInspectionItems(initInspectionItems('学校'));
    form.resetFields();
    form.setFieldsValue({
      placeType: '学校',
      inspectDate: dayjs(),
      nextInspectDate: dayjs().add(14, 'day'),
      status: '正常'
    });
    setModalVisible(true);
  };

  const openEditModal = (record: PlaceInspection) => {
    setEditRecord(record);
    setPlaceType(record.placeType);
    setInspectionItems(record.items ? [...record.items] : initInspectionItems(record.placeType));
    form.setFieldsValue({
      ...record,
      inspectDate: dayjs(record.inspectDate),
      nextInspectDate: record.nextInspectDate ? dayjs(record.nextInspectDate) : undefined
    });
    setModalVisible(true);
  };

  const openDetailModal = (record: PlaceInspection) => {
    setViewRecord(record);
    setDetailVisible(true);
  };

  const handlePlaceTypeChange = (type: string) => {
    setPlaceType(type);
    setInspectionItems(initInspectionItems(type));
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      const passCount = inspectionItems.filter(i => i.result === '合格').length;
      const totalCount = inspectionItems.length;
      const passRate = passCount / totalCount;

      let computedStatus: PlaceInspection['status'] = '正常';
      if (values.status) {
        computedStatus = values.status;
      } else if (passRate < 0.8 || inspectionItems.some(i => i.result === '不合格')) {
        computedStatus = '待整改';
      }

      const newRecord: PlaceInspection = {
        ...values,
        id: editRecord?.id || genId(),
        inspectDate: values.inspectDate.format('YYYY-MM-DD'),
        nextInspectDate: values.nextInspectDate ? values.nextInspectDate.format('YYYY-MM-DD') : undefined,
        items: inspectionItems,
        status: computedStatus
      };

      let updated: PlaceInspection[];
      if (editRecord) {
        updated = data.map(p => p.id === editRecord.id ? newRecord : p);
        message.success('巡查记录修改成功');
      } else {
        updated = [newRecord, ...data];
        message.success('巡查记录添加成功');
      }

      setData(updated);
      setFilteredData(updated);
      storage.savePlaces(updated);

      if (computedStatus === '待整改') {
        const abnormal = checkPlaceAbnormal(newRecord);
        if (abnormal) {
          message.warning(`场所检查发现问题待整改，已自动加入异常清单`);
        }
      }

      setModalVisible(false);
    } catch {
      // 表单验证错误
    }
  };

  const handleDelete = (id: string) => {
    const updated = data.filter(p => p.id !== id);
    setData(updated);
    setFilteredData(updated);
    storage.savePlaces(updated);
    message.success('删除成功');
  };

  const handleItemChange = (id: string, field: 'result' | 'remark', value: any) => {
    setInspectionItems(items =>
      items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const columns: ColumnsType<PlaceInspection> = [
    {
      title: '场所名称',
      dataIndex: 'placeName',
      width: 180,
      fixed: 'left',
      render: (t, r) => (
        <Space>
          <Tag color={PLACE_TYPES[r.placeType].color} icon={PLACE_TYPES[r.placeType].icon}>
            {r.placeType}
          </Tag>
          <strong>{t}</strong>
        </Space>
      )
    },
    {
      title: '地址',
      dataIndex: 'address',
      width: 220,
      ellipsis: true,
      render: (t) => (
        <Space size={4}>
          <EnvironmentOutlined style={{ color: '#999' }} />
          <span>{t}</span>
        </Space>
      )
    },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    { title: '联系电话', dataIndex: 'contactPhone', width: 130 },
    {
      title: '巡查日期',
      dataIndex: 'inspectDate',
      width: 110,
      sorter: (a, b) => dayjs(a.inspectDate).unix() - dayjs(b.inspectDate).unix()
    },
    { title: '巡查人员', dataIndex: 'inspector', width: 100 },
    {
      title: '检查项目',
      key: 'items',
      width: 120,
      render: (_, r) => {
        const pass = r.items.filter(i => i.result === '合格').length;
        const total = r.items.length;
        return `${pass}/${total} 合格`;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s) => {
        const cfg = statusMap[s] || statusMap['正常'];
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {s}
          </Tag>
        );
      }
    },
    {
      title: '下次巡查',
      dataIndex: 'nextInspectDate',
      width: 110,
      render: (d) => d || <span style={{ color: '#ccc' }}>-</span>
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
            title="确定删除该巡查记录吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const stats = useMemo(() => {
    const sourceData = typeFilter === '全部' ? data : filteredData;
    return {
      total: sourceData.length,
      normal: sourceData.filter(p => p.status === '正常').length,
      pending: sourceData.filter(p => p.status === '待整改').length,
      fixed: sourceData.filter(p => p.status === '已整改').length,
      school: data.filter(p => p.placeType === '学校').length,
      market: data.filter(p => p.placeType === '市场').length,
      nursing: data.filter(p => p.placeType === '养老机构').length
    };
  }, [data, filteredData, typeFilter]);

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title={typeFilter === '全部' ? '巡查场所总数' : `${typeFilter}巡查数`}
              value={stats.total}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        {typeFilter === '全部' && (
          <>
            <Col span={4}>
              <Card className="stat-card">
                <Statistic
                  title="学校"
                  value={stats.school}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card className="stat-card">
                <Statistic
                  title="市场"
                  value={stats.market}
                  prefix={<ShopOutlined />}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card className="stat-card">
                <Statistic
                  title="养老机构"
                  value={stats.nursing}
                  prefix={<HomeOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </>
        )}
        {typeFilter !== '全部' && (
          <Col span={4}>
            <Card className="stat-card">
              <Statistic
                title="占全部比例"
                value={data.length > 0 ? Math.round((stats.total / data.length) * 100) : 0}
                suffix="%"
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        )}
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title={typeFilter === '全部' ? '待整改' : `${typeFilter}待整改`}
              value={stats.pending}
              prefix={<ExclamationOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title={typeFilter === '全部' ? '正常' : `${typeFilter}正常`}
              value={stats.normal}
              prefix={<CheckOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="page-card" style={{ padding: 20 }}>
        <div className="page-header">
          <div className="page-title">重点场所巡查</div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAddModal}
            size="large"
          >
            新增巡查
          </Button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Radio.Group
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPagination(p => ({ ...p, current: 1 }));
              handleSearch(searchForm.getFieldsValue());
            }}
            buttonStyle="solid"
          >
            <Radio.Button value="全部">全部 ({stats.total})</Radio.Button>
            <Radio.Button value="学校">学校 ({stats.school})</Radio.Button>
            <Radio.Button value="市场">市场 ({stats.market})</Radio.Button>
            <Radio.Button value="养老机构">养老机构 ({stats.nursing})</Radio.Button>
            <Radio.Button value="其他">其他 ({stats.total - stats.school - stats.market - stats.nursing})</Radio.Button>
          </Radio.Group>
        </div>

        <Form form={searchForm} layout="inline" className="toolbar" onFinish={handleSearch}>
          <Form.Item name="keyword">
            <Input
              placeholder="搜索场所名称/联系人/地址/电话"
              prefix={<SearchOutlined />}
              style={{ width: 260 }}
              allowClear
            />
          </Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="状态筛选"
              style={{ width: 130 }}
              allowClear
              options={[
                { label: '正常', value: '正常' },
                { label: '待整改', value: '待整改' },
                { label: '已整改', value: '已整改' }
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
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize });
            }
          }}
        />
      </div>

      <Modal
        title={editRecord ? '编辑巡查记录' : '新增巡查记录'}
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
          <Divider orientation="left" plain>场所信息</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="场所类型"
                name="placeType"
                rules={[{ required: true, message: '请选择场所类型' }]}
              >
                <Select
                  placeholder="请选择场所类型"
                  options={Object.keys(PLACE_TYPES).map(k => ({
                    label: PLACE_TYPES[k].label, value: k
                  }))}
                  onChange={(val) => {
                    handlePlaceTypeChange(val);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="场所名称"
                name="placeName"
                rules={[{ required: true, message: '请输入场所名称' }]}
              >
                <Input placeholder="请输入场所名称" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="地址"
                name="address"
                rules={[{ required: true, message: '请输入地址' }]}
              >
                <Input placeholder="请输入详细地址" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="联系人"
                name="contactPerson"
                rules={[{ required: true, message: '请输入联系人' }]}
              >
                <Input placeholder="请输入联系人姓名" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="联系电话"
                name="contactPhone"
                rules={[{ required: true, message: '请输入联系电话' }]}
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="巡查人员"
                name="inspector"
                rules={[{ required: true, message: '请输入巡查人员' }]}
              >
                <Input placeholder="请输入巡查人员姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="巡查日期"
                name="inspectDate"
                rules={[{ required: true, message: '请选择巡查日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="下次巡查日期"
                name="nextInspectDate"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>检查项目评定</Divider>
          <div style={{
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            background: '#fafafa'
          }}>
            <Row style={{ fontWeight: 600, paddingBottom: 8, borderBottom: '1px dashed #e8e8e8', marginBottom: 8 }}>
              <Col span={2}>序号</Col>
              <Col span={6}>检查项目</Col>
              <Col span={8}>检查标准</Col>
              <Col span={4}>评定结果</Col>
              <Col span={4}>备注</Col>
            </Row>
            {inspectionItems.map((item, idx) => (
              <Row
                key={item.id}
                align="middle"
                style={{ padding: '8px 0', borderBottom: idx < inspectionItems.length - 1 ? '1px dashed #f0f0f0' : 'none' }}
              >
                <Col span={2}>{idx + 1}</Col>
                <Col span={6}>{item.name}</Col>
                <Col span={8} style={{ color: '#666', fontSize: 13 }}>{item.standard}</Col>
                <Col span={4}>
                  <Radio.Group
                    size="small"
                    value={item.result}
                    onChange={(e) => handleItemChange(item.id, 'result', e.target.value)}
                  >
                    <Radio.Button value="合格" style={{ color: '#52c41a' }}>合格</Radio.Button>
                    <Radio.Button value="不合格" style={{ color: '#ff4d4f' }}>不合格</Radio.Button>
                    <Radio.Button value="不适用">不适用</Radio.Button>
                  </Radio.Group>
                </Col>
                <Col span={4}>
                  <Input
                    size="small"
                    placeholder="备注"
                    value={item.remark}
                    onChange={(e) => handleItemChange(item.id, 'remark', e.target.value)}
                  />
                </Col>
              </Row>
            ))}
            <div style={{ marginTop: 12, padding: 8, textAlign: 'right' }}>
              <Tag color="blue">
                合格: {inspectionItems.filter(i => i.result === '合格').length}
              </Tag>
              <Tag color="red">
                不合格: {inspectionItems.filter(i => i.result === '不合格').length}
              </Tag>
              <Tag color="default">
                不适用: {inspectionItems.filter(i => i.result === '不适用').length}
              </Tag>
            </div>
          </div>

          <Divider orientation="left" plain>问题与整改</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="发现问题" name="issues">
                <TextArea rows={3} placeholder="描述发现的主要问题..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="整改要求" name="rectification">
                <TextArea rows={3} placeholder="明确整改要求和时限..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="综合评定"
            name="status"
            rules={[{ required: true, message: '请选择综合评定' }]}
          >
            <Radio.Group
              options={[
                { label: '正常（通过）', value: '正常' },
                { label: '待整改', value: '待整改' },
                { label: '已整改复查通过', value: '已整改' }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="巡查详情"
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
              openEditModal(viewRecord!);
            }}
          >
            编辑
          </Button>
        ]}
      >
        {viewRecord && (
          <div>
            <Descriptions title="基本信息" bordered column={2} size="small">
              <Descriptions.Item label="场所类型">
                <Tag color={PLACE_TYPES[viewRecord.placeType].color}
                  icon={PLACE_TYPES[viewRecord.placeType].icon}>
                  {viewRecord.placeType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="场所名称">{viewRecord.placeName}</Descriptions.Item>
              <Descriptions.Item label="地址" span={2}>{viewRecord.address}</Descriptions.Item>
              <Descriptions.Item label="联系人">{viewRecord.contactPerson}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{viewRecord.contactPhone}</Descriptions.Item>
              <Descriptions.Item label="巡查日期">{viewRecord.inspectDate}</Descriptions.Item>
              <Descriptions.Item label="巡查人员">{viewRecord.inspector}</Descriptions.Item>
              <Descriptions.Item label="综合评定">
                <Tag color={statusMap[viewRecord.status].color}
                  icon={statusMap[viewRecord.status].icon}>
                  {viewRecord.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="下次巡查日期">
                {viewRecord.nextInspectDate || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider plain orientation="left">检查项目明细</Divider>
            <div style={{
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              padding: 12,
              background: '#fafafa',
              marginBottom: 16
            }}>
              {viewRecord.items.map((item, idx) => (
                <Row
                  key={item.id}
                  align="top"
                  style={{
                    padding: '10px 0',
                    borderBottom: idx < viewRecord.items.length - 1 ? '1px dashed #e8e8e8' : 'none'
                  }}
                >
                  <Col span={2} style={{ color: '#999' }}>{idx + 1}.</Col>
                  <Col span={8}>
                    <strong>{item.name}</strong>
                  </Col>
                  <Col span={8} style={{ color: '#666', fontSize: 13 }}>
                    {item.standard}
                  </Col>
                  <Col span={6}>
                    <Tag
                      color={
                        item.result === '合格' ? 'green' :
                        item.result === '不合格' ? 'red' : 'default'
                      }
                      icon={
                        item.result === '合格' ? <CheckOutlined /> :
                        item.result === '不合格' ? <CloseOutlined /> :
                        <FileTextOutlined />
                      }
                      style={{ fontWeight: 500 }}
                    >
                      {item.result}
                    </Tag>
                    {item.remark && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                        备注: {item.remark}
                      </div>
                    )}
                  </Col>
                </Row>
              ))}
            </div>

            {(viewRecord.issues || viewRecord.rectification) && (
              <>
                <Divider plain orientation="left">问题与整改</Divider>
                {viewRecord.issues && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: '#666', marginBottom: 4 }}>
                      <ExclamationOutlined style={{ color: '#faad14' }} /> 发现问题：
                    </div>
                    <div style={{
                      padding: 12,
                      background: '#fffbe6',
                      border: '1px solid #ffe58f',
                      borderRadius: 4
                    }}>
                      {viewRecord.issues}
                    </div>
                  </div>
                )}
                {viewRecord.rectification && (
                  <div>
                    <div style={{ color: '#666', marginBottom: 4 }}>
                      <ScheduleOutlined style={{ color: '#1677ff' }} /> 整改要求：
                    </div>
                    <div style={{
                      padding: 12,
                      background: '#e6f4ff',
                      border: '1px solid #91caff',
                      borderRadius: 4
                    }}>
                      {viewRecord.rectification}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PlaceModule;
