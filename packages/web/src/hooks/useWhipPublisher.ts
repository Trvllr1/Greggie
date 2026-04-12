import { useRef, useCallback, useState } from 'react';

export type WhipState = 'idle' | 'previewing' | 'publishing' | 'error';

/**
 * Rewrite SDP to prefer H.264 over VP8/VP9.
 * HLS (used by viewers) only supports H.264 — if the browser sends VP8,
 * MediaMTX cannot produce HLS segments and the viewer sees a black screen.
 */
function preferH264(sdp: string): string {
  const lines = sdp.split('\r\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Find video m= line: "m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 ..."
    if (line.startsWith('m=video')) {
      const parts = line.split(' ');
      // parts[3..] are payload type numbers
      const prefix = parts.slice(0, 3).join(' ');
      const pts = parts.slice(3);

      // Collect rtpmap lines for this media section to map PT → codec
      const ptCodec: Record<string, string> = {};
      for (let j = i + 1; j < lines.length && !lines[j].startsWith('m='); j++) {
        const m = lines[j].match(/^a=rtpmap:(\d+)\s+([^/]+)/);
        if (m) ptCodec[m[1]] = m[2].toUpperCase();
      }

      // Sort: H264 first, then everything else (non-VP8/VP9), then VP8/VP9 last
      const h264: string[] = [];
      const other: string[] = [];
      const vp: string[] = [];
      for (const pt of pts) {
        const codec = ptCodec[pt] || '';
        if (codec === 'H264') h264.push(pt);
        else if (codec === 'VP8' || codec === 'VP9') vp.push(pt);
        else other.push(pt);
      }

      // If browser supports H264, reorder; otherwise leave unchanged
      if (h264.length > 0) {
        result.push(`${prefix} ${[...h264, ...other, ...vp].join(' ')}`);
      } else {
        result.push(line);
      }
    } else {
      result.push(line);
    }
    i++;
  }

  return result.join('\r\n');
}

export function useWhipPublisher() {
  const [state, setState] = useState<WhipState>('idle');
  const [error, setError] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const resourceUrlRef = useRef<string | null>(null);

  /** Start camera/mic preview and attach to a <video> element. Returns true on success. */
  const startPreview = useCallback(async (videoEl: HTMLVideoElement): Promise<boolean> => {
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Camera requires HTTPS. Open this site with https:// or on localhost.',
        );
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 }, facingMode: 'user' },
        audio: true,
      });
      streamRef.current = stream;
      videoEl.srcObject = stream;
      videoEl.muted = true;
      await videoEl.play();
      setState('previewing');
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera access denied');
      setState('error');
      return false;
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

      // Create offer, then rewrite SDP to prefer H.264 (required for HLS output)
      const offer = await pc.createOffer();
      offer.sdp = preferH264(offer.sdp || '');
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
      let resolvedUrl: string;
      try {
        resolvedUrl = new URL(whipUrl, window.location.href).href;
      } catch {
        throw new Error(`Invalid WHIP URL: ${whipUrl}`);
      }
      console.log('[WHIP] Publishing to:', resolvedUrl, 'SDP length:', pc.localDescription!.sdp?.length);
      const resp = await fetch(resolvedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription!.sdp,
      });

      console.log('[WHIP] Response:', resp.status, resp.headers.get('server'));
      if (!resp.ok) {
        const body = await resp.text();
        console.error('[WHIP] Error body:', body);
        throw new Error(`WHIP returned ${resp.status}: ${body}`);
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

      // Cap video bitrate to 800kbps to prevent packet loss on constrained server
      for (const sender of pc.getSenders()) {
        if (sender.track?.kind === 'video') {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 800_000;
          await sender.setParameters(params);
        }
      }

      setState('publishing');
      setError(null);

      pc.onconnectionstatechange = () => {
        console.log('[WHIP] Connection state:', pc.connectionState);
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
