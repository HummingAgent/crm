// GitHub API helpers for two-way sync

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
}

interface CreateIssueParams {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
}

interface UpdateIssueParams {
  owner: string;
  repo: string;
  issueNumber: number;
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  labels?: string[];
}

// Get GitHub token for a user (from OAuth connection)
export async function getGitHubToken(githubUserId: string, supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from('pd_github_connections')
    .select('access_token')
    .eq('github_user_id', githubUserId)
    .single();
  
  return data?.access_token || null;
}

// Create a GitHub issue
export async function createGitHubIssue(
  token: string,
  params: CreateIssueParams
): Promise<GitHubIssue> {
  const response = await fetch(
    `https://api.github.com/repos/${params.owner}/${params.repo}/issues`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: params.title,
        body: params.body || '',
        labels: params.labels || [],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create GitHub issue: ${response.status} - ${error}`);
  }

  return response.json();
}

// Update a GitHub issue
export async function updateGitHubIssue(
  token: string,
  params: UpdateIssueParams
): Promise<GitHubIssue> {
  const body: Record<string, any> = {};
  if (params.title !== undefined) body.title = params.title;
  if (params.body !== undefined) body.body = params.body;
  if (params.state !== undefined) body.state = params.state;
  if (params.labels !== undefined) body.labels = params.labels;

  const response = await fetch(
    `https://api.github.com/repos/${params.owner}/${params.repo}/issues/${params.issueNumber}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update GitHub issue: ${response.status} - ${error}`);
  }

  return response.json();
}

// Map task status to GitHub state
export function taskStatusToGitHubState(status: string): 'open' | 'closed' {
  return status === 'completed' ? 'closed' : 'open';
}

// Map task type to GitHub labels
export function taskTypeToLabels(type: string): string[] {
  switch (type) {
    case 'bug': return ['bug'];
    case 'feature': return ['enhancement'];
    default: return [];
  }
}
