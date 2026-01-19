import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import LatexFile from '../../../models/LatexFile';
import mongoose from 'mongoose';
import { verifyToken } from '../../../app/utils/jwt';

export async function GET(req: NextRequest) {
  try {
    // Verify user is authenticated
    const token = req.cookies.get('token')?.value;
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

    // Get user information to get user ID
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

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const listAll = searchParams.get('listAll');
    
    // If listAll is requested, return only files for this user
    if (listAll === 'true') {
      const files = await LatexFile.find({ userId });
      console.log(`Found ${files.length} LaTeX files for user ${userId} in MongoDB Atlas`);
      return NextResponse.json({ 
        files: files.map(f => ({ 
          id: f.fileId || f._id, 
          name: f.name, 
          documentMetadata: f.documentMetadata || {
            title: '',
            author: '',
            description: '',
            tags: [],
          }
        })) 
      });
    }
    
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }
    
    // Try to find by fileId first, then by _id
    let file = await LatexFile.findOne({ fileId: fileId, userId });
    if (!file && mongoose.Types.ObjectId.isValid(fileId)) {
      file = await LatexFile.findOne({ _id: fileId, userId });
    }
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    console.log('Retrieved LaTeX file from MongoDB Atlas:', file.fileId || file._id, file.name);
    return NextResponse.json(file);
  } catch (error) {
    console.error('Error in GET /api/latex:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated
    const token = req.cookies.get('token')?.value;
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

    // Get user information to get user ID
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

    const body = await req.json();
    const { name, type, content, fileId, documentMetadata } = body;
    
    console.log('Creating new LaTeX file:', { userId, name, type });
    
    if (!name || !type || !content) {
      console.log('Missing required fields:', { name: !!name, type: !!type, content: !!content });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create new file with generated fileId
    const newFileId = fileId || `latex-file-${Date.now()}`;
    
    const file = await LatexFile.create({ 
      fileId: newFileId,
      userId, 
      name, 
      type, 
      content,
      documentMetadata: {
        title: name,
        author: (documentMetadata && documentMetadata.author) ? documentMetadata.author : '',
        description: (documentMetadata && documentMetadata.description) ? documentMetadata.description : '',
        tags: (documentMetadata && documentMetadata.tags) ? documentMetadata.tags : [],
      }
    });
    
    console.log('Created new LaTeX file:', file.fileId);
    return NextResponse.json(file);
  } catch (error) {
    console.error('Error in POST /api/latex:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Verify user is authenticated
    const token = req.cookies.get('token')?.value;
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

    // Get user information to get user ID
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

    const body = await req.json();
    const { fileId, content, name, documentMetadata } = body;
    
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }
    
    // Find and update the file
    let file = await LatexFile.findOne({ fileId: fileId, userId });
    if (!file && mongoose.Types.ObjectId.isValid(fileId)) {
      file = await LatexFile.findOne({ _id: fileId, userId });
    }
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Verify ownership
    if (file.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only update your own files.' },
        { status: 403 }
      );
    }
    
    // Update the file
    if (content !== undefined) file.content = content;
    if (name !== undefined) file.name = name;
    if (documentMetadata !== undefined) file.documentMetadata = documentMetadata;
    file.updatedAt = new Date();
    
    await file.save();
    
    console.log('Updated LaTeX file in MongoDB Atlas:', file.fileId);
    return NextResponse.json(file);
  } catch (error) {
    console.error('Error in PUT /api/latex:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Verify user is authenticated
    const token = req.cookies.get('token')?.value;
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

    // Get user information to get user ID
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

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }
    
    // Try to find by fileId first, then by _id
    let file = await LatexFile.findOne({ fileId: fileId, userId });
    if (!file && mongoose.Types.ObjectId.isValid(fileId)) {
      file = await LatexFile.findOne({ _id: fileId, userId });
    }
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Verify ownership
    if (file.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only delete your own files.' },
        { status: 403 }
      );
    }
    
    await LatexFile.deleteOne({ _id: file._id });
    
    console.log('Deleted LaTeX file from MongoDB Atlas:', fileId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/latex:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 