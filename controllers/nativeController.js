import dotenv from 'dotenv';
dotenv.config();

// Compare "major.minor.patch" numerically: returns <0, 0 or >0.
// (A plain string comparison treats "3.10.0" as older than "3.9.0".)
const compareVersions = (a, b) => {
    const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] || 0) - (pb[i] || 0);
        if (diff !== 0) return diff;
    }
    return 0;
};

export const versionCheck = (req, res) => {
    try {
        const currentVersion = process.env.Native_Version;
        const userVersion = req.body.userVersion; // Get from req.body instead of req

        if (!userVersion) {
            return res.status(400).json({ message: 'User version is required' });
        }

        const cmp = compareVersions(userVersion, currentVersion);
        if (cmp === 0) {
            return res.status(200).json({ message: 'You are using the latest version.' });
        }
        else if (cmp < 0) {
            return res.status(426).json({ 
                message: 'Please update your app to continue.',
                currentVersion: currentVersion,
                updateRequired: true
            });
        }
        else {
            return res.status(200).json({ message: 'Version check completed.' });
        }
    } catch (error) {
        console.error('Version check error:', error);
        return res.status(500).json({ message: 'Error checking version' });
    }
}