import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * GDPR Data Export Endpoint
 *
 * Exports all user data in JSON format per GDPR Article 20 (Right to Data Portability)
 *
 * @returns ZIP file containing:
 * - profile.json (account data)
 * - watch-history.json (viewing activity)
 * - watchlist.json (saved content)
 * - ratings.json (ratings and reviews)
 * - preferences.json (settings and preferences)
 * - downloads.json (offline content metadata)
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

    // Verify auth token with Hasura/Auth service
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

    // Fetch all user data from Hasura
    const graphqlResponse = await fetch(`${process.env.NEXT_PUBLIC_GRAPHQL_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          query ExportUserData($userId: uuid!) {
            users_by_pk(id: $userId) {
              id
              email
              display_name
              avatar_url
              created_at
              last_login
              locale
            }

            watch_history(where: { user_id: { _eq: $userId } }) {
              content_id
              content {
                title
                media_type
              }
              progress
              duration
              completed
              watched_at
              updated_at
            }

            watchlist(where: { user_id: { _eq: $userId } }) {
              content_id
              content {
                title
                media_type
                year
                poster_url
              }
              added_at
            }

            user_ratings(where: { user_id: { _eq: $userId } }) {
              content_id
              content {
                title
                media_type
              }
              rating
              review_text
              created_at
              updated_at
            }

            user_preferences(where: { user_id: { _eq: $userId } }) {
              category
              key
              value
              updated_at
            }

            downloads(where: { user_id: { _eq: $userId } }) {
              content_id
              content {
                title
                media_type
              }
              quality
              size_bytes
              status
              pinned
              downloaded_at
              last_accessed
            }

            watch_party_participation(where: { user_id: { _eq: $userId } }) {
              party_id
              role
              joined_at
              left_at
            }
          }
        `,
        variables: { userId },
      }),
    });

    if (!graphqlResponse.ok) {
      throw new Error('Failed to fetch user data from database');
    }

    const data = await graphqlResponse.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error('Database query failed');
    }

    // Structure the export
    const exportData = {
      metadata: {
        export_date: new Date().toISOString(),
        user_id: userId,
        format_version: '1.0',
        gdpr_compliance: 'Article 20 - Right to Data Portability',
      },
      profile: {
        id: data.data.users_by_pk.id,
        email: data.data.users_by_pk.email,
        display_name: data.data.users_by_pk.display_name,
        avatar_url: data.data.users_by_pk.avatar_url,
        created_at: data.data.users_by_pk.created_at,
        last_login: data.data.users_by_pk.last_login,
        locale: data.data.users_by_pk.locale,
      },
      watch_history: data.data.watch_history.map((item: any) => ({
        content_title: item.content.title,
        media_type: item.content.media_type,
        progress_seconds: item.progress,
        duration_seconds: item.duration,
        completed: item.completed,
        watched_at: item.watched_at,
        last_updated: item.updated_at,
      })),
      watchlist: data.data.watchlist.map((item: any) => ({
        content_title: item.content.title,
        media_type: item.content.media_type,
        year: item.content.year,
        poster_url: item.content.poster_url,
        added_at: item.added_at,
      })),
      ratings: data.data.user_ratings.map((item: any) => ({
        content_title: item.content.title,
        media_type: item.content.media_type,
        rating: item.rating,
        review: item.review_text,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })),
      preferences: data.data.user_preferences.reduce((acc: any, pref: any) => {
        if (!acc[pref.category]) acc[pref.category] = {};
        acc[pref.category][pref.key] = pref.value;
        return acc;
      }, {}),
      downloads: data.data.downloads.map((item: any) => ({
        content_title: item.content.title,
        media_type: item.content.media_type,
        quality: item.quality,
        size_bytes: item.size_bytes,
        status: item.status,
        pinned: item.pinned,
        downloaded_at: item.downloaded_at,
        last_accessed: item.last_accessed,
      })),
      watch_parties: data.data.watch_party_participation.map((item: any) => ({
        party_id: item.party_id,
        role: item.role,
        joined_at: item.joined_at,
        left_at: item.left_at,
      })),
      statistics: {
        total_watch_time_hours: data.data.watch_history.reduce(
          (sum: number, item: any) => sum + (item.progress / 3600),
          0
        ).toFixed(2),
        total_content_watched: data.data.watch_history.length,
        total_ratings_given: data.data.user_ratings.length,
        watchlist_size: data.data.watchlist.length,
        downloads_count: data.data.downloads.length,
        total_storage_used_mb: (
          data.data.downloads.reduce(
            (sum: number, item: any) => sum + item.size_bytes,
            0
          ) / (1024 * 1024)
        ).toFixed(2),
      },
    };

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="nself-tv-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export data',
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
      message: 'Use POST to initiate data export. Include Authorization header.',
    },
    { status: 405 }
  );
}
