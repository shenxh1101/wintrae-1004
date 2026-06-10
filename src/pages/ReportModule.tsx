import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Row, Col, DatePicker, Select, Button, Space, Table, Tag,
  Statistic, Tabs, message, Divider, Radio, Form, Progress,
  List, Tooltip
} from 'antd';
import {
  BarChartOutlined, LineChartOutlined, PieChartOutlined,
  DownloadOutlined, FileExcelOutlined, WarningOutlined,
  FileTextOutlined, TeamOutlined, SwapOutlined, BankOutlined,
  ArrowUpOutlined, ArrowDownOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExportOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import type { AbnormalItem } from '@/types';
import { storage } from '@/store';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const DISEASE_TYPES = [
  '全部', '新型冠状病毒感染', '流行性感冒', '手足口病', '病毒性肝炎',
  '肺结核', '狂犬病', '艾滋病', '登革热', '细菌性痢疾', '其他'
];

const ReportModule: React.FC = () => {
  const [form] = Form.useForm();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  const [diseaseType, setDiseaseType] = useState('全部');
  const [abnormalData, setAbnormalData] = useState<AbnormalItem[]>([]);
  const [activeTab, setActiveTab] = useState('trend');

  const patients = storage.getPatients();
  const followUps = storage.getFollowUps();
  const samples = storage.getSamples();
  const places = storage.getPlaces();

  useEffect(() => {
    setAbnormalData(storage.getAbnormals());
  }, []);

  const filterDate = (dateStr: string) => {
    if (!dateStr) return false;
    const d = dayjs(dateStr);
    return d.isAfter(dateRange[0].subtract(1, 'day')) && d.isBefore(dateRange[1].add(1, 'day'));
  };

  const filteredPatients = useMemo(() =>
    patients.filter(p =>
      filterDate(p.reportDate) &&
      (diseaseType === '全部' || p.diseaseType === diseaseType)
    ), [patients, dateRange, diseaseType]);

  const filteredSamples = useMemo(() =>
    samples.filter(s => filterDate(s.collectDate)),
    [samples, dateRange]);

  const filteredPlaces = useMemo(() =>
    places.filter(p => filterDate(p.inspectDate)),
    [places, dateRange]);

  const filteredFollowUps = useMemo(() =>
    followUps.filter(f => filterDate(f.planDate)),
    [followUps, dateRange]);

  const generateTrendData = () => {
    const result: any[] = [];
    const diseases = diseaseType === '全部' ?
      Array.from(new Set(patients.map(p => p.diseaseType))).slice(0, 5) :
      [diseaseType];

    const days = dateRange[1].diff(dateRange[0], 'day') + 1;
    for (let i = 0; i < days; i++) {
      const date = dateRange[0].add(i, 'day');
      const item: any = { date: date.format('MM-DD') };
      diseases.forEach(d => {
        item[d] = filteredPatients.filter(p =>
          dayjs(p.reportDate).format('MM-DD') === date.format('MM-DD') &&
          p.diseaseType === d
        ).length;
      });
      result.push(item);
    }

    return { data: result, diseases };
  };

  const trendOption = () => {
    const { data, diseases } = generateTrendData();
    const colors = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: diseases, top: 0 },
      grid: { left: 40, right: 20, top: 40, bottom: 30 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.date),
        axisLabel: { rotate: 30 }
      },
      yAxis: { type: 'value' },
      series: diseases.map((d, idx) => ({
        name: d,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: colors[idx % colors.length] },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: colors[idx % colors.length] + '40' },
              { offset: 1, color: colors[idx % colors.length] + '05' }
            ]
          }
        },
        data: data.map(x => x[d] || 0)
      }))
    };
  };

  const diseasePieOption = () => {
    const diseaseCount: Record<string, number> = {};
    filteredPatients.forEach(p => {
      diseaseCount[p.diseaseType] = (diseaseCount[p.diseaseType] || 0) + 1;
    });
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', left: 10, top: 20 },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%' },
        data: Object.entries(diseaseCount).map(([name, value]) => ({ name, value }))
      }]
    };
  };

  const ageBarOption = () => {
    const ranges = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70+'];
    const counts = ranges.map(r => {
      const [min, max] = r.split('-').map(Number);
      if (r === '70+') {
        return filteredPatients.filter(p => p.age >= 70).length;
      }
      return filteredPatients.filter(p => p.age >= min && p.age <= max).length;
    });
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: 'category',
        data: ranges.map(r => r + '岁'),
        axisLabel: { interval: 0 }
      },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: counts,
        barMaxWidth: 40,
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#83bff6' },
              { offset: 1, color: '#1677ff' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: { show: true, position: 'top' }
      }]
    };
  };

  const sampleStatusOption = () => {
    const statuses = ['已采样', '已送检', '已接收', '已出结果'];
    const counts = statuses.map(s =>
      filteredSamples.filter(sa => sa.status === s).length
    );
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 60, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: statuses
      },
      series: [{
        type: 'bar',
        data: counts,
        barMaxWidth: 30,
        itemStyle: {
          color: (params: any) => ['#1890ff', '#722ed1', '#13c2c2', '#52c41a'][params.dataIndex],
          borderRadius: [0, 4, 4, 0]
        },
        label: { show: true, position: 'right' }
      }]
    };
  };

  const placeTypeOption = () => {
    const types = ['学校', '市场', '养老机构', '其他'];
    const counts = types.map(t =>
      filteredPlaces.filter(p => p.placeType === t).length
    );
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: '60%',
        center: ['50%', '45%'],
        data: types.map((name, i) => ({
          name, value: counts[i]
        })),
        itemStyle: {
          color: (params: any) => ['#1890ff', '#fa8c16', '#52c41a', '#8c8c8c'][params.dataIndex]
        },
        label: { formatter: '{b}\n{c}个 ({d}%)' }
      }]
    };
  };

  const abnormalColumns: ColumnsType<AbnormalItem> = [
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (t) => <Tag color="blue">{t}</Tag>
    },
    { title: '对象名称', dataIndex: 'name', width: 150, render: (t) => <strong>{t}</strong> },
    {
      title: '异常原因',
      dataIndex: 'reason',
      ellipsis: true
    },
    { title: '发现日期', dataIndex: 'date', width: 110 },
    {
      title: '风险等级',
      dataIndex: 'level',
      width: 100,
      render: (l) => (
        <Tag
          color={l === '高' ? 'error' : l === '中' ? 'warning' : 'default'}
          icon={<WarningOutlined />}
        >
          {l}风险
        </Tag>
      )
    },
    {
      title: '处理状态',
      dataIndex: 'status',
      width: 100,
      render: (s) => (
        <Tag
          color={s === '已处理' ? 'success' : s === '处理中' ? 'processing' : 'warning'}
          icon={
            s === '已处理' ? <CheckCircleOutlined /> :
            s === '处理中' ? <ClockCircleOutlined /> : <WarningOutlined />
          }
        >
          {s}
        </Tag>
      )
    },
    { title: '处理人', dataIndex: 'handler', width: 100, render: (h) => h || '-' }
  ];

  const stats = {
    caseTotal: filteredPatients.length,
    casePositive: filteredSamples.filter(s => s.result === '阳性').length,
    followUpRate: filteredFollowUps.length > 0 ?
      Math.round((filteredFollowUps.filter(f => f.status === '已完成').length /
        filteredFollowUps.length) * 100) : 0,
    placeNormalRate: filteredPlaces.length > 0 ?
      Math.round((filteredPlaces.filter(p => p.status === '正常').length /
        filteredPlaces.length) * 100) : 0,
    sampleTotal: filteredSamples.length,
    pendingAbnormal: abnormalData.filter(a => a.status !== '已处理').length
  };

  const handleExportExcel = (type: string) => {
    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'patients':
        data = filteredPatients.map(p => ({
          '病例编号': p.caseNo,
          '姓名': p.name,
          '性别': p.gender,
          '年龄': p.age,
          '身份证号': p.idCard,
          '联系电话': p.phone,
          '现住址': p.address,
          '疾病类型': p.diseaseType,
          '发病日期': p.onsetDate,
          '报告日期': p.reportDate,
          '症状': p.symptoms.join('、'),
          '状态': p.status,
          '登记时间': p.createdAt
        }));
        filename = `病例登记报表_${dayjs().format('YYYYMMDD')}.xlsx`;
        break;
      case 'samples':
        data = filteredSamples.map(s => ({
          '样本编号': s.sampleNo,
          '患者姓名': s.patientName,
          '样本类型': s.sampleType,
          '采样日期': s.collectDate,
          '采样人': s.collector,
          '送检日期': s.sendDate || '',
          '送检人': s.sender || '',
          '接收日期': s.receiveDate || '',
          '接收人': s.receiver || '',
          '检测机构': s.labName || '',
          '检测结果': s.result || '',
          '结果日期': s.resultDate || '',
          '状态': s.status
        }));
        filename = `样本流转报表_${dayjs().format('YYYYMMDD')}.xlsx`;
        break;
      case 'abnormals':
        data = abnormalData.map(a => ({
          '类型': a.type,
          '对象名称': a.name,
          '异常原因': a.reason,
          '发现日期': a.date,
          '风险等级': a.level,
          '处理状态': a.status,
          '处理人': a.handler || ''
        }));
        filename = `异常清单_${dayjs().format('YYYYMMDD')}.xlsx`;
        break;
      case 'places':
        data = filteredPlaces.map(p => ({
          '场所名称': p.placeName,
          '场所类型': p.placeType,
          '地址': p.address,
          '联系人': p.contactPerson,
          '联系电话': p.contactPhone,
          '巡查日期': p.inspectDate,
          '巡查人员': p.inspector,
          '合格项数': p.items.filter(i => i.result === '合格').length,
          '不合格项数': p.items.filter(i => i.result === '不合格').length,
          '发现问题': p.issues || '',
          '整改要求': p.rectification || '',
          '状态': p.status
        }));
        filename = `重点场所巡查报表_${dayjs().format('YYYYMMDD')}.xlsx`;
        break;
    }

    if (data.length === 0) {
      message.warning('当前筛选条件下无数据可导出');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, filename);
    message.success(`成功导出 ${data.length} 条数据到 ${filename}`);
  };

  return (
    <div className="page-container">
      <div className="page-card" style={{ padding: 20, marginBottom: 20 }}>
        <div className="page-header">
          <div className="page-title">
            <BarChartOutlined style={{ color: '#1677ff', marginRight: 8 }} />
            报表中心
          </div>
          <Space wrap>
            <Button icon={<ExportOutlined />} onClick={() => handleExportExcel('patients')}>
              导出病例报表
            </Button>
            <Button icon={<ExportOutlined />} onClick={() => handleExportExcel('samples')}>
              导出样本报表
            </Button>
            <Button icon={<ExportOutlined />} onClick={() => handleExportExcel('places')}>
              导出场所报表
            </Button>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={() => handleExportExcel('abnormals')}
            >
              导出异常清单
            </Button>
          </Space>
        </div>

        <Form form={form} layout="inline">
          <Form.Item label="时间范围">
            <RangePicker
              value={dateRange}
              onChange={(val: any) => val && setDateRange(val)}
              style={{ width: 260 }}
            />
          </Form.Item>
          <Form.Item label="疾病类型">
            <Select
              value={diseaseType}
              onChange={setDiseaseType}
              style={{ width: 180 }}
              options={DISEASE_TYPES.map(d => ({ label: d, value: d }))}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Radio.Group value="day" size="small" buttonStyle="solid">
                <Radio.Button value="day">按日</Radio.Button>
                <Radio.Button value="week">按周</Radio.Button>
                <Radio.Button value="month">按月</Radio.Button>
              </Radio.Group>
              <Button type="primary">生成报表</Button>
            </Space>
          </Form.Item>
        </Form>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="新增病例数"
              value={stats.caseTotal}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1677ff' }}
              suffix={<ArrowUpOutlined style={{ fontSize: 12, color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="阳性样本数"
              value={stats.casePositive}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="样本检测数"
              value={stats.sampleTotal}
              prefix={<SwapOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="随访完成率"
              value={stats.followUpRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress percent={stats.followUpRate} size="small" showInfo={false} style={{ marginTop: 8 }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="场所合格率"
              value={stats.placeNormalRate}
              suffix="%"
              prefix={<BankOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
            <Progress percent={stats.placeNormalRate} size="small" showInfo={false}
              strokeColor="#13c2c2" style={{ marginTop: 8 }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="待处理异常"
              value={stats.pendingAbnormal}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="page-card" style={{ padding: 20 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'trend',
              label: <span><LineChartOutlined /> 趋势分析</span>,
              children: (
                <div>
                  <Row gutter={[16, 16]}>
                    <Col span={16}>
                      <Card
                        title={<Space><LineChartOutlined /> 发病趋势图</Space>}
                        size="small"
                      >
                        <ReactECharts option={trendOption()} style={{ height: 360 }} />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card
                        title={<Space><PieChartOutlined /> 疾病构成比</Space>}
                        size="small"
                      >
                        <ReactECharts option={diseasePieOption()} style={{ height: 360 }} />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card
                        title={<Space><BarChartOutlined /> 年龄分布</Space>}
                        size="small"
                      >
                        <ReactECharts option={ageBarOption()} style={{ height: 300 }} className="small-chart" />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card
                        title={<Space><BarChartOutlined /> 样本流转状态</Space>}
                        size="small"
                      >
                        <ReactECharts option={sampleStatusOption()} style={{ height: 300 }} className="small-chart" />
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            },
            {
              key: 'abnormal',
              label: <span><WarningOutlined /> 异常清单</span>,
              children: (
                <div>
                  <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="高风险"
                          value={abnormalData.filter(a => a.level === '高').length}
                          valueStyle={{ color: '#ff4d4f' }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="中风险"
                          value={abnormalData.filter(a => a.level === '中').length}
                          valueStyle={{ color: '#faad14' }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="低风险"
                          value={abnormalData.filter(a => a.level === '低').length}
                          valueStyle={{ color: '#1677ff' }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="待处理"
                          value={stats.pendingAbnormal}
                          valueStyle={{ color: '#722ed1' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Table
                    columns={abnormalColumns}
                    dataSource={abnormalData}
                    rowKey="id"
                    pagination={{
                      showSizeChanger: true,
                      showTotal: (t) => `共 ${t} 条异常记录`,
                      pageSize: 10
                    }}
                  />

                  <Divider plain orientation="left">待处理异常详情</Divider>
                  <List
                    itemLayout="horizontal"
                    dataSource={abnormalData.filter(a => a.status !== '已处理')}
                    renderItem={(item) => (
                      <List.Item
                        actions={[
                          <Button key="handle" type="link" size="small">
                            立即处理
                          </Button>
                        ]}
                        style={{
                          border: '1px solid #f0f0f0',
                          borderRadius: 6,
                          marginBottom: 12,
                          padding: '12px 16px',
                          background: item.level === '高' ? '#fff1f0' :
                            item.level === '中' ? '#fffbe6' : '#fafafa'
                        }}
                      >
                        <List.Item.Meta
                          avatar={
                            <Tag
                              color={item.level === '高' ? 'error' : item.level === '中' ? 'warning' : 'default'}
                              style={{ padding: '8px 12px', fontSize: 14 }}
                            >
                              {item.level}风险
                            </Tag>
                          }
                          title={
                            <Space>
                              <strong>{item.type}</strong>
                              <span style={{ color: '#1677ff' }}>{item.name}</span>
                              <Tag color="warning">{item.status}</Tag>
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size={4}>
                              <span><WarningOutlined /> {item.reason}</span>
                              <span style={{ color: '#999', fontSize: 12 }}>
                                发现日期: {item.date} {item.handler ? `| 处理人: ${item.handler}` : ''}
                              </span>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>
              )
            },
            {
              key: 'summary',
              label: <span><FileTextOutlined /> 综合汇总</span>,
              children: (
                <div>
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Card
                        title={<Space><TeamOutlined /> 病例数据汇总</Space>}
                        size="small"
                      >
                        <List
                          size="small"
                          dataSource={[
                            { label: '新增病例', value: stats.caseTotal },
                            { label: '待调查', value: filteredPatients.filter(p => p.status === '待调查').length },
                            { label: '调查中', value: filteredPatients.filter(p => p.status === '调查中').length },
                            { label: '已结案', value: filteredPatients.filter(p => p.status === '已结案').length },
                            { label: '男性病例', value: filteredPatients.filter(p => p.gender === '男').length },
                            { label: '女性病例', value: filteredPatients.filter(p => p.gender === '女').length },
                            { label: '平均年龄', value: filteredPatients.length > 0 ?
                              Math.round(filteredPatients.reduce((a, b) => a + b.age, 0) / filteredPatients.length) + '岁' : '-' }
                          ]}
                          renderItem={(item) => (
                            <List.Item>
                              <span style={{ color: '#666' }}>{item.label}</span>
                              <strong style={{ color: '#1677ff' }}>{item.value}</strong>
                            </List.Item>
                          )}
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card
                        title={<Space><BankOutlined /> 场所巡查分布</Space>}
                        size="small"
                      >
                        <ReactECharts option={placeTypeOption()} style={{ height: 300 }} className="small-chart" />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card
                        title={<Space><SwapOutlined /> 样本数据汇总</Space>}
                        size="small"
                      >
                        <List
                          size="small"
                          dataSource={[
                            { label: '样本总数', value: stats.sampleTotal },
                            { label: '已采样', value: filteredSamples.filter(s => s.status === '已采样').length },
                            { label: '已送检', value: filteredSamples.filter(s => s.status === '已送检').length },
                            { label: '已接收', value: filteredSamples.filter(s => s.status === '已接收').length },
                            { label: '已出结果', value: filteredSamples.filter(s => s.status === '已出结果').length },
                            { label: '阳性样本', value: stats.casePositive },
                            { label: '阴性样本', value: filteredSamples.filter(s => s.result === '阴性').length }
                          ]}
                          renderItem={(item) => (
                            <List.Item>
                              <span style={{ color: '#666' }}>{item.label}</span>
                              <strong style={{ color: '#722ed1' }}>{item.value}</strong>
                            </List.Item>
                          )}
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card
                        title={<Space><ClockCircleOutlined /> 随访数据汇总</Space>}
                        size="small"
                      >
                        <List
                          size="small"
                          dataSource={[
                            { label: '随访计划数', value: filteredFollowUps.length },
                            { label: '待随访', value: filteredFollowUps.filter(f => f.status === '待随访').length },
                            { label: '随访中', value: filteredFollowUps.filter(f => f.status === '随访中').length },
                            { label: '已完成', value: filteredFollowUps.filter(f => f.status === '已完成').length },
                            { label: '已失访', value: filteredFollowUps.filter(f => f.status === '已失访').length },
                            { label: '电话随访', value: filteredFollowUps.filter(f => f.followUpType === '电话').length },
                            { label: '接通率', value: filteredFollowUps.filter(f => f.callResult === '接通').length + '/' +
                              filteredFollowUps.filter(f => f.callResult).length }
                          ]}
                          renderItem={(item) => (
                            <List.Item>
                              <span style={{ color: '#666' }}>{item.label}</span>
                              <strong style={{ color: '#52c41a' }}>{item.value}</strong>
                            </List.Item>
                          )}
                        />
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
};

export default ReportModule;
