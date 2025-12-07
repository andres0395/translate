export interface Feedback {
  summary: string;
  sentiment: string;
  keyPoints: string[];
  qualityScore: number;
  recommendations: string[];
  criteriaBreakdown: {
    criterion: string;
    met: boolean;
    score: number;
    maxScore: number;
  }[];
}