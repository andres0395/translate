import { useState } from "react";
import { Feedback } from "../types/feedback";


export default function useHome() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleAudioReady = (audio: File | Blob) => {
    handleTranscribe(audio);
  };

  const handleTranscribe = async (audio: File | Blob) => {
    setIsTranscribing(true);
    setTranscription(null);
    setFeedback(null);

    const formData = new FormData();
    formData.append("file", audio);

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
  };
}