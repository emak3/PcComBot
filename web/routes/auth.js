const express = require('express');
const axios = require('axios');
const config = require('../../config.js');
const log = require('../../logger.js');

const router = express.Router();

// Discord OAuth2設定
const DISCORD_API = 'https://discord.com/api/v10';
const OAUTH_SCOPE = 'identify';

// ログインページにリダイレクト
router.get('/login', (req, res) => {
    const authURL = config.authUrl
    
    res.redirect(authURL);
});

// OAuth2コールバック処理
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.status(400).send('認証コードが見つかりません');
    }

    try {
        // アクセストークン取得
        const tokenResponse = await axios.post(`${DISCORD_API}/oauth2/token`, 
            new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: config.redirectUri,
                scope: OAUTH_SCOPE
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { access_token } = tokenResponse.data;

        // ユーザー情報取得
        const userResponse = await axios.get(`${DISCORD_API}/users/@me`, {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });

        const discordUser = userResponse.data;

        // サーバーメンバーか確認
        const guild = req.client.guilds.cache.get(config.pccomId);
        const member = guild?.members.cache.get(discordUser.id);

        if (!member) {
            return res.status(403).send('このサーバーのメンバーではありません');
        }

        // セッションにユーザー情報保存
        req.session.user = {
            id: discordUser.id,
            username: discordUser.username,
            globalName: discordUser.global_name,
            discriminator: discordUser.discriminator,
            avatar: discordUser.avatar,
            avatarURL: discordUser.avatar 
                ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator) % 5}.png`,
            displayName: member.displayName
        };

        log.info(`ユーザーがログインしました: ${discordUser.username} (${discordUser.id})`);
        res.redirect('/');

    } catch (error) {
        log.error('OAuth2認証エラー:', error);
        res.status(500).send('認証に失敗しました');
    }
});

// ログアウト
router.post('/logout', (req, res) => {
    if (req.session.user) {
        log.info(`ユーザーがログアウトしました: ${req.session.user.username} (${req.session.user.id})`);
    }
    req.session.destroy((err) => {
        if (err) {
            log.error('セッション削除エラー:', err);
            return res.status(500).json({ error: 'ログアウトに失敗しました' });
        }
        res.json({ success: true });
    });
});

module.exports = router;