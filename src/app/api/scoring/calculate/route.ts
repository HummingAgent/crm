import { NextRequest, NextResponse } from 'next/server';
import { calculateContactScore, calculateDealScore } from '@/lib/scoring';

/**
 * POST /api/scoring/calculate
 * Recalculate score for a contact or deal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Missing type or id' },
        { status: 400 }
      );
    }

    let breakdown;

    if (type === 'contact') {
      breakdown = await calculateContactScore(id);
    } else if (type === 'deal') {
      breakdown = await calculateDealScore(id);
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "contact" or "deal"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      breakdown,
    });
  } catch (error: any) {
    console.error('Scoring calculation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate score' },
      { status: 500 }
    );
  }
}
