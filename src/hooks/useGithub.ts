import { useState, useCallback } from "react";
import { BACKEND_URL } from "@/lib/constant";
import { Repository } from "@/types";

const useGitHub = () => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [repoFiles, setRepoFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRepositories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/github/repos`, {
        credentials: "include",
      });
      const repo = await response.json();
      setRepos(repo);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch repositories");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRepositoryContents = useCallback(
    async (owner: string, repo: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/github/repo/${owner}/${repo}`,
          {
            credentials: "include",
          }
        );
        const repoFiles = await response.json();
        setRepoFiles(repoFiles);
      } catch (err: any) {
        setError(
          err.response?.data?.message || "Failed to fetch repository contents"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
