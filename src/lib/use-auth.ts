import { useEffect, useState } from "react";
import { getCurrentUser, type LocalUser } from "@/lib/api-client";

export function useAuth() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  return { user, loading };
}
