import { Badge } from "@/components/ui/badge"
import type { JobAnalysis, JobAnalysisRating } from "@/lib/jobs/extracted-job"

const RATING_LABEL: Record<JobAnalysisRating, string> = {
  poor: "Poor",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
  excellent: "Excellent",
}

export function jobAnalysisRatingLabel(rating: JobAnalysisRating) {
  return RATING_LABEL[rating]
}

export function JobAnalysisRatingBadge({ rating }: { rating: JobAnalysisRating }) {
  return (
    <Badge variant={rating === "poor" ? "destructive" : "secondary"}>
      {RATING_LABEL[rating]}
    </Badge>
  )
}

export function JobAnalysisCard({ analysis }: { analysis: JobAnalysis }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-medium">Posting rating</h2>
        <JobAnalysisRatingBadge rating={analysis.rating} />
      </div>
      {analysis.summary ? (
        <p className="text-sm text-muted-foreground">{analysis.summary}</p>
      ) : null}
      <dl className="flex flex-col gap-2 text-sm">
        {analysis.company ? (
          <div>
            <dt className="font-medium">Company</dt>
            <dd className="text-muted-foreground">{analysis.company}</dd>
          </div>
        ) : null}
        {analysis.posting ? (
          <div>
            <dt className="font-medium">Job description</dt>
            <dd className="text-muted-foreground">{analysis.posting}</dd>
          </div>
        ) : null}
        {analysis.location ? (
          <div>
            <dt className="font-medium">Location</dt>
            <dd className="text-muted-foreground">{analysis.location}</dd>
          </div>
        ) : null}
      </dl>
      {analysis.highlights.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Strengths</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {analysis.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {analysis.concerns.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Watch-outs</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {analysis.concerns.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
