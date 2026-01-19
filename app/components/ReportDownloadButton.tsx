'use client';

import React, { useState, useRef, useEffect } from 'react';
import { HiChevronDown, HiDownload } from 'react-icons/hi';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

interface ReportData {
  user: {
    name: string;
    email: string;
    role: string;
  };
  latexFiles: Array<{
    name: string;
    type: string;
    fileId: string;
    createdAt: string;
    updatedAt: string;
    documentMetadata: {
      title: string;
      author: string;
      description: string;
      tags: string[];
    };
  }>;
  bpmnFiles: Array<{
    name: string;
    type: string;
    fileId: string;
    createdAt: string;
    updatedAt: string;
    processMetadata: {
      processName: string;
      description: string;
      processOwner: string;
      processManager: string;
    };
  }>;
  records: Array<{
    title: string;
    date: string;
    tag: string;
    link: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

const ReportDownloadButton: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchReportData = async (): Promise<ReportData | null> => {
    try {
      const response = await fetch('/api/reports/user-report', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }

      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to fetch report data');
      return null;
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const generateCSV = (data: ReportData): string => {
    const lines: string[] = [];
    
    // Header
    lines.push('User Report');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`User: ${data.user.name} (${data.user.email})`);
    lines.push('');
    
    // LaTeX Files Section
    lines.push('=== LaTeX Files ===');
    lines.push('Name,Type,File ID,Created At,Updated At,Title,Author,Description,Tags');
    data.latexFiles.forEach(file => {
      const tags = Array.isArray(file.documentMetadata.tags) 
        ? file.documentMetadata.tags.join('; ') 
        : '';
      lines.push([
        `"${file.name}"`,
        file.type,
        file.fileId,
        formatDate(file.createdAt),
        formatDate(file.updatedAt),
        `"${file.documentMetadata.title || ''}"`,
        `"${file.documentMetadata.author || ''}"`,
        `"${file.documentMetadata.description || ''}"`,
        `"${tags}"`
      ].join(','));
    });
    lines.push('');
    
    // BPMN Files Section
    lines.push('=== BPMN Files ===');
    lines.push('Name,Type,File ID,Created At,Updated At,Process Name,Description,Process Owner,Process Manager');
    data.bpmnFiles.forEach(file => {
      lines.push([
        `"${file.name}"`,
        file.type,
        file.fileId,
        formatDate(file.createdAt),
        formatDate(file.updatedAt),
        `"${file.processMetadata.processName || ''}"`,
        `"${file.processMetadata.description || ''}"`,
        `"${file.processMetadata.processOwner || ''}"`,
        `"${file.processMetadata.processManager || ''}"`
      ].join(','));
    });
    lines.push('');
    
    // Records Section
    lines.push('=== Records (Activities) ===');
    lines.push('Title,Date,Tag,Link,Created At,Updated At');
    data.records.forEach(record => {
      lines.push([
        `"${record.title}"`,
        formatDate(record.date),
        `"${record.tag}"`,
        `"${record.link || ''}"`,
        formatDate(record.createdAt),
        formatDate(record.updatedAt)
      ].join(','));
    });
    
    return lines.join('\n');
  };

  const checkPageBreak = (doc: jsPDF, yPosition: number, requiredSpace: number = 30): number => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      return 20;
    }
    return yPosition;
  };

  const addSectionHeader = (doc: jsPDF, yPos: number, title: string, pageWidth: number): number => {
    const margin = 14;
    yPos = checkPageBreak(doc, yPos, 15);
    
    // Section background
    doc.setFillColor(66, 139, 202);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    
    // Section title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, margin + 4, yPos + 5.5);
    
    doc.setTextColor(0, 0, 0);
    return yPos + 12;
  };

  const addInfoBox = (
    doc: jsPDF,
    yPos: number,
    label: string,
    value: string,
    pageWidth: number,
    isLeft: boolean = true
  ): number => {
    const margin = 14;
    const gap = 10;
    const boxWidth = (pageWidth - 2 * margin - gap) / 2;
    const xPos = isLeft ? margin : margin + boxWidth + gap;
    
    yPos = checkPageBreak(doc, yPos, 12);
    
    // Box background
    doc.setFillColor(245, 247, 250);
    doc.rect(xPos, yPos, boxWidth, 10, 'F');
    
    // Border
    doc.setDrawColor(200, 200, 200);
    doc.rect(xPos, yPos, boxWidth, 10);
    
    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(label, xPos + 4, yPos + 4);
    
    // Value
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const valueText = value.length > 35 ? value.substring(0, 32) + '...' : value;
    doc.text(valueText, xPos + 4, yPos + 7.5);
    
    return yPos;
  };

  const addDetailSection = (
    doc: jsPDF,
    yPos: number,
    title: string,
    details: Array<{ label: string; value: string }>,
    pageWidth: number
  ): number => {
    const margin = 14;
    yPos = checkPageBreak(doc, yPos, 20);
    
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(66, 139, 202);
    doc.text(title, margin, yPos);
    yPos += 7;
    
    // Details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    details.forEach((detail, index) => {
      yPos = checkPageBreak(doc, yPos, 6);
      
      // Label
      doc.setFont('helvetica', 'bold');
      doc.text(`${detail.label}:`, margin, yPos);
      
      // Value (with word wrap)
      doc.setFont('helvetica', 'normal');
      const maxWidth = pageWidth - margin - 60;
      const valueLines = doc.splitTextToSize(detail.value || 'N/A', maxWidth);
      doc.text(valueLines, margin + 50, yPos);
      yPos += valueLines.length * 5 + 2;
    });
    
    return yPos + 5;
  };

  const addTableToPDF = (
    doc: jsPDF,
    startY: number,
    headers: string[],
    rows: string[][],
    colWidths: number[]
  ): number => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const lineHeight = 7;
    let yPos = startY;
    const headerHeight = 8;
    
    yPos = checkPageBreak(doc, yPos, headerHeight + 5);
    
    // Draw header
    doc.setFillColor(66, 139, 202);
    doc.rect(margin, yPos, pageWidth - 2 * margin, headerHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    let xPos = margin + 2;
    headers.forEach((header, index) => {
      doc.text(header, xPos, yPos + 5.5);
      xPos += colWidths[index];
    });
    
    yPos += headerHeight;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    // Draw rows
    rows.forEach((row, rowIndex) => {
      yPos = checkPageBreak(doc, yPos, lineHeight);
      
      // Alternate row color
      if (rowIndex % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, yPos, pageWidth - 2 * margin, lineHeight, 'F');
      }
      
      // Row border
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      
      xPos = margin + 2;
      row.forEach((cell, colIndex) => {
        const cellText = cell.length > 25 ? cell.substring(0, 22) + '...' : cell;
        doc.text(cellText, xPos, yPos + 5);
        xPos += colWidths[colIndex];
      });
      
      yPos += lineHeight;
    });
    
    // Bottom border
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    return yPos + 8;
  };

  const generatePDF = (data: ReportData): void => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let yPosition = 20;
    
    // Cover Page Header
    doc.setFillColor(66, 139, 202);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('User Activity Report', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Comprehensive Activity Summary', pageWidth / 2, 35, { align: 'center' });
    
    yPosition = 65;
    doc.setTextColor(0, 0, 0);
    
    // Report Information Box
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 35, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 35);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Report Information', margin + 5, yPosition + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin + 5, yPosition + 15);
    doc.text(`User: ${data.user.name}`, margin + 5, yPosition + 21);
    doc.text(`Email: ${data.user.email}`, margin + 5, yPosition + 27);
    doc.text(`Role: ${data.user.role}`, margin + 100, yPosition + 15);
    
    yPosition += 45;
    
    // Executive Summary
    yPosition = addSectionHeader(doc, yPosition, 'Executive Summary', pageWidth);
    
    const totalFiles = data.latexFiles.length + data.bpmnFiles.length;
    const totalRecords = data.records.length;
    
    // Summary Statistics - Two rows of info boxes
    let row1Y = addInfoBox(doc, yPosition, 'Total LaTeX Files', data.latexFiles.length.toString(), pageWidth, true);
    addInfoBox(doc, yPosition, 'Total BPMN Files', data.bpmnFiles.length.toString(), pageWidth, false);
    
    yPosition = row1Y + 12;
    let row2Y = addInfoBox(doc, yPosition, 'Total Records', totalRecords.toString(), pageWidth, true);
    addInfoBox(doc, yPosition, 'Total Files', totalFiles.toString(), pageWidth, false);
    
    yPosition = row2Y + 12;
    
    // Calculate date ranges
    const allDates = [
      ...data.latexFiles.map(f => new Date(f.createdAt)),
      ...data.bpmnFiles.map(f => new Date(f.createdAt)),
      ...data.records.map(r => new Date(r.createdAt))
    ].filter(d => !isNaN(d.getTime()));
    
    if (allDates.length > 0) {
      const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const latestDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      
      yPosition = checkPageBreak(doc, yPosition, 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Activity Period: ${formatDate(earliestDate.toISOString())} to ${formatDate(latestDate.toISOString())}`, margin, yPosition);
      yPosition += 10;
    }
    
    // LaTeX Files Detailed Section
    if (data.latexFiles.length > 0) {
      yPosition = addSectionHeader(doc, yPosition, `LaTeX Files (${data.latexFiles.length})`, pageWidth);
      
      // Summary table
      const latexSummaryRows = data.latexFiles.map(file => [
        file.name || 'Untitled',
        file.type || 'tex',
        formatDate(file.createdAt),
        formatDate(file.updatedAt)
      ]);
      
      const latexColWidths = [60, 20, 50, 50];
      yPosition = addTableToPDF(
        doc,
        yPosition,
        ['File Name', 'Type', 'Created', 'Last Updated'],
        latexSummaryRows,
        latexColWidths
      );
      
      // Detailed information for each file
      data.latexFiles.forEach((file, index) => {
        yPosition = checkPageBreak(doc, yPosition, 40);
        
        const details = [
          { label: 'File ID', value: file.fileId },
          { label: 'Name', value: file.name },
          { label: 'Type', value: file.type },
          { label: 'Title', value: file.documentMetadata.title || 'N/A' },
          { label: 'Author', value: file.documentMetadata.author || 'N/A' },
          { label: 'Description', value: file.documentMetadata.description || 'N/A' },
          { label: 'Tags', value: Array.isArray(file.documentMetadata.tags) ? file.documentMetadata.tags.join(', ') : 'N/A' },
          { label: 'Created', value: formatDate(file.createdAt) },
          { label: 'Last Updated', value: formatDate(file.updatedAt) }
        ];
        
        yPosition = addDetailSection(
          doc,
          yPosition,
          `${index + 1}. ${file.name}`,
          details,
          pageWidth
        );
        
        // Add separator line
        if (index < data.latexFiles.length - 1) {
          doc.setDrawColor(229, 231, 235);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 5;
        }
      });
    }
    
    // BPMN Files Detailed Section
    if (data.bpmnFiles.length > 0) {
      yPosition = addSectionHeader(doc, yPosition, `BPMN Files (${data.bpmnFiles.length})`, pageWidth);
      
      // Summary table
      const bpmnSummaryRows = data.bpmnFiles.map(file => [
        file.name || 'Untitled',
        file.type || 'xml',
        formatDate(file.createdAt),
        formatDate(file.updatedAt)
      ]);
      
      const bpmnColWidths = [60, 20, 50, 50];
      yPosition = addTableToPDF(
        doc,
        yPosition,
        ['File Name', 'Type', 'Created', 'Last Updated'],
        bpmnSummaryRows,
        bpmnColWidths
      );
      
      // Detailed information for each file
      data.bpmnFiles.forEach((file, index) => {
        yPosition = checkPageBreak(doc, yPosition, 50);
        
        const details = [
          { label: 'File ID', value: file.fileId },
          { label: 'Name', value: file.name },
          { label: 'Type', value: file.type },
          { label: 'Process Name', value: file.processMetadata.processName || 'N/A' },
          { label: 'Description', value: file.processMetadata.description || 'N/A' },
          { label: 'Process Owner', value: file.processMetadata.processOwner || 'N/A' },
          { label: 'Process Manager', value: file.processMetadata.processManager || 'N/A' },
          { label: 'Created', value: formatDate(file.createdAt) },
          { label: 'Last Updated', value: formatDate(file.updatedAt) }
        ];
        
        yPosition = addDetailSection(
          doc,
          yPosition,
          `${index + 1}. ${file.name}`,
          details,
          pageWidth
        );
        
        // Add separator line
        if (index < data.bpmnFiles.length - 1) {
          doc.setDrawColor(229, 231, 235);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 5;
        }
      });
    }
    
    // Records Detailed Section
    if (data.records.length > 0) {
      yPosition = addSectionHeader(doc, yPosition, `Records & Activities (${data.records.length})`, pageWidth);
      
      // Summary table
      const recordsSummaryRows = data.records.map(record => [
        record.title || 'Untitled',
        record.tag || 'N/A',
        formatDate(record.date),
        formatDate(record.createdAt)
      ]);
      
      const recordsColWidths = [70, 30, 50, 50];
      yPosition = addTableToPDF(
        doc,
        yPosition,
        ['Title', 'Tag', 'Date', 'Created'],
        recordsSummaryRows,
        recordsColWidths
      );
      
      // Detailed information for each record
      data.records.forEach((record, index) => {
        yPosition = checkPageBreak(doc, yPosition, 35);
        
        const details = [
          { label: 'Title', value: record.title },
          { label: 'Tag', value: record.tag || 'N/A' },
          { label: 'Date', value: formatDate(record.date) },
          { label: 'Link', value: record.link || 'N/A' },
          { label: 'Created', value: formatDate(record.createdAt) },
          { label: 'Last Updated', value: formatDate(record.updatedAt) }
        ];
        
        yPosition = addDetailSection(
          doc,
          yPosition,
          `${index + 1}. ${record.title}`,
          details,
          pageWidth
        );
        
        // Add separator line
        if (index < data.records.length - 1) {
          doc.setDrawColor(229, 231, 235);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 5;
        }
      });
    }
    
    // Footer on last page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Save PDF
    const filename = `user-report-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  const handleDownloadCSV = async () => {
    setShowDropdown(false);
    setIsLoading(true);
    
    try {
      const data = await fetchReportData();
      if (!data) {
        return;
      }
      
      const csvContent = generateCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const filename = `user-report-${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, filename);
      toast.success('CSV report downloaded successfully');
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error('Failed to generate CSV report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setShowDropdown(false);
    setIsLoading(true);
    
    try {
      const data = await fetchReportData();
      if (!data) {
        return;
      }
      
      generatePDF(data);
      toast.success('PDF report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <HiDownload className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isLoading ? 'Generating...' : 'Download Report'}
        </span>
        <HiChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && !isLoading && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download CSV
          </button>
          
          <button
            onClick={handleDownloadPDF}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportDownloadButton;
