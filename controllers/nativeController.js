import dotenv from 'dotenv';
dotenv.config();

export const versionCheck = (req, res) => {
    try {
        const currentVersion = process.env.Native_Version;
        const userVersion = req.body.userVersion; // Get from req.body instead of req

        if (!userVersion) {
            return res.status(400).json({ message: 'User version is required' });
        }

        if (userVersion === currentVersion) {
            return res.status(200).json({ message: 'You are using the latest version.' });
        }
        else if (userVersion < currentVersion) {
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