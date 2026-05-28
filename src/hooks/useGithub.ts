import { useState, useCallback } from "react";
import { BACKEND_URL } from "@/lib/constant";
import { Repository } from "@/types";
import useAuth from "./useAuth";

const useGitHub = () => {
  // Call useAuth at the top level — never inside callbacks (Rules of Hooks)
  const { user } = useAuth();

  const [repos, setRepos] = useState<Repository[]>([]);
  const [repoFiles, setRepoFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepositories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/github/repos`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch repositories");
      const repo = await response.json();
      setRepos(repo);
      const repoNameList = repo.map((r: Repository) => r.name);
      localStorage.setItem("repos", JSON.stringify(repoNameList));
    } catch (err: any) {
      setError(err.message || "Failed to fetch repositories");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRepositoryContents = useCallback(async (repo: string) => {
    const owner = user?.username;
    if (!owner) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/github/repo/${owner}/${repo}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch repository contents");
      const files = await response.json();
      setRepoFiles(files);
    } catch (err: any) {
      setError(err.message || "Failed to fetch repository contents");
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    repos,
    repoFiles,
    loading,
    error,
    fetchRepositories,
    fetchRepositoryContents,
  };
};

export default useGitHub;
