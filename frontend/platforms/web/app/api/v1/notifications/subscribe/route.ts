import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * Save push notification subscription
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

    // Parse subscription data
    const subscription = await request.json();

    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Save to database
    const response = await fetch(`${process.env.NEXT_PUBLIC_GRAPHQL_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation UpsertPushSubscription(
            $userId: uuid!
            $endpoint: String!
            $p256dh: String!
            $auth: String!
          ) {
            insert_push_subscriptions_one(
              object: {
                user_id: $userId
                endpoint: $endpoint
                p256dh_key: $p256dh
                auth_key: $auth
              }
              on_conflict: {
                constraint: push_subscriptions_endpoint_key
                update_columns: [p256dh_key, auth_key, updated_at]
              }
            ) {
              id
              endpoint
            }
          }
        `,
        variables: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error('Database error');
    }

    return NextResponse.json({
      success: true,
      subscription: data.data.insert_push_subscriptions_one,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save subscription',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
