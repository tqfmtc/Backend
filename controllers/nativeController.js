import dotenv from 'dotenv';
dotenv.config();

export const versionCheck = (req, res) => {
    const currentVersion = process.env.Native_Version;
    if(req.userVersion=== currentVersion) {
        return res.status(200).json({ message: 'You are using the latest version.' });
    }
    else if(req.userVersion < currentVersion) {
        return res.status(426).json({ 
            message: 'Please update your app to continue.',
            currentVersion: currentVersion,
            updateRequired: true
        });
    }
}