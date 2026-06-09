export function getLineConfig() {
  const channelId = process.env.LINE_CHANNEL_ID?.trim();
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  const callbackUrl = process.env.LINE_CALLBACK_URL?.trim();
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

  return {
    channelId,
    channelSecret,
    callbackUrl,
    channelAccessToken,
    loginEnabled: Boolean(channelId && channelSecret && callbackUrl),
    messagingEnabled: Boolean(channelAccessToken),
  };
}

/** @deprecated loginEnabled を使用してください */
export function isLineLoginEnabled() {
  return getLineConfig().loginEnabled;
}

export function assertLineConfig() {
  const config = getLineConfig();
  if (!config.loginEnabled) {
    throw new Error(
      "LINE Login が未設定です。LINE_CHANNEL_ID / LINE_CHANNEL_SECRET / LINE_CALLBACK_URL を設定してください。"
    );
  }
  return config as {
    channelId: string;
    channelSecret: string;
    callbackUrl: string;
    channelAccessToken: string | undefined;
    loginEnabled: true;
    messagingEnabled: boolean;
  };
}

export function assertLineMessagingConfig() {
  const config = getLineConfig();
  if (!config.messagingEnabled || !config.channelAccessToken) {
    throw new Error(
      "LINE Messaging API が未設定です。LINE_CHANNEL_ACCESS_TOKEN を設定してください。"
    );
  }
  return { channelAccessToken: config.channelAccessToken };
}
