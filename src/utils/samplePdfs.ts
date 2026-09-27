import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generate a realistic multi-page PDF document in memory for testing
 */
export async function createSamplePdf(type: 'contract' | 'report' | 'invoice' = 'report'): Promise<{
  name: string;
  bytes: Uint8Array;
}> {
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  if (type === 'contract') {
    // 3-page Master Services Agreement
    const page1 = doc.addPage([595.28, 841.89]);
    page1.drawText('MASTER SERVICES AGREEMENT', {
      x: 50,
      y: 780,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    page1.drawText('Document ID: MSA-2026-9941 · Effective Date: October 1, 2026', {
      x: 50,
      y: 755,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5),
    });

    page1.drawText('1. PARTIES & SCOPE OF SERVICES', {
      x: 50,
      y: 710,
      size: 13,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3),
    });
    page1.drawText(
      'This Master Services Agreement ("Agreement") is entered into between Horizon Cloud Solutions Inc. ("Provider"),\nhaving its principal place of business at 742 Evergreen Terrace, Seattle, WA 98101, and Apex Dynamics Corp ("Client"),\nhaving its principal office at 100 Financial Way, New York, NY 10005.',
      { x: 50, y: 680, size: 10, font: fontRegular, lineHeight: 15, color: rgb(0.2, 0.2, 0.2) }
    );

    page1.drawText('2. CONFIDENTIALITY & DATA PROTECTION (GDPR/SOC-2)', {
      x: 50,
      y: 610,
      size: 13,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3),
    });
    page1.drawText(
      'Each Party agrees that all code, customer records, technical roadmaps, and personal data (such as emails,\ncontact numbers like +1-206-555-0199, and tax identifiers) disclosed shall be treated as Confidential Information.\nNeither party will disclose such confidential information without prior express written consent.',
      { x: 50, y: 580, size: 10, font: fontRegular, lineHeight: 15, color: rgb(0.2, 0.2, 0.2) }
    );

    page1.drawText('3. COMPENSATION, BILLING & PAYMENT SCHEDULE', {
      x: 50,
      y: 510,
      size: 13,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3),
    });
    page1.drawText(
      'Client shall pay Provider a monthly retainer of $14,500 USD, payable net-30 days upon invoice receipt.\nDirect wire payments to Acme Corporate Bank, Routing #021000021, Account #8892019482.\nLate payments accrue interest at 1.5% per month or the legal statutory ceiling.',
      { x: 50, y: 480, size: 10, font: fontRegular, lineHeight: 15, color: rgb(0.2, 0.2, 0.2) }
    );

    // Page 2
    const page2 = doc.addPage([595.28, 841.89]);
    page2.drawText('SCHEDULE A: STATEMENT OF WORK & DELIVERABLES', {
      x: 50,
      y: 780,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    page2.drawText(
      'Milestone 1: Architectural Blueprint & API Schema design (Completion: Nov 15, 2026)\nMilestone 2: Automated Pipeline Integration & Cloud Migration (Completion: Dec 20, 2026)\nMilestone 3: Security Hardening & Zero-Knowledge Verification (Completion: Jan 30, 2027)\nMilestone 4: Enterprise Production Deployment and Staff Training (Completion: Feb 28, 2027)',
      { x: 50, y: 730, size: 11, font: fontRegular, lineHeight: 22, color: rgb(0.2, 0.2, 0.2) }
    );

    // Page 3
    const page3 = doc.addPage([595.28, 841.89]);
    page3.drawText('SIGNATURES & EXECUTION', {
      x: 50,
      y: 780,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    page3.drawText(
      'IN WITNESS WHEREOF, the authorized representatives of the Parties have executed this Agreement as of the date first above written.\n\nProvider Representative: Marcus Vance, Chief Technology Officer\nClient Representative: Eleanor Sterling, VP of Operations\nAuthorized Email: legal-notices@horizonsolutions.io / legal@apexdynamics.com\nTelephone Contact: (555) 892-4100',
      { x: 50, y: 720, size: 11, font: fontRegular, lineHeight: 20, color: rgb(0.2, 0.2, 0.2) }
    );

    const bytes = await doc.save();
    return { name: 'Master_Services_Agreement_2026.pdf', bytes };
  } else if (type === 'invoice') {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText('COMMERCIAL INVOICE', { x: 50, y: 780, size: 20, font: fontBold, color: rgb(0.08, 0.12, 0.2) });
    page.drawText('Invoice No: INV-88910 · Issue Date: Sept 26, 2026 · Due Date: Oct 26, 2026', {
      x: 50,
      y: 755,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5),
    });

    page.drawText('Billed To: Quantum Leap Analytics\nContact: Sarah Jenkins (s.jenkins@quantumleap.ai)\nTax ID / VAT: US-948192041\nAddress: 450 Mission Street, Suite 900, San Francisco, CA', {
      x: 50,
      y: 700,
      size: 10,
      font: fontRegular,
      lineHeight: 16,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText('ITEM DESCRIPTION                                        QTY       RATE         TOTAL', {
      x: 50,
      y: 600,
      size: 10,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3),
    });
    page.drawText(
      'Cloud Architecture Consultation                              40 hrs     $220.00      $8,800.00\nDatabase Optimization & Index Tuning                        15 hrs     $180.00      $2,700.00\nZero-Trust Security Audit & Compliance Report                1 unit     $4,500.00    $4,500.00\nAutomated CI/CD Pipeline Implementation                      1 unit     $3,200.00    $3,200.00\n----------------------------------------------------------------------------------------------------\nSUBTOTAL:                                                                           $19,200.00\nTAX (8.5%):                                                                          $1,632.00\nTOTAL DUE:                                                                          $20,832.00',
      { x: 50, y: 575, size: 10, font: fontRegular, lineHeight: 18, color: rgb(0.2, 0.2, 0.2) }
    );

    const bytes = await doc.save();
    return { name: 'Commercial_Invoice_INV-88910.pdf', bytes };
  } else {
    // Research Paper
    const page1 = doc.addPage([595.28, 841.89]);
    page1.drawText('Autonomous Neural Architecture Search for Edge Devices', {
      x: 50,
      y: 780,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    page1.drawText('Dr. Elena Rostova, Kenji Takahashi · Department of Artificial Intelligence', {
      x: 50,
      y: 755,
      size: 11,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.48),
    });

    page1.drawText('ABSTRACT', { x: 50, y: 710, size: 12, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
    page1.drawText(
      'Edge computing environments demand machine learning architectures that optimize both inference accuracy\nand extreme energy efficiency. We introduce EdgeNAS, an evolutionary search framework that minimizes\nFLOPs by 42.6% while retaining 98.4% top-1 accuracy on ImageNet-1K. Through multi-objective Pareto optimization,\nEdgeNAS discovers quantized kernels tailored for ARM Cortex-M and embedded RISC-V microcontrollers.',
      { x: 50, y: 685, size: 10, font: fontRegular, lineHeight: 16, color: rgb(0.2, 0.2, 0.2) }
    );

    page1.drawText('1. EXPERIMENTAL METHODOLOGY & QUANTITATIVE FINDINGS', {
      x: 50,
      y: 590,
      size: 12,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3),
    });
    page1.drawText(
      'Our benchmark suite evaluates 5,000 architectural variants across three distinct silicon microarchitectures.\nTable 1 summarizes latency (ms), SRAM memory footprint (KB), and thermal envelope during peak sustained throughput.\nResults indicate that 8-bit dynamic quantization combined with sparse depthwise separable convolutions yields\na 3.4x speedup over baseline MobileNetV3 models.',
      { x: 50, y: 565, size: 10, font: fontRegular, lineHeight: 16, color: rgb(0.2, 0.2, 0.2) }
    );

    const page2 = doc.addPage([595.28, 841.89]);
    page2.drawText('2. COMPARATIVE BENCHMARK TABLE', {
      x: 50,
      y: 780,
      size: 13,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3),
    });
    page2.drawText(
      'Model Name          Top-1 Acc    Latency (ms)    Memory (KB)    Energy (mJ)\n---------------------------------------------------------------------------\nResNet-50           76.1%        48.2 ms         98,200 KB      142.1 mJ\nMobileNetV3         75.2%        14.6 ms         18,400 KB       38.4 mJ\nEdgeNAS-Small       77.8%         8.1 ms          6,200 KB       14.2 mJ\nEdgeNAS-Ultra       79.4%        11.3 ms          9,800 KB       21.7 mJ',
      { x: 50, y: 745, size: 10, font: fontRegular, lineHeight: 20, color: rgb(0.2, 0.2, 0.2) }
    );

    const bytes = await doc.save();
    return { name: 'Research_Paper_EdgeNAS_2026.pdf', bytes };
  }
}
