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
  width: { ideal: 960, max: 1280 },
  height: { ideal: 540, max: 720 },
  frameRate: { ideal: 20, max: 24 },
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
    return false;
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
  return true;
};

export function FastDevicePublisher({ audio = true, video = true, onError }) {
  const room = useRoomContext();
  const captureStartedRef = useRef(false);
  const publishingRef = useRef(false);
  const capturedTracksRef = useRef([]);
  const publishedTracksRef = useRef([]);
  const disposedRef = useRef(false);

  const publishCapturedTracks = useCallback(async () => {
    if (publishingRef.current || room.state !== ConnectionState.Connected) return;

    const tracks = [...capturedTracksRef.current];
    if (!tracks.length) return;

    publishingRef.current = true;

    try {
      for (const track of tracks) {
        const published = await publishLiveKitTrack(room, track);
        capturedTracksRef.current = capturedTracksRef.current.filter((item) => item !== track);
        if (published) {
          publishedTracksRef.current = [...publishedTracksRef.current, track];
        }
      }
    } catch (err) {
      const unpublishedTracks = tracks.filter((track) => !publishedTracksRef.current.includes(track));
      unpublishedTracks.forEach((track) => track.stop());
      capturedTracksRef.current = capturedTracksRef.current.filter((track) => !unpublishedTracks.includes(track));
      captureStartedRef.current = false;
      onError?.(err?.message || 'Could not publish camera or microphone.');
    } finally {
      publishingRef.current = false;
    }
  }, [onError, room]);

  const captureInitialTracks = useCallback(async () => {
    if (captureStartedRef.current) return;

    const hasCapturedAudio = capturedTracksRef.current.some((track) => track.kind === Track.Kind.Audio);
    const hasCapturedVideo = capturedTracksRef.current.some((track) => track.kind === Track.Kind.Video);
    const needsAudio = audio && !hasCapturedAudio && !room.localParticipant.getTrackPublication(Track.Source.Microphone);
    const needsVideo = video && !hasCapturedVideo && !room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (!needsAudio && !needsVideo) return;

    captureStartedRef.current = true;
    let tracks = [];

    try {
      tracks = await room.localParticipant.createTracks({
        audio: needsAudio ? AUDIO_CONSTRAINTS : false,
        video: needsVideo ? VIDEO_CONSTRAINTS : false,
      });

      if (disposedRef.current) {
        tracks.forEach((track) => track.stop());
        return;
      }

      capturedTracksRef.current = [...capturedTracksRef.current, ...tracks];
      await publishCapturedTracks();
    } catch (err) {
      tracks.forEach((track) => track.stop());
      captureStartedRef.current = false;
      onError?.(err?.message || 'Could not start camera or microphone.');
    }
  }, [audio, onError, publishCapturedTracks, room, video]);

  useEffect(() => {
    disposedRef.current = false;
    captureInitialTracks();
    room.on(RoomEvent.Connected, publishCapturedTracks);

    return () => {
      room.off(RoomEvent.Connected, publishCapturedTracks);
    };
  }, [captureInitialTracks, publishCapturedTracks, room]);

  useEffect(() => {
    return () => {
      disposedRef.current = true;
      capturedTracksRef.current.forEach((track) => track.stop());
      capturedTracksRef.current = [];
      publishedTracksRef.current.forEach((track) => {
        room.localParticipant.unpublishTrack(track, true).catch(() => track.stop());
      });
      publishedTracksRef.current = [];
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
