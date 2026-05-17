'use client';

import { useEffect, useRef, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Loader2, Radio, Square } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const getRecordingMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const supportedTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

const safeFilename = (value) => {
  const cleaned = (value || 'class-recording')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || 'class-recording';
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const getParticipantName = (participant) => participant?.name || participant?.identity || 'Participant';

const collectLiveKitMedia = (room) => {
  const participants = [room.localParticipant, ...Array.from(room.remoteParticipants.values())].filter(Boolean);
  const media = [];

  participants.forEach((participant) => {
    participant.getTrackPublications().forEach((publication) => {
      const mediaStreamTrack = publication.track?.mediaStreamTrack;
      if (!mediaStreamTrack || mediaStreamTrack.readyState !== 'live' || publication.isMuted) return;

      media.push({
        participant,
        publication,
        mediaStreamTrack,
        source: publication.source,
        kind: mediaStreamTrack.kind,
        label: getParticipantName(participant),
      });
    });
  });

  return media;
};

const pickVideoItems = (media) => {
  const videoItems = media.filter((item) => item.kind === 'video');
  const screenShares = videoItems.filter((item) => item.source === Track.Source.ScreenShare);

  if (screenShares.length > 0) {
    const cameras = videoItems.filter((item) => item.source !== Track.Source.ScreenShare).slice(0, 4);
    return { mode: 'screen', primary: screenShares[0], thumbnails: cameras };
  }

  return { mode: 'grid', primary: null, thumbnails: videoItems.slice(0, 9) };
};

const drawLabel = (ctx, text, x, y, maxWidth) => {
  ctx.save();
  ctx.font = '600 18px system-ui, -apple-system, Segoe UI, sans-serif';
  const width = Math.min(ctx.measureText(text).width + 24, maxWidth);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.76)';
  ctx.fillRect(x, y, width, 34);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(text, x + 12, y + 23, maxWidth - 24);
  ctx.restore();
};

const drawContainVideo = (ctx, video, x, y, width, height) => {
  const videoWidth = video.videoWidth || 16;
  const videoHeight = video.videoHeight || 9;
  const scale = Math.min(width / videoWidth, height / videoHeight);
  const drawWidth = videoWidth * scale;
  const drawHeight = videoHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.fillStyle = '#020617';
  ctx.fillRect(x, y, width, height);
  if (video.readyState >= 2) {
    ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
  }
};

const drawCoverVideo = (ctx, video, x, y, width, height) => {
  const videoWidth = video.videoWidth || 16;
  const videoHeight = video.videoHeight || 9;
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const drawWidth = videoWidth * scale;
  const drawHeight = videoHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.fillStyle = '#020617';
  ctx.fillRect(x, y, width, height);
  if (video.readyState >= 2) {
    ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
  }
};

const createVideoElement = (mediaStreamTrack) => {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.srcObject = new MediaStream([mediaStreamTrack]);
  video.play().catch(() => {});
  return video;
};

export default function LocalCallRecorder({ canRecord, fileBasename, onError }) {
  const room = useRoomContext();
  const [recordingState, setRecordingState] = useState('idle');
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const cleanupRef = useRef(null);

  const isRecording = recordingState === 'recording';
  const statusLabel = (() => {
    if (recordingState === 'preparing') return 'Preparing call recorder';
    if (recordingState === 'recording') return 'Recording call';
    if (recordingState === 'saving') return 'Saving download';
    return '';
  })();

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      cleanupRef.current?.();
    };
  }, []);

  const startRecording = async () => {
    try {
      onError?.('');
      setRecordingState('preparing');

      if (typeof MediaRecorder === 'undefined') {
        throw new Error('Call recording is not supported in this browser.');
      }

      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx || typeof canvas.captureStream !== 'function') {
        throw new Error('Call recording is not supported in this browser.');
      }

      const canvasStream = canvas.captureStream(30);
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      const videoElements = new Map();
      const audioNodes = new Map();

      const syncAudioTracks = () => {
        const audioItems = collectLiveKitMedia(room).filter((item) => item.kind === 'audio');
        const activeIds = new Set(audioItems.map((item) => item.mediaStreamTrack.id));

        audioItems.forEach((item) => {
          const id = item.mediaStreamTrack.id;
          if (audioNodes.has(id)) return;
          const source = audioContext.createMediaStreamSource(new MediaStream([item.mediaStreamTrack]));
          source.connect(destination);
          audioNodes.set(id, source);
        });

        audioNodes.forEach((source, id) => {
          if (activeIds.has(id)) return;
          source.disconnect();
          audioNodes.delete(id);
        });
      };

      const syncVideoElements = (items) => {
        const activeIds = new Set(items.map((item) => item.mediaStreamTrack.id));
        items.forEach((item) => {
          const id = item.mediaStreamTrack.id;
          if (!videoElements.has(id)) {
            videoElements.set(id, createVideoElement(item.mediaStreamTrack));
          }
        });

        videoElements.forEach((video, id) => {
          if (activeIds.has(id)) return;
          video.pause();
          video.srcObject = null;
          videoElements.delete(id);
        });
      };

      const drawEmptyState = () => {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 34px system-ui, -apple-system, Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Live class recording', canvas.width / 2, canvas.height / 2 - 8);
        ctx.font = '400 20px system-ui, -apple-system, Segoe UI, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Waiting for camera or screen share tracks', canvas.width / 2, canvas.height / 2 + 32);
        ctx.textAlign = 'start';
      };

      const drawFrame = () => {
        const media = collectLiveKitMedia(room);
        const selected = pickVideoItems(media);
        const visibleItems = selected.primary ? [selected.primary, ...selected.thumbnails] : selected.thumbnails;
        syncVideoElements(visibleItems);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (selected.mode === 'screen' && selected.primary) {
          const video = videoElements.get(selected.primary.mediaStreamTrack.id);
          if (video) {
            drawContainVideo(ctx, video, 0, 0, canvas.width, canvas.height);
            drawLabel(ctx, `${selected.primary.label} screen`, 18, 18, 360);
          }

          selected.thumbnails.forEach((item, index) => {
            const thumbVideo = videoElements.get(item.mediaStreamTrack.id);
            if (!thumbVideo) return;
            const width = 218;
            const height = 123;
            const gap = 12;
            const x = canvas.width - width - 18;
            const y = canvas.height - ((height + gap) * (index + 1)) - 18;
            drawCoverVideo(ctx, thumbVideo, x, y, width, height);
            drawLabel(ctx, item.label, x + 8, y + height - 42, width - 16);
          });
        } else if (selected.thumbnails.length > 0) {
          const count = selected.thumbnails.length;
          const columns = Math.ceil(Math.sqrt(count));
          const rows = Math.ceil(count / columns);
          const gap = 14;
          const tileWidth = (canvas.width - gap * (columns + 1)) / columns;
          const tileHeight = (canvas.height - gap * (rows + 1)) / rows;

          selected.thumbnails.forEach((item, index) => {
            const video = videoElements.get(item.mediaStreamTrack.id);
            if (!video) return;
            const column = index % columns;
            const row = Math.floor(index / columns);
            const x = gap + column * (tileWidth + gap);
            const y = gap + row * (tileHeight + gap);
            drawCoverVideo(ctx, video, x, y, tileWidth, tileHeight);
            drawLabel(ctx, item.label, x + 10, y + tileHeight - 44, tileWidth - 20);
          });
        } else {
          drawEmptyState();
        }
      };

      await audioContext.resume();
      syncAudioTracks();
      drawFrame();

      const drawInterval = window.setInterval(drawFrame, 1000 / 30);
      const audioSyncInterval = window.setInterval(syncAudioTracks, 1000);
      const outputStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);
      const mimeType = getRecordingMimeType();
      const recorder = new MediaRecorder(outputStream, mimeType ? { mimeType } : undefined);

      cleanupRef.current = () => {
        window.clearInterval(drawInterval);
        window.clearInterval(audioSyncInterval);
        canvasStream.getTracks().forEach((track) => track.stop());
        outputStream.getTracks().forEach((track) => track.stop());
        audioNodes.forEach((source) => source.disconnect());
        audioNodes.clear();
        videoElements.forEach((video) => {
          video.pause();
          video.srcObject = null;
        });
        videoElements.clear();
        audioContext.close().catch(() => {});
        cleanupRef.current = null;
      };

      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        downloadBlob(blob, `${safeFilename(fileBasename)}-${timestamp}.webm`);
        chunksRef.current = [];
        recorderRef.current = null;
        cleanupRef.current?.();
        setRecordingState('idle');
      };

      recorder.start(1000);
      setRecordingState('recording');
    } catch (err) {
      cleanupRef.current?.();
      recorderRef.current = null;
      chunksRef.current = [];
      setRecordingState('idle');
      onError?.(err.message || 'Could not start call recording.');
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      setRecordingState('saving');
      recorder.stop();
    }
  };

  if (!canRecord) return null;

  return (
    <>
      {statusLabel ? (
        <Badge className={isRecording ? 'border-red-200 bg-red-100 text-red-800' : 'border-white/20 bg-white/10 text-white'}>
          <Radio className="mr-1 h-3.5 w-3.5" />
          {statusLabel}
        </Badge>
      ) : null}
      {isRecording ? (
        <Button size="sm" variant="destructive" onClick={stopRecording}>
          <Square className="mr-2 h-4 w-4" />
          Stop Recording
        </Button>
      ) : (
        <Button
          size="sm"
          className="bg-red-600 text-white hover:bg-red-700"
          onClick={startRecording}
          disabled={recordingState === 'preparing' || recordingState === 'saving'}
        >
          {recordingState === 'preparing' || recordingState === 'saving' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Radio className="mr-2 h-4 w-4" />
          )}
          Record Call
        </Button>
      )}
    </>
  );
}
