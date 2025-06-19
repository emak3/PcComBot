// 認証が必要なルートのミドルウェア
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ 
            error: 'ログインが必要です',
            redirectTo: '/auth/login'
        });
    }
    next();
}

// 管理者権限が必要なルートのミドルウェア
function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ 
            error: 'ログインが必要です',
            redirectTo: '/auth/login'
        });
    }

    // Discord上で管理者ロールを持っているか確認
    const config = require('../../config.js');
    const guild = req.client.guilds.cache.get(config.pccomId);
    const member = guild?.members.cache.get(req.session.user.id);
    
    if (!member || !member.roles.cache.has(config.adminRoleId)) {
        return res.status(403).json({ 
            error: '管理者権限が必要です' 
        });
    }
    
    next();
}

module.exports = {
    requireAuth,
    requireAdmin
};