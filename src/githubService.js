const GITHUB_PAT = import.meta.env.VITE_GITHUB_PAT;
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO;
const GITHUB_PATH = import.meta.env.VITE_GITHUB_PATH;

if (!GITHUB_PAT || !GITHUB_REPO || !GITHUB_PATH) {
    console.error('Missing GitHub Configuration:', {
        hasPat: !!GITHUB_PAT,
        hasRepo: !!GITHUB_REPO,
        hasPath: !!GITHUB_PATH
    });
}

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

        // Use TextDecoder for UTF-8 support
        const binaryString = atob(data.content.replace(/\n/g, ''));
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const content = new TextDecoder().decode(bytes);

        return {
            channels: JSON.parse(content),
            sha: data.sha
        };
    },

    async updateChannels(channels, sha) {
        const jsonString = JSON.stringify(channels, null, 2);

        // Use TextEncoder for UTF-8 support
        const bytes = new TextEncoder().encode(jsonString);
        let binaryString = '';
        for (let i = 0; i < bytes.length; i++) {
            binaryString += String.fromCharCode(bytes[i]);
        }
        const content = btoa(binaryString);

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
