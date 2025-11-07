import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });
      
      if (res.status === 401) {
        return null;
      }
      
      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }
      
      return await res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch,
  };
}
