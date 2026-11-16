import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Square } from "lucide-react";
import { post } from "../lib/api";
import type { ChatState } from "../lib/store";
import {
  consumeDictation,
  appendDictation,
  type DraftCapture,
} from "../lib/dictation-draft";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type VoicePeer = {
  owner: string;
  peer?: RTCPeerConnection;
  stream?: MediaStream;
  audio?: HTMLAudioElement;
  stopped: boolean;
};
export function VoiceControls({
  chat,
  draft,
  insert,
}: {
  chat: ChatState;
  draft: string;
  insert: (text: string) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [microphone, setMicrophone] = useState("browser");
  const [captureState, setCaptureState] = useState(false),
    [live, setLive] = useState(false);
  const capture = useRef<DraftCapture | null>(null),
    connection = useRef<VoicePeer | null>(null);
  const current = useRef({ key: chat.key, draft, insert });
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  current.current = { key: chat.key, draft, insert };
  async function send(key: string, cmd: any) {
    const result = await post("/api/cmd", {
      key,
      cmd,
      // A cold speech model and its final transcription flush can take minutes.
      timeoutMs: cmd.type.startsWith("dictation_") ? 600_000 : 120_000,
    });
    if (!result.ok) throw Error(result.error);
    return result.data;
  }
  function finish(owner: DraftCapture, record: any) {
    const text = consumeDictation(owner, record);
    if (text !== null) {
      if (mounted.current && current.current.key === owner.owner)
        current.current.insert(text);
      else {
        const delivered = new CustomEvent("omp:dictation-result", {
          cancelable: true,
          detail: { owner: owner.owner, text },
        });
        window.dispatchEvent(delivered);
        if (!delivered.defaultPrevented) {
          const key = "ompfe.draft." + owner.owner;
          const previous = localStorage.getItem(key) ?? "";
          localStorage.setItem(key, appendDictation(previous, text));
        }
      }
    }
    if (mounted.current && current.current.key === owner.owner) {
      setCaptureState(false);
      if (record.error) setError(record.error);
    }
  }
  async function stopDictation(owner: DraftCapture) {
    try {
      const data = await send(owner.owner, { type: "dictation_stop" });
      finish(owner, { captureId: owner.id, text: data.text });
    } catch (error: any) {
      if (current.current.key === owner.owner) setError(error.message);
    }
  }
  function dispose(peer: VoicePeer) {
    peer.stream?.getTracks().forEach((track) => track.stop());
    peer.peer?.close();
    if (peer.audio) {
      peer.audio.pause();
      peer.audio.srcObject = null;
    }
  }
  async function stopLive(peer: VoicePeer) {
    if (peer.stopped) return;
    peer.stopped = true;
    dispose(peer);
    try {
      await send(peer.owner, { type: "live_stop" });
    } catch (error: any) {
      if (current.current.key === peer.owner) setError(error.message);
    }
    if (current.current.key === peer.owner) setLive(false);
  }
  useEffect(() => {
    const key = chat.key;
    setError("");
    setLive(false);
    setCaptureState(false);
    setBusy(false);
    return () => {
      const recording = capture.current;
      if (recording?.owner === key && !recording.consumed)
        void stopDictation(recording);
      const peer = connection.current;
      if (peer?.owner === key) void stopLive(peer);
    };
  }, [chat.key]);
  useEffect(() => {
    const owner = capture.current,
      event = chat.dictation;
    if (owner && event?.type === "dictation_end") finish(owner, event);
  }, [chat.dictation]);
  useEffect(() => {
    if (chat.voice.phase === "off" && connection.current && live)
      void stopLive(connection.current);
  }, [chat.voice.phase]);
  async function startDictation() {
    if (!chat.key) return;
    const owner = { id: crypto.randomUUID(), owner: chat.key, consumed: false };
    capture.current = owner;
    setBusy(true);
    setError("");
    setCaptureState(true);
    try {
      await send(owner.owner, { type: "dictation_start", captureId: owner.id });
    } catch (error: any) {
      // A request deadline does not cancel native capture. Flush it explicitly;
      // its terminal event or stop response still owns the final draft text.
      await stopDictation(owner);
      if (current.current.key === owner.owner) {
        setError(error.message);
        setCaptureState(false);
      }
    } finally {
      if (mounted.current && current.current.key === owner.owner)
        setBusy(false);
    }
  }
  async function startLive() {
    if (!chat.key) return;
    const peer: VoicePeer = { owner: chat.key, stopped: false };
    connection.current = peer;
    setBusy(true);
    setError("");
    setLive(true);
    try {
      if (microphone === "native")
        await send(peer.owner, { type: "live_start" });
      else {
        peer.stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true },
          video: false,
        });
        if (peer.stopped) {
          dispose(peer);
          return;
        }
        peer.peer = new RTCPeerConnection();
        const audio = new Audio();
        audio.autoplay = true;
        peer.audio = audio;
        peer.peer.ontrack = (event) => {
          audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
          void audio
            .play()
            .catch(() =>
              setError("Allow audio playback to hear the live conversation."),
            );
        };
        peer.peer.addTrack(peer.stream.getAudioTracks()[0], peer.stream);
        const transceiver = peer.peer.getTransceivers()[0];
        const opus = RTCRtpReceiver.getCapabilities("audio")?.codecs.filter(
          (codec) => /opus/i.test(codec.mimeType),
        );
        if (opus?.length && transceiver.setCodecPreferences)
          transceiver.setCodecPreferences(opus);
        peer.peer.createDataChannel("oai-events");
        peer.peer.onconnectionstatechange = () => {
          if (
            ["failed", "closed", "disconnected"].includes(
              peer.peer!.connectionState,
            )
          )
            void stopLive(peer);
        };
        await peer.peer.setLocalDescription(await peer.peer.createOffer());
        const data = await send(peer.owner, {
          type: "live_connect",
          sdpOffer: peer.peer.localDescription!.sdp,
        });
        if (peer.stopped) {
          dispose(peer);
          await send(peer.owner, { type: "live_stop" });
          return;
        }
        await peer.peer.setRemoteDescription({
          type: "answer",
          sdp: data.sdpAnswer,
        });
      }
    } catch (error: any) {
      if (mounted.current && current.current.key === peer.owner)
        setError(error.message);
      await stopLive(peer);
    } finally {
      if (mounted.current && current.current.key === peer.owner) setBusy(false);
    }
  }
  const activeCapture =
    chat.dictation?.captureId === capture.current?.id ? chat.dictation : null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="composer-chip" aria-label="Voice and dictation">
          <Mic className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 space-y-4 p-4">
        <p className="text-sm font-medium">Voice and dictation</p>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <section className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Dictation uses this machine’s microphone and OMP’s configured speech
            engine. Text is added to your draft, never sent automatically.
          </p>
          {captureState ? (
            <>
              <p className="text-xs">{activeCapture?.state || "Starting…"}</p>
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                {activeCapture?.text}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  capture.current && void stopDictation(capture.current)
                }
              >
                <Square className="size-3" />
                Stop dictation
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={busy || live}
              onClick={() => void startDictation()}
            >
              Dictate into draft
            </Button>
          )}
        </section>
        <section className="space-y-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Live conversation connects to the session’s voice provider.
          </p>
          {!live ? (
            <>
              <select
                aria-label="Live microphone"
                value={microphone}
                onChange={(e) => setMicrophone(e.target.value)}
                className="w-full rounded-md border bg-sidebar p-2 text-xs"
              >
                <option value="browser">Browser / app microphone</option>
                <option value="native">OMP machine’s microphone</option>
              </select>
              <Button
                size="sm"
                disabled={busy || captureState}
                onClick={() => void startLive()}
              >
                Start live conversation
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs" role="status">
                {chat.voice.phase === "off" ? "Connecting…" : chat.voice.phase}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const peer = connection.current;
                    if (!peer) return;
                    try {
                      const data = await send(peer.owner, {
                        type: "live_mute",
                        muted: chat.voice.phase !== "muted",
                      });
                      peer.stream
                        ?.getAudioTracks()
                        .forEach((track) => (track.enabled = !data.muted));
                    } catch (error: any) {
                      setError(error.message);
                    }
                  }}
                >
                  <MicOff className="size-3" />
                  {chat.voice.phase === "muted" ? "Unmute" : "Mute"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    connection.current && void stopLive(connection.current)
                  }
                >
                  End call
                </Button>
              </div>
            </>
          )}
          {chat.voice.turns.length > 0 && (
            <div className="max-h-48 space-y-2 overflow-auto">
              {chat.voice.turns.map((turn) => (
                <p
                  key={`${turn.role}:${turn.turn}`}
                  className="whitespace-pre-wrap text-xs"
                >
                  <span className="text-muted-foreground">{turn.role}: </span>
                  {turn.text}
                </p>
              ))}
            </div>
          )}
        </section>
      </PopoverContent>
    </Popover>
  );
}
