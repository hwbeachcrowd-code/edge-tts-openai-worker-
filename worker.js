// worker.js
// OpenAI-compatible Edge TTS Cloudflare Worker
// Default voice: zh-CN-XiaoxiaoNeural
// No API key; public endpoint.
// Sec-MS-GEC v2 algorithm must be embedded in this file.

const DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural";
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const EDGE_VERSION = "155.0.4283.45";
const SEC_MS_GEC_VERSION = `2-${EDGE_VERSION}`;
const AUDIO_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

const PRIMARY_WS =
  "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1";

const FALLBACK_WS =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function timestamp() {
  return new Date().toISOString().replace(/[-:.]/g, "").slice(0, -1);
}

function uuid() {
  return crypto.randomUUID().replace(/-/g, "");
}

function makeMuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function removeInvalidXmlCharacters(text) {
  return text.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g,
    " "
  );
}

function normalizeVoiceName(voice) {
  const trimmed = String(voice || DEFAULT_VOICE).trim();

  const match = /^([a-z]{2,})-([A-Z]{2,})-(.+Neural)$/.exec(trimmed);
  if (!match) return trimmed;

  const [, language, region, name] = match;
  return `Microsoft Server Speech Text to Speech Voice (${language}-${region}, ${name.replace(/Neural$/, "")})`;
}

function buildSpeechConfigMessage() {
  return (
    `X-Timestamp:${timestamp()}\r\n` +
    "Content-Type:application/json; charset=utf-8\r\n" +
    "Path:speech.config\r\n\r\n" +
    JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: {
              sentenceBoundaryEnabled: "false",
              wordBoundaryEnabled: "false",
            },
            outputFormat: AUDIO_FORMAT,
          },
        },
      },
    }) +
    "\r\n"
  );
}

function buildSsmlMessage(requestId, voice, input) {
  const safeText = escapeXml(removeInvalidXmlCharacters(input));

  const ssml =
    "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'>" +
    `<voice name='${voice}'>` +
    `<prosody pitch='+0Hz' rate='+0%' volume='+0%'>${safeText}</prosody>` +
    "</voice></speak>";

  return (
    `X-RequestId:${requestId}\r\n` +
    "Content-Type:application/ssml+xml\r\n" +
    `X-Timestamp:${timestamp()}Z\r\n` +
    "Path:ssml\r\n\r\n" +
    ssml
  );
}

function parseHeaders(text) {
  const split = text.indexOf("\r\n\r\n");
  const headerText = split >= 0 ? text.slice(0, split) : text;
  const result = {};

  for (const line of headerText.split("\r\n")) {
    const i = line.indexOf(":");
    if (i > 0) {
      result[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }

  return result;
}

function parseAudioFrame(bytes) {
  if (bytes.length < 2) {
    throw new Error("Invalid binary frame: missing header length");
  }

  const headerLength = (bytes[0] << 8) | bytes[1];

  if (bytes.length < headerLength + 2) {
    throw new Error("Invalid binary frame: truncated header");
  }

  const headerText = new TextDecoder().decode(
    bytes.subarray(2, 2 + headerLength)
  );

  return {
    headers: parseHeaders(headerText),
    body: bytes.subarray(2 + headerLength),
  };
}

function buildWsUrl(base, token, connectionId, isPrimary) {
  const url = new URL(base);

  if (isPrimary) {
    url.searchParams.set("Ocp-Apim-Subscription-Key", TRUSTED_CLIENT_TOKEN);
  } else {
    url.searchParams.set("TrustedClientToken", TRUSTED_CLIENT_TOKEN);
  }

  url.searchParams.set("Sec-MS-GEC", token);
  url.searchParams.set("Sec-MS-GEC-Version", SEC_MS_GEC_VERSION);
  url.searchParams.set("ConnectionId", connectionId);

  return url.toString();
}

async function connectEdgeTts() {
  // generateSecMsGec() must be the full v2 implementation below.
  const token = generateSecMsGec(TRUSTED_CLIENT_TOKEN);

  const commonHeaders = {
    "User-Agent":
      `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
      `Chrome/${EDGE_VERSION} Safari/537.36 Edg/${EDGE_VERSION}`,
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
    Upgrade: "websocket",
    "Sec-WebSocket-Version": "13",
    Cookie: `muid=${makeMuid()};`,
  };

  const endpoints = [
    { url: PRIMARY_WS, primary: true },
    { url: FALLBACK_WS, primary: false },
  ];

  let lastError;

  for (const endpoint of endpoints) {
    const connectionId = uuid();
    const url = buildWsUrl(
      endpoint.url,
      token,
      connectionId,
      endpoint.primary
    );

    try {
      const response = await fetch(url, {
        headers: commonHeaders,
      });

      if (response.status === 101 && response.webSocket) {
        return response.webSocket;
      }

      lastError = new Error(
        `WebSocket handshake failed: ${response.status} ` +
        `${endpoint.primary ? "(primary)" : "(fallback)"}`
      );

      try {
        await response.body?.cancel();
      } catch {}
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to connect to Edge TTS");
}

function createAudioStream(socket, input, voice) {
  return new ReadableStream({
    start(controller) {
      let settled = false;
      let gotAudio = false;

      const cleanup = () => {
        socket.removeEventListener("message", onMessage);
        socket.removeEventListener("error", onError);
        socket.removeEventListener("close", onClose);
      };

      const fail = (error) => {
        if (settled) return;
        settled = true;
        cleanup();

        try {
          socket.close();
        } catch {}

        controller.error(
          error instanceof Error ? error : new Error(String(error))
        );
      };

      const finish = () => {
        if (settled) return;
        settled = true;
        cleanup();

        try {
          socket.close();
        } catch {}

        controller.close();
      };

      const onMessage = (event) => {
        if (settled) return;

        try {
          if (typeof event.data === "string") {
            const headers = parseHeaders(event.data);
            const path = headers.Path;

            if (path === "turn.end") {
              if (!gotAudio) {
                fail(new Error("Upstream completed without audio"));
              } else {
                finish();
              }
              return;
            }

            if (
              path === "response" ||
              path === "turn.start" ||
              path === "audio.metadata"
            ) {
              return;
            }

            if (path === "turn.failed") {
              fail(new Error("Upstream TTS reported turn.failed"));
            }

            return;
          }

          const processBinary = (buffer) => {
            if (settled) return;

            const bytes =
              buffer instanceof ArrayBuffer
                ? new Uint8Array(buffer)
                : buffer instanceof Uint8Array
                  ? buffer
                  : null;

            if (!bytes) {
              fail(new Error("Unsupported binary message"));
              return;
            }

            const frame = parseAudioFrame(bytes);

            if (frame.headers.Path !== "audio") return;

            if (
              frame.headers["Content-Type"] &&
              frame.headers["Content-Type"] !== "audio/mpeg"
            ) {
              fail(
                new Error(
                  "Unexpected audio type: " +
                  frame.headers["Content-Type"]
                )
              );
              return;
            }

            if (frame.body.length) {
              gotAudio = true;
              controller.enqueue(frame.body);
            }
          };

          if (event.data instanceof Blob) {
            event.data.arrayBuffer().then(processBinary).catch(fail);
          } else {
            processBinary(event.data);
          }
        } catch (error) {
          fail(error);
        }
      };

      const onError = () => fail(new Error("Edge TTS WebSocket error"));

      const onClose = () => {
        if (settled) return;

        if (gotAudio) finish();
        else fail(new Error("WebSocket closed before audio arrived"));
      };

      socket.addEventListener("message", onMessage);
      socket.addEventListener("error", onError);
      socket.addEventListener("close", onClose);

      socket.accept();
      socket.send(buildSpeechConfigMessage());
      socket.send(buildSsmlMessage(uuid(), voice, input));
    },

    cancel(reason) {
      try {
        socket.close(1000, String(reason || "cancelled").slice(0, 100));
      } catch {}
    },
  });
}

async function handleRequest(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return json({
      ok: true,
      service: "edge-tts-openai-worker",
      default_voice: DEFAULT_VOICE,
      endpoint: "/v1/audio/speech",
    });
  }

  if (request.method !== "POST" || url.pathname !== "/v1/audio/speech") {
    return json(
      {
        error: {
          message: "Not found",
          type: "invalid_request_error",
          code: "not_found",
        },
      },
      404
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        error: {
          message: "Request body must be valid JSON",
          type: "invalid_request_error",
          code: "invalid_json",
        },
      },
      400
    );
  }

  const input = typeof body.input === "string" ? body.input.trim() : "";
  const voice = normalizeVoiceName(body.voice || DEFAULT_VOICE);

  if (!input) {
    return json(
      {
        error: {
          message: "input is required",
          type: "invalid_request_error",
          param: "input",
          code: "missing_input",
        },
      },
      400
    );
  }

  // Avoid unexpectedly large public requests.
  if (input.length > 10000) {
    return json(
      {
        error: {
          message: "input is too long (maximum 10000 characters)",
          type: "invalid_request_error",
          param: "input",
          code: "input_too_long",
        },
      },
      413
    );
  }

  try {
    const socket = await connectEdgeTts();
    const audio = createAudioStream(socket, input, voice);

    return new Response(audio, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Content-Disposition": 'inline; filename="speech.mp3"',
      },
    });
  } catch (error) {
    console.error("Edge TTS error:", error);

    return json(
      {
        error: {
          message: error instanceof Error ? error.message : String(error),
          type: "api_error",
          param: null,
          code: "edge_tts_error",
        },
      },
      502
    );
  }
}

export default {
  fetch: handleRequest,
};
