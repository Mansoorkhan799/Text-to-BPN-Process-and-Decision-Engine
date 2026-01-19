import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Record from '@/models/Record';
import mongoose from 'mongoose';
import { verifyToken } from '@/app/utils/jwt';

// Helper function to check if ID is a valid MongoDB ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && id.length === 24;
}

// Helper function to check if ID is a temporary ID
function isTemporaryId(id: string): boolean {
  return id.startsWith('temp-');
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    
    // Always use the authenticated user's ID as the owner, ignore owner from body
    const newRecord = new Record({
      ...body,
      owner: userId, // Force owner to be the authenticated user
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newRecord.save();
    
    console.log(`✅ Created record ${newRecord._id.toString()} for user ${userId}`);
    
    return NextResponse.json({ 
      success: true, 
      id: newRecord._id.toString() 
    });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }
    
    // Handle temporary IDs (from optimistic updates)
    if (isTemporaryId(id)) {
      return NextResponse.json({ 
        error: 'Cannot update unsaved record. Please wait for record to be saved.' 
      }, { status: 400 });
    }
    
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }

    // Verify the record exists and belongs to the user
    const existingRecord = await Record.findById(id);
    if (!existingRecord) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Verify ownership
    if (existingRecord.owner !== userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only update your own records.' },
        { status: 403 }
      );
    }
    
    // Always use the authenticated user's ID as the owner, ignore owner from body
    const updateData = {
      ...body,
      owner: userId, // Force owner to remain the authenticated user
      updatedAt: new Date()
    };
    
    const result = await Record.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!result) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      modifiedCount: 1,
      record: result
    });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

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
    
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');
    const ownerParam = searchParams.get('owner');
    const parentId = searchParams.get('parentId');
    
    // Build query - handle both old format (user name/email) and new format (MongoDB ObjectId)
    // Records created before the auth fix have owner as user name/email
    // Records created after the auth fix have owner as MongoDB ObjectId
    
    // Get all possible owner values to match
    const ownerValues = [
      userId, // MongoDB ObjectId string (new format)
      user.name, // User name (old format) - this should match "Jane Smith"
      user.email, // User email (old format)
      decoded.email // Email from token (old format)
    ].filter(Boolean); // Remove any null/undefined values
    
    console.log(`🔍 Querying records for user: ${user.name} (${user.email})`);
    console.log(`🔍 User ID: ${userId}`);
    console.log(`🔍 User name: "${user.name}"`);
    console.log(`🔍 User email: "${user.email}"`);
    console.log(`🔍 Owner values to match:`, ownerValues);
    
    const query: any = {
      $or: ownerValues.map(val => ({ owner: val }))
    };
    
    console.log(`🔍 Initial query:`, JSON.stringify(query, null, 2));
    
    // Allow filtering by tag
    if (tag && tag !== 'all') {
      // If we have $or, we need to use $and to combine with tag filter
      const tagQuery = { tag };
      query.$and = [
        { $or: query.$or },
        tagQuery
      ];
      delete query.$or;
      delete query.tag;
    }
    
    // Only allow owner filter if it matches the authenticated user (for security)
    // Users can only see their own records
    if (ownerParam && ownerParam !== 'all' && ownerParam !== userId && ownerParam !== user.name && ownerParam !== user.email) {
      // If requesting different owner, deny access (users can only see their own records)
      return NextResponse.json(
        { error: 'Access denied. You can only view your own records.' },
        { status: 403 }
      );
    }
    
    // Only filter by parentId if explicitly requested
    // By default, fetch ALL records to build complete hierarchy
    if (parentId !== undefined && parentId !== null) {
      const parentIdQuery = parentId === 'null' || parentId === '' 
        ? { parentId: null } 
        : { parentId };
      
      if (query.$and) {
        query.$and.push(parentIdQuery);
      } else {
        query.$and = [
          { $or: query.$or },
          parentIdQuery
        ];
        delete query.$or;
      }
    }
    
    console.log(`🔍 Final query:`, JSON.stringify(query, null, 2));
    
    // Test the query with each owner value individually
    const testWithName = await Record.countDocuments({ owner: user.name });
    const testWithEmail = await Record.countDocuments({ owner: user.email });
    const testWithUserId = await Record.countDocuments({ owner: userId });
    console.log(`🔍 Test counts - name: ${testWithName}, email: ${testWithEmail}, userId: ${testWithUserId}`);
    
    // If the complex query fails but name matches, use simpler query as fallback
    if (testWithName > 0 && query.$and) {
      console.log(`⚠️ Complex query structure detected, but name matches. Using simpler query.`);
      // Try a simpler query structure
      const simpleQuery: any = { owner: user.name };
      if (tag && tag !== 'all') simpleQuery.tag = tag;
      if (parentId !== undefined && parentId !== null) {
        simpleQuery.parentId = parentId === 'null' || parentId === '' ? null : parentId;
      }
      
      const simpleRecords = await Record.find(simpleQuery)
        .sort({ createdAt: -1, order: 1 })
        .lean()
        .exec();
      
      console.log(`✅ API: Fetched ${simpleRecords.length} records using simple query`);
      return NextResponse.json(simpleRecords);
    }
    
    // Use lean() for better performance when we don't need Mongoose documents
    const records = await Record.find(query)
      .sort({ createdAt: -1, order: 1 })
      .lean()
      .exec();
    
    console.log(`✅ API: Fetched ${records.length} records for user ${user.name} (${user.email})`);
    
    // If no records found but name test passed, try direct name query
    if (records.length === 0 && testWithName > 0) {
      console.log(`⚠️ Complex query returned 0, but name test found ${testWithName} records. Trying direct query.`);
      const directRecords = await Record.find({ owner: user.name })
        .sort({ createdAt: -1, order: 1 })
        .lean()
        .exec();
      console.log(`✅ Direct query found ${directRecords.length} records`);
      return NextResponse.json(directRecords);
    }
    
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }
    
    // Handle temporary IDs (from optimistic updates)
    if (isTemporaryId(id)) {
      return NextResponse.json({ 
        success: true, 
        deletedCount: 0,
        message: 'Temporary record not saved, no deletion needed'
      });
    }
    
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }

    // Verify the record exists and belongs to the user
    const existingRecord = await Record.findById(id);
    if (!existingRecord) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Verify ownership
    if (existingRecord.owner !== userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only delete your own records.' },
        { status: 403 }
      );
    }
    
    const result = await Record.findByIdAndDelete(id);
    
    if (!result) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: 1 
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
