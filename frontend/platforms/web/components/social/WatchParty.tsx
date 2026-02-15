'use client';

import { useState, useEffect, useRef } from 'react';
import { useSubscription, useMutation } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { VideoPlayer, type VideoPlayerHandle } from '@/components/player/VideoPlayer';

const WATCH_PARTY_SUBSCRIPTION = gql`
  subscription WatchPartyEvents($partyId: uuid!) {
    watch_party_events(
      where: { party_id: { _eq: $partyId } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      id
      event_type
      user_id
      user {
        name
        avatar_url
      }
      data
      timestamp
    }
  }
`;

const SEND_PARTY_EVENT = gql`
  mutation SendPartyEvent($partyId: uuid!, $eventType: String!, $data: jsonb) {
    insert_watch_party_events_one(
      object: { party_id: $partyId, event_type: $eventType, data: $data }
    ) {
      id
    }
  }
`;

export interface WatchPartyProps {
  partyId: string;
  contentId: string;
  contentTitle: string;
  videoUrl: string;
  isHost: boolean;
  onLeave?: () => void;
}

export interface PartyEvent {
  id: string;
  eventType: 'play' | 'pause' | 'seek' | 'chat' | 'join' | 'leave';
  userId: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
  data: any;
  timestamp: string;
}

export function WatchParty({
  partyId,
  contentId,
  contentTitle,
  videoUrl,
  isHost,
  onLeave,
}: WatchPartyProps) {
  const playerRef = useRef<VideoPlayerHandle>(null);
  const [chatMessages, setChatMessages] = useState<PartyEvent[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [syncLatency, setSyncLatency] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());

  // Subscribe to party events
  const { data: events } = useSubscription({
    queryKey: ['watch-party-events', partyId],
    queryFn: async () => {
      // This would use Hasura GraphQL WebSocket subscription
      // For now, polling simulation
      const response = await fetch(`/api/v1/watch-party/${partyId}/events`);
      return response.json() as Promise<PartyEvent[]>;
    },
    refetchInterval: 1000, // Poll every second (real implementation uses WebSocket)
  });

  // Send party event mutation
  const sendEventMutation = useMutation({
    mutationFn: async ({ eventType, data }: { eventType: string; data: any }) => {
      const response = await fetch(`/api/v1/watch-party/${partyId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, data }),
      });
      if (!response.ok) throw new Error('Failed to send event');
      return response.json();
    },
  });

  // Handle incoming events
  useEffect(() => {
    if (!events || events.length === 0) return;

    const latestEvent = events[0];

    // Skip if this is our own event (to avoid loops)
    // In real implementation, check userId against current user

    switch (latestEvent.eventType) {
      case 'play':
        if (!isHost) {
          playerRef.current?.play();
          // Sync to host's timestamp
          if (latestEvent.data?.currentTime) {
            playerRef.current?.seek(latestEvent.data.currentTime);
          }
        }
        break;

      case 'pause':
        if (!isHost) {
          playerRef.current?.pause();
        }
        break;

      case 'seek':
        if (!isHost && latestEvent.data?.time) {
          playerRef.current?.seek(latestEvent.data.time);
        }
        break;

      case 'chat':
        setChatMessages((prev) => {
          if (prev.find((m) => m.id === latestEvent.id)) return prev;
          return [latestEvent, ...prev].slice(0, 100); // Keep last 100 messages
        });
        break;

      case 'join':
        setMembers((prev) => new Set(prev).add(latestEvent.userId));
        break;

      case 'leave':
        setMembers((prev) => {
          const updated = new Set(prev);
          updated.delete(latestEvent.userId);
          return updated;
        });
        break;
    }

    // Update sync latency
    const eventTime = new Date(latestEvent.timestamp).getTime();
    const latency = Date.now() - eventTime;
    setSyncLatency(latency);
  }, [events, isHost]);

  const handlePlay = () => {
    if (!isHost) return; // Only host can control playback

    sendEventMutation.mutate({
      eventType: 'play',
      data: { currentTime: playerRef.current?.getVideoElement()?.currentTime || 0 },
    });
  };

  const handlePause = () => {
    if (!isHost) return;

    sendEventMutation.mutate({
      eventType: 'pause',
      data: { currentTime: playerRef.current?.getVideoElement()?.currentTime || 0 },
    });
  };

  const handleSeek = (time: number) => {
    if (!isHost) return;

    sendEventMutation.mutate({
      eventType: 'seek',
      data: { time },
    });
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;

    sendEventMutation.mutate({
      eventType: 'chat',
      data: { message: chatInput },
    });

    setChatInput('');
  };

  return (
    <div className="watch-party">
      <div className="party-header">
        <h2>{contentTitle}</h2>
        <div className="party-info">
          <span className="member-count">{members.size} watching</span>
          {isHost && <span className="host-badge">Host</span>}
          <span className="sync-latency">
            {syncLatency < 2000 ? '🟢' : '🟡'} {syncLatency}ms
          </span>
        </div>
      </div>

      <div className="party-content">
        <div className="video-container">
          <VideoPlayer
            ref={playerRef}
            src={videoUrl}
            autoplay={false}
            onProgress={(currentTime, duration) => {
              // Periodically send sync updates if host
              if (isHost && Date.now() - lastSyncTime > 5000) {
                sendEventMutation.mutate({
                  eventType: 'sync',
                  data: { currentTime, duration },
                });
                setLastSyncTime(Date.now());
              }
            }}
            onEnded={() => {
              if (isHost) {
                sendEventMutation.mutate({
                  eventType: 'ended',
                  data: {},
                });
              }
            }}
          />

          {!isHost && (
            <div className="viewer-overlay">
              <p>Host is controlling playback</p>
            </div>
          )}
        </div>

        <div className="chat-sidebar">
          <div className="chat-header">
            <h3>Chat</h3>
          </div>

          <div className="chat-messages">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="chat-message">
                <div className="message-header">
                  {msg.user.avatarUrl && (
                    <img
                      src={msg.user.avatarUrl}
                      alt={msg.user.name}
                      className="user-avatar"
                    />
                  )}
                  <span className="user-name">{msg.user.name}</span>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-text">{msg.data?.message}</div>
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSendChat();
              }}
              placeholder="Send a message..."
            />
            <button onClick={handleSendChat}>Send</button>
          </div>
        </div>
      </div>

      <div className="party-controls">
        {isHost && (
          <div className="host-controls">
            <button onClick={handlePlay}>▶ Play</button>
            <button onClick={handlePause}>⏸ Pause</button>
          </div>
        )}

        <button onClick={onLeave} className="leave-party-btn">
          Leave Party
        </button>
      </div>
    </div>
  );
}
