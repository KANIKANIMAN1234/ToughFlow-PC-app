export function getLineConfig() {
  const channelId = process.env.LINE_CHANNEL_ID?.trim();
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  const callbackUrl = process.env.LINE_CALLBACK_URL?.trim();

  return {
    channelId,
    channelSecret,
    callbackUrl,
    enabled: Boolean(channelId && channelSecret && callbackUrl),
  };
}

export function assertLineConfig() {
  const config = getLineConfig();
  if (!config.enabled) {
    throw new Error(
      "LINE Login が未設定です。LINE_CHANNEL_ID / LINE_CHANNEL_SECRET / LINE_CALLBACK_URL を設定してください。"
    );
  }
  return config as {
    channelId: string;
    channelSecret: string;
    callbackUrl: string;
    enabled: true;
  };
}
