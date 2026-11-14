"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// ==========================================
// SPEECH TO TEXT - GNANI PRISMA
// ==========================================

export const transcribeAudio = action({
  args: {
    storageId: v.id("_storage"),
    language: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Authentication required.");
    }

    const apiKey = process.env.GNANI_API_KEY;

    if (!apiKey) {
      throw new Error("Gnani API key is not configured.");
    }

    const audioUrl = await ctx.storage.getUrl(args.storageId);

    if (!audioUrl) {
      throw new Error("Audio file not found.");
    }

    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) {
      throw new Error("Unable to retrieve audio from storage.");
    }

    const audioBlob = await audioResponse.blob();

    if (audioBlob.size < 1000) {
      throw new Error(
        "Recording is too small. Please record your voice again.",
      );
    }

    console.log("Gnani audio size:", audioBlob.size);
    console.log("Gnani audio type:", audioBlob.type);

    const formData = new FormData();

    formData.append(
      "audio_file",
      audioBlob,
      "student-recording.wav",
    );

    formData.append(
      "language_code",
      args.language || "en-IN",
    );

    formData.append("format", "transcribe");
    formData.append("model", "prisma-v3.0");

    const response = await fetch(
      "https://api.vachana.ai/stt/v3",
      {
        method: "POST",
        headers: {
          "X-API-Key-ID": apiKey,
        },
        body: formData,
      },
    );

    const responseText = await response.text();

    console.log("Gnani HTTP status:", response.status);
    console.log("Gnani response:", responseText);

    if (!response.ok) {
      throw new Error(
        `Gnani STT error (${response.status}): ${responseText}`,
      );
    }

    let result: {
      success?: boolean;
      transcript?: string;
      request_id?: string;
      timestamp?: string;
      model?: string;
    };

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        "Gnani returned an invalid JSON response.",
      );
    }

    const transcript = result.transcript?.trim();

    if (!result.success) {
      throw new Error(
        `Gnani transcription failed. Request ID: ${
          result.request_id || "Unavailable"
        }. Response: ${responseText}`,
      );
    }

    if (!transcript) {
      throw new Error(
        `Gnani received the audio but returned no speech text. Request ID: ${
          result.request_id || "Unavailable"
        }. Please record clearly for a few seconds and try again.`,
      );
    }

    return {
      success: true,
      transcript,
      requestId: result.request_id,
    };
  },
});

// ==========================================
// TEXT TO SPEECH - TIMBRE
// ==========================================

export const speakFeedback = action({
  args: {
    text: v.string(),
    voice: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Authentication required.");
    }

    const apiKey = process.env.GNANI_API_KEY;

    if (!apiKey) {
      throw new Error("Gnani API key is not configured.");
    }

    const text = args.text.trim();

    if (!text) {
      throw new Error("Feedback text cannot be empty.");
    }

    if (text.length > 5000) {
      throw new Error("Feedback is too long.");
    }

    const response = await fetch(
      "https://api.vachana.ai/api/v1/tts/inference",
      {
        method: "POST",

        headers: {
          "X-API-Key-ID": apiKey,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: "timbre-v2.5",
          language: "en-IN",
          voice: args.voice || "Kaveri",
          text,

          audio_config: {
            container: "wav",
            encoding: "linear_pcm",
            num_channels: 1,
            sample_rate: 44100,
            sample_width: 2,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gnani TTS error: ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      throw new Error("Gnani returned empty audio.");
    }

    const audioContent =
      Buffer.from(audioBuffer).toString("base64");

    return {
      success: true,
      audioContent,
    };
  },
});