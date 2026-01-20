import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Parse Excel/CSV file and return data
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Read file as buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Parse Excel/CSV file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number | boolean>>(worksheet, {
      raw: false,
      defval: ''
    });
    
    // Determine columns and types
    const columns = jsonData.length > 0 ? Object.keys(jsonData[0] as Record<string, unknown>) : [];
    const columnTypes = columns.map(col => {
      if (jsonData.length === 0) return 'string';
      const sampleValue = jsonData[0][col];
      
      if (typeof sampleValue === 'number') return 'number';
      if (typeof sampleValue === 'boolean') return 'boolean';
      if (typeof sampleValue === 'string' && sampleValue.match(/^\d{4}-\d{2}-\d{2}/)) return 'date';
      
      // Check if it's a number in string format
      if (typeof sampleValue === 'string' && !isNaN(Number(sampleValue)) && sampleValue !== '') return 'number';
      
      return 'string';
    });
    
    return NextResponse.json({
      success: true,
      data: jsonData,
      columns: columns.map((col, idx) => ({
        field: col,
        type: columnTypes[idx]
      })),
      rowCount: jsonData.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error importing file:', error);
    return NextResponse.json({ error: 'Failed to import file' }, { status: 500 });
  }
}

