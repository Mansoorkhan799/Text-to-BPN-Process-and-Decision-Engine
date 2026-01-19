import { NextRequest, NextResponse } from 'next/server';

interface CompileRequest {
  latex: string;
  mainFile?: string;
  files?: Record<string, string>;
}

interface CompileResult {
  success: boolean;
  pdf?: Buffer;
  log?: string;
  error?: string;
}

// Compile with external API (latex.ytotech.com)
async function compileWithExternalAPI(
  latex: string,
  mainFile: string,
  files: Record<string, string>
): Promise<CompileResult> {
  try {
    // Prepare resources array for the external API
    // The API expects resources array with main file and supporting files
    const resources: Array<{
      main?: boolean;
      path?: string;
      content?: string;
      file?: string; // base64 encoded
    }> = [];

    // Add main file
    const resolvedMainFile = mainFile || 'main.tex';
    resources.push({
      main: true,
      path: resolvedMainFile,
      content: latex,
    });

    // Add supporting files
    for (const [filename, content] of Object.entries(files)) {
      // Convert content to base64 for file resources
      const base64Content = Buffer.from(content, 'utf-8').toString('base64');
      resources.push({
        path: filename,
        file: base64Content,
      });
    }

    const requestBody = {
      compiler: 'pdflatex', // Can be 'pdflatex', 'xelatex', 'lualatex', etc.
      resources: resources,
    };

    const response = await fetch('https://latex.ytotech.com/builds/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Check if response is PDF (success) or JSON error
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        log: `API returned status ${response.status}: ${errorText}`,
        error: `External API compilation failed: ${response.status}`,
      };
    }

    // Check if we got a PDF back
    if (contentType.includes('application/pdf')) {
      const pdfBuffer = await response.arrayBuffer();
      return {
        success: true,
        pdf: Buffer.from(pdfBuffer),
        log: 'Compilation successful via external API (latex.ytotech.com)',
      };
    } else {
      // It's likely error JSON
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { error: errorText };
      }
      return {
        success: false,
        log: `External API error: ${JSON.stringify(errorJson, null, 2)}`,
        error: 'External API compilation failed',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      log: error.message || 'External API request failed',
      error: error.message || 'External API compilation failed',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CompileRequest = await request.json();
    const { latex, mainFile, files = {} } = body;

    const resolvedMainFile =
      mainFile && mainFile.trim().length > 0 ? mainFile.trim() : 'main.tex';

    if (!latex || latex.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'LaTeX content is required',
        },
        { status: 400 }
      );
    }

    // Use external API for compilation
    console.log('Compiling with external API (latex.ytotech.com)...');
    const result = await compileWithExternalAPI(latex, resolvedMainFile, files);

    if (result.success && result.pdf) {
      const pdfBase64 = result.pdf.toString('base64');
      return NextResponse.json({
        success: true,
        pdf: `data:application/pdf;base64,${pdfBase64}`,
        log: result.log || 'Compilation successful via external API',
      });
    }

    // External API failed
    return NextResponse.json(
      {
        success: false,
        error: 'External API compilation failed',
        log: result.log || 'Compilation failed',
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/latex/compile:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        log: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
