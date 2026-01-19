import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import KPI from '@/models/KPI';
import { verifyToken } from '@/app/utils/jwt';
import mongoose from 'mongoose';

// Ensure this route is always dynamic and never statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Get user information to get user ID
    const mongoDb = mongoose.connection.db;
    if (!mongoDb) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const user = await mongoDb.collection('users').findOne({ email: decoded.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();
    
    // Fetch only KPIs created by this user
    const kpis = await KPI.find({ createdBy: userId }).sort({ order: 1, createdAt: 1 });
    
    return NextResponse.json({
      success: true,
      kpis: kpis
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KPIs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    await connectDB();
    
    // Get user information to get user ID
    const mongoDb = mongoose.connection.db;
    if (!mongoDb) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const user = await mongoDb.collection('users').findOne({ email: decoded.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();
    const body = await request.json();
    
    // Create new KPI in MongoDB with authenticated user as creator
    const newKPI = new KPI({
      ...body,
      createdBy: userId, // Use authenticated user's ID
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const savedKPI = await newKPI.save();
    
    return NextResponse.json({
      success: true,
      message: 'KPI created successfully',
      kpi: savedKPI
    });
  } catch (error) {
    console.error('Error creating KPI:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create KPI' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify user is authenticated
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user information to get user ID
    const mongoDb = mongoose.connection.db;
    if (!mongoDb) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const user = await mongoDb.collection('users').findOne({ email: decoded.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'KPI ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the KPI belongs to this user before updating
    const existingKPI = await KPI.findById(id);
    if (!existingKPI) {
      return NextResponse.json(
        { success: false, error: 'KPI not found' },
        { status: 404 }
      );
    }

    if (existingKPI.createdBy !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You can only update your own KPIs.' },
        { status: 403 }
      );
    }
    
    // Update KPI in MongoDB
    const updatedKPI = await KPI.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      message: 'KPI updated successfully',
      kpi: updatedKPI
    });
  } catch (error) {
    console.error('Error updating KPI:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update KPI' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify user is authenticated
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user information to get user ID
    const mongoDb = mongoose.connection.db;
    if (!mongoDb) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const user = await mongoDb.collection('users').findOne({ email: decoded.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'KPI ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the KPI belongs to this user before deleting
    const existingKPI = await KPI.findById(id);
    if (!existingKPI) {
      return NextResponse.json(
        { success: false, error: 'KPI not found' },
        { status: 404 }
      );
    }

    if (existingKPI.createdBy !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You can only delete your own KPIs.' },
        { status: 403 }
      );
    }
    
    // Delete KPI from MongoDB
    const deletedKPI = await KPI.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'KPI deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting KPI:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete KPI' },
      { status: 500 }
    );
  }
}
