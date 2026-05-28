import { v4 as uuid } from "uuid";
import { Workflow } from "@/types/workflow";

export interface WorkflowTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  audience: string;
  tools: string[];
  color: string;
  accentColor: string;
  build: (notificationEmail: string) => Omit<Workflow, "id" | "createdAt" | "updatedAt">;
}

function makeNodes(toolTypes: string[], notificationType: string) {
  const SPACING = 160;
  const nodes: any[] = [];
  const edges: any[] = [];

  // Trigger node
  const triggerId = uuid();
  nodes.push({
    id: triggerId,
    type: "trigger",
    position: { x: 250, y: 50 },
    data: {
      dataSource: "Domain",
      sourceUrl: "https://your-website.com",
      frequency: "1 day",
    },
  });

  let prevId = triggerId;
  let y = 50 + SPACING;

  // Tool nodes
  for (const type of toolTypes) {
    const id = uuid();
    nodes.push({ id, type, position: { x: 250, y }, data: {} });
    edges.push({ id: uuid(), source: prevId, target: id, type: "smoothstep", animated: true });
    prevId = id;
    y += SPACING;
  }

  // Notification node
  const notifId = uuid();
  nodes.push({
    id: notifId,
    type: notificationType,
    position: { x: 250, y },
    data: {
      config:
        notificationType === "email"
          ? { email: "" }
          : notificationType === "slack"
          ? { channel: "" }
          : { repo: "" },
    },
  });
  edges.push({ id: uuid(), source: prevId, target: notifId, type: "smoothstep", animated: true });

  return { nodes, edges };
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "basic-website-check",
    name: "Basic Website Check",
    tagline: "Find hidden pages on your website",
    description:
      "Scans your website every day to discover publicly accessible pages and directories. Great as a starting point for any website owner.",
    audience: "Perfect for anyone with a website",
    tools: ["Gobuster"],
    color: "from-blue-500/10 to-blue-600/5",
    accentColor: "blue",
    build: () => {
      const { nodes, edges } = makeNodes(["gobuster"], "email");
      return { name: "Basic Website Check", nodes, edges };
    },
  },
  {
    id: "wordpress-security",
    name: "WordPress Security Scan",
    tagline: "Built specifically for WordPress sites",
    description:
      "Checks your WordPress site for known plugin vulnerabilities, outdated themes, weak passwords, and exposed admin pages. Runs twice a day.",
    audience: "For WordPress website owners",
    tools: ["WPScan", "Gobuster"],
    color: "from-orange-500/10 to-orange-600/5",
    accentColor: "orange",
    build: () => {
      const { nodes, edges } = makeNodes(["wpscan", "gobuster"], "email");
      nodes[0].data.frequency = "12hr";
      return { name: "WordPress Security Scan", nodes, edges };
    },
  },
  {
    id: "full-security-audit",
    name: "Full Security Audit",
    tagline: "Every security check in one workflow",
    description:
      "Runs port scanning, directory discovery, SQL injection testing, and web server analysis all at once. Best for businesses handling customer data.",
    audience: "For businesses that handle sensitive data",
    tools: ["Nmap", "Gobuster", "SQLMap", "Nikto"],
    color: "from-red-500/10 to-red-600/5",
    accentColor: "red",
    build: () => {
      const { nodes, edges } = makeNodes(["nmap", "gobuster", "sqlmap", "nkito"], "email");
      nodes[0].data.frequency = "1 day";
      return { name: "Full Security Audit", nodes, edges };
    },
  },
  {
    id: "port-scanner",
    name: "Open Port Monitor",
    tagline: "See what doors are open on your server",
    description:
      "Scans your server for open ports and running services. An open port you don't know about is a potential entry point for attackers.",
    audience: "For anyone running their own server",
    tools: ["Nmap"],
    color: "from-purple-500/10 to-purple-600/5",
    accentColor: "purple",
    build: () => {
      const { nodes, edges } = makeNodes(["nmap"], "email");
      nodes[0].data.frequency = "12hr";
      return { name: "Open Port Monitor", nodes, edges };
    },
  },
  {
    id: "sql-injection-check",
    name: "SQL Injection Check",
    tagline: "Test if your site is vulnerable to database attacks",
    description:
      "SQL injection is one of the most common ways hackers steal data. This workflow tests your website's forms and URLs for this vulnerability automatically.",
    audience: "For sites with login forms or databases",
    tools: ["SQLMap"],
    color: "from-yellow-500/10 to-yellow-600/5",
    accentColor: "yellow",
    build: () => {
      const { nodes, edges } = makeNodes(["sqlmap"], "email");
      nodes[0].data.frequency = "1 day";
      return { name: "SQL Injection Check", nodes, edges };
    },
  },
  {
    id: "github-code-review",
    name: "GitHub Code Security Review",
    tagline: "Automatically review your code for vulnerabilities",
    description:
      "Connects to your GitHub repository, scans the code for the OWASP Top 10 security vulnerabilities, and generates an architecture diagram. Creates a GitHub Issue with findings.",
    audience: "For developers with a GitHub repository",
    tools: ["OWASP Analysis", "Architecture Diagram"],
    color: "from-green-500/10 to-green-600/5",
    accentColor: "green",
    build: () => {
      const triggerId = uuid();
      const owaspId = uuid();
      const flowId = uuid();
      const issueId = uuid();

      const nodes: any[] = [
        {
          id: triggerId,
          type: "trigger",
          position: { x: 250, y: 50 },
          data: { dataSource: "GitHub", sourceUrl: "https://github.com/your-username/your-repo", frequency: "1 day" },
        },
        { id: owaspId, type: "owasp-vulnerabilities", position: { x: 250, y: 210 }, data: {} },
        { id: flowId, type: "flow-chart", position: { x: 250, y: 370 }, data: {} },
        { id: issueId, type: "github-issue", position: { x: 250, y: 530 }, data: { config: { repo: "" } } },
      ];
      const edges: any[] = [
        { id: uuid(), source: triggerId, target: owaspId, type: "smoothstep", animated: true },
        { id: uuid(), source: owaspId, target: flowId, type: "smoothstep", animated: true },
        { id: uuid(), source: flowId, target: issueId, type: "smoothstep", animated: true },
      ];
      return { name: "GitHub Code Security Review", nodes, edges };
    },
  },
];
