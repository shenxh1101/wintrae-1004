import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, message } from 'antd';
import {
  FileAddOutlined,
  PhoneOutlined,
  SwapOutlined,
  BankOutlined,
  BarChartOutlined,
  SafetyOutlined,
  UserOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import CaseModule from './pages/CaseModule';
import FollowUpModule from './pages/FollowUpModule';
import SampleModule from './pages/SampleModule';
import PlaceModule from './pages/PlaceModule';
import ReportModule from './pages/ReportModule';
import { scanAllAbnormals } from './store';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: '/case',
    icon: <FileAddOutlined />,
    label: '病例登记'
  },
  {
    key: '/followup',
    icon: <PhoneOutlined />,
    label: '随访计划'
  },
  {
    key: '/sample',
    icon: <SwapOutlined />,
    label: '样本流转'
  },
  {
    key: '/place',
    icon: <BankOutlined />,
    label: '重点场所'
  },
  {
    key: '/report',
    icon: <BarChartOutlined />,
    label: '报表中心'
  }
];

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const results = scanAllAbnormals();
    if (results.length > 0) {
      message.warning(
        {
          icon: <WarningOutlined />,
          content: `扫描发现 ${results.length} 条异常记录，已自动加入异常清单`,
          duration: 5
        }
      );
    }
  }, []);

  const selectedKey = menuItems.some(item => item.key === location.pathname)
    ? location.pathname
    : '/case';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="app-header">
        <div className="app-logo">
          <SafetyOutlined className="app-logo-icon" />
          <span>公共卫生管理系统</span>
        </div>
        <div className="app-user-info">
          <span>疾控中心 - 监测科</span>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
          <span>管理员</span>
        </div>
      </Header>
      <Layout>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={220}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0, paddingTop: 12 }}
          />
        </Sider>
        <Content>
          <Routes>
            <Route path="/" element={<Navigate to="/case" replace />} />
            <Route path="/case" element={<CaseModule />} />
            <Route path="/followup" element={<FollowUpModule />} />
            <Route path="/sample" element={<SampleModule />} />
            <Route path="/place" element={<PlaceModule />} />
            <Route path="/report" element={<ReportModule />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
