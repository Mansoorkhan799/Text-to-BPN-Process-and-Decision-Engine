# LaTeX Package Configuration

This document describes the comprehensive LaTeX package configuration implemented in the Text-to-BPMN Process and Decision Engine project.

## Overview

The project now includes a centralized LaTeX package management system that supports all the packages used in professional LaTeX documents, including the complex document you provided. This ensures compatibility with Overleaf-style documents and professional LaTeX formatting.

## Supported Packages

### Essential Packages
- **geometry** - Page layout and margins with custom options
- **inputenc** - UTF-8 character encoding
- **hyperref** - Hyperlinks and PDF features
- **amsmath** - Advanced math typesetting
- **amssymb** - Mathematical symbols

### Formatting Packages
- **titling** - Custom title page formatting
- **setspace** - Line spacing control
- **titlesec** - Section title formatting
- **enumitem** - List formatting
- **fancyhdr** - Headers and footers
- **helvet** - Helvetica font (scaled)

### Color Packages
- **xcolor** - Color support with table options
- **colortbl** - Colored tables

### Graphics and Positioning
- **rotating** - Rotate text and objects
- **tikz** - Graphics and diagrams
- **eso-pic** - Background pictures
- **graphicx** - Graphics inclusion

### Table Packages
- **booktabs** - Professional table formatting
- **longtable** - Multi-page tables

### Advanced Packages
- **stackengine** - Stacking text and objects
- **pdflscape** - Landscape pages in PDF
- **standalone** - Standalone document compilation
- **typearea** - Page area calculation

## Implementation

### Centralized Configuration

The package configuration is managed through `app/utils/latexPackages.ts`, which provides:

1. **Package Definitions**: All packages with their options and descriptions
2. **Template Generation**: Functions to generate complete LaTeX documents
3. **Package Management**: Utilities to check and add packages

### Updated Components

All LaTeX editor components have been updated to use the centralized configuration:

- **LatexEditor.tsx** - Code editor with full package support
- **VisualLatexEditor.tsx** - Visual editor with comprehensive packages
- **CombinedLatexEditor.tsx** - Combined editor interface
- **LatexFileTree.tsx** - File tree with package-aware templates

## Usage Examples

### Basic Template Generation

```typescript
import { generateLatexTemplate } from '../utils/latexPackages';

const template = generateLatexTemplate('My Document', 'John Doe');
```

### Custom Document Class

```typescript
import { generateLatexPreamble } from '../utils/latexPackages';

const preamble = generateLatexPreamble('report', '12pt, a4paper, twoside');
```

### Package Management

```typescript
import { isPackageIncluded, addPackageIfMissing } from '../utils/latexPackages';

// Check if package is included
if (!isPackageIncluded(content, 'tikz')) {
    content = addPackageIfMissing(content, { name: 'tikz', category: 'graphics' });
}
```

## Document Class Support

The system now supports the `report` document class with options:
- `12pt` - 12-point font size
- `a4paper` - A4 paper size
- `twoside` - Two-sided document layout

## Geometry Configuration

Default page margins are set to:
- Top: 2.5cm
- Left: 3.5cm
- Right: 2.5cm
- Bottom: 2.5cm

## Compatibility

This configuration is fully compatible with:
- Overleaf documents
- Professional LaTeX documents
- Academic papers and reports
- Complex formatting requirements

## Migration from Previous Version

The previous basic package set has been replaced with the comprehensive configuration. Existing documents will automatically benefit from the new packages when opened in the editor.

## Future Enhancements

The centralized configuration makes it easy to:
- Add new packages
- Update package options
- Maintain consistency across all editors
- Support additional document classes

## Troubleshooting

If you encounter issues with specific packages:

1. Check if the package is included in `latexPackages.ts`
2. Verify package options are correct
3. Ensure proper import statements in components
4. Check for package conflicts

## Package Categories

Packages are organized into categories for better management:

- **essential**: Core LaTeX functionality
- **formatting**: Text and document formatting
- **graphics**: Images, diagrams, and positioning
- **tables**: Table formatting and styling
- **math**: Mathematical typesetting
- **advanced**: Specialized functionality

This categorization helps maintain the package order and makes it easier to add new packages in the appropriate section.
