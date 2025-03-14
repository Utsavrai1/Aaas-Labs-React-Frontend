# About the AaaS Labs - Automated Attack and Security Labs

## Inspiration
With the increasing complexity of modern applications, security vulnerabilities in code and deployed websites have become a major concern. Also, the amount of code generated by AI/LLMs has become a tremendous issue leading to a lot of security concerns making the software more prone to cyber attacks. Traditional security testing methods require deep technical expertise, making them inaccessible to non-technical users. This project was inspired by the need for a **real-time, automated security solution** that not only detects vulnerabilities but also **explains, visualizes, and automates security workflows** to help users fix them effectively.

## What We Learned
Through this project, we explored:
- **Common Security Issues:** Covering vulnerabilities from **OWASP Top 10** and **SANS 25**.
- **Code and Deployment Security Scanning:** Using **Nmap, Gobuster, Nkito, SQLMap, and WPScan** for detecting threats.
- **Conversational AI for Security:** Enabling users to **"talk to their code"** and get explanations on vulnerabilities.
- **Automated Security Workflows:** Allowing users to create **custom no-code security workflows** for continuous monitoring.
- **Flowchart-Based Remediation:** Providing **step-by-step visual guides** to help users fix vulnerabilities.
- **GitHub API Integration:** Implementing authentication, repository permissions, and access management.

## How We Built It
This project integrates multiple components to provide a **complete security automation solution**.

### 🔒: **GitHub Authentication & Repo Management**
- Users **sign up using GitHub OAuth** and grant **selective or full repository permissions**.
- For authorized repositories, we **fetch access and refresh tokens** to scan and analyze vulnerabilities in real time.
- Each repository has the **"Talk to Your Code"** feature, where users can interact with their code to identify vulnerabilities and get remediation steps with **AI-generated flowcharts**.

### 🛠️: **No-Code Security Workflows**
Users can create **custom no-code workflows** to automate security scanning for both **code and deployed websites**.

#### ✔️: **Code-Based Workflow**
1. **Trigger Node Setup:** Users configure a **trigger node** by selecting a **repository URL** and setting the **scan frequency**.
2. **Security Scan Nodes:** Users select various security checks:
   - **OWASP Check:** Scans for vulnerabilities in the OWASP Top 10.
   - **SANS AI Check:** Identifies vulnerabilities based on SANS 25 guidelines.
   - **Other Security Nodes:** Additional security checks for **code weaknesses and misconfigurations**.
3. **Flowchart Node:** Generates an **interactive flowchart** explaining security flaws and how to fix them step-by-step.
4. **Report Nodes:** Users can select any/all of the following reporting methods:
   - **Slack Alerts:** Sends vulnerability reports to configured Slack channels.
   - **GitHub Issues:** Automatically creates GitHub issues for detected security threats.
   - **Email Reports:** Sends a detailed report via email.

##### Codebase Workflow FlowChart
![Codebase-Based Workflow](https://res.cloudinary.com/dhpwaeqrc/image/upload/v1741911189/image_2_coeiwq.png)

##### Codebase Workflow UML
![Codebase-Based UML](https://res.cloudinary.com/dhpwaeqrc/image/upload/v1741911479/image_5_vzrlwa.png)

#### 🌍: **Domain-Based Workflow**
1. **Trigger Node Setup:** Users provide a **domain URL** and select the **scan frequency**.
2. **Security Scan Nodes:** Users can select:
   - **Gobuster:** Scans for hidden directories and files.
   - **Nkito:** Checks for misconfigured security settings.
   - **Nmap:** Performs **network vulnerability scanning**.
   - **SQLMap:** Detects **SQL injection vulnerabilities**.
   - **WPScan:** Identifies vulnerabilities in **WordPress deployments**.
3. **Flowchart Node:** Generates a **step-by-step remediation flowchart**.
4. **Report Nodes:** Sends reports via **Slack, GitHub Issues, or Email**.

##### Domain Workflow FlowChart
![Domain Workflow FlowChart](https://res.cloudinary.com/dhpwaeqrc/image/upload/v1741911350/image_4_rdtdk4.png)

##### Domain Workflow UML
![Domain Workflow UML](https://res.cloudinary.com/dhpwaeqrc/image/upload/v1741911479/image_6_pngsdr.png)

### ⌚: **Report History & Regeneration**
- **All reports are stored** for future reference.
- Users can **regenerate any report with a single click** for updated results.

## 🏗️: **Tech Stack**
We used a combination of **backend, frontend, security, and automation tools**:
- **Backend:** Python, Django, Node.js
- **Security Tools:** Nmap, Gobuster, SQLMap, WPScan, OWASP Top 10, SANS 25
- **Frontend:** React, TypeScript, Tailwind CSS, ShadCN
- **No-Code Workflow Engine:** Reactflow
- **APIs & Integrations:** GitHub API

## Challenges We Faced
- **Balancing Real-Time Scanning & Accuracy:** Ensuring fast scans while reducing false positives.
- **Building a Conversational AI for Security:** Making security insights **easy to understand for developers**.
- **Automating No-Code Workflows:** Designing a **flexible and scalable** security automation framework.
- **Generating Actionable Flowcharts:** Ensuring AI-generated **step-by-step remediation guides** are clear and effective. -**Parallel Processing/Turn Around Time:** Reducing the GoBuster Turn Around time from 15 mins to less than 5 mins.


## Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (Latest LTS version recommended)
- [Git](https://git-scm.com/)

### Clone the Repository
```sh
git clone https://github.com/Utsavrai1/Aaas-Labs-React-Frontend.git
cd Aaas-Labs-React-Frontend
```

### Install Dependencies
```sh
npm install
```

### Set Up Environment Variables
Create a `.env` file in the root directory and add the following:
```sh
VITE_BACKEND_URL=<your-nodejs-backend-url>
```

### Project Structure
```
├── .gitignore
├── LICENSE
├── README.md
├── components.json
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── public
│   └── vite.svg
├── src
│   ├── App.tsx
│   ├── assets
│   ├── components
│   ├── hooks
│   ├── lib
│   ├── pages
│   ├── routes
│   ├── types
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

### Run the Project
#### Development Mode
```sh
npm run dev
```
This will start a local development server.

#### Build for Production
```sh
npm run build
```
This will generate the production-ready build in the `dist/` folder.

#### Preview the Production Build
```sh
npm run preview
```

### License
This project is licensed under the terms of the `LICENSE` file included in the repository.

