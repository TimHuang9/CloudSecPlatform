# CloudSecPlatform - Cloud Security Assessment Platform

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

CloudSecPlatform is a comprehensive cloud security assessment platform designed to help security teams and DevOps engineers evaluate the security status of cloud environments, identify potential security risks, and provide targeted security recommendations.

<img width="2986" height="1376" alt="image" src="https://github.com/user-attachments/assets/f4b7ffed-3c89-464b-ac1e-2be205aa2982" />
<img width="2978" height="1364" alt="image" src="https://github.com/user-attachments/assets/46ad842b-0f80-4636-83ae-c1b69fda8248" />

<img width="3010" height="1226" alt="image" src="https://github.com/user-attachments/assets/e15680aa-3642-4018-97de-d41bf7e94f54" />



## 🌟 Key Features

### 1. AKSK Utilization and Permission Analysis
- Support for multi-cloud platforms (AWS, Alibaba Cloud, GCP) AKSK credential management
- Automatically analyze credential permissions and identify permission configuration errors
- Provide detailed permission analysis reports
- Based on permission analysis results, display potential privilege escalation paths

### 2. Resource Overview and Region Filtering
- Comprehensive display of various resources in the cloud environment
- Support filtering by region and resource type
- Provide detailed resource information and status monitoring
- Intuitive resource quantity statistics and distribution display

### 3. Topology Mapping
- Automatically generate cloud environment resource topology diagrams
- Visually display dependency relationships between resources
- Support interactive operations such as zooming, dragging, etc.
- Clearly display hierarchical relationships of resources such as VPC and EC2

### 4. Privilege Escalation Path Analysis
- Based on pathfinding.cloud data, display complete privilege escalation paths
- Provide detailed information on 40+ privilege escalation paths
- Visually display the attack chain of privilege escalation paths
- Provide corresponding security recommendations for different permission levels

### 5. APT Attack Playbooks
- Integrate the latest APT cloud attack techniques
- Include attack playbooks for Bitcoin and cryptocurrency
- Provide detailed attack steps and technical explanations
- Support attack simulation functionality to simulate real attack scenarios

## 🛠️ Technology Stack

### Frontend
- React 18+
- Ant Design 5+
- React Flow (topology visualization)
- Redux Toolkit (state management)
- Axios (API requests)
- Vite (build tool)

### Backend
- Go 1.20+
- Gin (Web framework)
- GORM (ORM framework)
- Multi-cloud API integration (AWS SDK, Alibaba Cloud SDK, GCP SDK)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (frontend)
- Go 1.20+ (backend)
- Cloud platform credentials (AWS, Alibaba Cloud, or GCP)

### Installation Steps

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/CloudSecPlatform.git
cd CloudSecPlatform
```

#### 2. Start the backend service
```bash
cd backend
# Install dependencies
go mod tidy
# Start the service
./start.sh  # or go run cmd/server/main.go
```

#### 3. Start the frontend service
```bash
cd frontend
# Install dependencies
npm install
# Start the development server
npm run dev
```

#### 4. Access the platform
Open your browser and visit http://localhost:3000

## 📖 User Guide

### AKSK Utilization
1. Add cloud platform credentials on the "AKSK Utilization" page
2. Click the "Permission Analysis" button, and the system will automatically analyze credential permissions
3. View permission analysis results and potential privilege escalation paths
4. Adjust permission configurations based on recommendations

### Resource Overview
1. Select an added credential on the "Resource Overview" page
2. The system will automatically retrieve and display all resources in the cloud environment
3. Use the left-side region filter and top resource type tags to filter resources
4. Click on resources to view detailed information

### Topology Mapping
1. After selecting a credential on the "Resource Overview" page, click the "Generate Topology" button
2. The system will automatically generate a resource topology diagram of the cloud environment
3. Use mouse wheel to zoom, drag to adjust the view
4. Click on nodes to view resource details

### Privilege Escalation Paths
1. Select a credential on the "Resource Overview" page and obtain permission information
2. Click the "Generate Escalation Paths" button
3. View the system-generated privilege escalation path visualization chart
4. Analyze the risks and attack steps of each privilege escalation path

### APT Attack Playbooks
1. Browse available attack playbooks on the "APT Attack Playbooks" page
2. Click the "Run Simulation" button to simulate the attack process
3. View attack steps and execution results
4. Understand attack technical details and defense measures

## 📁 Project Structure

```
CloudSecPlatform/
├── backend/            # Backend code
│   ├── cmd/server/     # Service entry point
│   ├── internal/       # Internal packages
│   ├── pkg/            # Public packages
│   └── go.mod          # Go module file
├── frontend/           # Frontend code
│   ├── src/            # Source code
│   │   ├── components/  # Components
│   │   ├── pages/       # Pages
│   │   ├── store/       # Redux store
│   │   └── App.jsx      # Application entry point
│   ├── public/          # Static resources
│   ├── index.html       # HTML template
│   └── package.json     # NPM configuration
└── README.md           # Project description
```

## 🔒 Security Considerations

1. **Credential Security**: The platform stores cloud platform credentials, please ensure deployment in a secure environment
2. **Permission Control**: It is recommended to only open platform access to authorized personnel
3. **Data Protection**: The platform processes sensitive cloud environment information, please ensure the security of data transmission and storage
4. **Regular Updates**: Regularly update the platform version to obtain the latest security features and vulnerability fixes

## 🤝 Contribution Guide

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
