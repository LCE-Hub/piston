import { Octokit } from '@octokit/rest';

export interface UploadFile {
  path: string;
  content: string;
  isBase64: boolean;
}

export class GitHubAPI {
  private octokit: Octokit;
  username: string = "";

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async init() {
    const { data } = await this.octokit.rest.users.getAuthenticated();
    this.username = data.login;
  }

  async forkAndPR(modId: string, files: UploadFile[], prTitle: string, prBody: string): Promise<string> {
    const upstreamOwner = 'LCE-Hub';
    const upstreamRepo = 'LCE-Workshop';
    await this.octokit.rest.repos.createFork({
      owner: upstreamOwner,
      repo: upstreamRepo,
    });

    let forkReady = false;
    for (let i = 0; i < 20; i++) {
      try {
        await this.octokit.rest.repos.get({
          owner: this.username,
          repo: upstreamRepo
        });
        forkReady = true;
        break;
      } catch (e: any) {
        if (e.status !== 404) throw e;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (!forkReady) {
      throw new Error("Timeout waiting for GitHub to finish creating the fork.");
    }

    const { data: upstreamRefData } = await this.octokit.rest.git.getRef({
      owner: upstreamOwner,
      repo: upstreamRepo,
      ref: 'heads/main'
    });
    const baseTree = upstreamRefData.object.sha;

    const treeData = await Promise.all(files.map(async file => {
      if (file.isBase64) {
        const { data: blob } = await this.octokit.rest.git.createBlob({
          owner: this.username,
          repo: upstreamRepo,
          content: file.content,
          encoding: 'base64'
        });
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha
        };
      } else {
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          content: file.content
        };
      }
    }));

    const { data: tree } = await this.octokit.rest.git.createTree({
      owner: this.username,
      repo: upstreamRepo,
      tree: treeData,
      base_tree: baseTree
    });

    const { data: commit } = await this.octokit.rest.git.createCommit({
      owner: this.username,
      repo: upstreamRepo,
      message: prTitle,
      tree: tree.sha,
      parents: [baseTree]
    });

    const branchName = `add-${modId}-${Date.now()}`;
    await this.octokit.rest.git.createRef({
      owner: this.username,
      repo: upstreamRepo,
      ref: `refs/heads/${branchName}`,
      sha: commit.sha
    });

    const { data: pr } = await this.octokit.rest.pulls.create({
      owner: upstreamOwner,
      repo: upstreamRepo,
      title: prTitle,
      body: prBody,
      head: `${this.username}:${branchName}`,
      base: 'main'
    });

    return pr.html_url;
  }
}
