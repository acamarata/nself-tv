import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * Remove push notification subscription
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const authToken = headersList.get('authorization')?.replace('Bearer ', '');

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify auth token
    const authResponse = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/user`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!authResponse.ok) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await authResponse.json();
    const userId = user.id;

    // Parse request
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
    }

    // Delete from database
    const response = await fetch(`${process.env.NEXT_PUBLIC_GRAPHQL_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation DeletePushSubscription($userId: uuid!, $endpoint: String!) {
            delete_push_subscriptions(
              where: {
                user_id: { _eq: $userId }
                endpoint: { _eq: $endpoint }
              }
            ) {
              affected_rows
            }
          }
        `,
        variables: { userId, endpoint },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete subscription');
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error('Database error');
    }

    return NextResponse.json({
      success: true,
      deleted: data.data.delete_push_subscriptions.affected_rows,
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      {
        error: 'Failed to remove subscription',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
