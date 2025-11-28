/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export default function useAudioCompression() {
  const [isCompressing, setIsCompressing] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());

  const load = async () => {
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    const ffmpeg = ffmpegRef.current;

    // Load ffmpeg.wasm from CDN
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
  };

  const compressAudio = async (file: File): Promise<Blob> => {
    setIsCompressing(true);
    const ffmpeg = ffmpegRef.current;

    try {
      if (!ffmpeg.loaded) {
        await load();
      }

      const inputName = "input" + file.name.substring(file.name.lastIndexOf("."));
      const outputName = "output.mp3";

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Compress to mp3 64k
      await ffmpeg.exec(["-i", inputName, "-b:a", "64k", outputName]);

      const data = await ffmpeg.readFile(outputName);
      // Cast data to any to avoid type conflict with BlobPart
      const blob = new Blob([data as any], { type: "audio/mp3" });

      return blob;
    } catch (error) {
      console.error("Compression error:", error);
      throw error;
    } finally {
      setIsCompressing(false);
    }
  };

  return {
    compressAudio,
    isCompressing,
  };
}
