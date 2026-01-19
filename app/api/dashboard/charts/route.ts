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

    // Get data for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get files created in last 30 days
    const [latexFiles, bpmnFiles, records] = await Promise.all([
      LatexFile.find({ 
        userId,
        createdAt: { $gte: thirtyDaysAgo }
      }).select('createdAt').lean(),
      
      BpmnFile.find({ 
        userId,
        createdAt: { $gte: thirtyDaysAgo }
      }).select('createdAt').lean(),
      
      Record.find({ 
        owner: userId,
        createdAt: { $gte: thirtyDaysAgo }
      }).select('createdAt').lean()
    ]);

    // Group by day for the last 30 days
    const dailyData: { [key: string]: { latex: number; bpmn: number; records: number } } = {};
    
    // Initialize all days with 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = { latex: 0, bpmn: 0, records: 0 };
    }

    // Count files by day
    latexFiles.forEach((file: any) => {
      if (file.createdAt) {
        const dateKey = new Date(file.createdAt).toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].latex++;
        }
      }
    });

    bpmnFiles.forEach((file: any) => {
      if (file.createdAt) {
        const dateKey = new Date(file.createdAt).toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].bpmn++;
        }
      }
    });

    records.forEach((record: any) => {
      if (record.createdAt) {
        const dateKey = new Date(record.createdAt).toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].records++;
        }
      }
    });

    // Convert to array format for charts
    const activityData = Object.entries(dailyData).map(([date, counts]) => ({
      date,
      latex: counts.latex,
      bpmn: counts.bpmn,
      records: counts.records,
      total: counts.latex + counts.bpmn + counts.records
    }));

    // Get file type distribution
    const fileTypeDistribution = {
      latex: latexFiles.length,
      bpmn: bpmnFiles.length,
      records: records.length
    };

    // Get weekly summary (last 4 weeks)
    const weeklyData: { [key: string]: { latex: number; bpmn: number; records: number } } = {};
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7) - 6);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekKey = `Week ${4 - i}`;
      weeklyData[weekKey] = { latex: 0, bpmn: 0, records: 0 };
      
      // Count files in this week
      latexFiles.forEach((file: any) => {
        if (file.createdAt) {
          const fileDate = new Date(file.createdAt);
          if (fileDate >= weekStart && fileDate <= weekEnd) {
            weeklyData[weekKey].latex++;
          }
        }
      });
      
      bpmnFiles.forEach((file: any) => {
        if (file.createdAt) {
          const fileDate = new Date(file.createdAt);
          if (fileDate >= weekStart && fileDate <= weekEnd) {
            weeklyData[weekKey].bpmn++;
          }
        }
      });
      
      records.forEach((record: any) => {
        if (record.createdAt) {
          const recordDate = new Date(record.createdAt);
          if (recordDate >= weekStart && recordDate <= weekEnd) {
            weeklyData[weekKey].records++;
          }
        }
      });
    }

    const weeklySummary = Object.entries(weeklyData).map(([week, counts]) => ({
      week,
      latex: counts.latex,
      bpmn: counts.bpmn,
      records: counts.records,
      total: counts.latex + counts.bpmn + counts.records
    }));

    return NextResponse.json({
      success: true,
      data: {
        dailyActivity: activityData,
        fileTypeDistribution,
        weeklySummary
      }
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
