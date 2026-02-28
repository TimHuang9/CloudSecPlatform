import React, { useState } from 'react'
import { Card, Button, Tabs, Typography, Space, Tag, Divider } from 'antd'
import { PlayCircleOutlined, LockOutlined, CloudOutlined, AlertOutlined, FileTextOutlined } from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography
const { TabPane } = Tabs

const APTAttackScenarios = () => {
  const [activeTab, setActiveTab] = useState('overview')

  // APT攻击剧本数据
  const scenarios = [
    {
      id: 1,
      name: 'CloudHopper - 针对云服务的APT攻击',
      description: 'CloudHopper是一种针对云服务的高级持续性威胁攻击，主要目标是通过云服务进行数据窃取和横向移动。',
      target: '云服务提供商、企业云环境',
      techniques: [
        '利用云服务API密钥进行未授权访问',
        '通过云存储服务进行数据渗透',
        '利用云资源进行横向移动',
        '部署持久性后门'
      ],
      severity: '高',
      status: '活跃',
      reference: 'https://www.fireeye.com/blog/threat-research/2017/06/beyond_pawn_storm.html'
    },
    {
      id: 2,
      name: 'APT-Q-35 - 针对AWS环境的攻击',
      description: 'APT-Q-35组织专门针对AWS云环境进行攻击，利用IAM权限配置错误获取访问权限。',
      target: 'AWS云环境',
      techniques: [
        '利用IAM权限配置错误',
        '通过EC2实例进行挖矿',
        '窃取S3存储桶数据',
        '利用Lambda函数进行持久性控制'
      ],
      severity: '高',
      status: '活跃',
      reference: 'https://aws.amazon.com/blogs/security/apt-q-35-cloud-attack-patterns/'
    },
    {
      id: 3,
      name: 'APT-41 - 多云环境攻击',
      description: 'APT-41组织同时针对多个云服务提供商进行攻击，利用供应链漏洞获取初始访问权限。',
      target: 'AWS、Azure、GCP等多云环境',
      techniques: [
        '供应链攻击获取初始访问权限',
        '利用容器漏洞进行横向移动',
        '部署加密货币挖矿程序',
        '窃取云服务凭证'
      ],
      severity: '高',
      status: '活跃',
      reference: 'https://www.crowdstrike.com/blog/apt-41-initial-access-vectors/'
    },
    {
      id: 4,
      name: 'Lazarus Group - 云存储攻击',
      description: 'Lazarus Group针对云存储服务进行攻击，主要目标是金融机构的云存储数据。',
      target: '金融机构云存储',
      techniques: [
        '钓鱼攻击获取云凭证',
        '利用云存储API进行数据窃取',
        '部署勒索软件加密云数据',
        '利用云备份服务进行持久性控制'
      ],
      severity: '高',
      status: '活跃',
      reference: 'https://www.kaspersky.com/blog/lazarus-group-cryptocurrency/41923/'
    },
    {
      id: 5,
      name: 'Turla - 云基础设施攻击',
      description: 'Turla组织针对云基础设施进行攻击，利用云服务的管理界面进行持久性访问。',
      target: '云基础设施',
      techniques: [
        '利用云管理界面漏洞',
        '部署持久性后门',
        '通过云服务进行数据渗透',
        '利用云监控服务隐藏活动'
      ],
      severity: '高',
      status: '活跃',
      reference: 'https://www.cert.gov.ua/article/39571'
    }
  ]



  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ color: '#1a2980', marginBottom: '16px' }}>
          APT攻击剧本
        </Title>
        <Paragraph>
          本页面提供了针对云环境的APT攻击剧本，包括攻击技术、防御策略和演练指南。
          通过了解这些攻击模式，您可以更好地保护您的云环境安全。
        </Paragraph>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        style={{ marginBottom: '32px' }}
        items={[
          {
            key: 'overview',
            label: '攻击概览',
            icon: <AlertOutlined />,
            children: (
              <div>
                <Card 
                  style={{ marginBottom: '24px' }}
                  title="APT攻击特点"
                  bordered={false}
                  className="shadow-card"
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                      <Text strong>高级持续性威胁（APT）</Text> 是一种复杂的网络攻击，通常由组织化的威胁行为者发起，具有以下特点：
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      <Tag color="red">针对性强</Tag>
                      <Tag color="orange">持续时间长</Tag>
                      <Tag color="blue">技术复杂</Tag>
                      <Tag color="purple">多阶段攻击</Tag>
                      <Tag color="green">难以检测</Tag>
                    </div>
                  </Space>
                </Card>

                <Card 
                  style={{ marginBottom: '24px' }}
                  title="云环境APT攻击趋势"
                  bordered={false}
                  className="shadow-card"
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                      <Text strong>2024-2025年云环境APT攻击趋势：</Text>
                    </div>
                    <ul style={{ margin: '12px 0' }}>
                      <li>针对云服务API的攻击增加</li>
                      <li>利用容器和无服务器架构的攻击增多</li>
                      <li>供应链攻击成为主要初始访问途径</li>
                      <li>针对云存储服务的数据窃取活动增加</li>
                      <li>利用云服务进行挖矿和DDoS攻击</li>
                    </ul>
                  </Space>
                </Card>
              </div>
            )
          },
          {
            key: 'scenarios',
            label: '攻击剧本',
            icon: <FileTextOutlined />,
            children: (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                {scenarios.map(scenario => (
                  <Card 
                    key={scenario.id}
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{scenario.name}</span>
                        <Tag color={scenario.severity === '高' ? 'red' : 'orange'}>
                          {scenario.severity}
                        </Tag>
                      </div>
                    }
                    bordered={false}
                    className="shadow-card"
                    actions={[
                      <Button 
                        key="run"
                        type="primary"
                        icon={<PlayCircleOutlined />}
                      >
                        运行演练
                      </Button>
                    ]}
                  >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <Paragraph>{scenario.description}</Paragraph>
                      <div>
                        <Text strong>攻击目标：</Text> {scenario.target}
                      </div>
                      <div>
                        <Text strong>攻击技术：</Text>
                        <ul style={{ margin: '8px 0 0 20px' }}>
                          {scenario.techniques.map((tech, index) => (
                            <li key={index}>{tech}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <Text strong>状态：</Text> 
                        <Tag color={scenario.status === '活跃' ? 'green' : 'gray'}>
                          {scenario.status}
                        </Tag>
                      </div>
                      <div>
                        <Text strong>参考资料：</Text> 
                        <a href={scenario.reference} target="_blank" rel="noopener noreferrer">
                          {scenario.reference}
                        </a>
                      </div>
                    </Space>
                  </Card>
                ))}
              </div>
            )
          }
        ]}
      />
    </div>
  )
}

export default APTAttackScenarios