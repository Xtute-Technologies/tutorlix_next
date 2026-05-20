'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CarouselLayout,
  Chat,
  ChatIcon,
  ChatToggle,
  ConnectionStateToast,
  DisconnectButton,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  LeaveIcon,
  MediaDeviceMenu,
  ParticipantTile,
  RoomAudioRenderer,
  StartMediaButton,
  TrackToggle,
  useCreateLayoutContext,
  useLocalParticipantPermissions,
  useMaybeLayoutContext,
  usePersistentUserChoices,
  usePinnedTracks,
  useTracks,
} from '@livekit/components-react';
import { isEqualTrackRef, isTrackReference, supportsScreenSharing } from '@livekit/components-core';
import { RoomEvent, Track } from 'livekit-client';

const SCREEN_SHARE_2K_CAPTURE_OPTIONS = {
  audio: true,
  selfBrowserSurface: 'include',
  contentHint: 'detail',
  resolution: {
    width: 2560,
    height: 1440,
    frameRate: 30,
  },
};

export const SCREEN_SHARE_2K_PUBLISH_OPTIONS = {
  simulcast: true,
  screenShareEncoding: {
    maxBitrate: 8_000_000,
    maxFramerate: 30,
    priority: 'high',
  },
  screenShareSimulcastLayers: [],
};

const trackSourceToProtocol = (source) => {
  switch (source) {
    case Track.Source.Camera:
      return 1;
    case Track.Source.Microphone:
      return 2;
    case Track.Source.ScreenShare:
      return 3;
    default:
      return 0;
  }
};

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (event) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
};

function LiveClassControlBar({
  variation,
  controls,
  saveUserChoices = true,
  onDeviceError,
  className,
  ...props
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isScreenShareEnabled, setIsScreenShareEnabled] = useState(false);
  const layoutContext = useMaybeLayoutContext();
  const isTooLittleSpace = useMediaQuery(`(max-width: ${isChatOpen ? 1000 : 760}px)`);
  const localPermissions = useLocalParticipantPermissions();
  const browserSupportsScreenSharing = supportsScreenSharing();

  useEffect(() => {
    if (layoutContext?.widget.state?.showChat !== undefined) {
      setIsChatOpen(layoutContext.widget.state.showChat);
    }
  }, [layoutContext?.widget.state?.showChat]);

  const visibleControls = { leave: true, ...controls };

  if (!localPermissions) {
    visibleControls.camera = false;
    visibleControls.chat = false;
    visibleControls.microphone = false;
    visibleControls.screenShare = false;
  } else {
    const canPublishSource = (source) => (
      localPermissions.canPublish &&
      (localPermissions.canPublishSources.length === 0 ||
        localPermissions.canPublishSources.includes(trackSourceToProtocol(source)))
    );
    visibleControls.camera ??= canPublishSource(Track.Source.Camera);
    visibleControls.microphone ??= canPublishSource(Track.Source.Microphone);
    visibleControls.screenShare ??= canPublishSource(Track.Source.ScreenShare);
    visibleControls.chat ??= localPermissions.canPublishData && controls?.chat;
  }

  const activeVariation = variation ?? (isTooLittleSpace ? 'minimal' : 'verbose');
  const showIcon = activeVariation === 'minimal' || activeVariation === 'verbose';
  const showText = activeVariation === 'textOnly' || activeVariation === 'verbose';

  const {
    saveAudioInputEnabled,
    saveVideoInputEnabled,
    saveAudioInputDeviceId,
    saveVideoInputDeviceId,
  } = usePersistentUserChoices({ preventSave: !saveUserChoices });

  const microphoneOnChange = useCallback(
    (enabled, isUserInitiated) => (
      isUserInitiated ? saveAudioInputEnabled(enabled) : null
    ),
    [saveAudioInputEnabled],
  );

  const cameraOnChange = useCallback(
    (enabled, isUserInitiated) => (
      isUserInitiated ? saveVideoInputEnabled(enabled) : null
    ),
    [saveVideoInputEnabled],
  );

  return (
    <div {...props} className={['lk-control-bar', className].filter(Boolean).join(' ')}>
      {visibleControls.microphone ? (
        <div className="lk-button-group">
          <TrackToggle
            source={Track.Source.Microphone}
            showIcon={showIcon}
            onChange={microphoneOnChange}
            onDeviceError={(error) => onDeviceError?.({ source: Track.Source.Microphone, error })}
          >
            {showText && 'Microphone'}
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu
              kind="audioinput"
              onActiveDeviceChange={(_kind, deviceId) => saveAudioInputDeviceId(deviceId ?? 'default')}
            />
          </div>
        </div>
      ) : null}

      {visibleControls.camera ? (
        <div className="lk-button-group">
          <TrackToggle
            source={Track.Source.Camera}
            showIcon={showIcon}
            onChange={cameraOnChange}
            onDeviceError={(error) => onDeviceError?.({ source: Track.Source.Camera, error })}
          >
            {showText && 'Camera'}
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu
              kind="videoinput"
              onActiveDeviceChange={(_kind, deviceId) => saveVideoInputDeviceId(deviceId ?? 'default')}
            />
          </div>
        </div>
      ) : null}

      {visibleControls.screenShare && browserSupportsScreenSharing ? (
        <TrackToggle
          source={Track.Source.ScreenShare}
          captureOptions={SCREEN_SHARE_2K_CAPTURE_OPTIONS}
          publishOptions={SCREEN_SHARE_2K_PUBLISH_OPTIONS}
          showIcon={showIcon}
          onChange={setIsScreenShareEnabled}
          onDeviceError={(error) => onDeviceError?.({ source: Track.Source.ScreenShare, error })}
        >
          {showText && (isScreenShareEnabled ? 'Stop screen share' : 'Share screen')}
        </TrackToggle>
      ) : null}

      {visibleControls.chat ? (
        <ChatToggle>
          {showIcon && <ChatIcon />}
          {showText && 'Chat'}
        </ChatToggle>
      ) : null}

      {visibleControls.leave ? (
        <DisconnectButton>
          {showIcon && <LeaveIcon />}
          {showText && 'Leave'}
        </DisconnectButton>
      ) : null}

      <StartMediaButton />
    </div>
  );
}

export default function LiveClassVideoConference({
  chatMessageFormatter,
  chatMessageDecoder,
  chatMessageEncoder,
  SettingsComponent,
  ...props
}) {
  const [widgetState, setWidgetState] = useState({
    showChat: false,
    unreadMessages: 0,
    showSettings: false,
  });
  const lastAutoFocusedScreenShareTrack = useRef(null);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  const layoutContext = useCreateLayoutContext();
  const screenShareTracks = tracks
    .filter(isTrackReference)
    .filter((track) => track.publication.source === Track.Source.ScreenShare);

  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const carouselTracks = tracks.filter((track) => !isEqualTrackRef(track, focusTrack));
  const screenShareTrackState = useMemo(
    () => screenShareTracks.map((ref) => `${ref.publication.trackSid}_${ref.publication.isSubscribed}`).join(),
    [screenShareTracks],
  );

  useEffect(() => {
    if (
      screenShareTracks.some((track) => track.publication.isSubscribed) &&
      lastAutoFocusedScreenShareTrack.current === null
    ) {
      layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: screenShareTracks[0] });
      lastAutoFocusedScreenShareTrack.current = screenShareTracks[0];
    } else if (
      lastAutoFocusedScreenShareTrack.current &&
      !screenShareTracks.some(
        (track) => (
          track.publication.trackSid ===
          lastAutoFocusedScreenShareTrack.current?.publication?.trackSid
        ),
      )
    ) {
      layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
      lastAutoFocusedScreenShareTrack.current = null;
    }

    if (focusTrack && !isTrackReference(focusTrack)) {
      const updatedFocusTrack = tracks.find(
        (track) => (
          track.participant.identity === focusTrack.participant.identity &&
          track.source === focusTrack.source
        ),
      );
      if (updatedFocusTrack !== focusTrack && isTrackReference(updatedFocusTrack)) {
        layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: updatedFocusTrack });
      }
    }
  }, [focusTrack, layoutContext.pin, screenShareTrackState, screenShareTracks, tracks]);

  return (
    <div className="lk-video-conference" {...props}>
      {typeof window !== 'undefined' ? (
        <LayoutContextProvider
          value={layoutContext}
          onWidgetChange={setWidgetState}
        >
          <div className="lk-video-conference-inner">
            {!focusTrack ? (
              <div className="lk-grid-layout-wrapper">
                <GridLayout tracks={tracks}>
                  <ParticipantTile />
                </GridLayout>
              </div>
            ) : (
              <div className="lk-focus-layout-wrapper">
                <FocusLayoutContainer>
                  <CarouselLayout tracks={carouselTracks}>
                    <ParticipantTile />
                  </CarouselLayout>
                  {focusTrack ? <FocusLayout trackRef={focusTrack} /> : null}
                </FocusLayoutContainer>
              </div>
            )}
            <LiveClassControlBar controls={{ chat: true }} />
          </div>
          <Chat
            style={{ display: widgetState.showChat ? 'grid' : 'none' }}
            messageFormatter={chatMessageFormatter}
            messageEncoder={chatMessageEncoder}
            messageDecoder={chatMessageDecoder}
          />
          {SettingsComponent ? (
            <div
              className="lk-settings-menu-modal"
              style={{ display: widgetState.showSettings ? 'block' : 'none' }}
            >
              <SettingsComponent />
            </div>
          ) : null}
        </LayoutContextProvider>
      ) : null}
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  );
}
