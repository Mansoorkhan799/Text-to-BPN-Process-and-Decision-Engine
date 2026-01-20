import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import connectMongo from '@/lib/mongodb';
import DecisionExportFile from '@/models/DecisionExportFile';
import { verifyToken } from '@/app/utils/jwt';

// POST - Export data to Excel/CSV
export async function POST(req: NextRequest) {
  try {
    const { data, filename, save } = await req.json();
    
    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }
    
    // Create worksheet from JSON
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    // Convert to buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Return as base64 for frontend download
    const base64 = Buffer.from(excelBuffer).toString('base64');

    // Optionally save to storage (Mongo collection)
    if (save) {
      await connectMongo();
      const token = req.cookies.get('token')?.value;
      const user = token ? verifyToken(token) : null;
      if (!user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      await DecisionExportFile.create({
        name: filename || 'decision-results.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: excelBuffer.byteLength,
        dataBase64: base64,
        createdBy: user.email
      });
    }
    
    return NextResponse.json({
      success: true,
      data: base64,
      filename: filename || 'decision-results.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }, { status: 200 });
  } catch (error) {
    console.error('Error exporting file:', error);
    return NextResponse.json({ error: 'Failed to export file' }, { status: 500 });
  }
}

// GET - List saved exported files for current user or download by id
export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    const token = req.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const fileDoc = await DecisionExportFile
        .findById(id)
        .lean<{ createdBy: string; dataBase64: string; name: string; mimeType: string; size: number; createdAt: Date } | null>();
      if (!fileDoc || fileDoc.createdBy !== user.email) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: fileDoc.dataBase64,
        filename: fileDoc.name,
        mimeType: fileDoc.mimeType,
        size: fileDoc.size,
      }, { status: 200 });
    }

    // List mode
    const files = await DecisionExportFile
      .find({ createdBy: user.email })
      .sort({ createdAt: -1 })
      .select({ dataBase64: 0 })
      .lean();

    return NextResponse.json({
      success: true,
      files: files.map(f => ({
        _id: f._id,
        name: f.name,
        size: f.size,
        mimeType: f.mimeType,
        createdAt: f.createdAt,
      }))
    }, { status: 200 });
  } catch (error) {
    console.error('Error listing/downloading exported files:', error);
    return NextResponse.json({ error: 'Failed to fetch exports' }, { status: 500 });
  }
}

