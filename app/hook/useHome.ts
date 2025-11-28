import { useState } from "react";
import { Feedback } from "../types/feedback";
import useAudioCompression from "./useAudioCompression";


export default function useHome() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const { compressAudio, isCompressing } = useAudioCompression();

  const handleAudioReady = (audio: File | Blob) => {
    handleTranscribe(audio);
  };

  const handleTranscribe = async (audio: File | Blob) => {
    setIsTranscribing(true);
    setTranscription(null);
    setFeedback(null);

    const formData = new FormData();

    let fileToUpload = audio;

    // Check if file size > 4MB (Vercel limit is 4.5MB, safely using 4MB)
    if (audio.size > 4 * 1024 * 1024) {
      console.log("File > 4MB, compressing on client...");
      try {
        // We need to cast Blob to File for the hook, or update hook to accept Blob
        // The hook expects File to get name/extension.
        // If audio is Blob, we might need to wrap it.
        const file = audio instanceof File ? audio : new File([audio], "audio.wav", { type: audio.type });
        const compressedBlob = await compressAudio(file);
        fileToUpload = new File([compressedBlob], "compressed.mp3", { type: "audio/mp3" });
        console.log("Compression complete. New size:", fileToUpload.size);
      } catch (err) {
        console.error("Client-side compression failed:", err);
        alert("Compression failed. Uploading original file (might fail if too large).");
      }
    }

    formData.append("file", fileToUpload);

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.text) {
        setTranscription(data.text);
        handleGenerateFeedback(data.text);
      }
    } catch (error) {
      console.error("Transcription failed", error);
      alert("Transcription failed. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleGenerateFeedback = async (text: string) => {
    setIsGeneratingFeedback(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.summary) {
        setFeedback(data);
      }
    } catch (error) {
      console.error("Feedback generation failed", error);
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const reset = () => {
    setTranscription(null);
    setFeedback(null);
  };

  return {
    transcription,
    isTranscribing,
    isGeneratingFeedback,
    feedback,
    handleAudioReady,
    reset,
    isCompressing,
  };
}