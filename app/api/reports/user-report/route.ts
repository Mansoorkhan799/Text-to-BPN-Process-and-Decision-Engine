import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import BpmnFile from '@/models/BpmnFile';
import LatexFile from '@/models/LatexFile';
import Record from '@/models/Record';
import { verifyToken } from '@/app/utils/jwt';
import mongoose from 'mongoose';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user information
    const mongoDb = mongoose.connection.db;
    if (!mongoDb) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const user = await mongoDb.collection('users').findOne({ email: decoded.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();

    // Fetch all user data in parallel
    const [latexFiles, bpmnFiles, records] = await Promise.all([
      // LaTeX Files
      LatexFile.find({ userId })
        .select('name type createdAt updatedAt documentMetadata fileId')
        .sort({ createdAt: -1 })
        .lean(),
      
      // BPMN Files
      BpmnFile.find({ userId })
        .select('name type createdAt updatedAt processMetadata fileId')
        .sort({ createdAt: -1 })
        .lean(),
      
      // Records
      Record.find({ owner: userId })
        .select('title date tag createdAt updatedAt link')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    // Format the data for export
    const formattedData = {
      user: {
        name: user.name || user.email,
        email: user.email,
        role: user.role || 'user'
      },
      latexFiles: latexFiles.map(file => ({
        name: file.name,
        type: file.type,
        fileId: file.fileId || file._id?.toString() || '',
        createdAt: file.createdAt ? new Date(file.createdAt).toISOString() : '',
        updatedAt: file.updatedAt ? new Date(file.updatedAt).toISOString() : '',
        documentMetadata: {
          title: file.documentMetadata?.title || '',
          author: file.documentMetadata?.author || '',
          description: file.documentMetadata?.description || '',
          tags: file.documentMetadata?.tags || []
        }
      })),
      bpmnFiles: bpmnFiles.map(file => ({
        name: file.name,
        type: file.type,
        fileId: file.fileId || file._id?.toString() || '',
        createdAt: file.createdAt ? new Date(file.createdAt).toISOString() : '',
        updatedAt: file.updatedAt ? new Date(file.updatedAt).toISOString() : '',
        processMetadata: {
          processName: file.processMetadata?.processName || '',
          description: file.processMetadata?.description || '',
          processOwner: file.processMetadata?.processOwner || '',
          processManager: file.processMetadata?.processManager || ''
        }
      })),
      records: records.map(record => ({
        title: record.title || '',
        date: record.date ? new Date(record.date).toISOString() : '',
        tag: record.tag || '',
        link: record.link || '',
        createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : '',
        updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : ''
      }))
    };

    return NextResponse.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching user report data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report data' },
      { status: 500 }
    );
  }
}
