import React, { useState } from 'react'
import { Card, Button, Tabs, Typography, Space, Tag, Divider, Modal, Steps, message, Progress } from 'antd'
import { PlayCircleOutlined, AlertOutlined, FileTextOutlined, LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography
const { TabPane } = Tabs

const APTAttackScenarios = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [演练Modal, set演练Modal] = useState(false)
  const [当前剧本, set当前剧本] = useState(null)
  const [演练步骤, set演练步骤] = useState([])
  const [当前步骤, set当前步骤] = useState(0)
  const [演练进度, set演练进度] = useState(0)
  const [演练状态, set演练状态] = useState('idle') // idle, running, success, failed
  const [演练结果, set演练结果] = useState(null)

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
      reference: 'https://www.fireeye.com/blog/threat-research/2017/06/beyond_pawn_storm.html',
      steps: [
        {
          name: '初始侦察',
          description: '扫描目标云服务API端点，寻找开放的接口和潜在的漏洞',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功扫描到目标云服务API端点' }
          }
        },
        {
          name: 'API密钥获取',
          description: '通过钓鱼攻击或凭证泄露获取云服务API密钥',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功获取云服务API密钥' }
          }
        },
        {
          name: '未授权访问',
          description: '使用获取的API密钥进行未授权访问云服务',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功通过API密钥访问云服务' }
          }
        },
        {
          name: '数据渗透',
          description: '通过云存储服务进行数据渗透和窃取',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2500))
            return { success: true, message: '成功渗透并窃取云存储数据' }
          }
        },
        {
          name: '横向移动',
          description: '利用云资源进行横向移动，扩大攻击范围',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功在云环境中横向移动' }
          }
        },
        {
          name: '后门部署',
          description: '部署持久性后门，确保长期访问权限',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1800))
            return { success: true, message: '成功部署持久性后门' }
          }
        }
      ]
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
      reference: 'https://aws.amazon.com/blogs/security/apt-q-35-cloud-attack-patterns/',
      steps: [
        {
          name: 'IAM权限扫描',
          description: '扫描AWS环境中的IAM权限配置错误',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功扫描到IAM权限配置错误' }
          }
        },
        {
          name: '权限提升',
          description: '利用IAM权限配置错误提升权限',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功提升权限至管理员级别' }
          }
        },
        {
          name: 'EC2实例创建',
          description: '创建EC2实例用于挖矿',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2500))
            return { success: true, message: '成功创建EC2实例' }
          }
        },
        {
          name: '挖矿程序部署',
          description: '在EC2实例上部署加密货币挖矿程序',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功部署挖矿程序' }
          }
        },
        {
          name: 'S3数据窃取',
          description: '窃取S3存储桶中的敏感数据',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1800))
            return { success: true, message: '成功窃取S3存储桶数据' }
          }
        },
        {
          name: 'Lambda后门',
          description: '创建Lambda函数作为持久性后门',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功创建Lambda后门' }
          }
        }
      ]
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
      reference: 'https://www.crowdstrike.com/blog/apt-41-initial-access-vectors/',
      steps: [
        {
          name: '供应链攻击',
          description: '通过供应链漏洞获取初始访问权限',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功通过供应链漏洞获取初始访问权限' }
          }
        },
        {
          name: '凭证窃取',
          description: '窃取云服务凭证',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功窃取云服务凭证' }
          }
        },
        {
          name: '容器环境渗透',
          description: '利用容器漏洞进行渗透',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2500))
            return { success: true, message: '成功渗透容器环境' }
          }
        },
        {
          name: '横向移动',
          description: '在多云环境中横向移动',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功在多云环境中横向移动' }
          }
        },
        {
          name: '挖矿程序部署',
          description: '部署加密货币挖矿程序',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1800))
            return { success: true, message: '成功部署挖矿程序' }
          }
        },
        {
          name: '持久性控制',
          description: '建立持久性控制机制',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功建立持久性控制机制' }
          }
        }
      ]
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
      reference: 'https://www.kaspersky.com/blog/lazarus-group-cryptocurrency/41923/',
      steps: [
        {
          name: '钓鱼攻击',
          description: '发送钓鱼邮件获取云凭证',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1800))
            return { success: true, message: '成功通过钓鱼攻击获取云凭证' }
          }
        },
        {
          name: '云存储访问',
          description: '使用获取的凭证访问云存储',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功访问云存储' }
          }
        },
        {
          name: '数据窃取',
          description: '利用云存储API进行数据窃取',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2500))
            return { success: true, message: '成功窃取云存储数据' }
          }
        },
        {
          name: '勒索软件部署',
          description: '部署勒索软件加密云数据',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功部署勒索软件加密云数据' }
          }
        },
        {
          name: '备份服务利用',
          description: '利用云备份服务进行持久性控制',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1800))
            return { success: true, message: '成功利用云备份服务建立持久性控制' }
          }
        },
        {
          name: '勒索通知',
          description: '发送勒索通知',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功发送勒索通知' }
          }
        }
      ]
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
      reference: 'https://www.cert.gov.ua/article/39571',
      steps: [
        {
          name: '管理界面扫描',
          description: '扫描云管理界面漏洞',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功扫描到云管理界面漏洞' }
          }
        },
        {
          name: '漏洞利用',
          description: '利用云管理界面漏洞获取访问权限',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功利用漏洞获取管理界面访问权限' }
          }
        },
        {
          name: '后门部署',
          description: '部署持久性后门',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1800))
            return { success: true, message: '成功部署持久性后门' }
          }
        },
        {
          name: '数据渗透',
          description: '通过云服务进行数据渗透',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2500))
            return { success: true, message: '成功通过云服务进行数据渗透' }
          }
        },
        {
          name: '监控服务利用',
          description: '利用云监控服务隐藏活动',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功利用云监控服务隐藏攻击活动' }
          }
        },
        {
          name: '长期访问',
          description: '建立长期访问机制',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功建立长期访问机制' }
          }
        }
      ]
    },
    {
      id: 6,
      name: 'Lazarus Group - 比特币交易所攻击',
      description: 'Lazarus Group针对比特币交易所和加密货币平台进行攻击，通过鱼叉式钓鱼和供应链攻击获取访问权限。',
      target: '比特币交易所、加密货币平台',
      techniques: [
        '鱼叉式钓鱼获取交易所凭证',
        '利用交易所API漏洞进行攻击',
        '部署恶意软件窃取私钥',
        '通过交易所热钱包进行资金盗取'
      ],
      severity: '高',
      status: '活跃',
      reference: 'https://www.cisa.gov/uscert/ncas/alerts/aa23-068a',
      steps: [
        {
          name: '目标侦察',
          description: '收集目标交易所的员工信息和技术基础设施',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功收集目标交易所信息' }
          }
        },
        {
          name: '鱼叉式钓鱼',
          description: '发送针对交易所员工的鱼叉式钓鱼邮件',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功通过钓鱼邮件获取员工凭证' }
          }
        },
        {
          name: '初始访问',
          description: '使用获取的凭证访问交易所内部系统',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功访问交易所内部系统' }
          }
        },
        {
          name: '横向移动',
          description: '在交易所网络中横向移动，寻找关键系统',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2500))
            return { success: true, message: '成功在交易所网络中横向移动' }
          }
        },
        {
          name: '私钥窃取',
          description: '部署恶意软件窃取比特币私钥',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功窃取比特币私钥' }
          }
        },
        {
          name: '资金盗取',
          description: '通过获取的私钥从热钱包转移资金',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1800))
            return { success: true, message: '成功从交易所热钱包转移资金' }
          }
        }
      ]
    },
    {
      id: 7,
      name: 'APT-38 - 加密货币挖矿攻击',
      description: 'APT-38组织利用云服务进行大规模比特币挖矿，通过容器漏洞和无服务器架构部署挖矿程序。',
      target: '云服务提供商、企业云环境',
      techniques: [
        '利用容器漏洞获取云资源访问权限',
        '通过无服务器函数部署挖矿程序',
        '利用云存储服务隐藏挖矿程序',
        '使用代理和跳板隐藏攻击来源'
      ],
      severity: '高',
      status: '活跃',
      reference: 'https://www.trendmicro.com/en_us/research/23/e/apt-38-targets-telecoms-and-financials-with-new-phi-info-stealer.html',
      steps: [
        {
          name: '容器环境扫描',
          description: '扫描云环境中的容器漏洞',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功扫描到容器漏洞' }
          }
        },
        {
          name: '漏洞利用',
          description: '利用容器漏洞获取云资源访问权限',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功利用容器漏洞获取访问权限' }
          }
        },
        {
          name: '挖矿程序部署',
          description: '在云资源上部署比特币挖矿程序',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2500))
            return { success: true, message: '成功部署挖矿程序' }
          }
        },
        {
          name: '无服务器函数利用',
          description: '创建无服务器函数作为挖矿控制节点',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功创建无服务器控制节点' }
          }
        },
        {
          name: '挖矿活动隐藏',
          description: '利用云存储服务隐藏挖矿程序和活动',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1800))
            return { success: true, message: '成功隐藏挖矿活动' }
          }
        },
        {
          name: '持续挖矿',
          description: '维持长期挖矿活动，定期转移挖到的比特币',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功建立持续挖矿机制' }
          }
        }
      ]
    },
    {
      id: 8,
      name: 'North Korea APT - DeFi平台攻击',
      description: '朝鲜APT组织针对去中心化金融（DeFi）平台进行攻击，通过智能合约漏洞和前端攻击窃取用户资金。',
      target: 'DeFi平台、智能合约、加密货币用户',
      techniques: [
        '智能合约审计漏洞利用',
        '前端注入攻击窃取私钥',
        '闪电贷攻击操纵价格',
        '利用跨链桥漏洞进行攻击'
      ],
      severity: '高',
      status: '活跃',
      reference: 'https://www.reuters.com/technology/cybersecurity/north-korean-hackers-steal-40m-cryptocurrency-2023-11-08/',
      steps: [
        {
          name: '智能合约分析',
          description: '分析目标DeFi平台的智能合约，寻找漏洞',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功分析智能合约并发现漏洞' }
          }
        },
        {
          name: '前端攻击',
          description: '对DeFi平台前端进行注入攻击，窃取用户私钥',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功通过前端攻击窃取用户私钥' }
          }
        },
        {
          name: '闪电贷攻击',
          description: '利用闪电贷操纵DeFi平台价格，获取利润',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2500))
            return { success: true, message: '成功执行闪电贷攻击' }
          }
        },
        {
          name: '跨链桥攻击',
          description: '利用跨链桥漏洞进行资金窃取',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功利用跨链桥漏洞窃取资金' }
          }
        },
        {
          name: '资金转移',
          description: '将窃取的资金转移到安全地址',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1800))
            return { success: true, message: '成功转移窃取的资金' }
          }
        },
        {
          name: '资金洗白',
          description: '通过混币服务洗白窃取的资金',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功洗白窃取的资金' }
          }
        }
      ]
    },
    {
      id: 9,
      name: 'Cozy Bear - 云挖矿基础设施攻击',
      description: 'Cozy Bear（APT29）针对云挖矿基础设施进行攻击，利用管理界面漏洞获取控制权限。',
      target: '云挖矿平台、加密货币挖矿基础设施',
      techniques: [
        '利用云挖矿管理界面漏洞',
        '部署持久性后门',
        '窃取挖矿收益',
        '利用挖矿基础设施进行其他攻击'
      ],
      severity: '高',
      status: '活跃',
      reference: 'https://www.microsoft.com/en-us/security/blog/2023/05/24/volt-typhoon-targets-us-critical-infrastructure-with-living-off-the-land-techniques/',
      steps: [
        {
          name: '挖矿平台侦察',
          description: '扫描目标云挖矿平台的管理界面',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功扫描到目标挖矿平台' }
          }
        },
        {
          name: '漏洞利用',
          description: '利用管理界面漏洞获取访问权限',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功利用漏洞获取管理权限' }
          }
        },
        {
          name: '后门部署',
          description: '在挖矿平台部署持久性后门',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1800))
            return { success: true, message: '成功部署持久性后门' }
          }
        },
        {
          name: '挖矿配置修改',
          description: '修改挖矿配置，将部分收益重定向到攻击者地址',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2500))
            return { success: true, message: '成功修改挖矿配置' }
          }
        },
        {
          name: '横向移动',
          description: '利用挖矿平台访问权限横向移动到其他系统',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功在挖矿基础设施中横向移动' }
          }
        },
        {
          name: '长期控制',
          description: '建立长期控制机制，持续窃取挖矿收益',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功建立长期控制机制' }
          }
        }
      ]
    },
    {
      id: 10,
      name: 'APT-27 - 加密货币交易所供应链攻击',
      description: 'APT-27组织通过供应链攻击针对加密货币交易所，利用恶意依赖包获取访问权限。',
      target: '加密货币交易所、区块链公司',
      techniques: [
        '恶意依赖包供应链攻击',
        '利用CI/CD管道漏洞',
        '部署信息窃取恶意软件',
        '通过交易所API进行资金转移'
      ],
      severity: '高',
      status: '活跃',
      reference: 'https://www.crowdstrike.com/blog/apt-27-supply-chain-attack-targets-southeast-asia/',
      steps: [
        {
          name: '供应链分析',
          description: '分析目标交易所的依赖包和CI/CD管道',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功分析目标交易所的供应链' }
          }
        },
        {
          name: '恶意依赖包注入',
          description: '创建并发布包含恶意代码的依赖包',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功创建并发布恶意依赖包' }
          }
        },
        {
          name: 'CI/CD漏洞利用',
          description: '利用CI/CD管道漏洞执行恶意代码',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2500))
            return { success: true, message: '成功利用CI/CD漏洞执行恶意代码' }
          }
        },
        {
          name: '凭证窃取',
          description: '窃取交易所API凭证和私钥',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { success: true, message: '成功窃取交易所API凭证和私钥' }
          }
        },
        {
          name: 'API攻击',
          description: '使用获取的API凭证进行资金转移',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1800))
            return { success: true, message: '成功通过API转移资金' }
          }
        },
        {
          name: '痕迹清除',
          description: '清除攻击痕迹，避免被检测',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { success: true, message: '成功清除攻击痕迹' }
          }
        }
      ]
    }
  ]



  // 运行攻击演练
  const 运行演练 = async (剧本) => {
    set当前剧本(剧本)
    set演练步骤(剧本.steps)
    set当前步骤(0)
    set演练进度(0)
    set演练状态('running')
    set演练结果(null)
    set演练Modal(true)

    try {
      for (let i = 0; i < 剧本.steps.length; i++) {
        set当前步骤(i)
        set演练进度(Math.round((i / 剧本.steps.length) * 100))
        
        const 步骤 = 剧本.steps[i]
        const 结果 = await 步骤.execute()
        
        if (!结果.success) {
          set演练状态('failed')
          set演练结果({ step: i, message: 结果.message })
          return
        }
      }
      
      set演练进度(100)
      set演练状态('success')
      set演练结果({ message: '攻击演练成功完成' })
    } catch (error) {
      set演练状态('failed')
      set演练结果({ message: `攻击演练失败: ${error.message}` })
    }
  }

  // 关闭演练模态框
  const 关闭演练Modal = () => {
    set演练Modal(false)
    set当前剧本(null)
    set演练步骤([])
    set当前步骤(0)
    set演练进度(0)
    set演练状态('idle')
    set演练结果(null)
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ color: '#1a2980', marginBottom: '16px' }}>
          APT攻击剧本
        </Title>
        <Paragraph>
          本页面提供了针对云环境的APT攻击剧本，包括攻击技术和演练功能。
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
                        onClick={() => 运行演练(scenario)}
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

      {/* 演练模态框 */}
      <Modal
        title={当前剧本 ? `${当前剧本.name} - 攻击演练` : '攻击演练'}
        open={演练Modal}
        onCancel={关闭演练Modal}
        footer={[
          <Button key="close" onClick={关闭演练Modal}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {当前剧本 && (
          <div>
            <Progress percent={演练进度} status={演练状态 === 'success' ? 'success' : 演练状态 === 'failed' ? 'exception' : 'active'} />
            
            <div style={{ marginTop: '24px' }}>
              <Title level={4}>攻击步骤</Title>
              <Steps current={当前步骤}>{演练步骤.map((step, index) => (
                <Steps.Step 
                  key={index} 
                  title={step.name} 
                  description={step.description}
                  status={index < 当前步骤 ? 'finish' : index === 当前步骤 ? 'process' : 'wait'}
                />
              ))}</Steps>
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <Title level={4}>演练状态</Title>
              {演练状态 === 'running' && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <LoadingOutlined style={{ marginRight: '8px' }} />
                  <Text>正在执行攻击步骤：{当前步骤 + 1}/{演练步骤.length}</Text>
                </div>
              )}
              {演练状态 === 'success' && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleOutlined style={{ marginRight: '8px', color: 'green' }} />
                  <Text>攻击演练成功完成！</Text>
                </div>
              )}
              {演练状态 === 'failed' && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <CloseCircleOutlined style={{ marginRight: '8px', color: 'red' }} />
                  <Text>攻击演练失败：{演练结果?.message}</Text>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default APTAttackScenarios