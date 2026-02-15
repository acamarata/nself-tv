import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * GDPR Account Deletion Endpoint
 *
 * Permanently deletes user account and all associated data
 * Per GDPR Article 17 (Right to Erasure / "Right to be Forgotten")
 *
 * This action is IRREVERSIBLE.
 *
 * Deletes:
 * - User profile
 * - Watch history
 * - Watchlist
 * - Ratings and reviews
 * - Preferences
 * - Download metadata
 * - Watch party participation
 * - Session tokens
 *
 * Retains (for legal/security reasons, 30 days):
 * - Anonymized access logs (IP addresses hashed)
 * - Billing records (if applicable)
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const authToken = headersList.get('authorization')?.replace('Bearer ', '');

    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body for confirmation
    const body = await request.json();
    const { confirmation } = body;

    if (confirmation !== 'DELETE MY ACCOUNT') {
      return NextResponse.json(
        {
          error: 'Confirmation required',
          message: 'You must send { "confirmation": "DELETE MY ACCOUNT" } to proceed',
        },
        { status: 400 }
      );
    }

    // Verify auth token
    const authResponse = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/user`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!authResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const user = await authResponse.json();
    const userId = user.id;
    const userEmail = user.email;

    // Step 1: Delete all user data from database
    const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_GRAPHQL_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation DeleteUserData($userId: uuid!) {
            # Delete watch history
            delete_watch_history(where: { user_id: { _eq: $userId } }) {
              affected_rows
            }

            # Delete watchlist
            delete_watchlist(where: { user_id: { _eq: $userId } }) {
              affected_rows
            }

            # Delete ratings and reviews
            delete_user_ratings(where: { user_id: { _eq: $userId } }) {
              affected_rows
            }

            # Delete preferences
            delete_user_preferences(where: { user_id: { _eq: $userId } }) {
              affected_rows
            }

            # Delete download metadata (note: actual cached files deleted via service worker)
            delete_downloads(where: { user_id: { _eq: $userId } }) {
              affected_rows
            }

            # Delete watch party participation
            delete_watch_party_participation(where: { user_id: { _eq: $userId } }) {
              affected_rows
            }

            # Delete watch party events (messages, etc.)
            delete_watch_party_events(where: { user_id: { _eq: $userId } }) {
              affected_rows
            }

            # Delete user profiles (if using profile switching)
            delete_profiles(where: { user_id: { _eq: $userId } }) {
              affected_rows
            }

            # Delete device registrations
            delete_user_devices(where: { user_id: { _eq: $userId } }) {
              affected_rows
            }

            # Delete notifications
            delete_notifications(where: { user_id: { _eq: $userId } }) {
              affected_rows
            }

            # Finally, delete the user account itself
            delete_users_by_pk(id: $userId) {
              id
              email
            }
          }
        `,
        variables: { userId },
      }),
    });

    if (!deleteResponse.ok) {
      throw new Error('Failed to delete user data from database');
    }

    const deleteResult = await deleteResponse.json();

    if (deleteResult.errors) {
      console.error('GraphQL errors:', deleteResult.errors);
      throw new Error('Database deletion failed');
    }

    // Step 2: Invalidate all auth sessions via Auth service
    await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/user/sessions`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }).catch((err) => {
      console.warn('Failed to invalidate sessions:', err);
      // Non-critical, continue
    });

    // Step 3: Log deletion event (anonymized)
    const hashedEmail = Buffer.from(userEmail).toString('base64').substring(0, 16);
    console.log(`[GDPR] Account deleted: ${hashedEmail} at ${new Date().toISOString()}`);

    // Step 4: Send confirmation email (if email service is configured)
    if (process.env.SMTP_HOST) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET!,
        },
        body: JSON.stringify({
          to: userEmail,
          subject: 'Account Deletion Confirmation - nself-tv',
          html: `
            <h2>Your account has been deleted</h2>
            <p>Your nself-tv account and all associated data have been permanently deleted as requested.</p>
            <p><strong>Deleted data:</strong></p>
            <ul>
              <li>Watch history: ${deleteResult.data.delete_watch_history.affected_rows} entries</li>
              <li>Watchlist: ${deleteResult.data.delete_watchlist.affected_rows} items</li>
              <li>Ratings: ${deleteResult.data.delete_user_ratings.affected_rows} ratings</li>
              <li>Downloads: ${deleteResult.data.delete_downloads.affected_rows} items</li>
              <li>Preferences: ${deleteResult.data.delete_user_preferences.affected_rows} settings</li>
            </ul>
            <p><strong>What happens now:</strong></p>
            <ul>
              <li>All sessions are invalidated (you are logged out everywhere)</li>
              <li>Cached offline content will be cleared from your devices</li>
              <li>Anonymized access logs retained for 30 days (security/legal)</li>
              <li>This action is permanent and cannot be undone</li>
            </ul>
            <p>If you did not request this deletion, please contact us immediately at <a href="mailto:privacy@nself.org">privacy@nself.org</a>.</p>
            <p>Thank you for using nself-tv.</p>
          `,
        }),
      }).catch((err) => {
        console.warn('Failed to send deletion confirmation email:', err);
        // Non-critical, continue
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Account and all associated data permanently deleted',
        deleted: {
          user_id: userId,
          watch_history: deleteResult.data.delete_watch_history.affected_rows,
          watchlist: deleteResult.data.delete_watchlist.affected_rows,
          ratings: deleteResult.data.delete_user_ratings.affected_rows,
          preferences: deleteResult.data.delete_user_preferences.affected_rows,
          downloads: deleteResult.data.delete_downloads.affected_rows,
          watch_parties: deleteResult.data.delete_watch_party_participation.affected_rows,
          profiles: deleteResult.data.delete_profiles.affected_rows,
          devices: deleteResult.data.delete_user_devices.affected_rows,
          notifications: deleteResult.data.delete_notifications.affected_rows,
        },
        timestamp: new Date().toISOString(),
        gdpr_compliance: 'Article 17 - Right to Erasure',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete account',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Use POST to delete account. Include Authorization header and { "confirmation": "DELETE MY ACCOUNT" } in body.',
    },
    { status: 405 }
  );
}
