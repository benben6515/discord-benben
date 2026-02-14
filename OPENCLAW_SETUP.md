# OpenClaw Setup Guide

This guide explains how to set up OpenClaw for the Discord bot's AI features.

## 1. Install OpenClaw

OpenClaw provides CLI tools for installing and managing the gateway.

### On macOS/Linux:

```bash
curl -fsSL https://docs.openclaw.ai/install.sh | sh
```

### Using npm (if you prefer):

```bash
npm install -g @openclaw/cli
```

## 2. Configure OpenClaw Gateway

### Enable the OpenAI-compatible Chat Completions endpoint

Create or edit your OpenClaw config file (usually at `~/.openclaw/config.json`):

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true },
      },
    },
  },
}
```

### Set up authentication (optional but recommended)

You can set a token for gateway authentication:

```bash
export OPENCLAW_GATEWAY_TOKEN='your-secret-token-here'
```

Or add to your config:

```json5
{
  gateway: {
    auth: {
      mode: 'token',
      token: 'your-secret-token-here',
    },
  },
}
```

## 3. Configure an LLM Provider

OpenClaw needs an LLM provider to work. Configure one in your config file:

### Using OpenAI:

```json5
{
  providers: {
    openai: {
      apiKey: 'sk-...',
    },
  },
}
```

### Using Anthropic:

```json5
{
  providers: {
    anthropic: {
      apiKey: 'sk-ant-...',
    },
  },
}
```

## 4. Start the OpenClaw Gateway

```bash
openclaw gateway
```

The gateway will start on `http://127.0.0.1:18789` by default.

## 5. Configure Discord Bot

Update your `.env` file:

```bash
# OpenClaw Gateway URL (default)
OPENCLAW_GATEWAY_URL='http://127.0.0.1:18789'

# If you set a token in step 2
OPENCLAW_GATEWAY_TOKEN='your-secret-token-here'
```

## 6. Install Dependencies

```bash
npm install
```

## 7. Start the Discord Bot

```bash
npm start
```

## Usage

Once both the OpenClaw gateway and Discord bot are running, use the AI command:

```
!ai Hello, how are you?
!ai What's the weather like today?
```

## Troubleshooting

### Gateway won't start

- Check if port 18789 is already in use
- Verify your OpenClaw config file syntax is correct
- Run `openclaw doctor` to diagnose issues

### Bot can't connect to OpenClaw

- Verify the OpenClaw gateway is running: `curl http://127.0.0.1:18789/health`
- Check the `OPENCLAW_GATEWAY_URL` in your `.env` file
- If using auth, verify `OPENCLAW_GATEWAY_TOKEN` matches your gateway config

### AI not responding

- Verify your LLM provider API key is valid
- Check OpenClaw logs for errors: `openclaw logs`
- Ensure the chat completions endpoint is enabled in your config

## More Resources

- [OpenClaw Documentation](https://docs.openclaw.ai/)
- [OpenClaw Discord Integration](https://docs.openclaw.ai/channels/discord)
- [OpenClaw CLI Reference](https://docs.openclaw.ai/cli/)
