import { allProjects, content } from '@/lib/content';
import type { RepoFact } from '@/lib/jarvis/brain';

/* JARVIS AI's self-updating knowledge: Nithesh's public GitHub repositories.
 * No approval step, because the source is his own account. Next's data cache
 * keeps the result for six hours across requests and instances. If GitHub is
 * slow or unavailable the chat simply carries on without this block. */

type Repo = {
  name: string;
  description: string | null;
  language: string | null;
  homepage: string | null;
  html_url: string;
  pushed_at: string;
  stargazers_count: number;
  fork: boolean;
  archived: boolean;
};

const REFRESH_SECONDS = 6 * 60 * 60;
const MAX_REPOS = 30;

const username = () => (content.contact.github ?? '').split('/').filter(Boolean).pop() ?? '';

const onPortfolio = (repo: Repo) => {
  const url = repo.html_url.toLowerCase();
  return allProjects.some((p) => p.repo?.toLowerCase() === url);
};

const oneLine = (s: string, max: number) => s.replace(/[<>`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

function repoLine(r: Repo): string {
  const facts = [r.language, `last updated ${r.pushed_at.slice(0, 10)}`, r.stargazers_count > 0 ? `${r.stargazers_count} stars` : null]
    .filter(Boolean)
    .join(', ');
  if (onPortfolio(r)) return `- ${r.name} (${facts}). Covered in the knowledge base.`;
  const about = r.description ? ` ${oneLine(r.description, 160)}` : ' No description on GitHub.';
  const site = r.homepage ? ` Live: ${oneLine(r.homepage, 100)}` : '';
  return `- ${r.name} (${facts}).${about} Code: ${r.html_url}.${site}`;
}

async function fetchRepos(): Promise<Repo[]> {
  const user = username();
  if (!user) return [];
  try {
    const token = process.env.GITHUB_TOKEN;
    const res = await fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=pushed`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'nithesh-portfolio',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: REFRESH_SECONDS },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return [];
    return ((await res.json()) as Repo[]).filter((r) => !r.fork && !r.archived).slice(0, MAX_REPOS);
  } catch {
    return [];
  }
}

/** Facts for the built-in AI and the matching prompt block for Claude. */
export async function githubKnowledge(): Promise<{ repos: RepoFact[]; digest: string }> {
  const repos = await fetchRepos();
  if (repos.length === 0) return { repos: [], digest: '' };
  return {
    repos: repos.map((r) => ({
      name: r.name,
      language: r.language,
      description: r.description ? oneLine(r.description, 200) : null,
      pushed: r.pushed_at.slice(0, 10),
      url: r.html_url,
      onPortfolio: onPortfolio(r),
    })),
    digest: `<github_activity>
Nithesh's public GitHub repositories, read automatically, most recently updated first. These are facts about what exists and when it changed. Prefer the knowledge base wherever both describe the same project.
${repos.map(repoLine).join('\n')}
</github_activity>`,
  };
}
