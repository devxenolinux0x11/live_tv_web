const GITHUB_PAT = import.meta.env.VITE_GITHUB_PAT;
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO;
const GITHUB_PATH_CHANNELS = import.meta.env.VITE_GITHUB_PATH || '';

const getVpnPath = (channelPath) => {
    const lastSlashIndex = channelPath.lastIndexOf('/');
    const dir = lastSlashIndex !== -1 ? channelPath.substring(0, lastSlashIndex) : '';
    const vpnFile = 'vpn_configs.json';
    const path = dir ? `${dir}/${vpnFile}` : vpnFile;
    return path.startsWith('/') ? path.substring(1) : path;
};

const GITHUB_PATH_VPN = getVpnPath(GITHUB_PATH_CHANNELS);
const GITHUB_PATH_CHANNELS_CLEAN = GITHUB_PATH_CHANNELS.startsWith('/') ? GITHUB_PATH_CHANNELS.substring(1) : GITHUB_PATH_CHANNELS;

if (!GITHUB_PAT || !GITHUB_REPO || !GITHUB_PATH_CHANNELS) {
    console.error('Missing GitHub Configuration:', {
        hasPat: !!GITHUB_PAT,
        hasRepo: !!GITHUB_REPO,
        hasPath: !!GITHUB_PATH_CHANNELS
    });
}

const getBaseUrl = (path) => `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;

async function fetchFile(path) {
    const response = await fetch(getBaseUrl(path), {
        headers: {
            Authorization: `token ${GITHUB_PAT}`,
            Accept: 'application/vnd.github.v3+json',
        },
    });

    if (response.status === 404) {
        return { data: [], sha: null };
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
    }

    const data = await response.json();
    const binaryString = atob(data.content.replace(/\n/g, ''));
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const content = new TextDecoder().decode(bytes);

    return {
        data: JSON.parse(content),
        sha: data.sha
    };
}

async function updateFile(path, data, sha, message) {
    const jsonString = JSON.stringify(data, null, 2);
    const bytes = new TextEncoder().encode(jsonString);
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }
    const content = btoa(binaryString);

    const body = {
        message: message || `Update ${path}: ${new Date().toLocaleString()}`,
        content: content,
    };
    if (sha) body.sha = sha;

    const response = await fetch(getBaseUrl(path), {
        method: 'PUT',
        headers: {
            Authorization: `token ${GITHUB_PAT}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to update ${path}: ${errorData.message}`);
    }

    return await response.json();
}

export const githubService = {
    async fetchChannels() {
        const result = await fetchFile(GITHUB_PATH_CHANNELS_CLEAN);
        return { channels: result.data, sha: result.sha };
    },

    async updateChannels(channels, sha) {
        return await updateFile(GITHUB_PATH_CHANNELS_CLEAN, channels, sha, `Update channel list: ${new Date().toLocaleString()}`);
    },

    async fetchVpnConfigs() {
        const result = await fetchFile(GITHUB_PATH_VPN);
        return { configs: result.data, sha: result.sha };
    },

    async updateVpnConfigs(configs, sha) {
        return await updateFile(GITHUB_PATH_VPN, configs, sha, `Update VPN configs: ${new Date().toLocaleString()}`);
    }
};
