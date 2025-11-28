import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { join } from "path";
import { tmpdir } from "os";

// Set the ffmpeg path to the one installed by @ffmpeg-installer/ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function compressAudio(inputPath: string): Promise<string> {
  const outputPath = join(tmpdir(), `compressed-${Date.now()}.mp3`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioBitrate("64k") // Compress to 64k bitrate
      .save(outputPath)
      .on("end", () => {
        console.log("Audio compression finished:", outputPath);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("Audio compression error:", err);
        reject(err);
      });
  });
}
