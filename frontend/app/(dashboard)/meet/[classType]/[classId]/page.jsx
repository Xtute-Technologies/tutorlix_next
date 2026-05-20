'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';
import { Room } from 'livekit-client';
import { AlertCircle, Loader2, Video, VideoOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FastDevicePublisher, SpacebarMicShortcut } from '@/components/livekit/LiveKitMediaControls';
import LiveClassVideoConference, { SCREEN_SHARE_2K_PUBLISH_OPTIONS } from '@/components/livekit/LiveClassVideoConference';
import LocalCallRecorder from '@/components/livekit/LocalCallRecorder';
import ParticipantKickControls from '@/components/livekit/ParticipantKickControls';
import { useAuth } from '@/context/AuthContext';
import { liveClassAPI } from '@/lib/lmsService';

const roleClassesPath = (role) => {
  if (role === 'admin') return '/admin/classes-course';
  if (role === 'teacher') return '/teacher/classes-course';
  if (role === 'student') return '/student/classes';
  return '/dashboard';
};

const errorText = (err, fallback) => {
  const data = err.response?.data;
  const value = data?.detail || data?.recording || data?.livekit || data?.non_field_errors || data?.error;
  if (Array.isArray(value)) return value.join(' ');
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return Object.values(value).flat().join(' ');
  return fallback;
};

const liveClassRoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    dtx: true,
    red: true,
    simulcast: true,
    videoEncoding: {
      maxBitrate: 1_400_000,
      maxFramerate: 24,
    },
    ...SCREEN_SHARE_2K_PUBLISH_OPTIONS,
  },
};

export default function LiveClassRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const classType = params.classType;
  const classId = params.classId;

  const [room] = useState(() => new Room(liveClassRoomOptions));
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomError, setRoomError] = useState('');

  const loadSession = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const data = await liveClassAPI.join(classType, classId);
      if (data?.server_url && data?.token) {
        room.prepareConnection(data.server_url, data.token).catch(() => {});
      }
      setSession(data);
    } catch (err) {
      setError(errorText(err, 'Could not open this live class.'));
    } finally {
      setLoading(false);
    }
  }, [classId, classType, room]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 p-4">
        <Card className="w-full max-w-2xl border-red-200 bg-red-50">
          <CardContent className="space-y-4 p-6 text-red-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
              <div>
                <h1 className="text-lg font-semibold">Unable to open class room</h1>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push(roleClassesPath(user?.role))}>
              Back to classes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <LiveKitRoom
      room={room}
      serverUrl={session?.server_url}
      token={session?.token}
      connect
      audio={false}
      video={false}
      data-lk-theme="default"
      className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950"
      onError={(err) => setRoomError(err?.message || 'LiveKit connection failed.')}
      onDisconnected={() => router.push(roleClassesPath(user?.role))}
    >
      <FastDevicePublisher onError={setRoomError} />
      <SpacebarMicShortcut onError={setRoomError} />

      <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-900 px-4 py-3 text-white md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Video className="h-4 w-4 text-sky-300" />
            <h1 className="truncate text-base font-semibold md:text-lg">
              {session?.class?.name || 'Live class'}
            </h1>
            {session?.class?.product_name ? (
              <Badge variant="outline" className="border-white/20 text-slate-200">
                {session.class.product_name}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-300">
            Room {session?.room_name} records only LiveKit call media: shared screen when present, otherwise participant video and call audio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ParticipantKickControls
            canManage={user?.role === 'admin' || user?.role === 'teacher'}
            classType={classType}
            classId={classId}
            onError={setError}
          />
          <LocalCallRecorder
            canRecord={user?.role === 'admin' || user?.role === 'teacher' || session?.can_record}
            fileBasename={session?.class?.name || `class-${classId}`}
            onError={setError}
          />
          <Button size="sm" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => router.push(roleClassesPath(user?.role))}>
            <VideoOff className="mr-2 h-4 w-4" />
            Leave
          </Button>
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-400/30 bg-red-950/70 px-4 py-3 text-sm text-red-100">{error}</div>
      ) : null}
      {roomError ? (
        <div className="border-b border-amber-400/30 bg-amber-950/70 px-4 py-3 text-sm text-amber-100">{roomError}</div>
      ) : null}

      <div className="min-h-0 flex-1">
        <LiveClassVideoConference />
      </div>
    </LiveKitRoom>
  );
}
