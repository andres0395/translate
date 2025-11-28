"use client";

import FileUpload from "./components/FileUpload";
import useHome from "@/app/hook/useHome";

export default function Home() {

  const {
    transcription,
    isTranscribing,
    isGeneratingFeedback,
    feedback,
    handleAudioReady,
    reset,
    isCompressing,
  } = useHome();

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
      <main className="max-w-5xl mx-auto px-6 py-20 md:py-32">
        {/* Header */}
        <div className="mb-16 md:mb-24 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-1.5 mb-4 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="px-3 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              AI-Powered QA
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Call Quality Analysis
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
            Upload German or Portuguese calls. Get instant Spanish transcription and actionable quality insights.
          </p>
        </div>

        {/* Main Content Area */}
        <div className="transition-all duration-500 ease-in-out">
          {!transcription && !isTranscribing && (
            <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              <FileUpload onFileSelected={handleAudioReady} />
            </div>
          )}

          {/* Loading State */}
          {(isTranscribing || isGeneratingFeedback || isCompressing) && (
            <div className="max-w-md mx-auto text-center py-20 animate-in fade-in duration-500">
              <div className="relative w-16 h-16 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-zinc-100 dark:border-zinc-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-xl font-medium mb-2">
                {isCompressing
                  ? "Compressing Audio..."
                  : isTranscribing
                    ? "Transcribing Audio..."
                    : "Analyzing Quality..."}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {isCompressing
                  ? "Optimizing your file for upload..."
                  : "Processing your conversation with Groq AI models."}
              </p>
            </div>
          )}

          {/* Results View */}
          {transcription && feedback && !isGeneratingFeedback && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

              {/* Transcription (Left/Top) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Transcription
                  </h2>
                  <span className="text-xs font-mono text-zinc-400">Spanish</span>
                </div>
                <div className="p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50">
                  <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-line">
                    {transcription}
                  </p>
                </div>
              </div>

              {/* Feedback (Right/Bottom) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Analysis
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Score</span>
                    <span className={`text-sm font-bold ${feedback.qualityScore >= 90 ? "text-emerald-500" :
                      feedback.qualityScore >= 70 ? "text-indigo-500" : "text-rose-500"
                      }`}>
                      {feedback.qualityScore}/100
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  {/* Summary */}
                  <div className="p-6 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-xs font-medium text-zinc-400 mb-2">Summary</h3>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                      {feedback.summary}
                    </p>
                  </div>

                  {/* Sentiment */}
                  <div className="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">Sentiment</span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                      {feedback.sentiment}
                    </span>
                  </div>

                  {/* Key Points */}
                  <div className="p-6 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-xs font-medium text-zinc-400 mb-3">Key Points</h3>
                    <ul className="space-y-2">
                      {feedback.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div className="p-6 bg-indigo-50/30 dark:bg-indigo-950/10">
                    <h3 className="text-xs font-medium text-indigo-900/60 dark:text-indigo-200/60 mb-3">Recommendations</h3>
                    <ul className="space-y-2">
                      {feedback.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-indigo-900 dark:text-indigo-100">
                          <span className="mt-1 w-3.5 h-3.5 text-indigo-500 shrink-0">→</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={reset}
                  className="w-full py-3 px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-zinc-200 dark:shadow-none"
                >
                  Analyze Another Call
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
