import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Workflow from "@/components/dashboard/Workflow";
import Report from "@/components/dashboard/Report";
import Repository from "@/components/dashboard/Repository";
import Assets from "@/components/dashboard/Assets";
import PrivateRoute from "@/components/auth/PrivateRoute";
import WorkflowBuilder from "@/pages/WorkflowBuilder";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard/*" element={<Dashboard />}>
          <Route index element={<Workflow />} />
          <Route path="workflow" element={<Workflow />} />
          <Route path="report" element={<Report />} />
          <Route path="assets" element={<Assets />} />
          <Route path="repository" element={<Repository />} />
        </Route>
        <Route path="/workflow/:id" element={<WorkflowBuilder />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default AppRoutes;
