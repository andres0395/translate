"use client";

import { useState, useRef } from "react";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
}

export default function FileUpload({ onFileSelected }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSelect(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const validateAndSelect = (file: File) => {
    if (file.type.startsWith("audio/") || file.type === "video/mp4" || file.type === "video/webm" || file.name.endsWith(".mp3") || file.name.endsWith(".wav") || file.name.endsWith(".m4a")) {
      onFileSelected(file);
    } else {
      alert("Please upload a valid audio file.");
    }
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-3xl border border-dashed transition-all duration-300 cursor-pointer group
        ${isDragging
          ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.01] shadow-xl"
          : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-400/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="audio/*,video/mp4,video/webm,.mp3,.wav,.m4a"
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className={`
          mb-6 p-4 rounded-full transition-all duration-300
          ${isDragging ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 group-hover:scale-110 group-hover:text-indigo-500"}
        `}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
        </div>

        <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          Upload Audio
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
          Drag and drop your call recording here, or click to browse.
        </p>

        <div className="mt-8 flex gap-2">
          {["MP3", "WAV", "M4A"].map((ext) => (
            <span key={ext} className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide uppercase">
              {ext}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
