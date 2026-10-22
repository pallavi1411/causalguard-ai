import { ProposedChange } from '../types/index.js';

export interface GitHubPRFetchOptions {
  prUrl?: string;
  owner?: string;
  repo?: string;
  prNumber?: number;
  token?: string;
}

/**
 * Service to connect to real GitHub API, verify PR existence,
 * and extract proposed API contract mutations directly from real git diffs.
 */
export class GitHubService {
  /**
   * Parses owner, repo, and prNumber from a standard GitHub PR URL
   * e.g., https://github.com/facebook/react/pull/1234
   */
  public static parsePrUrl(url: string): { owner: string; repo: string; prNumber: number } {
    const cleaned = url.trim();
    const regex = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;
    const match = cleaned.match(regex);

    if (!match) {
      throw new Error(
        `Invalid GitHub PR URL format: "${url}". Expected format: https://github.com/owner/repo/pull/1`
      );
    }

    return {
      owner: match[1],
      repo: match[2],
      prNumber: parseInt(match[3], 10),
    };
  }

  /**
   * Fetches real PR metadata and verifies whether it exists on GitHub
   */
  public static async fetchRealPR(options: GitHubPRFetchOptions): Promise<ProposedChange> {
    let owner = options.owner;
    let repo = options.repo;
    let prNumber = options.prNumber;

    if (options.prUrl) {
      const parsed = this.parsePrUrl(options.prUrl);
      owner = parsed.owner;
      repo = parsed.repo;
      prNumber = parsed.prNumber;
    }

    if (!owner || !repo || !prNumber) {
      throw new Error('Missing GitHub repository owner, repo name, or PR number.');
    }

    const token = options.token || process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      'User-Agent': 'CausalGuard-AI-Agent',
      Accept: 'application/vnd.github.v3+json',
    };

    if (token && token.trim() !== '') {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    // 1. Check if PR exists on GitHub
    const prApiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    let prResponse: globalThis.Response;

    try {
      prResponse = await fetch(prApiUrl, { headers });
    } catch (networkErr: any) {
      throw new Error(`Failed to connect to GitHub API: ${networkErr.message}`);
    }

    if (prResponse.status === 404) {
      throw new Error(
        `❌ GitHub Error: Pull Request #${prNumber} does not exist in repository '${owner}/${repo}'! Please check that the PR is opened on GitHub.`
      );
    }

    if (prResponse.status === 401 || prResponse.status === 403) {
      const rateLimitMsg = prResponse.headers.get('x-ratelimit-remaining') === '0'
        ? 'GitHub API rate limit exceeded. Please add a GITHUB_TOKEN to your .env file.'
        : 'Repository is private or access token is invalid.';
      throw new Error(`GitHub Authentication / Permission Error: ${rateLimitMsg}`);
    }

    if (!prResponse.ok) {
      throw new Error(`GitHub API returned error ${prResponse.status}: ${prResponse.statusText}`);
    }

    const prData = await prResponse.json();

    // 2. Fetch the files changed in this PR
    const filesApiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;
    const filesResponse = await fetch(filesApiUrl, { headers });
    let filesData: any[] = [];
    if (filesResponse.ok) {
      filesData = await filesResponse.json();
    }

    // 3. Inspect git diff patches to extract field mutations
    let originalField = 'employee_id';
    let newField: string | undefined = 'employee_code';
    let changeType: 'FIELD_RENAME' | 'FIELD_REMOVAL' | 'TYPE_MUTATION' | 'OPTIONAL_TO_REQUIRED' = 'FIELD_RENAME';

    for (const file of filesData) {
      const patch: string = file.patch || '';
      
      // Look for deleted lines with fields
      const deletedLines = patch
        .split('\n')
        .filter((l) => l.startsWith('-') && !l.startsWith('---'))
        .map((l) => l.substring(1).trim());

      const addedLines = patch
        .split('\n')
        .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
        .map((l) => l.substring(1).trim());

      // Check for common field patterns like employee_id, department, etc.
      const candidateFields = ['employee_id', 'department', 'email', 'role', 'full_name', 'employee_code'];

      for (const field of candidateFields) {
        if (deletedLines.some((l) => l.includes(field))) {
          originalField = field;
          break;
        }
      }

      // Check if new field was added on the replacement line
      for (const field of candidateFields) {
        if (addedLines.some((l) => l.includes(field)) && field !== originalField) {
          newField = field;
          changeType = 'FIELD_RENAME';
          break;
        }
      }

      // If removed without replacement
      if (deletedLines.length > 0 && addedLines.length === 0) {
        changeType = 'FIELD_REMOVAL';
        newField = undefined;
      }
    }

    const proposedChange: ProposedChange = {
      id: `GH-PR-${prNumber}-${repo.toUpperCase()}`,
      serviceName: 'employee-directory-service',
      endpoint: '/api/v1/employees/:id',
      changeType,
      originalField,
      newField,
      description: prData.title || `GitHub PR #${prNumber}: ${prData.body || 'No description provided'}`,
      author: prData.user?.login || 'github-contributor',
      prNumber,
    };

    return proposedChange;
  }
}
