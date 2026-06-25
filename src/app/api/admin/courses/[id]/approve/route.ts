import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { connectToDatabase } from '@/lib/db';
import Course, { CourseStatus, ICourseContract } from '@/models/Course';
import { Types } from 'mongoose';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const token = await getToken({
            req: request as any,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token || token.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!Types.ObjectId.isValid(params.id)) {
            return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
        }

        const body = await request.json();
        const { paymentType, commissionRate, durationMonths } = body;

        if (!['COMMISSION', 'CASH'].includes(paymentType)) {
            return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
        }

        await connectToDatabase();

        const course = await Course.findById(params.id);
        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        if (course.status !== CourseStatus.PENDING_APPROVAL) {
            return NextResponse.json({ error: 'Course is not pending approval' }, { status: 400 });
        }

        const now = new Date();
        const contract: ICourseContract = {
            paymentType,
        };

        if (paymentType === 'COMMISSION') {
            if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 1) {
                return NextResponse.json({ error: 'Invalid commission rate (must be 0-1)' }, { status: 400 });
            }
            if (typeof durationMonths !== 'number' || durationMonths <= 0) {
                return NextResponse.json({ error: 'Invalid duration months (must be > 0)' }, { status: 400 });
            }

            contract.commissionRate = commissionRate;
            contract.startDate = now;
            contract.durationMonths = durationMonths;

            // Calculate end date
            const endDate = new Date(now);
            endDate.setMonth(endDate.getMonth() + durationMonths);
            contract.endDate = endDate;
        } else if (paymentType === 'CASH') {
            contract.commissionRate = 0;
            contract.startDate = now;
            contract.durationMonths = undefined;
            contract.endDate = undefined;
        }

        course.status = CourseStatus.PUBLISHED;
        course.isPublished = true;
        course.contract = contract;

        await course.save();

        return NextResponse.json({ success: true, course });
    } catch (error: any) {
        console.error('Course approval error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
