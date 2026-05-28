import { LeftSection } from "@/components/auth/LeftSection";
import RightSection from "@/components/auth/RightSection";
import LoadingScreen from "@/components/shared/Loading";
import ThemeToggleButton from "@/components/shared/ThemeToggleButton";
import useAuth from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const Auth = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  console.log(user);
  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="h-screen w-full flex flex-col md:flex-row">
      <ThemeToggleButton />
      <LeftSection />
      <RightSection />
    </div>
  );
};

export default Auth;
