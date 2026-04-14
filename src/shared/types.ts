export interface EmailMessage {
  id: string;
  conversationId: string;
  subject: string;
  from: EmailAddress;
  toRecipients: EmailAddress[];
  body: string;
  bodyPreview: string;
  receivedDateTime: string;
  hasAttachments: boolean;
  parentFolderId: string;
  isRead: boolean;
}

export interface EmailAddress {
  name: string;
  address: string;
}

export interface EmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBytes?: string;
}

export interface DraftReply {
  emailId: string;
  draftId: string;
  generatedText: string;
  subject: string;
  toRecipients: EmailAddress[];
  createdAt: Date;
}

export interface ClassificationResult {
  documentType: DocumentType;
  confidence: number;
  borrowerName?: string;
  loanNumber?: string;
  propertyAddress?: string;
  rawExtraction: Record<string, string>;
}

export type DocumentType =
  | 'w2'
  | 'pay_stub'
  | 'bank_statement'
  | 'tax_return'
  | 'appraisal'
  | 'title_commitment'
  | 'insurance'
  | 'id_document'
  | 'purchase_agreement'
  | 'closing_disclosure'
  | 'loan_estimate'
  | 'credit_report'
  | 'other';

export interface LoanFile {
  id: string;
  borrowerName: string;
  coBorrowerName?: string;
  loanNumber: string;
  propertyAddress: string;
  email: string;
  phone?: string;
  status: LoanStatus;
  lastUpdated: string;
}

export type LoanStatus =
  | 'application'
  | 'processing'
  | 'underwriting'
  | 'conditional_approval'
  | 'clear_to_close'
  | 'closing'
  | 'funded'
  | 'suspended'
  | 'denied'
  | 'withdrawn';

export interface MatchResult {
  loanFile: LoanFile;
  confidence: number;
  matchType: 'loan_number' | 'email' | 'borrower_name' | 'property_address';
}

export interface DraftFeedback {
  id?: number;
  emailId: string;
  draftId: string;
  generatedText: string;
  finalText: string | null;
  action: 'sent_as_is' | 'sent_edited' | 'deleted' | 'pending';
  editDistance: number | null;
  emailCategory: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface StylePreference {
  id?: number;
  rule: string;
  source: 'inferred' | 'user_specified';
  confidence: number;
  createdAt: string;
}

export interface PipelineRow {
  borrowerName: string;
  loanNumber: string;
  status: LoanStatus;
  propertyAddress: string;
  lastUpdated: string;
}

export interface RoutingDecision {
  action: 'auto_route' | 'needs_review';
  match?: MatchResult;
  reason: string;
}

export type TriageAction = 'DRAFT' | 'SKIP' | 'REVIEW';

export interface TriageResult {
  action: TriageAction;
  reason: string;
}

export interface TrainingExample {
  emailFrom: string;
  emailSubject: string;
  emailBody: string;
  yourReply: string;
  category?: string;
}

// ── Job Search Types ──

export type ATSType = 'greenhouse' | 'ashby' | 'lever' | 'workday' | 'generic';

export type ApplicationStatus =
  | 'identified'
  | 'applying'
  | 'applied'
  | 'phone_screen'
  | 'interview'
  | 'take_home'
  | 'offer'
  | 'accepted'
  | 'declined'
  | 'rejected'
  | 'withdrawn'
  | 'no_response'
  | 'needs_manual_apply';

export type ApplyMethod = 'manual' | 'auto';

export interface ScoreBreakdown {
  roleFit: number;
  salaryFit: number;
  locationFit: number;
  companyFit: number;
}

export interface JobListing {
  id: string;
  company: string;
  title: string;
  url: string;
  location: string;
  salaryRange: string | null;
  postedDate: string | null;
  description: string;
  scoreBreakdown: ScoreBreakdown;
  totalScore: number;
  notes: string;
  source: string;
  contentHash: string;
  discoveredAt: string;
}

export interface JobApplication {
  id: string;
  listingId: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  applyMethod: ApplyMethod | null;
  followUpDate: string | null;
  resumePath: string | null;
  coverLetterPath: string | null;
  screenshotPaths: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobSearchRun {
  id: string;
  searchQuery: string;
  source: string;
  totalResults: number;
  newResults: number;
  ranAt: string;
}

export interface CandidateProfile {
  name: string;
  location: string;
  email: string;
  phone: string;
  linkedin: string;
  summary: string;
  targetRoles: string[];
  salaryMin: number;
  locationPreference: string;
  companySize: string;
  industries: string[];
  dealBreakers: string[];
  skills: string[];
  education: string;
  experienceHighlights: string[];
}
