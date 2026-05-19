import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/api-client";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: getCurrentUser() ? "/dashboard" : "/login" });
  }, [navigate]);
  return <div className="min-h-screen bg-background" />;
}
