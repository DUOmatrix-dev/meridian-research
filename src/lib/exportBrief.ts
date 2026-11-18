import { jsPDF } from 'jspdf';
import type { ResearchBrief } from '../types/research';

export function buildMarkdownReport(brief: ResearchBrief): string {
  const m = brief.metrics;
  const s = brief.sections;
  const lines: string[] = [
    `# ${brief.topic}`,
    ``,
    `**Industry:** ${brief.industry}  `,
    `**Format:** ${brief.briefType}  `,
    `**Signal Strength:** ${brief.signalStrength} | **Lifecycle Phase:** ${brief.lifecyclePhase} | **Lead Time:** ${brief.leadTimeMonths} | **Confidence:** ${brief.confidencePct}%  `,
    `**Updated:** ${new Date(brief.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`,
    ``,
    `## Executive Thesis`,
    brief.executiveSummary,
    ``,
    `## Market Sizing (${m.sizingTimeframe})`,
    `- **TAM:** $${m.tamUsdBillions.toFixed(1)}B`,
    `- **SAM:** $${m.samUsdBillions.toFixed(1)}B`,
    `- **SOM:** $${m.somUsdMillions.toFixed(0)}M`,
    `- **CAGR:** ${m.cagrPct.toFixed(1)}% (±${100 - m.sizingConfidencePct}% confidence interval)`,
    `- **Current Adoption:** ${m.currentAdoptionPct.toFixed(1)}% -> **6-Month Projection:** ${m.projected6mAdoptionPct.toFixed(1)}%`,
    ``,
    `## Structural Drivers`,
    ...brief.drivers.map((d) => `- ${d}`),
    ``,
    `## Adoption & Regulatory Barriers`,
    ...brief.barriers.map((b) => `- ${b}`),
    ``,
    `## Competitive Landscape`,
    `| Competitor | Category | Positioning | Key Gap | Switching Cost |`,
    `| --- | --- | --- | --- | --- |`,
    ...s.competitors.map(
      (c) => `| ${c.name} | ${c.category} | ${c.positioning} | ${c.keyGap} | ${c.switchingCost} |`,
    ),
    ``,
    `## Strategic Recommendations`,
    ...s.recommendations.map(
      (r, idx) =>
        `### ${idx + 1}. ${r.title} (${r.horizon})\n- **Expected Impact:** ${r.impact}\n- **Execution Plan:** ${r.actionSteps}`,
    ),
    ``,
    `## Technology Scouting & Regulatory Outlook`,
    `- **TRL Level:** ${s.techScouting.trlLevel} / 9`,
    `- **Patent Momentum:** ${s.techScouting.patentMomentum}`,
    `- **VC Funding Signal:** ${s.techScouting.vcFundingSignal}`,
    `- **Open Source & Standards:** ${s.techScouting.openSourceActivity}`,
    `- **Regulatory Catalyst:** ${s.techScouting.regulatoryCatalyst}`,
    `- **Compliance Risk:** ${s.techScouting.complianceRisk}`,
    ``,
    `## Verified Grounding Sources`,
    ...brief.sources.map((src) => `- [${src.title}](${src.uri}) (${src.domain})`),
  ];

  return lines.join('\n');
}

export function buildTextSummary(brief: ResearchBrief): string {
  const m = brief.metrics;
  const s = brief.sections;
  const dateLabel = new Date(brief.updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const lines: string[] = [
    `MERIDIAN RESEARCH — EXECUTIVE TREND SUMMARY`,
    `============================================================`,
    `Topic: ${brief.topic}`,
    `Industry: ${brief.industry}`,
    `Signal: ${brief.signalStrength} | Phase: ${brief.lifecyclePhase} | Lead Time: ${brief.leadTimeMonths} | Confidence: ${brief.confidencePct}%`,
    `Updated: ${dateLabel}`,
    ``,
    `EXECUTIVE THESIS`,
    `------------------------------------------------------------`,
    brief.executiveSummary,
    ``,
    `MARKET SIZING (${m.sizingTimeframe})`,
    `------------------------------------------------------------`,
    `TAM: $${m.tamUsdBillions.toFixed(1)}B | SAM: $${m.samUsdBillions.toFixed(1)}B | SOM: $${m.somUsdMillions.toFixed(0)}M`,
    `CAGR: +${m.cagrPct.toFixed(1)}% (±${Math.max(5, 100 - m.sizingConfidencePct)}% confidence interval)`,
    `Adoption Trajectory: ${m.currentAdoptionPct.toFixed(1)}% current -> ${m.projected6mAdoptionPct.toFixed(1)}% (+6m forecast)`,
    ``,
    `STRUCTURAL DRIVERS`,
    ...brief.drivers.map((d, i) => `  ${i + 1}. ${d}`),
    ``,
    `ADOPTION & REGULATORY BARRIERS`,
    ...brief.barriers.map((b, i) => `  ${i + 1}. ${b}`),
    ``,
    `STRATEGIC RECOMMENDATIONS`,
    ...s.recommendations.map(
      (r, i) => `  ${i + 1}. [${r.horizon}] ${r.title}\n     Impact: ${r.impact}\n     Plan: ${r.actionSteps}`,
    ),
    ``,
    `COMPETITIVE SNAPSHOT`,
    ...s.competitors.map(
      (c) => `  - ${c.name} (${c.category}, Switching Cost: ${c.switchingCost}): ${c.positioning} | Gap: ${c.keyGap}`,
    ),
    ``,
    `VERIFIED SOURCES`,
    ...brief.sources.map((src) => `  - ${src.title} (${src.uri})`),
  ];

  return lines.join('\n');
}

export function downloadPdfBrief(brief: ResearchBrief): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageW - margin * 2;
  let y = 52;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addHeading = (text: string) => {
    ensureSpace(28);
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(text, margin, y);
    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  };

  const addWrappedText = (text: string, fontSize = 10, color: [number, number, number] = [51, 65, 85], indent = 0) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const wrapped = doc.splitTextToSize(text, maxWidth - indent) as string[];
    const lineH = fontSize * 1.42;
    for (const line of wrapped) {
      ensureSpace(lineH + 4);
      doc.text(line, margin + indent, y);
      y += lineH;
    }
    y += 4;
  };

  // Header kicker
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(109, 40, 217);
  doc.text('MERIDIAN RESEARCH  ·  MARKET INTELLIGENCE BRIEF', margin, y);
  y += 20;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(brief.topic, maxWidth) as string[];
  for (const line of titleLines) {
    doc.text(line, margin, y);
    y += 22;
  }

  // Metadata line
  const dateLabel = new Date(brief.updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  addWrappedText(
    `${brief.industry}  ·  ${brief.signalStrength} Signal  ·  ${brief.lifecyclePhase} Phase  ·  ${brief.leadTimeMonths} lead time  ·  Confidence ${brief.confidencePct}%  ·  ${dateLabel}`,
    9,
    [100, 116, 139],
  );

  // Market Sizing Summary Bar
  const m = brief.metrics;
  addHeading(`Market Sizing & Trajectory (${m.sizingTimeframe})`);
  addWrappedText(
    `TAM: $${m.tamUsdBillions.toFixed(1)}B   |   SAM: $${m.samUsdBillions.toFixed(1)}B   |   SOM: $${m.somUsdMillions.toFixed(0)}M   |   CAGR: +${m.cagrPct.toFixed(1)}%   |   Adoption: ${m.currentAdoptionPct.toFixed(1)}% -> ${m.projected6mAdoptionPct.toFixed(1)}% (+6m)`,
    10,
    [15, 23, 42],
  );

  addHeading('Executive Thesis');
  for (const para of brief.executiveSummary.split(/\n+/)) {
    if (para.trim()) addWrappedText(para.trim(), 10, [51, 65, 85]);
  }

  if (brief.drivers.length > 0) {
    addHeading('Structural Drivers');
    for (const driver of brief.drivers) {
      addWrappedText(`•  ${driver}`, 9.5, [51, 65, 85], 6);
    }
  }

  if (brief.barriers.length > 0) {
    addHeading('Adoption & Regulatory Barriers');
    for (const barrier of brief.barriers) {
      addWrappedText(`•  ${barrier}`, 9.5, [51, 65, 85], 6);
    }
  }

  if (brief.sections.recommendations.length > 0) {
    addHeading('Strategic Recommendations');
    brief.sections.recommendations.forEach((rec, idx) => {
      ensureSpace(42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${rec.title} (${rec.horizon})`, margin, y);
      y += 14;
      addWrappedText(`Expected Impact: ${rec.impact}`, 9.5, [21, 128, 61], 10);
      addWrappedText(`Action Plan: ${rec.actionSteps}`, 9.5, [71, 85, 105], 10);
    });
  }

  if (brief.sections.competitors.length > 0) {
    addHeading('Competitive Landscape');
    for (const comp of brief.sections.competitors) {
      addWrappedText(
        `${comp.name} (${comp.category} · Switching Cost: ${comp.switchingCost}) — ${comp.positioning} Gap: ${comp.keyGap}`,
        9.5,
        [51, 65, 85],
        4,
      );
    }
  }

  if (brief.sources.length > 0) {
    addHeading('Verified Grounding Sources');
    for (const src of brief.sources) {
      addWrappedText(`•  ${src.title} — ${src.uri}`, 8.5, [100, 116, 139], 4);
    }
  }

  doc.save(`${slugifyTopic(brief.topic) || 'trend-brief'}.pdf`);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function slugifyTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
