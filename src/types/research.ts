export type BriefType =
  | 'trend-brief'
  | 'market-map'
  | 'opportunity-assessment'
  | 'tech-scouting';

export type SignalStrength = 'Weak' | 'Moderate' | 'Strong';
export type LifecyclePhase = 'Emergence' | 'Growth' | 'Maturity' | 'Decline';
export type MonitoringCadence = 'Weekly' | 'Monthly' | 'Quarterly';

export interface ResearchSource {
  title: string;
  uri: string;
  domain: string;
}

export interface AdoptionPoint {
  stage: string;
  sharePct: number;
  currentStatus: 'completed' | 'active' | 'upcoming';
  velocityNote: string;
}

export interface CompetitorEntry {
  name: string;
  category: 'Direct' | 'Indirect' | 'Emerging';
  xScore: number; // 0-100 on primary axis
  yScore: number; // 0-100 on secondary axis
  positioning: string;
  keyGap: string;
  pricingModel: string;
  switchingCost: 'Low' | 'Medium' | 'High';
  marketSharePct?: number;
  keyFeatures?: string[];
}

export interface MarketSegment {
  name: string;
  sharePct: number;
  buyerPersona: string;
  unmetNeed: string;
  adoptionBarrier: string;
}

export interface StrategicRecommendation {
  title: string;
  horizon: string;
  impact: string;
  actionSteps: string;
}

export interface TechScoutingInsight {
  trlLevel: number; // 1-9
  patentMomentum: string;
  vcFundingSignal: string;
  openSourceActivity: string;
  regulatoryCatalyst: string;
  complianceRisk: string;
}

export interface ResearchMetrics {
  tamUsdBillions: number;
  samUsdBillions: number;
  somUsdMillions: number;
  cagrPct: number;
  sizingTimeframe: string;
  sizingConfidencePct: number;
  currentAdoptionPct: number;
  projected6mAdoptionPct: number;
  avgAcvUsd: number;
}

export interface ResearchSections {
  axisXLabel: string;
  axisYLabel: string;
  adoptionCurve: AdoptionPoint[];
  competitors: CompetitorEntry[];
  segments: MarketSegment[];
  recommendations: StrategicRecommendation[];
  techScouting: TechScoutingInsight;
}

export interface LifecycleHistoryEntry {
  timestamp: string;
  label?: string;
  lifecyclePhase: LifecyclePhase;
  signalStrength: SignalStrength;
  adoptionPct?: number;
  confidencePct?: number;
  note: string;
}

export interface ResearchBrief {
  id: string;
  ownerId: string;
  topic: string;
  industry: string;
  briefType: BriefType;
  signalStrength: SignalStrength;
  lifecyclePhase: LifecyclePhase;
  leadTimeMonths: string;
  confidencePct: number;
  executiveSummary: string;
  drivers: string[];
  barriers: string[];
  metrics: ResearchMetrics;
  sections: ResearchSections;
  sources: ResearchSource[];
  history?: LifecycleHistoryEntry[];
  isArchived: boolean;
  isSeeded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistSignal {
  id: string;
  ownerId: string;
  topic: string;
  industry: string;
  signalStrength: SignalStrength;
  lifecyclePhase: LifecyclePhase;
  cadence: MonitoringCadence;
  alertThreshold: string;
  latestDeltaNote: string;
  linkedBriefId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BriefChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: ResearchSource[];
  timestamp: string;
}

export type WorkspaceView = 'studio' | 'watchlist' | 'archive' | 'methodology';
export type DossierTab = 'overview' | 'sizing' | 'competitive' | 'comparison' | 'scouting';
