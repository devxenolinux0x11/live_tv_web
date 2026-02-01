const GITHUB_PAT = import.meta.env.VITE_GITHUB_PAT;
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO;
const GITHUB_PATH = import.meta.env.VITE_GITHUB_PATH;

const BASE_URL = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`;

export const githubService = {
    async fetchChannels() {
        const response = await fetch(BASE_URL, {
            headers: {
                Authorization: `token ${GITHUB_PAT}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data = await response.json();
        // GitHub returns content encoded in base64
        const content = atob(data.content.replace(/\n/g, ''));
        return {
            channels: JSON.parse(content),
            sha: data.sha
        };
    },

    async updateChannels(channels, sha) {
        const content = btoa(JSON.stringify(channels, null, 2));
        const response = await fetch(BASE_URL, {
            method: 'PUT',
            headers: {
                Authorization: `token ${GITHUB_PAT}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Update channel list: ${new Date().toLocaleString()}`,
                content: content,
                sha: sha
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to update: ${errorData.message}`);
        }

        return await response.json();
    }
};
