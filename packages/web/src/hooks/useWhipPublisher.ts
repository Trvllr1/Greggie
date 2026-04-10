import { useRef, useCallback, useState } from 'react';

export type WhipState = 'idle' | 'previewing' | 'publishing' | 'error';

export function useWhipPublisher() {
  const [state, setState] = useState<WhipState>('idle');
  const [error, setError] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const resourceUrlRef = useRef<string | null>(null);

  /** Start camera/mic preview and attach to a <video> element */
  const startPreview = useCallback(async (videoEl: HTMLVideoElement) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });
      streamRef.current = stream;
      videoEl.srcObject = stream;
      videoEl.muted = true;
      await videoEl.play();
      setState('previewing');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera access denied');
      setState('error');
    }
  }, []);

  /** Publish the preview stream to MediaMTX via WHIP */
  const publish = useCallback(async (whipUrl: string) => {
    const stream = streamRef.current;
    if (!stream) {
      setError('No camera stream — start preview first');
      setState('error');
      return;
    }

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      // Add local tracks
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete (or timeout after 3s)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
          return;
        }
        const timeout = setTimeout(resolve, 3000);
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            resolve();
          }
        };
      });

      // Send offer to WHIP endpoint
      const resp = await fetch(whipUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription!.sdp,
      });

      if (!resp.ok) {
        throw new Error(`WHIP returned ${resp.status}: ${await resp.text()}`);
      }

      // Store resource URL for teardown
      const location = resp.headers.get('Location');
      if (location) {
        resourceUrlRef.current = location.startsWith('http')
          ? location
          : new URL(location, whipUrl).href;
      }

      // Set remote answer
      const answerSdp = await resp.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setState('publishing');
      setError(null);

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setError('WebRTC connection lost');
          setState('error');
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish stream');
      setState('error');
    }
  }, []);

  /** Stop publishing and release camera */
  const stop = useCallback(async () => {
    // Teardown WHIP resource
    if (resourceUrlRef.current) {
      try {
        await fetch(resourceUrlRef.current, { method: 'DELETE' });
      } catch { /* best-effort */ }
      resourceUrlRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop media tracks
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    setState('idle');
    setError(null);
  }, []);

  return { state, error, startPreview, publish, stop };
}
