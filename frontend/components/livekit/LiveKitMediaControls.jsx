'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { ConnectionState, RoomEvent, Track } from 'livekit-client';

const AUDIO_CONSTRAINTS = {
  autoGainControl: true,
  echoCancellation: true,
  noiseSuppression: true,
  voiceIsolation: true,
};

const VIDEO_CONSTRAINTS = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 24, max: 30 },
};

const isEditableTarget = (target) => {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    tagName === 'button' ||
    tagName === 'a' ||
    target.isContentEditable ||
    Boolean(target.closest('[contenteditable="true"]')) ||
    Boolean(target.closest('[role="textbox"]')) ||
    Boolean(target.closest('[role="button"]')) ||
    Boolean(target.closest('[role="menuitem"]')) ||
    Boolean(target.closest('.monaco-editor'))
  );
};

const publishLiveKitTrack = async (room, track) => {
  const source = track.kind === Track.Kind.Audio ? Track.Source.Microphone : Track.Source.Camera;

  if (room.localParticipant.getTrackPublication(source)) {
    track.stop();
    return;
  }

  await room.localParticipant.publishTrack(track, {
    source,
    dtx: track.kind === Track.Kind.Audio ? true : undefined,
    red: track.kind === Track.Kind.Audio ? true : undefined,
    simulcast: track.kind === Track.Kind.Video ? true : undefined,
    videoEncoding: track.kind === Track.Kind.Video
      ? { maxBitrate: 1_400_000, maxFramerate: 24 }
      : undefined,
  });
};

export function FastDevicePublisher({ audio = true, video = true, onError }) {
  const room = useRoomContext();
  const startedRef = useRef(false);
  const tracksRef = useRef([]);

  const publishInitialTracks = useCallback(async () => {
    if (startedRef.current || room.state !== ConnectionState.Connected) return;

    const needsAudio = audio && !room.localParticipant.getTrackPublication(Track.Source.Microphone);
    const needsVideo = video && !room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (!needsAudio && !needsVideo) return;

    startedRef.current = true;
    let tracks = [];

    try {
      tracks = await room.localParticipant.createTracks({
        audio: needsAudio ? AUDIO_CONSTRAINTS : false,
        video: needsVideo ? VIDEO_CONSTRAINTS : false,
      });
      tracksRef.current = tracks;

      await Promise.all(tracks.map((track) => publishLiveKitTrack(room, track)));
    } catch (err) {
      tracks.forEach((track) => track.stop());
      startedRef.current = false;
      onError?.(err?.message || 'Could not start camera or microphone.');
    }
  }, [audio, onError, room, video]);

  useEffect(() => {
    publishInitialTracks();
    room.on(RoomEvent.Connected, publishInitialTracks);

    return () => {
      room.off(RoomEvent.Connected, publishInitialTracks);
    };
  }, [publishInitialTracks, room]);

  useEffect(() => {
    return () => {
      tracksRef.current.forEach((track) => {
        room.localParticipant.unpublishTrack(track, true).catch(() => track.stop());
      });
      tracksRef.current = [];
    };
  }, [room]);

  return null;
}

export function SpacebarMicShortcut({ disabled = false, onError }) {
  const { localParticipant } = useLocalParticipant();
  const pendingRef = useRef(false);

  useEffect(() => {
    if (disabled) return undefined;

    const handleKeyDown = (event) => {
      const isSpace = event.code === 'Space' || event.key === ' ';
      if (!isSpace || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      if (pendingRef.current) return;

      pendingRef.current = true;
      localParticipant
        .setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)
        .catch((err) => {
          onError?.(err?.message || 'Could not toggle microphone.');
        })
        .finally(() => {
          pendingRef.current = false;
        });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, localParticipant, onError]);

  return null;
}
