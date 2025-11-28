export interface Feedback {
  summary: string;
  sentiment: string;
  keyPoints: string[];
  qualityScore: number;
  recommendations: string[];
}