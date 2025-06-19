module.exports = {
    "token": process.env.TOKEN,
    "clientId": process.env.CLIENT_ID ?? "1385169281091637269",
    "pccomId": process.env.PCCOM_ID ?? "932529116400459786",
    "profile": process.env.PROFILE,
    //質問チャンネルID
    "questionChId": "1385170391227437166",
    //解決済みタグ
    "kaiketsuTag": "1159827748148215928",
    //タイムアウトメンバーにつけるロール
    "timeoutMemberRoleId": "1142862037173669899",
    //PC紹介チャンネルID
    "pcsyokaiId": "1385170391227437166",
    //ベストアンサーロール
    "bestAnswerRole": "1067445728542199828",
    //2週間未経過通知
    "timeoutNotice": "1385170391227437166",
     // Web関連設定
    "webPort": process.env.WEB_PORT ?? 3000,
    "webDomain": process.env.WEB_DOMAIN ?? "http://localhost:3000",
    "clientSecret": process.env.CLIENT_SECRET,
    "sessionSecret": process.env.SESSION_SECRET,
    
    // OAuth2設定を修正
    "authUrl": process.env.AUTH_URL,
    "redirectUri": process.env.REDIRECT_URI ?? `${process.env.WEB_DOMAIN ?? "http://localhost:3000"}/auth/callback`,
    
    // 問い合わせ関連チャンネル
    "inquiryChannelId": process.env.INQUIRY_CHANNEL_ID,
    "inquiryCategoryId": process.env.INQUIRY_CATEGORY_ID,
    
    // 管理者ロール
    "adminRoleId": process.env.ADMIN_ROLE_ID
}