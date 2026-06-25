const policeMiddleware = (req, res, next) => {
    if (req.user && (req.user.role === 'police' || req.user.role === 'police_hq')) {
        next();
    } else {
        res.status(403).json({ success: false, message: "Access denied. Police authorization required." });
    }
};

export default policeMiddleware;
