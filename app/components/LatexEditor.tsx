'use client';

// LaTeX Editor with \input{} and \include{} support
// 
// This editor supports LaTeX \input{} and \include{} commands that allow you to:
// - \input{filename} - Include content from another .tex file
// - \include{filename} - Include content from another .tex file with page break
// 
// Usage examples:
// \input{chapter1}     - Includes content from chapter1.tex
// \include{appendix}   - Includes content from appendix.tex with page break
// \input{chapters/intro} - Includes content from intro.tex in chapters folder
//
// The files must exist in your LaTeX project file tree to be included.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
    FaBold, FaItalic, FaList, FaPlay, FaTable, FaImage,
    FaFont, FaListOl, FaIndent, FaOutdent, FaFileAlt,
    FaHeading, FaUnderline, FaRulerHorizontal, FaCode,
    FaFileWord, FaFileUpload, FaEye, FaHistory
} from 'react-icons/fa';
import { Switch } from '../components/ui/Switch';
import TableGridPicker from '../components/ui/TableGridPicker';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, TableCell, TableRow, Table, AlignmentType, ImageRun, BorderStyle, WidthType } from 'docx';
import EditorModeSwitch from './ui/EditorModeSwitch';
import { LatexProject } from '../utils/latexProjectStorage';
import { 
    addLatexProjectVersion, 
    hasMeaningfulChanges 
} from '../utils/latexVersions';
import { generateLatexTemplate, generateLatexPreamble } from '../utils/latexPackages';
import ChangesTracker from './ChangesTracker';

// Add MathJax declaration for TypeScript
declare global {
    interface Window {
        MathJax?: {
            typesetPromise: (elements: Array<Element>) => Promise<void>;
        }
    }
}


// Define props interface
interface LatexEditorProps {
    initialContent?: string;
    onContentChange?: (content: string) => void;
    editorMode?: 'code' | 'visual';
    onEditorModeChange?: (mode: 'code' | 'visual') => void;
    isSaving?: boolean;
    onManualSave?: () => void;
    user?: any; // Add user prop for file access
    projectId?: string; // Add projectId prop for change tracking
    onSaveComplete?: () => void; // Callback when save completes
}

const LatexEditor: React.FC<LatexEditorProps> = ({ user, initialContent: initialContentProp, onContentChange, editorMode = 'code', onEditorModeChange, isSaving, onManualSave, projectId, onSaveComplete }) => {
    const initialContent = initialContentProp || generateLatexTemplate('LaTeX Document', user?.name || 'Author');

    const [latexContent, setLatexContent] = useState<string>(initialContent);

    // Removed renderOutput - now using PDF compilation only
    const [editorTheme, setEditorTheme] = useState<string>('vs-dark');
    const [isPreviewFullscreen, setIsPreviewFullscreen] = useState<boolean>(false);
    const [autoCompile, setAutoCompile] = useState<boolean>(true);
    const [editorInstance, setEditorInstance] = useState<any>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    
    // PDF compilation state
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isCompiling, setIsCompiling] = useState<boolean>(false);
    const [compilationLog, setCompilationLog] = useState<string>('');
    const [imageMap, setImageMap] = useState<{ [filename: string]: string }>({});
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);


    // Add a ref to the text style dropdown
    const textStyleDropdownRef = useRef<HTMLSelectElement>(null);

    // Add state for custom dropdown
    const [showTextStyleDropdown, setShowTextStyleDropdown] = useState<boolean>(false);
    const customDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(0);
    const dropdownItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

    // Change tracking state
    const [lastSavedContent, setLastSavedContent] = useState<string>('');
    const [changeTrackingEnabled, setChangeTrackingEnabled] = useState(true);
    const [showChangesTracker, setShowChangesTracker] = useState(false);

    // Text style options array for dropdown
    const textStyleOptions = [
        { value: 'normal', label: 'Normal text', className: 'text-sm' },
        { value: 'section', label: 'Section', className: 'font-bold text-base' },
        { value: 'subsection', label: 'Subsection', className: 'font-bold text-sm' },
        { value: 'subsubsection', label: 'Subsubsection', className: 'font-semibold text-sm' },
        { value: 'paragraph', label: 'Paragraph', className: 'font-medium text-sm' },
        { value: 'subparagraph', label: 'Subparagraph', className: 'font-medium text-xs' },
        { value: 'equation', label: 'Equation', className: 'font-mono text-sm' },
        { value: 'bullet-list', label: 'Bullet List', className: 'text-sm' },
        { value: 'numbered-list', label: 'Numbered List', className: 'text-sm' }
    ];

    // Table grid picker popup state
    const [showTableGrid, setShowTableGrid] = useState(false);
    const [tableGridPosition, setTableGridPosition] = useState<{ top: number; left: number } | null>(null);

    // Update content when initialContent prop changes
    useEffect(() => {
        if (initialContent && initialContent !== latexContent) {
            console.log('LatexEditor: initialContent prop changed, updating editor');
            setLatexContent(initialContent);
            if (autoCompile) {
                compileLatexToPDF();
            }
        }
    }, [initialContent]);

    // Recompile when autoCompile is enabled and content changes (debounced)
    useEffect(() => {
        if (autoCompile && latexContent.trim()) {
            const timeoutId = setTimeout(() => {
                compileLatexToPDF();
            }, 2000); // Wait 2 seconds after user stops typing
            
            return () => clearTimeout(timeoutId);
        }
    }, [latexContent, autoCompile]);

    // Add function to get file content by name
    const getFileContentByName = (fileName: string): string | null => {
        if (!user) return null;
        
        try {
            // Import the necessary functions
            const { getSavedLatexProjects } = require('../utils/latexProjectStorage');
            const { getLatexFileTree } = require('../utils/fileTreeStorage');
            
            // Get all projects for the user
            const projects = getSavedLatexProjects(user.id, user.role);
            const fileTree = getLatexFileTree(user.id, user.role);
            
            // First try to find by exact filename match
            let targetProject = projects.find((p: LatexProject) => p.name === fileName);
            
            // If not found, try without .tex extension
            if (!targetProject && !fileName.endsWith('.tex')) {
                targetProject = projects.find((p: LatexProject) => p.name === `${fileName}.tex`);
            }
            
            // If still not found, try with .tex extension
            if (!targetProject && fileName.endsWith('.tex')) {
                targetProject = projects.find((p: LatexProject) => p.name === fileName.replace('.tex', ''));
            }
            
            // If found, return the content
            if (targetProject && targetProject.content) {
                console.log(`Found file ${fileName} with content length: ${targetProject.content.length}`);
                return targetProject.content;
            }
            
            console.log(`File ${fileName} not found in user's projects`);
            return null;
        } catch (error) {
            console.error('Error getting file content:', error);
            return null;
        }
    };

    // Function to process \input{} and \include{} commands
    const processInputIncludeCommands = (content: string): string => {
        let processedContent = content;
        
        // Process \input{} commands
        processedContent = processedContent.replace(
            /\\input{([^}]+)}/g,
            (match, fileName) => {
                console.log(`Processing \\input{${fileName}}`);
                const fileContent = getFileContentByName(fileName);
                
                if (fileContent) {
                    // Extract content between \begin{document} and \end{document} if it exists
                    const documentMatch = fileContent.match(/\\begin{document}([\s\S]*?)\\end{document}/);
                    if (documentMatch) {
                        console.log(`Including document content from ${fileName}`);
                        return documentMatch[1].trim();
                    } else {
                        // If no document environment, return the whole content
                        console.log(`Including full content from ${fileName}`);
                        return fileContent;
                    }
                } else {
                    console.log(`File ${fileName} not found for \\input{}`);
                    return `<div class="error" style="background-color: #fee; border: 1px solid #fcc; padding: 8px; margin: 8px 0; border-radius: 4px; color: #c33;">
                        <strong>Error:</strong> File '${fileName}' not found for \\input{} command.<br>
                        <small>Make sure the file exists in your LaTeX project file tree.</small>
                    </div>`;
                }
            }
        );
        
        // Process \include{} commands (same as \input{} but with page break)
        processedContent = processedContent.replace(
            /\\include{([^}]+)}/g,
            (match, fileName) => {
                console.log(`Processing \\include{${fileName}}`);
                const fileContent = getFileContentByName(fileName);
                
                if (fileContent) {
                    // Extract content between \begin{document} and \end{document} if it exists
                    const documentMatch = fileContent.match(/\\begin{document}([\s\S]*?)\\end{document}/);
                    if (documentMatch) {
                        console.log(`Including document content from ${fileName} with page break`);
                        return documentMatch[1].trim() + '\n\n<div style="page-break-after: always;"></div>\n\n';
                    } else {
                        // If no document environment, return the whole content with page break
                        console.log(`Including full content from ${fileName} with page break`);
                        return fileContent + '\n\n<div style="page-break-after: always;"></div>\n\n';
                    }
                } else {
                    console.log(`File ${fileName} not found for \\include{}`);
                    return `<div class="error" style="background-color: #fee; border: 1px solid #fcc; padding: 8px; margin: 8px 0; border-radius: 4px; color: #c33;">
                        <strong>Error:</strong> File '${fileName}' not found for \\include{} command.<br>
                        <small>Make sure the file exists in your LaTeX project file tree.</small>
                    </div>`;
                }
            }
        );
        
        return processedContent;
    };

    // Process LaTeX content more simply by treating each section as a separate block
    const processLatexSectionsSimple = (content: string) => {
        let processedContent = content;
        
        // Track chapter and section numbers for proper numbering
        let chapterNum = 0;
        let sectionNum = 0;
        let subsectionNum = 0;
        
        // Process chapters with proper formatting
        processedContent = processedContent.replace(/\\chapter{([^}]+)}/g, (match, title) => {
            chapterNum++;
            sectionNum = 0; // Reset section counter for new chapter
            subsectionNum = 0; // Reset subsection counter for new chapter
            return `
                <div class="latex-chapter-header">
                    <div class="latex-chapter-title">CHAPTER ${chapterNum}</div>
                    <div class="latex-chapter-line"></div>
                </div>
                <h1 class="latex-chapter">${title}</h1>
            `;
        });
        
        // Process sections without numbering
        processedContent = processedContent.replace(/\\section{([^}]+)}/g, (match, title) => {
            sectionNum++;
            subsectionNum = 0; // Reset subsection counter for new section
            return `<h2 class="latex-section">${title}</h2>`;
        });
        
        // Process subsections without numbering
        processedContent = processedContent.replace(/\\subsection{([^}]+)}/g, (match, title) => {
            subsectionNum++;
            return `<h3 class="latex-subsection">${title}</h3>`;
        });
        
        // Process subsubsections
        processedContent = processedContent.replace(/\\subsubsection{([^}]+)}/g, '<h4 class="latex-subsubsection">$1</h4>');
        
        // Process paragraphs
        processedContent = processedContent.replace(/\\paragraph{([^}]+)}/g, '<h5 class="latex-paragraph">$1</h5>');
        
        // Process subparagraphs
        processedContent = processedContent.replace(/\\subparagraph{([^}]+)}/g, '<h6 class="latex-subparagraph">$1</h6>');

        return processedContent;
    };

    // Compile LaTeX to PDF using external API
    const compileLatexToPDF = async () => {
        if (!latexContent.trim()) {
            setCompilationLog('LaTeX content is required.\n');
            return;
            }

        setIsCompiling(true);
        setCompilationLog('Starting compilation...\n');

        try {
            // Get file tree for multi-file support
            const filesObject: Record<string, string> = {};
            
            // Prepare files object if file tree is available
            if (user) {
                try {
                    const { getLatexFileTree } = require('../utils/fileTreeStorage');
                    const { getSavedLatexProjects } = require('../utils/latexProjectStorage');
                    
                    const fileTree = getLatexFileTree(user.id, user.role);
                    const projects = getSavedLatexProjects(user.id, user.role);
                    
                    // Extract file references from LaTeX content (for \input{} and \include{})
                    const inputRegex = /\\(?:input|include)\{([^}]+)\}/g;
                    let match;
                    while ((match = inputRegex.exec(latexContent)) !== null) {
                        const fileName = match[1];
                        const project = projects.find((p: any) => p.name === fileName || p.name === `${fileName}.tex`);
                        if (project && project.content) {
                            filesObject[fileName.includes('.tex') ? fileName : `${fileName}.tex`] = project.content;
                        }
                    }
                } catch (error) {
                    console.error('Error getting file tree:', error);
                                }
            }

            const response = await fetch('/api/latex/compile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    latex: latexContent,
                    mainFile: 'main.tex',
                    files: filesObject,
                }),
            });

            const data = await response.json();

            if (data.success && data.pdf) {
                setPdfUrl(data.pdf);
                setCompilationLog(prev => prev + '\nCompilation successful! ✓\n' + (data.log || ''));
                        } else {
                setCompilationLog(prev => prev + '\nCompilation failed! ✗\n' + (data.log || data.error || ''));
                setPdfUrl(null);
                }
        } catch (error: any) {
            setCompilationLog(prev => prev + `\nError: ${error.message}\n`);
            setPdfUrl(null);
        } finally {
            setIsCompiling(false);
        }
    };

    // Change tracking functions
    const trackDocumentChange = (content: string) => {
        if (!projectId) return;

        // Determine change type based on content comparison
        let changeType: 'insertion' | 'deletion' | 'modification' | 'save' = 'modification';
        let changeDescription = 'Document modified';

        if (lastSavedContent === '') {
            changeType = 'save';
            changeDescription = 'Document created';
        } else if (content.length > lastSavedContent.length) {
            changeType = 'insertion';
            changeDescription = 'Content added';
        } else if (content.length < lastSavedContent.length) {
            changeType = 'deletion';
            changeDescription = 'Content removed';
        }

        // Add version to tracking
        addLatexProjectVersion(
            projectId,
            content,
            user?.id,
            user?.role,
            `Modified by ${user?.name || user?.email || 'user'}`,
            changeType,
            changeDescription
        );

        // Update last saved content
        setLastSavedContent(content);
    };

    // Function to track changes when document is saved
    const trackSaveEvent = () => {
        if (changeTrackingEnabled && projectId && latexContent) {
            // Check if there are meaningful changes before creating a version
            if (hasMeaningfulChanges(projectId, latexContent)) {
                console.log('Tracking save event for project:', projectId, 'Content length:', latexContent.length);
                trackDocumentChange(latexContent);
            } else {
                console.log('Skipping version tracking - no meaningful changes detected');
            }
        } else {
            console.log('Skipping version tracking - tracking disabled or no project ID');
        }
    };

    // Track changes when document is saved (either auto-save or manual save)
    useEffect(() => {
        if (isSaving === false && latexContent && projectId) {
            // Only track if we have meaningful changes
            if (hasMeaningfulChanges(projectId, latexContent)) {
                console.log('Document was saved with meaningful changes, tracking version');
                trackSaveEvent();
            } else {
                console.log('Document was saved but no meaningful changes detected');
            }
            // Notify parent component that save is complete
            if (onSaveComplete) {
                onSaveComplete();
            }
        }
    }, [isSaving, onSaveComplete]);

    // Override the onManualSave prop to include change tracking
    const handleManualSave = () => {
        console.log('LatexEditor handleManualSave called, onManualSave prop:', !!onManualSave);
        if (onManualSave) {
            console.log('Calling onManualSave prop');
            onManualSave();
            // Track the save event after a short delay to ensure the save completes
            // Only track if there are meaningful changes
            setTimeout(() => {
                if (changeTrackingEnabled && projectId && latexContent && hasMeaningfulChanges(projectId, latexContent)) {
                    console.log('Manual save completed with meaningful changes, tracking version');
                    trackSaveEvent();
                } else {
                    console.log('Manual save completed but no meaningful changes to track');
                }
            }, 100);
        } else {
            console.log('onManualSave prop is not provided');
        }
    };

    // Process all section content in a single pass to handle nested structures
    const processLatexSections = (content: string) => {
        // First, we need to handle all section types properly
        const headings = ["section", "subsection", "subsubsection", "paragraph", "subparagraph"];
        const htmlTags = ["h2", "h3", "h4", "h5", "h6"];

        let processedContent = content;

        // Special handling to prepare content by adding markers for content
        headings.forEach((heading) => {
            // Find all heading instances
            const regex = new RegExp(`\\\\${heading}{([^}]+)}`, 'g');
            let tempContent = '';
            let lastIndex = 0;
            let match: RegExpExecArray | null;

            // Process each match and add markers for the content that follows
            while ((match = regex.exec(processedContent)) !== null) {
                // Add everything before this match
                tempContent += processedContent.substring(lastIndex, match.index);

                // Add the heading with a unique marker
                const headingTitle = match[1];
                const markerID = `${heading}-${Math.random().toString(36).substring(2, 9)}`;
                tempContent += `<div class="latex-${heading}" id="${markerID}">
                    <${heading === "section" ? "h2" :
                        heading === "subsection" ? "h3" :
                            heading === "subsubsection" ? "h4" :
                                heading === "paragraph" ? "h5" : "h6"} 
                      class="${heading}-title">${headingTitle}</${heading === "section" ? "h2" :
                        heading === "subsection" ? "h3" :
                            heading === "subsubsection" ? "h4" :
                                heading === "paragraph" ? "h5" : "h6"}>
                    <div class="${heading}-content">`;

                lastIndex = match.index + match[0].length;
            }

            // Add the rest of the content
            if (lastIndex < processedContent.length) {
                tempContent += processedContent.substring(lastIndex);
            }

            processedContent = tempContent;
        });

        // Close all content divs
        headings.forEach((heading) => {
            processedContent = processedContent.replace(new RegExp(`<div class="${heading}-content">`, 'g'),
                `<div class="${heading}-content">`);
        });

        // Clean up by adding closing div tags
        let closeCount = 0;
        headings.forEach((heading) => {
            const openTags = (processedContent.match(new RegExp(`<div class="latex-${heading}"`, 'g')) || []).length;
            closeCount += openTags;
        });

        // Add closing div tags at the end
        for (let i = 0; i < closeCount; i++) {
            processedContent += '</div>';
        }

        return processedContent;
    };

    const handleEditorChange = (value: string | undefined) => {
        console.log('LatexEditor handleEditorChange called with:', value?.substring(0, 100) + '...');
        if (value !== undefined) {
            setLatexContent(value);
            // Call the onContentChange prop if provided
            if (onContentChange) {
                console.log('LatexEditor calling onContentChange with:', value.substring(0, 100) + '...');
                onContentChange(value);
            } else {
                console.log('LatexEditor onContentChange prop is not provided');
            }
        }
    };

    const handleEditorDidMount = (editor: any, monaco: any) => {
        setEditorInstance(editor);

        // Prevent scrolling in editor from affecting the page
        const editorElement = editor.getDomNode();
        if (editorElement) {
            editorElement.addEventListener('wheel', (e: WheelEvent) => {
                e.stopPropagation();
            }, { passive: false });
        }

        // Add keyboard shortcut handling directly to the editor
        if (monaco) {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
                const editorDomNode = editor.getDomNode();
                if (!editorDomNode) return;

                const cursor = editorDomNode.querySelector('.cursors-layer .cursor');
                const position = editor.getPosition();

                if (cursor && position) {
                    const cursorRect = cursor.getBoundingClientRect();
                    const dropdownHeight = 220; // Estimated height of the dropdown

                    let top = cursorRect.bottom;
                    if (top + dropdownHeight > window.innerHeight) {
                        top = cursorRect.top - dropdownHeight;
                    }

                    setDropdownPosition({ top, left: cursorRect.left });
                } else {
                    const fallbackPosition = editor.getScrolledVisibleRange().getTopLeft();
                    setDropdownPosition(fallbackPosition);
                }

                setShowTextStyleDropdown(true);
                setSelectedDropdownIndex(0);
            });
        }
    };

    const toggleFullscreen = () => {
        setIsPreviewFullscreen(!isPreviewFullscreen);
    };

    const handleDownloadPDF = async () => {
        try {
            // If we have a compiled PDF, use it directly
            if (pdfUrl) {
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.download = 'document.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return;
                }
                
            // Otherwise, compile first and then download
            if (!isCompiling) {
                await compileLatexToPDF();
                // Wait for compilation to complete
                let attempts = 0;
                while (!pdfUrl && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                }
                if (pdfUrl) {
                    const link = document.createElement('a');
                    link.href = pdfUrl;
                    link.download = 'document.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    return;
                } else {
                    alert('PDF compilation failed. Please check the compilation logs.');
                    return;
                }
            }
            
            // If compiling, show message
            alert('PDF is currently being compiled. Please wait...');
            return;
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Error downloading PDF. Please try compiling first.');
        } finally {
            // Reset button state
            const downloadButton = document.getElementById('download-pdf-button');
            if (downloadButton) {
                downloadButton.innerText = 'Download PDF';
                downloadButton.removeAttribute('disabled');
            }
        }
    };

    // Add this function before handleDownloadWord to handle text formatting conversion
    // This function converts LaTeX formatted text to an array of TextRun elements for Word
    const convertFormattedText = (text: string): TextRun[] => {
        const textRuns: TextRun[] = [];

        // Handle special text formatting (bold, italic, underline)
        let remainingText = text;
        let formatMatch;

        // Regular expression to match LaTeX formatting commands
        const formatRegex = /\\textbf{([^}]*)}|\\textit{([^}]*)}|\\underline{([^}]*)}|\\textrm{([^}]*)}|\\textsf{([^}]*)}|\\texttt{([^}]*)}|\\small{([^}]*)}|\\normalsize{([^}]*)}|\\large{([^}]*)}|\\huge{([^}]*)}|\\emph{([^}]*)}/g;

        // Track the last index to handle plain text between formatted text
        let lastIndex = 0;

        while ((formatMatch = formatRegex.exec(remainingText)) !== null) {
            // Add plain text before this formatted text
            if (formatMatch.index > lastIndex) {
                const plainText = remainingText.substring(lastIndex, formatMatch.index);
                if (plainText) {
                    textRuns.push(new TextRun({ text: plainText }));
                }
            }

            // Handle different formatting types
            if (formatMatch[1]) { // Bold: \textbf
                textRuns.push(new TextRun({ text: formatMatch[1], bold: true }));
            } else if (formatMatch[2]) { // Italic: \textit
                textRuns.push(new TextRun({ text: formatMatch[2], italics: true }));
            } else if (formatMatch[3]) { // Underline: \underline
                textRuns.push(new TextRun({ text: formatMatch[3], underline: {} }));
            } else if (formatMatch[4]) { // Roman: \textrm
                textRuns.push(new TextRun({ text: formatMatch[4], font: "Times New Roman" }));
            } else if (formatMatch[5]) { // Sans: \textsf
                textRuns.push(new TextRun({ text: formatMatch[5], font: "Arial" }));
            } else if (formatMatch[6]) { // Typewriter: \texttt
                textRuns.push(new TextRun({ text: formatMatch[6], font: "Courier New" }));
            } else if (formatMatch[7]) { // Small: \small
                textRuns.push(new TextRun({ text: formatMatch[7], size: 18 })); // ~9pt
            } else if (formatMatch[8]) { // Normal: \normalsize
                textRuns.push(new TextRun({ text: formatMatch[8], size: 24 })); // ~12pt
            } else if (formatMatch[9]) { // Large: \large
                textRuns.push(new TextRun({ text: formatMatch[9], size: 32 })); // ~16pt
            } else if (formatMatch[10]) { // Huge: \huge
                textRuns.push(new TextRun({ text: formatMatch[10], size: 40 })); // ~20pt
            } else if (formatMatch[11]) { // Emphasis: \emph
                textRuns.push(new TextRun({ text: formatMatch[11], italics: true }));
            }

            lastIndex = formatMatch.index + formatMatch[0].length;
        }

        // Add any remaining plain text
        if (lastIndex < remainingText.length) {
            const plainText = remainingText.substring(lastIndex);
            if (plainText) {
                textRuns.push(new TextRun({ text: plainText }));
            }
        }

        // If no formatting was found, return the original text as a TextRun
        if (textRuns.length === 0) {
            textRuns.push(new TextRun({ text }));
        }

        return textRuns;
    };

    // Add this function to parse and convert LaTeX tables to Word tables
    const parseLatexTable = (tableContent: string, caption?: string): Table => {
        // Split the table content into rows
        const rowsRaw = tableContent.split('\\hline').map(part => part.trim()).filter(part => part.length > 0);
        const rows: TableRow[] = [];

        for (const rowContent of rowsRaw) {
            // Split by \\ to handle multiple rows between \hlines
            const rowParts = rowContent.split('\\\\').map(row => row.trim()).filter(row => row.length > 0);

            for (const rowPart of rowParts) {
                const cells = rowPart.split('&').map(cell => cell.trim());

                // Create a row with cells
                const tableRow = new TableRow({
                    children: cells.map(cellContent =>
                        new TableCell({
                            children: [
                                new Paragraph({
                                    children: convertFormattedText(cellContent),
                                    alignment: AlignmentType.CENTER,
                                }),
                            ],
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                                bottom: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                                left: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                                right: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                            },
                        })
                    ),
                });

                rows.push(tableRow);
            }
        }

        // Create a table with the rows
        return new Table({
            rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
        });
    };

    const handleDownloadWord = async () => {
        try {
            // Show loading state
            const downloadButton = document.getElementById('download-word-button');
            if (downloadButton) {
                downloadButton.innerText = 'Generating...';
                downloadButton.setAttribute('disabled', 'true');
            }

            // Get document information
            const titleMatch = latexContent.match(/\\title{(.*?)}/);
            const authorMatch = latexContent.match(/\\author{(.*?)}/);
            const dateMatch = latexContent.match(/\\date{(.*?)}/);

            const documentTitle = titleMatch ? titleMatch[1].trim() : 'LaTeX Document';
            const documentAuthor = authorMatch ? authorMatch[1].trim() : 'Your Name';
            const documentDate = dateMatch && dateMatch[1] !== '\\today'
                ? dateMatch[1].trim()
                : new Date().toLocaleDateString();

            // Create document sections array
            const documentElements: (Paragraph | Table)[] = [];

            // Add title and metadata as first elements
            documentElements.push(
                new Paragraph({
                    text: documentTitle,
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: {
                        after: 200,
                    },
                })
            );

            documentElements.push(
                new Paragraph({
                    text: `By ${documentAuthor}`,
                    alignment: AlignmentType.CENTER,
                    spacing: {
                        after: 200,
                    },
                })
            );

            documentElements.push(
                new Paragraph({
                    text: documentDate,
                    alignment: AlignmentType.CENTER,
                    spacing: {
                        after: 400,
                    },
                })
            );

            // Extract the main content between \begin{document} and \end{document}
            const documentContent = latexContent.split('\\begin{document}')[1]?.split('\\end{document}')[0] || '';

            // Process the entire content with a more complete pattern to ensure we capture all elements
            const contentPattern = /\\section{([^}]+)}|\\subsection{([^}]+)}|\\subsubsection{([^}]+)}|\\paragraph{([^}]+)}|\\subparagraph{([^}]+)}|\\begin{itemize}([\s\S]*?)\\end{itemize}|\\begin{enumerate}([\s\S]*?)\\end{enumerate}|\\begin{table}([\s\S]*?)\\end{table}|\\maketitle/g;

            // Create a structured representation of the document
            const parsedContent: { type: string; title?: string; content?: string; level?: number; tableContent?: string }[] = [];

            // First, extract all structural elements to maintain proper order
            let lastIndex = 0;
            let match: RegExpExecArray | null;

            // Remove the maketitle command as we've already added the title
            const contentWithoutMaketitle = documentContent.replace('\\maketitle', '');

            while ((match = contentPattern.exec(contentWithoutMaketitle)) !== null) {
                // Add any text before this element
                if (match.index > lastIndex) {
                    const textBefore = contentWithoutMaketitle.substring(lastIndex, match.index).trim();
                    if (textBefore) {
                        parsedContent.push({ type: 'text', content: textBefore });
                    }
                }

                // Determine the type of element
                if (match[0].startsWith('\\maketitle')) {
                    // Skip, already handled
                } else if (match[1]) { // section
                    parsedContent.push({ type: 'section', title: match[1], level: 1 });
                } else if (match[2]) { // subsection
                    parsedContent.push({ type: 'section', title: match[2], level: 2 });
                } else if (match[3]) { // subsubsection
                    parsedContent.push({ type: 'section', title: match[3], level: 3 });
                } else if (match[4]) { // paragraph - this should be normal text, not italic
                    parsedContent.push({ type: 'paragraph', title: match[4] });
                } else if (match[5]) { // subparagraph - this should be italic
                    parsedContent.push({ type: 'subparagraph', title: match[5] });
                } else if (match[6]) { // itemize (bulleted list)
                    parsedContent.push({ type: 'itemize', content: match[6] });
                } else if (match[7]) { // enumerate (numbered list)
                    parsedContent.push({ type: 'enumerate', content: match[7] });
                } else if (match[8]) { // complete table environment
                    parsedContent.push({ type: 'completeTable', tableContent: match[8] });
                }

                lastIndex = match.index + match[0].length;
            }

            // Add any remaining text
            if (lastIndex < contentWithoutMaketitle.length) {
                const textAfter = contentWithoutMaketitle.substring(lastIndex).trim();
                if (textAfter) {
                    parsedContent.push({ type: 'text', content: textAfter });
                }
            }

            // Find paragraph and subparagraph commands that might have been missed
            const paragraphRegex = /\\paragraph{([^}]+)}/g;
            let paragraphMatch: RegExpExecArray | null;
            while ((paragraphMatch = paragraphRegex.exec(contentWithoutMaketitle)) !== null) {
                // Since we're inside the loop, we know paragraphMatch is not null
                const paragraphTitle = paragraphMatch[1];
                if (!parsedContent.some(item => item.type === 'paragraph' && item.title === paragraphTitle)) {
                    parsedContent.push({ type: 'paragraph', title: paragraphTitle });
                }
            }

            const subparagraphRegex = /\\subparagraph{([^}]+)}/g;
            let subparagraphMatch: RegExpExecArray | null;
            while ((subparagraphMatch = subparagraphRegex.exec(contentWithoutMaketitle)) !== null) {
                // Since we're inside the loop, we know subparagraphMatch is not null
                const subparagraphTitle = subparagraphMatch[1];
                if (!parsedContent.some(item => item.type === 'subparagraph' && item.title === subparagraphTitle)) {
                    parsedContent.push({ type: 'subparagraph', title: subparagraphTitle });
                }
            }

            // Now convert the parsed structure to Word elements
            for (const item of parsedContent) {
                switch (item.type) {
                    case 'section':
                        let headingLevel;
                        switch (item.level) {
                            case 1: headingLevel = HeadingLevel.HEADING_1; break;
                            case 2: headingLevel = HeadingLevel.HEADING_2; break;
                            case 3: headingLevel = HeadingLevel.HEADING_3; break;
                            default: headingLevel = HeadingLevel.HEADING_1;
                        }

                        // Add section title with appropriate color for Introduction and Lists
                        if (item.title === 'Introduction' || item.title === 'Lists') {
                            documentElements.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: item.title,
                                            color: '4472C4',  // Blue color for section titles
                                            size: 28,
                                        })
                                    ],
                                    heading: headingLevel,
                                    spacing: {
                                        before: 400,
                                        after: 200,
                                    },
                                })
                            );
                        } else {
                            documentElements.push(
                                new Paragraph({
                                    text: item.title,
                                    heading: headingLevel,
                                    spacing: {
                                        before: 400,
                                        after: 200,
                                    },
                                })
                            );
                        }
                        break;

                    case 'paragraph':
                        // Normal text for paragraphs (not italic)
                        documentElements.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: item.title || '',
                                        // Regular text - no special formatting
                                    })
                                ],
                                spacing: {
                                    after: 120,
                                },
                            })
                        );
                        break;

                    case 'subparagraph':
                        // Properly handle subparagraph content which might already contain formatting commands
                        const title = item.title || '';
                        // Check if this already has \textit formatting
                        const hasItalicCommand = title.includes('\\textit{');

                        if (hasItalicCommand) {
                            // Extract the text inside \textit{...}
                            const italicTextMatch = title.match(/\\textit{([^}]*)}/);
                            const italicText = italicTextMatch ? italicTextMatch[1] : title;

                            documentElements.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: italicText,
                                            italics: true,
                                        })
                                    ],
                                    spacing: {
                                        after: 120,
                                    },
                                })
                            );
                        } else {
                            // Regular subparagraph handling - apply italics to the whole text
                            documentElements.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: title,
                                            italics: true,  // Make subparagraphs italic
                                        })
                                    ],
                                    spacing: {
                                        after: 120,
                                    },
                                })
                            );
                        }
                        break;

                    case 'itemize':
                        if (item.content) {
                            // Process list items
                            const items = item.content.split('\\item')
                                .map(item => item.trim())
                                .filter(item => item.length > 0);

                            items.forEach(itemText => {
                                documentElements.push(
                                    new Paragraph({
                                        children: convertFormattedText(itemText),
                                        bullet: {
                                            level: 0
                                        },
                                        spacing: {
                                            after: 100,
                                        },
                                    })
                                );
                            });
                        }
                        break;

                    case 'enumerate':
                        if (item.content) {
                            // Process numbered list items
                            const items = item.content.split('\\item')
                                .map(item => item.trim())
                                .filter(item => item.length > 0);

                            items.forEach((itemText, index) => {
                                documentElements.push(
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: `${index + 1}. ` }),
                                            ...convertFormattedText(itemText)
                                        ],
                                        spacing: {
                                            after: 100,
                                        },
                                        indent: {
                                            left: 720, // ~0.5 inch
                                            hanging: 360, // ~0.25 inch
                                        }
                                    })
                                );
                            });
                        }
                        break;

                    case 'completeTable':
                        if (item.tableContent) {
                            // Extract the important parts from the complete table environment
                            let caption: string | undefined;

                            // Try to extract the caption
                            const captionMatch = item.tableContent.match(/\\caption{([^}]*)}/);
                            if (captionMatch) {
                                caption = captionMatch[1];
                            }

                            // Find the tabular environment
                            const tabularMatch = item.tableContent.match(/\\begin{tabular}{([^}]*)}([\s\S]*?)\\end{tabular}/);

                            if (tabularMatch) {
                                // Check for text right before the table that looks like a table label
                                const previousItem = parsedContent[parsedContent.indexOf(item) - 1];
                                let tableLabel = '';

                                if (previousItem && previousItem.type === 'text' &&
                                    previousItem.content &&
                                    previousItem.content.trim().match(/Table(.*?\d+)?/i)) {
                                    tableLabel = previousItem.content.trim();

                                    // Add the table label
                                    documentElements.push(
                                        new Paragraph({
                                            text: tableLabel,
                                            alignment: AlignmentType.CENTER,
                                            spacing: {
                                                before: 120,
                                                after: 60,
                                            },
                                        })
                                    );
                                }

                                // Add the table caption if it exists
                                if (caption) {
                                    documentElements.push(
                                        new Paragraph({
                                            text: caption,
                                            alignment: AlignmentType.CENTER,
                                            spacing: {
                                                before: 0,
                                                after: 120,
                                            },
                                            style: "Caption"
                                        })
                                    );
                                }

                                // Parse and add the table
                                documentElements.push(parseLatexTable(tabularMatch[2]));
                            }
                        }
                        break;

                    case 'text':
                        if (item.content) {
                            // Process regular text paragraphs
                            // First check if this contains a standalone tabular environment
                            const tabularMatch = item.content.match(/\\begin{tabular}{([^}]*)}([\s\S]*?)\\end{tabular}/);

                            if (tabularMatch) {
                                // Extract any text before the table
                                const textBeforeTable = item.content.substring(0, item.content.indexOf('\\begin{tabular')).trim();
                                if (textBeforeTable) {
                                    processTextContent(textBeforeTable, documentElements);
                                }

                                // Add the table
                                documentElements.push(parseLatexTable(tabularMatch[2]));

                                // Extract any text after the table
                                const textAfterTable = item.content.substring(item.content.indexOf('\\end{tabular}') + '\\end{tabular}'.length).trim();
                                if (textAfterTable) {
                                    processTextContent(textAfterTable, documentElements);
                                }
                            } else {
                                // No table in this text, process normally
                                processTextContent(item.content, documentElements);
                            }
                        }
                        break;
                }
            }

            // Create a new Word document with proper structure
            const doc = new Document({
                sections: [
                    {
                        properties: {},
                        children: documentElements
                    }
                ],
                creator: "LaTeX Editor",
                title: documentTitle,
                description: "Generated from LaTeX Editor",
            });

            // Create a Blob from the Word document
            const buffer = await Packer.toBuffer(doc);
            const arrayBuffer = new ArrayBuffer(buffer.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            uint8Array.set(buffer);
            const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${documentTitle}.docx`;
            document.body.appendChild(a);
            a.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Error generating Word document:', error);
            alert('Error generating Word document. Please try again.');
        } finally {
            // Reset button state
            const downloadButton = document.getElementById('download-word-button');
            if (downloadButton) {
                downloadButton.innerText = 'Download Word';
                downloadButton.removeAttribute('disabled');
            }
        }
    };

    // Helper function to process text content and add it to the document elements
    const processTextContent = (content: string, documentElements: (Paragraph | Table)[]) => {
        const cleanText = content.trim();

        if (cleanText) {
            const paragraphs = cleanText
                .split(/\n\s*\n/)
                .filter(p => p.trim().length > 0);

            paragraphs.forEach(para => {
                // Check if this paragraph looks like "This is a paragraph."
                if (para.trim().match(/This is a paragraph\./i)) {
                    documentElements.push(
                        new Paragraph({
                            children: convertFormattedText(para.trim()),
                            spacing: {
                                after: 120,
                            },
                        })
                    );
                }
                // Check if this paragraph looks like "This is a subparagraph."
                else if (para.trim().match(/This is a subparagraph\./i)) {
                    // Check if the paragraph already has formatting commands
                    const hasFormattingCommand = para.includes('\\textit{') ||
                        para.includes('\\textbf{') ||
                        para.includes('\\underline{');

                    if (hasFormattingCommand) {
                        // If it has formatting commands, use the conversion function
                        documentElements.push(
                            new Paragraph({
                                children: convertFormattedText(para.trim()),
                                spacing: {
                                    after: 120,
                                },
                            })
                        );
                    } else {
                        // Standard text with default italics
                        documentElements.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: para.trim(),
                                        italics: true,
                                    })
                                ],
                                spacing: {
                                    after: 120,
                                },
                            })
                        );
                    }
                }
                // Regular paragraph
                else {
                    documentElements.push(
                        new Paragraph({
                            children: convertFormattedText(para.trim()),
                            spacing: {
                                after: 120,
                            },
                        })
                    );
                }
            });
        }
    };

    const insertTextAtCursor = (textBefore: string, textAfter: string = '') => {
        if (!editorInstance) return;

        const selection = editorInstance.getSelection();
        const id = { major: 1, minor: 1 };
        const text = editorInstance.getModel().getValueInRange(selection);

        // Use type assertion for monaco
        const monaco = (window as any).monaco;
        const range = new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
        );

        const op = {
            identifier: id,
            range: range,
            text: textBefore + text + textAfter,
            forceMoveMarkers: true
        };

        editorInstance.executeEdits("my-source", [op]);
        editorInstance.focus();
    };

    const insertBold = () => insertTextAtCursor("\\textbf{", "}");
    const insertItalic = () => insertTextAtCursor("\\textit{", "}");

    // Add dedicated insert equation function
    const insertEquation = () => {
        const formula = window.prompt('Enter LaTeX formula:', 'E = mc^2');
        if (!formula) return;
        insertTextAtCursor(`$$${formula}$$`, "");
    };

    const insertList = (type: string) => {
        if (type === 'bullet') {
            insertTextAtCursor("\\begin{itemize}\n  \\item ", "\n  \\item \n  \\item \n\\end{itemize}");
        } else if (type === 'numbered') {
            insertTextAtCursor("\\begin{enumerate}\n  \\item ", "\n  \\item \n  \\item \n\\end{enumerate}");
        }
    };

    const handleTextStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // Close all dropdowns first
        const dropdowns = document.querySelectorAll('#font-menu, #table-menu, #header-footer-menu');
        dropdowns.forEach(menu => {
            if (menu && !menu.classList.contains('hidden')) {
                menu.classList.add('hidden');
            }
        });

        const style = e.target.value;
        switch (style) {
            case 'normal':
                insertTextAtCursor("", "");
                break;
            case 'section':
                insertTextAtCursor("\\section{", "}");
                break;
            case 'subsection':
                insertTextAtCursor("\\subsection{", "}");
                break;
            case 'subsubsection':
                insertTextAtCursor("\\subsubsection{", "}");
                break;
            case 'paragraph':
                insertTextAtCursor("\\paragraph{", "}");
                break;
            case 'subparagraph':
                insertTextAtCursor("\\subparagraph{", "}");
                break;
            case 'equation':
                insertTextAtCursor("$$", "$$");
                break;
            case 'bullet-list':
                insertList('bullet');
                break;
            case 'numbered-list':
                insertList('numbered');
                break;
            default:
                break;
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(latexContent).then(
            () => {
                alert("LaTeX content copied to clipboard!");
            },
            () => {
                alert("Failed to copy to clipboard");
            }
        );
    };

    const editorOptions = {
        fontSize: 14,
        minimap: { enabled: false },
        wordWrap: 'on',
        lineNumbers: 'on',
        folding: true,
        tabSize: 2,
        scrollBeyondLastLine: false,
    };

    // Add a new function to handle font style changes
    const handleFontStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const fontType = e.target.value as 'roman' | 'sans' | 'typewriter' | 'georgia' | 'verdana' | 'trebuchet';

        if (fontType) {
            const fontCommands = {
                'roman': '\\textrm{',
                'sans': '\\textsf{',
                'typewriter': '\\texttt{',
                'georgia': '\\fontfamily{georgia}\\selectfont{',
                'verdana': '\\fontfamily{verdana}\\selectfont{',
                'trebuchet': '\\fontfamily{trebuchet}\\selectfont{'
            };

            // Check if we need to add the fontspec package for specific fonts
            if (['georgia', 'verdana', 'trebuchet'].includes(fontType) && !latexContent.includes('\\usepackage{fontspec}')) {
                // Find where to insert the package (before \begin{document})
                const beginDocIdx = latexContent.indexOf('\\begin{document}');
                if (beginDocIdx !== -1) {
                    // Add a comment explaining the XeLaTeX requirement
                    const packageCode = "\\usepackage{fontspec} % Note: These fonts require XeLaTeX or LuaLaTeX\n";
                    // Insert before \begin{document}
                    const newContent = latexContent.slice(0, beginDocIdx) +
                        packageCode +
                        latexContent.slice(beginDocIdx);
                    setLatexContent(newContent);

                    // Update editor content
                    if (editorInstance) {
                        editorInstance.setValue(newContent);
                    }

                    // Show a notification about XeLaTeX requirement
                    setTimeout(() => {
                        alert('Note: The selected font requires XeLaTeX or LuaLaTeX compilation. Standard LaTeX may not render this font correctly.');
                    }, 100);
                }
            }

            insertTextAtCursor(fontCommands[fontType], '}');
        }

        // Close any other dropdowns
        const dropdowns = document.querySelectorAll('#table-menu, #header-footer-menu');
        dropdowns.forEach(menu => {
            if (menu && !menu.classList.contains('hidden')) {
                menu.classList.add('hidden');
            }
        });
    };

    const insertTable = (rows: number, cols: number) => {
        let tableCode = "\\begin{table}[h!]\n  \\centering\n  \\begin{tabular}{";

        // Add column specifications - more standard LaTeX format
        for (let i = 0; i < cols; i++) {
            if (i === 0) tableCode += "|";
            tableCode += "c|";
        }
        tableCode += "}\n    \\hline\n    ";

        // Add rows
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                tableCode += "Cell " + (i + 1) + "," + (j + 1);
                if (j < cols - 1) tableCode += " & ";
            }
            tableCode += " \\\\\n    \\hline\n    ";
        }

        // Finalize table
        tableCode = tableCode.slice(0, -5); // Remove extra hline
        tableCode += "\\end{tabular}\n  \\caption{Table Caption}\n  \\label{tab:my_table}\n\\end{table}";

        insertTextAtCursor(tableCode, "");

        // Close the table menu after selection
        const menu = document.getElementById('table-menu');
        if (menu) menu.classList.add('hidden');
    };

    // Function to insert process management table template
    const insertProcessTable = () => {
        const tableName = window.prompt('Enter table name (optional):', 'Process Details Table');
        const caption = tableName || 'Process Details Table';
        
        const processTableCode = `\\begin{table}[h!]
  \\centering
  \\begin{tabular}{|c|c|c|c|}
    \\hline
    \\textbf{Process Name} & \\textbf{Description} & \\textbf{Process Owner} & \\textbf{Process Manager} \\\\
    \\hline
    & & & \\\\
    \\hline
  \\end{tabular}
  \\caption{${caption}}
  \\label{tab:process_details}
\\end{table}`;

        insertTextAtCursor(processTableCode, "");

        // Close the table menu after selection
        const menu = document.getElementById('table-menu');
        if (menu) menu.classList.add('hidden');
    };

    // Function to insert LaTeX template
    const insertLatexTemplate = () => {
        const preamble = generateLatexPreamble('report', '12pt,a4paper,twoside');
        const templateCode = `${preamble}

% Formatting for sections and subsections
\\titleformat{\\section}{\\normalfont\\Large\\bfseries}{\\thesection.}{1em}{}
\\titleformat{\\subsection}{\\normalfont\\large\\bfseries}{\\thesubsection}{1em}{}

\\begin{document}

\\tableofcontents
\\newpage

\\section{Introduction}
\\subsection{Goal}
% Write content here

\\subsection{Objective}
% Write content here

\\subsection{Triggers, Inputs \\& Outputs}
% Write content here

\\subsection{Process Design}
% Write content here

\\subsection{High Level (Mega) Process Design}
% Write content here

\\subsection{Process Overview}
% Write content here

\\subsection{Detailed Explanation of Process}
% Write content here

\\section{Process Implementation}
\\subsection{Process Roles}
% Write content here

\\subsection{Metrics}
% Write content here

\\subsection{KPI's}
% Write content here

\\subsection{Process Challenges and Risks}
% Write content here

\\section{Reference Guidelines}
\\subsection{Reference Process/Template Documents (If Any)}
% Write content here

\\subsection{Framework and Standards References (If Any)}
% Write content here

\\section{Appendices}
\\subsection{Appendix I: Glossary}
% Write content here

\\section{Disclaimer}
% Write content here

\\section{Abbreviations}
% Write content here

\\section{Flowchart Guidelines}
% Write content here

\\end{document}`;

        insertTextAtCursor(templateCode, "");
    };

    const insertImage = () => {
        // Create an input element for file selection
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        // Handle file selection
        fileInput.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const fileName = file.name;
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target?.result as string;
                    setImageMap(prev => ({ ...prev, [fileName]: dataUrl }));
                    // Insert LaTeX code after image is loaded
                    const imageCode = `\\begin{figure}[h!]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{${fileName}}\n  \\caption{Image Caption}\n  \\label{fig:${fileName.replace(/\.\w+$/, '').replace(/\s+/g, '_')}}\n\\end{figure}`;
                    insertTextAtCursor(imageCode, "");
                };
                reader.readAsDataURL(file);
            }
            // Clean up
            document.body.removeChild(fileInput);
        };
        fileInput.click();
    };

    const insertHeaderFooter = (type: string) => {
        // Package inclusion - check if it's already in the preamble
        const hasFancyhdr = latexContent.includes('\\usepackage{fancyhdr}');
        const hasPagestyleFancy = latexContent.includes('\\pagestyle{fancy}');

        let headerFooterCode = '';

        if (!hasFancyhdr) {
            headerFooterCode += "\\usepackage{fancyhdr}\n";
        }

        if (!hasPagestyleFancy) {
            headerFooterCode += "\\pagestyle{fancy}\n\\fancyhf{}\n"; // Clear all headers and footers
        }

        if (type === 'header') {
            headerFooterCode += `\\fancyhead[L]{Left Header}
\\fancyhead[C]{Center Header}
\\fancyhead[R]{Right Header}`;

            // Provide guidance on using the header
            setTimeout(() => {
                alert(
                    `Header added! Usage guide:
- [L], [C], [R] indicate left, center, right alignment
- You can use variables like \\thepage, \\thesection, \\leftmark, etc.
- Example: \\fancyhead[R]{Page \\thepage}
- Add \\renewcommand{\\headrulewidth}{0.4pt} to control the header line`
                );
            }, 100);
        } else if (type === 'footer') {
            headerFooterCode += `\\fancyfoot[L]{Left Footer}
\\fancyfoot[C]{Page \\thepage}
\\fancyfoot[R]{Right Footer}`;

            // Provide guidance on using the footer
            setTimeout(() => {
                alert(
                    `Footer added! Usage guide:
- [L], [C], [R] indicate left, center, right alignment
- You can use variables like \\thepage, \\thesection, etc.
- Example: \\fancyfoot[C]{Page \\thepage\\ of \\pageref{LastPage}}
- Add \\renewcommand{\\footrulewidth}{0.4pt} to add a footer line
- Add \\usepackage{lastpage} to access total pages`
                );
            }, 100);
        }

        // Find where to insert the code (before \begin{document})
        const beginDocIdx = latexContent.indexOf('\\begin{document}');
        if (beginDocIdx !== -1) {
            // Insert before \begin{document}
            const newContent = latexContent.slice(0, beginDocIdx) +
                headerFooterCode + '\n\n' +
                latexContent.slice(beginDocIdx);
            setLatexContent(newContent);

            // Update editor content
            if (editorInstance) {
                editorInstance.setValue(newContent);
            }
        } else {
            // Just insert at cursor if \begin{document} not found
            insertTextAtCursor(headerFooterCode, "");
        }

        // Close the header-footer menu after selection
        const menu = document.getElementById('header-footer-menu');
        if (menu) menu.classList.add('hidden');
    };

    // Improve dropdown handling
    useEffect(() => {
        // Close all dropdowns when clicking outside of them
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Skip if clicking on a button that toggles a dropdown
            const buttonElement = target.closest('button');
            const isToggleButton = buttonElement !== null &&
                (buttonElement.getAttribute('title') === 'Font' ||
                    buttonElement.getAttribute('title') === 'Insert Table');

            if (!isToggleButton) {
                // Close all dropdowns
                const dropdowns = document.querySelectorAll('#font-menu, #table-menu, #header-footer-menu');
                dropdowns.forEach(menu => {
                    if (menu && !menu.classList.contains('hidden')) {
                        menu.classList.add('hidden');
                    }
                });
            }
        };

        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);




    // Update the HTML to LaTeX conversion to fix duplicate author and raw LaTeX issues
    const convertHtmlToLatex = (html: string): string => {
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Check if an element is empty (contains only whitespace)
        const isElementEmpty = (element: HTMLElement): boolean => {
            return element.innerHTML.trim() === '';
        };

        // Remove empty text nodes to clean up the HTML tree
        const removeEmptyNodes = (element: Node) => {
            const childNodes = Array.from(element.childNodes);

            for (let i = childNodes.length - 1; i >= 0; i--) {
                const child = childNodes[i];

                // Process child elements recursively
                if (child.nodeType === Node.ELEMENT_NODE) {
                    removeEmptyNodes(child);
                }

                // Remove empty text nodes
                if (
                    (child.nodeType === Node.TEXT_NODE && (!child.textContent || child.textContent.trim() === '')) ||
                    (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).innerHTML.trim() === '')
                ) {
                    // Skip removal of elements we want to keep even if empty (like br)
                    const tagName = child.nodeName.toLowerCase();
                    if (tagName !== 'br' && tagName !== 'hr') {
                        element.removeChild(child);
                    }
                }
            }
        };

        // Track processed elements to avoid duplicates
        const processedContent = {
            hasTitle: false,
            hasAuthor: false,
            hasDate: false,
            skipFirstHeading: false,
            processedCaptions: new Set<string>(), // Track caption text to avoid duplicates
            authorName: "LaTeX Editor" // Default author name
        };

        // Forward declare processNode for TypeScript
        let processNode: (node: Node, nestingLevel?: number) => string;

        // Preprocess function to properly structure numbered lists
        const preprocessLists = (element: Node) => {
            // Find all text nodes that look like numbered list items but aren't in a proper list
            // Example: "1. Item text", "2. Another item"
            const textNodes: Node[] = [];
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                null
            );

            let node: Node | null;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }

            // Group potential list items
            let currentNumberedList: Array<Node> = [];
            let currentNumber = 1;

            for (let i = 0; i < textNodes.length; i++) {
                const node = textNodes[i];
                const text = node.textContent?.trim() || '';

                // Check if this text node looks like a numbered list item
                const listItemMatch = text.match(/^\s*(\d+)\.\s+(.+)$/);

                if (listItemMatch) {
                    const itemNumber = parseInt(listItemMatch[1]);
                    const itemContent = listItemMatch[2];

                    // If this is the start of a new list or continuation
                    if (currentNumberedList.length === 0 || itemNumber === currentNumber) {
                        currentNumberedList.push(node);
                        currentNumber = itemNumber + 1;
                    } else {
                        // This is not part of the current list
                        if (currentNumberedList.length > 0) {
                            // Convert the accumulated list to an OL/LI structure
                            convertToProperList(currentNumberedList);
                            currentNumberedList = [node];
                            currentNumber = itemNumber + 1;
                        }
                    }
                } else if (currentNumberedList.length > 0) {
                    // This text isn't a list item, so convert any accumulated list
                    convertToProperList(currentNumberedList);
                    currentNumberedList = [];
                    currentNumber = 1;
                }
            }

            // Handle any remaining list items
            if (currentNumberedList.length > 0) {
                convertToProperList(currentNumberedList);
            }

            // Process child elements recursively
            const childElements = Array.from(element.childNodes)
                .filter(node => node.nodeType === Node.ELEMENT_NODE);

            for (const child of childElements) {
                preprocessLists(child);
            }
        };

        // Convert a series of text nodes that look like list items into a proper OL/LI structure
        const convertToProperList = (listItemNodes: Array<Node>) => {
            if (listItemNodes.length === 0) return;

            // Create a proper OL element
            const olElement = document.createElement('ol');

            // Process each text node
            for (const node of listItemNodes) {
                const text = node.textContent?.trim() || '';
                const listItemMatch = text.match(/^\s*(\d+)\.\s+(.+)$/);

                if (listItemMatch) {
                    const itemContent = listItemMatch[2];

                    // Create a list item
                    const liElement = document.createElement('li');
                    liElement.textContent = itemContent;

                    // Add to the ordered list
                    olElement.appendChild(liElement);

                    // Replace the original text node with an empty text node
                    // (we'll add the new structure afterward)
                    if (node.parentNode) {
                        node.textContent = '';
                    }
                }
            }

            // Insert the new OL element after the last list item
            const lastNode = listItemNodes[listItemNodes.length - 1];
            if (lastNode.parentNode) {
                lastNode.parentNode.insertBefore(olElement, lastNode.nextSibling);
            }
        };

        // Function to check if text looks like LaTeX command content and clean it
        const cleanLaTeXCommands = (text: string): string => {
            // Replace LaTeX command sequences that might have been interpreted as text
            return text
                // Clean up table environment commands
                .replace(/\\begin\s*\{\s*table\s*\}\s*(\[\s*h!\s*\])?/g, '')
                .replace(/\\centering/g, '')
                .replace(/\\end\s*\{\s*table\s*\}/g, '')
                .replace(/\\begin\s*\{\s*tabular\s*\}\s*\{[^}]*\}/g, '')
                .replace(/\\end\s*\{\s*tabular\s*\}/g, '')
                .replace(/\\hline/g, '')
                // Clean up backslash commands that shouldn't be displayed
                .replace(/\\textbackslash\s+(\w+)/g, (match, command) => {
                    // Common LaTeX commands to clean up
                    if (['textit', 'textbf', 'underline', 'begin', 'end', 'item'].includes(command)) {
                        return '';
                    }
                    return match;
                });
        };

        // Process child nodes of an element
        const processChildNodes = (element: HTMLElement, nestingLevel: number): string => {
            let result = '';

            for (const child of Array.from(element.childNodes)) {
                result += processNode(child, nestingLevel);
            }

            return result;
        };

        // Convert HTML table to LaTeX tabular environment
        const convertTableToLatex = (tableElement: HTMLElement): string => {
            let result = '\\begin{table}[h!]\n  \\centering\n';

            // Get table rows
            const rows = tableElement.querySelectorAll('tr');
            if (rows.length === 0) return '';

            // Determine number of columns based on the first row
            const firstRow = rows[0];
            const columns = firstRow.querySelectorAll('td, th').length;
            if (columns === 0) return '';

            // Create column specification
            let colSpec = '|';
            for (let i = 0; i < columns; i++) {
                colSpec += 'c|';
            }

            result += `  \\begin{tabular}{${colSpec}}\n    \\hline\n`;

            // Process rows
            rows.forEach((row, rowIndex) => {
                const cells = row.querySelectorAll('td, th');

                if (cells.length > 0) {
                    // Process cells in this row
                    let rowContent = '    ';
                    cells.forEach((cell, cellIndex) => {
                        // Process cell content
                        const cellContent = cell.textContent?.trim() || '';
                        rowContent += escapeLatexSpecialChars(cellContent);

                        // Add column separator except for last column
                        if (cellIndex < cells.length - 1) {
                            rowContent += ' & ';
                        }
                    });

                    // End the row
                    rowContent += ' \\\\\n    \\hline\n';
                    result += rowContent;
                }
            });

            result += '  \\end{tabular}\n';

            // Only add caption if we haven't processed a caption with similar text
            const captionText = tableElement.querySelector('caption')?.textContent?.trim() || 'Imported Table';

            // Check if we've already processed this caption
            if (!processedContent.processedCaptions.has(captionText)) {
                result += `  \\caption{${captionText}}\n`;
                processedContent.processedCaptions.add(captionText);
            }

            result += '\\end{table}\n\n';

            return result;
        };

        // Improved function to escape special LaTeX characters
        const escapeLatexSpecialChars = (text: string): string => {
            // Don't double-escape already escaped sequences
            if (text.includes('\\textbackslash') || text.includes('\\{') || text.includes('\\}')) {
                return text;
            }

            return text
                .replace(/\\/g, '\\textbackslash ')
                .replace(/\$/g, '\\$')
                .replace(/%/g, '\\%')
                .replace(/&/g, '\\&')
                .replace(/#/g, '\\#')
                .replace(/_/g, '\\_')
                .replace(/~/g, '\\textasciitilde ')
                .replace(/\^/g, '\\textasciicircum ')
                .replace(/\{/g, '\\{')
                .replace(/\}/g, '\\}');
        };

        // Process the HTML nodes with better handling for LaTeX commands
        processNode = (node: Node, nestingLevel: number = 0): string => {
            let result = '';

            // Handle different node types
            switch (node.nodeType) {
                case Node.TEXT_NODE:
                    // Skip empty text nodes
                    if (!node.textContent || node.textContent.trim() === '') {
                        return '';
                    }

                    const textContent = node.textContent.trim();

                    // Check for author information
                    if (textContent.match(/^By\s+(.+)$/i)) {
                        const authorMatch = textContent.match(/^By\s+(.+)$/i);
                        if (authorMatch && authorMatch[1]) {
                            const authorName = authorMatch[1].trim();

                            // If this is the first author we've seen, store it and skip
                            if (!processedContent.hasAuthor) {
                                processedContent.hasAuthor = true;
                                processedContent.authorName = authorName;
                                return '';
                            } else {
                                // If we've already seen an author, skip this one
                                return '';
                            }
                        }
                    }

                    // Skip "Table Caption" text that might get duplicated
                    if (textContent === 'Table Caption') {
                        if (!processedContent.processedCaptions.has('Table Caption')) {
                            processedContent.processedCaptions.add('Table Caption');
                        } else {
                            return ''; // Skip duplicate Table Caption text
                        }
                    }

                    // Skip numbered list patterns that should be handled by the ol/li structure now
                    if (textContent.match(/^\s*\d+\.\s+.+$/)) {
                        // Check if this is inside a proper list element already
                        let parent = node.parentNode;
                        while (parent) {
                            if (parent.nodeName.toLowerCase() === 'ol' ||
                                parent.nodeName.toLowerCase() === 'li') {
                                break;
                            }
                            parent = parent.parentNode;
                        }

                        // If not inside a list, we might have missed this in preprocessing
                        if (!parent) {
                            return ''; // Skip it since our preprocessor should handle it
                        }
                    }

                    // Skip title/author/date text if they're already part of the LaTeX document structure
                    if (processedContent.skipFirstHeading) {
                        if (textContent.includes('LaTeX Document') ||
                            textContent.includes('By Your Name') ||
                            textContent.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
                            processedContent.skipFirstHeading = false;
                            return '';
                        }
                    }

                    // Clean up any LaTeX commands that might have been interpreted as text
                    const cleanedText = cleanLaTeXCommands(textContent);
                    if (cleanedText.trim() === '') {
                        return '';
                    }

                    // Handle text content - escape special LaTeX characters
                    result += escapeLatexSpecialChars(cleanedText);
                    break;

                case Node.ELEMENT_NODE:
                    const element = node as HTMLElement;
                    const tagName = element.tagName.toLowerCase();

                    // Skip empty elements
                    if (isElementEmpty(element) && tagName !== 'br' && tagName !== 'hr') {
                        return '';
                    }

                    // Process different HTML elements
                    switch (tagName) {
                        case 'h1':
                            // Check if this might be the document title that's already handled by \maketitle
                            const h1Content = element.textContent?.trim() || '';
                            if (h1Content.includes('LaTeX Document') || h1Content.includes('Imported Document')) {
                                if (!processedContent.hasTitle) {
                                    processedContent.hasTitle = true;
                                    processedContent.skipFirstHeading = true;
                                    return '';
                                }
                            }
                            result += `\\section{${processChildNodes(element, nestingLevel + 1)}}\n\n`;
                            break;

                        case 'h2':
                            result += `\\section{${processChildNodes(element, nestingLevel + 1)}}\n\n`;
                            break;

                        case 'h3':
                            result += `\\subsection{${processChildNodes(element, nestingLevel + 1)}}\n\n`;
                            break;

                        case 'h4':
                            result += `\\subsubsection{${processChildNodes(element, nestingLevel + 1)}}\n\n`;
                            break;

                        case 'h5':
                            result += `\\paragraph{${processChildNodes(element, nestingLevel + 1)}}\n\n`;
                            break;

                        case 'h6':
                            // Don't automatically add \textit to subparagraphs - if the text is already in italics,
                            // it will be processed separately via the em/i tags
                            result += `\\subparagraph{${processChildNodes(element, nestingLevel + 1)}}\n\n`;
                            break;

                        case 'caption':
                            // Handle table captions - store them to avoid duplication
                            const captionText = element.textContent?.trim() || '';
                            if (!processedContent.processedCaptions.has(captionText)) {
                                processedContent.processedCaptions.add(captionText);
                                result += captionText; // The caption will be added in table processing
                            }
                            break;

                        case 'p':
                            // Handle paragraphs
                            const paragraphContent = processChildNodes(element, nestingLevel + 1);

                            // Skip if this paragraph looks like a table caption that we've already processed
                            if (paragraphContent === 'Table Caption' ||
                                paragraphContent === 'Imported Table') {
                                if (processedContent.processedCaptions.has(paragraphContent)) {
                                    return '';
                                } else {
                                    processedContent.processedCaptions.add(paragraphContent);
                                }
                            }

                            // Skip if this is a title/author/date paragraph that's already handled
                            if (paragraphContent.match(/By (Your Name|LaTeX Editor)/i)) {
                                if (!processedContent.hasAuthor) {
                                    processedContent.hasAuthor = true;
                                    return '';
                                }
                            } else if (paragraphContent.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
                                if (!processedContent.hasDate) {
                                    processedContent.hasDate = true;
                                    return '';
                                }
                            } else if (paragraphContent.toLowerCase().includes('latex document') ||
                                paragraphContent.toLowerCase().includes('imported document')) {
                                if (!processedContent.hasTitle) {
                                    processedContent.hasTitle = true;
                                    return '';
                                }
                            }

                            if (paragraphContent.trim()) {
                                // Check if this might be a subparagraph based on content
                                if (paragraphContent.toLowerCase().includes('this is a subparagraph')) {
                                    // Check if the content contains any text formatted in italics
                                    const hasItalicFormatting = element.querySelector('em, i') !== null;

                                    if (hasItalicFormatting) {
                                        // If it already has italic formatting, don't add \textit
                                        result += `\\subparagraph{${paragraphContent}}\n\n`;
                                    } else {
                                        // If no italic formatting, add it as it should be italicized
                                        result += `\\subparagraph{\\textit{${paragraphContent}}}\n\n`;
                                    }
                                } else {
                                    result += `${paragraphContent}\n\n`;
                                }
                            }
                            break;

                        case 'strong':
                        case 'b':
                            // Handle bold text
                            result += `\\textbf{${processChildNodes(element, nestingLevel + 1)}}`;
                            break;

                        case 'em':
                        case 'i':
                            // Handle italic text
                            result += `\\textit{${processChildNodes(element, nestingLevel + 1)}}`;
                            break;

                        case 'u':
                            // Handle underlined text
                            result += `\\underline{${processChildNodes(element, nestingLevel + 1)}}`;
                            break;

                        case 'ul':
                            // Handle unordered lists
                            result += `\\begin{itemize}\n${processChildNodes(element, nestingLevel + 1)}\\end{itemize}\n\n`;
                            break;

                        case 'ol':
                            // Handle ordered lists - more robust now
                            // Check if this list has numbering starting from a specific value
                            const startAttr = element.getAttribute('start');
                            const startVal = startAttr ? parseInt(startAttr) : 1;

                            if (startVal && startVal > 1) {
                                result += `\\begin{enumerate}[start=${startVal}]\n${processChildNodes(element, nestingLevel + 1)}\\end{enumerate}\n\n`;
                            } else {
                                result += `\\begin{enumerate}\n${processChildNodes(element, nestingLevel + 1)}\\end{enumerate}\n\n`;
                            }
                            break;

                        case 'li':
                            // Handle list items
                            result += `  \\item ${processChildNodes(element, nestingLevel + 1)}\n`;
                            break;

                        case 'table':
                            // Handle tables
                            result += convertTableToLatex(element);
                            break;

                        case 'img':
                            // Handle images - note: we can't actually import the images,
                            // but we can create placeholders
                            const alt = element.getAttribute('alt') || 'Image';
                            result += `\\begin{figure}[h!]\n  \\centering\n  \\fbox{\\textbf{Image placeholder: ${alt}}}\n  \\caption{${alt}}\n\\end{figure}\n\n`;
                            break;

                        case 'a':
                            // Handle links
                            const href = element.getAttribute('href') || '#';
                            result += `\\href{${href}}{${processChildNodes(element, nestingLevel + 1)}}`;
                            break;

                        case 'div':
                        case 'span':
                        case 'font':
                            // Just process contents of these container elements
                            result += processChildNodes(element, nestingLevel + 1);
                            break;

                        case 'br':
                            // Line break
                            result += ' \\\\ ';
                            break;

                        case 'hr':
                            // Horizontal rule
                            result += `\\par\\noindent\\rule{\\textwidth}{0.4pt}\n\n`;
                            break;

                        default:
                            // For other elements, just process their children
                            result += processChildNodes(element, nestingLevel + 1);
                    }
                    break;

                default:
                    // Ignore other node types
                    break;
            }

            return result;
        };

        // Clean up imported HTML and preprocess lists
        removeEmptyNodes(tempDiv);
        preprocessLists(tempDiv);

        // Start with empty LaTeX content
        let latex = '';

        // Process the HTML root element
        for (const child of Array.from(tempDiv.childNodes)) {
            latex += processNode(child);
        }

        // Post-processing to clean up the LaTeX
        latex = latex
            // Fix any double spacing issues
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            // Fix any remaining display issues with special characters
            .replace(/\\textbackslash{}/g, '\\textbackslash ')
            .replace(/\\textasciitilde{}/g, '\\textasciitilde ')
            .replace(/\\textasciicircum{}/g, '\\textasciicircum ')
            // Remove any duplicate content that might appear after the title
            .replace(/LaTeX Document\s+By Your Name\s+\d{1,2}\/\d{1,2}\/\d{4}\s+/g, '')
            // Remove duplicate table captions
            .replace(/(\\caption\{Table Caption\}[\s\n]*\\caption\{)/g, '\\caption{')
            // Remove raw LaTeX commands that might have been interpreted as text
            .replace(/\\textbackslash\s+begin\s*\{[^}]*\}/g, '')
            .replace(/\\textbackslash\s+end\s*\{[^}]*\}/g, '')
            .replace(/\\textbackslash\s+centering/g, '')
            .replace(/\\textbackslash\s+item/g, '')
            .replace(/\\textbackslash\s+hline/g, '')
            // Clean up additional raw LaTeX artifacts
            .replace(/\{\\textbackslash\s+[^}]+\}/g, '')
            .replace(/\\textbackslash\s+textit/g, '')
            .replace(/\\textbackslash\s+textbf/g, '')
            .replace(/\\textbackslash\s+underline/g, '')
            // Fix the title duplication issue by removing numbers in parentheses
            .replace(/LaTeX Document \(\d+\) \(\d+\)/g, 'LaTeX Document')
            // Fix ordered vs unordered list confusion - look for section headers to identify
            .replace(/\\section{Unordered List}([\s\S]*?)\\begin{enumerate}/g, '\\section{Unordered List}$1\\begin{itemize}')
            .replace(/\\section{Unordered List}([\s\S]*?)\\end{enumerate}/g, '\\section{Unordered List}$1\\end{itemize}')
            .replace(/\\section{Ordered List}([\s\S]*?)\\begin{itemize}/g, '\\section{Ordered List}$1\\begin{enumerate}')
            .replace(/\\section{Ordered List}([\s\S]*?)\\end{itemize}/g, '\\section{Ordered List}$1\\end{enumerate}')
            // Fix issue with "Table no X" text being included in LaTeX output
            .replace(/(Table\s+(?:no\s+)?\d+)\s*\\begin{table}/g, '$1\n\n\\begin{table}')
            // Fix broken \textit tags in subparagraphs
            .replace(/\\subparagraph{\\textit}/g, '\\subparagraph{\\textit{')
            .replace(/\\textit\s*\n\s*\}/g, '\\textit{}')
            .replace(/\\textit\s*\n\s*([^}]+)\}/g, '\\textit{$1}')
            .replace(/\\subparagraph{([^}]*)}(\s*\n\s*)\\}/g, '\\subparagraph{$1}')
            .replace(/\\}(\s*\n\s*)/g, '}$1');

        return latex;
    };


    // Add key event handler for global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl+/ (forward slash key)
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                // Toggle the custom dropdown instead of focusing the select
                setShowTextStyleDropdown(true);
                // Reset selection to first item
                setSelectedDropdownIndex(0);
            }
        };

        // Add event listener
        document.addEventListener('keydown', handleKeyDown);

        // Cleanup
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Handle dropdown keyboard navigation
    useEffect(() => {
        const handleDropdownKeyDown = (e: KeyboardEvent) => {
            if (!showTextStyleDropdown) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedDropdownIndex(prev =>
                        prev < textStyleOptions.length - 1 ? prev + 1 : 0
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedDropdownIndex(prev =>
                        prev > 0 ? prev - 1 : textStyleOptions.length - 1
                    );
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedDropdownIndex >= 0 && selectedDropdownIndex < textStyleOptions.length) {
                        applyTextStyleFromDropdown(textStyleOptions[selectedDropdownIndex].value);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    setShowTextStyleDropdown(false);
                    break;
            }
        };

        if (showTextStyleDropdown) {
            document.addEventListener('keydown', handleDropdownKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleDropdownKeyDown);
        };
    }, [showTextStyleDropdown, selectedDropdownIndex, textStyleOptions.length]);

    // Focus the selected item when selectedDropdownIndex changes
    useEffect(() => {
        if (showTextStyleDropdown && dropdownItemsRef.current[selectedDropdownIndex]) {
            dropdownItemsRef.current[selectedDropdownIndex]?.focus();
        }
    }, [selectedDropdownIndex, showTextStyleDropdown]);

    // Initialize dropdown items ref array when dropdown opens
    useEffect(() => {
        if (showTextStyleDropdown) {
            dropdownItemsRef.current = Array(textStyleOptions.length).fill(null);
        }
    }, [showTextStyleDropdown, textStyleOptions.length]);

    // Handle click outside to close the dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (customDropdownRef.current && !customDropdownRef.current.contains(event.target as HTMLElement)) {
                setShowTextStyleDropdown(false);
            }
        };

        if (showTextStyleDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showTextStyleDropdown]);

    // Function to apply text style from custom dropdown
    const applyTextStyleFromDropdown = (style: string) => {
        // Close the dropdown
        setShowTextStyleDropdown(false);

        // Apply the selected style
        switch (style) {
            case 'normal':
                // Do nothing, just insert plain text
                break;
            case 'section':
                insertTextAtCursor('\\section{', '}');
                break;
            case 'subsection':
                insertTextAtCursor('\\subsection{', '}');
                break;
            case 'subsubsection':
                insertTextAtCursor('\\subsubsection{', '}');
                break;
            case 'paragraph':
                insertTextAtCursor('\\paragraph{', '}');
                break;
            case 'subparagraph':
                insertTextAtCursor('\\subparagraph{', '}');
                break;
            case 'equation':
                insertEquation();
                break;
            case 'bullet-list':
                insertList('bullet');
                break;
            case 'numbered-list':
                insertList('numbered');
                break;
        }
    };

    // Function to handle reverting to a previous version
    const handleRevertToVersion = (content: string) => {
        console.log('LatexEditor: Reverting to version with content length:', content.length);
        setLatexContent(content);
        setLastSavedContent(content);
        
        // Notify parent component about the content change
        if (onContentChange) {
            onContentChange(content);
        }
    };

    return (
        <div className={`latex-editor-container flex flex-col h-full ${isPreviewFullscreen ? 'fullscreen' : ''}`}>
            <div className="py-2 px-4 flex items-center bg-white border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center mr-4">
                    <FaCode className="mr-2" /> Code Editor
                </h2>

                {/* Editor Mode Switch - moved closer to the title */}
                {onEditorModeChange && (
                    <EditorModeSwitch
                        mode={editorMode}
                        onModeChange={onEditorModeChange}
                    />
                )}

                <div className="ml-auto flex items-center space-x-2">
                    <button
                        onClick={toggleFullscreen}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center"
                    >
                        <FaEye className="mr-1" /> Preview
                    </button>
                    <button
                        id="download-pdf-button"
                        onClick={handleDownloadPDF}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                    >
                        Download PDF
                    </button>
                    <button
                        id="download-word-button"
                        onClick={handleDownloadWord}
                        className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition flex items-center"
                    >
                        <FaFileWord className="mr-1" /> Download Word
                    </button>
                </div>
            </div>

            {/* Main Toolbar */}
            <div className="toolbar-container bg-white border-b border-gray-200 flex-shrink-0">
                {/* First row of toolbar */}
                <div className="flex items-center px-3 py-2 flex-wrap gap-2">
                    {/* Text style dropdown */}
                    <div className="toolbar-group flex items-center">
                        <div className="relative">
                            <div className="flex items-center">
                                <select
                                    ref={textStyleDropdownRef}
                                    className="w-32 bg-white text-gray-800 border border-gray-300 rounded py-1 pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    defaultValue="normal"
                                    onChange={handleTextStyleChange}
                                    onClick={() => {
                                        // Close all dropdowns when clicking on this dropdown
                                        const dropdowns = document.querySelectorAll('#font-menu, #table-menu, #header-footer-menu');
                                        dropdowns.forEach(menu => {
                                            if (menu && !menu.classList.contains('hidden')) {
                                                menu.classList.add('hidden');
                                            }
                                        });
                                    }}
                                >
                                    <option value="normal">Normal text</option>
                                    <option value="section">Section</option>
                                    <option value="subsection">Subsection</option>
                                    <option value="subsubsection">Subsubsection</option>
                                    <option value="paragraph">Paragraph</option>
                                    <option value="subparagraph">Subparagraph</option>
                                    <option value="equation">Equation</option>
                                    <option value="bullet-list">Bullet List</option>
                                    <option value="numbered-list">Numbered List</option>
                                </select>
                                {/* Dropdown arrow */}
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-800">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Custom dropdown menu */}
                            {showTextStyleDropdown && dropdownPosition && (
                                <div
                                    ref={customDropdownRef}
                                    className="fixed z-50 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg py-1 text-gray-800"
                                    style={{
                                        top: `${dropdownPosition.top}px`,
                                        left: `${dropdownPosition.left}px`,
                                    }}
                                >
                                    <div className="py-1 px-2 text-xs text-gray-500 border-b border-gray-300">Text Style (Ctrl+/)</div>
                                    {textStyleOptions.map((option, index) => (
                                        <button
                                            key={index}
                                            ref={el => {
                                                dropdownItemsRef.current[index] = el;
                                                return undefined;
                                            }}
                                            className={`w-full text-left px-4 py-1 hover:bg-gray-100 flex items-center ${selectedDropdownIndex === index ? 'bg-gray-100' : ''} ${option.className}`}
                                            onClick={() => applyTextStyleFromDropdown(option.value)}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Text formatting */}
                    <div className="toolbar-group flex space-x-1">
                        <button
                            onClick={insertBold}
                            className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition border border-gray-300"
                            title="Bold"
                        >
                            <FaBold size={14} />
                        </button>
                        <button
                            onClick={insertItalic}
                            className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition border border-gray-300"
                            title="Italic"
                        >
                            <FaItalic size={14} />
                        </button>
                        <button
                            onClick={() => insertTextAtCursor("\\underline{", "}")}
                            className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition border border-gray-300"
                            title="Underline"
                        >
                            <FaUnderline size={14} />
                        </button>
                    </div>

                    {/* Font dropdown */}
                    <div className="toolbar-group flex items-center">
                        <div className="relative">
                            <div className="flex items-center">
                                <select
                                    className="w-32 bg-white text-gray-800 border border-gray-300 rounded py-1 pl-8 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    defaultValue="font"
                                    onChange={handleFontStyleChange}
                                    onClick={() => {
                                        // Close other dropdowns when clicking on this dropdown
                                        const dropdowns = document.querySelectorAll('#table-menu, #header-footer-menu');
                                        dropdowns.forEach(menu => {
                                            if (menu && !menu.classList.contains('hidden')) {
                                                menu.classList.add('hidden');
                                            }
                                        });
                                    }}
                                >
                                    <option value="font" disabled>Font</option>
                                    <option value="sans">Sans Serif</option>
                                    <option value="roman">Roman</option>
                                    <option value="typewriter">Typewriter</option>
                                    <option value="georgia">Georgia</option>
                                    <option value="verdana">Verdana</option>
                                    <option value="trebuchet">Trebuchet</option>
                                </select>
                                <div className="pointer-events-none absolute left-2 flex items-center">
                                    <FaFont size={14} className="text-gray-800" />
                                </div>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-800">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lists */}
                    <div className="toolbar-group flex space-x-1">
                        <button
                            onClick={() => insertList('bullet')}
                            className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition border border-gray-300"
                            title="Bullet List"
                        >
                            <FaList size={14} />
                        </button>
                        <button
                            onClick={() => insertList('numbered')}
                            className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition border border-gray-300"
                            title="Numbered List"
                        >
                            <FaListOl size={14} />
                        </button>
                    </div>

                    {/* Table grid picker button */}
                    <div className="toolbar-group relative">
                        <button
                            onClick={e => {
                                const rect = (e.target as HTMLElement).getBoundingClientRect();
                                setTableGridPosition({
                                    top: rect.bottom + window.scrollY + 4,
                                    left: rect.left + window.scrollX,
                                });
                                setShowTableGrid(true);
                            }}
                            className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition"
                            title="Insert Table"
                        >
                            <FaTable size={14} />
                        </button>
                        {showTableGrid && tableGridPosition && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 40,
                                    left: 0,
                                    zIndex: 1000,
                                }}
                            >
                                <TableGridPicker
                                    onSelect={(rows, cols) => {
                                        insertTable(rows, cols);
                                        setShowTableGrid(false);
                                    }}
                                    onClose={() => setShowTableGrid(false)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Process Table button */}
                    <button
                        onClick={insertProcessTable}
                        className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition"
                        title="Insert Process Management Table"
                    >
                        📋
                    </button>

                    {/* Template button */}
                    <button
                        onClick={() => insertLatexTemplate()}
                        className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition"
                        title="Insert LaTeX Template"
                    >
                        📄
                    </button>

                    {/* Image insertion */}
                    <button
                        onClick={insertImage}
                        className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition"
                        title="Insert Image"
                    >
                        <FaImage size={14} />
                    </button>

                    {/* Equation insertion - new button */}
                    <button
                        onClick={insertEquation}
                        className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition"
                        title="Insert Equation"
                    >
                        <FaRulerHorizontal size={14} />
                    </button>

                    {/* Changes Tracker button */}
                    <button
                        onClick={() => setShowChangesTracker(true)}
                        className={`p-2 rounded transition ${
                            projectId 
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300' 
                                : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                        }`}
                        title={projectId ? "Track Changes History" : "No project selected"}
                        disabled={!projectId}
                    >
                        <FaHistory size={14} />
                    </button>

                    <div className="flex-1"></div>

                    {/* Compile controls */}
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            <span className="text-white text-sm">Auto-compile</span>
                            <Switch
                                checked={autoCompile}
                                onCheckedChange={setAutoCompile}
                            />
                        </div>

                        {/* Auto-save indicator */}
                        {isSaving && (
                            <div className="flex items-center space-x-2 text-green-400 text-sm">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span>Auto-saving...</span>
                            </div>
                        )}

                        <button
                            onClick={compileLatexToPDF}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center space-x-1"
                            disabled={isCompiling || autoCompile}
                        >
                            <FaPlay size={12} />
                            <span>{isCompiling ? 'Compiling...' : 'Compile'}</span>
                        </button>

                        {/* Manual save button */}
                        {onManualSave ? (
                            <button
                                onClick={handleManualSave}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center space-x-1"
                                disabled={isSaving}
                                title="Save (Ctrl+S)"
                            >
                                <FaFileAlt size={12} />
                                <span>Save</span>
                            </button>
                        ) : (
                            <div className="px-3 py-1 text-gray-400 text-xs">Save button not available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Editor and Preview */}
            <div className={`flex flex-1 ${isPreviewFullscreen ? 'hidden' : 'flex-row'} overflow-hidden`}>
                <div className={`${isPreviewFullscreen ? 'hidden' : 'w-1/2 h-full'} overflow-hidden`}
                    onWheel={(e) => e.stopPropagation()}>
                    <Editor
                        height="100%"
                        language="latex"
                        value={latexContent}
                        theme={editorTheme}
                        onChange={handleEditorChange}
                        onMount={handleEditorDidMount}
                        options={{
                            ...editorOptions,
                            scrollbar: {
                                vertical: 'visible',
                                horizontal: 'visible',
                                verticalScrollbarSize: 12,
                                horizontalScrollbarSize: 12,
                                alwaysConsumeMouseWheel: true
                            }
                        } as any}
                    />
                </div>
                <div
                    className={`${isPreviewFullscreen ? 'hidden' : 'w-1/2 h-full'} border-l overflow-hidden`}
                    ref={previewRef}
                    onWheel={(e) => e.stopPropagation()}
                >
                    {pdfUrl ? (
                        <iframe 
                            src={pdfUrl} 
                            className="w-full h-full border-0"
                            title="PDF Preview"
                        />
                    ) : (
                    <div className="latex-preview bg-white h-full overflow-y-auto overflow-x-auto p-8 custom-scrollbar">
                            <div className="text-center text-gray-500">
                                <p className="mb-2">No PDF compiled yet</p>
                                <p className="text-sm">Click "Compile" to generate PDF using external API</p>
                    </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Full preview mode */}
            {isPreviewFullscreen && (
                <div className="flex-1 overflow-hidden bg-white"
                    onWheel={(e) => e.stopPropagation()}>
                    {pdfUrl ? (
                        <iframe 
                            src={pdfUrl} 
                            className="w-full h-full border-0"
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="overflow-y-auto overflow-x-auto p-8 custom-scrollbar flex items-center justify-center">
                            <div className="text-center text-gray-500">
                                <p className="mb-2">No PDF compiled yet</p>
                                <p className="text-sm">Click "Compile" to generate PDF using external API</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Custom dropdown menu */}
            {showTextStyleDropdown && dropdownPosition && (
                <div
                    ref={customDropdownRef}
                    className="fixed z-50 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg py-1 text-gray-800"
                    style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                    }}
                >
                    <div className="py-1 px-2 text-xs text-gray-500 border-b border-gray-300">Text Style (Ctrl+/)</div>
                    {textStyleOptions.map((option, index) => (
                        <button
                            key={index}
                            ref={el => {
                                dropdownItemsRef.current[index] = el;
                                return undefined;
                            }}
                            className={`w-full text-left px-4 py-1 hover:bg-gray-100 flex items-center ${selectedDropdownIndex === index ? 'bg-gray-100' : ''} ${option.className}`}
                            onClick={() => applyTextStyleFromDropdown(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}

            <style jsx global>{`
                .toolbar-container {
                  display: flex;
                  flex-direction: column;
                }
                
                .toolbar-group {
                  position: relative;
                }
                
                .latex-preview {
                  font-family: 'Times New Roman', Times, serif;
                  line-height: 1.5;
                  color: #333;
                }
                
                .latex-preview h1 {
                  font-size: 24px;
                  text-align: center;
                  margin-bottom: 8px;
                }
                
                .latex-preview .latex-title {
                  text-align: center;
                  margin-bottom: 32px;
                  border-bottom: 1px solid #eee;
                  padding-bottom: 16px;
                }
                
                .latex-preview .author {
                  text-align: center;
                  margin-bottom: 4px;
                }
                
                .latex-preview .date {
                  text-align: center;
                  margin-bottom: 24px;
                  font-style: italic;
                }
                
                .latex-preview h2 {
                  font-size: 24px;
                  font-weight: bold;
                  margin-top: 24px;
                  margin-bottom: 12px;
                  color: #333;
                }
                
                .latex-preview h3 {
                  font-size: 20px;
                  font-weight: bold;
                  margin-top: 20px;
                  margin-bottom: 10px;
                  color: #333;
                }
                
                .latex-preview h4 {
                  font-size: 18px;
                  font-weight: bold;
                  margin-top: 18px;
                  margin-bottom: 9px;
                  color: #333;
                }
                
                .latex-preview h5 {
                  font-size: 16px;
                  font-weight: bold;
                  margin-top: 16px;
                  margin-bottom: 8px;
                  color: #333;
                }
                
                .latex-preview h6 {
                  font-size: 14px;
                  font-weight: bold;
                  margin-top: 14px;
                  margin-bottom: 7px;
                  font-style: italic;
                  color: #333;
                }
                
                .latex-preview .katex-display {
                  margin: 16px 0;
                  overflow-x: auto;
                }
                
                .latex-preview .error {
                  color: red;
                  font-family: monospace;
                  padding: 8px;
                  background-color: #ffeeee;
                  border-left: 3px solid red;
                  margin: 8px 0;
                }
                
                .latex-preview .latex-itemize {
                  list-style-type: disc;
                  margin-left: 20px;
                  margin-bottom: 16px;
                }
                
                .latex-preview .latex-itemize li {
                  margin-bottom: 8px;
                }
                
                /* Custom scrollbar styles */
                .custom-scrollbar::-webkit-scrollbar {
                  width: 12px;
                  height: 12px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: #f1f1f1;
                  border-radius: 6px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #c1c1c1;
                  border-radius: 6px;
                  border: 3px solid #f1f1f1;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #a8a8a8;
                }
                
                /* For Firefox */
                .custom-scrollbar {
                  scrollbar-width: thin;
                  scrollbar-color: #c1c1c1 #f1f1f1;
                }
                
                .latex-preview .latex-section {
                  margin-top: 24px;
                  margin-bottom: 12px;
                }
                
                .latex-preview .latex-subsection {
                  margin-top: 20px;
                  margin-bottom: 10px;
                }
                
                .latex-preview .latex-subsubsection {
                  margin-top: 18px;
                  margin-bottom: 9px;
                }
                
                .latex-preview .latex-paragraph {
                  margin-top: 16px;
                  margin-bottom: 8px;
                }
                
                .latex-preview .latex-subparagraph {
                  margin-top: 14px;
                  margin-bottom: 7px;
                }
                
                .latex-preview .latex-bold {
                  font-weight: bold;
                }
                
                .latex-preview .latex-italic {
                  font-style: italic;
                }
                
                .latex-preview .latex-underline {
                  text-decoration: underline;
                }
                
                .latex-preview .latex-emph {
                  font-style: italic;
                }
                
                .latex-preview .latex-monospace {
                  font-family: monospace;
                  background-color: #f5f5f5;
                  padding: 1px 3px;
                  border-radius: 3px;
                }
                
                .latex-preview strong {
                  font-weight: bold;
                }
                
                .latex-preview em {
                  font-style: italic;
                }
                
                /* Prevent Monaco editor scrolling from affecting page */
                .monaco-scrollable-element {
                  pointer-events: auto !important;
                }
                
                .monaco-editor, 
                .monaco-editor .overflow-guard {
                  contain: strict;
                }

                /* Font styles */
                .latex-preview .latex-roman {
                    font-family: 'Times New Roman', Times, serif;
                }
                
                .latex-preview .latex-sans {
                    font-family: Arial, Helvetica, sans-serif;
                }
                
                .latex-preview .latex-typewriter {
                    font-family: 'Courier New', Courier, monospace;
                    background-color: #f8f9fa;
                    padding: 0 3px;
                    border-radius: 2px;
                }
                
                .latex-preview .latex-small {
                    font-size: 0.85em;
                }
                
                .latex-preview .latex-normalsize {
                    font-size: 1em;
                }
                
                .latex-preview .latex-large {
                    font-size: 1.2em;
                }
                
                .latex-preview .latex-huge {
                    font-size: 1.5em;
                }
                
                /* List styles */
                .latex-preview .latex-enumerate {
                    list-style-type: decimal;
                    margin-left: 20px;
                    margin-bottom: 16px;
                }
                
                .latex-preview .latex-enumerate li {
                    margin-bottom: 8px;
                }
                
                /* Table styles */
                .latex-preview .latex-table-container {
                    margin: 20px 0;
                    overflow-x: auto;
                }
                
                .latex-preview .latex-table {
                    border-collapse: collapse;
                    width: 100%;
                    margin-bottom: 10px;
                }
                
                .latex-preview .latex-table caption {
                    font-weight: bold;
                    margin-bottom: 10px;
                    caption-side: top;
                    text-align: center;
                }
                
                .latex-preview .table-label {
                    text-align: center;
                    margin-bottom: 5px;
                    font-weight: normal;
                    color: #555;
                }
                
                .latex-preview .latex-table td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: center;
                }
                
                /* Figure styles */
                .latex-preview .latex-figure {
                    margin: 20px 0;
                    text-align: center;
                }
                
                .latex-preview .latex-figure-placeholder {
                    background-color: #f1f1f1;
                    padding: 40px;
                    margin-bottom: 10px;
                    border: 1px dashed #aaa;
                    color: #666;
                }
                
                .latex-preview .latex-caption {
                    font-style: italic;
                    color: #555;
                }
                
                /* Header/Footer indicator */
                .latex-preview .latex-header-footer-indicator {
                    background-color: #f8f9fa;
                    padding: 8px;
                    margin-bottom: 16px;
                    border-left: 3px solid #0066cc;
                    color: #333;
                    font-size: 0.9em;
                }

                /* Add styling for headers and footers */
                .latex-preview .latex-header-preview,
                .latex-preview .latex-footer-preview {
                    display: flex;
                    justify-content: space-between;
                    width: 100%;
                    padding: 5px 0;
                    margin-bottom: 20px;
                    font-size: 0.9em;
                    color: #666;
                }
                
                .latex-preview .latex-footer-preview {
                    margin-top: 20px;
                    margin-bottom: 0;
                }
                
                .latex-preview .latex-header-left,
                .latex-preview .latex-footer-left {
                    text-align: left;
                    width: 33%;
                }
                
                .latex-preview .latex-header-center,
                .latex-preview .latex-footer-center {
                    text-align: center;
                    width: 33%;
                }
                
                .latex-preview .latex-header-right,
                .latex-preview .latex-footer-right {
                    text-align: right;
                    width: 33%;
                }
                
                .latex-preview .latex-page-header {
                    background-color: white;
                }
                
                .latex-preview .latex-page-footer {
                    background-color: white;
                }
            `}</style>

            {/* Changes Tracker Modal */}
            <ChangesTracker
                projectId={projectId || ''}
                isOpen={showChangesTracker}
                onClose={() => setShowChangesTracker(false)}
                onRevert={handleRevertToVersion}
                currentContent={latexContent}
                userId={user?.id}
                userRole={user?.role}
            />
        </div>
    );
};

export default LatexEditor; 