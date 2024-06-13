
const getProfile = async (req, res, next) => {
    const { Profile } = req.app.get('models')
    if (!req.get('profile_id')) return res.status(403).json("Requires profile_id in req.headers")
    const profile = await Profile.findOne({ where: { id: req.get('profile_id') || 0 } })
    if (!profile) return res.status(401).json({ message: 'Unauthorized profile' })
    req.profile = profile
    next()
}
module.exports = { getProfile }