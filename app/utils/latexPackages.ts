/**
 * LaTeX Package Configuration
 * 
 * This file contains all the LaTeX packages used in the project,
 * organized by category for better maintainability.
 */

export interface LaTeXPackage {
    name: string;
    options?: string;
    description: string;
    category: 'essential' | 'formatting' | 'graphics' | 'tables' | 'math' | 'advanced';
}

export const LATEX_PACKAGES: LaTeXPackage[] = [
    // Essential packages
    {
        name: 'geometry',
        options: '[top=2.5cm, left=3.5cm, right=2.5cm, bottom=2.5cm]',
        description: 'Page layout and margins',
        category: 'essential'
    },
    {
        name: 'inputenc',
        options: '[utf8]',
        description: 'Character encoding',
        category: 'essential'
    },
    {
        name: 'amsmath',
        description: 'Advanced math typesetting',
        category: 'math'
    },
    {
        name: 'amssymb',
        description: 'Mathematical symbols',
        category: 'math'
    },
    {
        name: 'graphicx',
        description: 'Graphics inclusion',
        category: 'graphics'
    },
    {
        name: 'hyperref',
        description: 'Hyperlinks and PDF features',
        category: 'essential'
    },

    // Formatting packages
    {
        name: 'titling',
        description: 'Custom title page formatting',
        category: 'formatting'
    },
    {
        name: 'setspace',
        description: 'Line spacing control',
        category: 'formatting'
    },
    {
        name: 'titlesec',
        description: 'Section title formatting',
        category: 'formatting'
    },
    {
        name: 'enumitem',
        description: 'List formatting',
        category: 'formatting'
    },
    {
        name: 'fancyhdr',
        description: 'Headers and footers',
        category: 'formatting'
    },
    {
        name: 'helvet',
        options: '[scaled]',
        description: 'Helvetica font',
        category: 'formatting'
    },

    // Color packages
    {
        name: 'xcolor',
        options: '[table]',
        description: 'Color support with table options',
        category: 'formatting'
    },
    {
        name: 'colortbl',
        description: 'Colored tables',
        category: 'tables'
    },

    // Graphics and positioning
    {
        name: 'rotating',
        description: 'Rotate text and objects',
        category: 'graphics'
    },
    {
        name: 'tikz',
        description: 'Graphics and diagrams',
        category: 'graphics'
    },
    {
        name: 'eso-pic',
        description: 'Background pictures',
        category: 'graphics'
    },

    // Table packages
    {
        name: 'booktabs',
        description: 'Professional table formatting',
        category: 'tables'
    },
    {
        name: 'longtable',
        description: 'Multi-page tables',
        category: 'tables'
    },

    // Advanced packages
    {
        name: 'stackengine',
        options: '[usestackEOL]',
        description: 'Stacking text and objects',
        category: 'advanced'
    },
    {
        name: 'pdflscape',
        description: 'Landscape pages in PDF',
        category: 'advanced'
    },
    {
        name: 'standalone',
        description: 'Standalone document compilation',
        category: 'advanced'
    },
    {
        name: 'typearea',
        options: '[usegeometry]',
        description: 'Page area calculation',
        category: 'advanced'
    }
];

/**
 * Generate LaTeX preamble with all packages
 */
export function generateLatexPreamble(documentClass: string = 'report', classOptions: string = '12pt, a4paper, twoside'): string {
    let preamble = `\\documentclass[${classOptions}]{${documentClass}}\n`;
    
    // Add packages by category
    const categories = ['essential', 'formatting', 'graphics', 'tables', 'math', 'advanced'];
    
    categories.forEach(category => {
        const packages = LATEX_PACKAGES.filter(pkg => pkg.category === category);
        packages.forEach(pkg => {
            if (pkg.options) {
                preamble += `\\usepackage${pkg.options}{${pkg.name}}\n`;
            } else {
                preamble += `\\usepackage{${pkg.name}}\n`;
            }
        });
    });
    
    return preamble;
}

/**
 * Generate complete LaTeX document template
 */
export function generateLatexTemplate(title: string = 'LaTeX Document', author: string = 'Author'): string {
    const preamble = generateLatexPreamble();
    
    return `${preamble}

\\title{${title}}
\\author{${author}}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is a sample LaTeX document. You can edit it in the editor.

\\end{document}`;
}

/**
 * Check if a package is already included in the LaTeX content
 */
export function isPackageIncluded(content: string, packageName: string): boolean {
    const regex = new RegExp(`\\\\usepackage(?:\\[.*?\\])?\\{${packageName}\\}`, 'g');
    return regex.test(content);
}

/**
 * Add a package to LaTeX content if not already included
 */
export function addPackageIfMissing(content: string, latexPackage: LaTeXPackage): string {
    if (isPackageIncluded(content, latexPackage.name)) {
        return content;
    }
    
    const packageLine = latexPackage.options 
        ? `\\usepackage${latexPackage.options}{${latexPackage.name}}\n`
        : `\\usepackage{${latexPackage.name}}\n`;
    
    // Find the position to insert the package (before \\begin{document})
    const beginDocIndex = content.indexOf('\\begin{document}');
    if (beginDocIndex !== -1) {
        return content.slice(0, beginDocIndex) + packageLine + content.slice(beginDocIndex);
    }
    
    // If no \\begin{document} found, append at the end
    return content + '\n' + packageLine;
}

/**
 * Get packages by category
 */
export function getPackagesByCategory(category: LaTeXPackage['category']): LaTeXPackage[] {
    return LATEX_PACKAGES.filter(pkg => pkg.category === category);
}

/**
 * Get all package names as a simple array
 */
export function getAllPackageNames(): string[] {
    return LATEX_PACKAGES.map(pkg => pkg.name);
}
