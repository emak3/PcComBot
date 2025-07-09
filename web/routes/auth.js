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
    // リダイレクト先を保存（デフォルトは/support）
    const returnTo = req.query.returnTo || '/support';
    req.session.returnTo = returnTo;
    
    const authURL = config.authUrl || `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&scope=${OAUTH_SCOPE}`;
    
    log.debug('認証URL:', authURL);
    res.redirect(authURL);
});

// OAuth2コールバック処理
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        log.error('認証コードが見つかりません');
        return res.status(400).send('認証コードが見つかりません');
    }

    // 必要な設定値の確認
    if (!config.clientSecret) {
        log.error('CLIENT_SECRETが設定されていません');
        return res.status(500).send('サーバー設定エラー: CLIENT_SECRETが設定されていません');
    }

    if (!config.redirectUri) {
        log.error('REDIRECT_URIが設定されていません');
        return res.status(500).send('サーバー設定エラー: REDIRECT_URIが設定されていません');
    }

    try {
        log.debug('トークン取得開始:', {
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            code: code.substring(0, 10) + '...'
        });

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
        log.debug('アクセストークン取得成功');

        // ユーザー情報取得
        const userResponse = await axios.get(`${DISCORD_API}/users/@me`, {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });

        const discordUser = userResponse.data;
        log.debug('ユーザー情報取得成功:', discordUser.username);

        // サーバーメンバーか確認
        const guild = req.client.guilds.cache.get(config.pccomId);
        if (!guild) {
            log.error('指定されたサーバーが見つかりません:', config.pccomId);
            return res.status(500).send('サーバー設定エラー');
        }

        const member = guild.members.cache.get(discordUser.id);
        if (!member) {
            log.warn('サーバーメンバーではないユーザーのアクセス:', discordUser.username);
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
        
        // 保存されたリダイレクト先または/supportにリダイレクト
        const returnTo = req.session.returnTo || '/support';
        delete req.session.returnTo; // 使用後削除
        res.redirect(returnTo);

    } catch (error) {
        log.error('OAuth2認証エラー:', error.response?.data || error.message);
        
        // より詳細なエラー情報をログに記録
        if (error.response) {
            log.error('Response status:', error.response.status);
            log.error('Response data:', error.response.data);
        }
        
        res.status(500).send('認証に失敗しました。設定を確認してください。');
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