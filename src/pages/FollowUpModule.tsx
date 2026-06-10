import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Input, Select, DatePicker, Tag, Modal,
  Form, message, Divider, Descriptions, Card, Row, Col, Statistic,
  Popconfirm, Tooltip, Radio, Steps, List
} from 'antd';
import {
  PhoneOutlined, SearchOutlined, EditOutlined, EyeOutlined,
  CalendarOutlined, UserOutlined, CheckOutlined, ClockCircleOutlined,
  CloseOutlined, WarningOutlined, TeamOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { FollowUp } from '@/types';
import { storage, genId } from '@/store';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const FOLLOWUP_TYPES = ['电话', '上门', '视频'];
const CALL_RESULTS = ['接通', '未接通', '关机', '空号', '拒接'];
const LOSS_REASONS = [
  '连续3次未接通', '联系电话错误', '已离开本辖区', '拒绝配合',
  '已入院治疗', '其他原因'
];
const HEALTH_STATUSES = [
  '痊愈', '症状好转', '症状稳定', '症状加重', '转院治疗', '死亡', '其他'
];

const statusMap: Record<string, { color: string; icon: React.ReactNode }> = {
  '待随访': { color: 'default', icon: <ClockCircleOutlined /> },
  '随访中': { color: 'processing', icon: <PhoneOutlined /> },
  '已完成': { color: 'success', icon: <CheckOutlined /> },
  '已失访': { color: 'error', icon: <WarningOutlined /> }
};

const typeMap: Record<string, { color: string; icon: React.ReactNode }> = {
  '电话': { color: 'blue', icon: <PhoneOutlined /> },
  '上门': { color: 'green', icon: <UserOutlined /> },
  '视频': { color: 'purple', icon: <CalendarOutlined /> }
};

const FollowUpModule: React.FC = () => {
  const [data, setData] = useState<FollowUp[]>([]);
  const [filteredData, setFilteredData] = useState<FollowUp[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<FollowUp | null>(null);
  const [viewRecord, setViewRecord] = useState<FollowUp | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState<string>('全部');

  useEffect(() => {
    const list = storage.getFollowUps();
    setData(list);
    filterData(list, statusFilter, searchForm.getFieldsValue());
  }, []);

  const filterData = (source: FollowUp[], status: string, filters: any) => {
    let result = [...source];
    if (status !== '全部') {
      result = result.filter(f => f.status === status);
    }
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      result = result.filter(f =>
        f.patientName.toLowerCase().includes(kw) ||
        f.phone.includes(kw)
      );
    }
    if (filters.followUpType) {
      result = result.filter(f => f.followUpType === filters.followUpType);
    }
    if (filters.callResult && filters.callResult !== '全部') {
      result = result.filter(f => f.callResult === filters.callResult);
    }
    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      result = result.filter(f => {
        const d = dayjs(f.planDate);
        return d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'));
      });
    }
    setFilteredData(result);
  };

  const handleSearch = (values: any) => {
    filterData(data, statusFilter, values);
  };

  const handleStatusTabChange = (status: string) => {
    setStatusFilter(status);
    filterData(data, status, searchForm.getFieldsValue());
  };

  const handleReset = () => {
    searchForm.resetFields();
    setStatusFilter('全部');
    setFilteredData(data);
  };

  const openDetail = (record: FollowUp) => {
    setViewRecord(record);
    setDetailVisible(true);
  };

  const openEdit = (record: FollowUp) => {
    setEditRecord(record);
    form.setFieldsValue({
      ...record,
      planDate: record.planDate ? dayjs(record.planDate) : undefined,
      followUpTime: record.followUpTime ? dayjs(record.followUpTime) : dayjs()
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      let newStatus: FollowUp['status'] = '待随访';
      if (values.status === '已完成') {
        newStatus = '已完成';
      } else if (values.status === '已失访') {
        newStatus = '已失访';
      } else if (values.callResult) {
        newStatus = '随访中';
      }

      const newRecord: FollowUp = {
        ...values,
        planDate: values.planDate.format('YYYY-MM-DD'),
        followUpTime: values.followUpTime ? values.followUpTime.format('YYYY-MM-DD HH:mm:ss') : undefined,
        status: newStatus,
        operator: values.operator || '管理员'
      };

      const updated = data.map(f =>
        f.id === editRecord!.id ? { ...f, ...newRecord } : f
      );

      setData(updated);
      filterData(updated, statusFilter, searchForm.getFieldsValue());
      storage.saveFollowUps(updated);
      message.success('随访记录保存成功');
      setModalVisible(false);
    } catch {
      // 表单验证错误
    }
  };

  const handleBatchFollow = () => {
    const pending = filteredData.filter(f => f.status === '待随访');
    if (pending.length === 0) {
      message.info('暂无待随访对象');
      return;
    }
    message.success(`已生成 ${pending.length} 条随访提醒任务`);
  };

  const columns: ColumnsType<FollowUp> = [
    {
      title: '患者姓名',
      dataIndex: 'patientName',
      width: 100,
      fixed: 'left',
      render: (t) => <strong>{t}</strong>
    },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    {
      title: '疾病类型',
      dataIndex: 'diseaseType',
      width: 140,
      ellipsis: true
    },
    {
      title: '随访方式',
      dataIndex: 'followUpType',
      width: 100,
      render: (t) => {
        const cfg = typeMap[t] || typeMap['电话'];
        return <Tag color={cfg.color} icon={cfg.icon}>{t}</Tag>;
      }
    },
    {
      title: '计划随访日期',
      dataIndex: 'planDate',
      width: 120,
      sorter: (a, b) => dayjs(a.planDate).unix() - dayjs(b.planDate).unix()
    },
    {
      title: '通话结果',
      dataIndex: 'callResult',
      width: 100,
      render: (r) => r ? (
        <Tag color={r === '接通' ? 'green' : 'orange'}>{r}</Tag>
      ) : <span style={{ color: '#ccc' }}>-</span>
    },
    {
      title: '健康状况',
      dataIndex: 'healthStatus',
      width: 120,
      render: (h) => h || <span style={{ color: '#ccc' }}>-</span>
    },
    {
      title: '失访原因',
      dataIndex: 'lossReason',
      width: 140,
      ellipsis: true,
      render: (r) => r ? (
        <Tag color="error" icon={<CloseOutlined />}>{r}</Tag>
      ) : <span style={{ color: '#ccc' }}>-</span>
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s) => {
        const cfg = statusMap[s] || statusMap['待随访'];
        return <Tag color={cfg.color} icon={cfg.icon}>{s}</Tag>;
      }
    },
    {
      title: '随访时间',
      dataIndex: 'followUpTime',
      width: 160,
      render: (t) => t || <span style={{ color: '#ccc' }}>-</span>
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openDetail(record)}
            >
              详情
            </Button>
          </Tooltip>
          {(record.status === '待随访' || record.status === '随访中') && (
            <Tooltip title="记录随访">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEdit(record)}
              >
                记录
              </Button>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const stats = {
    total: data.length,
    pending: data.filter(f => f.status === '待随访').length,
    processing: data.filter(f => f.status === '随访中').length,
    done: data.filter(f => f.status === '已完成').length,
    lost: data.filter(f => f.status === '已失访').length
  };

  const currentStatusValue = editRecord?.status === '已完成' ? '已完成' :
    editRecord?.status === '已失访' ? '已失访' : '进行中';

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={5}>
          <Card className="stat-card">
            <Statistic
              title="随访总数"
              value={stats.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="stat-card">
            <Statistic
              title="待随访"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="随访中"
              value={stats.processing}
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="stat-card">
            <Statistic
              title="已完成"
              value={stats.done}
              prefix={<CheckOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="stat-card">
            <Statistic
              title="已失访"
              value={stats.lost}
              prefix={<CloseOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="page-card" style={{ padding: 20 }}>
        <div className="page-header">
          <div className="page-title">随访计划</div>
          <Button
            type="primary"
            icon={<PhoneOutlined />}
            onClick={handleBatchFollow}
            size="large"
          >
            批量随访提醒
          </Button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Radio.Group
            value={statusFilter}
            onChange={(e) => handleStatusTabChange(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="全部">
              全部 ({stats.total})
            </Radio.Button>
            <Radio.Button value="待随访">
              待随访 ({stats.pending})
            </Radio.Button>
            <Radio.Button value="随访中">
              随访中 ({stats.processing})
            </Radio.Button>
            <Radio.Button value="已完成">
              已完成 ({stats.done})
            </Radio.Button>
            <Radio.Button value="已失访">
              已失访 ({stats.lost})
            </Radio.Button>
          </Radio.Group>
        </div>

        <Form form={searchForm} layout="inline" className="toolbar" onFinish={handleSearch}>
          <Form.Item name="keyword">
            <Input
              placeholder="搜索患者姓名/电话"
              prefix={<SearchOutlined />}
              style={{ width: 220 }}
              allowClear
            />
          </Form.Item>
          <Form.Item name="followUpType">
            <Select
              placeholder="随访方式"
              style={{ width: 130 }}
              allowClear
              options={FOLLOWUP_TYPES.map(t => ({ label: t, value: t }))}
            />
          </Form.Item>
          <Form.Item name="callResult">
            <Select
              placeholder="通话结果"
              style={{ width: 130 }}
              allowClear
              defaultValue="全部"
              options={[
                { label: '全部', value: '全部' },
                ...CALL_RESULTS.map(r => ({ label: r, value: r }))
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
        title="随访记录"
        open={modalVisible}
        width={720}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="保存记录"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Descriptions column={2} size="small" bordered style={{ marginBottom: 20 }}>
            <Descriptions.Item label="患者姓名">{editRecord?.patientName}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{editRecord?.phone}</Descriptions.Item>
            <Descriptions.Item label="疾病类型">{editRecord?.diseaseType}</Descriptions.Item>
            <Descriptions.Item label="计划日期">{editRecord?.planDate}</Descriptions.Item>
          </Descriptions>

          <Divider plain orientation="left">随访信息</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="随访方式"
                name="followUpType"
                rules={[{ required: true, message: '请选择随访方式' }]}
              >
                <Radio.Group options={FOLLOWUP_TYPES} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="随访时间"
                name="followUpTime"
                rules={[{ required: true, message: '请选择随访时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="通话结果"
                name="callResult"
                rules={[{ required: true, message: '请选择通话结果' }]}
              >
                <Select options={CALL_RESULTS.map(r => ({ label: r, value: r }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item noStyle shouldUpdate={(prev, cur) => prev.callResult !== cur.callResult}>
                {({ getFieldValue }) => {
                  const result = getFieldValue('callResult');
                  if (result !== '接通') return null;
                  return (
                    <Form.Item
                      label="健康状况"
                      name="healthStatus"
                      rules={[{ required: true, message: '请评估健康状况' }]}
                    >
                      <Select options={HEALTH_STATUSES.map(h => ({ label: h, value: h }))} />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="随访状态"
            name="status"
            rules={[{ required: true, message: '请选择随访状态' }]}
          >
            <Radio.Group
              options={[
                { label: '进行中（继续随访）', value: '进行中' },
                { label: '已完成随访', value: '已完成' },
                { label: '标记为失访', value: '已失访' }
              ]}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.status !== cur.status}>
            {({ getFieldValue }) => {
              if (getFieldValue('status') !== '已失访') return null;
              return (
                <Form.Item
                  label="失访原因"
                  name="lossReason"
                  rules={[{ required: true, message: '请选择失访原因' }]}
                >
                  <Select options={LOSS_REASONS.map(r => ({ label: r, value: r }))} />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item label="随访备注" name="remarks">
            <TextArea rows={3} placeholder="记录随访过程中的特殊情况或注意事项..." />
          </Form.Item>

          <Form.Item label="随访操作人" name="operator" initialValue="管理员">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="随访详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={720}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>关闭</Button>,
          (viewRecord?.status === '待随访' || viewRecord?.status === '随访中') && (
            <Button
              key="edit"
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                setDetailVisible(false);
                openEdit(viewRecord!);
              }}
            >
              记录随访
            </Button>
          )
        ].filter(Boolean) as React.ReactNode[]}
      >
        {viewRecord && (
          <div>
            <Steps
              size="small"
              current={
                viewRecord.status === '已完成' ? 3 :
                viewRecord.status === '已失访' ? 3 :
                viewRecord.status === '随访中' ? 2 : 1
              }
              status={viewRecord.status === '已失访' ? 'error' : undefined}
              items={[
                { title: '创建计划', description: viewRecord.planDate },
                { title: '开始随访', description: viewRecord.followUpTime || '-' },
                {
                  title: viewRecord.status === '已失访' ? '已失访' : '完成随访',
                  description: viewRecord.status === '已失访' ? (viewRecord.lossReason || '-') : (viewRecord.healthStatus || '-')
                }
              ]}
              style={{ marginBottom: 24 }}
            />

            <Descriptions title="患者信息" bordered column={2} size="small">
              <Descriptions.Item label="姓名">{viewRecord.patientName}</Descriptions.Item>
              <Descriptions.Item label="电话">{viewRecord.phone}</Descriptions.Item>
              <Descriptions.Item label="疾病类型" span={2}>
                {viewRecord.diseaseType}
              </Descriptions.Item>
            </Descriptions>

            <Divider plain orientation="left">随访记录</Divider>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="随访方式">
                {viewRecord.followUpType && (
                  <Tag color={typeMap[viewRecord.followUpType].color}>
                    {typeMap[viewRecord.followUpType].icon} {viewRecord.followUpType}
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="随访状态">
                <Tag color={statusMap[viewRecord.status].color}>
                  {statusMap[viewRecord.status].icon} {viewRecord.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="通话结果">{viewRecord.callResult || '-'}</Descriptions.Item>
              <Descriptions.Item label="健康状况">{viewRecord.healthStatus || '-'}</Descriptions.Item>
              <Descriptions.Item label="失访原因" span={2}>
                {viewRecord.lossReason ? (
                  <Tag color="error">{viewRecord.lossReason}</Tag>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="随访时间">{viewRecord.followUpTime || '-'}</Descriptions.Item>
              <Descriptions.Item label="操作人">{viewRecord.operator || '-'}</Descriptions.Item>
            </Descriptions>

            {viewRecord.remarks && (
              <>
                <Divider plain orientation="left">随访备注</Divider>
                <div style={{ padding: 12, background: '#fafafa', borderRadius: 4 }}>
                  {viewRecord.remarks}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FollowUpModule;
