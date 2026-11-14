import { useRef, useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Square,
  Loader2,
  Sparkles,
  Languages,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  onTranscript: (text: string) => void;
}

// Convert recorded audio into genuine WAV format
async function convertToWav(blob: Blob): Promise<Blob> {
  const audioContext = new AudioContext();

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Convert to 16 kHz, mono using OfflineAudioContext
    const targetSampleRate = 16000;
    const targetChannels = 1;

    const offlineContext = new OfflineAudioContext(
      targetChannels,
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    const resampledBuffer = await offlineContext.startRendering();
    const channelData = resampledBuffer.getChannelData(0);

    const frames = channelData.length;
    const bytesPerSample = 2;

    const wavBuffer = new ArrayBuffer(44 + frames * bytesPerSample);
    const view = new DataView(wavBuffer);

    function writeString(offset: number, value: string) {
      for (let i = 0; i < value.length; i++) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
    }

    // WAV header
    writeString(0, "RIFF");
    view.setUint32(4, 36 + frames * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");

    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, targetSampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    writeString(36, "data");
    view.setUint32(40, frames * 2, true);

    // PCM 16-bit conversion
    let offset = 44;

    for (let i = 0; i < frames; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));

      const pcm = sample < 0
        ? sample * 32768
        : sample * 32767;

      view.setInt16(offset, pcm, true);
      offset += 2;
    }

    return new Blob([wavBuffer], {
      type: "audio/wav",
    });
  } finally {
    await audioContext.close();
  }
}

export default function VoiceSolutionInput({
  onTranscript,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Default language: English
  const [language, setLanguage] = useState("en-IN");

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const generateUploadUrl = useMutation(
    api.submissions.generateUploadUrl
  );

  const transcribe = useAction(
    api.gnani.transcribeAudio
  );

  async function startRecording() {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      chunks.current = [];

      const mediaRecorder = new MediaRecorder(stream);

      recorder.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        try {
          setProcessing(true);

          // Original browser recording
          const recordedBlob = new Blob(chunks.current, {
            type:
              mediaRecorder.mimeType || "audio/webm",
          });

          // Convert recording into WAV
          const audioBlob = await convertToWav(
            recordedBlob
          );

          console.log(
            "Converted audio format:",
            audioBlob.type
          );

          console.log(
            "Converted audio size:",
            audioBlob.size
          );

          // Upload WAV to Convex Storage
          const uploadUrl = await generateUploadUrl({});

          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: {
              "Content-Type": "audio/wav",
            },
            body: audioBlob,
          });

          if (!response.ok) {
            throw new Error("Audio upload failed.");
          }

          const uploaded = await response.json();

          // Send audio to Gnani
          const result = await transcribe({
            storageId: uploaded.storageId as Id<"_storage">,
            language: language,
          });

          if (!result.transcript) {
            throw new Error(
              "No transcription received."
            );
          }

          // Insert transcript into solution textbox
          onTranscript(result.transcript);

          toast.success(
            "Voice converted into text!"
          );
        } catch (error) {
          console.error(
            "Transcription error:",
            error
          );

          toast.error(
            error instanceof Error
              ? error.message
              : "Transcription failed."
          );
        } finally {
          setProcessing(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Microphone error:", error);

      toast.error(
        "Microphone access denied or recording could not start."
      );
    }
  }

  function stopRecording() {
    if (recorder.current?.state === "recording") {
      recorder.current.stop();
      setRecording(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />

        <div>
          <p className="text-sm font-semibold">
            Speak Your Solution
          </p>

          <p className="text-xs text-muted-foreground">
            Powered by Gnani Prisma V3.0
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground">
        Explain your proposed solution in Telugu or English.
        Your speech will be converted into editable text.
      </p>

      {/* Language Selection */}
      <div className="flex items-center gap-3">
        <Languages className="size-4 text-muted-foreground" />

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={recording || processing}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
        >
          <option value="en-IN">
            English
          </option>

          <option value="te-IN">
            Telugu
          </option>
        </select>
      </div>

      {/* Recording Controls */}
      <div className="flex items-center gap-3">

        {!recording ? (
          <Button
            type="button"
            variant="outline"
            onClick={startRecording}
            disabled={processing}
            className="gap-2"
          >
            {processing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mic className="size-4" />
            )}

            {processing
              ? "Processing..."
              : "Start Recording"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            onClick={stopRecording}
            className="gap-2"
          >
            <Square className="size-4" />
            Stop & Transcribe
          </Button>
        )}

        {recording && (
          <span className="text-xs text-red-500 animate-pulse">
            ● Recording...
          </span>
        )}

      </div>
    </div>
  );
}